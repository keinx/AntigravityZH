'use strict';

// AntigravityZH Electron Main-Process Runtime Hook
// Injected via temporary loopback V8 inspector (--inspect-brk) without modifying any Antigravity files.

(function initAntigravityZH() {
  const MAX_SKIN_IMAGE_BYTES = 20 * 1024 * 1024; // 20 MB
  const MAX_SPLASH_MEDIA_BYTES = 200 * 1024 * 1024; // 200 MB
  const LAUNCHER_VERSION = '1.0.0';
  const HOMEPAGE_URL = 'https://github.com/keinx/AntigravityZH';

  const STATIC_IMAGE_MIME_BY_EXT = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.avif': 'image/avif'
  };

  const SPLASH_MEDIA_BY_EXT = {
    '.mp4': { mime: 'video/mp4', kind: 'video' },
    '.m4v': { mime: 'video/mp4', kind: 'video' },
    '.mov': { mime: 'video/mp4', kind: 'video' },
    '.webm': { mime: 'video/webm', kind: 'video' },
    '.ogv': { mime: 'video/ogg', kind: 'video' },
    '.gif': { mime: 'image/gif', kind: 'image' },
    '.webp': { mime: 'image/webp', kind: 'image' }
  };

  const DEFAULT_SPLASH_CONFIG = {
    enabled: false,
    mediaPath: '',
    fit: 'cover',
    muted: true,
    volume: 0.8,
    endMode: 'loaded',
    minDuration: 1.5
  };

  const DEFAULT_I18N_CONFIG = {
    enabled: true,
    autoTranslate: true
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

  const THEME_PRESET_IDS = ['none', 'aurora', 'washi', 'cyber', 'botanical', 'pixel'];

  const THEME_POLARITY_BY_PRESET = {
    aurora: 'dark',
    cyber: 'dark',
    washi: 'light',
    botanical: 'light',
    pixel: 'light'
  };

  function getThemePolarity(preset) {
    return (typeof preset === 'string' && THEME_POLARITY_BY_PRESET[preset]) || '';
  }

  const DEFAULT_THEME_CONFIG = {
    preset: 'none',
    replaceIcons: true,
    useBackdrop: true
  };

  function clampNum(val, min, max, fallback) {
    const n = typeof val === 'number' ? val : Number(val);
    if (!Number.isFinite(n)) return fallback;
    if (n < min) return min;
    if (n > max) return max;
    return Math.round(n * 1000) / 1000;
  }

  function normalizeI18nConfig(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
      enabled: src.enabled === undefined ? DEFAULT_I18N_CONFIG.enabled : Boolean(src.enabled),
      autoTranslate: src.autoTranslate === undefined ? DEFAULT_I18N_CONFIG.autoTranslate : Boolean(src.autoTranslate)
    };
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
      opacity: migrateV1 ? DEFAULT_SKIN_CONFIG.opacity : clampNum(src.opacity, 0.1, 1, DEFAULT_SKIN_CONFIG.opacity),
      scrimOpacity: migrateV1 ? DEFAULT_SKIN_CONFIG.scrimOpacity : clampNum(src.scrimOpacity, 0, 0.85, DEFAULT_SKIN_CONFIG.scrimOpacity),
      surfaceOpacity: migrateV1 ? DEFAULT_SKIN_CONFIG.surfaceOpacity : clampNum(src.surfaceOpacity, 0, 0.9, DEFAULT_SKIN_CONFIG.surfaceOpacity),
      blur: Math.round(clampNum(src.blur, 0, 24, DEFAULT_SKIN_CONFIG.blur)),
      overlayOpacity: clampNum(src.overlayOpacity, 0.03, 0.5, DEFAULT_SKIN_CONFIG.overlayOpacity)
    };
  }

  function normalizeThemeConfig(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const preset = typeof src.preset === 'string' && THEME_PRESET_IDS.includes(src.preset.trim())
      ? src.preset.trim()
      : DEFAULT_THEME_CONFIG.preset;
    return {
      preset,
      replaceIcons: src.replaceIcons === undefined ? DEFAULT_THEME_CONFIG.replaceIcons : Boolean(src.replaceIcons),
      useBackdrop: src.useBackdrop === undefined ? DEFAULT_THEME_CONFIG.useBackdrop : Boolean(src.useBackdrop)
    };
  }

  function normalizeSplashConfig(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const fit = src.fit === 'contain' ? 'contain' : 'cover';
    const endMode = src.endMode === 'complete' ? 'complete' : 'loaded';
    return {
      enabled: Boolean(src.enabled),
      mediaPath: typeof src.mediaPath === 'string' ? src.mediaPath.trim() : '',
      fit,
      muted: src.muted === undefined ? DEFAULT_SPLASH_CONFIG.muted : Boolean(src.muted),
      volume: clampNum(src.volume, 0, 1, DEFAULT_SPLASH_CONFIG.volume),
      endMode,
      minDuration: clampNum(src.minDuration, 0, 8, DEFAULT_SPLASH_CONFIG.minDuration)
    };
  }

  function normalizeLauncherConfig(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
      version: 1,
      i18n: normalizeI18nConfig(src.i18n),
      skin: normalizeSkinConfig(src.skin),
      theme: normalizeThemeConfig(src.theme),
      splash: normalizeSplashConfig(src.splash)
    };
  }

  function detectSplashMedia(buf, ext) {
    const normExt = typeof ext === 'string' ? ext.toLowerCase() : '';
    const byExt = SPLASH_MEDIA_BY_EXT[normExt];
    if (!byExt || !buf || buf.length < 8) return null;

    if (normExt === '.gif') {
      const hdr = buf.slice(0, 6).toString('ascii');
      if (hdr === 'GIF87a' || hdr === 'GIF89a') return { mime: 'image/gif', kind: 'image' };
      return null;
    }
    if (normExt === '.webp') {
      if (buf.length >= 12 &&
          buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
          buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
        return { mime: 'image/webp', kind: 'image' };
      }
      return null;
    }
    if (normExt === '.webm') {
      if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) {
        return { mime: 'video/webm', kind: 'video' };
      }
      return null;
    }
    if (normExt === '.ogv') {
      if (buf.slice(0, 4).toString('ascii') === 'OggS') {
        return { mime: 'video/ogg', kind: 'video' };
      }
      return null;
    }
    if (normExt === '.mp4' || normExt === '.m4v' || normExt === '.mov') {
      const box = buf.slice(4, 8).toString('ascii');
      if (box === 'ftyp' || (normExt === '.mov' && (box === 'moov' || box === 'mdat' || box === 'wide' || box === 'free'))) {
        return { mime: 'video/mp4', kind: 'video' };
      }
      return null;
    }
    return null;
  }

  function parseByteRange(rangeHeader, totalSize) {
    if (typeof rangeHeader !== 'string' || !Number.isFinite(totalSize) || totalSize <= 0) {
      return null;
    }
    const m = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
    if (!m || (m[1] === '' && m[2] === '')) return null;
    let start;
    let end;
    if (m[1] === '') {
      const suffix = Number(m[2]);
      if (!Number.isFinite(suffix) || suffix <= 0) return null;
      start = Math.max(0, totalSize - suffix);
      end = totalSize - 1;
    } else {
      start = Number(m[1]);
      end = m[2] === '' ? totalSize - 1 : Number(m[2]);
    }
    if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= totalSize || end < start) {
      return { unsatisfiable: true };
    }
    if (end >= totalSize) end = totalSize - 1;
    return { start, end, unsatisfiable: false };
  }

  function escapeSplashHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function buildSplashPageHtml(opts) {
    const o = opts && typeof opts === 'object' ? opts : {};
    const bg = typeof o.backgroundColor === 'string' && o.backgroundColor.trim() ? o.backgroundColor.trim() : '#131313';
    const mediaUrl = typeof o.mediaUrl === 'string' ? o.mediaUrl : '';
    const mediaKind = o.mediaKind === 'image' ? 'image' : 'video';
    const fit = o.fit === 'contain' ? 'contain' : 'cover';
    const muted = o.muted !== false;
    const volume = clampNum(o.volume, 0, 1, 0.8);
    const loop = Boolean(o.loop);
    const isPreview = Boolean(o.isPreview);
    const isZh = o.isZh !== false;
    const skipLabel = isZh ? '预览模式 · 点击或按 Esc 关闭' : 'Preview · Click or press Esc to close';
    const safeBg = escapeSplashHtml(bg);
    const safeUrl = escapeSplashHtml(mediaUrl);
    const safeSkipLabel = escapeSplashHtml(skipLabel);

    const mediaTag = mediaKind === 'image'
      ? `<img id="agl-media" class="agl-media" src="${safeUrl}" alt="" draggable="false" />`
      : `<video id="agl-media" class="agl-media" src="${safeUrl}" autoplay playsinline preload="auto"${muted ? ' muted' : ''}${loop ? ' loop' : ''}></video>`;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: transparent;
    -webkit-user-select: none;
    user-select: none;
  }
  #agl-stage {
    position: fixed;
    inset: 0;
    background: ${safeBg};
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    opacity: 1;
    transition: opacity 380ms cubic-bezier(0.22, 1, 0.36, 1), transform 380ms cubic-bezier(0.22, 1, 0.36, 1);
    cursor: ${isPreview ? 'pointer' : 'default'};
  }
  #agl-stage.leaving {
    opacity: 0;
    transform: scale(1.015);
    pointer-events: none;
  }
  .agl-media {
    width: 100%;
    height: 100%;
    object-fit: ${fit};
    object-position: center center;
    display: block;
    opacity: 0;
    transition: opacity 220ms ease-out;
  }
  .agl-media.ready {
    opacity: 1;
  }
  .agl-hint {
    position: fixed;
    right: 20px;
    bottom: 20px;
    padding: 6px 13px;
    border-radius: 999px;
    background: rgba(15, 17, 23, 0.54);
    color: rgba(255, 255, 255, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.14);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    font: 500 12px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    letter-spacing: 0.01em;
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 260ms ease, transform 260ms ease, background 160ms ease;
    pointer-events: ${isPreview ? 'auto' : 'none'};
    cursor: pointer;
  }
  .agl-hint.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .agl-hint:hover {
    background: rgba(15, 17, 23, 0.78);
  }
</style>
</head>
<body>
  <div id="agl-stage">
    ${mediaTag}
    ${isPreview ? `<button id="agl-hint" class="agl-hint" type="button">${safeSkipLabel}</button>` : ''}
  </div>
  <script>
  (function () {
    const stage = document.getElementById('agl-stage');
    const media = document.getElementById('agl-media');
    const hint = document.getElementById('agl-hint');
    const canSkip = ${isPreview ? 'true' : 'false'};
    const wantMuted = ${muted ? 'true' : 'false'};
    const wantVolume = ${JSON.stringify(volume)};
    let leaving = false;
    let readySent = false;

    function emit(ev, detail) {
      try {
        console.debug('__AGL_SPLASH_EV__' + JSON.stringify({ event: ev, detail: detail || '' }));
      } catch (_) {}
    }

    function markReady() {
      if (readySent) return;
      readySent = true;
      if (media) media.classList.add('ready');
      emit('playing');
    }

    function requestSkip() {
      if (!canSkip || leaving) return;
      emit('skip');
    }

    window.__AGL_SPLASH_REPLAY__ = function () {
      if (leaving || !media || media.tagName !== 'VIDEO') return;
      try {
        media.currentTime = 0;
        const p = media.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (_) {}
    };

    window.__AGL_SPLASH_LEAVE__ = function () {
      if (leaving) return;
      leaving = true;
      if (stage) stage.classList.add('leaving');
      if (media && media.tagName === 'VIDEO' && !media.muted) {
        const startVol = media.volume;
        const t0 = performance.now();
        const stepVol = () => {
          const p = Math.min(1, (performance.now() - t0) / 340);
          try { media.volume = Math.max(0, startVol * (1 - p)); } catch (_) {}
          if (p < 1) requestAnimationFrame(stepVol);
        };
        requestAnimationFrame(stepVol);
      }
      setTimeout(() => emit('faded'), 390);
    };

    if (hint) {
      setTimeout(() => { if (!leaving) hint.classList.add('visible'); }, 120);
      hint.addEventListener('click', (e) => {
        e.stopPropagation();
        requestSkip();
      });
    }

    if (canSkip) {
      stage.addEventListener('click', requestSkip);
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          requestSkip();
        }
      });
    }

    if (media && media.tagName === 'VIDEO') {
      media.muted = wantMuted;
      try { media.volume = wantVolume; } catch (_) {}
      media.addEventListener('loadeddata', markReady, { once: true });
      media.addEventListener('playing', markReady, { once: true });
      media.addEventListener('ended', () => emit('ended'));
      media.addEventListener('error', () => {
        const code = media.error ? String(media.error.code) : 'unknown';
        emit('error', 'video_error_' + code);
      });
      const playPromise = media.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          if (!media.muted) {
            media.muted = true;
            media.play().catch((err) => emit('error', String(err && err.name || 'play_failed')));
          } else {
            emit('error', 'play_failed');
          }
        });
      }
    } else if (media && media.tagName === 'IMG') {
      if (media.complete && media.naturalWidth > 0) {
        markReady();
      } else {
        media.addEventListener('load', markReady, { once: true });
        media.addEventListener('error', () => emit('error', 'image_error'));
      }
    }
  })();
  </script>
</body>
</html>`;
  }

  function detectStaticImageMime(buf) {
    if (!buf || buf.length < 12) return null;
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
        buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A) {
      return 'image/png';
    }
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) {
      return 'image/jpeg';
    }
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
        buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) {
      return 'image/webp';
    }
    if (buf[0] === 0x42 && buf[1] === 0x4D) {
      return 'image/bmp';
    }
    if (buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) {
      const brand = buf.slice(8, 12).toString('ascii');
      if (brand === 'avif' || brand === 'avis' || brand === 'mif1') {
        return 'image/avif';
      }
    }
    return null;
  }

  // Export pure helpers for Node.js unit testing when loaded outside Electron.
  if ((!process.versions || !process.versions.electron) && typeof module !== 'undefined' && module.exports) {
    module.exports = {
      LAUNCHER_VERSION,
      DEFAULT_I18N_CONFIG,
      DEFAULT_SKIN_CONFIG,
      THEME_PRESET_IDS,
      DEFAULT_THEME_CONFIG,
      DEFAULT_SPLASH_CONFIG,
      SPLASH_MEDIA_BY_EXT,
      getThemePolarity,
      normalizeI18nConfig,
      normalizeSkinConfig,
      normalizeThemeConfig,
      normalizeSplashConfig,
      normalizeLauncherConfig,
      detectStaticImageMime,
      detectSplashMedia,
      parseByteRange,
      buildSplashPageHtml
    };
    return;
  }

  if (!process.versions || !process.versions.electron) return;
  if (process.type && process.type !== 'browser') return;
  if (global.__AGLAUNCH_MAIN_HOOKED__) return;
  global.__AGLAUNCH_MAIN_HOOKED__ = true;

  const fs = require('fs');
  const http = require('http');
  const crypto = require('crypto');
  const os = require('os');
  const path = require('path');
  const Module = require('module');
  const debug = process.env.AGLAUNCH_DEBUG === '1';

  const dictPath = process.env.AGLAUNCH_DICT || '';
  const i18nRendererPath = process.env.AGLAUNCH_I18N_RENDERER || '';
  const skinRendererPath = process.env.AGLAUNCH_SKIN_RENDERER || '';
  const themeRendererPath = process.env.AGLAUNCH_THEME_RENDERER || '';
  const settingsRendererPath = process.env.AGLAUNCH_SETTINGS_RENDERER || '';
  const userDataDir = process.env.AGLAUNCH_USER_DATA || '';

  delete process.env.AGLAUNCH_DICT;
  delete process.env.AGLAUNCH_I18N_RENDERER;
  delete process.env.AGLAUNCH_SKIN_RENDERER;
  delete process.env.AGLAUNCH_THEME_RENDERER;
  delete process.env.AGLAUNCH_SETTINGS_RENDERER;
  delete process.env.AGLAUNCH_USER_DATA;
  delete process.env.AGLAUNCH_DEBUG;

  const runtimeDir = dictPath ? path.dirname(dictPath) : '';
  const configBaseDir = userDataDir || (runtimeDir ? path.dirname(runtimeDir) : '');
  const launcherConfigPath = configBaseDir ? path.join(configBaseDir, 'launcher_config.json') : '';
  const cachePath = runtimeDir ? path.join(runtimeDir, 'plugin_cache_zh.json') : '';
  const logFile = debug && runtimeDir ? path.join(runtimeDir, 'debug.log') : '';

  function logDebug(msg) {
    if (!debug) return;
    try {
      if (logFile) fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`, 'utf8');
    } catch (_) {}
  }

  logDebug('aglaunch_hook.js loaded in Electron main process');

  // Close temporary V8 inspector port right after Debugger.resume completes.
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

  // Load core runtime scripts and dictionary once at startup.
  let dict = { menus: {}, exact: {}, attributes: {}, patterns: [], skipSelectors: [] };
  let i18nRendererCode = '';
  let skinRendererCode = '';
  let themeRendererCode = '';
  let settingsRendererCode = '';
  try {
    if (dictPath && fs.existsSync(dictPath)) {
      dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
    }
    if (i18nRendererPath && fs.existsSync(i18nRendererPath)) {
      i18nRendererCode = fs.readFileSync(i18nRendererPath, 'utf8');
    }
    if (skinRendererPath && fs.existsSync(skinRendererPath)) {
      skinRendererCode = fs.readFileSync(skinRendererPath, 'utf8');
    }
    if (themeRendererPath && fs.existsSync(themeRendererPath)) {
      themeRendererCode = fs.readFileSync(themeRendererPath, 'utf8');
    }
    if (settingsRendererPath && fs.existsSync(settingsRendererPath)) {
      settingsRendererCode = fs.readFileSync(settingsRendererPath, 'utf8');
    }
  } catch (err) {
    logDebug('Failed to load core assets: ' + String(err));
    return;
  }

  const dictVersion = (dict && typeof dict.version === 'string' && dict.version.trim()) || '2.35.2.3';
  const dictJsonStr = JSON.stringify(dict);
  const menuMap = Object.assign({}, dict.menus || {});
  dict = null; // Free parsed dict object from Electron main-process heap.

  // Load optional auto-translation cache in isolated try/catch.
  let autoCache = {};
  const MAX_CACHE_ENTRIES = 2000;
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

  // --- Unified Launcher Config Persistence (preserving antigravity_exe & unknown fields) ---
  let rawConfigExtra = {};
  let launcherConfig = normalizeLauncherConfig(null);
  let skinImageDataUrl = '';
  let skinMeta = { imageName: '', imageError: '' };
  let splashMeta = { mediaName: '', mediaKind: '', mediaSize: 0, mediaError: '', valid: false };
  let resolvedSplashMediaPath = '';
  let splashMediaMime = '';
  let configDiskDirty = false;
  let configSaving = false;
  let configSaveTimer = null;
  let skinDialogOpen = false;
  let splashDialogOpen = false;

  function resolveLocalFilePath(rawPath) {
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

  function resolveSkinImagePath(rawPath) {
    return resolveLocalFilePath(rawPath);
  }

  function inspectSplashMedia(rawPath) {
    const resolved = resolveLocalFilePath(rawPath);
    if (!resolved) {
      return {
        valid: false,
        resolvedPath: '',
        mime: '',
        meta: { mediaName: '', mediaKind: '', mediaSize: 0, mediaError: '', valid: false }
      };
    }
    const mediaName = path.basename(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const byExt = SPLASH_MEDIA_BY_EXT[ext];
    if (!byExt) {
      return {
        valid: false,
        resolvedPath: '',
        mime: '',
        meta: {
          mediaName,
          mediaKind: '',
          mediaSize: 0,
          mediaError: launcherConfig.i18n.enabled
            ? '仅支持 MP4 / WebM / MOV / M4V / OGV 视频或 GIF / WebP 动图。'
            : 'Only MP4 / WebM / MOV / M4V / OGV video or GIF / WebP image is supported.',
          valid: false
        }
      };
    }
    try {
      const stat = fs.statSync(resolved);
      if (!stat.isFile()) {
        return {
          valid: false,
          resolvedPath: '',
          mime: '',
          meta: {
            mediaName,
            mediaKind: '',
            mediaSize: 0,
            mediaError: launcherConfig.i18n.enabled ? '所选路径不是有效文件，请重新选择。' : 'Selected path is not a valid file.',
            valid: false
          }
        };
      }
      if (stat.size <= 0) {
        return {
          valid: false,
          resolvedPath: '',
          mime: '',
          meta: {
            mediaName,
            mediaKind: '',
            mediaSize: 0,
            mediaError: launcherConfig.i18n.enabled ? '媒体文件为空，请重新选择。' : 'Media file is empty.',
            valid: false
          }
        };
      }
      if (stat.size > MAX_SPLASH_MEDIA_BYTES) {
        return {
          valid: false,
          resolvedPath: '',
          mime: '',
          meta: {
            mediaName,
            mediaKind: '',
            mediaSize: stat.size,
            mediaError: launcherConfig.i18n.enabled ? '媒体文件超过 200 MB 限制，请压缩后再试。' : 'Media file exceeds 200 MB limit.',
            valid: false
          }
        };
      }
      const header = Buffer.alloc(16);
      const fd = fs.openSync(resolved, 'r');
      let bytesRead = 0;
      try {
        bytesRead = fs.readSync(fd, header, 0, header.length, 0);
      } finally {
        fs.closeSync(fd);
      }
      const detected = detectSplashMedia(header.slice(0, bytesRead), ext);
      if (!detected) {
        return {
          valid: false,
          resolvedPath: '',
          mime: '',
          meta: {
            mediaName,
            mediaKind: '',
            mediaSize: stat.size,
            mediaError: launcherConfig.i18n.enabled ? '文件内容不是有效的视频或动图格式，请重新选择。' : 'File content is not a valid video or animated image.',
            valid: false
          }
        };
      }
      return {
        valid: true,
        resolvedPath: resolved,
        mime: detected.mime,
        meta: {
          mediaName,
          mediaKind: detected.kind,
          mediaSize: stat.size,
          mediaError: '',
          valid: true
        }
      };
    } catch (e) {
      logDebug('inspectSplashMedia failed: ' + String(e));
      return {
        valid: false,
        resolvedPath: '',
        mime: '',
        meta: {
          mediaName,
          mediaKind: '',
          mediaSize: 0,
          mediaError: launcherConfig.i18n.enabled ? '媒体文件不存在或无法读取，请重新选择。' : 'Media file does not exist or cannot be read.',
          valid: false
        }
      };
    }
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
        error: launcherConfig.i18n.enabled
          ? '仅支持静态图片格式（PNG / JPG / WebP / BMP / AVIF）。'
          : 'Only static image formats are supported (PNG / JPG / WebP / BMP / AVIF).'
      };
    }
    try {
      const stat = fs.statSync(resolved);
      if (!stat.isFile()) {
        return {
          dataUrl: '',
          imageName,
          error: launcherConfig.i18n.enabled ? '所选路径不是有效文件，请重新选择。' : 'Selected path is not a valid file.'
        };
      }
      if (stat.size <= 0) {
        return {
          dataUrl: '',
          imageName,
          error: launcherConfig.i18n.enabled ? '图片文件为空，请重新选择。' : 'Image file is empty.'
        };
      }
      if (stat.size > MAX_SKIN_IMAGE_BYTES) {
        return {
          dataUrl: '',
          imageName,
          error: launcherConfig.i18n.enabled ? '图片体积超过 20 MB 限制，请压缩后再试。' : 'Image exceeds 20 MB limit.'
        };
      }
      const buf = fs.readFileSync(resolved);
      const mime = detectStaticImageMime(buf);
      if (!mime) {
        return {
          dataUrl: '',
          imageName,
          error: launcherConfig.i18n.enabled ? '文件内容不是有效的静态图片，请重新选择。' : 'File content is not a valid static image.'
        };
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
        error: launcherConfig.i18n.enabled ? '图片文件不存在或无法读取，请重新选择。' : 'Image file does not exist or cannot be read.'
      };
    }
  }

  function loadInitialLauncherConfig() {
    try {
      if (launcherConfigPath && fs.existsSync(launcherConfigPath)) {
        const parsed = JSON.parse(fs.readFileSync(launcherConfigPath, 'utf8'));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          rawConfigExtra = Object.assign({}, parsed);
          delete rawConfigExtra.version;
          delete rawConfigExtra.i18n;
          delete rawConfigExtra.skin;
          delete rawConfigExtra.theme;
          delete rawConfigExtra.splash;
          launcherConfig = normalizeLauncherConfig(parsed);
        }
      }
    } catch (err) {
      logDebug('Launcher config load failed, using defaults: ' + String(err));
      launcherConfig = normalizeLauncherConfig(null);
    }

    if (launcherConfig.skin.imagePath) {
      const loaded = loadStaticSkinImage(launcherConfig.skin.imagePath);
      skinImageDataUrl = loaded.dataUrl;
      skinMeta = { imageName: loaded.imageName, imageError: loaded.error };
    }
    if (launcherConfig.splash.mediaPath) {
      const inspected = inspectSplashMedia(launcherConfig.splash.mediaPath);
      resolvedSplashMediaPath = inspected.resolvedPath;
      splashMediaMime = inspected.mime;
      splashMeta = inspected.meta;
    }
  }

  loadInitialLauncherConfig();

  function buildSerializedConfig() {
    const merged = Object.assign({}, rawConfigExtra, {
      version: launcherConfig.version,
      i18n: launcherConfig.i18n,
      skin: launcherConfig.skin,
      theme: launcherConfig.theme,
      splash: launcherConfig.splash
    });
    return JSON.stringify(merged, null, 2);
  }

  function scheduleSaveLauncherConfig() {
    if (!launcherConfigPath) return;
    configDiskDirty = true;
    if (configSaveTimer) return;
    configSaveTimer = setTimeout(() => {
      configSaveTimer = null;
      if (configSaving) {
        scheduleSaveLauncherConfig();
        return;
      }
      configSaving = true;
      configDiskDirty = false;
      const serialized = buildSerializedConfig();
      const tmp = launcherConfigPath + '.tmp';
      fs.promises.mkdir(path.dirname(launcherConfigPath), { recursive: true })
        .then(() => fs.promises.writeFile(tmp, serialized, 'utf8'))
        .then(() => fs.promises.rename(tmp, launcherConfigPath))
        .catch((e) => {
          logDebug('Launcher config save failed: ' + String(e));
          fs.promises.unlink(tmp).catch(() => {});
        })
        .finally(() => {
          configSaving = false;
          if (configDiskDirty) scheduleSaveLauncherConfig();
        });
    }, 180);
    if (configSaveTimer && typeof configSaveTimer.unref === 'function') {
      configSaveTimer.unref();
    }
  }

  function flushLauncherConfigSync() {
    if (!launcherConfigPath || !configDiskDirty) return;
    if (configSaveTimer) {
      clearTimeout(configSaveTimer);
      configSaveTimer = null;
    }
    configDiskDirty = false;
    const tmp = launcherConfigPath + '.sync.tmp';
    try {
      fs.mkdirSync(path.dirname(launcherConfigPath), { recursive: true });
      fs.writeFileSync(tmp, buildSerializedConfig(), 'utf8');
      fs.renameSync(tmp, launcherConfigPath);
    } catch (e) {
      logDebug('Sync launcher config flush failed: ' + String(e));
      try { fs.unlinkSync(tmp); } catch (_) {}
    }
  }

  // --- On-Demand Lightweight Translation via Electron net.fetch ---
  let electronNet = null;
  let electronShell = null;
  let electronDialog = null;
  let electronBrowserWindow = null;
  let electronBaseWindow = null;
  let electronWebContentsView = null;
  let electronMenu = null;
  let electronNativeTheme = null;
  let antigravityGetHubWebContents = null;
  let antigravityGetHubWindows = null;
  const splashWebContentsSet = new WeakSet();
  let nativeThemeOverridden = false;
  let originalNativeThemeSource = 'system';
  let origBuildFromTemplate = null;
  let origSetApplicationMenu = null;
  let lastRawAppMenuTemplate = null;

  const hubWebContents = new Set();
  const childFrameRegistry = new Map(); // wc -> Set<WebFrameMain>
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

  // --- Renderer Broadcast Helpers ---
  function getLauncherMeta() {
    return {
      launcherVersion: LAUNCHER_VERSION,
      dictVersion,
      cacheCount: autoCacheSize,
      configPath: launcherConfigPath,
      configBaseDir,
      homepageUrl: HOMEPAGE_URL,
      skinMeta: Object.assign({}, skinMeta),
      splashMeta: Object.assign({}, splashMeta)
    };
  }

  function broadcastToHubs(jsCode, excludeWc) {
    for (const target of hubWebContents) {
      if (!target || target.isDestroyed()) {
        hubWebContents.delete(target);
        continue;
      }
      if (excludeWc && target === excludeWc) continue;
      target.executeJavaScript(jsCode, true).catch(() => {});
    }
  }

  function broadcastI18nConfig(excludeWc) {
    const payload = JSON.stringify({
      config: launcherConfig.i18n,
      meta: getLauncherMeta()
    });
    const js = `window.__AGL_I18N__ && window.__AGL_I18N__.applyConfig(${JSON.stringify(launcherConfig.i18n)}); window.__AGL_SETTINGS__ && window.__AGL_SETTINGS__.applyState(${payload});`;
    broadcastToHubs(js, excludeWc);

    // Also update live child frames (e.g. Swarm UI panels).
    const childJs = `window.__AGL_I18N__ && window.__AGL_I18N__.applyConfig(${JSON.stringify(launcherConfig.i18n)});`;
    for (const [wc, frames] of childFrameRegistry.entries()) {
      if (!wc || wc.isDestroyed()) {
        childFrameRegistry.delete(wc);
        continue;
      }
      for (const frame of frames) {
        if (!frame || (typeof frame.isDestroyed === 'function' && frame.isDestroyed())) {
          frames.delete(frame);
          continue;
        }
        frame.executeJavaScript(childJs, true).catch(() => {});
      }
    }
  }

  function broadcastSkinUpdate(payload, excludeWc) {
    const js = `window.__AGL_SKIN__ && window.__AGL_SKIN__.applyFromMain(${JSON.stringify(payload)}); window.__AGL_SETTINGS__ && window.__AGL_SETTINGS__.applyState(${JSON.stringify({
      skinConfig: launcherConfig.skin,
      skinImageDataUrl: typeof payload.imageDataUrl === 'string' ? payload.imageDataUrl : undefined,
      meta: getLauncherMeta()
    })});`;
    broadcastToHubs(js, excludeWc);
  }

  function syncNativeThemeForPreset(preset) {
    if (!electronNativeTheme) return;
    const polarity = getThemePolarity(preset);
    try {
      if (polarity === 'dark' || polarity === 'light') {
        if (!nativeThemeOverridden) {
          originalNativeThemeSource = electronNativeTheme.themeSource || 'system';
          nativeThemeOverridden = true;
        }
        if (electronNativeTheme.themeSource !== polarity) {
          electronNativeTheme.themeSource = polarity;
          logDebug('Synced electron.nativeTheme.themeSource -> ' + polarity);
        }
      } else if (nativeThemeOverridden) {
        const restoreTo = originalNativeThemeSource || 'system';
        nativeThemeOverridden = false;
        if (electronNativeTheme.themeSource !== restoreTo) {
          electronNativeTheme.themeSource = restoreTo;
          logDebug('Restored electron.nativeTheme.themeSource -> ' + restoreTo);
        }
      }
    } catch (e) {
      logDebug('syncNativeThemeForPreset failed: ' + String(e));
    }
  }

  function broadcastThemeUpdate(payload, excludeWc) {
    const js = `window.__AGL_THEME__ && window.__AGL_THEME__.applyFromMain(${JSON.stringify(payload)}); window.__AGL_SETTINGS__ && window.__AGL_SETTINGS__.applyState(${JSON.stringify({
      themeConfig: launcherConfig.theme
    })});`;
    broadcastToHubs(js, excludeWc);
  }

  function broadcastSplashUpdate(excludeWc) {
    const js = `window.__AGL_SETTINGS__ && window.__AGL_SETTINGS__.applyState(${JSON.stringify({
      splashConfig: launcherConfig.splash,
      meta: getLauncherMeta()
    })});`;
    broadcastToHubs(js, excludeWc);
  }

  // --- Loopback Streaming Server & Custom Video Splash Overlay (Plan A) ---
  let splashServer = null;
  let splashServerPort = 0;
  let splashServerPromise = null;
  let splashServerIdleTimer = null;
  const splashServerToken = crypto.randomBytes(16).toString('hex');
  const activeSplashSessions = new Map(); // sessionId -> { html, mediaPath, mime }
  const activeSplashByWindow = new WeakMap(); // BrowserWindow -> disposeFn

  function closeSplashServerNow() {
    if (splashServerIdleTimer) {
      clearTimeout(splashServerIdleTimer);
      splashServerIdleTimer = null;
    }
    const srv = splashServer;
    splashServer = null;
    splashServerPort = 0;
    splashServerPromise = null;
    if (srv) {
      try { srv.close(); } catch (_) {}
    }
  }

  function scheduleCloseSplashServerIfIdle() {
    if (activeSplashSessions.size > 0 || !splashServer) return;
    if (splashServerIdleTimer) clearTimeout(splashServerIdleTimer);
    splashServerIdleTimer = setTimeout(() => {
      splashServerIdleTimer = null;
      if (activeSplashSessions.size === 0) {
        closeSplashServerNow();
      }
    }, 5000);
    if (splashServerIdleTimer && typeof splashServerIdleTimer.unref === 'function') {
      splashServerIdleTimer.unref();
    }
  }

  function ensureSplashServer() {
    if (splashServer && splashServerPort > 0) {
      if (splashServerIdleTimer) {
        clearTimeout(splashServerIdleTimer);
        splashServerIdleTimer = null;
      }
      return Promise.resolve(splashServerPort);
    }
    if (splashServerPromise) return splashServerPromise;

    splashServerPromise = new Promise((resolve, reject) => {
      const srv = http.createServer((req, res) => {
        try {
          if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.writeHead(405);
            res.end();
            return;
          }
          const reqUrl = new URL(req.url || '/', 'http://127.0.0.1');
          const parts = reqUrl.pathname.split('/').filter(Boolean);
          if (parts.length !== 3 || parts[0] !== splashServerToken) {
            res.writeHead(403);
            res.end();
            return;
          }
          const kind = parts[1];
          const sessionId = parts[2];
          const sess = activeSplashSessions.get(sessionId);
          if (!sess) {
            res.writeHead(404);
            res.end();
            return;
          }

          if (kind === 'splash') {
            const body = Buffer.from(sess.html, 'utf8');
            res.writeHead(200, {
              'Content-Type': 'text/html; charset=utf-8',
              'Content-Length': body.length,
              'Cache-Control': 'no-store'
            });
            if (req.method === 'HEAD') res.end();
            else res.end(body);
            return;
          }

          if (kind === 'media') {
            fs.stat(sess.mediaPath, (err, stat) => {
              if (err || !stat || !stat.isFile()) {
                if (!res.headersSent) res.writeHead(404);
                res.end();
                return;
              }
              const totalSize = stat.size;
              const rangeHeader = req.headers && req.headers.range;
              if (rangeHeader) {
                const parsedRange = parseByteRange(rangeHeader, totalSize);
                if (parsedRange && parsedRange.unsatisfiable) {
                  res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
                  res.end();
                  return;
                }
                if (parsedRange) {
                  const { start, end } = parsedRange;
                  const chunkSize = end - start + 1;
                  res.writeHead(206, {
                    'Content-Range': `bytes ${start}-${end}/${totalSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize,
                    'Content-Type': sess.mime,
                    'Cache-Control': 'no-store'
                  });
                  if (req.method === 'HEAD') {
                    res.end();
                    return;
                  }
                  const stream = fs.createReadStream(sess.mediaPath, { start, end });
                  stream.on('error', () => { try { res.end(); } catch (_) {} });
                  res.on('close', () => { try { stream.destroy(); } catch (_) {} });
                  stream.pipe(res);
                  return;
                }
              }

              res.writeHead(200, {
                'Content-Type': sess.mime,
                'Content-Length': totalSize,
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'no-store'
              });
              if (req.method === 'HEAD') {
                res.end();
                return;
              }
              const stream = fs.createReadStream(sess.mediaPath);
              stream.on('error', () => { try { res.end(); } catch (_) {} });
              res.on('close', () => { try { stream.destroy(); } catch (_) {} });
              stream.pipe(res);
            });
            return;
          }

          res.writeHead(404);
          res.end();
        } catch (e) {
          logDebug('Splash server request error: ' + String(e));
          try {
            if (!res.headersSent) res.writeHead(500);
            res.end();
          } catch (_) {}
        }
      });

      srv.on('error', (err) => {
        splashServerPromise = null;
        if (splashServer === srv) {
          splashServer = null;
          splashServerPort = 0;
        }
        reject(err);
      });

      srv.listen(0, '127.0.0.1', () => {
        const addr = srv.address();
        splashServer = srv;
        splashServerPort = addr && typeof addr === 'object' ? addr.port : 0;
        splashServerPromise = null;
        if (typeof srv.unref === 'function') srv.unref();
        logDebug('Splash loopback server listening on 127.0.0.1:' + splashServerPort);
        resolve(splashServerPort);
      });
    });

    return splashServerPromise;
  }

  function resolveHubWebContentsForWindow(win) {
    if (!win) return null;
    try {
      if (typeof antigravityGetHubWebContents === 'function') {
        const wc = antigravityGetHubWebContents(win);
        if (wc) return wc;
      }
    } catch (_) {}
    try {
      if (win.webContents && !win.webContents.isDestroyed()) {
        return win.webContents;
      }
    } catch (_) {}
    return null;
  }

  function attachCustomSplashOverlay(win, opts) {
    const o = opts && typeof opts === 'object' ? opts : {};
    const isPreview = o.mode === 'preview';
    const fallbackFn = typeof o.fallbackFn === 'function' ? o.fallbackFn : null;
    const senderWc = o.senderWc || null;

    if (!win || (typeof win.isDestroyed === 'function' && win.isDestroyed()) || !win.contentView || !electronWebContentsView) {
      if (fallbackFn) fallbackFn();
      return false;
    }

    // Re-validate media file right before playback so moved/deleted files degrade cleanly.
    const inspected = inspectSplashMedia(launcherConfig.splash.mediaPath);
    resolvedSplashMediaPath = inspected.resolvedPath;
    splashMediaMime = inspected.mime;
    splashMeta = inspected.meta;
    if (!inspected.valid || !resolvedSplashMediaPath || !splashMediaMime) {
      broadcastSplashUpdate(null);
      if (isPreview && senderWc) {
        sendToast(
          senderWc,
          inspected.meta.mediaError || (launcherConfig.i18n.enabled ? '请先选择有效的启动视频或动图' : 'Please choose a valid video or animated image first'),
          'error'
        );
      }
      if (fallbackFn) fallbackFn();
      return false;
    }

    // Dispose any existing splash overlay on the same window (e.g. re-clicking Preview).
    const prevDispose = activeSplashByWindow.get(win);
    if (typeof prevDispose === 'function') {
      try { prevDispose(); } catch (_) {}
    }

    const cfg = normalizeSplashConfig(launcherConfig.splash);
    const isDark = electronNativeTheme ? Boolean(electronNativeTheme.shouldUseDarkColors) : true;
    const bgColor = (typeof o.backgroundColor === 'string' && o.backgroundColor.trim())
      ? o.backgroundColor.trim()
      : (isDark ? '#131313' : '#FAFAFA');

    const hubContents = isPreview ? null : resolveHubWebContentsForWindow(win);

    let view;
    try {
      view = new electronWebContentsView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          transparent: true,
          autoplayPolicy: 'no-user-gesture-required'
        }
      });
    } catch (e) {
      logDebug('Failed to construct WebContentsView for splash: ' + String(e));
      if (fallbackFn) fallbackFn();
      return false;
    }

    if (view.webContents) {
      splashWebContentsSet.add(view.webContents);
    }

    try {
      if (typeof view.setBackgroundColor === 'function') {
        view.setBackgroundColor(bgColor);
      }
    } catch (_) {}

    const updateBounds = () => {
      try {
        if (!win || win.isDestroyed() || !view.webContents || view.webContents.isDestroyed()) return;
        const [width, height] = win.getContentSize();
        view.setBounds({ x: 0, y: 0, width, height });
      } catch (_) {}
    };

    try {
      win.contentView.addChildView(view);
      updateBounds();
      win.on('resize', updateBounds);
    } catch (e) {
      logDebug('Failed to attach splash WebContentsView: ' + String(e));
      try { if (view.webContents && !view.webContents.isDestroyed()) view.webContents.close(); } catch (_) {}
      if (fallbackFn) fallbackFn();
      return false;
    }

    const sessionId = crypto.randomBytes(8).toString('hex');
    const startedAt = Date.now();
    const minDurationMs = isPreview
      ? Math.max(Math.round(cfg.minDuration * 1000), 2000)
      : Math.round(cfg.minDuration * 1000);
    const maxSafetyMs = cfg.endMode === 'complete'
      ? 35000
      : Math.max(20000, minDurationMs + 15000);

    let disposed = false;
    let leaving = false;
    let appReady = isPreview;
    let videoEnded = false;
    let mediaStarted = false;
    let hubLoaded = isPreview;
    let readyConsecutiveHits = 0;
    let readinessProbeInFlight = false;
    let minTimer = null;
    let safetyTimer = null;
    let loadWatchdogTimer = null;
    let fadeCleanupTimer = null;
    let readinessPollTimer = null;

    const clearAllTimers = () => {
      if (minTimer) { clearTimeout(minTimer); minTimer = null; }
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
      if (loadWatchdogTimer) { clearTimeout(loadWatchdogTimer); loadWatchdogTimer = null; }
      if (fadeCleanupTimer) { clearTimeout(fadeCleanupTimer); fadeCleanupTimer = null; }
      if (readinessPollTimer) { clearInterval(readinessPollTimer); readinessPollTimer = null; }
    };

    const cleanupImmediate = () => {
      if (disposed) return;
      disposed = true;
      clearAllTimers();
      if (activeSplashByWindow.get(win) === cleanupImmediate) {
        activeSplashByWindow.delete(win);
      }
      activeSplashSessions.delete(sessionId);
      scheduleCloseSplashServerIfIdle();
      try {
        if (hubContents && !hubContents.isDestroyed()) {
          hubContents.off('did-finish-load', onHubDidFinishLoad);
          hubContents.off('did-fail-load', onHubDidFailLoad);
        }
      } catch (_) {}
      try {
        if (win && !win.isDestroyed()) {
          win.off('resize', updateBounds);
          win.off('closed', onWindowClosed);
          win.contentView.removeChildView(view);
        }
      } catch (_) {}
      try {
        if (view.webContents && !view.webContents.isDestroyed()) {
          view.webContents.close();
        }
      } catch (_) {}
    };

    activeSplashByWindow.set(win, cleanupImmediate);

    const triggerFadeOut = () => {
      if (disposed || leaving) return;
      leaving = true;
      clearAllTimers();
      try {
        if (typeof view.setBackgroundColor === 'function') {
          view.setBackgroundColor('#00000000');
        }
      } catch (_) {}
      try {
        if (view.webContents && !view.webContents.isDestroyed()) {
          view.webContents.executeJavaScript('window.__AGL_SPLASH_LEAVE__ && window.__AGL_SPLASH_LEAVE__();', true).catch(() => {});
        }
      } catch (_) {}
      fadeCleanupTimer = setTimeout(cleanupImmediate, 460);
    };

    const evaluateDismiss = () => {
      if (disposed || leaving) return;
      if (!appReady) return;
      if (inspected.meta.mediaKind === 'video' && cfg.endMode === 'complete') {
        if (videoEnded) {
          triggerFadeOut();
        }
        return;
      }
      const remaining = minDurationMs - (Date.now() - startedAt);
      if (remaining <= 0) {
        triggerFadeOut();
      } else if (!minTimer) {
        minTimer = setTimeout(() => {
          minTimer = null;
          evaluateDismiss();
        }, remaining);
      }
    };

    const handleMediaError = (reason) => {
      logDebug('Splash playback error: ' + String(reason));
      const errText = launcherConfig.i18n.enabled
        ? '视频解码或播放失败，请尝试转换为 H.264 MP4 或 WebM 格式。'
        : 'Failed to decode or play video. Please convert to H.264 MP4 or WebM.';
      splashMeta = Object.assign({}, splashMeta, { mediaError: errText });
      broadcastSplashUpdate(null);
      if (isPreview && senderWc) {
        sendToast(senderWc, errText, 'error');
      }
      cleanupImmediate();
      if (!isPreview && !hubLoaded && fallbackFn) {
        try { fallbackFn(); } catch (_) {}
      }
    };

    // Synchronous Hub UI readiness probe (immune to auth-bootstrap redirects and SPA loading spinners).
    const hubReadinessProbeScript = `(function(){
      try {
        if (document.readyState === 'loading' || !document.body) return false;
        var vw = window.innerWidth || 1280;
        var vh = window.innerHeight || 720;
        var isVisible = function(el) {
          if (!el || (el.closest && el.closest('[data-aglaunch-ui]'))) return false;
          var r = el.getBoundingClientRect();
          if (r.width < 18 || r.height < 14) return false;
          var cs = getComputedStyle(el);
          return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0.05;
        };
        var inputs = document.querySelectorAll('textarea, [contenteditable="true"], input:not([type="hidden"])');
        for (var i = 0; i < inputs.length; i++) {
          if (isVisible(inputs[i])) return true;
        }
        var landmarks = document.querySelectorAll('aside, nav, [role="navigation"]');
        for (var k = 0; k < landmarks.length; k++) {
          var lr = landmarks[k].getBoundingClientRect();
          if (lr.width >= 120 && lr.height >= 160 && isVisible(landmarks[k])) return true;
        }
        // Detect centered full-screen loading spinner still active before workspace mounts.
        var spinners = document.querySelectorAll('[class*="spin" i], [class*="loader" i], [role="progressbar"], [aria-busy="true"]');
        for (var s = 0; s < spinners.length; s++) {
          var sp = spinners[s];
          if (sp.closest && sp.closest('[data-aglaunch-ui]')) continue;
          var sr = sp.getBoundingClientRect();
          if (sr.width >= 10 && sr.width <= 96 && sr.height >= 10 && sr.height <= 96) {
            var cx = sr.left + sr.width / 2;
            var cy = sr.top + sr.height / 2;
            if (Math.abs(cx - vw / 2) < vw * 0.15 && Math.abs(cy - vh / 2) < vh * 0.15) {
              var spCs = getComputedStyle(sp);
              if (spCs.display !== 'none' && spCs.visibility !== 'hidden' && parseFloat(spCs.opacity || '1') > 0.05) {
                return false;
              }
            }
          }
        }
        var actions = document.querySelectorAll('button, [role="button"], [role="tab"], a[href]');
        var visibleActions = 0;
        for (var j = 0; j < actions.length; j++) {
          var act = actions[j];
          if (!isVisible(act)) continue;
          var ar = act.getBoundingClientRect();
          if (ar.top < 40 && ar.height <= 36) continue; // skip window titlebar buttons
          visibleActions++;
          if (visibleActions >= 3) return true;
        }
        var rawText = (document.body.innerText || '').replace(/\\s+/g, ' ').trim();
        if (rawText.length >= 32 && !/^(loading|initializing|connecting|starting|加载中|正在加载|正在启动|请稍候)[.。…!！\\s]*$/i.test(rawText)) {
          return true;
        }
        return false;
      } catch (_) {
        return false;
      }
    })();`;

    const pollHubReadinessOnce = () => {
      if (disposed || leaving || appReady || readinessProbeInFlight) return;
      if (!hubContents || hubContents.isDestroyed()) {
        appReady = true;
        evaluateDismiss();
        return;
      }
      if (typeof hubContents.isLoadingMainFrame === 'function' && hubContents.isLoadingMainFrame()) {
        readyConsecutiveHits = 0;
        return;
      }
      readinessProbeInFlight = true;
      hubContents.executeJavaScript(hubReadinessProbeScript, true)
        .then((ready) => {
          if (disposed || leaving || appReady) return;
          if (ready) {
            readyConsecutiveHits++;
            if (readyConsecutiveHits >= 2) {
              if (readinessPollTimer) {
                clearInterval(readinessPollTimer);
                readinessPollTimer = null;
              }
              appReady = true;
              logDebug('Hub UI ready after ' + (Date.now() - startedAt) + 'ms');
              evaluateDismiss();
            }
          } else {
            readyConsecutiveHits = 0;
          }
        })
        .catch(() => {
          // Transient rejection during auth-bootstrap redirect; keep polling until main UI mounts.
          readyConsecutiveHits = 0;
        })
        .finally(() => {
          readinessProbeInFlight = false;
        });
    };

    const startHubReadinessPolling = () => {
      if (disposed || leaving || appReady || readinessPollTimer) return;
      readinessPollTimer = setInterval(pollHubReadinessOnce, 180);
      pollHubReadinessOnce();
    };

    const onHubDidFinishLoad = () => {
      hubLoaded = true;
      if (disposed) return;
      readyConsecutiveHits = 0;
      startHubReadinessPolling();
    };

    const onHubDidFailLoad = (_ev, code, _desc, _url, isMainFrame) => {
      if (code === -3 || isMainFrame === false) return;
      hubLoaded = true;
      appReady = true;
      evaluateDismiss();
    };

    const onWindowClosed = () => {
      cleanupImmediate();
    };

    win.once('closed', onWindowClosed);
    if (hubContents && !hubContents.isDestroyed()) {
      hubContents.on('did-finish-load', onHubDidFinishLoad);
      hubContents.on('did-fail-load', onHubDidFailLoad);
    }

    if (view.webContents && !view.webContents.isDestroyed()) {
      if (isPreview) {
        view.webContents.once('dom-ready', () => {
          try {
            if (!disposed && view.webContents && !view.webContents.isDestroyed()) {
              view.webContents.focus();
            }
          } catch (_) {}
        });
      }

      view.webContents.on('before-input-event', (ev, input) => {
        if (!input || input.type !== 'keyDown') return;
        if (isPreview && (input.key === 'Escape' || input.key === ' ')) {
          try { if (ev && typeof ev.preventDefault === 'function') ev.preventDefault(); } catch (_) {}
          triggerFadeOut();
        }
      });

      view.webContents.on('console-message', (ev, _level, message) => {
        const msg = typeof message === 'string'
          ? message
          : (ev && typeof ev.message === 'string' ? ev.message : '');
        if (!msg || !msg.startsWith('__AGL_SPLASH_EV__')) return;
        let data;
        try {
          data = JSON.parse(msg.slice('__AGL_SPLASH_EV__'.length));
        } catch (_) {
          return;
        }
        if (!data || typeof data !== 'object') return;
        switch (data.event) {
          case 'playing':
            mediaStarted = true;
            if (loadWatchdogTimer) {
              clearTimeout(loadWatchdogTimer);
              loadWatchdogTimer = null;
            }
            if (splashMeta.mediaError) {
              splashMeta = Object.assign({}, splashMeta, { mediaError: '' });
              broadcastSplashUpdate(null);
            }
            if (isPreview) evaluateDismiss();
            break;
          case 'ended':
            videoEnded = true;
            if (!appReady && !isPreview && !disposed && !leaving && view.webContents && !view.webContents.isDestroyed()) {
              view.webContents.executeJavaScript('window.__AGL_SPLASH_REPLAY__ && window.__AGL_SPLASH_REPLAY__();', true).catch(() => {});
            } else {
              evaluateDismiss();
            }
            break;
          case 'skip':
            if (isPreview) triggerFadeOut();
            break;
          case 'faded':
            cleanupImmediate();
            break;
          case 'error':
            handleMediaError(data.detail || 'media_error');
            break;
          default:
            break;
        }
      });

      view.webContents.on('did-fail-load', (_ev, code, desc) => {
        if (code === -3) return; // ERR_ABORTED on fast cleanup
        handleMediaError(`load_failed_${code}_${desc}`);
      });
    }

    // Watchdog: if media fails to start within 3.5s, fall back gracefully so startup never stalls.
    loadWatchdogTimer = setTimeout(() => {
      loadWatchdogTimer = null;
      if (!disposed && !mediaStarted) {
        handleMediaError('media_timeout');
      }
    }, 3500);

    safetyTimer = setTimeout(() => {
      safetyTimer = null;
      appReady = true;
      videoEnded = true;
      triggerFadeOut();
    }, maxSafetyMs);

    ensureSplashServer()
      .then((port) => {
        if (disposed || !view.webContents || view.webContents.isDestroyed()) return;
        const baseUrl = `http://127.0.0.1:${port}/${splashServerToken}`;
        const mediaUrl = `${baseUrl}/media/${sessionId}`;
        const splashUrl = `${baseUrl}/splash/${sessionId}`;
        const html = buildSplashPageHtml({
          backgroundColor: bgColor,
          mediaUrl,
          mediaKind: inspected.meta.mediaKind,
          fit: cfg.fit,
          muted: cfg.muted,
          volume: cfg.volume,
          loop: cfg.endMode !== 'complete',
          isPreview,
          isZh: launcherConfig.i18n.enabled
        });
        activeSplashSessions.set(sessionId, {
          html,
          mediaPath: resolvedSplashMediaPath,
          mime: splashMediaMime
        });
        view.webContents.loadURL(splashUrl).catch((err) => {
          handleMediaError('loadURL_' + String(err));
        });
      })
      .catch((err) => {
        handleMediaError('server_' + String(err));
      });

    return true;
  }

  function sendToast(wc, text, kind) {
    if (!wc || wc.isDestroyed()) return;
    wc.executeJavaScript(
      `window.__AGL_SETTINGS__ && window.__AGL_SETTINGS__.showNotice(${JSON.stringify(text)}, ${JSON.stringify(kind || 'info')});`,
      true
    ).catch(() => {});
  }

  function openLauncherSettingsInFocusedWindow() {
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
    targetWc.executeJavaScript('window.__AGL_OPEN_LAUNCHER_SETTINGS__ && window.__AGL_OPEN_LAUNCHER_SETTINGS__();', true).catch(() => {});
  }

  // --- Native Electron Menu Integration (Live EN <-> ZH Switching) ---
  function cloneMenuTemplate(items) {
    if (!Array.isArray(items)) return items;
    return items.map((item) => {
      if (!item || typeof item !== 'object') return item;
      const copy = Object.assign({}, item);
      if (Array.isArray(copy.submenu)) {
        copy.submenu = cloneMenuTemplate(copy.submenu);
      }
      return copy;
    });
  }

  function looksLikeMainAppMenu(items) {
    if (!Array.isArray(items) || items.length < 2) return false;
    let foundTop = false;
    let foundVersion = false;
    const scan = (list, topLevel) => {
      for (let i = 0; i < list.length; i++) {
        const it = list[i];
        if (!it || typeof it !== 'object') continue;
        const clean = typeof it.label === 'string' ? it.label.replace(/&/g, '').trim() : '';
        if (topLevel && (clean === 'File' || clean === 'Edit' || clean === 'Window' || clean === 'Antigravity')) {
          foundTop = true;
        }
        if (/^(Version|版本)\s+[\d.]+$/i.test(clean)) {
          foundVersion = true;
        }
        if (Array.isArray(it.submenu)) {
          scan(it.submenu, false);
        }
      }
    };
    scan(items, true);
    return foundTop || foundVersion;
  }

  function transformMenuTemplate(items, isTopLevel, i18nEnabled) {
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
        if (i18nEnabled) {
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
      }
      if (i18nEnabled && typeof cloned.toolTip === 'string' && menuMap[cloned.toolTip]) {
        cloned.toolTip = menuMap[cloned.toolTip];
      }
      if (Array.isArray(cloned.submenu)) {
        cloned.submenu = transformMenuTemplate(cloned.submenu, false, i18nEnabled);
      }
      out.push(cloned);

      if (versionMatch) {
        const nextItem = items[i + 1];
        const nextLabel = nextItem && typeof nextItem.label === 'string'
          ? nextItem.label.replace(/&/g, '').trim()
          : '';
        if (/^(Check for Updates|检查更新)/i.test(nextLabel)) {
          out.push({
            label: i18nEnabled ? '启动器设置...' : 'Launcher Settings...',
            click: openLauncherSettingsInFocusedWindow
          });
        }
      }
    }
    return out;
  }

  function translateLiveMenu(menu, isTopLevel) {
    if (!launcherConfig.i18n.enabled) return;
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

  function rebuildApplicationMenu() {
    if (!lastRawAppMenuTemplate || !origBuildFromTemplate || !origSetApplicationMenu) return;
    try {
      const rebuilt = origBuildFromTemplate(
        transformMenuTemplate(lastRawAppMenuTemplate, true, launcherConfig.i18n.enabled)
      );
      origSetApplicationMenu(rebuilt);
    } catch (e) {
      logDebug('rebuildApplicationMenu failed: ' + String(e));
    }
  }

  // --- Action Handlers for Renderer Messages ---
  async function handlePickSkinImage(senderWc) {
    if (skinDialogOpen || !electronDialog || typeof electronDialog.showOpenDialog !== 'function') return;
    skinDialogOpen = true;
    try {
      let parentWin = undefined;
      if (electronBrowserWindow && typeof electronBrowserWindow.fromWebContents === 'function' && senderWc && !senderWc.isDestroyed()) {
        parentWin = electronBrowserWindow.fromWebContents(senderWc) || undefined;
      }
      const opts = {
        title: launcherConfig.i18n.enabled ? '选择自定义皮肤图片（静态图片）' : 'Choose Custom Skin Image (Static Image)',
        properties: ['openFile'],
        filters: [
          {
            name: launcherConfig.i18n.enabled ? '静态图片' : 'Static Images',
            extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'avif']
          }
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
        skinMeta = Object.assign({}, skinMeta, { imageError: loaded.error });
        broadcastSkinUpdate({ meta: { imageError: loaded.error } });
        return;
      }
      launcherConfig.skin = normalizeSkinConfig(Object.assign({}, launcherConfig.skin, {
        imagePath: picked,
        enabled: true
      }));
      skinImageDataUrl = loaded.dataUrl;
      skinMeta = { imageName: loaded.imageName, imageError: '' };
      scheduleSaveLauncherConfig();
      broadcastSkinUpdate({
        config: launcherConfig.skin,
        imageDataUrl: skinImageDataUrl,
        meta: skinMeta
      });
    } catch (e) {
      logDebug('handlePickSkinImage error: ' + String(e));
    } finally {
      skinDialogOpen = false;
    }
  }

  async function handlePickSplashMedia(senderWc) {
    if (splashDialogOpen || !electronDialog || typeof electronDialog.showOpenDialog !== 'function') return;
    splashDialogOpen = true;
    try {
      let parentWin = undefined;
      if (electronBrowserWindow && typeof electronBrowserWindow.fromWebContents === 'function' && senderWc && !senderWc.isDestroyed()) {
        parentWin = electronBrowserWindow.fromWebContents(senderWc) || undefined;
      }
      const opts = {
        title: launcherConfig.i18n.enabled ? '选择自定义启动动画（视频 / 动图）' : 'Choose Custom Startup Animation (Video / Animated Image)',
        properties: ['openFile'],
        filters: [
          {
            name: launcherConfig.i18n.enabled ? '视频与动图' : 'Videos & Animated Images',
            extensions: ['mp4', 'webm', 'mov', 'm4v', 'ogv', 'gif', 'webp']
          }
        ]
      };
      const res = parentWin
        ? await electronDialog.showOpenDialog(parentWin, opts)
        : await electronDialog.showOpenDialog(opts);
      if (!res || res.canceled || !Array.isArray(res.filePaths) || res.filePaths.length === 0) {
        return;
      }
      const picked = res.filePaths[0];
      const inspected = inspectSplashMedia(picked);
      if (!inspected.valid) {
        splashMeta = Object.assign({}, splashMeta, { mediaError: inspected.meta.mediaError });
        broadcastSplashUpdate(null);
        return;
      }
      launcherConfig.splash = normalizeSplashConfig(Object.assign({}, launcherConfig.splash, {
        mediaPath: picked,
        enabled: true
      }));
      resolvedSplashMediaPath = inspected.resolvedPath;
      splashMediaMime = inspected.mime;
      splashMeta = inspected.meta;
      scheduleSaveLauncherConfig();
      broadcastSplashUpdate(null);
    } catch (e) {
      logDebug('handlePickSplashMedia error: ' + String(e));
    } finally {
      splashDialogOpen = false;
    }
  }

  function collectAllCandidateWindows() {
    const out = [];
    const seen = new Set();
    const addList = (list) => {
      if (!Array.isArray(list)) return;
      for (let i = 0; i < list.length; i++) {
        const w = list[i];
        if (!w || seen.has(w)) continue;
        if (typeof w.isDestroyed === 'function' && w.isDestroyed()) continue;
        seen.add(w);
        out.push(w);
      }
    };
    try { if (typeof antigravityGetHubWindows === 'function') addList(antigravityGetHubWindows()); } catch (_) {}
    try { if (electronBaseWindow && typeof electronBaseWindow.getAllWindows === 'function') addList(electronBaseWindow.getAllWindows()); } catch (_) {}
    try { if (electronBrowserWindow && typeof electronBrowserWindow.getAllWindows === 'function') addList(electronBrowserWindow.getAllWindows()); } catch (_) {}
    return out;
  }

  function resolveBrowserWindowForWebContents(wc) {
    try {
      if (wc && !wc.isDestroyed()) {
        if (electronBaseWindow && typeof electronBaseWindow.fromWebContents === 'function') {
          const directBase = electronBaseWindow.fromWebContents(wc);
          if (directBase && !directBase.isDestroyed()) return directBase;
        }
        if (electronBrowserWindow && typeof electronBrowserWindow.fromWebContents === 'function') {
          const direct = electronBrowserWindow.fromWebContents(wc);
          if (direct && !direct.isDestroyed()) return direct;
        }
        const wins = collectAllCandidateWindows();
        for (let i = 0; i < wins.length; i++) {
          const w = wins[i];
          if (w.webContents === wc) return w;
          if (typeof antigravityGetHubWebContents === 'function' && antigravityGetHubWebContents(w) === wc) {
            return w;
          }
          if (w.contentView && Array.isArray(w.contentView.children)) {
            for (let j = 0; j < w.contentView.children.length; j++) {
              const ch = w.contentView.children[j];
              if (ch && ch.webContents === wc) return w;
            }
          }
        }
      }
      if (electronBaseWindow && typeof electronBaseWindow.getFocusedWindow === 'function') {
        const focusedBase = electronBaseWindow.getFocusedWindow();
        if (focusedBase && !focusedBase.isDestroyed()) return focusedBase;
      }
      if (electronBrowserWindow && typeof electronBrowserWindow.getFocusedWindow === 'function') {
        const focused = electronBrowserWindow.getFocusedWindow();
        if (focused && !focused.isDestroyed()) return focused;
      }
      const wins = collectAllCandidateWindows();
      if (wins.length > 0) return wins[0];
    } catch (_) {}
    return null;
  }

  function handlePreviewSplash(senderWc) {
    const targetWin = resolveBrowserWindowForWebContents(senderWc);
    if (!targetWin || (typeof targetWin.isDestroyed === 'function' && targetWin.isDestroyed())) return;
    attachCustomSplashOverlay(targetWin, {
      mode: 'preview',
      senderWc
    });
  }

  function handleExportDict(senderWc) {
    if (!configBaseDir || !dictPath) return;
    try {
      fs.mkdirSync(configBaseDir, { recursive: true });
      const outPath = path.join(configBaseDir, 'dict_zh_cn.json');
      fs.copyFileSync(dictPath, outPath);
      if (electronShell && typeof electronShell.showItemInFolder === 'function') {
        electronShell.showItemInFolder(outPath);
      }
      sendToast(
        senderWc,
        launcherConfig.i18n.enabled
          ? '已导出词典至配置目录（修改后下次启动自动生效）'
          : 'Dictionary exported to config folder (takes effect on next launch)',
        'success'
      );
    } catch (e) {
      logDebug('handleExportDict error: ' + String(e));
      sendToast(
        senderWc,
        launcherConfig.i18n.enabled ? '导出词典失败：' + String(e.message || e) : 'Failed to export dictionary',
        'error'
      );
    }
  }

  function handleClearAutoCache(senderWc) {
    autoCache = {};
    autoCacheSize = 0;
    cacheJsonStr = '{}';
    cacheJsonDirty = false;
    cacheDiskDirty = false;
    if (cacheSaveTimer) {
      clearTimeout(cacheSaveTimer);
      cacheSaveTimer = null;
    }
    try {
      if (cachePath && fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
      }
    } catch (e) {
      logDebug('clear cache unlink error: ' + String(e));
    }
    broadcastToHubs(
      `window.__AGL_I18N__ && window.__AGL_I18N__.clearAutoCache(); window.__AGL_SETTINGS__ && window.__AGL_SETTINGS__.applyState(${JSON.stringify({ meta: getLauncherMeta() })});`
    );
    sendToast(
      senderWc,
      launcherConfig.i18n.enabled ? '已清除自动翻译缓存' : 'Auto-translation cache cleared',
      'success'
    );
  }

  function handleLauncherMessage(senderWc, rawJson) {
    let msg;
    try {
      msg = JSON.parse(rawJson);
    } catch (_) {
      return;
    }
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'i18n:update-config': {
        if (!msg.patch || typeof msg.patch !== 'object') return;
        const prevEnabled = launcherConfig.i18n.enabled;
        launcherConfig.i18n = normalizeI18nConfig(Object.assign({}, launcherConfig.i18n, msg.patch));
        scheduleSaveLauncherConfig();
        if (prevEnabled !== launcherConfig.i18n.enabled) {
          rebuildApplicationMenu();
        }
        broadcastI18nConfig(null);
        return;
      }
      case 'i18n:translate-batch': {
        if (!launcherConfig.i18n.enabled || !launcherConfig.i18n.autoTranslate) return;
        if (!Array.isArray(msg.texts) || msg.texts.length === 0) return;
        translateBatch(msg.texts).then(({ out, failed }) => {
          if (!senderWc || senderWc.isDestroyed()) return;
          if (Object.keys(out).length === 0 && failed.length === 0) return;
          senderWc.executeJavaScript(
            `window.__AGL_I18N__ && window.__AGL_I18N__.applyTranslations(${JSON.stringify(out)},${JSON.stringify(failed)});`,
            true
          ).catch(() => {});
          if (Object.keys(out).length > 0) {
            broadcastToHubs(
              `window.__AGL_SETTINGS__ && window.__AGL_SETTINGS__.applyState(${JSON.stringify({ meta: getLauncherMeta() })});`
            );
          }
        }).catch(() => {});
        return;
      }
      case 'i18n:clear-cache':
        handleClearAutoCache(senderWc);
        return;
      case 'i18n:export-dict':
        handleExportDict(senderWc);
        return;
      case 'skin:pick-image':
        handlePickSkinImage(senderWc);
        return;
      case 'skin:update-config': {
        if (!msg.patch || typeof msg.patch !== 'object') return;
        const safePatch = Object.assign({}, msg.patch);
        delete safePatch.imagePath;
        launcherConfig.skin = normalizeSkinConfig(Object.assign({}, launcherConfig.skin, safePatch));
        scheduleSaveLauncherConfig();
        broadcastSkinUpdate({ config: launcherConfig.skin }, senderWc);
        return;
      }
      case 'skin:clear-image':
        launcherConfig.skin = normalizeSkinConfig(Object.assign({}, launcherConfig.skin, {
          imagePath: '',
          enabled: false
        }));
        skinImageDataUrl = '';
        skinMeta = { imageName: '', imageError: '' };
        scheduleSaveLauncherConfig();
        broadcastSkinUpdate({
          config: launcherConfig.skin,
          imageDataUrl: '',
          meta: skinMeta
        });
        return;
      case 'skin:reset-defaults':
        launcherConfig.skin = normalizeSkinConfig(Object.assign({}, DEFAULT_SKIN_CONFIG, {
          imagePath: launcherConfig.skin.imagePath,
          enabled: launcherConfig.skin.enabled
        }));
        scheduleSaveLauncherConfig();
        broadcastSkinUpdate({ config: launcherConfig.skin });
        return;
      case 'theme:update-config': {
        if (!msg.patch || typeof msg.patch !== 'object') return;
        launcherConfig.theme = normalizeThemeConfig(Object.assign({}, launcherConfig.theme, msg.patch));
        syncNativeThemeForPreset(launcherConfig.theme.preset);
        scheduleSaveLauncherConfig();
        broadcastThemeUpdate({ config: launcherConfig.theme }, senderWc);
        return;
      }
      case 'theme:reset-defaults':
        launcherConfig.theme = normalizeThemeConfig(DEFAULT_THEME_CONFIG);
        syncNativeThemeForPreset(launcherConfig.theme.preset);
        scheduleSaveLauncherConfig();
        broadcastThemeUpdate({ config: launcherConfig.theme });
        return;
      case 'splash:pick-media':
        handlePickSplashMedia(senderWc);
        return;
      case 'splash:update-config': {
        if (!msg.patch || typeof msg.patch !== 'object') return;
        const safePatch = Object.assign({}, msg.patch);
        delete safePatch.mediaPath;
        launcherConfig.splash = normalizeSplashConfig(Object.assign({}, launcherConfig.splash, safePatch));
        scheduleSaveLauncherConfig();
        broadcastSplashUpdate(senderWc);
        return;
      }
      case 'splash:clear-media':
        launcherConfig.splash = normalizeSplashConfig(Object.assign({}, launcherConfig.splash, {
          mediaPath: '',
          enabled: false
        }));
        resolvedSplashMediaPath = '';
        splashMediaMime = '';
        splashMeta = { mediaName: '', mediaKind: '', mediaSize: 0, mediaError: '', valid: false };
        scheduleSaveLauncherConfig();
        broadcastSplashUpdate(null);
        return;
      case 'splash:reset-defaults':
        launcherConfig.splash = normalizeSplashConfig(Object.assign({}, DEFAULT_SPLASH_CONFIG, {
          mediaPath: launcherConfig.splash.mediaPath,
          enabled: launcherConfig.splash.enabled
        }));
        scheduleSaveLauncherConfig();
        broadcastSplashUpdate(null);
        return;
      case 'splash:preview':
        handlePreviewSplash(senderWc);
        return;
      case 'launcher:open-config-dir':
        try {
          if (configBaseDir && electronShell && typeof electronShell.openPath === 'function') {
            fs.mkdirSync(configBaseDir, { recursive: true });
            electronShell.openPath(configBaseDir);
          }
        } catch (_) {}
        return;
      case 'launcher:open-homepage':
        try {
          if (electronShell && typeof electronShell.openExternal === 'function') {
            electronShell.openExternal(HOMEPAGE_URL);
          }
        } catch (_) {}
        return;
      default:
        return;
    }
  }

  // --- Renderer Payload Builders ---
  function buildI18nPayload(allowFrame) {
    if (!i18nRendererCode) return '';
    if (cacheJsonDirty) {
      cacheJsonStr = JSON.stringify(autoCache);
      cacheJsonDirty = false;
    }
    return `(function(){try{var __AGL_I18N_INIT__={config:${JSON.stringify(launcherConfig.i18n)},dict:${dictJsonStr},cache:${cacheJsonStr},debug:${debug ? 'true' : 'false'},allowFrame:${allowFrame ? 'true' : 'false'}};\n${i18nRendererCode}\n}catch(e){}})();`;
  }

  function buildSkinPayload() {
    if (!skinRendererCode) return '';
    return `(function(){try{var __AGL_SKIN_INIT__={config:${JSON.stringify(launcherConfig.skin)},imageDataUrl:${JSON.stringify(skinImageDataUrl)},meta:${JSON.stringify(skinMeta)}};\n${skinRendererCode}\n}catch(e){}})();`;
  }

  function buildThemePayload() {
    if (!themeRendererCode) return '';
    return `(function(){try{var __AGL_THEME_INIT__={config:${JSON.stringify(launcherConfig.theme)}};\n${themeRendererCode}\n}catch(e){}})();`;
  }

  function buildSettingsPayload() {
    if (!settingsRendererCode) return '';
    return `(function(){try{var __AGL_SETTINGS_INIT__={config:${JSON.stringify(launcherConfig)},skinImageDataUrl:${JSON.stringify(skinImageDataUrl)},meta:${JSON.stringify(getLauncherMeta())}};\n${settingsRendererCode}\n}catch(e){}})();`;
  }

  function isAntigravityHubUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return false;
    try {
      const u = new URL(rawUrl);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
      if (u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') return false;
      if (splashServerPort > 0 && String(u.port) === String(splashServerPort)) return false;
      if (u.pathname && u.pathname.startsWith('/' + splashServerToken + '/')) return false;
      return true;
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
    if (!electron || electron.__AGLAUNCH_PATCHED__) return;
    electron.__AGLAUNCH_PATCHED__ = true;
    logDebug('Attaching Electron hooks (Menu + web-contents-created + unified IPC)');

    const { app, Menu, net, webFrameMain, shell, dialog, BrowserWindow, BaseWindow, WebContentsView, nativeTheme } = electron;
    if (net) electronNet = net;
    if (shell) electronShell = shell;
    if (dialog) electronDialog = dialog;
    if (BrowserWindow) electronBrowserWindow = BrowserWindow;
    if (BaseWindow) electronBaseWindow = BaseWindow;
    if (WebContentsView) electronWebContentsView = WebContentsView;
    if (Menu) electronMenu = Menu;
    if (nativeTheme) {
      electronNativeTheme = nativeTheme;
      syncNativeThemeForPreset(launcherConfig.theme.preset);
    }

    if (Menu && typeof Menu.buildFromTemplate === 'function') {
      origBuildFromTemplate = Menu.buildFromTemplate.bind(Menu);
      Menu.buildFromTemplate = function patchedBuildFromTemplate(template) {
        try {
          if (looksLikeMainAppMenu(template)) {
            lastRawAppMenuTemplate = cloneMenuTemplate(template);
          }
          return origBuildFromTemplate(transformMenuTemplate(template, true, launcherConfig.i18n.enabled));
        } catch (_) {
          return origBuildFromTemplate(template);
        }
      };
    }

    if (Menu && typeof Menu.setApplicationMenu === 'function') {
      origSetApplicationMenu = Menu.setApplicationMenu.bind(Menu);
      Menu.setApplicationMenu = function patchedSetApplicationMenu(menu) {
        try {
          translateLiveMenu(menu, true);
        } catch (_) {}
        return origSetApplicationMenu(menu);
      };
    }

    if (app && typeof app.once === 'function') {
      app.once('before-quit', () => {
        closeSplashServerNow();
        flushCacheSync();
        flushLauncherConfigSync();
      });
    }

    if (app) {
      app.on('web-contents-created', (_event, wc) => {
        if (!wc || wc.isDestroyed()) return;
        const wcType = typeof wc.getType === 'function' ? wc.getType() : '';
        if (wcType === 'devtools') return;

        // Unified renderer -> main IPC bridge over console-message (gated strictly to local Hub URLs).
        wc.on('console-message', (ev, _level, message) => {
          const msg = typeof message === 'string'
            ? message
            : (ev && typeof ev.message === 'string' ? ev.message : '');
          if (!msg || !msg.startsWith('__AGL_MSG__')) return;
          if (wc.isDestroyed()) return;
          const curUrl = typeof wc.getURL === 'function' ? wc.getURL() : '';
          if (!isAntigravityHubUrl(curUrl)) return;
          handleLauncherMessage(wc, msg.slice('__AGL_MSG__'.length));
        });

        wc.once('destroyed', () => {
          hubWebContents.delete(wc);
          childFrameRegistry.delete(wc);
        });

        const injectedChildFrames = new WeakMap();

        const injectChildFrame = (frame) => {
          if (!i18nRendererCode) return;
          if (!frame || (typeof frame.isDestroyed === 'function' && frame.isDestroyed())) return;
          const fUrl = frame.url || '';
          if (!isLocalUiFrameUrl(fUrl)) return;
          const frameKey = fUrl || '__empty__';
          if (injectedChildFrames.get(frame) === frameKey) return;
          injectedChildFrames.set(frame, frameKey);
          let frameSet = childFrameRegistry.get(wc);
          if (!frameSet) {
            frameSet = new Set();
            childFrameRegistry.set(wc, frameSet);
          }
          frameSet.add(frame);
          logDebug(`wc child-frame url=${fUrl.slice(0, 80)}`);
          frame.executeJavaScript(buildI18nPayload(true), true).catch((e) => {
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

        let lastInjectedI18nUrl = '';
        let lastInjectedSkinUrl = '';
        let lastInjectedThemeUrl = '';
        let lastInjectedSettingsUrl = '';

        wc.on('did-start-navigation', (_ev, _url, isInPlace, isMainFrame) => {
          if (isMainFrame && !isInPlace) {
            lastInjectedI18nUrl = '';
            lastInjectedSkinUrl = '';
            lastInjectedThemeUrl = '';
            lastInjectedSettingsUrl = '';
          }
        });

        const injectIfHub = (evName) => {
          if (wc.isDestroyed()) return;
          if (splashWebContentsSet.has(wc)) return;
          const url = typeof wc.getURL === 'function' ? wc.getURL() : '';
          logDebug(`wc event=${evName} type=${wcType} url=${url.slice(0, 80)}`);
          const isLocalWebview = wcType === 'webview' && (isAntigravityHubUrl(url) || url.startsWith('data:text/html'));
          if (!isAntigravityHubUrl(url) && !isLocalWebview) return;
          if (!isLocalWebview && isAntigravityHubUrl(url)) {
            hubWebContents.add(wc);
            syncNativeThemeForPreset(launcherConfig.theme.preset);
          }

          if (i18nRendererCode && (!url || lastInjectedI18nUrl !== url)) {
            lastInjectedI18nUrl = url || '__local__';
            wc.executeJavaScript(buildI18nPayload(isLocalWebview), true).catch((e) => {
              lastInjectedI18nUrl = '';
              logDebug('i18n executeJavaScript failed: ' + String(e));
            });
          }

          if (!isLocalWebview && isAntigravityHubUrl(url)) {
            if (themeRendererCode && lastInjectedThemeUrl !== url) {
              lastInjectedThemeUrl = url;
              wc.executeJavaScript(buildThemePayload(), true).catch((e) => {
                lastInjectedThemeUrl = '';
                logDebug('theme executeJavaScript failed: ' + String(e));
              });
            }
            if (skinRendererCode && lastInjectedSkinUrl !== url) {
              lastInjectedSkinUrl = url;
              wc.executeJavaScript(buildSkinPayload(), true).catch((e) => {
                lastInjectedSkinUrl = '';
                logDebug('skin executeJavaScript failed: ' + String(e));
              });
            }
            if (settingsRendererCode && lastInjectedSettingsUrl !== url) {
              lastInjectedSettingsUrl = url;
              wc.executeJavaScript(buildSettingsPayload(), true).catch((e) => {
                lastInjectedSettingsUrl = '';
                logDebug('settings executeJavaScript failed: ' + String(e));
              });
            }
          }

          // Sweep already-loaded local UI plugin child frames (e.g. Swarm panel).
          if (wc.mainFrame && Array.isArray(wc.mainFrame.framesInSubtree)) {
            for (const f of wc.mainFrame.framesInSubtree) {
              if (f !== wc.mainFrame) injectChildFrame(f);
            }
          }
        };

        wc.on('dom-ready', () => injectIfHub('dom-ready'));
        wc.on('did-finish-load', () => injectIfHub('did-finish-load'));

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

  function patchLoadingOverlayModule(exported) {
    if (!exported || typeof exported !== 'object' || exported.__AGLAUNCH_SPLASH_PATCHED__) return;
    if (typeof exported.attachLoadingOverlay !== 'function') return;
    exported.__AGLAUNCH_SPLASH_PATCHED__ = true;
    const origAttachLoadingOverlay = exported.attachLoadingOverlay;
    exported.attachLoadingOverlay = function patchedAttachLoadingOverlay(win, foregroundColor, backgroundColor) {
      try {
        if (launcherConfig.splash && launcherConfig.splash.enabled && launcherConfig.splash.mediaPath) {
          const started = attachCustomSplashOverlay(win, {
            foregroundColor,
            backgroundColor,
            mode: 'startup',
            fallbackFn: () => origAttachLoadingOverlay.call(exported, win, foregroundColor, backgroundColor)
          });
          if (started) {
            logDebug('Attached custom video splash overlay');
            return;
          }
        }
      } catch (err) {
        logDebug('Custom splash attach failed, falling back to native overlay: ' + String(err));
      }
      return origAttachLoadingOverlay.call(exported, win, foregroundColor, backgroundColor);
    };
    logDebug('Hooked Antigravity loadingOverlay.attachLoadingOverlay');
  }

  function inspectAndPatchLoadedModule(modId, exported) {
    if (!exported || typeof exported !== 'object') return;
    if (typeof exported.attachLoadingOverlay === 'function' && /loadingOverlay(?:\.js)?$/i.test(modId)) {
      try {
        patchLoadingOverlayModule(exported);
      } catch (err) {
        logDebug('loadingOverlay hook error: ' + String(err));
      }
    }
    if (typeof exported.getHubWebContents === 'function' && /(?:^|[\\/])utils(?:\.js)?$/i.test(modId)) {
      antigravityGetHubWebContents = exported.getHubWebContents;
      if (typeof exported.getHubWindows === 'function') {
        antigravityGetHubWindows = exported.getHubWindows;
      }
    }
  }

  function scanRequireCacheForAppModules() {
    try {
      const cache = (Module && Module._cache) || (typeof require !== 'undefined' && require.cache);
      if (!cache || typeof cache !== 'object') return;
      const keys = Object.keys(cache);
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const mod = cache[key];
        if (mod && mod.exports) {
          inspectAndPatchLoadedModule(key, mod.exports);
        }
      }
    } catch (err) {
      logDebug('scanRequireCacheForAppModules failed: ' + String(err));
    }
  }

  scanRequireCacheForAppModules();

  const origLoad = Module._load;
  Module._load = function patchedLoad(request) {
    const exported = origLoad.apply(this, arguments);
    if (request === 'electron' && exported && typeof exported === 'object') {
      try {
        attachElectronHooks(exported);
      } catch (err) {
        logDebug('Hook error: ' + String(err));
      }
    } else if (typeof request === 'string' && exported && typeof exported === 'object') {
      inspectAndPatchLoadedModule(request, exported);
    }
    return exported;
  };
})();
