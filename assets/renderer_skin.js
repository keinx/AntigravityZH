'use strict';

// AntigravityZH Custom Static Image Skin Engine (Renderer)
// Expects __AGZH_SKIN_CONFIG__, __AGZH_SKIN_IMAGE__, and __AGZH_SKIN_META__ in scope (or module.exports for unit tests).

(function initRendererSkin(globalScope) {
  const SUPPORTED_SKIN_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.avif'];

  const DEFAULT_SKIN_CONFIG = Object.freeze({
    version: 2,
    enabled: false,
    imagePath: '',
    mode: 'blend',        // 'blend' | 'overlay'
    scope: 'full',        // 'full' | 'main'
    fit: 'cover',         // 'cover' | 'contain' | 'fill'
    position: 'center',   // 'center' | 'top' | 'bottom' | 'left' | 'right'
    opacity: 1.0,         // 0.10 - 1.00 (background visibility in blend mode)
    scrimOpacity: 0.22,   // 0.00 - 0.85 (adaptive dark/light veil in blend mode)
    surfaceOpacity: 0.45, // 0.00 - 0.90 (sidebar/card glass opacity in blend mode)
    blur: 0,              // 0 - 24 (px)
    overlayOpacity: 0.18  // 0.03 - 0.50 (layer opacity in overlay mode)
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

    // CSS Color 4: color(srgb r g b [/ a])
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

    // Fallback for modern CSS colors (oklch, oklab, lab, lch, color-mix, hsl) in browser environments.
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
    const spread = max - min;
    // Allow subtle cool/warm tinting typical of modern dark/light UI surfaces,
    // while excluding vivid accent banners, primary buttons, and colored tags.
    return spread <= 36;
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
      '--agzh-skin-size': bgSize,
      '--agzh-skin-position': posMap[cfg.position] || 'center center',
      '--agzh-skin-opacity': String(cfg.opacity),
      '--agzh-skin-overlay-opacity': String(cfg.overlayOpacity),
      '--agzh-skin-scrim-rgb': scrimRgb,
      '--agzh-skin-scrim-opacity': String(cfg.scrimOpacity),
      '--agzh-skin-blur': cfg.blur + 'px',
      '--agzh-surface-alpha': String(cfg.surfaceOpacity),
      '--agzh-panel-blur': panelBlur,
      '--agzh-modal-alpha': String(modalAlpha)
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
  if (window.__AGZH_SKIN_INSTALLED__) return;

  const isLocalHub = (location.protocol === 'https:' || location.protocol === 'http:') &&
    (location.hostname === '127.0.0.1' || location.hostname === 'localhost');
  if (!isLocalHub) return;

  window.__AGZH_SKIN_INSTALLED__ = true;

  let skinConfig = normalizeSkinConfig(typeof __AGZH_SKIN_CONFIG__ !== 'undefined' ? __AGZH_SKIN_CONFIG__ : null);
  let skinImageDataUrl = typeof __AGZH_SKIN_IMAGE__ === 'string' ? __AGZH_SKIN_IMAGE__ : '';
  let skinMeta = (typeof __AGZH_SKIN_META__ !== 'undefined' && __AGZH_SKIN_META__ && typeof __AGZH_SKIN_META__ === 'object')
    ? Object.assign({}, __AGZH_SKIN_META__)
    : { imageName: '', imageError: '', configPath: '' };

  if (typeof __AGZH_SKIN_CONFIG__ !== 'undefined') { try { __AGZH_SKIN_CONFIG__ = null; } catch (_) {} }
  if (typeof __AGZH_SKIN_IMAGE__ !== 'undefined') { try { __AGZH_SKIN_IMAGE__ = null; } catch (_) {} }
  if (typeof __AGZH_SKIN_META__ !== 'undefined') { try { __AGZH_SKIN_META__ = null; } catch (_) {} }

  const STYLE_ID = 'agzh-skin-style';
  const LAYER_ID = 'agzh-skin-layer';
  const PANEL_ID = 'agzh-skin-panel';
  const SETTINGS_CARD_ID = 'agzh-skin-settings-card';

  const STRUCTURAL_TAGS = new Set(['DIV', 'MAIN', 'ASIDE', 'NAV', 'SECTION', 'HEADER', 'FOOTER', 'ARTICLE']);
  const SKIP_SURFACE_SELECTOR = [
    '[data-agzh-skin-ui]',
    '[data-agzh-skip]',
    '.monaco-editor',
    '.xterm',
    '.cm-editor',
    'pre',
    'code',
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
    '[role="tooltip"]',
    'svg',
    'canvas',
    'img',
    'video'
  ].join(',');

  const MODAL_SELECTOR = '[role="dialog"], [aria-modal="true"], dialog, [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]';

  let currentIsDark = true;
  let currentScopeEl = null;
  let scopeResizeObserver = null;
  let surfaceScanTimer = null;
  let settingsCheckTimer = null;
  let saveTimer = null;
  let pendingPatch = null;
  let panelEl = null;
  let panelPos = null; // { left, top } once dragged
  let lastThemeSignature = '';

  function sendSkinAction(payload) {
    try {
      console.debug('__AGZH_SKIN__' + JSON.stringify(payload));
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
        sendSkinAction({ type: 'update-config', patch: toSend });
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
      sendSkinAction({ type: 'update-config', patch: merged });
    }
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.setAttribute('data-agzh-skip', '1');
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
        z-index: 0;
        contain: strict;
      }
      html[data-agzh-skin-active="1"] #${LAYER_ID} {
        display: block;
      }
      html[data-agzh-skin-mode="overlay"] #${LAYER_ID} {
        z-index: 2147483000;
      }
      #${LAYER_ID} .agzh-skin-img {
        position: absolute;
        inset: -28px;
        background-repeat: no-repeat;
        background-size: var(--agzh-skin-size, cover);
        background-position: var(--agzh-skin-position, center center);
        opacity: var(--agzh-skin-opacity, 0.85);
        filter: blur(var(--agzh-skin-blur, 0px));
        transform: translateZ(0);
        will-change: opacity, filter;
      }
      html[data-agzh-skin-mode="overlay"] #${LAYER_ID} .agzh-skin-img {
        opacity: var(--agzh-skin-overlay-opacity, 0.14);
      }
      #${LAYER_ID} .agzh-skin-scrim {
        position: absolute;
        inset: 0;
        background-color: rgba(var(--agzh-skin-scrim-rgb, 11, 13, 18), var(--agzh-skin-scrim-opacity, 0.45));
      }
      html[data-agzh-skin-mode="overlay"] #${LAYER_ID} .agzh-skin-scrim {
        display: none;
      }

      /* Blend mode surface translucency (only active when data-agzh-skin-mode="blend") */
      html[data-agzh-skin-mode="blend"][data-agzh-skin-scope="full"],
      html[data-agzh-skin-mode="blend"][data-agzh-skin-scope="full"] body {
        background-color: transparent !important;
        background-image: none !important;
      }
      html[data-agzh-skin-mode="blend"] body > :not(#${LAYER_ID}):not(#${PANEL_ID}) {
        position: relative;
        z-index: 1;
      }
      /* Transparent canvas & de-stacked inner wrappers so background shines through with zero double-darkening */
      html[data-agzh-skin-mode="blend"] [data-agzh-surface="canvas"],
      html[data-agzh-skin-mode="blend"] [data-agzh-surface="clear"] {
        background-color: transparent !important;
        background-image: none !important;
      }
      /* Single-layer frosted glass for sidebar & compact cards/composer */
      html[data-agzh-skin-mode="blend"] [data-agzh-surface="sidebar"],
      html[data-agzh-skin-mode="blend"] [data-agzh-surface="panel"] {
        background-color: rgba(var(--agzh-orig-rgb), var(--agzh-surface-alpha, 0.45)) !important;
        backdrop-filter: blur(var(--agzh-panel-blur, 10px));
        -webkit-backdrop-filter: blur(var(--agzh-panel-blur, 10px));
      }
      /* High-readability frosted modals/popovers/menus */
      html[data-agzh-skin-mode="blend"] [data-agzh-surface="modal"] {
        background-color: rgba(var(--agzh-orig-rgb), var(--agzh-modal-alpha, 0.85)) !important;
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
      }

      /* Floating visual skin configurator panel */
      #${PANEL_ID} {
        position: fixed;
        top: 56px;
        right: 20px;
        width: 348px;
        max-height: calc(100vh - 80px);
        z-index: 2147483640;
        display: none;
        flex-direction: column;
        border-radius: 14px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        font-size: 13px;
        line-height: 1.45;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.38), 0 0 0 1px var(--agzh-ui-border);
        background: var(--agzh-ui-bg);
        color: var(--agzh-ui-fg);
        backdrop-filter: blur(18px) saturate(140%);
        -webkit-backdrop-filter: blur(18px) saturate(140%);
        overflow: hidden;
        user-select: none;
      }
      #${PANEL_ID}[data-open="1"] {
        display: flex;
      }
      #${PANEL_ID}[data-theme="dark"],
      #${SETTINGS_CARD_ID}[data-theme="dark"] {
        --agzh-ui-bg: rgba(24, 26, 33, 0.94);
        --agzh-ui-card: rgba(36, 39, 49, 0.72);
        --agzh-ui-fg: #f1f5f9;
        --agzh-ui-muted: #94a3b8;
        --agzh-ui-border: rgba(255, 255, 255, 0.12);
        --agzh-ui-accent: #4f8cff;
        --agzh-ui-accent-hover: #679cff;
        --agzh-ui-danger: #f87171;
        --agzh-ui-seg-bg: rgba(255, 255, 255, 0.06);
        --agzh-ui-seg-active: rgba(79, 140, 255, 0.24);
      }
      #${PANEL_ID}[data-theme="light"],
      #${SETTINGS_CARD_ID}[data-theme="light"] {
        --agzh-ui-bg: rgba(255, 255, 255, 0.95);
        --agzh-ui-card: rgba(241, 245, 249, 0.85);
        --agzh-ui-fg: #0f172a;
        --agzh-ui-muted: #64748b;
        --agzh-ui-border: rgba(15, 23, 42, 0.12);
        --agzh-ui-accent: #2563eb;
        --agzh-ui-accent-hover: #1d4ed8;
        --agzh-ui-danger: #dc2626;
        --agzh-ui-seg-bg: rgba(15, 23, 42, 0.06);
        --agzh-ui-seg-active: rgba(37, 99, 235, 0.14);
      }
      .agzh-sp-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 14px;
        border-bottom: 1px solid var(--agzh-ui-border);
        cursor: move;
        flex-shrink: 0;
      }
      .agzh-sp-title-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .agzh-sp-title {
        font-size: 14px;
        font-weight: 600;
      }
      .agzh-sp-badge {
        font-size: 11px;
        padding: 1px 6px;
        border-radius: 999px;
        background: var(--agzh-ui-seg-bg);
        color: var(--agzh-ui-muted);
      }
      .agzh-sp-close {
        width: 26px;
        height: 26px;
        border: none;
        border-radius: 7px;
        background: transparent;
        color: var(--agzh-ui-muted);
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .agzh-sp-close:hover {
        background: var(--agzh-ui-seg-bg);
        color: var(--agzh-ui-fg);
      }
      .agzh-sp-body {
        padding: 14px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .agzh-sp-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .agzh-sp-label {
        font-size: 12.5px;
        font-weight: 500;
        color: var(--agzh-ui-fg);
      }
      .agzh-sp-sub {
        font-size: 11.5px;
        color: var(--agzh-ui-muted);
      }
      .agzh-sp-switch {
        position: relative;
        width: 38px;
        height: 21px;
        border-radius: 999px;
        border: 1px solid var(--agzh-ui-border);
        background: var(--agzh-ui-seg-bg);
        cursor: pointer;
        transition: background 0.16s ease;
        flex-shrink: 0;
        padding: 0;
      }
      .agzh-sp-switch[aria-checked="true"] {
        background: var(--agzh-ui-accent);
        border-color: transparent;
      }
      .agzh-sp-switch::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        transition: transform 0.16s ease;
      }
      .agzh-sp-switch[aria-checked="true"]::after {
        transform: translateX(17px);
      }
      .agzh-sp-preview {
        position: relative;
        height: 112px;
        border-radius: 10px;
        border: 1px dashed var(--agzh-ui-border);
        background: var(--agzh-ui-card);
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 10px;
        cursor: pointer;
      }
      .agzh-sp-preview.has-img {
        border-style: solid;
        padding: 0;
      }
      .agzh-sp-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .agzh-sp-preview-empty {
        font-size: 12px;
        color: var(--agzh-ui-muted);
      }
      .agzh-sp-filename {
        font-size: 11.5px;
        color: var(--agzh-ui-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .agzh-sp-error {
        font-size: 11.5px;
        color: var(--agzh-ui-danger);
        background: rgba(248, 113, 113, 0.12);
        border: 1px solid rgba(248, 113, 113, 0.25);
        border-radius: 8px;
        padding: 6px 8px;
      }
      .agzh-sp-actions {
        display: flex;
        gap: 8px;
      }
      .agzh-sp-btn {
        flex: 1;
        height: 31px;
        border-radius: 8px;
        border: 1px solid var(--agzh-ui-border);
        background: var(--agzh-ui-seg-bg);
        color: var(--agzh-ui-fg);
        font-size: 12.5px;
        font-weight: 500;
        cursor: pointer;
        padding: 0 10px;
      }
      .agzh-sp-btn:hover {
        filter: brightness(1.08);
      }
      .agzh-sp-btn.primary {
        background: var(--agzh-ui-accent);
        border-color: transparent;
        color: #ffffff;
      }
      .agzh-sp-btn.primary:hover {
        background: var(--agzh-ui-accent-hover);
        filter: none;
      }
      .agzh-sp-btn:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .agzh-sp-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .agzh-sp-seg {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        gap: 4px;
        padding: 3px;
        border-radius: 9px;
        background: var(--agzh-ui-seg-bg);
        border: 1px solid var(--agzh-ui-border);
      }
      .agzh-sp-seg button {
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--agzh-ui-muted);
        font-size: 12px;
        font-weight: 500;
        padding: 5px 6px;
        cursor: pointer;
      }
      .agzh-sp-seg button[data-active="1"] {
        background: var(--agzh-ui-seg-active);
        color: var(--agzh-ui-fg);
      }
      .agzh-sp-slider-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .agzh-sp-slider-head {
        display: flex;
        justify-content: space-between;
        font-size: 12px;
      }
      .agzh-sp-slider-val {
        color: var(--agzh-ui-muted);
        font-variant-numeric: tabular-nums;
      }
      .agzh-sp-slider {
        width: 100%;
        accent-color: var(--agzh-ui-accent);
        cursor: pointer;
        margin: 0;
      }
      .agzh-sp-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 10px 14px;
        border-top: 1px solid var(--agzh-ui-border);
        flex-shrink: 0;
      }
      .agzh-sp-link-btn {
        border: none;
        background: transparent;
        color: var(--agzh-ui-muted);
        font-size: 12px;
        cursor: pointer;
        padding: 2px 4px;
      }
      .agzh-sp-link-btn:hover {
        color: var(--agzh-ui-fg);
        text-decoration: underline;
      }

      /* Inline Settings -> Appearance entry card */
      #${SETTINGS_CARD_ID} {
        margin-top: 16px;
        padding: 14px 16px;
        border-radius: 12px;
        border: 1px solid var(--agzh-ui-border);
        background: var(--agzh-ui-card);
        color: var(--agzh-ui-fg);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .agzh-sc-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .agzh-sc-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .agzh-sc-title {
        font-size: 13.5px;
        font-weight: 600;
        color: var(--agzh-ui-fg);
      }
      .agzh-sc-desc {
        font-size: 12px;
        color: var(--agzh-ui-muted);
      }
      .agzh-sc-bottom {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .agzh-sc-thumb {
        width: 72px;
        height: 44px;
        border-radius: 7px;
        border: 1px solid var(--agzh-ui-border);
        background: var(--agzh-ui-seg-bg);
        overflow: hidden;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        color: var(--agzh-ui-muted);
      }
      .agzh-sc-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .agzh-sc-meta {
        flex: 1;
        min-width: 120px;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .agzh-sc-btns {
        display: flex;
        gap: 8px;
        flex-shrink: 0;
      }
      .agzh-sc-btns .agzh-sp-btn {
        flex: none;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureLayer() {
    let layer = document.getElementById(LAYER_ID);
    if (!layer) {
      layer = document.createElement('div');
      layer.id = LAYER_ID;
      layer.setAttribute('data-agzh-skin-ui', 'layer');
      layer.setAttribute('data-agzh-skip', '1');
      layer.setAttribute('aria-hidden', 'true');

      const img = document.createElement('div');
      img.className = 'agzh-skin-img';
      const scrim = document.createElement('div');
      scrim.className = 'agzh-skin-scrim';
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
      if (el.closest('[data-agzh-skin-ui]')) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width < 260 || rect.height < 180) continue;
      const area = rect.width * rect.height;
      if (area > bestArea) {
        bestArea = area;
        best = el;
      }
    }
    if (best) return best;

    // Fallback: locate a visible sidebar on the left and pick its rightmost large sibling container.
    const sidebars = document.querySelectorAll('aside, nav, [data-sidebar], [class*="sidebar" i]');
    for (let i = 0; i < sidebars.length; i++) {
      const sb = sidebars[i];
      if (sb.closest('[data-agzh-skin-ui]')) continue;
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
    const prev = document.querySelectorAll('[data-agzh-skin-scope-root]');
    for (let i = 0; i < prev.length; i++) {
      prev[i].removeAttribute('data-agzh-skin-scope-root');
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
      currentScopeEl.setAttribute('data-agzh-skin-scope-root', '1');
      if (skinConfig.scope === 'main' && currentScopeEl !== document.body && typeof ResizeObserver === 'function') {
        scopeResizeObserver = new ResizeObserver(syncLayerBounds);
        scopeResizeObserver.observe(currentScopeEl);
        if (document.body) scopeResizeObserver.observe(document.body);
      }
    }
    syncLayerBounds();
  }

  function clearSurfaceMarks() {
    const marked = document.querySelectorAll('[data-agzh-surface]');
    for (let i = 0; i < marked.length; i++) {
      marked[i].removeAttribute('data-agzh-surface');
      marked[i].style.removeProperty('--agzh-orig-rgb');
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
    // Left-anchored full-height column sitting beside a wider main pane
    return rect.top <= 48 && rect.height >= vh * 0.78;
  }

  function scanSurfaces(forceRefresh) {
    if (!isSkinActive() || skinConfig.mode !== 'blend') return;
    const root = currentScopeEl || document.body;
    if (!root) return;

    const html = document.documentElement;
    if (forceRefresh) {
      // Temporarily suspend blend overrides to sample true native theme RGB values.
      html.removeAttribute('data-agzh-skin-mode');
      clearSurfaceMarks();
    }

    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 720;

    // When scope === 'main', ancestors between body and mainEl must be transparent so #agzh-skin-layer
    // (fixed at z-index: 0, clipped to mainEl bounds) is not occluded by #root's solid background.
    if (skinConfig.scope === 'main' && root !== document.body) {
      let anc = root.parentElement;
      while (anc && anc !== document.body && anc !== html) {
        anc.setAttribute('data-agzh-surface', 'clear');
        anc = anc.parentElement;
      }
    }

    const classifyEl = (el) => {
      if (!el || el.nodeType !== 1) return;
      if (!STRUCTURAL_TAGS.has(el.tagName)) return;
      if (el.id === LAYER_ID || el.id === PANEL_ID || el.id === SETTINGS_CARD_ID) return;
      if (!forceRefresh && el.hasAttribute('data-agzh-surface')) return;
      try {
        if (el.matches(SKIP_SURFACE_SELECTOR) || el.closest(SKIP_SURFACE_SELECTOR)) return;
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
        // Only tint the outermost modal surface; inner matching wrappers become transparent to avoid double-stacking.
        const parentModal = el.parentElement && el.parentElement.closest('[data-agzh-surface="modal"]');
        if (parentModal) {
          el.setAttribute('data-agzh-surface', 'clear');
        } else {
          el.style.setProperty('--agzh-orig-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
          el.setAttribute('data-agzh-surface', 'modal');
        }
        return;
      }

      // If inside an already-frosted sidebar or panel, clear nested neutral wrappers so opacity NEVER stacks!
      const parentGlass = el.parentElement && el.parentElement.closest('[data-agzh-surface="sidebar"], [data-agzh-surface="panel"]');
      if (parentGlass) {
        el.setAttribute('data-agzh-surface', 'clear');
        return;
      }

      // 1. Left sidebar container -> single-layer frosted glass
      if (skinConfig.scope === 'full' && isSidebarContainer(el, rect, vw, vh)) {
        el.style.setProperty('--agzh-orig-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
        el.setAttribute('data-agzh-surface', 'sidebar');
        return;
      }

      // 2. Large workspace canvases (outer shell, main rounded card, chat/welcome viewports, split panes, topbar)
      //    -> 100% transparent so the background image + single global scrim remain crystal clear!
      const isLargeCanvas = rect.width >= vw * 0.32 && rect.height >= vh * 0.42;
      const isTopOrBottomBar = rect.width >= vw * 0.38 && rect.height <= 68;
      if (isLargeCanvas || isTopOrBottomBar) {
        el.setAttribute('data-agzh-surface', 'canvas');
        return;
      }

      // 3. Compact cards / composer box / floating tool panels -> single-layer frosted glass
      el.style.setProperty('--agzh-orig-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      el.setAttribute('data-agzh-surface', 'panel');
    };

    // Walk in top-down DOM order so parent glass surfaces are always marked before descendants.
    classifyEl(root);
    const all = root.querySelectorAll('div, main, aside, nav, section, header, footer, article');
    const maxNodes = Math.min(all.length, 1500);
    for (let i = 0; i < maxNodes; i++) {
      classifyEl(all[i]);
    }

    if (forceRefresh) {
      html.setAttribute('data-agzh-skin-mode', 'blend');
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

    const imgEl = layer.querySelector('.agzh-skin-img');
    if (imgEl) {
      if (skinImageDataUrl) {
        imgEl.style.backgroundImage = `url("${skinImageDataUrl.replace(/"/g, '\\"')}")`;
      } else {
        imgEl.style.backgroundImage = 'none';
      }
    }

    const active = isSkinActive();
    if (active) {
      html.setAttribute('data-agzh-skin-active', '1');
      html.setAttribute('data-agzh-skin-mode', skinConfig.mode);
      html.setAttribute('data-agzh-skin-scope', skinConfig.scope);
      updateScopeBinding();
      if (skinConfig.mode === 'blend') {
        scanSurfaces(Boolean(opts.forceRescan));
      } else {
        clearSurfaceMarks();
      }
    } else {
      html.removeAttribute('data-agzh-skin-active');
      html.removeAttribute('data-agzh-skin-mode');
      html.removeAttribute('data-agzh-skin-scope');
      updateScopeBinding();
      clearSurfaceMarks();
    }

    syncPanelUI();
    syncSettingsCardUI();
  }

  function getStatusSummary() {
    if (!skinImageDataUrl) return '未选择图片';
    if (!skinConfig.enabled) return '已暂停';
    const modeTxt = skinConfig.mode === 'overlay' ? '轻量叠层' : '背景融合';
    const scopeTxt = skinConfig.scope === 'main' ? '仅主区域' : '全窗口';
    return `已启用 · ${modeTxt} · ${scopeTxt}`;
  }

  function formatPercent(val) {
    return Math.round(val * 100) + '%';
  }

  // --- Floating Visual Skin Configurator Panel ---
  function createSegmentedControl(options, currentVal, onSelect) {
    const wrap = document.createElement('div');
    wrap.className = 'agzh-sp-seg';
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = opt.label;
      btn.dataset.val = opt.value;
      btn.dataset.active = opt.value === currentVal ? '1' : '0';
      btn.addEventListener('click', () => {
        onSelect(opt.value);
      });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function createSliderControl(id, label, min, max, step, value, formatter, onInput) {
    const item = document.createElement('div');
    item.className = 'agzh-sp-slider-item';
    item.dataset.sliderId = id;

    const head = document.createElement('div');
    head.className = 'agzh-sp-slider-head';
    const lbl = document.createElement('span');
    lbl.className = 'agzh-sp-label';
    lbl.textContent = label;
    const valSpan = document.createElement('span');
    valSpan.className = 'agzh-sp-slider-val';
    valSpan.textContent = formatter(value);
    head.appendChild(lbl);
    head.appendChild(valSpan);

    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'agzh-sp-slider';
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
    return { item, input, valSpan, formatter };
  }

  function buildPanel() {
    if (panelEl && panelEl.isConnected) return panelEl;

    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.setAttribute('data-agzh-skin-ui', 'panel');
    panel.setAttribute('data-agzh-skip', '1');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', '自定义皮肤设置');

    // Header (draggable)
    const header = document.createElement('div');
    header.className = 'agzh-sp-header';
    const titleWrap = document.createElement('div');
    titleWrap.className = 'agzh-sp-title-wrap';
    const title = document.createElement('span');
    title.className = 'agzh-sp-title';
    title.textContent = '自定义皮肤';
    const badge = document.createElement('span');
    badge.className = 'agzh-sp-badge';
    badge.textContent = '静态图片';
    titleWrap.appendChild(title);
    titleWrap.appendChild(badge);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'agzh-sp-close';
    closeBtn.title = '关闭 (Esc)';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', closeSkinPanel);

    header.appendChild(titleWrap);
    header.appendChild(closeBtn);

    // Drag behavior
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
      const pw = panel.offsetWidth || 348;
      const ph = panel.offsetHeight || 400;
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
    body.className = 'agzh-sp-body';

    // 1. Master enable switch
    const enableRow = document.createElement('div');
    enableRow.className = 'agzh-sp-row';
    const enableText = document.createElement('div');
    const enableLabel = document.createElement('div');
    enableLabel.className = 'agzh-sp-label';
    enableLabel.textContent = '启用自定义皮肤';
    const enableSub = document.createElement('div');
    enableSub.className = 'agzh-sp-sub';
    enableSub.dataset.role = 'status-text';
    enableText.appendChild(enableLabel);
    enableText.appendChild(enableSub);

    const enableSwitch = document.createElement('button');
    enableSwitch.type = 'button';
    enableSwitch.className = 'agzh-sp-switch';
    enableSwitch.setAttribute('role', 'switch');
    enableSwitch.dataset.role = 'enable-switch';
    enableSwitch.addEventListener('click', () => {
      if (!skinImageDataUrl && !skinConfig.enabled) {
        sendSkinAction({ type: 'pick-image' });
        return;
      }
      skinConfig.enabled = !skinConfig.enabled;
      applySkinVisuals({ forceRescan: skinConfig.enabled && skinConfig.mode === 'blend' });
      flushPersistNow({ enabled: skinConfig.enabled });
    });
    enableRow.appendChild(enableText);
    enableRow.appendChild(enableSwitch);
    body.appendChild(enableRow);

    // 2. Image preview & picker
    const imgSection = document.createElement('div');
    imgSection.className = 'agzh-sp-section';
    const previewBox = document.createElement('div');
    previewBox.className = 'agzh-sp-preview';
    previewBox.dataset.role = 'preview-box';
    previewBox.title = '点击选择静态背景图片';
    previewBox.addEventListener('click', () => sendSkinAction({ type: 'pick-image' }));

    const fileNameEl = document.createElement('div');
    fileNameEl.className = 'agzh-sp-filename';
    fileNameEl.dataset.role = 'file-name';

    const errorEl = document.createElement('div');
    errorEl.className = 'agzh-sp-error';
    errorEl.dataset.role = 'error-box';
    errorEl.style.display = 'none';

    const btnRow = document.createElement('div');
    btnRow.className = 'agzh-sp-actions';
    const pickBtn = document.createElement('button');
    pickBtn.type = 'button';
    pickBtn.className = 'agzh-sp-btn primary';
    pickBtn.textContent = '选择本地图片...';
    pickBtn.addEventListener('click', () => sendSkinAction({ type: 'pick-image' }));

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'agzh-sp-btn';
    clearBtn.dataset.role = 'clear-btn';
    clearBtn.textContent = '清除图片';
    clearBtn.addEventListener('click', () => sendSkinAction({ type: 'clear-image' }));

    btnRow.appendChild(pickBtn);
    btnRow.appendChild(clearBtn);
    imgSection.appendChild(previewBox);
    imgSection.appendChild(fileNameEl);
    imgSection.appendChild(errorEl);
    imgSection.appendChild(btnRow);
    body.appendChild(imgSection);

    // 3. Render mode
    const modeSection = document.createElement('div');
    modeSection.className = 'agzh-sp-section';
    const modeLabel = document.createElement('div');
    modeLabel.className = 'agzh-sp-label';
    modeLabel.textContent = '渲染模式';
    const modeSeg = createSegmentedControl(
      [
        { value: 'blend', label: '背景融合（毛玻璃）' },
        { value: 'overlay', label: '轻量叠层' }
      ],
      skinConfig.mode,
      (val) => {
        if (skinConfig.mode === val) return;
        skinConfig.mode = val;
        applySkinVisuals({ forceRescan: val === 'blend' });
        flushPersistNow({ mode: val });
      }
    );
    modeSeg.dataset.role = 'mode-seg';
    modeSection.appendChild(modeLabel);
    modeSection.appendChild(modeSeg);
    body.appendChild(modeSection);

    // 4. Coverage scope
    const scopeSection = document.createElement('div');
    scopeSection.className = 'agzh-sp-section';
    const scopeLabel = document.createElement('div');
    scopeLabel.className = 'agzh-sp-label';
    scopeLabel.textContent = '覆盖区域';
    const scopeSeg = createSegmentedControl(
      [
        { value: 'full', label: '全窗口' },
        { value: 'main', label: '仅主内容区' }
      ],
      skinConfig.scope,
      (val) => {
        if (skinConfig.scope === val) return;
        skinConfig.scope = val;
        applySkinVisuals({ forceRescan: skinConfig.mode === 'blend' });
        flushPersistNow({ scope: val });
      }
    );
    scopeSeg.dataset.role = 'scope-seg';
    scopeSection.appendChild(scopeLabel);
    scopeSection.appendChild(scopeSeg);
    body.appendChild(scopeSection);

    // 5. Image fit & position
    const fitSection = document.createElement('div');
    fitSection.className = 'agzh-sp-section';
    const fitLabel = document.createElement('div');
    fitLabel.className = 'agzh-sp-label';
    fitLabel.textContent = '图片适配';
    const fitSeg = createSegmentedControl(
      [
        { value: 'cover', label: '铺满裁切' },
        { value: 'contain', label: '完整适应' },
        { value: 'fill', label: '拉伸填充' }
      ],
      skinConfig.fit,
      (val) => {
        skinConfig.fit = val;
        applySkinVisuals();
        flushPersistNow({ fit: val });
      }
    );
    fitSeg.dataset.role = 'fit-seg';

    const posSeg = createSegmentedControl(
      [
        { value: 'center', label: '居中' },
        { value: 'top', label: '顶部' },
        { value: 'bottom', label: '底部' },
        { value: 'left', label: '左侧' },
        { value: 'right', label: '右侧' }
      ],
      skinConfig.position,
      (val) => {
        skinConfig.position = val;
        applySkinVisuals();
        flushPersistNow({ position: val });
      }
    );
    posSeg.dataset.role = 'pos-seg';

    fitSection.appendChild(fitLabel);
    fitSection.appendChild(fitSeg);
    fitSection.appendChild(posSeg);
    body.appendChild(fitSection);

    // 6. Sliders (Blend vs Overlay)
    const slidersSection = document.createElement('div');
    slidersSection.className = 'agzh-sp-section';

    const opacityCtrl = createSliderControl('opacity', '背景可见度', 0.1, 1.0, 0.01, skinConfig.opacity, formatPercent, (v) => {
      skinConfig.opacity = v;
      applySkinVisuals();
      schedulePersistPatch({ opacity: v });
    });
    const scrimCtrl = createSliderControl('scrimOpacity', '护眼遮罩浓度', 0.0, 0.85, 0.01, skinConfig.scrimOpacity, formatPercent, (v) => {
      skinConfig.scrimOpacity = v;
      applySkinVisuals();
      schedulePersistPatch({ scrimOpacity: v });
    });
    const surfaceCtrl = createSliderControl('surfaceOpacity', '侧栏/卡片毛玻璃浓度', 0.0, 0.9, 0.01, skinConfig.surfaceOpacity, formatPercent, (v) => {
      skinConfig.surfaceOpacity = v;
      applySkinVisuals();
      schedulePersistPatch({ surfaceOpacity: v });
    });
    const overlayCtrl = createSliderControl('overlayOpacity', '叠层透明度', 0.03, 0.5, 0.01, skinConfig.overlayOpacity, formatPercent, (v) => {
      skinConfig.overlayOpacity = v;
      applySkinVisuals();
      schedulePersistPatch({ overlayOpacity: v });
    });
    const blurCtrl = createSliderControl('blur', '背景模糊度', 0, 24, 1, skinConfig.blur, (v) => `${Math.round(v)}px`, (v) => {
      skinConfig.blur = Math.round(v);
      applySkinVisuals();
      schedulePersistPatch({ blur: Math.round(v) });
    });

    slidersSection.appendChild(opacityCtrl.item);
    slidersSection.appendChild(scrimCtrl.item);
    slidersSection.appendChild(surfaceCtrl.item);
    slidersSection.appendChild(overlayCtrl.item);
    slidersSection.appendChild(blurCtrl.item);
    body.appendChild(slidersSection);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'agzh-sp-footer';
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'agzh-sp-link-btn';
    resetBtn.textContent = '恢复默认参数';
    resetBtn.addEventListener('click', () => sendSkinAction({ type: 'reset-defaults' }));

    const saveHint = document.createElement('span');
    saveHint.className = 'agzh-sp-sub';
    saveHint.textContent = '支持 PNG / JPG / WebP / BMP / AVIF';
    footer.appendChild(resetBtn);
    footer.appendChild(saveHint);

    panel.appendChild(header);
    panel.appendChild(body);
    panel.appendChild(footer);

    panel.__refs = {
      enableSwitch,
      enableSub,
      previewBox,
      fileNameEl,
      errorEl,
      clearBtn,
      modeSeg,
      scopeSeg,
      fitSeg,
      posSeg,
      opacityCtrl,
      scrimCtrl,
      surfaceCtrl,
      overlayCtrl,
      blurCtrl
    };

    document.body.appendChild(panel);
    panelEl = panel;
    syncPanelUI();
    return panel;
  }

  function updateSegmented(seg, value) {
    if (!seg) return;
    const btns = seg.querySelectorAll('button');
    for (let i = 0; i < btns.length; i++) {
      btns[i].dataset.active = btns[i].dataset.val === value ? '1' : '0';
    }
  }

  function updateSlider(ctrl, value, visible) {
    if (!ctrl) return;
    ctrl.item.style.display = visible ? 'flex' : 'none';
    ctrl.input.value = String(value);
    ctrl.valSpan.textContent = ctrl.formatter(value);
  }

  function syncPanelUI() {
    if (!panelEl || !panelEl.__refs) return;
    const r = panelEl.__refs;
    panelEl.setAttribute('data-theme', currentIsDark ? 'dark' : 'light');

    r.enableSwitch.setAttribute('aria-checked', skinConfig.enabled ? 'true' : 'false');
    r.enableSub.textContent = getStatusSummary();

    r.previewBox.textContent = '';
    if (skinImageDataUrl) {
      r.previewBox.classList.add('has-img');
      const img = document.createElement('img');
      img.src = skinImageDataUrl;
      img.alt = skinMeta.imageName || '皮肤预览';
      r.previewBox.appendChild(img);
    } else {
      r.previewBox.classList.remove('has-img');
      const empty = document.createElement('div');
      empty.className = 'agzh-sp-preview-empty';
      empty.textContent = '点击选择本地静态图片\n（PNG / JPG / WebP / BMP / AVIF）';
      empty.style.whiteSpace = 'pre-line';
      r.previewBox.appendChild(empty);
    }

    if (skinMeta.imageName) {
      r.fileNameEl.textContent = '当前图片：' + skinMeta.imageName;
      r.fileNameEl.title = skinConfig.imagePath || skinMeta.imageName;
      r.fileNameEl.style.display = 'block';
    } else {
      r.fileNameEl.style.display = 'none';
    }

    if (skinMeta.imageError) {
      r.errorEl.textContent = skinMeta.imageError;
      r.errorEl.style.display = 'block';
    } else {
      r.errorEl.style.display = 'none';
    }

    r.clearBtn.disabled = !skinConfig.imagePath && !skinImageDataUrl;

    updateSegmented(r.modeSeg, skinConfig.mode);
    updateSegmented(r.scopeSeg, skinConfig.scope);
    updateSegmented(r.fitSeg, skinConfig.fit);
    updateSegmented(r.posSeg, skinConfig.position);

    const isBlend = skinConfig.mode === 'blend';
    updateSlider(r.opacityCtrl, skinConfig.opacity, isBlend);
    updateSlider(r.scrimCtrl, skinConfig.scrimOpacity, isBlend);
    updateSlider(r.surfaceCtrl, skinConfig.surfaceOpacity, isBlend);
    updateSlider(r.overlayCtrl, skinConfig.overlayOpacity, !isBlend);
    updateSlider(r.blurCtrl, skinConfig.blur, true);
  }

  function openSkinPanel() {
    ensureStyles();
    const panel = buildPanel();
    panel.setAttribute('data-open', '1');
    if (panelPos) {
      panel.style.right = 'auto';
      panel.style.left = panelPos.left + 'px';
      panel.style.top = panelPos.top + 'px';
    }
    syncPanelUI();
  }

  function closeSkinPanel() {
    if (panelEl) {
      panelEl.removeAttribute('data-open');
    }
  }

  function toggleSkinPanel() {
    if (panelEl && panelEl.getAttribute('data-open') === '1') {
      closeSkinPanel();
    } else {
      openSkinPanel();
    }
  }

  // --- Settings -> Appearance Inline Entry Card ---
  function findAppearanceSettingsPane() {
    const dialogs = document.querySelectorAll('[role="dialog"], [aria-modal="true"], dialog');
    for (let i = 0; i < dialogs.length; i++) {
      const dlg = dialogs[i];
      if (dlg.id === PANEL_ID || dlg.closest('[data-agzh-skin-ui]')) continue;
      const text = (dlg.textContent || '').slice(0, 4000);
      const isSettingsDlg = (text.includes('设置') || text.includes('Settings')) &&
        (text.includes('外观') || text.includes('Appearance'));
      if (!isSettingsDlg) continue;

      // Verify the Appearance tab content is currently visible by checking headings or characteristic Appearance controls.
      const headings = dlg.querySelectorAll('h1, h2, h3, [role="heading"]');
      let appearanceHeading = null;
      for (let j = 0; j < headings.length; j++) {
        const ht = (headings[j].textContent || '').trim();
        if (ht === '外观' || ht === 'Appearance') {
          appearanceHeading = headings[j];
          break;
        }
      }

      const hasAppearanceControls =
        text.includes('对话布局') || text.includes('Chat Layout') ||
        text.includes('界面布局') || text.includes('Interface Layout') ||
        text.includes('无障碍') || text.includes('Accessibility') ||
        text.includes('屏幕阅读器') || text.includes('Screen reader') ||
        text.includes('主题') || text.includes('Theme');

      if (!appearanceHeading || !hasAppearanceControls) continue;

      // Find the scrollable content pane containing the Appearance heading.
      let pane = appearanceHeading.parentElement;
      while (pane && pane !== dlg) {
        const cs = getComputedStyle(pane);
        if (cs.overflowY === 'auto' || cs.overflowY === 'scroll' || pane.scrollHeight > pane.clientHeight + 20) {
          return pane;
        }
        if (pane.children.length >= 3 && pane.getBoundingClientRect().width >= 320) {
          return pane;
        }
        pane = pane.parentElement;
      }
      return appearanceHeading.parentElement;
    }
    return null;
  }

  function buildSettingsCard() {
    const card = document.createElement('div');
    card.id = SETTINGS_CARD_ID;
    card.setAttribute('data-agzh-skin-ui', 'settings-card');
    card.setAttribute('data-agzh-skip', '1');

    const top = document.createElement('div');
    top.className = 'agzh-sc-top';
    const info = document.createElement('div');
    info.className = 'agzh-sc-info';
    const title = document.createElement('div');
    title.className = 'agzh-sc-title';
    title.textContent = '自定义皮肤（静态图片）';
    const desc = document.createElement('div');
    desc.className = 'agzh-sc-desc';
    desc.textContent = '支持背景融合（毛玻璃）与轻量叠层模式，可切换全窗口或仅主内容区。';
    info.appendChild(title);
    info.appendChild(desc);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'agzh-sp-switch';
    toggle.setAttribute('role', 'switch');
    toggle.addEventListener('click', () => {
      if (!skinImageDataUrl && !skinConfig.enabled) {
        sendSkinAction({ type: 'pick-image' });
        return;
      }
      skinConfig.enabled = !skinConfig.enabled;
      applySkinVisuals({ forceRescan: skinConfig.enabled && skinConfig.mode === 'blend' });
      flushPersistNow({ enabled: skinConfig.enabled });
    });
    top.appendChild(info);
    top.appendChild(toggle);

    const bottom = document.createElement('div');
    bottom.className = 'agzh-sc-bottom';

    const thumb = document.createElement('div');
    thumb.className = 'agzh-sc-thumb';

    const meta = document.createElement('div');
    meta.className = 'agzh-sc-meta';
    const statusLine = document.createElement('div');
    statusLine.className = 'agzh-sp-label';
    const fileLine = document.createElement('div');
    fileLine.className = 'agzh-sp-filename';
    meta.appendChild(statusLine);
    meta.appendChild(fileLine);

    const btns = document.createElement('div');
    btns.className = 'agzh-sc-btns';

    const pickBtn = document.createElement('button');
    pickBtn.type = 'button';
    pickBtn.className = 'agzh-sp-btn';
    pickBtn.textContent = '选择图片';
    pickBtn.addEventListener('click', () => sendSkinAction({ type: 'pick-image' }));

    const detailBtn = document.createElement('button');
    detailBtn.type = 'button';
    detailBtn.className = 'agzh-sp-btn primary';
    detailBtn.textContent = '详细设置';
    detailBtn.addEventListener('click', () => {
      // Close Settings modal or keep floating panel cleanly above it for immediate live preview.
      openSkinPanel();
    });

    btns.appendChild(pickBtn);
    btns.appendChild(detailBtn);

    bottom.appendChild(thumb);
    bottom.appendChild(meta);
    bottom.appendChild(btns);

    card.appendChild(top);
    card.appendChild(bottom);

    card.__refs = { toggle, thumb, statusLine, fileLine };
    return card;
  }

  function syncSettingsCardUI() {
    const card = document.getElementById(SETTINGS_CARD_ID);
    if (!card || !card.__refs) return;
    const r = card.__refs;
    card.setAttribute('data-theme', currentIsDark ? 'dark' : 'light');
    r.toggle.setAttribute('aria-checked', skinConfig.enabled ? 'true' : 'false');
    r.statusLine.textContent = getStatusSummary();
    r.fileLine.textContent = skinMeta.imageError
      ? skinMeta.imageError
      : (skinMeta.imageName ? skinMeta.imageName : '支持 PNG / JPG / WebP / BMP / AVIF');

    r.thumb.textContent = '';
    if (skinImageDataUrl) {
      const img = document.createElement('img');
      img.src = skinImageDataUrl;
      img.alt = skinMeta.imageName || '预览';
      r.thumb.appendChild(img);
    } else {
      r.thumb.textContent = '无图片';
    }
  }

  function maybeInjectSettingsCard() {
    const pane = findAppearanceSettingsPane();
    if (!pane) return;
    const existing = document.getElementById(SETTINGS_CARD_ID);
    if (existing && existing.parentNode === pane) {
      syncSettingsCardUI();
      return;
    }
    if (existing) existing.remove();
    const card = buildSettingsCard();
    pane.appendChild(card);
    syncSettingsCardUI();
  }

  function scheduleSettingsCheck() {
    if (settingsCheckTimer) clearTimeout(settingsCheckTimer);
    settingsCheckTimer = setTimeout(() => {
      settingsCheckTimer = null;
      maybeInjectSettingsCard();
    }, 120);
  }

  // --- Main Process Bridge Callbacks ---
  window.__AGZH_OPEN_SKIN_PANEL__ = openSkinPanel;
  window.__AGZH_TOGGLE_SKIN_PANEL__ = toggleSkinPanel;
  window.__AGZH_SKIN_APPLY__ = function applyFromMain(payload) {
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
  };

  function startObservers() {
    // 1. Escape closes the floating panel if open.
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && panelEl && panelEl.getAttribute('data-open') === '1') {
        closeSkinPanel();
      }
    });

    // 2. Keep layer bounds synced on window resize.
    window.addEventListener('resize', () => {
      syncLayerBounds();
      if (isSkinActive() && skinConfig.mode === 'blend') {
        scheduleSurfaceScan(false);
      }
    });

    // 3. Watch root/body class & theme attribute changes for live Dark <-> Light switching.
    const checkThemeChange = () => {
      const html = document.documentElement;
      const body = document.body;
      const sig = [
        html ? html.className : '',
        html ? html.getAttribute('data-theme') : '',
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
      attributeFilter: ['class', 'data-theme', 'data-color-scheme', 'style']
    });
    if (document.body) {
      themeObs.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'data-theme', 'data-color-scheme']
      });
    }

    // 4. Lightweight DOM observer for Settings -> Appearance injection and new panels in blend mode.
    const domObs = new MutationObserver((mutations) => {
      let sawElementAdd = false;
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type !== 'childList' || m.addedNodes.length === 0) continue;
        const target = m.target;
        if (target && target.nodeType === 1 && target.closest && target.closest('[data-agzh-skin-ui]')) continue;
        for (let j = 0; j < m.addedNodes.length; j++) {
          const n = m.addedNodes[j];
          if (n && n.nodeType === 1 && !n.hasAttribute('data-agzh-skin-ui')) {
            sawElementAdd = true;
            break;
          }
        }
        if (sawElementAdd) break;
      }
      if (!sawElementAdd) return;
      scheduleSettingsCheck();
      if (isSkinActive()) {
        if (skinConfig.scope === 'main' && (!currentScopeEl || !currentScopeEl.isConnected || currentScopeEl === document.body)) {
          updateScopeBinding();
        }
        if (skinConfig.mode === 'blend') {
          scheduleSurfaceScan(false);
        }
      }
    });

    if (document.body) {
      domObs.observe(document.body, { childList: true, subtree: true });
    }
  }

  function boot() {
    if (!document.body) return;
    applySkinVisuals({ forceRescan: true });
    maybeInjectSettingsCard();
    startObservers();
    // Re-check main container / surfaces once initial SPA layout settles.
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
})(typeof globalThis !== 'undefined' ? globalThis : this);
