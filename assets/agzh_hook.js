'use strict';

// AntigravityZH Electron Main-Process Runtime Localization Hook
// Injected via temporary loopback V8 inspector (--inspect-brk) without modifying any Antigravity files.

(function initAntigravityZH() {
  if (!process.versions || !process.versions.electron) return;
  if (process.type && process.type !== 'browser') return;
  if (global.__AGZH_MAIN_HOOKED__) return;
  global.__AGZH_MAIN_HOOKED__ = true;

  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const Module = require('module');
  const debug = process.env.AGZH_DEBUG === '1';

  const dictPath = process.env.AGZH_DICT || '';
  const rendererPath = process.env.AGZH_RENDERER || '';
  const skinRendererPath = process.env.AGZH_SKIN_RENDERER || '';
  const userDataDir = process.env.AGZH_USER_DATA || '';
  delete process.env.AGZH_DICT;
  delete process.env.AGZH_RENDERER;
  delete process.env.AGZH_SKIN_RENDERER;
  delete process.env.AGZH_USER_DATA;
  delete process.env.AGZH_DEBUG;

  const runtimeDir = dictPath ? path.dirname(dictPath) : '';
  const configBaseDir = userDataDir || (runtimeDir ? path.dirname(runtimeDir) : '');
  const skinConfigPath = configBaseDir ? path.join(configBaseDir, 'skin_config.json') : '';
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
  const closeInspectorTimer = setTimeout(() => {
    try {
      const inspector = require('inspector');
      if (inspector && typeof inspector.close === 'function') {
        inspector.close();
        logDebug('Closed temporary V8 inspector port');
      }
    } catch (_) {}
  }, 500);
  if (closeInspectorTimer && typeof closeInspectorTimer.unref === 'function') {
    closeInspectorTimer.unref();
  }

  let dict = { menus: {}, exact: {}, attributes: {}, patterns: [], skipSelectors: [] };
  let rendererCode = '';
  let skinRendererCode = '';
  let autoCache = {};
  const MAX_CACHE_ENTRIES = 2000;
  try {
    if (dictPath && fs.existsSync(dictPath)) {
      dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
    }
    if (rendererPath && fs.existsSync(rendererPath)) {
      rendererCode = fs.readFileSync(rendererPath, 'utf8');
    }
    if (skinRendererPath && fs.existsSync(skinRendererPath)) {
      skinRendererCode = fs.readFileSync(skinRendererPath, 'utf8');
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
  const zhVersion = (dict && typeof dict.version === 'string' && dict.version.trim()) || '2.35.2.3';
  const dictJsonStr = JSON.stringify(dict);
  const menuMap = Object.assign({}, dict.menus || {});
  dict = null; // Free parsed dict object from Electron main-process heap.

  let autoCacheSize = Object.keys(autoCache).length;
  let cacheJsonStr = JSON.stringify(autoCache);
  let cacheJsonDirty = false;
  let cacheDiskDirty = false;
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
    cacheJsonDirty = true;
    cacheDiskDirty = true;
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
      cacheJsonDirty = false;
      cacheDiskDirty = false;
      const tmp = cachePath + '.tmp';
      fs.promises.writeFile(tmp, serialized, 'utf8')
        .then(() => fs.promises.rename(tmp, cachePath))
        .catch((e) => {
          logDebug('Cache save failed: ' + String(e));
          fs.promises.unlink(tmp).catch(() => {});
        })
        .finally(() => {
          cacheSaving = false;
          if (cacheDiskDirty) scheduleSaveCache();
        });
    }, 1000);
    if (cacheSaveTimer && typeof cacheSaveTimer.unref === 'function') {
      cacheSaveTimer.unref();
    }
  }

  function flushCacheSync() {
    if (!cachePath || !cacheDiskDirty) return;
    if (cacheSaveTimer) {
      clearTimeout(cacheSaveTimer);
      cacheSaveTimer = null;
    }
    cacheDiskDirty = false;
    const tmp = cachePath + '.sync.tmp';
    try {
      const serialized = JSON.stringify(autoCache);
      cacheJsonStr = serialized;
      cacheJsonDirty = false;
      fs.writeFileSync(tmp, serialized, 'utf8');
      fs.renameSync(tmp, cachePath);
    } catch (e) {
      logDebug('Sync cache flush failed: ' + String(e));
      try { fs.unlinkSync(tmp); } catch (_) {}
    }
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
  let electronDialog = null;
  let electronBrowserWindow = null;
  const hubWebContents = new Set();

  // --- Custom Static Image Skin State & Persistence ---
  const MAX_SKIN_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB
  const STATIC_IMAGE_MIME_BY_EXT = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.avif': 'image/avif'
  };
  const DEFAULT_SKIN_CONFIG = {
    version: 2,
    enabled: false,
    imagePath: '',
    mode: 'blend',
    scope: 'full',
    fit: 'cover',
    position: 'center',
    opacity: 1.0,
    scrimOpacity: 0.22,
    surfaceOpacity: 0.45,
    blur: 0,
    overlayOpacity: 0.18
  };

  function clampSkinNum(val, min, max, fallback) {
    const n = typeof val === 'number' ? val : Number(val);
    if (!Number.isFinite(n)) return fallback;
    if (n < min) return min;
    if (n > max) return max;
    return Math.round(n * 1000) / 1000;
  }

  function normalizeSkinConfig(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const migrateV1 = src.version === 1 && src.opacity === 0.85 && src.scrimOpacity === 0.45 && src.surfaceOpacity === 0.78;
    const mode = src.mode === 'overlay' ? 'overlay' : 'blend';
    const scope = src.scope === 'main' ? 'main' : 'full';
    const fit = src.fit === 'contain' || src.fit === 'fill' ? src.fit : 'cover';
    const pos = ['center', 'top', 'bottom', 'left', 'right'].includes(src.position) ? src.position : 'center';
    return {
      version: 2,
      enabled: Boolean(src.enabled),
      imagePath: typeof src.imagePath === 'string' ? src.imagePath.trim() : '',
      mode,
      scope,
      fit,
      position: pos,
      opacity: migrateV1 ? DEFAULT_SKIN_CONFIG.opacity : clampSkinNum(src.opacity, 0.1, 1, DEFAULT_SKIN_CONFIG.opacity),
      scrimOpacity: migrateV1 ? DEFAULT_SKIN_CONFIG.scrimOpacity : clampSkinNum(src.scrimOpacity, 0, 0.85, DEFAULT_SKIN_CONFIG.scrimOpacity),
      surfaceOpacity: migrateV1 ? DEFAULT_SKIN_CONFIG.surfaceOpacity : clampSkinNum(src.surfaceOpacity, 0, 0.9, DEFAULT_SKIN_CONFIG.surfaceOpacity),
      blur: Math.round(clampSkinNum(src.blur, 0, 24, DEFAULT_SKIN_CONFIG.blur)),
      overlayOpacity: clampSkinNum(src.overlayOpacity, 0.03, 0.5, DEFAULT_SKIN_CONFIG.overlayOpacity)
    };
  }

  function detectStaticImageMime(buf, ext) {
    if (!buf || buf.length < 12) return null;
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
        buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A) {
      return 'image/png';
    }
    // JPEG: FF D8 FF
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
      return 'image/jpeg';
    }
    // WebP: RIFF....WEBP
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
      return 'image/webp';
    }
    // BMP: BM
    if (buf[0] === 0x42 && buf[1] === 0x4D) {
      return 'image/bmp';
    }
    // AVIF: ....ftyp + (avif|avis|mif1)
    if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
      const brand = buf.slice(8, 12).toString('ascii');
      if (brand === 'avif' || brand === 'avis' || brand === 'mif1') {
        return 'image/avif';
      }
    }
    return null;
  }

  function resolveSkinImagePath(rawPath) {
    if (!rawPath || typeof rawPath !== 'string') return '';
    let p = rawPath.trim();
    if (!p) return '';
    if (p.startsWith('~/') || p.startsWith('~\\')) {
      p = path.join(os.homedir(), p.slice(2));
    }
    if (!path.isAbsolute(p) && configBaseDir) {
      p = path.resolve(configBaseDir, p);
    }
    return p;
  }

  function loadStaticSkinImage(rawPath) {
    const resolved = resolveSkinImagePath(rawPath);
    if (!resolved) {
      return { dataUrl: '', imageName: '', error: '' };
    }
    const imageName = path.basename(resolved);
    const ext = path.extname(resolved).toLowerCase();
    if (!STATIC_IMAGE_MIME_BY_EXT[ext]) {
      return {
        dataUrl: '',
        imageName,
        error: '仅支持静态图片格式（PNG / JPG / WebP / BMP / AVIF）。'
      };
    }
    try {
      const stat = fs.statSync(resolved);
      if (!stat.isFile()) {
        return { dataUrl: '', imageName, error: '所选路径不是有效文件，请重新选择。' };
      }
      if (stat.size <= 0) {
        return { dataUrl: '', imageName, error: '图片文件为空，请重新选择。' };
      }
      if (stat.size > MAX_SKIN_IMAGE_BYTES) {
        return { dataUrl: '', imageName, error: '图片体积超过 20 MB 限制，请压缩后再试。' };
      }
      const buf = fs.readFileSync(resolved);
      const mime = detectStaticImageMime(buf, ext);
      if (!mime) {
        return { dataUrl: '', imageName, error: '文件内容不是有效的静态图片，请重新选择。' };
      }
      return {
        dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
        imageName,
        error: ''
      };
    } catch (e) {
      logDebug('loadStaticSkinImage failed: ' + String(e));
      return {
        dataUrl: '',
        imageName,
        error: '图片文件不存在或无法读取，请重新选择。'
      };
    }
  }

  let skinConfig = Object.assign({}, DEFAULT_SKIN_CONFIG);
  let skinImageDataUrl = '';
  let skinMeta = { imageName: '', imageError: '', configPath: skinConfigPath };
  let skinConfigDiskDirty = false;
  let skinConfigSaving = false;
  let skinConfigSaveTimer = null;
  let skinDialogOpen = false;

  try {
    if (skinConfigPath && fs.existsSync(skinConfigPath)) {
      const parsed = JSON.parse(fs.readFileSync(skinConfigPath, 'utf8'));
      skinConfig = normalizeSkinConfig(parsed);
      if (skinConfig.imagePath) {
        const loaded = loadStaticSkinImage(skinConfig.imagePath);
        skinImageDataUrl = loaded.dataUrl;
        skinMeta = { imageName: loaded.imageName, imageError: loaded.error, configPath: skinConfigPath };
      }
    }
  } catch (err) {
    logDebug('Skin config load failed, using defaults: ' + String(err));
    skinConfig = Object.assign({}, DEFAULT_SKIN_CONFIG);
  }

  function scheduleSaveSkinConfig() {
    if (!skinConfigPath) return;
    skinConfigDiskDirty = true;
    if (skinConfigSaveTimer) return;
    skinConfigSaveTimer = setTimeout(() => {
      skinConfigSaveTimer = null;
      if (skinConfigSaving) {
        scheduleSaveSkinConfig();
        return;
      }
      skinConfigSaving = true;
      skinConfigDiskDirty = false;
      const serialized = JSON.stringify(skinConfig, null, 2);
      const tmp = skinConfigPath + '.tmp';
      fs.promises.mkdir(path.dirname(skinConfigPath), { recursive: true })
        .then(() => fs.promises.writeFile(tmp, serialized, 'utf8'))
        .then(() => fs.promises.rename(tmp, skinConfigPath))
        .catch((e) => {
          logDebug('Skin config save failed: ' + String(e));
          fs.promises.unlink(tmp).catch(() => {});
        })
        .finally(() => {
          skinConfigSaving = false;
          if (skinConfigDiskDirty) scheduleSaveSkinConfig();
        });
    }, 200);
    if (skinConfigSaveTimer && typeof skinConfigSaveTimer.unref === 'function') {
      skinConfigSaveTimer.unref();
    }
  }

  function flushSkinConfigSync() {
    if (!skinConfigPath || !skinConfigDiskDirty) return;
    if (skinConfigSaveTimer) {
      clearTimeout(skinConfigSaveTimer);
      skinConfigSaveTimer = null;
    }
    skinConfigDiskDirty = false;
    const tmp = skinConfigPath + '.sync.tmp';
    try {
      fs.mkdirSync(path.dirname(skinConfigPath), { recursive: true });
      fs.writeFileSync(tmp, JSON.stringify(skinConfig, null, 2), 'utf8');
      fs.renameSync(tmp, skinConfigPath);
    } catch (e) {
      logDebug('Sync skin config flush failed: ' + String(e));
      try { fs.unlinkSync(tmp); } catch (_) {}
    }
  }

  function broadcastSkinUpdate(payload, excludeWc) {
    const js = `window.__AGZH_SKIN_APPLY__ && window.__AGZH_SKIN_APPLY__(${JSON.stringify(payload)});`;
    for (const target of hubWebContents) {
      if (!target || target.isDestroyed()) {
        hubWebContents.delete(target);
        continue;
      }
      if (excludeWc && target === excludeWc) continue;
      target.executeJavaScript(js, true).catch(() => {});
    }
  }

  function openSkinPanel() {
    let targetWc = null;
    try {
      if (electronBrowserWindow && typeof electronBrowserWindow.getFocusedWindow === 'function') {
        const win = electronBrowserWindow.getFocusedWindow();
        if (win && win.webContents && !win.webContents.isDestroyed() && hubWebContents.has(win.webContents)) {
          targetWc = win.webContents;
        }
      }
    } catch (_) {}
    if (!targetWc) {
      for (const wc of hubWebContents) {
        if (wc && !wc.isDestroyed()) {
          targetWc = wc;
          break;
        }
      }
    }
    if (!targetWc) return;
    targetWc.executeJavaScript('window.__AGZH_OPEN_SKIN_PANEL__ && window.__AGZH_OPEN_SKIN_PANEL__();', true).catch(() => {});
  }

  async function handlePickSkinImage(senderWc) {
    if (skinDialogOpen || !electronDialog || typeof electronDialog.showOpenDialog !== 'function') return;
    skinDialogOpen = true;
    try {
      let parentWin = undefined;
      if (electronBrowserWindow && typeof electronBrowserWindow.fromWebContents === 'function' && senderWc && !senderWc.isDestroyed()) {
        parentWin = electronBrowserWindow.fromWebContents(senderWc) || undefined;
      }
      const opts = {
        title: '选择自定义皮肤图片（静态图片）',
        properties: ['openFile'],
        filters: [
          { name: '静态图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'avif'] }
        ]
      };
      const res = parentWin
        ? await electronDialog.showOpenDialog(parentWin, opts)
        : await electronDialog.showOpenDialog(opts);
      if (!res || res.canceled || !Array.isArray(res.filePaths) || res.filePaths.length === 0) {
        return;
      }
      const picked = res.filePaths[0];
      const loaded = loadStaticSkinImage(picked);
      if (loaded.error) {
        if (senderWc && !senderWc.isDestroyed()) {
          const errPayload = { meta: { imageError: loaded.error } };
          senderWc.executeJavaScript(`window.__AGZH_SKIN_APPLY__ && window.__AGZH_SKIN_APPLY__(${JSON.stringify(errPayload)});`, true).catch(() => {});
        }
        return;
      }
      skinConfig = normalizeSkinConfig(Object.assign({}, skinConfig, {
        imagePath: picked,
        enabled: true
      }));
      skinImageDataUrl = loaded.dataUrl;
      skinMeta = { imageName: loaded.imageName, imageError: '', configPath: skinConfigPath };
      scheduleSaveSkinConfig();
      broadcastSkinUpdate({
        config: skinConfig,
        imageDataUrl: skinImageDataUrl,
        meta: skinMeta
      });
    } catch (e) {
      logDebug('handlePickSkinImage error: ' + String(e));
    } finally {
      skinDialogOpen = false;
    }
  }

  function handleSkinMessage(senderWc, rawJson) {
    let msg;
    try {
      msg = JSON.parse(rawJson);
    } catch (_) {
      return;
    }
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'pick-image') {
      handlePickSkinImage(senderWc);
      return;
    }
    if (msg.type === 'update-config' && msg.patch && typeof msg.patch === 'object') {
      // Never allow renderer patch to overwrite imagePath directly (must go through native dialog or config file).
      const safePatch = Object.assign({}, msg.patch);
      delete safePatch.imagePath;
      skinConfig = normalizeSkinConfig(Object.assign({}, skinConfig, safePatch));
      scheduleSaveSkinConfig();
      broadcastSkinUpdate({ config: skinConfig }, senderWc);
      return;
    }
    if (msg.type === 'clear-image') {
      skinConfig = normalizeSkinConfig(Object.assign({}, skinConfig, {
        imagePath: '',
        enabled: false
      }));
      skinImageDataUrl = '';
      skinMeta = { imageName: '', imageError: '', configPath: skinConfigPath };
      scheduleSaveSkinConfig();
      broadcastSkinUpdate({
        config: skinConfig,
        imageDataUrl: '',
        meta: skinMeta
      });
      return;
    }
    if (msg.type === 'reset-defaults') {
      skinConfig = normalizeSkinConfig(Object.assign({}, DEFAULT_SKIN_CONFIG, {
        imagePath: skinConfig.imagePath,
        enabled: skinConfig.enabled
      }));
      scheduleSaveSkinConfig();
      broadcastSkinUpdate({ config: skinConfig });
    }
  }

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
      // Insert "汉化助手版本 <ver>" and "自定义皮肤..." right between "版本 <ver>" and "检查更新"
      if (versionMatch) {
        const nextItem = items[i + 1];
        const nextLabel = nextItem && typeof nextItem.label === 'string'
          ? nextItem.label.replace(/&/g, '').trim()
          : '';
        if (!nextLabel.startsWith('汉化助手版本') && /^(Check for Updates|检查更新)/i.test(nextLabel)) {
          out.push({ label: '汉化助手版本 ' + zhVersion, click: openZhHomepage });
          if (skinRendererCode) {
            out.push({ label: '自定义皮肤...', click: openSkinPanel });
          }
        }
      }
    }
    return out;
  }

  function translateLiveMenu(menu, isTopLevel) {
    if (!menu || !Array.isArray(menu.items)) return;
    for (const item of menu.items) {
      if (!item) continue;
      if (typeof item.label === 'string') {
        const clean = item.label.replace(/&/g, '').trim();
        const versionMatch = /^Version\s+([\d.]+)$/i.exec(clean);
        if (versionMatch) {
          try { item.label = '版本 ' + versionMatch[1]; } catch (_) {}
        } else if (!(isTopLevel && clean === 'View')) {
          if (menuMap[item.label]) {
            try { item.label = menuMap[item.label]; } catch (_) {}
          } else if (menuMap[clean]) {
            try { item.label = menuMap[clean]; } catch (_) {}
          }
        }
      }
      if (item.submenu) {
        translateLiveMenu(item.submenu, false);
      }
    }
  }

  function buildInjectedPayload(allowFrame) {
    if (!rendererCode) return '';
    if (cacheJsonDirty) {
      cacheJsonStr = JSON.stringify(autoCache);
      cacheJsonDirty = false;
    }
    return `(function(){try{var __AGZH_DICT__=${dictJsonStr};var __AGZH_CACHE__=${cacheJsonStr};var __AGZH_DEBUG__=${debug ? 'true' : 'false'};var __AGZH_ALLOW_FRAME__=${allowFrame ? 'true' : 'false'};\n${rendererCode}\n}catch(e){}})();`;
  }

  function buildSkinInjectedPayload() {
    if (!skinRendererCode) return '';
    return `(function(){try{var __AGZH_SKIN_CONFIG__=${JSON.stringify(skinConfig)};var __AGZH_SKIN_IMAGE__=${JSON.stringify(skinImageDataUrl)};var __AGZH_SKIN_META__=${JSON.stringify(skinMeta)};\n${skinRendererCode}\n}catch(e){}})();`;
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

    const { app, Menu, net, webFrameMain, shell, dialog, BrowserWindow } = electron;
    if (net) electronNet = net;
    if (shell) electronShell = shell;
    if (dialog) electronDialog = dialog;
    if (BrowserWindow) electronBrowserWindow = BrowserWindow;

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
          translateLiveMenu(menu, true);
        } catch (_) {}
        return origSetAppMenu(menu);
      };
    }

    if (app && typeof app.once === 'function') {
      app.once('before-quit', () => {
        flushCacheSync();
        flushSkinConfigSync();
      });
    }

    if (app && rendererCode) {
      app.on('web-contents-created', (_event, wc) => {
        if (!wc || wc.isDestroyed()) return;
        const wcType = typeof wc.getType === 'function' ? wc.getType() : '';
        if (wcType === 'devtools') return;

        // Listen for on-demand plugin/modal translation requests, skin actions, and homepage open signal from Hub renderer only.
        wc.on('console-message', (ev, _level, message) => {
          const msg = typeof message === 'string'
            ? message
            : (ev && typeof ev.message === 'string' ? ev.message : '');
          if (!msg) return;
          const isOpenSignal = msg === '__AGZH_OPEN_HOMEPAGE__';
          const isTxSignal = msg.startsWith('__AGZH_TX__');
          const isSkinSignal = msg.startsWith('__AGZH_SKIN__');
          if (!isOpenSignal && !isTxSignal && !isSkinSignal) return;
          if (wc.isDestroyed()) return;
          const curUrl = typeof wc.getURL === 'function' ? wc.getURL() : '';
          if (!isAntigravityHubUrl(curUrl)) return;
          if (isOpenSignal) {
            openZhHomepage();
            return;
          }
          if (isSkinSignal) {
            handleSkinMessage(wc, msg.slice('__AGZH_SKIN__'.length));
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

        wc.once('destroyed', () => {
          hubWebContents.delete(wc);
        });

        const injectedChildFrames = new WeakMap(); // WebFrameMain -> last injected URL

        const injectChildFrame = (frame) => {
          if (!frame || (typeof frame.isDestroyed === 'function' && frame.isDestroyed())) return;
          const fUrl = frame.url || '';
          if (!isLocalUiFrameUrl(fUrl)) return;
          const frameKey = fUrl || '__empty__';
          if (injectedChildFrames.get(frame) === frameKey) return;
          injectedChildFrames.set(frame, frameKey);
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
        let lastInjectedSkinUrl = '';

        wc.on('did-start-navigation', (_ev, _url, isInPlace, isMainFrame) => {
          if (isMainFrame && !isInPlace) {
            lastInjectedMainUrl = '';
            lastInjectedSkinUrl = '';
          }
        });

        const injectIfHub = (evName) => {
          if (wc.isDestroyed()) return;
          const url = typeof wc.getURL === 'function' ? wc.getURL() : '';
          logDebug(`wc event=${evName} type=${wcType} url=${url.slice(0, 80)}`);
          const isLocalWebview = wcType === 'webview' && (isAntigravityHubUrl(url) || url.startsWith('data:text/html'));
          if (!isAntigravityHubUrl(url) && !isLocalWebview) return;
          if (!isLocalWebview && isAntigravityHubUrl(url)) {
            hubWebContents.add(wc);
          }
          if (!url || lastInjectedMainUrl !== url) {
            lastInjectedMainUrl = url || '__local__';
            wc.executeJavaScript(buildInjectedPayload(isLocalWebview), true).catch((e) => {
              lastInjectedMainUrl = '';
              logDebug('executeJavaScript failed: ' + String(e));
            });
          }
          if (skinRendererCode && !isLocalWebview && isAntigravityHubUrl(url) && lastInjectedSkinUrl !== url) {
            lastInjectedSkinUrl = url;
            wc.executeJavaScript(buildSkinInjectedPayload(), true).catch((e) => {
              lastInjectedSkinUrl = '';
              logDebug('skin executeJavaScript failed: ' + String(e));
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
