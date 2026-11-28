'use strict';

// AntigravityZH Optimized Custom Static Image Skin Engine (Renderer)
// Uses TreeWalker surface pruning (zero querySelectorAll + closest thrashing) and rAF-throttled ResizeObserver.
// Exposes window.__AGL_SKIN__ for unified Launcher Settings integration + optional floating live-preview panel.

(function initRendererSkin() {
  const SUPPORTED_SKIN_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.avif'];

  const DEFAULT_SKIN_CONFIG = Object.freeze({
    version: 2,
    enabled: false,
    imagePath: '',
    mode: 'blend',        // 'blend' | 'overlay'
    scope: 'full',        // 'full' | 'main'
    fit: 'cover',         // 'cover' | 'contain' | 'fill'
    position: 'center',   // 'center' | 'top' | 'bottom' | 'left' | 'right'
    opacity: 1.0,         // 0.10 - 1.00
    scrimOpacity: 0.22,   // 0.00 - 0.85
    surfaceOpacity: 0.45, // 0.00 - 0.90
    blur: 0,              // 0 - 24 (px)
    overlayOpacity: 0.18  // 0.03 - 0.50
  });

  function clampNumber(val, min, max, fallback) {
    const num = typeof val === 'number' ? val : Number(val);
    if (!Number.isFinite(num)) return fallback;
    if (num < min) return min;
    if (num > max) return max;
    return Math.round(num * 1000) / 1000;
  }

  function isUntouchedV1Defaults(src) {
    return (
      src &&
      src.version === 1 &&
      src.opacity === 0.85 &&
      src.scrimOpacity === 0.45 &&
      src.surfaceOpacity === 0.78
    );
  }

  function normalizeSkinConfig(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    const migrateV1 = isUntouchedV1Defaults(src);
    const mode = src.mode === 'overlay' ? 'overlay' : 'blend';
    const scope = src.scope === 'main' ? 'main' : 'full';
    const fit = src.fit === 'contain' || src.fit === 'fill' ? src.fit : 'cover';
    const validPos = new Set(['center', 'top', 'bottom', 'left', 'right']);
    const position = validPos.has(src.position) ? src.position : 'center';
    return {
      version: 2,
      enabled: Boolean(src.enabled),
      imagePath: typeof src.imagePath === 'string' ? src.imagePath.trim() : '',
      mode,
      scope,
      fit,
      position,
      opacity: migrateV1 ? DEFAULT_SKIN_CONFIG.opacity : clampNumber(src.opacity, 0.1, 1, DEFAULT_SKIN_CONFIG.opacity),
      scrimOpacity: migrateV1 ? DEFAULT_SKIN_CONFIG.scrimOpacity : clampNumber(src.scrimOpacity, 0, 0.85, DEFAULT_SKIN_CONFIG.scrimOpacity),
      surfaceOpacity: migrateV1 ? DEFAULT_SKIN_CONFIG.surfaceOpacity : clampNumber(src.surfaceOpacity, 0, 0.9, DEFAULT_SKIN_CONFIG.surfaceOpacity),
      blur: Math.round(clampNumber(src.blur, 0, 24, DEFAULT_SKIN_CONFIG.blur)),
      overlayOpacity: clampNumber(src.overlayOpacity, 0.03, 0.5, DEFAULT_SKIN_CONFIG.overlayOpacity)
    };
  }

  let colorParseCtx = null;
  const colorParseCache = new Map();

  function parseRgbColor(str) {
    if (typeof str !== 'string' || !str) return null;
    const trimmed = str.trim();
    if (!trimmed || trimmed === 'transparent' || trimmed === 'none') return null;

    const m = /^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(trimmed);
    if (m) {
      const r = Math.max(0, Math.min(255, Math.round(Number(m[1]))));
      const g = Math.max(0, Math.min(255, Math.round(Number(m[2]))));
      const b = Math.max(0, Math.min(255, Math.round(Number(m[3]))));
      let a = 1;
      if (m[4] !== undefined) {
        a = m[4].endsWith('%') ? Number(m[4].slice(0, -1)) / 100 : Number(m[4]);
        if (!Number.isFinite(a)) a = 1;
      }
      return { r, g, b, a: Math.max(0, Math.min(1, a)) };
    }

    const srgb = /^color\(\s*srgb\s+([\d.]+%?)\s+([\d.]+%?)\s+([\d.]+%?)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i.exec(trimmed);
    if (srgb) {
      const ch = (v) => {
        const num = v.endsWith('%') ? Number(v.slice(0, -1)) / 100 : Number(v);
        return Math.max(0, Math.min(255, Math.round(num * 255)));
      };
      let a = 1;
      if (srgb[4] !== undefined) {
        a = srgb[4].endsWith('%') ? Number(srgb[4].slice(0, -1)) / 100 : Number(srgb[4]);
        if (!Number.isFinite(a)) a = 1;
      }
      return { r: ch(srgb[1]), g: ch(srgb[2]), b: ch(srgb[3]), a: Math.max(0, Math.min(1, a)) };
    }

    if (typeof document !== 'undefined') {
      if (colorParseCache.has(trimmed)) return colorParseCache.get(trimmed);
      try {
        if (!colorParseCtx) {
          const cv = document.createElement('canvas');
          cv.width = 1;
          cv.height = 1;
          colorParseCtx = cv.getContext('2d', { willReadFrequently: true });
        }
        if (colorParseCtx) {
          colorParseCtx.clearRect(0, 0, 1, 1);
          colorParseCtx.fillStyle = 'rgba(0, 0, 0, 0)';
          colorParseCtx.fillStyle = trimmed;
          colorParseCtx.fillRect(0, 0, 1, 1);
          const d = colorParseCtx.getImageData(0, 0, 1, 1).data;
          const res = d[3] === 0 ? null : { r: d[0], g: d[1], b: d[2], a: Math.round((d[3] / 255) * 1000) / 1000 };
          if (colorParseCache.size < 256) colorParseCache.set(trimmed, res);
          return res;
        }
      } catch (_) {}
    }

    return null;
  }

  function isDarkRgb(rgb) {
    if (!rgb) return true;
    const lum = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
    return lum < 0.5;
  }

  function isNeutralSurfaceColor(rgb) {
    if (!rgb || rgb.a < 0.6) return false;
    const max = Math.max(rgb.r, rgb.g, rgb.b);
    const min = Math.min(rgb.r, rgb.g, rgb.b);
    return max - min <= 36;
  }

  function isColorClose(a, b, tolerance) {
    if (!a || !b) return false;
    const tol = typeof tolerance === 'number' ? tolerance : 10;
    return (
      Math.abs(a.r - b.r) <= tol &&
      Math.abs(a.g - b.g) <= tol &&
      Math.abs(a.b - b.b) <= tol
    );
  }

  function resolveCssVars(config, isDark) {
    const cfg = normalizeSkinConfig(config);
    const bgSize = cfg.fit === 'fill' ? '100% 100%' : cfg.fit;
    const posMap = {
      center: 'center center',
      top: 'center top',
      bottom: 'center bottom',
      left: 'left center',
      right: 'right center'
    };
    const scrimRgb = isDark ? '11, 13, 18' : '248, 250, 252';
    const modalAlpha = Math.max(0.84, Math.min(0.95, Math.round((0.76 + cfg.surfaceOpacity * 0.2) * 1000) / 1000));
    const panelBlur = cfg.surfaceOpacity > 0.04 ? '10px' : '0px';
    return {
      '--aglaunch-skin-size': bgSize,
      '--aglaunch-skin-position': posMap[cfg.position] || 'center center',
      '--aglaunch-skin-opacity': String(cfg.opacity),
      '--aglaunch-skin-overlay-opacity': String(cfg.overlayOpacity),
      '--aglaunch-skin-scrim-rgb': scrimRgb,
      '--aglaunch-skin-scrim-opacity': String(cfg.scrimOpacity),
      '--aglaunch-skin-blur': cfg.blur + 'px',
      '--aglaunch-surface-alpha': String(cfg.surfaceOpacity),
      '--aglaunch-panel-blur': panelBlur,
      '--aglaunch-modal-alpha': String(modalAlpha)
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      DEFAULT_SKIN_CONFIG,
      SUPPORTED_SKIN_EXTENSIONS,
      normalizeSkinConfig,
      parseRgbColor,
      isDarkRgb,
      isNeutralSurfaceColor,
      isColorClose,
      resolveCssVars
    };
    return;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__AGL_SKIN_INSTALLED__) return;

  const isLocalHub = (location.protocol === 'https:' || location.protocol === 'http:') &&
    (location.hostname === '127.0.0.1' || location.hostname === 'localhost');
  if (!isLocalHub) return;

  window.__AGL_SKIN_INSTALLED__ = true;

  const init = typeof __AGL_SKIN_INIT__ !== 'undefined' && __AGL_SKIN_INIT__ ? __AGL_SKIN_INIT__ : {};
  let skinConfig = normalizeSkinConfig(init.config);
  let skinImageDataUrl = typeof init.imageDataUrl === 'string' ? init.imageDataUrl : '';
  let skinMeta = init.meta && typeof init.meta === 'object'
    ? Object.assign({ imageName: '', imageError: '' }, init.meta)
    : { imageName: '', imageError: '' };

  if (typeof __AGL_SKIN_INIT__ !== 'undefined') {
    try { __AGL_SKIN_INIT__ = null; } catch (_) {}
  }

  const STYLE_ID = 'aglaunch-skin-style';
  const LAYER_ID = 'aglaunch-skin-layer';
  const PANEL_ID = 'aglaunch-skin-floating-panel';

  const STRUCTURAL_TAGS = new Set(['DIV', 'MAIN', 'ASIDE', 'NAV', 'SECTION', 'HEADER', 'FOOTER', 'ARTICLE']);
  const SKIP_SUBTREE_SELECTOR = [
    '[data-aglaunch-ui]',
    '[data-aglaunch-skip]',
    '.monaco-editor',
    '.xterm',
    '.cm-editor',
    'pre',
    'code',
    'svg',
    'canvas',
    'img',
    'video'
  ].join(',');

  const SKIP_SELF_SELECTOR = [
    'button',
    'a',
    'input',
    'textarea',
    'select',
    '[role="button"]',
    '[role="switch"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[role="tooltip"]'
  ].join(',');

  const MODAL_SELECTOR = '[role="dialog"], [aria-modal="true"], dialog, [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]';

  let currentIsDark = true;
  let currentScopeEl = null;
  let scopeResizeObserver = null;
  let resizeRafPending = false;
  let surfaceScanTimer = null;
  let saveTimer = null;
  let pendingPatch = null;
  let panelEl = null;
  let panelPos = null;
  let lastThemeSignature = '';

  const stateListeners = new Set();
  function emitStateChange() {
    const snap = {
      config: Object.assign({}, skinConfig),
      imageDataUrl: skinImageDataUrl,
      meta: Object.assign({}, skinMeta),
      isDark: currentIsDark
    };
    for (const fn of stateListeners) {
      try { fn(snap); } catch (_) {}
    }
  }

  function isZh() {
    if (window.__AGL_I18N__ && typeof window.__AGL_I18N__.getConfig === 'function') {
      return Boolean(window.__AGL_I18N__.getConfig().enabled);
    }
    return true;
  }

  function sendLauncherMsg(payload) {
    try {
      console.debug('__AGL_MSG__' + JSON.stringify(payload));
    } catch (_) {}
  }

  function schedulePersistPatch(patch) {
    pendingPatch = Object.assign(pendingPatch || {}, patch);
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      const toSend = pendingPatch;
      pendingPatch = null;
      if (toSend) {
        sendLauncherMsg({ type: 'skin:update-config', patch: toSend });
      }
    }, 180);
  }

  function flushPersistNow(patch) {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    const merged = Object.assign(pendingPatch || {}, patch || {});
    pendingPatch = null;
    if (Object.keys(merged).length > 0) {
      sendLauncherMsg({ type: 'skin:update-config', patch: merged });
    }
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.setAttribute('data-aglaunch-skip', '1');
    style.textContent = `
      #${LAYER_ID} {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        overflow: hidden;
        display: none;
        z-index: -9998;
        contain: strict;
      }
      html[data-aglaunch-skin-active="1"] #${LAYER_ID} {
        display: block;
      }
      html[data-aglaunch-skin-mode="overlay"] #${LAYER_ID} {
        z-index: 2147483000;
      }
      #${LAYER_ID} .aglaunch-skin-img {
        position: absolute;
        inset: -28px;
        background-repeat: no-repeat;
        background-size: var(--aglaunch-skin-size, cover);
        background-position: var(--aglaunch-skin-position, center center);
        opacity: var(--aglaunch-skin-opacity, 1);
        filter: blur(var(--aglaunch-skin-blur, 0px));
        transform: translateZ(0);
        will-change: opacity, filter;
      }
      html[data-aglaunch-skin-mode="overlay"] #${LAYER_ID} .aglaunch-skin-img {
        opacity: var(--aglaunch-skin-overlay-opacity, 0.18);
      }
      #${LAYER_ID} .aglaunch-skin-scrim {
        position: absolute;
        inset: 0;
        background-color: rgba(var(--aglaunch-skin-scrim-rgb, 11, 13, 18), var(--aglaunch-skin-scrim-opacity, 0.22));
      }
      html[data-aglaunch-skin-mode="overlay"] #${LAYER_ID} .aglaunch-skin-scrim {
        display: none;
      }

      html[data-aglaunch-skin-mode="blend"][data-aglaunch-skin-scope="full"],
      html[data-aglaunch-skin-mode="blend"][data-aglaunch-skin-scope="full"] body {
        background-color: transparent !important;
        background-image: none !important;
      }
      html[data-aglaunch-skin-mode="blend"] body {
        isolation: isolate !important;
      }
      html[data-aglaunch-skin-mode="blend"] [data-aglaunch-surface="canvas"],
      html[data-aglaunch-skin-mode="blend"] [data-aglaunch-surface="clear"] {
        background-color: transparent !important;
        background-image: none !important;
      }
      html[data-aglaunch-skin-mode="blend"]:not([data-aglaunch-theme-active="1"]) [data-aglaunch-surface="sidebar"],
      html[data-aglaunch-skin-mode="blend"]:not([data-aglaunch-theme-active="1"]) [data-aglaunch-surface="panel"] {
        background-color: rgba(var(--aglaunch-orig-rgb), var(--aglaunch-surface-alpha, 0.45)) !important;
        backdrop-filter: blur(var(--aglaunch-panel-blur, 10px));
        -webkit-backdrop-filter: blur(var(--aglaunch-panel-blur, 10px));
      }
      html[data-aglaunch-skin-mode="blend"] [data-aglaunch-surface="modal"] {
        background-color: rgba(var(--aglaunch-orig-rgb), var(--aglaunch-modal-alpha, 0.85)) !important;
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
      }

      /* Compact Floating Live-Preview Panel */
      #${PANEL_ID} {
        position: fixed;
        top: 56px;
        right: 20px;
        width: 336px;
        max-height: calc(100vh - 80px);
        z-index: 2147483640;
        display: none;
        flex-direction: column;
        border-radius: 14px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        font-size: 13px;
        line-height: 1.45;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.38), 0 0 0 1px var(--agl-ui-border);
        background: var(--agl-ui-bg);
        color: var(--agl-ui-fg);
        backdrop-filter: blur(18px) saturate(140%);
        -webkit-backdrop-filter: blur(18px) saturate(140%);
        overflow: hidden;
        user-select: none;
      }
      #${PANEL_ID}[data-open="1"] {
        display: flex;
      }
      #${PANEL_ID}[data-theme="dark"] {
        --agl-ui-bg: rgba(24, 26, 33, 0.94);
        --agl-ui-fg: #f1f5f9;
        --agl-ui-muted: #94a3b8;
        --agl-ui-border: rgba(255, 255, 255, 0.12);
        --agl-ui-accent: #4f8cff;
        --agl-ui-seg-bg: rgba(255, 255, 255, 0.06);
        --agl-ui-seg-active: rgba(79, 140, 255, 0.24);
      }
      #${PANEL_ID}[data-theme="light"] {
        --agl-ui-bg: rgba(255, 255, 255, 0.95);
        --agl-ui-fg: #0f172a;
        --agl-ui-muted: #64748b;
        --agl-ui-border: rgba(15, 23, 42, 0.12);
        --agl-ui-accent: #2563eb;
        --agl-ui-seg-bg: rgba(15, 23, 42, 0.06);
        --agl-ui-seg-active: rgba(37, 99, 235, 0.14);
      }
      .agl-fp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 11px 14px;
        border-bottom: 1px solid var(--agl-ui-border);
        cursor: move;
      }
      .agl-fp-title {
        font-size: 13.5px;
        font-weight: 600;
      }
      .agl-fp-close {
        width: 24px;
        height: 24px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--agl-ui-muted);
        font-size: 17px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .agl-fp-close:hover {
        background: var(--agl-ui-seg-bg);
        color: var(--agl-ui-fg);
      }
      .agl-fp-body {
        padding: 12px 14px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .agl-fp-slider-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .agl-fp-slider-head {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
      }
      .agl-fp-slider-val {
        color: var(--agl-ui-muted);
        font-variant-numeric: tabular-nums;
      }
      .agl-fp-slider {
        width: 100%;
        accent-color: var(--agl-ui-accent);
        cursor: pointer;
        margin: 0;
      }
      .agl-fp-seg {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        gap: 4px;
        padding: 3px;
        border-radius: 8px;
        background: var(--agl-ui-seg-bg);
        border: 1px solid var(--agl-ui-border);
      }
      .agl-fp-seg button {
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--agl-ui-muted);
        font-size: 12px;
        font-weight: 500;
        padding: 4px 6px;
        cursor: pointer;
      }
      .agl-fp-seg button[data-active="1"] {
        background: var(--agl-ui-seg-active);
        color: var(--agl-ui-fg);
      }
      .agl-fp-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 14px;
        border-top: 1px solid var(--agl-ui-border);
      }
      .agl-fp-link {
        border: none;
        background: transparent;
        color: var(--agl-ui-muted);
        font-size: 12px;
        cursor: pointer;
        padding: 2px 4px;
      }
      .agl-fp-link:hover {
        color: var(--agl-ui-fg);
        text-decoration: underline;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureLayer() {
    let layer = document.getElementById(LAYER_ID);
    if (!layer) {
      layer = document.createElement('div');
      layer.id = LAYER_ID;
      layer.setAttribute('data-aglaunch-ui', 'skin-layer');
      layer.setAttribute('data-aglaunch-skip', '1');
      layer.setAttribute('aria-hidden', 'true');

      const img = document.createElement('div');
      img.className = 'aglaunch-skin-img';
      const scrim = document.createElement('div');
      scrim.className = 'aglaunch-skin-scrim';
      layer.appendChild(img);
      layer.appendChild(scrim);
    }
    if (document.body && layer.parentNode !== document.body) {
      document.body.insertBefore(layer, document.body.firstChild);
    }
    return layer;
  }

  function detectThemeDark() {
    const html = document.documentElement;
    const presetPolarity = html && html.getAttribute('data-aglaunch-theme-polarity');
    if (presetPolarity === 'light') return false;
    if (presetPolarity === 'dark') return true;
    const body = document.body;
    const cls = ((html && html.className) || '') + ' ' + ((body && body.className) || '');
    const dataTheme = (
      (html && (html.getAttribute('data-theme') || html.getAttribute('data-color-scheme'))) ||
      (body && (body.getAttribute('data-theme') || body.getAttribute('data-color-scheme'))) ||
      ''
    ).toLowerCase();

    if (dataTheme.includes('light')) return false;
    if (dataTheme.includes('dark')) return true;
    if (/\blight\b|\btheme-light\b/i.test(cls) && !/\bdark\b/i.test(cls)) return false;
    if (/\bdark\b|\btheme-dark\b/i.test(cls)) return true;

    const candidates = [body, document.querySelector('main'), html];
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (!el) continue;
      const bg = parseRgbColor(getComputedStyle(el).backgroundColor);
      if (bg && bg.a >= 0.5) {
        return isDarkRgb(bg);
      }
    }
    return window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true;
  }

  function findMainContentElement() {
    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 720;

    const mains = document.querySelectorAll('main, [role="main"]');
    let best = null;
    let bestArea = 0;
    for (let i = 0; i < mains.length; i++) {
      const el = mains[i];
      if (el.closest('[data-aglaunch-ui]')) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 260 || rect.height < 180) continue;
      const area = rect.width * rect.height;
      if (area > bestArea) {
        bestArea = area;
        best = el;
      }
    }
    if (best) return best;

    const sidebars = document.querySelectorAll('aside, nav, [data-sidebar], [class*="sidebar" i]');
    for (let i = 0; i < sidebars.length; i++) {
      const sb = sidebars[i];
      if (sb.closest('[data-aglaunch-ui]')) continue;
      const sRect = sb.getBoundingClientRect();
      if (sRect.left > 40 || sRect.width < 120 || sRect.width > vw * 0.55 || sRect.height < vh * 0.5) continue;
      const parent = sb.parentElement;
      if (!parent) continue;
      const siblings = parent.children;
      for (let j = 0; j < siblings.length; j++) {
        const sib = siblings[j];
        if (sib === sb || sib.id === LAYER_ID || sib.id === PANEL_ID) continue;
        const r = sib.getBoundingClientRect();
        if (r.left >= sRect.right - 8 && r.width >= 260 && r.height >= vh * 0.5) {
          return sib;
        }
      }
    }
    return null;
  }

  function clearScopeRootMarkers() {
    const prev = document.querySelectorAll('[data-aglaunch-skin-scope-root]');
    for (let i = 0; i < prev.length; i++) {
      prev[i].removeAttribute('data-aglaunch-skin-scope-root');
    }
  }

  function syncLayerBounds() {
    const layer = document.getElementById(LAYER_ID);
    if (!layer) return;
    if (skinConfig.scope === 'main' && currentScopeEl && currentScopeEl.isConnected && currentScopeEl !== document.body) {
      const rect = currentScopeEl.getBoundingClientRect();
      if (rect.width >= 100 && rect.height >= 100) {
        layer.style.top = Math.round(rect.top) + 'px';
        layer.style.left = Math.round(rect.left) + 'px';
        layer.style.width = Math.round(rect.width) + 'px';
        layer.style.height = Math.round(rect.height) + 'px';
        return;
      }
    }
    layer.style.top = '0px';
    layer.style.left = '0px';
    layer.style.width = '100vw';
    layer.style.height = '100vh';
  }

  function scheduleSyncLayerBounds() {
    if (resizeRafPending) return;
    resizeRafPending = true;
    requestAnimationFrame(() => {
      resizeRafPending = false;
      syncLayerBounds();
    });
  }

  function updateScopeBinding() {
    if (scopeResizeObserver) {
      scopeResizeObserver.disconnect();
      scopeResizeObserver = null;
    }
    clearScopeRootMarkers();

    if (!isSkinActive()) {
      currentScopeEl = null;
      return;
    }

    if (skinConfig.scope === 'main') {
      const mainEl = findMainContentElement();
      currentScopeEl = mainEl || document.body;
    } else {
      currentScopeEl = document.body;
    }

    if (currentScopeEl) {
      currentScopeEl.setAttribute('data-aglaunch-skin-scope-root', '1');
      if (skinConfig.scope === 'main' && currentScopeEl !== document.body && typeof ResizeObserver === 'function') {
        scopeResizeObserver = new ResizeObserver(scheduleSyncLayerBounds);
        scopeResizeObserver.observe(currentScopeEl);
        if (document.body) scopeResizeObserver.observe(document.body);
      }
    }
    syncLayerBounds();
  }

  function clearSurfaceMarks() {
    const marked = document.querySelectorAll('[data-aglaunch-surface]');
    for (let i = 0; i < marked.length; i++) {
      marked[i].removeAttribute('data-aglaunch-surface');
      marked[i].style.removeProperty('--aglaunch-orig-rgb');
    }
  }

  function isSidebarContainer(el, rect, vw, vh) {
    if (!el || !rect) return false;
    if (rect.left > 24 || rect.width < 140 || rect.width > Math.min(380, vw * 0.36) || rect.height < vh * 0.55) {
      return false;
    }
    if (el.tagName === 'ASIDE' || el.tagName === 'NAV') return true;
    const cls = typeof el.className === 'string' ? el.className : '';
    if (el.hasAttribute('data-sidebar') || /sidebar/i.test(cls)) return true;
    return rect.top <= 48 && rect.height >= vh * 0.78;
  }

  // Optimized TreeWalker surface scan: prunes skipped subtrees (.monaco-editor, .xterm, svg, launcher UI) in O(1).
  function scanSurfaces(forceRefresh) {
    if (!isSkinActive() || skinConfig.mode !== 'blend') return;
    const root = currentScopeEl || document.body;
    if (!root) return;

    const html = document.documentElement;
    if (forceRefresh) {
      html.removeAttribute('data-aglaunch-skin-mode');
      clearSurfaceMarks();
    }

    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 720;

    if (skinConfig.scope === 'main' && root !== document.body) {
      let anc = root.parentElement;
      while (anc && anc !== document.body && anc !== html) {
        anc.setAttribute('data-aglaunch-surface', 'clear');
        anc = anc.parentElement;
      }
    }

    const classifyEl = (el) => {
      if (!el || el.nodeType !== 1) return;
      if (!STRUCTURAL_TAGS.has(el.tagName)) return;
      if (el.id === LAYER_ID || el.id === PANEL_ID) return;
      if (!forceRefresh && el.hasAttribute('data-aglaunch-surface')) return;
      try {
        if (el.matches(SKIP_SELF_SELECTOR)) return;
      } catch (_) {}

      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      const rgb = parseRgbColor(cs.backgroundColor);
      if (!isNeutralSurfaceColor(rgb)) return;

      const rect = el.getBoundingClientRect();
      if (rect.width < 110 || rect.height < 36) return;

      let isModal = false;
      try {
        isModal = el.matches(MODAL_SELECTOR) || Boolean(el.closest(MODAL_SELECTOR));
      } catch (_) {}

      if (isModal) {
        const parentModal = el.parentElement && el.parentElement.closest('[data-aglaunch-surface="modal"]');
        if (parentModal) {
          el.setAttribute('data-aglaunch-surface', 'clear');
        } else {
          el.style.setProperty('--aglaunch-orig-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
          el.setAttribute('data-aglaunch-surface', 'modal');
        }
        return;
      }

      const parentGlass = el.parentElement && el.parentElement.closest('[data-aglaunch-surface="sidebar"], [data-aglaunch-surface="panel"]');
      if (parentGlass) {
        el.setAttribute('data-aglaunch-surface', 'clear');
        return;
      }

      if (skinConfig.scope === 'full' && isSidebarContainer(el, rect, vw, vh)) {
        el.style.setProperty('--aglaunch-orig-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        el.setAttribute('data-aglaunch-surface', 'sidebar');
        return;
      }

      const isLargeCanvas = rect.width >= vw * 0.32 && rect.height >= vh * 0.42;
      const isTopOrBottomBar = rect.width >= vw * 0.38 && rect.height <= 68;
      if (isLargeCanvas || isTopOrBottomBar) {
        el.setAttribute('data-aglaunch-surface', 'canvas');
        return;
      }

      el.style.setProperty('--aglaunch-orig-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      el.setAttribute('data-aglaunch-surface', 'panel');
    };

    classifyEl(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, {
      acceptNode(n) {
        try {
          if (n.matches(SKIP_SUBTREE_SELECTOR)) {
            return NodeFilter.FILTER_REJECT;
          }
        } catch (_) {}
        return STRUCTURAL_TAGS.has(n.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    });

    let visited = 0;
    let curr;
    while (visited < 1500 && (curr = walker.nextNode())) {
      visited++;
      classifyEl(curr);
    }

    if (forceRefresh) {
      html.setAttribute('data-aglaunch-skin-mode', 'blend');
    }
  }

  function scheduleSurfaceScan(forceRefresh) {
    if (!isSkinActive() || skinConfig.mode !== 'blend') return;
    if (surfaceScanTimer) clearTimeout(surfaceScanTimer);
    surfaceScanTimer = setTimeout(() => {
      surfaceScanTimer = null;
      scanSurfaces(Boolean(forceRefresh));
    }, forceRefresh ? 60 : 200);
  }

  function isSkinActive() {
    return Boolean(skinConfig.enabled && skinImageDataUrl);
  }

  function applySkinVisuals(options) {
    const opts = options || {};
    ensureStyles();
    const layer = ensureLayer();
    const html = document.documentElement;

    currentIsDark = detectThemeDark();
    const vars = resolveCssVars(skinConfig, currentIsDark);
    for (const [k, v] of Object.entries(vars)) {
      html.style.setProperty(k, v);
    }

    const imgEl = layer.querySelector('.aglaunch-skin-img');
    if (imgEl) {
      if (skinImageDataUrl) {
        imgEl.style.backgroundImage = `url("${skinImageDataUrl.replace(/"/g, '\\"')}")`;
      } else {
        imgEl.style.backgroundImage = 'none';
      }
    }

    const active = isSkinActive();
    if (active) {
      html.setAttribute('data-aglaunch-skin-active', '1');
      html.setAttribute('data-aglaunch-skin-mode', skinConfig.mode);
      html.setAttribute('data-aglaunch-skin-scope', skinConfig.scope);
      updateScopeBinding();
      if (skinConfig.mode === 'blend') {
        scanSurfaces(Boolean(opts.forceRescan));
      } else {
        clearSurfaceMarks();
      }
    } else {
      html.removeAttribute('data-aglaunch-skin-active');
      html.removeAttribute('data-aglaunch-skin-mode');
      html.removeAttribute('data-aglaunch-skin-scope');
      updateScopeBinding();
      clearSurfaceMarks();
    }

    syncFloatingPanelUI();
    emitStateChange();
  }

  function updateConfig(patch, options) {
    if (!patch || typeof patch !== 'object') return;
    const opts = options || {};
    const prevMode = skinConfig.mode;
    const prevScope = skinConfig.scope;
    const prevEnabled = skinConfig.enabled;
    const safePatch = Object.assign({}, patch);
    delete safePatch.imagePath;
    skinConfig = normalizeSkinConfig(Object.assign({}, skinConfig, safePatch));
    const needsRescan = (prevMode !== skinConfig.mode || prevScope !== skinConfig.scope || prevEnabled !== skinConfig.enabled) && skinConfig.mode === 'blend';
    applySkinVisuals({ forceRescan: needsRescan });
    if (opts.debounce) {
      schedulePersistPatch(safePatch);
    } else {
      flushPersistNow(safePatch);
    }
  }

  // --- Optional Compact Floating Live-Preview Panel ---
  function formatPercent(val) {
    return Math.round(val * 100) + '%';
  }

  function createFpSlider(id, min, max, step, value, formatter, onInput) {
    const item = document.createElement('div');
    item.className = 'agl-fp-slider-item';
    item.dataset.sliderId = id;
    const head = document.createElement('div');
    head.className = 'agl-fp-slider-head';
    const lbl = document.createElement('span');
    const valSpan = document.createElement('span');
    valSpan.className = 'agl-fp-slider-val';
    valSpan.textContent = formatter(value);
    head.appendChild(lbl);
    head.appendChild(valSpan);
    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'agl-fp-slider';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.addEventListener('input', () => {
      const next = Number(input.value);
      valSpan.textContent = formatter(next);
      onInput(next);
    });
    item.appendChild(head);
    item.appendChild(input);
    return { item, lbl, input, valSpan, formatter };
  }

  function buildFloatingPanel() {
    if (panelEl && panelEl.isConnected) return panelEl;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.setAttribute('data-aglaunch-ui', 'floating-skin-panel');
    panel.setAttribute('data-aglaunch-skip', '1');
    panel.setAttribute('role', 'dialog');

    const header = document.createElement('div');
    header.className = 'agl-fp-header';
    const title = document.createElement('span');
    title.className = 'agl-fp-title';
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'agl-fp-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', closeFloatingPanel);
    header.appendChild(title);
    header.appendChild(closeBtn);

    let dragging = false;
    let startX = 0;
    let startY = 0;
    let origLeft = 0;
    let origTop = 0;
    header.addEventListener('mousedown', (ev) => {
      if (ev.target === closeBtn) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      startX = ev.clientX;
      startY = ev.clientY;
      origLeft = rect.left;
      origTop = rect.top;
      panel.style.right = 'auto';
      panel.style.left = origLeft + 'px';
      panel.style.top = origTop + 'px';
      ev.preventDefault();
    });
    window.addEventListener('mousemove', (ev) => {
      if (!dragging) return;
      const vw = window.innerWidth || 1280;
      const vh = window.innerHeight || 720;
      const pw = panel.offsetWidth || 336;
      const ph = panel.offsetHeight || 320;
      const left = Math.max(8, Math.min(vw - pw - 8, origLeft + (ev.clientX - startX)));
      const top = Math.max(8, Math.min(vh - Math.min(ph, 120), origTop + (ev.clientY - startY)));
      panelPos = { left, top };
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
    });
    window.addEventListener('mouseup', () => {
      dragging = false;
    });

    const body = document.createElement('div');
    body.className = 'agl-fp-body';

    const modeSeg = document.createElement('div');
    modeSeg.className = 'agl-fp-seg';
    const blendBtn = document.createElement('button');
    blendBtn.type = 'button';
    blendBtn.dataset.val = 'blend';
    blendBtn.addEventListener('click', () => updateConfig({ mode: 'blend' }));
    const overlayBtn = document.createElement('button');
    overlayBtn.type = 'button';
    overlayBtn.dataset.val = 'overlay';
    overlayBtn.addEventListener('click', () => updateConfig({ mode: 'overlay' }));
    modeSeg.appendChild(blendBtn);
    modeSeg.appendChild(overlayBtn);
    body.appendChild(modeSeg);

    const opacityCtrl = createFpSlider('opacity', 0.1, 1.0, 0.01, skinConfig.opacity, formatPercent, (v) => {
      updateConfig({ opacity: v }, { debounce: true });
    });
    const scrimCtrl = createFpSlider('scrimOpacity', 0.0, 0.85, 0.01, skinConfig.scrimOpacity, formatPercent, (v) => {
      updateConfig({ scrimOpacity: v }, { debounce: true });
    });
    const surfaceCtrl = createFpSlider('surfaceOpacity', 0.0, 0.9, 0.01, skinConfig.surfaceOpacity, formatPercent, (v) => {
      updateConfig({ surfaceOpacity: v }, { debounce: true });
    });
    const overlayCtrl = createFpSlider('overlayOpacity', 0.03, 0.5, 0.01, skinConfig.overlayOpacity, formatPercent, (v) => {
      updateConfig({ overlayOpacity: v }, { debounce: true });
    });
    const blurCtrl = createFpSlider('blur', 0, 24, 1, skinConfig.blur, (v) => `${Math.round(v)}px`, (v) => {
      updateConfig({ blur: Math.round(v) }, { debounce: true });
    });

    body.appendChild(opacityCtrl.item);
    body.appendChild(scrimCtrl.item);
    body.appendChild(surfaceCtrl.item);
    body.appendChild(overlayCtrl.item);
    body.appendChild(blurCtrl.item);

    const footer = document.createElement('div');
    footer.className = 'agl-fp-footer';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'agl-fp-link';
    resetBtn.addEventListener('click', () => sendLauncherMsg({ type: 'skin:reset-defaults' }));

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'agl-fp-link';
    backBtn.addEventListener('click', () => {
      closeFloatingPanel();
      if (typeof window.__AGL_OPEN_LAUNCHER_SETTINGS__ === 'function') {
        window.__AGL_OPEN_LAUNCHER_SETTINGS__();
      }
    });
    footer.appendChild(resetBtn);
    footer.appendChild(backBtn);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);
    panel.__refs = {
      title,
      closeBtn,
      blendBtn,
      overlayBtn,
      opacityCtrl,
      scrimCtrl,
      surfaceCtrl,
      overlayCtrl,
      blurCtrl,
      resetBtn,
      backBtn
    };

    document.body.appendChild(panel);
    panelEl = panel;
    syncFloatingPanelUI();
    return panel;
  }

  function syncFloatingPanelUI() {
    if (!panelEl || !panelEl.__refs) return;
    const r = panelEl.__refs;
    const zh = isZh();
    panelEl.setAttribute('data-theme', currentIsDark ? 'dark' : 'light');
    r.title.textContent = zh ? '皮肤浮窗实时预览' : 'Skin Live Preview';
    r.closeBtn.title = zh ? '关闭 (Esc)' : 'Close (Esc)';
    r.blendBtn.textContent = zh ? '背景融合（毛玻璃）' : 'Glass Blend';
    r.overlayBtn.textContent = zh ? '轻量叠层' : 'Light Overlay';
    r.blendBtn.dataset.active = skinConfig.mode === 'blend' ? '1' : '0';
    r.overlayBtn.dataset.active = skinConfig.mode === 'overlay' ? '1' : '0';

    r.opacityCtrl.lbl.textContent = zh ? '背景可见度' : 'Background Visibility';
    r.scrimCtrl.lbl.textContent = zh ? '护眼遮罩浓度' : 'Scrim Veil';
    r.surfaceCtrl.lbl.textContent = zh ? '侧栏/卡片毛玻璃浓度' : 'Panel Glass Opacity';
    r.overlayCtrl.lbl.textContent = zh ? '叠层透明度' : 'Overlay Opacity';
    r.blurCtrl.lbl.textContent = zh ? '背景模糊度' : 'Background Blur';
    r.resetBtn.textContent = zh ? '恢复默认参数' : 'Reset Defaults';
    r.backBtn.textContent = zh ? '返回启动器设置' : 'Back to Settings';

    const setSlider = (ctrl, val, vis) => {
      ctrl.item.style.display = vis ? 'flex' : 'none';
      ctrl.input.value = String(val);
      ctrl.valSpan.textContent = ctrl.formatter(val);
    };
    const isBlend = skinConfig.mode === 'blend';
    setSlider(r.opacityCtrl, skinConfig.opacity, isBlend);
    setSlider(r.scrimCtrl, skinConfig.scrimOpacity, isBlend);
    setSlider(r.surfaceCtrl, skinConfig.surfaceOpacity, isBlend);
    setSlider(r.overlayCtrl, skinConfig.overlayOpacity, !isBlend);
    setSlider(r.blurCtrl, skinConfig.blur, true);
  }

  function openFloatingPanel() {
    ensureStyles();
    const panel = buildFloatingPanel();
    panel.setAttribute('data-open', '1');
    if (panelPos) {
      panel.style.right = 'auto';
      panel.style.left = panelPos.left + 'px';
      panel.style.top = panelPos.top + 'px';
    }
    syncFloatingPanelUI();
  }

  function closeFloatingPanel() {
    if (panelEl) {
      panelEl.removeAttribute('data-open');
    }
  }

  function toggleFloatingPanel() {
    if (panelEl && panelEl.getAttribute('data-open') === '1') {
      closeFloatingPanel();
    } else {
      openFloatingPanel();
    }
  }

  function applyFromMain(payload) {
    if (!payload || typeof payload !== 'object') return;
    const prevMode = skinConfig.mode;
    const prevScope = skinConfig.scope;
    const prevEnabled = skinConfig.enabled;
    if (payload.config) {
      skinConfig = normalizeSkinConfig(payload.config);
    }
    if (typeof payload.imageDataUrl === 'string') {
      skinImageDataUrl = payload.imageDataUrl;
    }
    if (payload.meta && typeof payload.meta === 'object') {
      skinMeta = Object.assign({}, skinMeta, payload.meta);
    }
    const modeOrScopeChanged = prevMode !== skinConfig.mode || prevScope !== skinConfig.scope || prevEnabled !== skinConfig.enabled;
    applySkinVisuals({ forceRescan: modeOrScopeChanged && skinConfig.mode === 'blend' });
  }

  window.__AGL_SKIN__ = {
    getState: () => ({
      config: Object.assign({}, skinConfig),
      imageDataUrl: skinImageDataUrl,
      meta: Object.assign({}, skinMeta),
      isDark: currentIsDark
    }),
    updateConfig,
    applyFromMain,
    openFloatingPanel,
    closeFloatingPanel,
    toggleFloatingPanel,
    subscribe(fn) {
      if (typeof fn === 'function') stateListeners.add(fn);
      return () => stateListeners.delete(fn);
    }
  };

  function startObservers() {
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && panelEl && panelEl.getAttribute('data-open') === '1') {
        closeFloatingPanel();
      }
    });

    window.addEventListener('resize', () => {
      scheduleSyncLayerBounds();
      if (isSkinActive() && skinConfig.mode === 'blend') {
        scheduleSurfaceScan(false);
      }
    });

    const checkThemeChange = () => {
      const html = document.documentElement;
      const body = document.body;
      const sig = [
        html ? html.className : '',
        html ? html.getAttribute('data-theme') : '',
        html ? html.getAttribute('data-aglaunch-theme-polarity') : '',
        body ? body.className : '',
        body ? body.getAttribute('data-theme') : ''
      ].join('|');
      if (sig !== lastThemeSignature) {
        lastThemeSignature = sig;
        const nextDark = detectThemeDark();
        if (nextDark !== currentIsDark) {
          applySkinVisuals({ forceRescan: true });
        }
      }
    };

    const themeObs = new MutationObserver(checkThemeChange);
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-color-scheme', 'data-aglaunch-theme-polarity', 'style']
    });
    if (document.body) {
      themeObs.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'data-theme', 'data-color-scheme']
      });
    }

    const domObs = new MutationObserver((mutations) => {
      if (!isSkinActive()) return;
      let sawElementAdd = false;
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type !== 'childList' || m.addedNodes.length === 0) continue;
        const target = m.target;
        if (target && target.nodeType === 1 && target.closest && target.closest('[data-aglaunch-ui]')) continue;
        for (let j = 0; j < m.addedNodes.length; j++) {
          const n = m.addedNodes[j];
          if (n && n.nodeType === 1 && !n.hasAttribute('data-aglaunch-ui')) {
            sawElementAdd = true;
            break;
          }
        }
        if (sawElementAdd) break;
      }
      if (!sawElementAdd) return;
      if (skinConfig.scope === 'main' && (!currentScopeEl || !currentScopeEl.isConnected || currentScopeEl === document.body)) {
        updateScopeBinding();
      }
      if (skinConfig.mode === 'blend') {
        scheduleSurfaceScan(false);
      }
    });

    if (document.body) {
      domObs.observe(document.body, { childList: true, subtree: true });
    }

    if (window.__AGL_I18N__ && typeof window.__AGL_I18N__.subscribe === 'function') {
      window.__AGL_I18N__.subscribe(() => syncFloatingPanelUI());
    }
  }

  function boot() {
    if (!document.body) return;
    applySkinVisuals({ forceRescan: true });
    startObservers();
    setTimeout(() => {
      if (isSkinActive()) {
        updateScopeBinding();
        if (skinConfig.mode === 'blend') scanSurfaces(false);
      }
    }, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
