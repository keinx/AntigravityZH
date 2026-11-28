'use strict';

// AntigravityZH UI Tweaks Engine (Renderer)
// 1. Hides the Upgrade / Plan promotion banner inside the model selector dropdown (React-safe CSS hiding).
// 2. Relocates the "View Usage / 查看用量" button out of the model selector dropdown into the composer footer bar,
//    directly after the model selector button, while preserving full native usage popup / fallback behavior.

(function initRendererTweaks() {
  const UPGRADE_LABELS = new Set(['upgrade', '升级']);
  const VIEW_USAGE_LABELS = new Set(['view usage', '查看用量']);
  const MODEL_HEADER_LABELS = new Set(['model', 'models', '模型']);
  const SETTINGS_MODELS_TAB_LABELS = new Set(['models & usage', '模型与用量', 'models', '模型']);
  const MODEL_TOOLTIP_RE = /^(选择模型|select\s+model)(\s*([⌘⌃⌥⇧+/\-a-z0-9]|\s){1,16})?$/i;

  const PERMISSION_LABEL_RE = /^(turbo|极速|default|默认|auto|自动|review|request review|执行前请求确认|always proceed|始终自动执行|strict|严格模式|proceed in sandbox|在沙箱中自动执行|sandbox|沙箱)(\s|$)/i;
  const ENVIRONMENT_LABEL_RE = /^(this computer|本机电脑|local checkout|本地检出|remote|远程|configure branches|配置分支|worktree|local|本地)(\s|$)/i;
  const MODEL_NAME_RE = /\b(gemini|claude|gpt|orchestrator|opus|sonnet|haiku|flash|neon|carbon|argon|hydrogen|o[134](?:-mini|-pro)?|deepseek|qwen|llama|mistral|codex)\b/i;

  const USAGE_STRONG_SIGNALS = [
    /weekly\s+limit/i,
    /每周限额/,
    /每周剩余配额/,
    /\b5h\s+limit\b/i,
    /5\s*小时限额/,
    /5\s*小时剩余配额/,
    /five\s+hour\s+limit/i,
    /gemini\s+models/i,
    /gemini\s*模型/i,
    /claude\s+and\s+gpt\s+models/i,
    /claude\s*与\s*gpt\s*模型/i,
    /models\s+within\s+this\s+group/i,
    /此分组包含的模型/,
    /\d+\s*%\s*(left|剩余)/i,
    /resets?\s+in\s+\d+/i,
    /\d+\s*(天|小时|分钟|[dhm])\s*后?重置/i
  ];

  const SETTINGS_TAB_LABELS = new Set([
    'general', '常规',
    'application', '应用程序',
    'appearance', '外观',
    'shortcuts', '快捷键',
    'notifications', '系统通知', '通知',
    'models', '模型', 'models & usage', '模型与用量',
    'permissions', '权限管理', '权限',
    'browser', '浏览器',
    'account', '账号',
    'feedback', '反馈'
  ]);

  function normalizeText(str) {
    return typeof str === 'string' ? str.replace(/\s+/g, ' ').trim() : '';
  }

  function isUpgradeButtonLabel(text) {
    return UPGRADE_LABELS.has(normalizeText(text).toLowerCase());
  }

  function isViewUsageLabel(text) {
    return VIEW_USAGE_LABELS.has(normalizeText(text).toLowerCase());
  }

  function isModelMenuHeader(text) {
    return MODEL_HEADER_LABELS.has(normalizeText(text).toLowerCase());
  }

  function isModelTooltipText(text) {
    const clean = normalizeText(text);
    return Boolean(clean && clean.length <= 40 && MODEL_TOOLTIP_RE.test(clean));
  }

  function isSettingsModelsTabLabel(text) {
    return SETTINGS_MODELS_TAB_LABELS.has(normalizeText(text).toLowerCase());
  }

  function isPermissionButtonLabel(text) {
    const clean = normalizeText(text);
    return Boolean(clean && PERMISSION_LABEL_RE.test(clean));
  }

  function isEnvironmentButtonLabel(text) {
    const clean = normalizeText(text);
    return Boolean(clean && ENVIRONMENT_LABEL_RE.test(clean));
  }

  function looksLikeModelName(text) {
    const clean = normalizeText(text);
    return Boolean(clean && MODEL_NAME_RE.test(clean));
  }

  function countModelNameHits(text) {
    const clean = normalizeText(text);
    if (!clean) return 0;
    const matches = clean.match(/\b(gemini|claude|gpt|orchestrator|opus|sonnet|haiku|flash|neon|carbon|argon|hydrogen|deepseek|qwen|llama|mistral)\b/gi);
    if (!matches) return 0;
    const uniq = new Set(matches.map((m) => m.toLowerCase()));
    return uniq.size;
  }

  function isModelButtonCandidate(desc) {
    if (!desc || typeof desc !== 'object') return 0;
    const text = normalizeText(desc.text);
    const aria = normalizeText(desc.ariaLabel);
    const title = normalizeText(desc.title);
    const hint = (aria + ' ' + title).trim();

    if (isViewUsageLabel(text) || isUpgradeButtonLabel(text)) return 0;
    if (isPermissionButtonLabel(text) || isEnvironmentButtonLabel(text)) return 0;
    if (/^(add context|attach|添加上下文|附加文件|voice|mic|send|发送|停止|stop)/i.test(hint)) return 0;

    let score = 0;
    if (/\bmodel\b|模型/i.test(hint)) score += 100;
    if (looksLikeModelName(text)) score += 80;
    if (text.length >= 3 && text.length <= 48) {
      if (desc.hasDropdownHint) score += 25;
      if (desc.inLeftHalf) score += 20;
    }
    // Must have strong model evidence OR (left-half dropdown button with non-empty text)
    if (score >= 80) return score;
    if (text.length >= 3 && text.length <= 42 && desc.hasDropdownHint && desc.inLeftHalf) return score;
    return 0;
  }

  function looksLikeUpgradeRowText(text) {
    const clean = normalizeText(text);
    if (!clean || clean.length > 84) return false;
    if (!/\bupgrade\b|升级/i.test(clean)) return false;
    if (/view\s+usage|查看用量/i.test(clean)) return false;
    if (looksLikeModelName(clean)) return false;
    return true;
  }

  function looksLikeUsageContent(text) {
    const clean = normalizeText(text);
    if (!clean) return false;
    // If it still contains the "View Usage / 查看用量" trigger row together with multiple models,
    // it's the parent model menu rather than the usage panel itself.
    if (/view\s+usage|查看用量/i.test(clean) && countModelNameHits(clean) >= 2) {
      return false;
    }
    for (let i = 0; i < USAGE_STRONG_SIGNALS.length; i++) {
      if (USAGE_STRONG_SIGNALS[i].test(clean)) return true;
    }
    return false;
  }

  function looksLikeSettingsDialogText(text) {
    const clean = normalizeText(text).toLowerCase();
    if (!clean) return false;
    let hits = 0;
    const markers = [
      ['general', '常规'],
      ['appearance', '外观'],
      ['shortcuts', '快捷键'],
      ['browser', '浏览器'],
      ['permissions', '权限管理'],
      ['models & usage', '模型与用量'],
      ['account', '账号']
    ];
    for (let i = 0; i < markers.length; i++) {
      if (clean.includes(markers[i][0]) || clean.includes(markers[i][1])) {
        hits++;
      }
    }
    return hits >= 3;
  }

  function isHorizontalFlexRow(styleDesc) {
    if (!styleDesc || typeof styleDesc !== 'object') return false;
    const disp = String(styleDesc.display || '').toLowerCase();
    if (disp.includes('flex')) {
      const dir = String(styleDesc.flexDirection || 'row').toLowerCase();
      return dir === 'row' || dir === 'row-reverse';
    }
    if (disp.includes('grid')) {
      const flow = String(styleDesc.gridAutoFlow || '').toLowerCase();
      return flow.includes('column');
    }
    return false;
  }

  function computeUsagePopoverPosition(btnRect, cardRectAtZero, viewport) {
    const vw = (viewport && viewport.width) || 1280;
    const vh = (viewport && viewport.height) || 720;
    const margin = 12;
    const gap = 8;
    const originLeft = cardRectAtZero && Number.isFinite(cardRectAtZero.left) ? cardRectAtZero.left : 0;
    const originTop = cardRectAtZero && Number.isFinite(cardRectAtZero.top) ? cardRectAtZero.top : 0;
    const cardW = Math.max(180, (cardRectAtZero && cardRectAtZero.width) || 280);
    const cardH = Math.max(80, (cardRectAtZero && cardRectAtZero.height) || 220);

    const desiredLeft = Math.max(margin, Math.min(btnRect.left, vw - cardW - margin));
    const aboveTop = btnRect.top - cardH - gap;
    const belowTop = btnRect.bottom + gap;
    let desiredTop;
    if (aboveTop >= margin) {
      desiredTop = aboveTop;
    } else if (belowTop + cardH <= vh - margin) {
      desiredTop = belowTop;
    } else {
      desiredTop = Math.max(margin, Math.min(aboveTop, vh - cardH - margin));
    }

    const cssLeft = Math.round(desiredLeft - originLeft);
    const cssTop = Math.round(desiredTop - originTop);
    const maxHeight = Math.max(160, Math.round(Math.max(btnRect.top - margin - gap, vh - margin * 2)));
    return { left: cssLeft, top: cssTop, desiredLeft: Math.round(desiredLeft), desiredTop: Math.round(desiredTop), maxHeight };
  }

  function getUsageLabel(zhEnabled) {
    return zhEnabled ? '查看用量' : 'View Usage';
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      normalizeText,
      isUpgradeButtonLabel,
      isViewUsageLabel,
      isModelMenuHeader,
      isModelTooltipText,
      isSettingsModelsTabLabel,
      isPermissionButtonLabel,
      isEnvironmentButtonLabel,
      looksLikeModelName,
      countModelNameHits,
      isModelButtonCandidate,
      looksLikeUpgradeRowText,
      looksLikeUsageContent,
      looksLikeSettingsDialogText,
      isHorizontalFlexRow,
      computeUsagePopoverPosition,
      getUsageLabel
    };
    return;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__AGL_TWEAKS_INSTALLED__) return;

  const isLocalHub = (location.protocol === 'https:' || location.protocol === 'http:') &&
    (location.hostname === '127.0.0.1' || location.hostname === 'localhost');
  if (!isLocalHub) return;

  window.__AGL_TWEAKS_INSTALLED__ = true;

  const STYLE_ID = 'aglaunch-tweaks-style';
  const USAGE_BTN_ATTR = 'data-aglaunch-usage-btn';
  const HIDE_UPGRADE_ATTR = 'data-aglaunch-hide-upgrade';
  const MENU_USAGE_ITEM_ATTR = 'data-aglaunch-menu-usage-item';
  const MENU_USAGE_SEP_ATTR = 'data-aglaunch-menu-usage-sep';
  const MENU_USAGE_FOOTER_ATTR = 'data-aglaunch-menu-usage-footer';
  const USAGE_PARENT_MENU_ATTR = 'data-aglaunch-usage-parent-menu';
  const USAGE_SUBMENU_ATTR = 'data-aglaunch-usage-submenu';
  const USAGE_REPOS_ATTR = 'data-aglaunch-usage-repositioned';
  const SUPPRESS_TOOLTIP_ATTR = 'data-aglaunch-suppress-model-tooltip';
  const HTML_OPENING_ATTR = 'data-aglaunch-usage-opening';
  const HTML_ACTIVE_ATTR = 'data-aglaunch-usage-active';
  const HTML_SUPPRESS_TOOLTIP_ATTR = 'data-aglaunch-usage-suppress-tooltip';

  const usageBtnToModelBtn = new WeakMap();
  const activeUsageButtons = new Set();

  let scanTimer = null;
  let proxySession = null; // { id, usageBtn, modelBtn, parentMenu, parentPopper, submenuEl, submenuPopper, isInPlace, timers: [], resizeObs }
  let proxySessionSeq = 0;
  let suppressNextUsageClick = false;
  let suppressedModelBtn = null;
  let suppressTooltipTimer = null;

  function isZh() {
    if (window.__AGL_I18N__ && typeof window.__AGL_I18N__.getConfig === 'function') {
      return Boolean(window.__AGL_I18N__.getConfig().enabled);
    }
    return true;
  }

  function detectDarkMode() {
    const html = document.documentElement;
    const presetPol = html && html.getAttribute('data-aglaunch-theme-polarity');
    if (presetPol === 'light') return false;
    if (presetPol === 'dark') return true;
    if (window.__AGL_SKIN__ && typeof window.__AGL_SKIN__.getState === 'function') {
      return Boolean(window.__AGL_SKIN__.getState().isDark);
    }
    const cls = ((html && html.className) || '') + ' ' + ((document.body && document.body.className) || '');
    const dataTheme = (
      (html && (html.getAttribute('data-theme') || html.getAttribute('data-color-scheme'))) ||
      (document.body && (document.body.getAttribute('data-theme') || document.body.getAttribute('data-color-scheme'))) ||
      ''
    ).toLowerCase();
    if (dataTheme.includes('light')) return false;
    if (dataTheme.includes('dark')) return true;
    if (/\blight\b|\btheme-light\b/i.test(cls) && !/\bdark\b/i.test(cls)) return false;
    if (/\bdark\b|\btheme-dark\b/i.test(cls)) return true;
    return window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.setAttribute('data-aglaunch-skip', '1');
    style.textContent = `
      /* 1. Always hide the Upgrade row inside the model selector dropdown (React-safe) */
      [${HIDE_UPGRADE_ATTR}="1"] {
        display: none !important;
      }

      /* 2. Hide the in-menu View Usage row + divider + footer when browsing models normally,
            but keep them laid out while our Usage shortcut is opening/showing the native Usage panel */
      html:not([${HTML_OPENING_ATTR}="1"]):not([${HTML_ACTIVE_ATTR}="1"]) [${MENU_USAGE_ITEM_ATTR}="1"],
      html:not([${HTML_OPENING_ATTR}="1"]):not([${HTML_ACTIVE_ATTR}="1"]) [${MENU_USAGE_SEP_ATTR}="1"],
      html:not([${HTML_OPENING_ATTR}="1"]):not([${HTML_ACTIVE_ATTR}="1"]) [${MENU_USAGE_FOOTER_ATTR}="1"] {
        display: none !important;
      }

      /* 3. Zero-flash hiding of the parent model menu while proxying directly to the Usage panel */
      html[${HTML_OPENING_ATTR}="1"] [role="menu"]:not([${USAGE_SUBMENU_ATTR}="1"]),
      html[${HTML_OPENING_ATTR}="1"] [role="listbox"]:not([${USAGE_SUBMENU_ATTR}="1"]),
      html[${HTML_OPENING_ATTR}="1"] [data-radix-popper-content-wrapper]:not([${USAGE_SUBMENU_ATTR}="1"]) {
        visibility: hidden !important;
        pointer-events: none !important;
      }

      /* 3b. Suppress native "选择模型 / Select Model" tooltip triggered by programmatic focus on modelBtn */
      html[${HTML_SUPPRESS_TOOLTIP_ATTR}="1"] [role="tooltip"],
      html[${HTML_SUPPRESS_TOOLTIP_ATTR}="1"] [data-radix-tooltip-content],
      html[${HTML_SUPPRESS_TOOLTIP_ATTR}="1"] [${SUPPRESS_TOOLTIP_ATTR}="1"] {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }

      [${USAGE_PARENT_MENU_ATTR}="1"] {
        visibility: hidden !important;
        pointer-events: none !important;
      }

      [${USAGE_SUBMENU_ATTR}="1"] {
        visibility: visible !important;
        pointer-events: auto !important;
      }

      [${USAGE_REPOS_ATTR}="1"] {
        position: fixed !important;
        left: var(--agl-usage-left, 16px) !important;
        top: var(--agl-usage-top, 16px) !important;
        right: auto !important;
        bottom: auto !important;
        margin: 0 !important;
        transform: none !important;
        transition: none !important;
        max-height: var(--agl-usage-max-h, 70vh) !important;
      }

      /* 4. Native-styled View Usage button in composer bottom toolbar */
      [${USAGE_BTN_ATTR}="1"] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        height: 28px;
        padding: 0 8px;
        margin: 0;
        border: none;
        border-radius: 7px;
        background: transparent;
        color: var(--aglt-muted, var(--agl-usage-fg, inherit));
        font-size: var(--agl-usage-fs, 13px);
        font-weight: var(--agl-usage-fw, 400);
        line-height: 1.25;
        font-family: inherit;
        white-space: nowrap;
        flex-shrink: 0;
        cursor: pointer;
        user-select: none;
        -webkit-user-select: none;
        opacity: 0.86;
        transition: background-color 140ms ease, color 140ms ease, opacity 140ms ease;
      }

      [${USAGE_BTN_ATTR}="1"]:hover {
        background-color: var(--aglt-hover-bg, var(--agl-usage-hover-bg, rgba(255, 255, 255, 0.08)));
        color: var(--aglt-fg, var(--agl-usage-fg-hover, inherit));
        opacity: 1;
      }

      [${USAGE_BTN_ATTR}="1"][data-active="1"] {
        background-color: var(--aglt-accent-soft, var(--agl-usage-active-bg, rgba(255, 255, 255, 0.12)));
        color: var(--aglt-fg, var(--agl-usage-fg-hover, inherit));
        opacity: 1;
      }

      [${USAGE_BTN_ATTR}="1"]:focus-visible {
        outline: 1.5px solid var(--aglt-accent, rgba(91, 141, 239, 0.7));
        outline-offset: 1px;
      }

      [${USAGE_BTN_ATTR}="1"] svg {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        display: block;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function isElementVisible(el) {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity || '1') > 0.02;
  }

  function isElementLaidOut(el) {
    if (!el || !el.isConnected) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none';
  }

  function isInsideSettingsDialog(el) {
    if (!el || !el.closest) return false;
    const dlg = el.closest('[role="dialog"], [aria-modal="true"], dialog');
    if (!dlg) return false;
    return looksLikeSettingsDialogText(dlg.textContent || '');
  }

  function isSeparatorElement(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === 'HR' || el.getAttribute('role') === 'separator') return true;
    const txt = normalizeText(el.textContent);
    if (txt) return false;
    if (el.querySelector && el.querySelector('svg, img, button, input')) return false;
    const r = el.getBoundingClientRect();
    return r.height > 0 && r.height <= 5 && r.width >= 60;
  }

  function findModelMenuRootFromNode(startNode) {
    let cur = startNode && startNode.parentElement;
    let best = null;
    for (let depth = 0; depth < 8 && cur && cur !== document.body && cur !== document.documentElement; depth++) {
      if (cur.tagName === 'MAIN' || cur.getAttribute('role') === 'main') break;
      if (cur.querySelector && cur.querySelector('textarea, [contenteditable="true"]')) break;
      if (cur.matches && cur.matches('[role="dialog"], [aria-modal="true"], dialog') && looksLikeSettingsDialogText(cur.textContent || '')) {
        return null;
      }

      const r = cur.getBoundingClientRect();
      if (r.width >= 150 && r.width <= 640 && r.height >= 64 && r.height <= 880) {
        const txt = normalizeText(cur.textContent);
        const hasUsage = /view\s+usage|查看用量/i.test(txt);
        const modelHits = countModelNameHits(txt);
        const isSemanticPopup = cur.matches && cur.matches(
          '[role="menu"], [role="listbox"], [data-radix-menu-content], [data-radix-popper-content-wrapper], [data-state="open"]'
        );
        const cs = getComputedStyle(cur);
        const isFloating = isSemanticPopup || cs.position === 'fixed' || cs.position === 'absolute';

        if (modelHits >= 2 || (hasUsage && modelHits >= 1) || (hasUsage && isFloating)) {
          best = cur;
          if (cur.matches && cur.matches('[role="menu"], [role="listbox"], [data-radix-menu-content]')) {
            return cur;
          }
        }
      }
      cur = cur.parentElement;
    }
    return best;
  }

  function findUsageItemInMenu(menuRoot) {
    if (!menuRoot) return null;
    const candidates = menuRoot.querySelectorAll('button, a, [role="menuitem"], [role="menuitemradio"], [role="option"], [role="button"], li, div');
    let fallback = null;
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (el === menuRoot) continue;
      if (el.closest && el.closest('[data-aglaunch-ui]')) continue;
      if (!isViewUsageLabel(el.textContent)) continue;

      // Prefer the interactive row element enclosing the label (and its gauge icon / chevron)
      const interactive = el.closest('[role="menuitem"], [role="menuitemradio"], [role="option"], button, a, [role="button"]');
      if (interactive && menuRoot.contains(interactive) && interactive !== menuRoot && isViewUsageLabel(interactive.textContent)) {
        return interactive;
      }

      // Walk up slightly to include the gauge SVG / chevron row wrapper without crossing into sibling items
      let row = el;
      for (let d = 0; d < 3 && row.parentElement && row.parentElement !== menuRoot; d++) {
        if (isViewUsageLabel(row.parentElement.textContent)) {
          row = row.parentElement;
        } else {
          break;
        }
      }
      if (!fallback || row.getBoundingClientRect().width > fallback.getBoundingClientRect().width) {
        fallback = row;
      }
    }
    return fallback;
  }

  function findUpgradeRowInMenu(menuRoot, usageItem) {
    if (!menuRoot) return null;
    const btns = menuRoot.querySelectorAll('button, a, [role="button"], [role="menuitem"], [role="option"], span, div');
    let upgradeTrigger = null;
    for (let i = 0; i < btns.length; i++) {
      const el = btns[i];
      if (el === menuRoot) continue;
      if (el.closest && el.closest('[data-aglaunch-ui]')) continue;
      if (!isUpgradeButtonLabel(el.textContent)) continue;
      if (el.matches && el.matches('button, a, [role="button"], [role="menuitem"], [role="option"]')) {
        upgradeTrigger = el;
        break;
      }
      if (!upgradeTrigger) upgradeTrigger = el;
    }
    if (!upgradeTrigger) return null;

    let row = upgradeTrigger;
    while (row.parentElement && row.parentElement !== menuRoot) {
      const parent = row.parentElement;
      if (usageItem && (parent === usageItem || parent.contains(usageItem))) break;
      const pText = normalizeText(parent.textContent);
      if (!looksLikeUpgradeRowText(pText)) break;
      const pr = parent.getBoundingClientRect();
      if (pr.height > 110) break;
      row = parent;
    }
    return row;
  }

  function annotateModelMenu(menuRoot) {
    if (!menuRoot || !menuRoot.isConnected) return null;
    const usageItem = findUsageItemInMenu(menuRoot);
    const upgradeRow = findUpgradeRowInMenu(menuRoot, usageItem);

    if (upgradeRow && upgradeRow !== menuRoot) {
      upgradeRow.setAttribute(HIDE_UPGRADE_ATTR, '1');
    }

    if (usageItem && usageItem !== menuRoot) {
      usageItem.setAttribute(MENU_USAGE_ITEM_ATTR, '1');

      const prevSib = usageItem.previousElementSibling;
      if (prevSib && isSeparatorElement(prevSib)) {
        prevSib.setAttribute(MENU_USAGE_SEP_ATTR, '1');
      }

      // Check if usageItem (and upgradeRow) sit inside a dedicated footer wrapper inside menuRoot
      const parent = usageItem.parentElement;
      if (parent && parent !== menuRoot) {
        let onlyUsageOrUpgrade = true;
        const kids = parent.children;
        for (let i = 0; i < kids.length; i++) {
          const ch = kids[i];
          if (ch === usageItem || ch === upgradeRow || isSeparatorElement(ch)) continue;
          if (upgradeRow && ch.contains(upgradeRow)) continue;
          if (usageItem && ch.contains(usageItem)) continue;
          onlyUsageOrUpgrade = false;
          break;
        }
        if (onlyUsageOrUpgrade) {
          parent.setAttribute(MENU_USAGE_FOOTER_ATTR, '1');
          const footerPrev = parent.previousElementSibling;
          if (footerPrev && isSeparatorElement(footerPrev)) {
            footerPrev.setAttribute(MENU_USAGE_SEP_ATTR, '1');
          }
        }
      }
    }

    return { menuRoot, usageItem, upgradeRow };
  }

  function scanOpenModelMenus() {
    const foundMenus = new Set();
    const triggers = document.querySelectorAll('button, a, [role="menuitem"], [role="menuitemradio"], [role="option"], [role="button"]');
    for (let i = 0; i < triggers.length; i++) {
      const el = triggers[i];
      if (el.closest && el.closest('[data-aglaunch-ui]')) continue;
      if (el.closest && el.closest('[data-message-id], .chat-message')) continue;
      const txt = normalizeText(el.textContent);
      if (!isUpgradeButtonLabel(txt) && !isViewUsageLabel(txt)) continue;
      if (isInsideSettingsDialog(el)) continue;

      const menuRoot = findModelMenuRootFromNode(el);
      if (!menuRoot || foundMenus.has(menuRoot)) continue;
      foundMenus.add(menuRoot);
      annotateModelMenu(menuRoot);
    }

    // Fallback scan for custom menus where "View Usage" / "Upgrade" is inside a plain div
    if (foundMenus.size === 0) {
      const popups = document.querySelectorAll('[role="menu"], [role="listbox"], [data-radix-popper-content-wrapper], [data-radix-menu-content]');
      for (let i = 0; i < popups.length; i++) {
        const pop = popups[i];
        if (pop.closest && pop.closest('[data-aglaunch-ui]')) continue;
        const txt = normalizeText(pop.textContent);
        if ((/view\s+usage|查看用量/i.test(txt) || /\bupgrade\b|升级/i.test(txt)) && countModelNameHits(txt) >= 1) {
          if (!foundMenus.has(pop)) {
            foundMenus.add(pop);
            annotateModelMenu(pop);
          }
        }
      }
    }

    return Array.from(foundMenus);
  }

  // --- Composer Model Selector Detection & View Usage Button Injection ---

  function createGaugeSvg() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.85');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');

    const needle = document.createElementNS(ns, 'path');
    needle.setAttribute('d', 'm12 14 4-4');
    const arc = document.createElementNS(ns, 'path');
    arc.setAttribute('d', 'M3.34 19a10 10 0 1 1 17.32 0');

    svg.appendChild(needle);
    svg.appendChild(arc);
    return svg;
  }

  function syncButtonVisualTokens(usageBtn, modelBtn) {
    if (!usageBtn || !usageBtn.isConnected) return;
    const isDark = detectDarkMode();
    usageBtn.style.setProperty('--agl-usage-hover-bg', isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.06)');
    usageBtn.style.setProperty('--agl-usage-active-bg', isDark ? 'rgba(255, 255, 255, 0.13)' : 'rgba(15, 23, 42, 0.1)');

    if (modelBtn && modelBtn.isConnected) {
      try {
        const cs = getComputedStyle(modelBtn);
        if (cs.color) {
          usageBtn.style.setProperty('--agl-usage-fg', cs.color);
          usageBtn.style.setProperty('--agl-usage-fg-hover', cs.color);
        }
        if (cs.fontSize) usageBtn.style.setProperty('--agl-usage-fs', cs.fontSize);
        if (cs.fontWeight) usageBtn.style.setProperty('--agl-usage-fw', cs.fontWeight);
        const mr = modelBtn.getBoundingClientRect();
        if (mr.height >= 22 && mr.height <= 36) {
          usageBtn.style.height = Math.round(mr.height) + 'px';
        }
      } catch (_) {}
    }

    const label = getUsageLabel(isZh());
    if (usageBtn.__labelSpan) {
      usageBtn.__labelSpan.textContent = label;
    }
    usageBtn.setAttribute('aria-label', label);
    usageBtn.setAttribute('title', label);
  }

  function findComposerContainer(inputEl) {
    const vw = window.innerWidth || 1280;
    const inputRect = inputEl.getBoundingClientRect();
    let cur = inputEl.parentElement;
    let best = null;
    for (let depth = 0; depth < 7 && cur && cur !== document.body && cur !== document.documentElement; depth++) {
      if (cur.tagName === 'MAIN' || cur.getAttribute('role') === 'main') break;
      const r = cur.getBoundingClientRect();
      const maxH = Math.max(640, (window.innerHeight || 720) * 0.85);
      if (r.width >= 260 && r.width <= vw * 0.96 && r.height >= 54 && r.height <= maxH) {
        const btns = cur.querySelectorAll('button, [role="button"]');
        let bottomBtnCount = 0;
        for (let i = 0; i < btns.length; i++) {
          const b = btns[i];
          if (b.closest && b.closest('[data-aglaunch-ui]')) continue;
          const br = b.getBoundingClientRect();
          if (br.width >= 16 && br.height >= 18 && br.height <= 48 && br.top >= inputRect.bottom - 14) {
            bottomBtnCount++;
          }
        }
        if (bottomBtnCount >= 2) {
          best = cur;
          break;
        }
      }
      cur = cur.parentElement;
    }
    return best;
  }

  function findModelSelectorInComposer(composerEl, inputEl) {
    if (!composerEl) return null;
    const cRect = composerEl.getBoundingClientRect();
    const inputRect = inputEl ? inputEl.getBoundingClientRect() : null;
    const minTop = inputRect ? inputRect.bottom - 14 : cRect.top + cRect.height * 0.45;
    const midX = cRect.left + cRect.width * 0.58;

    const btns = composerEl.querySelectorAll('button, [role="button"]');
    let bestBtn = null;
    let bestScore = 0;

    for (let i = 0; i < btns.length; i++) {
      const btn = btns[i];
      if (btn.closest && btn.closest('[data-aglaunch-ui]')) continue;
      if (!isElementVisible(btn)) continue;
      const br = btn.getBoundingClientRect();
      if (br.height < 18 || br.height > 46 || br.width < 28) continue;
      if (br.top < minTop) continue;

      const text = normalizeText(btn.textContent);
      const ariaLabel = btn.getAttribute('aria-label') || '';
      const title = btn.getAttribute('title') || '';
      const hasPopupAttr = btn.hasAttribute('aria-haspopup') || btn.hasAttribute('aria-expanded');
      const hasChevron = Boolean(btn.querySelector('svg'));
      const score = isModelButtonCandidate({
        text,
        ariaLabel,
        title,
        hasDropdownHint: hasPopupAttr || hasChevron,
        inLeftHalf: br.left < midX
      });
      if (score > bestScore) {
        bestScore = score;
        bestBtn = btn;
      }
    }

    return bestBtn;
  }

  function resolveToolbarAnchor(modelBtn, composerEl) {
    let anchor = modelBtn;
    let spaceBetweenFallback = null;

    for (let depth = 0; depth < 5 && anchor.parentElement && anchor.parentElement !== composerEl; depth++) {
      const parent = anchor.parentElement;
      const pCs = getComputedStyle(parent);
      if (isHorizontalFlexRow(pCs)) {
        const justify = (pCs.justifyContent || '').toLowerCase();
        const isDistributed = justify === 'space-between' || justify === 'space-around' || justify === 'space-evenly';
        if (!isDistributed) {
          return { host: parent, anchor };
        }
        if (!spaceBetweenFallback) {
          spaceBetweenFallback = { host: parent, anchor };
        }
        break;
      }
      // Parent is block / flex-column / wrapper: inserting inside it would wrap below modelBtn.
      // Walk up until we reach the horizontal flex toolbar row containing modelBtn.
      anchor = parent;
    }

    if (spaceBetweenFallback) return spaceBetweenFallback;
    if (anchor.parentElement && isHorizontalFlexRow(getComputedStyle(anchor.parentElement))) {
      return { host: anchor.parentElement, anchor };
    }
    return modelBtn.parentElement ? { host: modelBtn.parentElement, anchor: modelBtn } : null;
  }

  function buildUsageShortcutButton(modelBtn) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute(USAGE_BTN_ATTR, '1');
    btn.setAttribute('data-aglaunch-ui', 'usage-shortcut');
    btn.setAttribute('data-aglaunch-skip', '1');
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');

    const icon = createGaugeSvg();
    const span = document.createElement('span');
    btn.__labelSpan = span;

    btn.appendChild(icon);
    btn.appendChild(span);

    usageBtnToModelBtn.set(btn, modelBtn);
    activeUsageButtons.add(btn);
    syncButtonVisualTokens(btn, modelBtn);

    btn.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      if (isUsageProxyOpenFor(btn)) {
        suppressNextUsageClick = true;
        setTimeout(() => { suppressNextUsageClick = false; }, 400);
      }
    });

    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (suppressNextUsageClick) {
        suppressNextUsageClick = false;
        closeActiveUsageProxy(true);
        return;
      }
      if (isUsageProxyOpenFor(btn)) {
        closeActiveUsageProxy(true);
        return;
      }
      const boundModelBtn = usageBtnToModelBtn.get(btn);
      openUsageFromShortcut(btn, boundModelBtn);
    });

    return btn;
  }

  function syncComposerUsageButtons() {
    // Prune disconnected or stale injected buttons
    for (const btn of Array.from(activeUsageButtons)) {
      const boundModel = usageBtnToModelBtn.get(btn);
      if (!btn.isConnected || !boundModel || !boundModel.isConnected) {
        if (btn.isConnected && btn.parentNode) {
          btn.parentNode.removeChild(btn);
        }
        activeUsageButtons.delete(btn);
      }
    }

    const inputs = document.querySelectorAll('textarea, [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]');
    const handledComposers = new Set();

    for (let i = 0; i < inputs.length; i++) {
      const inputEl = inputs[i];
      if (!isElementVisible(inputEl)) continue;
      if (inputEl.closest && inputEl.closest('[role="dialog"], [aria-modal="true"], [data-aglaunch-ui], .monaco-editor, .xterm')) {
        continue;
      }

      const composerEl = findComposerContainer(inputEl);
      if (!composerEl || handledComposers.has(composerEl)) continue;
      handledComposers.add(composerEl);

      const modelBtn = findModelSelectorInComposer(composerEl, inputEl);
      if (!modelBtn) continue;

      const placement = resolveToolbarAnchor(modelBtn, composerEl);
      if (!placement) continue;

      const { host, anchor } = placement;
      let existing = host.querySelector(`:scope > [${USAGE_BTN_ATTR}="1"]`);
      if (!existing) {
        // Also check if another usage button exists elsewhere in this composer and move/reuse it
        const inComposer = composerEl.querySelector(`[${USAGE_BTN_ATTR}="1"]`);
        if (inComposer) {
          existing = inComposer;
        }
      }

      if (existing) {
        usageBtnToModelBtn.set(existing, modelBtn);
        activeUsageButtons.add(existing);
        if (existing.parentNode !== host || existing.previousSibling !== anchor) {
          host.insertBefore(existing, anchor.nextSibling);
        }
        syncButtonVisualTokens(existing, modelBtn);
      } else {
        const usageBtn = buildUsageShortcutButton(modelBtn);
        host.insertBefore(usageBtn, anchor.nextSibling);
      }
    }
  }

  // --- Usage Trigger Proxy Logic ---

  function triggerNativeClick(el) {
    if (!el || !el.isConnected) return;
    const r = el.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2);
    const cy = Math.round(r.top + r.height / 2);
    const ptrOpts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: cx,
      clientY: cy,
      button: 0,
      buttons: 1,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true
    };
    const mouseOpts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: cx,
      clientY: cy,
      button: 0,
      buttons: 1
    };
    try { el.dispatchEvent(new PointerEvent('pointerdown', ptrOpts)); } catch (_) {}
    try { el.dispatchEvent(new MouseEvent('mousedown', mouseOpts)); } catch (_) {}
    try { el.dispatchEvent(new PointerEvent('pointerup', Object.assign({}, ptrOpts, { buttons: 0 }))); } catch (_) {}
    try { el.dispatchEvent(new MouseEvent('mouseup', Object.assign({}, mouseOpts, { buttons: 0 }))); } catch (_) {}
    try { el.click(); } catch (_) {}
  }

  function triggerNativeHover(el) {
    if (!el || !el.isConnected) return;
    const r = el.getBoundingClientRect();
    const cx = Math.round(r.left + r.width / 2);
    const cy = Math.round(r.top + r.height / 2);
    const ptrOpts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: cx,
      clientY: cy,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true
    };
    const mouseOpts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      clientX: cx,
      clientY: cy
    };
    try { el.focus && el.focus({ preventScroll: true }); } catch (_) {}
    try { el.dispatchEvent(new PointerEvent('pointerover', ptrOpts)); } catch (_) {}
    try { el.dispatchEvent(new PointerEvent('pointerenter', Object.assign({}, ptrOpts, { bubbles: false }))); } catch (_) {}
    try { el.dispatchEvent(new MouseEvent('mouseover', mouseOpts)); } catch (_) {}
    try { el.dispatchEvent(new MouseEvent('mouseenter', Object.assign({}, mouseOpts, { bubbles: false }))); } catch (_) {}
    try { el.dispatchEvent(new PointerEvent('pointermove', ptrOpts)); } catch (_) {}
    try { el.dispatchEvent(new MouseEvent('mousemove', mouseOpts)); } catch (_) {}
  }

  function dispatchEscape() {
    const opts = { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true };
    try {
      (document.activeElement || document).dispatchEvent(new KeyboardEvent('keydown', opts));
      document.dispatchEvent(new KeyboardEvent('keydown', opts));
      window.dispatchEvent(new KeyboardEvent('keydown', opts));
    } catch (_) {}
  }

  function getPopperWrapper(el, forbiddenParentMenu, forbiddenParentPopper) {
    if (!el || !el.closest) return el;
    const wrapper = el.closest('[data-radix-popper-content-wrapper]');
    if (!wrapper) return el;
    if (forbiddenParentPopper && wrapper === forbiddenParentPopper) return el;
    if (forbiddenParentMenu && (wrapper === forbiddenParentMenu || wrapper.contains(forbiddenParentMenu))) return el;
    return wrapper;
  }

  function applySubmenuPosition(usageBtn, popperEl, cardEl) {
    if (!usageBtn || !usageBtn.isConnected || !popperEl || !popperEl.isConnected) return;
    const btnRect = usageBtn.getBoundingClientRect();
    const targetCard = (cardEl && cardEl.isConnected) ? cardEl : popperEl;

    // Measure actual viewport origin of targetCard when popperEl is at CSS (0, 0).
    // This compensates automatically for any ancestor transform / backdrop-filter containing block
    // as well as any inner offset between popperEl and targetCard.
    popperEl.setAttribute(USAGE_REPOS_ATTR, '1');
    popperEl.style.setProperty('--agl-usage-left', '0px');
    popperEl.style.setProperty('--agl-usage-top', '0px');

    const cardRectAtZero = targetCard.getBoundingClientRect();
    const pos = computeUsagePopoverPosition(btnRect, cardRectAtZero, {
      width: window.innerWidth || 1280,
      height: window.innerHeight || 720
    });
    popperEl.style.setProperty('--agl-usage-left', pos.left + 'px');
    popperEl.style.setProperty('--agl-usage-top', pos.top + 'px');
    popperEl.style.setProperty('--agl-usage-max-h', pos.maxHeight + 'px');
  }

  function isUsageProxyOpenFor(usageBtn) {
    if (!proxySession) return false;
    if (usageBtn && proxySession.usageBtn !== usageBtn) return false;
    if (proxySession.submenuEl && proxySession.submenuEl.isConnected && isElementLaidOut(proxySession.submenuEl)) {
      return true;
    }
    return document.documentElement.getAttribute(HTML_OPENING_ATTR) === '1';
  }

  function clearProxyAttributes(sess) {
    document.documentElement.removeAttribute(HTML_OPENING_ATTR);
    document.documentElement.removeAttribute(HTML_ACTIVE_ATTR);

    const clearAttr = (attr) => {
      const nodes = document.querySelectorAll(`[${attr}]`);
      for (let i = 0; i < nodes.length; i++) {
        nodes[i].removeAttribute(attr);
      }
    };
    clearAttr(USAGE_PARENT_MENU_ATTR);
    clearAttr(USAGE_SUBMENU_ATTR);
    clearAttr(USAGE_REPOS_ATTR);

    if (sess && sess.usageBtn && sess.usageBtn.isConnected) {
      sess.usageBtn.removeAttribute('data-active');
      sess.usageBtn.setAttribute('aria-expanded', 'false');
    }
  }

  function clearModelTooltipSuppression() {
    if (suppressTooltipTimer) {
      clearTimeout(suppressTooltipTimer);
      suppressTooltipTimer = null;
    }
    suppressedModelBtn = null;
    document.documentElement.removeAttribute(HTML_SUPPRESS_TOOLTIP_ATTR);
    const tagged = document.querySelectorAll(`[${SUPPRESS_TOOLTIP_ATTR}]`);
    for (let i = 0; i < tagged.length; i++) {
      tagged[i].removeAttribute(SUPPRESS_TOOLTIP_ATTR);
    }
  }

  function hideStrayModelTooltips() {
    if (document.documentElement.getAttribute(HTML_SUPPRESS_TOOLTIP_ATTR) !== '1') return;
    const candidates = document.querySelectorAll('[role="tooltip"], [data-radix-tooltip-content], [data-radix-popper-content-wrapper], [data-state="delayed-open"], [data-state="instant-open"], [data-state="open"]');
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (el.closest && el.closest('[data-aglaunch-ui]')) continue;
      if (el.hasAttribute(USAGE_SUBMENU_ATTR) || el.hasAttribute(USAGE_PARENT_MENU_ATTR)) continue;
      if (isModelTooltipText(el.textContent)) {
        el.setAttribute(SUPPRESS_TOOLTIP_ATTR, '1');
      }
    }
  }

  function beginModelTooltipSuppression(modelBtn) {
    if (suppressTooltipTimer) {
      clearTimeout(suppressTooltipTimer);
      suppressTooltipTimer = null;
    }
    suppressedModelBtn = modelBtn || null;
    document.documentElement.setAttribute(HTML_SUPPRESS_TOOLTIP_ATTR, '1');
    hideStrayModelTooltips();
  }

  function scheduleClearModelTooltipSuppression(delayMs) {
    if (suppressTooltipTimer) clearTimeout(suppressTooltipTimer);
    suppressTooltipTimer = setTimeout(() => {
      suppressTooltipTimer = null;
      if (!proxySession) {
        clearModelTooltipSuppression();
      }
    }, typeof delayMs === 'number' ? delayMs : 550);
  }

  function blurSuppressedModelBtn(modelBtn) {
    const target = modelBtn || suppressedModelBtn;
    if (!target || !target.isConnected) return;
    try {
      if (document.activeElement === target || target.contains(document.activeElement)) {
        target.blur();
      }
      target.dispatchEvent(new PointerEvent('pointerleave', { bubbles: false, pointerType: 'mouse' }));
      target.dispatchEvent(new MouseEvent('mouseleave', { bubbles: false }));
    } catch (_) {}
  }

  function closeActiveUsageProxy(sendEsc) {
    const sess = proxySession;
    const closingModelBtn = (sess && sess.modelBtn) || suppressedModelBtn;
    proxySession = null;
    if (sess) {
      for (let i = 0; i < sess.timers.length; i++) {
        clearTimeout(sess.timers[i]);
      }
      if (sess.resizeObs) {
        try { sess.resizeObs.disconnect(); } catch (_) {}
      }
    }
    if (closingModelBtn) {
      beginModelTooltipSuppression(closingModelBtn);
    }
    clearProxyAttributes(sess);
    if (sendEsc) {
      dispatchEscape();
    }
    if (closingModelBtn) {
      blurSuppressedModelBtn(closingModelBtn);
      requestAnimationFrame(() => {
        blurSuppressedModelBtn(closingModelBtn);
        hideStrayModelTooltips();
      });
      setTimeout(() => {
        blurSuppressedModelBtn(closingModelBtn);
        hideStrayModelTooltips();
      }, 40);
      scheduleClearModelTooltipSuppression(550);
    }
  }

  function findVisibleUsageSubmenu(parentMenu, parentPopper) {
    // 1. Check semantic floating containers first (Radix / Floating UI / ARIA menus / dialogs)
    const semantic = document.querySelectorAll(
      '[role="menu"], [role="listbox"], [data-radix-menu-content], [data-radix-popper-content-wrapper], [role="dialog"]:not([aria-modal="true"])'
    );
    let best = null;
    let bestArea = Infinity;

    for (let i = 0; i < semantic.length; i++) {
      const el = semantic[i];
      if (el === parentMenu || el === parentPopper) continue;
      if (parentMenu && el.contains(parentMenu)) continue;
      if (el.closest && el.closest('[data-aglaunch-ui]')) continue;
      if (!isElementLaidOut(el)) continue;

      const txt = normalizeText(el.textContent);
      if (!looksLikeUsageContent(txt)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 120 || r.height < 40) continue;
      const area = r.width * r.height;
      if (area < bestArea) {
        bestArea = area;
        best = el;
      }
    }
    if (best) return best;

    // 2. Fallback: find nested or custom floating panel containing usage labels
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let tn;
    while ((tn = walker.nextNode())) {
      const v = normalizeText(tn.nodeValue);
      if (!v || v.length > 80) continue;
      if (!/^(usage|用量统计|weekly\s+limit|每周限额|5h\s+limit|5\s*小时限额|gemini\s+models|gemini\s*模型)$/i.test(v)) continue;
      const p = tn.parentElement;
      if (!p || (p.closest && p.closest('[data-aglaunch-ui]'))) continue;
      if (isInsideSettingsDialog(p)) continue;

      let box = p;
      for (let d = 0; d < 6 && box && box !== document.body; d++) {
        if (box === parentMenu || box === parentPopper) break;
        const r = box.getBoundingClientRect();
        if (r.width >= 150 && r.width <= 540 && r.height >= 60 && r.height <= 640 && looksLikeUsageContent(box.textContent)) {
          const cs = getComputedStyle(box);
          if (cs.position === 'fixed' || cs.position === 'absolute' || (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent')) {
            return box;
          }
        }
        box = box.parentElement;
      }
    }
    return null;
  }

  function findOpenSettingsDialog() {
    const dialogs = document.querySelectorAll('[role="dialog"], [aria-modal="true"], dialog');
    for (let i = 0; i < dialogs.length; i++) {
      const dlg = dialogs[i];
      if (dlg.closest && dlg.closest('[data-aglaunch-ui]')) continue;
      if (isElementVisible(dlg) && looksLikeSettingsDialogText(dlg.textContent || '')) {
        return dlg;
      }
    }
    return null;
  }

  function openSettingsModelsAndUsageFallback() {
    const clickModelsTab = (dlg) => {
      if (!dlg || !dlg.isConnected) return false;
      const tabs = dlg.querySelectorAll('button, [role="tab"], a');
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        if (tab.closest && tab.closest('[data-aglaunch-ui]')) continue;
        if (isSettingsModelsTabLabel(tab.textContent)) {
          triggerNativeClick(tab);
          return true;
        }
      }
      return false;
    };

    const existingDlg = findOpenSettingsDialog();
    if (existingDlg) {
      clickModelsTab(existingDlg);
      return;
    }

    const settingsBtn = document.querySelector(
      'button[aria-label="Settings"], button[aria-label="设置"], button[title="Settings"], button[title="设置"]'
    );
    if (settingsBtn) {
      settingsBtn.click();
    } else {
      const isMac = /mac/i.test(navigator.platform || '');
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: ',',
        code: 'Comma',
        metaKey: isMac,
        ctrlKey: !isMac,
        bubbles: true
      }));
    }

    let attempts = 0;
    const trySelect = () => {
      attempts++;
      const dlg = findOpenSettingsDialog();
      if (dlg && clickModelsTab(dlg)) return;
      if (attempts < 10) setTimeout(trySelect, 60);
    };
    setTimeout(trySelect, 80);
  }

  function activateSubmenuSession(sess, submenuEl, isInPlace) {
    if (proxySession !== sess) return;
    sess.isInPlace = isInPlace;
    sess.submenuEl = submenuEl;
    const popper = isInPlace
      ? getPopperWrapper(submenuEl, null, null)
      : getPopperWrapper(submenuEl, sess.parentMenu, sess.parentPopper);
    sess.submenuPopper = popper;

    if (isInPlace) {
      if (sess.parentMenu) sess.parentMenu.removeAttribute(USAGE_PARENT_MENU_ATTR);
      if (sess.parentPopper) sess.parentPopper.removeAttribute(USAGE_PARENT_MENU_ATTR);
    }

    submenuEl.setAttribute(USAGE_SUBMENU_ATTR, '1');
    if (popper && popper !== submenuEl) {
      popper.setAttribute(USAGE_SUBMENU_ATTR, '1');
    }

    document.documentElement.setAttribute(HTML_ACTIVE_ATTR, '1');
    document.documentElement.removeAttribute(HTML_OPENING_ATTR);

    if (sess.usageBtn && sess.usageBtn.isConnected) {
      sess.usageBtn.setAttribute('data-active', '1');
      sess.usageBtn.setAttribute('aria-expanded', 'true');
    }

    applySubmenuPosition(sess.usageBtn, popper, submenuEl);
    requestAnimationFrame(() => {
      if (proxySession === sess) applySubmenuPosition(sess.usageBtn, popper, submenuEl);
    });
    sess.timers.push(setTimeout(() => {
      if (proxySession === sess) applySubmenuPosition(sess.usageBtn, popper, submenuEl);
    }, 60));

    if (typeof ResizeObserver === 'function') {
      try {
        const ro = new ResizeObserver(() => {
          if (proxySession === sess) applySubmenuPosition(sess.usageBtn, popper, submenuEl);
        });
        ro.observe(submenuEl);
        if (popper !== submenuEl) ro.observe(popper);
        sess.resizeObs = ro;
      } catch (_) {}
    }

    // Watch for dismissal (or in-place navigation back to model list)
    const openedAt = Date.now();
    const watch = () => {
      if (proxySession !== sess) return;
      const closedByState = (sess.submenuEl && sess.submenuEl.getAttribute('data-state') === 'closed') ||
        (sess.submenuPopper && sess.submenuPopper.getAttribute('data-state') === 'closed');
      const hiddenAfterMount = Date.now() - openedAt > 200 && sess.submenuEl && !isElementVisible(sess.submenuEl);
      if (!sess.submenuEl || !sess.submenuEl.isConnected || !isElementLaidOut(sess.submenuEl) || closedByState || hiddenAfterMount) {
        closeActiveUsageProxy(false);
        return;
      }
      if (sess.isInPlace && !looksLikeUsageContent(sess.submenuEl.textContent) && findUsageItemInMenu(sess.submenuEl)) {
        // User clicked back to the model list inside an in-place popover; restore normal menu styling.
        closeActiveUsageProxy(false);
        scanOpenModelMenus();
        return;
      }
      const t = setTimeout(watch, 120);
      sess.timers.push(t);
    };
    sess.timers.push(setTimeout(watch, 120));
  }

  function openUsageFromShortcut(usageBtn, modelBtn) {
    closeActiveUsageProxy(false);
    if (!modelBtn || !modelBtn.isConnected) {
      openSettingsModelsAndUsageFallback();
      return;
    }

    const sess = {
      id: ++proxySessionSeq,
      usageBtn,
      modelBtn,
      parentMenu: null,
      parentPopper: null,
      submenuEl: null,
      submenuPopper: null,
      isInPlace: false,
      timers: [],
      resizeObs: null
    };
    proxySession = sess;

    document.documentElement.setAttribute(HTML_OPENING_ATTR, '1');
    beginModelTooltipSuppression(modelBtn);
    usageBtn.setAttribute('data-active', '1');

    // Open the native model dropdown (invisible during opening phase -> zero flash)
    triggerNativeClick(modelBtn);
    blurSuppressedModelBtn(modelBtn);
    requestAnimationFrame(() => {
      blurSuppressedModelBtn(modelBtn);
      hideStrayModelTooltips();
    });

    let findMenuAttempts = 0;
    const waitForModelMenu = () => {
      if (proxySession !== sess) return;
      findMenuAttempts++;

      const menus = scanOpenModelMenus();
      let targetMenu = null;
      let usageItem = null;
      for (let i = 0; i < menus.length; i++) {
        const item = findUsageItemInMenu(menus[i]);
        if (item) {
          targetMenu = menus[i];
          usageItem = item;
          break;
        }
      }

      if (!targetMenu || !usageItem) {
        if (findMenuAttempts < 18) {
          sess.timers.push(setTimeout(waitForModelMenu, 25));
        } else {
          // Model dropdown didn't expose View Usage -> cleanly close & fall back to Settings -> Models & Usage
          closeActiveUsageProxy(true);
          openSettingsModelsAndUsageFallback();
        }
        return;
      }

      sess.parentMenu = targetMenu;
      sess.parentPopper = getPopperWrapper(targetMenu);
      targetMenu.setAttribute(USAGE_PARENT_MENU_ATTR, '1');
      if (sess.parentPopper && sess.parentPopper !== targetMenu) {
        sess.parentPopper.setAttribute(USAGE_PARENT_MENU_ATTR, '1');
      }

      // First trigger hover (handles Radix SubTrigger & custom hover submenus without double-toggling)
      triggerNativeHover(usageItem);

      let clickedFallback = false;
      let arrowFallback = false;
      let waitSubAttempts = 0;

      const waitForUsageResult = () => {
        if (proxySession !== sess) return;
        waitSubAttempts++;

        // Outcome 1: Separate Usage submenu appeared
        const sub = findVisibleUsageSubmenu(sess.parentMenu, sess.parentPopper);
        if (sub) {
          activateSubmenuSession(sess, sub, false);
          return;
        }

        // Outcome 2: Parent menu switched in-place to Usage view
        if (sess.parentMenu && sess.parentMenu.isConnected && looksLikeUsageContent(sess.parentMenu.textContent)) {
          activateSubmenuSession(sess, sess.parentMenu, true);
          return;
        }

        // Outcome 3: Settings -> Models & Usage dialog opened
        const settingsDlg = findOpenSettingsDialog();
        if (settingsDlg) {
          closeActiveUsageProxy(false);
          return;
        }

        // After ~120ms, if hover alone didn't open it, click the native View Usage item
        if (!clickedFallback && waitSubAttempts >= 5) {
          clickedFallback = true;
          if (usageItem.isConnected) {
            triggerNativeClick(usageItem);
          }
        }

        // After ~220ms, also try ArrowRight keydown (Radix SubTrigger keyboard activation)
        if (!arrowFallback && waitSubAttempts >= 9) {
          arrowFallback = true;
          if (usageItem.isConnected) {
            try {
              usageItem.dispatchEvent(new KeyboardEvent('keydown', {
                key: 'ArrowRight',
                code: 'ArrowRight',
                bubbles: true,
                cancelable: true
              }));
            } catch (_) {}
          }
        }

        if (waitSubAttempts < 22) {
          sess.timers.push(setTimeout(waitForUsageResult, 25));
        } else {
          // Fallback: close hidden menu and open Settings -> Models & Usage
          closeActiveUsageProxy(true);
          openSettingsModelsAndUsageFallback();
        }
      };

      sess.timers.push(setTimeout(waitForUsageResult, 25));
    };

    sess.timers.push(setTimeout(waitForModelMenu, 16));
  }

  function runScan() {
    ensureStyles();
    scanOpenModelMenus();
    syncComposerUsageButtons();
  }

  function scheduleScan(delay) {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      scanTimer = null;
      runScan();
    }, typeof delay === 'number' ? delay : 45);
  }

  function refreshLabelsAndStyles() {
    for (const btn of Array.from(activeUsageButtons)) {
      if (!btn.isConnected) {
        activeUsageButtons.delete(btn);
        continue;
      }
      syncButtonVisualTokens(btn, usageBtnToModelBtn.get(btn));
    }
  }

  window.__AGL_TWEAKS__ = {
    rescan: runScan,
    closeUsage: () => closeActiveUsageProxy(true),
    getState: () => ({
      usageButtonCount: activeUsageButtons.size,
      usageProxyActive: Boolean(proxySession)
    })
  };

  function boot() {
    if (!document.body) return;
    ensureStyles();
    runScan();

    const obs = new MutationObserver((mutations) => {
      let relevant = false;
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type !== 'childList') continue;
        const target = m.target;
        if (target && target.nodeType === 1 && target.closest && target.closest('[data-aglaunch-ui]')) continue;
        if (m.addedNodes.length > 0 || m.removedNodes.length > 0) {
          relevant = true;
          break;
        }
      }
      if (!relevant) return;
      // Immediately annotate newly mounted menus so Upgrade never flashes even for 1 frame
      scanOpenModelMenus();
      hideStrayModelTooltips();
      scheduleScan(50);
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // Prevent Radix TooltipTrigger on modelBtn from opening "选择模型 / Select Model"
    // when programmatic click or menu close auto-focuses modelBtn during Usage shortcut flow.
    const interceptModelFocus = (ev) => {
      if (!suppressedModelBtn) return;
      const t = ev.target;
      if (t === suppressedModelBtn || (t && suppressedModelBtn.contains && suppressedModelBtn.contains(t))) {
        ev.stopImmediatePropagation();
        try { suppressedModelBtn.blur(); } catch (_) {}
        hideStrayModelTooltips();
      }
    };
    window.addEventListener('focus', interceptModelFocus, true);
    window.addEventListener('focusin', interceptModelFocus, true);

    // If user manually moves pointer onto modelBtn after Usage closed, lift tooltip suppression immediately
    document.addEventListener('pointerover', (ev) => {
      if (!suppressedModelBtn || proxySession) return;
      const t = ev.target;
      if (t === suppressedModelBtn || (t && suppressedModelBtn.contains && suppressedModelBtn.contains(t))) {
        clearModelTooltipSuppression();
      }
    }, true);

    // Cleanly dismiss proxy state on Escape
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape' && proxySession) {
        setTimeout(() => {
          if (proxySession && (!proxySession.submenuEl || !proxySession.submenuEl.isConnected)) {
            closeActiveUsageProxy(false);
          }
        }, 30);
      }
    }, true);

    // Reposition active usage popover on window resize
    window.addEventListener('resize', () => {
      if (proxySession && proxySession.submenuPopper && proxySession.usageBtn) {
        applySubmenuPosition(proxySession.usageBtn, proxySession.submenuPopper, proxySession.submenuEl);
      }
      scheduleScan(80);
    });

    // Keep button label & colors in sync with i18n, theme, and skin changes
    if (window.__AGL_I18N__ && typeof window.__AGL_I18N__.subscribe === 'function') {
      window.__AGL_I18N__.subscribe(() => refreshLabelsAndStyles());
    }
    if (window.__AGL_THEME__ && typeof window.__AGL_THEME__.subscribe === 'function') {
      window.__AGL_THEME__.subscribe(() => refreshLabelsAndStyles());
    }
    if (window.__AGL_SKIN__ && typeof window.__AGL_SKIN__.subscribe === 'function') {
      window.__AGL_SKIN__.subscribe(() => refreshLabelsAndStyles());
    }

    const themeObs = new MutationObserver(() => refreshLabelsAndStyles());
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-color-scheme', 'data-aglaunch-theme', 'data-aglaunch-theme-polarity']
    });

    setTimeout(runScan, 350);
    setTimeout(runScan, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
