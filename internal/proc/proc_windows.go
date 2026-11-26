//go:build windows

package proc

import (
	"strings"
	"syscall"
	"time"
	"unsafe"
)

var (
	kernel32                 = syscall.NewLazyDLL("kernel32.dll")
	user32                   = syscall.NewLazyDLL("user32.dll")
	procCreateToolhelp32Snap = kernel32.NewProc("CreateToolhelp32Snapshot")
	procProcess32FirstW      = kernel32.NewProc("Process32FirstW")
	procProcess32NextW       = kernel32.NewProc("Process32NextW")
	procEnumWindows          = user32.NewProc("EnumWindows")
	procGetWindowThreadPID   = user32.NewProc("GetWindowThreadProcessId")
	procPostMessageW         = user32.NewProc("PostMessageW")
)

const (
	th32csSnapProcess = 0x00000002
	wmClose           = 0x0010
	processTerminate  = 0x0001
	processSync       = 0x00100000
)

type processEntry32W struct {
	Size            uint32
	CntUsage        uint32
	ProcessID       uint32
	DefaultHeapID   uintptr
	ModuleID        uint32
	CntThreads      uint32
	ParentProcessID uint32
	PriClassBase    int32
	Flags           uint32
	ExeFile         [260]uint16
}

// FindPIDsByName returns all running process IDs whose executable name matches exeName (case-insensitive).
func FindPIDsByName(exeName string) ([]uint32, error) {
	snap, _, err := procCreateToolhelp32Snap.Call(th32csSnapProcess, 0)
	if syscall.Handle(snap) == syscall.InvalidHandle {
		return nil, err
	}
	defer syscall.CloseHandle(syscall.Handle(snap))

	var entry processEntry32W
	entry.Size = uint32(unsafe.Sizeof(entry))

	ret, _, err := procProcess32FirstW.Call(snap, uintptr(unsafe.Pointer(&entry)))
	if ret == 0 {
		return nil, err
	}

	target := strings.ToLower(exeName)
	var pids []uint32
	for {
		name := strings.ToLower(syscall.UTF16ToString(entry.ExeFile[:]))
		if name == target {
			pids = append(pids, entry.ProcessID)
		}
		ret, _, _ = procProcess32NextW.Call(snap, uintptr(unsafe.Pointer(&entry)))
		if ret == 0 {
			break
		}
	}
	return pids, nil
}

// CloseAndWait gracefully closes top-level windows for the given PIDs, waits up to timeout,
// and force-terminates any remaining processes.
func CloseAndWait(exeName string, timeout time.Duration) error {
	pids, err := FindPIDsByName(exeName)
	if err != nil || len(pids) == 0 {
		return err
	}

	pidSet := make(map[uint32]struct{}, len(pids))
	for _, pid := range pids {
		pidSet[pid] = struct{}{}
	}

	// Send WM_CLOSE to all top-level windows owned by target PIDs.
	cb := syscall.NewCallback(func(hwnd uintptr, lparam uintptr) uintptr {
		var wpid uint32
		procGetWindowThreadPID.Call(hwnd, uintptr(unsafe.Pointer(&wpid)))
		if _, ok := pidSet[wpid]; ok {
			procPostMessageW.Call(hwnd, wmClose, 0, 0)
		}
		return 1
	})
	procEnumWindows.Call(cb, 0)

	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		remaining, _ := FindPIDsByName(exeName)
		if len(remaining) == 0 {
			return nil
		}
		time.Sleep(150 * time.Millisecond)
	}

	// Force terminate any lingering processes.
	remaining, _ := FindPIDsByName(exeName)
	for _, pid := range remaining {
		h, err := syscall.OpenProcess(processTerminate|processSync, false, pid)
		if err != nil {
			continue
		}
		_ = syscall.TerminateProcess(h, 0)
		_, _ = syscall.WaitForSingleObject(h, 2000)
		_ = syscall.CloseHandle(h)
	}
	return nil
}
