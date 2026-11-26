'use strict';

// AntigravityZH Electron Main-Process Runtime Localization Hook
// Injected via temporary loopback V8 inspector (--inspect-brk) without modifying any Antigravity files.

(function initAntigravityZH() {
  if (!process.versions || !process.versions.electron) return;
  if (process.type && process.type !== 'browser') return;
  if (global.__AGZH_MAIN_HOOKED__) return;
  global.__AGZH_MAIN_HOOKED__ = true;

  const fs = require('fs');
  const path = require('path');
  const Module = require('module');
  const debug = process.env.AGZH_DEBUG === '1';

  const dictPath = process.env.AGZH_DICT || '';
  const rendererPath = process.env.AGZH_RENDERER || '';
  delete process.env.AGZH_DICT;
  delete process.env.AGZH_RENDERER;
  delete process.env.AGZH_DEBUG;

  const runtimeDir = dictPath ? path.dirname(dictPath) : '';
  const cachePath = runtimeDir ? path.join(runtimeDir, 'plugin_cache_zh.json') : '';
  const logFile = debug && runtimeDir ? path.join(runtimeDir, 'debug.log') : '';

  function logDebug(msg) {
    if (!debug) return;
    try {
      if (logFile) fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`, 'utf8');
    } catch (_) {}
  }

  logDebug('agzh_hook.js loaded in Electron main process');

  // Close the temporary V8 inspector port right after Debugger.resume completes.
  setTimeout(() => {
    try {
      const inspector = require('inspector');
      if (inspector && typeof inspector.close === 'function') {
        inspector.close();
        logDebug('Closed temporary V8 inspector port');
      }
    } catch (_) {}
  }, 500);

  let dict = { menus: {}, exact: {}, attributes: {}, patterns: [], skipSelectors: [] };
  let rendererCode = '';
  let autoCache = {};
  const MAX_CACHE_ENTRIES = 2000;
  try {
    if (dictPath && fs.existsSync(dictPath)) {
      dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
    }
    if (rendererPath && fs.existsSync(rendererPath)) {
      rendererCode = fs.readFileSync(rendererPath, 'utf8');
    }
  } catch (err) {
    logDebug('Failed to load core assets: ' + String(err));
    return;
  }

  // Load optional auto-translation cache in isolated try/catch so corruption never breaks core localization.
  try {
    if (cachePath && fs.existsSync(cachePath)) {
      const parsed = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        autoCache = parsed;
      }
    }
  } catch (err) {
    logDebug('Auto-cache corrupted, resetting: ' + String(err));
    autoCache = {};
  }

  // Pre-serialize static dictionary JSON once at startup (avoids re-stringifying ~100KB on every page load).
  const zhVersion = (dict && typeof dict.version === 'string' && dict.version.trim()) || '2.35.2';
  const dictJsonStr = JSON.stringify(dict);
  const menuMap = Object.assign({}, dict.menus || {});
  dict = null; // Free parsed dict object from Electron main-process heap.

  let autoCacheSize = Object.keys(autoCache).length;
  let cacheJsonStr = JSON.stringify(autoCache);
  let cacheDirty = false;
  let cacheSaving = false;
  let cacheSaveTimer = null;

  function setAutoCacheEntry(key, val) {
    if (!Object.prototype.hasOwnProperty.call(autoCache, key)) {
      if (autoCacheSize >= MAX_CACHE_ENTRIES) {
        for (const oldest in autoCache) {
          if (Object.prototype.hasOwnProperty.call(autoCache, oldest)) {
            delete autoCache[oldest];
            autoCacheSize--;
            break;
          }
        }
      }
      autoCacheSize++;
    }
    autoCache[key] = val;
    cacheDirty = true;
    scheduleSaveCache();
  }

  function scheduleSaveCache() {
    if (!cachePath || cacheSaveTimer) return;
    cacheSaveTimer = setTimeout(() => {
      cacheSaveTimer = null;
      if (cacheSaving) {
        scheduleSaveCache();
        return;
      }
      cacheSaving = true;
      const serialized = JSON.stringify(autoCache);
      cacheJsonStr = serialized;
      cacheDirty = false;
      const tmp = cachePath + '.tmp';
      fs.promises.writeFile(tmp, serialized, 'utf8')
        .then(() => fs.promises.rename(tmp, cachePath))
        .catch((e) => {
          logDebug('Cache save failed: ' + String(e));
          fs.promises.unlink(tmp).catch(() => {});
        })
        .finally(() => {
          cacheSaving = false;
          if (cacheDirty) scheduleSaveCache();
        });
    }, 1000);
  }

  // On-demand lightweight translation via Electron's net.fetch (inherits system proxy automatically).
  let electronNet = null;
  const inflight = new Map();

  async function translateOne(text) {
    if (autoCache[text]) return autoCache[text];
    if (inflight.has(text)) return inflight.get(text);

    const p = (async () => {
      let timer = null;
      try {
        if (!electronNet || typeof electronNet.fetch !== 'function') return null;
        const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=' + encodeURIComponent(text);
        const controller = new AbortController();
        timer = setTimeout(() => controller.abort(), 6000);
        const resp = await electronNet.fetch(url, { signal: controller.signal });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (Array.isArray(data) && Array.isArray(data[0])) {
          const translated = data[0].map((seg) => (Array.isArray(seg) ? seg[0] : '')).join('').trim();
          if (translated && translated !== text) {
            setAutoCacheEntry(text, translated);
            return translated;
          }
        }
      } catch (e) {
        logDebug('translateOne error: ' + String(e));
      } finally {
        if (timer) clearTimeout(timer);
        inflight.delete(text);
      }
      return null;
    })();

    inflight.set(text, p);
    return p;
  }

  async function translateBatch(texts) {
    const out = {};
    const failed = [];
    const missing = [];
    for (const t of texts) {
      if (typeof t !== 'string' || !t) continue;
      if (autoCache[t]) {
        out[t] = autoCache[t];
      } else {
        missing.push(t);
      }
    }
    if (missing.length === 0) return { out, failed };

    // Translate up to 4 concurrently to stay fast and light.
    const concurrency = 4;
    let idx = 0;
    async function worker() {
      while (idx < missing.length) {
        const item = missing[idx++];
        const res = await translateOne(item);
        if (res) out[item] = res;
        else failed.push(item);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, missing.length) }, worker));
    return { out, failed };
  }

  const ZH_HOMEPAGE_URL = 'https://github.com/keinx/AntigravityZH';
  let electronShell = null;

  function openZhHomepage() {
    try {
      if (electronShell && typeof electronShell.openExternal === 'function') {
        electronShell.openExternal(ZH_HOMEPAGE_URL);
      }
    } catch (_) {}
  }

  function translateMenuTemplate(items, isTopLevel) {
    if (!Array.isArray(items)) return items;
    const out = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || typeof item !== 'object') {
        out.push(item);
        continue;
      }
      const cloned = Object.assign({}, item);
      let versionMatch = null;
      if (typeof cloned.label === 'string') {
        const clean = cloned.label.replace(/&/g, '').trim();
        versionMatch = /^Version\s+([\d.]+)$/i.exec(clean);
        if (versionMatch) {
          cloned.label = '版本 ' + versionMatch[1];
        } else if (!(isTopLevel && clean === 'View')) {
          if (menuMap[cloned.label]) {
            cloned.label = menuMap[cloned.label];
          } else if (menuMap[clean]) {
            cloned.label = menuMap[clean];
          }
        }
      }
      if (typeof cloned.toolTip === 'string' && menuMap[cloned.toolTip]) {
        cloned.toolTip = menuMap[cloned.toolTip];
      }
      if (Array.isArray(cloned.submenu)) {
        cloned.submenu = translateMenuTemplate(cloned.submenu, false);
      }
      out.push(cloned);
      // Insert "汉化助手版本 <ver>" right between "版本 <ver>" and "检查更新"
      if (versionMatch) {
        const nextItem = items[i + 1];
        const nextLabel = nextItem && typeof nextItem.label === 'string'
          ? nextItem.label.replace(/&/g, '').trim()
          : '';
        if (!nextLabel.startsWith('汉化助手版本') && /^(Check for Updates|检查更新)/i.test(nextLabel)) {
          out.push({ label: '汉化助手版本 ' + zhVersion, click: openZhHomepage });
        }
      }
    }
    return out;
  }

  function translateLiveMenu(menu) {
    if (!menu || !Array.isArray(menu.items)) return;
    for (const item of menu.items) {
      if (!item) continue;
      if (typeof item.label === 'string') {
        const clean = item.label.replace(/&/g, '').trim();
        if (menuMap[item.label]) {
          try { item.label = menuMap[item.label]; } catch (_) {}
        } else if (menuMap[clean]) {
          try { item.label = menuMap[clean]; } catch (_) {}
        }
      }
      if (item.submenu) {
        translateLiveMenu(item.submenu);
      }
    }
  }

  function buildInjectedPayload(allowFrame) {
    if (!rendererCode) return '';
    if (cacheDirty) {
      cacheJsonStr = JSON.stringify(autoCache);
      cacheDirty = false;
    }
    return `(function(){try{var __AGZH_DICT__=${dictJsonStr};var __AGZH_CACHE__=${cacheJsonStr};var __AGZH_DEBUG__=${debug ? 'true' : 'false'};var __AGZH_ALLOW_FRAME__=${allowFrame ? 'true' : 'false'};\n${rendererCode}\n}catch(e){}})();`;
  }

  function isAntigravityHubUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    try {
      const u = new URL(rawUrl);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
      return u.hostname === '127.0.0.1' || u.hostname === 'localhost';
    } catch (_) {
      return false;
    }
  }

  function isLocalUiFrameUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return true;
    if (rawUrl === 'about:srcdoc' || rawUrl === 'about:blank') return true;
    if (rawUrl.startsWith('data:text/html') || rawUrl.startsWith('blob:')) return true;
    try {
      const u = new URL(rawUrl);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        return u.hostname === '127.0.0.1' || u.hostname === 'localhost';
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  function attachElectronHooks(electron) {
    if (!electron || electron.__AGZH_PATCHED__) return;
    electron.__AGZH_PATCHED__ = true;
    logDebug('Attaching Electron hooks (Menu + web-contents-created + auto-tx)');

    const { app, Menu, net, webFrameMain, shell } = electron;
    if (net) electronNet = net;
    if (shell) electronShell = shell;

    if (Menu && typeof Menu.buildFromTemplate === 'function') {
      const origBuild = Menu.buildFromTemplate.bind(Menu);
      Menu.buildFromTemplate = function patchedBuildFromTemplate(template) {
        try {
          return origBuild(translateMenuTemplate(template, true));
        } catch (_) {
          return origBuild(template);
        }
      };
    }

    if (Menu && typeof Menu.setApplicationMenu === 'function') {
      const origSetAppMenu = Menu.setApplicationMenu.bind(Menu);
      Menu.setApplicationMenu = function patchedSetApplicationMenu(menu) {
        try {
          translateLiveMenu(menu);
        } catch (_) {}
        return origSetAppMenu(menu);
      };
    }

    if (app && rendererCode) {
      app.on('web-contents-created', (_event, wc) => {
        if (!wc || wc.isDestroyed()) return;
        const wcType = typeof wc.getType === 'function' ? wc.getType() : '';

        // Listen for on-demand plugin/modal translation requests and homepage open signal from Hub renderer only.
        wc.on('console-message', (ev, _level, message) => {
          const msg = typeof message === 'string'
            ? message
            : (ev && typeof ev.message === 'string' ? ev.message : '');
          if (!msg) return;
          const isOpenSignal = msg === '__AGZH_OPEN_HOMEPAGE__';
          const isTxSignal = msg.startsWith('__AGZH_TX__');
          if (!isOpenSignal && !isTxSignal) return;
          if (wc.isDestroyed()) return;
          const curUrl = typeof wc.getURL === 'function' ? wc.getURL() : '';
          if (!isAntigravityHubUrl(curUrl)) return;
          if (isOpenSignal) {
            openZhHomepage();
            return;
          }
          try {
            const texts = JSON.parse(msg.slice('__AGZH_TX__'.length));
            if (!Array.isArray(texts) || texts.length === 0) return;
            translateBatch(texts).then(({ out, failed }) => {
              if (wc.isDestroyed() || (Object.keys(out).length === 0 && failed.length === 0)) return;
              wc.executeJavaScript(`window.__AGZH_APPLY_TX__ && window.__AGZH_APPLY_TX__(${JSON.stringify(out)},${JSON.stringify(failed)});`, true).catch(() => {});
            }).catch(() => {});
          } catch (_) {}
        });

        const injectedChildFrames = new WeakMap(); // WebFrameMain -> last injected URL

        const injectChildFrame = (frame) => {
          if (!frame || (typeof frame.isDestroyed === 'function' && frame.isDestroyed())) return;
          const fUrl = frame.url || '';
          if (!isLocalUiFrameUrl(fUrl)) return;
          if (fUrl && injectedChildFrames.get(frame) === fUrl) return;
          injectedChildFrames.set(frame, fUrl || '__empty__');
          logDebug(`wc child-frame url=${fUrl.slice(0, 80)}`);
          frame.executeJavaScript(buildInjectedPayload(true), true).catch((e) => {
            injectedChildFrames.delete(frame);
            logDebug('child frame executeJavaScript failed: ' + String(e));
          });
        };

        wc.on('did-frame-navigate', (ev, _url, _code, _status, isMainFrame, frameProcessId, frameRoutingId) => {
          if (isMainFrame) return;
          const frame = (ev && ev.senderFrame) ||
            (webFrameMain && typeof webFrameMain.fromId === 'function'
              ? webFrameMain.fromId(frameProcessId, frameRoutingId)
              : null);
          if (frame) injectedChildFrames.delete(frame);
        });

        let lastInjectedMainUrl = '';

        wc.on('did-start-navigation', (_ev, _url, isInPlace, isMainFrame) => {
          if (isMainFrame && !isInPlace) {
            lastInjectedMainUrl = '';
          }
        });

        const injectIfHub = (evName) => {
          if (wc.isDestroyed()) return;
          const url = typeof wc.getURL === 'function' ? wc.getURL() : '';
          logDebug(`wc event=${evName} type=${wcType} url=${url.slice(0, 80)}`);
          const isLocalWebview = wcType === 'webview' && (isAntigravityHubUrl(url) || url.startsWith('data:text/html'));
          if (!isAntigravityHubUrl(url) && !isLocalWebview) return;
          if (!url || lastInjectedMainUrl !== url) {
            lastInjectedMainUrl = url || '__local__';
            wc.executeJavaScript(buildInjectedPayload(isLocalWebview), true).catch((e) => {
              lastInjectedMainUrl = '';
              logDebug('executeJavaScript failed: ' + String(e));
            });
          }
          // Sweep any already-loaded local UI plugin child frames (e.g. Swarm panel).
          if (wc.mainFrame && Array.isArray(wc.mainFrame.framesInSubtree)) {
            for (const f of wc.mainFrame.framesInSubtree) {
              if (f !== wc.mainFrame) injectChildFrame(f);
            }
          }
        };

        wc.on('dom-ready', () => injectIfHub('dom-ready'));
        wc.on('did-finish-load', () => injectIfHub('did-finish-load'));

        // Also inject into local UI Plugin / MCP App child iframes (e.g. Swarm panel) inside the Hub window.
        wc.on('did-frame-finish-load', (ev, isMainFrame, frameProcessId, frameRoutingId) => {
          if (isMainFrame || wc.isDestroyed()) return;
          const mainUrl = typeof wc.getURL === 'function' ? wc.getURL() : '';
          if (!isAntigravityHubUrl(mainUrl)) return;
          const frame = (ev && ev.senderFrame) ||
            (webFrameMain && typeof webFrameMain.fromId === 'function'
              ? webFrameMain.fromId(frameProcessId, frameRoutingId)
              : null);
          injectChildFrame(frame);
        });
      });
    }
  }

  try {
    attachElectronHooks(require('electron'));
  } catch (_) {}

  const origLoad = Module._load;
  Module._load = function patchedLoad(request) {
    const exported = origLoad.apply(this, arguments);
    if (request === 'electron' && exported && typeof exported === 'object') {
      try {
        attachElectronHooks(exported);
      } catch (err) {
        logDebug('Hook error: ' + String(err));
      }
    }
    return exported;
  };
})();
