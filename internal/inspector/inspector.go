package inspector

import (
	"bufio"
	"crypto/rand"
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/url"
	"strings"
	"time"
)

type targetInfo struct {
	WebSocketDebuggerURL string `json:"webSocketDebuggerUrl"`
}

type rpcRequest struct {
	ID     int            `json:"id"`
	Method string         `json:"method"`
	Params map[string]any `json:"params,omitempty"`
}

type rpcMessage struct {
	ID     int             `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
	Result json.RawMessage `json:"result"`
	Error  *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// PickFreePort allocates an available TCP port on 127.0.0.1.
func PickFreePort() (int, error) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return 0, err
	}
	port := ln.Addr().(*net.TCPAddr).Port
	_ = ln.Close()
	return port, nil
}

// InjectAndResume waits for the V8 inspector on 127.0.0.1:port, injects require(hookPath)
// into the paused main process, resumes execution, and disconnects immediately.
func InjectAndResume(port int, hookPath string, timeout time.Duration) error {
	wsURL, err := waitForInspectorWS(port, timeout)
	if err != nil {
		return fmt.Errorf("wait for inspector: %w", err)
	}

	ws, err := dialWS(wsURL, 3*time.Second)
	if err != nil {
		return fmt.Errorf("dial inspector ws: %w", err)
	}
	defer ws.Close()

	_ = ws.conn.SetDeadline(time.Now().Add(timeout))

	nextID := 1
	send := func(method string, params map[string]any) (int, error) {
		id := nextID
		nextID++
		data, err := json.Marshal(rpcRequest{ID: id, Method: method, Params: params})
		if err != nil {
			return 0, err
		}
		return id, ws.WriteText(data)
	}

	if _, err := send("Runtime.enable", nil); err != nil {
		return err
	}
	if _, err := send("Debugger.enable", nil); err != nil {
		return err
	}
	// CRITICAL for --inspect-brk: V8 stays frozen until Runtime.runIfWaitingForDebugger is sent!
	if _, err := send("Runtime.runIfWaitingForDebugger", nil); err != nil {
		return err
	}

	// Safety net: always attempt to resume so Electron never stays frozen on any error.
	resumed := false
	defer func() {
		if !resumed {
			_, _ = send("Debugger.resume", nil)
		}
	}()

	// Wait for Debugger.paused so we get the top call frame (where `require` is in scope).
	var pausedFrameID string
	pauseDeadline := time.Now().Add(4 * time.Second)
	for time.Now().Before(pauseDeadline) {
		_ = ws.conn.SetReadDeadline(time.Now().Add(250 * time.Millisecond))
		frame, err := ws.ReadText()
		if err != nil {
			if ne, ok := err.(net.Error); ok && ne.Timeout() {
				continue
			}
			return err
		}
		var msg rpcMessage
		if json.Unmarshal(frame, &msg) != nil {
			continue
		}
		if msg.Method == "Debugger.paused" {
			var p struct {
				CallFrames []struct {
					CallFrameID string `json:"callFrameId"`
				} `json:"callFrames"`
			}
			if json.Unmarshal(msg.Params, &p) == nil && len(p.CallFrames) > 0 {
				pausedFrameID = p.CallFrames[0].CallFrameID
			}
			break
		}
	}

	_ = ws.conn.SetDeadline(time.Now().Add(timeout))

	quotedPath, _ := json.Marshal(hookPath)
	// Schedule require(hookPath) via process.nextTick so it executes outside the paused
	// V8 debugger frame (avoiding Node internals conflicts) yet before app.whenReady().
	expr := fmt.Sprintf(`(function(){
		try {
			var req = (typeof require === 'function' && require)
				|| (typeof process !== 'undefined' && process.mainModule && process.mainModule.require)
				|| (typeof globalThis !== 'undefined' && globalThis.require);
			if (!req && typeof process !== 'undefined' && typeof process.getBuiltinModule === 'function') {
				var mod = process.getBuiltinModule('module');
				if (mod && typeof mod.createRequire === 'function') req = mod.createRequire(%s);
			}
			if (!req) return 'NO_REQUIRE';
			var run = function() {
				try { req(%s); } catch (err) {}
			};
			if (typeof process !== 'undefined' && typeof process.nextTick === 'function') {
				process.nextTick(run);
			} else {
				run();
			}
			return 'OK';
		} catch (e) {
			return 'ERR:' + (e && e.message ? e.message : String(e));
		}
	})()`, string(quotedPath), string(quotedPath))

	var evalID int
	if pausedFrameID != "" {
		evalID, err = send("Debugger.evaluateOnCallFrame", map[string]any{
			"callFrameId":   pausedFrameID,
			"expression":    expr,
			"returnByValue": true,
		})
	} else {
		evalID, err = send("Runtime.evaluate", map[string]any{
			"expression":    expr,
			"returnByValue": true,
		})
	}
	if err != nil {
		return err
	}

	// Wait for evaluate response.
	evalErr := waitForEvalResponse(ws, evalID)

	// Always resume debugger so Electron never stays frozen!
	resumeID, _ := send("Debugger.resume", nil)
	resumed = true
	_ = waitForAck(ws, resumeID, 1*time.Second)

	return evalErr
}

func waitForEvalResponse(ws *wsConn, targetID int) error {
	for i := 0; i < 64; i++ {
		frame, err := ws.ReadText()
		if err != nil {
			return err
		}
		var msg rpcMessage
		if json.Unmarshal(frame, &msg) != nil {
			continue
		}
		if msg.ID != targetID {
			continue
		}
		if msg.Error != nil {
			return fmt.Errorf("inspector eval error: %s", msg.Error.Message)
		}
		var res struct {
			Result struct {
				Value string `json:"value"`
			} `json:"result"`
		}
		if json.Unmarshal(msg.Result, &res) == nil {
			if res.Result.Value == "OK" {
				return nil
			}
			if res.Result.Value != "" {
				return fmt.Errorf("hook returned %s", res.Result.Value)
			}
		}
		return nil
	}
	return errors.New("timed out waiting for eval response")
}

func waitForAck(ws *wsConn, targetID int, timeout time.Duration) error {
	_ = ws.conn.SetReadDeadline(time.Now().Add(timeout))
	for i := 0; i < 32; i++ {
		frame, err := ws.ReadText()
		if err != nil {
			return err
		}
		var msg rpcMessage
		if json.Unmarshal(frame, &msg) == nil && msg.ID == targetID {
			return nil
		}
	}
	return nil
}

func waitForInspectorWS(port int, timeout time.Duration) (string, error) {
	addr := fmt.Sprintf("127.0.0.1:%d", port)
	deadline := time.Now().Add(timeout)

	var lastErr error
	for time.Now().Before(deadline) {
		body, err := rawHTTPGet(addr, "/json/list", 300*time.Millisecond)
		if err != nil {
			lastErr = err
		} else {
			var targets []targetInfo
			if err := json.Unmarshal(body, &targets); err != nil {
				lastErr = fmt.Errorf("json decode (%s): %w", string(body), err)
			} else {
				for _, t := range targets {
					if t.WebSocketDebuggerURL != "" {
						return t.WebSocketDebuggerURL, nil
					}
				}
				lastErr = fmt.Errorf("no ws target in %s", string(body))
			}
		}
		time.Sleep(25 * time.Millisecond)
	}
	return "", fmt.Errorf("inspector endpoint http://%s/json/list did not respond within %v (lastErr: %v)", addr, timeout, lastErr)
}

func rawHTTPGet(addr, path string, timeout time.Duration) ([]byte, error) {
	conn, err := net.DialTimeout("tcp", addr, timeout)
	if err != nil {
		return nil, err
	}
	defer conn.Close()
	_ = conn.SetDeadline(time.Now().Add(timeout))

	req := fmt.Sprintf("GET %s HTTP/1.1\r\nHost: %s\r\nConnection: close\r\n\r\n", path, addr)
	if _, err := conn.Write([]byte(req)); err != nil {
		return nil, err
	}

	br := bufio.NewReader(conn)
	statusLine, err := br.ReadString('\n')
	if err != nil || !strings.Contains(statusLine, "200") {
		return nil, fmt.Errorf("http status: %s (%v)", strings.TrimSpace(statusLine), err)
	}

	contentLen := -1
	for {
		line, err := br.ReadString('\n')
		if err != nil {
			return nil, err
		}
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			break
		}
		if strings.HasPrefix(strings.ToLower(trimmed), "content-length:") {
			val := strings.TrimSpace(trimmed[len("content-length:"):])
			var n int
			if _, err := fmt.Sscanf(val, "%d", &n); err == nil && n >= 0 {
				contentLen = n
			}
		}
	}

	if contentLen >= 0 {
		body := make([]byte, contentLen)
		if _, err := io.ReadFull(br, body); err != nil {
			return nil, err
		}
		return body, nil
	}
	return io.ReadAll(br)
}

// Minimal RFC 6455 WebSocket client using Go standard library only.
type wsConn struct {
	conn net.Conn
	r    *bufio.Reader
}

func dialWS(rawURL string, timeout time.Duration) (*wsConn, error) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil, err
	}
	conn, err := net.DialTimeout("tcp", u.Host, timeout)
	if err != nil {
		return nil, err
	}
	_ = conn.SetDeadline(time.Now().Add(timeout))

	var keyBytes [16]byte
	_, _ = rand.Read(keyBytes[:])
	secKey := base64.StdEncoding.EncodeToString(keyBytes[:])

	path := u.RequestURI()
	req := fmt.Sprintf(
		"GET %s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n",
		path, u.Host, secKey,
	)
	if _, err := conn.Write([]byte(req)); err != nil {
		_ = conn.Close()
		return nil, err
	}

	br := bufio.NewReader(conn)
	statusLine, err := br.ReadString('\n')
	if err != nil || !strings.Contains(statusLine, "101") {
		_ = conn.Close()
		return nil, fmt.Errorf("ws handshake failed: %s (%v)", strings.TrimSpace(statusLine), err)
	}

	h := sha1.New()
	_, _ = h.Write([]byte(secKey + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"))
	expectedAccept := base64.StdEncoding.EncodeToString(h.Sum(nil))
	gotAccept := ""

	for {
		line, err := br.ReadString('\n')
		if err != nil {
			_ = conn.Close()
			return nil, err
		}
		line = strings.TrimSpace(line)
		if line == "" {
			break
		}
		if strings.HasPrefix(strings.ToLower(line), "sec-websocket-accept:") {
			gotAccept = strings.TrimSpace(line[len("sec-websocket-accept:"):])
		}
	}
	if gotAccept != expectedAccept {
		_ = conn.Close()
		return nil, errors.New("ws handshake accept mismatch")
	}
	_ = conn.SetDeadline(time.Time{})
	return &wsConn{conn: conn, r: br}, nil
}

func (w *wsConn) Close() error {
	// Send a polite RFC 6455 masked Close frame before closing the TCP socket
	// to avoid inspector teardown races on fast-exiting Node.js processes.
	var mask [4]byte
	_, _ = rand.Read(mask[:])
	closeFrame := [6]byte{0x88, 0x80, mask[0], mask[1], mask[2], mask[3]}
	_ = w.conn.SetWriteDeadline(time.Now().Add(200 * time.Millisecond))
	_, _ = w.conn.Write(closeFrame[:])
	return w.conn.Close()
}

func (w *wsConn) WriteText(payload []byte) error {
	var mask [4]byte
	_, _ = rand.Read(mask[:])

	n := len(payload)
	header := make([]byte, 0, 14)
	header = append(header, 0x81) // FIN + text opcode
	switch {
	case n < 126:
		header = append(header, 0x80|byte(n))
	case n < 65536:
		header = append(header, 0x80|126, byte(n>>8), byte(n))
	default:
		var b [8]byte
		binary.BigEndian.PutUint64(b[:], uint64(n))
		header = append(header, 0x80|127)
		header = append(header, b[:]...)
	}
	header = append(header, mask[:]...)

	masked := make([]byte, n)
	for i := 0; i < n; i++ {
		masked[i] = payload[i] ^ mask[i%4]
	}
	if _, err := w.conn.Write(header); err != nil {
		return err
	}
	_, err := w.conn.Write(masked)
	return err
}

func (w *wsConn) ReadText() ([]byte, error) {
	const maxMessageSize = 8 * 1024 * 1024 // 8 MB safety cap
	var assembled []byte
	inFragment := false

	for {
		var hdr [2]byte
		if _, err := io.ReadFull(w.r, hdr[:]); err != nil {
			return nil, err
		}
		fin := (hdr[0] & 0x80) != 0
		opcode := hdr[0] & 0x0F
		masked := (hdr[1] & 0x80) != 0
		length := uint64(hdr[1] & 0x7F)
		switch length {
		case 126:
			var ext [2]byte
			if _, err := io.ReadFull(w.r, ext[:]); err != nil {
				return nil, err
			}
			length = uint64(binary.BigEndian.Uint16(ext[:]))
		case 127:
			var ext [8]byte
			if _, err := io.ReadFull(w.r, ext[:]); err != nil {
				return nil, err
			}
			length = binary.BigEndian.Uint64(ext[:])
		}
		if length > maxMessageSize || uint64(len(assembled))+length > maxMessageSize {
			return nil, errors.New("ws message exceeds maximum allowed size")
		}
		var mask [4]byte
		if masked {
			if _, err := io.ReadFull(w.r, mask[:]); err != nil {
				return nil, err
			}
		}
		payload := make([]byte, length)
		if _, err := io.ReadFull(w.r, payload); err != nil {
			return nil, err
		}
		if masked {
			for i := uint64(0); i < length; i++ {
				payload[i] ^= mask[i%4]
			}
		}
		switch opcode {
		case 0x1: // text frame
			if fin {
				return payload, nil
			}
			assembled = append(assembled[:0], payload...)
			inFragment = true
		case 0x0: // continuation frame
			if !inFragment {
				continue
			}
			assembled = append(assembled, payload...)
			if fin {
				return assembled, nil
			}
		case 0x8: // close
			return nil, io.EOF
		case 0x9, 0xA: // ping / pong
			continue
		default:
			continue
		}
	}
}
