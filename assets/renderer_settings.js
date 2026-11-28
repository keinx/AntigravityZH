'use strict';

// AntigravityZH Unified Settings UI Integration (Renderer)
// Injects a native-styled "启动器设置" (Launcher) tab directly below "浏览器" (Browser)
// in Antigravity's Settings sidebar, matching Antigravity's grouped-row design language.

(function initRendererSettings() {
  const BROWSER_LABELS = new Set(['Browser', '浏览器']);
  const APPEARANCE_LABELS = new Set(['Appearance', '外观']);
  const KNOWN_SETTINGS_TABS = new Set([
    'General', '常规',
    'Application', '应用程序',
    'Appearance', '外观',
    'Shortcuts', '快捷键',
    'Notifications', '系统通知', '通知',
    'Models', '模型', 'Models & Usage', '模型与用量',
    'Permissions', '权限管理', '权限',
    'Browser', '浏览器',
    'Account', '账号',
    'Feedback', '反馈'
  ]);

  const UI_STRINGS = {
    zh: {
      navLabel: '启动器设置',
      pageTitle: '启动器设置',
      pageSubtitle: '配置汉化、预设主题、自定义皮肤与启动动画。',
      i18nSection: '界面汉化',
      i18nEnableLabel: '简体中文',
      i18nEnableSub: '实时切换界面与菜单语言',
      i18nAutoLabel: '按需翻译',
      i18nAutoSub: '自动翻译插件市场与 MCP 描述',
      dictCacheLabel: '词典与缓存',
      dictCacheSub: (ver, count) => `v${ver} · 已缓存 ${count} 条`,
      clearCache: '清除缓存',
      exportDict: '导出词典',
      themeSection: '预设主题',
      themeDefaultName: '原版默认',
      themeDefaultTag: '跟随系统外观',
      themeIconsLabel: '替换全套主题图标',
      themeIconsSub: '同步替换为 26 处主题定制 SVG 图标',
      themeBackdropLabel: '使用主题专属背景',
      themeBackdropSub: '启用内置矢量氛围背景（自定义图片开启时自动让位）',
      themeBackdropOverridden: '当前由下方「自定义皮肤」图片覆盖背景',
      skinSection: '自定义皮肤',
      skinEnableLabel: '启用皮肤',
      skinStatusEmpty: '未选择图片',
      skinStatusPaused: '已暂停',
      skinStatusActive: (mode, scope) => `${mode === 'overlay' ? '轻量叠层' : '背景融合'} · ${scope === 'main' ? '主内容区' : '全窗口'}`,
      skinImageLabel: '背景图片',
      skinImageEmpty: '支持 PNG / JPG / WebP / BMP / AVIF',
      skinThumbEmpty: '无',
      skinPickBtn: '选择',
      skinClearBtn: '清除',
      skinFloatBtn: '浮窗预览',
      skinModeLabel: '渲染模式',
      skinModeBlend: '背景融合',
      skinModeOverlay: '轻量叠层',
      skinScopeLabel: '覆盖区域',
      skinScopeFull: '全窗口',
      skinScopeMain: '主内容区',
      skinFitLabel: '图片适配',
      skinFitCover: '铺满',
      skinFitContain: '适应',
      skinFitFill: '拉伸',
      skinPosLabel: '对齐位置',
      skinPosCenter: '居中',
      skinPosTop: '顶部',
      skinPosBottom: '底部',
      skinPosLeft: '左侧',
      skinPosRight: '右侧',
      skinOpacity: '背景可见度',
      skinScrim: '遮罩浓度',
      skinSurface: '毛玻璃浓度',
      skinOverlayOpacity: '叠层透明度',
      skinBlur: '背景模糊',
      skinResetLabel: '皮肤参数',
      skinResetBtn: '恢复默认',
      splashSection: '启动动画',
      splashEnableLabel: '启用自定义启动动画',
      splashStatusEmpty: '未选择视频或动图（将显示原版加载动画）',
      splashStatusPaused: '已暂停（下次启动将显示原版加载动画）',
      splashStatusActive: (endMode, minDuration, muted, mediaKind) => {
        const modeStr = mediaKind === 'video' && endMode === 'complete'
          ? '播完后淡出'
          : `加载完成淡出 · 至少 ${Number(minDuration || 0).toFixed(1)}s`;
        const audioStr = mediaKind === 'video' ? (muted ? ' · 静音' : ' · 有声') : ' · 动图';
        return modeStr + audioStr;
      },
      splashMediaLabel: '动画文件',
      splashMediaEmpty: '支持 MP4 / WebM / MOV / GIF / WebP（最大 200 MB）',
      splashBadgeEmpty: '无',
      splashBadgeVideo: '视频',
      splashBadgeImage: '动图',
      splashPickBtn: '选择',
      splashClearBtn: '清除',
      splashPreviewBtn: '预览',
      splashFitLabel: '画面适配',
      splashFitCover: '铺满裁切',
      splashFitContain: '完整适应',
      splashEndModeLabel: '结束时机',
      splashEndLoaded: '加载完成',
      splashEndComplete: '播完动画',
      splashMinDurationLabel: '最短展示时长',
      splashMutedLabel: '静音播放',
      splashMutedSub: '推荐开启，避免每次启动突然出声',
      splashVolumeLabel: '播放音量',
      splashResetLabel: '动画参数',
      splashResetBtn: '恢复默认',
      generalSection: '通用',
      configDirLabel: '配置与数据',
      openConfigDir: '打开目录',
      homepage: '项目主页'
    },
    en: {
      navLabel: 'Launcher',
      pageTitle: 'Launcher',
      pageSubtitle: 'Configure localization, preset themes, custom skin, and startup animation.',
      i18nSection: 'Localization',
      i18nEnableLabel: 'Simplified Chinese',
      i18nEnableSub: 'Switch UI and menus live',
      i18nAutoLabel: 'On-Demand Translation',
      i18nAutoSub: 'Translate Marketplace & MCP descriptions',
      dictCacheLabel: 'Dictionary & Cache',
      dictCacheSub: (ver, count) => `v${ver} · ${count} cached`,
      clearCache: 'Clear Cache',
      exportDict: 'Export',
      themeSection: 'Preset Themes',
      themeDefaultName: 'Default',
      themeDefaultTag: 'Original appearance',
      themeIconsLabel: 'Replace Theme Icons',
      themeIconsSub: 'Swap 26 interface icons with themed custom SVGs',
      themeBackdropLabel: 'Built-in Theme Backdrop',
      themeBackdropSub: 'Render preset vector backdrop (yields to custom image)',
      themeBackdropOverridden: 'Overridden by active Custom Skin image below',
      skinSection: 'Custom Skin',
      skinEnableLabel: 'Enable Skin',
      skinStatusEmpty: 'No image selected',
      skinStatusPaused: 'Paused',
      skinStatusActive: (mode, scope) => `${mode === 'overlay' ? 'Overlay' : 'Blend'} · ${scope === 'main' ? 'Main Area' : 'Full Window'}`,
      skinImageLabel: 'Background Image',
      skinImageEmpty: 'PNG / JPG / WebP / BMP / AVIF',
      skinThumbEmpty: 'None',
      skinPickBtn: 'Choose',
      skinClearBtn: 'Clear',
      skinFloatBtn: 'Preview',
      skinModeLabel: 'Render Mode',
      skinModeBlend: 'Blend',
      skinModeOverlay: 'Overlay',
      skinScopeLabel: 'Coverage',
      skinScopeFull: 'Full',
      skinScopeMain: 'Main',
      skinFitLabel: 'Image Fit',
      skinFitCover: 'Cover',
      skinFitContain: 'Contain',
      skinFitFill: 'Stretch',
      skinPosLabel: 'Alignment',
      skinPosCenter: 'Center',
      skinPosTop: 'Top',
      skinPosBottom: 'Bottom',
      skinPosLeft: 'Left',
      skinPosRight: 'Right',
      skinOpacity: 'Visibility',
      skinScrim: 'Scrim Veil',
      skinSurface: 'Glass Opacity',
      skinOverlayOpacity: 'Overlay Opacity',
      skinBlur: 'Blur',
      skinResetLabel: 'Skin Parameters',
      skinResetBtn: 'Reset',
      splashSection: 'Startup Animation',
      splashEnableLabel: 'Enable Custom Startup Animation',
      splashStatusEmpty: 'No video or animated image selected',
      splashStatusPaused: 'Paused (default loading screen will show)',
      splashStatusActive: (endMode, minDuration, muted, mediaKind) => {
        const modeStr = mediaKind === 'video' && endMode === 'complete'
          ? 'Fade after playback'
          : `Fade when ready · min ${Number(minDuration || 0).toFixed(1)}s`;
        const audioStr = mediaKind === 'video' ? (muted ? ' · Muted' : ' · Audio') : ' · Image';
        return modeStr + audioStr;
      },
      splashMediaLabel: 'Animation Media',
      splashMediaEmpty: 'MP4 / WebM / MOV / GIF / WebP (max 200 MB)',
      splashBadgeEmpty: 'None',
      splashBadgeVideo: 'Video',
      splashBadgeImage: 'Anim',
      splashPickBtn: 'Choose',
      splashClearBtn: 'Clear',
      splashPreviewBtn: 'Preview',
      splashFitLabel: 'Video Fit',
      splashFitCover: 'Cover',
      splashFitContain: 'Contain',
      splashEndModeLabel: 'Dismiss When',
      splashEndLoaded: 'App Ready',
      splashEndComplete: 'Playback Ends',
      splashMinDurationLabel: 'Min Display Time',
      splashMutedLabel: 'Mute Audio',
      splashMutedSub: 'Recommended to avoid unexpected audio on launch',
      splashVolumeLabel: 'Volume',
      splashResetLabel: 'Animation Parameters',
      splashResetBtn: 'Reset',
      generalSection: 'General',
      configDirLabel: 'Config & Data',
      openConfigDir: 'Open Folder',
      homepage: 'Homepage'
    }
  };

  function getStrings(zhEnabled) {
    return zhEnabled ? UI_STRINGS.zh : UI_STRINGS.en;
  }

  function normalizeLabelText(str) {
    return typeof str === 'string' ? str.replace(/\s+/g, ' ').trim() : '';
  }

  function isBrowserTabLabel(text) {
    return BROWSER_LABELS.has(normalizeLabelText(text));
  }

  function isAppearanceTabLabel(text) {
    return APPEARANCE_LABELS.has(normalizeLabelText(text));
  }

  function matchAppearanceOptionPolarity(text) {
    const clean = normalizeLabelText(text);
    if (!clean) return '';
    if (/^(浅色|亮色|浅色模式|亮色模式|浅色主题|Light|Light Mode|Light Theme)$/i.test(clean)) return 'light';
    if (/^(深色|暗色|深色模式|暗色模式|深色主题|Dark|Dark Mode|Dark Theme)$/i.test(clean)) return 'dark';
    if (/^(跟随系统|系统|自动|System|Auto|Follow System|Match System)$/i.test(clean)) return 'system';
    return '';
  }

  function matchAppearanceIconButtonPolarity(desc) {
    if (!desc || typeof desc !== 'object') return '';
    const byText = matchAppearanceOptionPolarity(desc.text) ||
      matchAppearanceOptionPolarity(desc.ariaLabel) ||
      matchAppearanceOptionPolarity(desc.title);
    if (byText) return byText;

    const hint = [desc.ariaLabel, desc.title, desc.value, desc.svgClass].filter(Boolean).join(' ').toLowerCase();
    if (!hint) return '';
    if (/\bsun\b|light|浅色|亮色/.test(hint)) return 'light';
    if (/\bmoon\b|dark|深色|暗色/.test(hint)) return 'dark';
    if (/monitor|laptop|desktop|computer|system|跟随系统|系统/.test(hint)) return 'system';
    return '';
  }

  function isThemeRowLabel(text) {
    const clean = normalizeLabelText(text);
    return clean === '主题' || /^Theme$/i.test(clean);
  }

  function isKnownSettingsTabLabel(text) {
    return KNOWN_SETTINGS_TABS.has(normalizeLabelText(text));
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      BROWSER_LABELS,
      APPEARANCE_LABELS,
      KNOWN_SETTINGS_TABS,
      getStrings,
      normalizeLabelText,
      isBrowserTabLabel,
      isAppearanceTabLabel,
      isThemeRowLabel,
      matchAppearanceOptionPolarity,
      matchAppearanceIconButtonPolarity,
      isKnownSettingsTabLabel
    };
    return;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__AGL_SETTINGS_INSTALLED__) return;

  const isLocalHub = (location.protocol === 'https:' || location.protocol === 'http:') &&
    (location.hostname === '127.0.0.1' || location.hostname === 'localhost');
  if (!isLocalHub) return;

  window.__AGL_SETTINGS_INSTALLED__ = true;

  const init = typeof __AGL_SETTINGS_INIT__ !== 'undefined' && __AGL_SETTINGS_INIT__ ? __AGL_SETTINGS_INIT__ : {};
  const FALLBACK_THEME_PRESETS = [
    { id: 'aurora', nameZh: '液态琉璃', nameEn: 'Aurora Glass', tagZh: '暗色 · 极光毛玻璃', tagEn: 'Dark · Liquid Glass', previewGradient: 'linear-gradient(135deg, #0b1026 0%, #3b2678 46%, #0c4a6e 100%)', accentHex: '#8B5CF6', secondaryHex: '#38BDF8', surfaceHex: '#10152a', textHex: '#F2F5FF' },
    { id: 'washi', nameZh: '和纸水墨', nameEn: 'Washi Ink', tagZh: '浅色 · 东方留白', tagEn: 'Light · Sumi Washi', previewGradient: 'linear-gradient(135deg, #F6F1E7 0%, #EBE2D2 60%, #DDD2BE 100%)', accentHex: '#C83E2B', secondaryHex: '#4E7C68', surfaceHex: '#EFE8DB', textHex: '#1F1C18' },
    { id: 'cyber', nameZh: '赛博夜行', nameEn: 'Cyber Nocturne', tagZh: '暗色 · 霓虹 HUD', tagEn: 'Dark · Neon HUD', previewGradient: 'linear-gradient(135deg, #050814 0%, #0d1633 55%, #230c2e 100%)', accentHex: '#00F0FF', secondaryHex: '#FF2A85', surfaceHex: '#080e1d', textHex: '#E8FAFF' },
    { id: 'botanical', nameZh: '森系手账', nameEn: 'Botanical Studio', tagZh: '浅色 · 奶油鼠尾草', tagEn: 'Light · Cream Sage', previewGradient: 'linear-gradient(135deg, #FAF6EE 0%, #EDF3E8 55%, #DFEAD7 100%)', accentHex: '#538462', secondaryHex: '#D97D54', surfaceHex: '#EEF3E9', textHex: '#27372B' },
    { id: 'pixel', nameZh: '像素复古', nameEn: 'Retro Pixel OS', tagZh: '复古 · 90s 像素', tagEn: 'Retro · 90s Pixel', previewGradient: 'linear-gradient(135deg, #EFE9D8 0%, #E2DAC6 65%, #D5CCB4 100%)', accentHex: '#FF4D1C', secondaryHex: '#2B59FF', surfaceHex: '#E2DAC6', textHex: '#171717' }
  ];
  const state = {
    i18n: Object.assign({ enabled: true, autoTranslate: true }, init.config && init.config.i18n),
    theme: Object.assign({ preset: 'none', replaceIcons: true, useBackdrop: true }, init.config && init.config.theme),
    skin: Object.assign({
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
    }, init.config && init.config.skin),
    splash: Object.assign({
      enabled: false,
      mediaPath: '',
      fit: 'cover',
      muted: true,
      volume: 0.8,
      endMode: 'loaded',
      minDuration: 1.5
    }, init.config && init.config.splash),
    skinImageDataUrl: typeof init.skinImageDataUrl === 'string' ? init.skinImageDataUrl : '',
    meta: Object.assign({
      launcherVersion: '1.0.0',
      dictVersion: '2.35.2.3',
      cacheCount: 0,
      configPath: '',
      configBaseDir: '',
      homepageUrl: '',
      skinMeta: { imageName: '', imageError: '' },
      splashMeta: { mediaName: '', mediaKind: '', mediaSize: 0, mediaError: '', valid: false }
    }, init.meta)
  };

  if (typeof __AGL_SETTINGS_INIT__ !== 'undefined') {
    try { __AGL_SETTINGS_INIT__ = null; } catch (_) {}
  }

  const STYLE_ID = 'aglaunch-settings-style';
  const NAV_ATTR = 'data-aglaunch-settings-nav';
  const PANE_ID = 'aglaunch-settings-pane';

  let activeDialog = null;
  let activeNavContainer = null;
  let activeContentHost = null;
  let activeNavItem = null;
  let activePane = null;
  let isLauncherTabActive = false;
  let suppressNavDeactivate = false;
  let savedNativeAppearance = null;
  let pendingAppearanceSyncTimer = null;
  let pendingOpenLauncherTab = false;
  let checkTimer = null;
  let noticeTimer = null;
  let currentNotice = null;

  function sendLauncherMsg(payload) {
    try {
      console.debug('__AGL_MSG__' + JSON.stringify(payload));
    } catch (_) {}
  }

  function detectThemeDark() {
    const html = document.documentElement;
    const presetPolarity = html && html.getAttribute('data-aglaunch-theme-polarity');
    if (presetPolarity === 'light') return false;
    if (presetPolarity === 'dark') return true;
    if (window.__AGL_SKIN__ && typeof window.__AGL_SKIN__.getState === 'function') {
      return Boolean(window.__AGL_SKIN__.getState().isDark);
    }
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
    return window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : true;
  }

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.setAttribute('data-aglaunch-skip', '1');
    style.textContent = `
      /* React-safe content switching + guaranteed smooth vertical scroll */
      [data-aglaunch-settings-active="1"] [data-aglaunch-content-host="1"] {
        display: flex !important;
        flex-direction: column !important;
        min-height: 0 !important;
        overflow: hidden !important;
      }
      [data-aglaunch-settings-active="1"] [data-aglaunch-content-host="1"] > :not(#${PANE_ID}):not([data-aglaunch-keep="1"]) {
        display: none !important;
      }

      #${PANE_ID} {
        display: none;
        flex: 1 1 0%;
        min-height: 0;
        height: 100%;
        width: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        color: var(--agl-fg);
      }
      [data-aglaunch-settings-active="1"] #${PANE_ID} {
        display: block;
      }
      #${PANE_ID}::-webkit-scrollbar {
        width: 6px;
      }
      #${PANE_ID}::-webkit-scrollbar-track {
        background: transparent;
      }
      #${PANE_ID}::-webkit-scrollbar-thumb {
        background: var(--agl-scroll-thumb);
        border-radius: 999px;
      }

      /* Suppress native active tab background while Launcher tab is selected */
      [data-aglaunch-settings-active="1"] [data-aglaunch-nav-container="1"] > :not([${NAV_ATTR}="1"]) {
        background-color: transparent !important;
        box-shadow: none !important;
      }
      [data-aglaunch-settings-active="1"] [data-aglaunch-nav-container="1"] > :not([${NAV_ATTR}="1"]) button,
      [data-aglaunch-settings-active="1"] [data-aglaunch-nav-container="1"] > :not([${NAV_ATTR}="1"]) [role="tab"] {
        background-color: transparent !important;
        box-shadow: none !important;
      }

      [${NAV_ATTR}="1"][data-active="1"] {
        background-color: var(--agl-nav-active-bg, rgba(255, 255, 255, 0.1)) !important;
        color: var(--agl-nav-active-fg, inherit) !important;
        font-weight: 500 !important;
      }

      /* Native Antigravity dark & light tokens */
      #${PANE_ID}[data-theme="dark"] {
        --agl-fg: #f3f4f6;
        --agl-muted: rgba(255, 255, 255, 0.56);
        --agl-group-bg: rgba(255, 255, 255, 0.025);
        --agl-border: rgba(255, 255, 255, 0.09);
        --agl-divider: rgba(255, 255, 255, 0.075);
        --agl-pill-bg: rgba(255, 255, 255, 0.08);
        --agl-pill-hover: rgba(255, 255, 255, 0.14);
        --agl-track-bg: rgba(255, 255, 255, 0.055);
        --agl-seg-active-bg: rgba(255, 255, 255, 0.15);
        --agl-switch-off: rgba(255, 255, 255, 0.16);
        --agl-switch-on: #5b8def;
        --agl-accent: #5b8def;
        --agl-danger: #f87171;
        --agl-success: #4ade80;
        --agl-scroll-thumb: rgba(255, 255, 255, 0.18);
      }
      #${PANE_ID}[data-theme="light"] {
        --agl-fg: #111827;
        --agl-muted: rgba(15, 23, 42, 0.56);
        --agl-group-bg: rgba(15, 23, 42, 0.025);
        --agl-border: rgba(15, 23, 42, 0.1);
        --agl-divider: rgba(15, 23, 42, 0.08);
        --agl-pill-bg: rgba(15, 23, 42, 0.07);
        --agl-pill-hover: rgba(15, 23, 42, 0.13);
        --agl-track-bg: rgba(15, 23, 42, 0.055);
        --agl-seg-active-bg: rgba(255, 255, 255, 0.92);
        --agl-switch-off: rgba(15, 23, 42, 0.18);
        --agl-switch-on: #2563eb;
        --agl-accent: #2563eb;
        --agl-danger: #dc2626;
        --agl-success: #16a34a;
        --agl-scroll-thumb: rgba(15, 23, 42, 0.2);
      }

      /* Centered inner column matching native Antigravity Settings margins */
      .agl-inner {
        width: 100%;
        max-width: 640px;
        margin: 0 auto;
        padding: 36px 40px 56px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }

      .agl-page-head {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .agl-page-title {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        line-height: 1.3;
        color: var(--agl-fg);
      }
      .agl-page-sub {
        margin: 0;
        font-size: 13px;
        color: var(--agl-muted);
      }

      .agl-notice {
        display: none;
        padding: 8px 12px;
        border-radius: 10px;
        font-size: 12.5px;
        border: 1px solid var(--agl-border);
        background: var(--agl-group-bg);
        color: var(--agl-fg);
      }
      .agl-notice[data-visible="1"] {
        display: block;
      }
      .agl-notice[data-kind="success"] {
        border-color: rgba(74, 222, 128, 0.32);
        color: var(--agl-success);
      }
      .agl-notice[data-kind="error"] {
        border-color: rgba(248, 113, 113, 0.32);
        color: var(--agl-danger);
      }

      /* Section heading sits cleanly outside above the grouped list */
      .agl-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .agl-section-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--agl-fg);
        letter-spacing: 0.01em;
      }

      /* Grouped rows container matching native Antigravity Settings */
      .agl-group {
        border-radius: 12px;
        border: 1px solid var(--agl-border);
        background: var(--agl-group-bg);
        overflow: hidden;
      }
      .agl-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 13px 16px;
      }
      .agl-row + .agl-row {
        border-top: 1px solid var(--agl-divider);
      }
      .agl-row[data-hidden="1"] {
        display: none;
      }
      .agl-row-left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        flex: 1;
      }
      .agl-row-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .agl-label {
        font-size: 13.5px;
        font-weight: 500;
        color: var(--agl-fg);
        line-height: 1.35;
      }
      .agl-sub {
        font-size: 12px;
        color: var(--agl-muted);
        line-height: 1.35;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .agl-sub.error {
        color: var(--agl-danger);
        white-space: normal;
      }
      .agl-row-right {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      /* Native pill button (matches "打开" in screenshot) */
      .agl-pill-btn {
        height: 30px;
        padding: 0 14px;
        border-radius: 999px;
        border: 1px solid var(--agl-border);
        background: var(--agl-pill-bg);
        color: var(--agl-fg);
        font-size: 12.5px;
        font-weight: 500;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.14s ease;
      }
      .agl-pill-btn:hover:not(:disabled) {
        background: var(--agl-pill-hover);
      }
      .agl-pill-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      /* Native inline pill segmented control (matches "排队发送 | 立即发送" & "Enter | Cmd+Enter") */
      .agl-seg {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 3px;
        border-radius: 999px;
        background: var(--agl-track-bg);
        border: 1px solid var(--agl-border);
      }
      .agl-seg button {
        border: none;
        border-radius: 999px;
        background: transparent;
        color: var(--agl-muted);
        font-size: 12px;
        font-weight: 500;
        padding: 4px 11px;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.14s ease, color 0.14s ease;
      }
      .agl-seg button:hover {
        color: var(--agl-fg);
      }
      .agl-seg button[data-active="1"] {
        background: var(--agl-seg-active-bg);
        color: var(--agl-fg);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.16);
      }

      /* Subtle native switch */
      .agl-switch {
        position: relative;
        width: 38px;
        height: 21px;
        border-radius: 999px;
        border: 1px solid transparent;
        background: var(--agl-switch-off);
        cursor: pointer;
        transition: background 0.16s ease;
        flex-shrink: 0;
        padding: 0;
      }
      .agl-switch[aria-checked="true"] {
        background: var(--agl-switch-on);
      }
      .agl-switch::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        width: 15px;
        height: 15px;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
        transition: transform 0.16s ease;
      }
      .agl-switch[aria-checked="true"]::after {
        transform: translateX(17px);
      }
      .agl-switch:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      /* Compact thumbnail inside the Background Image row */
      .agl-thumb {
        width: 52px;
        height: 34px;
        border-radius: 7px;
        border: 1px solid var(--agl-border);
        background: var(--agl-track-bg);
        overflow: hidden;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        color: var(--agl-muted);
        cursor: pointer;
      }
      .agl-thumb img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .agl-media-badge {
        width: 52px;
        height: 34px;
        border-radius: 7px;
        border: 1px solid var(--agl-border);
        background: var(--agl-track-bg);
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1px;
        font-size: 10.5px;
        font-weight: 500;
        color: var(--agl-muted);
        cursor: pointer;
        transition: border-color 0.14s ease, color 0.14s ease, background 0.14s ease;
      }
      .agl-media-badge[data-active="1"] {
        border-color: color-mix(in srgb, var(--agl-accent) 45%, var(--agl-border));
        background: color-mix(in srgb, var(--agl-accent) 14%, var(--agl-track-bg));
        color: var(--agl-fg);
      }
      .agl-media-badge svg {
        width: 14px;
        height: 14px;
        display: block;
      }

      /* Inline slider control inside grouped row */
      .agl-slider-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .agl-slider {
        width: 156px;
        accent-color: var(--agl-accent);
        cursor: pointer;
        margin: 0;
      }
      .agl-slider-val {
        width: 40px;
        text-align: right;
        font-size: 12px;
        color: var(--agl-muted);
        font-variant-numeric: tabular-nums;
      }

      /* Preset Theme Cards Grid */
      .agl-theme-grid-wrap {
        padding: 14px 16px;
      }
      .agl-theme-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
      }
      .agl-theme-card {
        display: flex;
        flex-direction: column;
        gap: 7px;
        padding: 8px;
        border-radius: 10px;
        border: 1.5px solid var(--agl-border);
        background: var(--agl-track-bg);
        color: var(--agl-fg);
        cursor: pointer;
        text-align: left;
        transition: border-color 0.16s ease, transform 0.14s ease, box-shadow 0.16s ease;
      }
      .agl-theme-card:hover {
        border-color: var(--agl-accent);
        transform: translateY(-1px);
      }
      .agl-theme-card[data-active="1"] {
        border-color: var(--agl-accent);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--agl-accent) 26%, transparent);
      }
      .agl-theme-swatch {
        position: relative;
        height: 46px;
        border-radius: 6px;
        overflow: hidden;
        border: 1px solid rgba(127, 127, 127, 0.22);
        display: flex;
      }
      .agl-theme-swatch-side {
        width: 28%;
        height: 100%;
        border-right: 1px solid rgba(127, 127, 127, 0.2);
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 6px 5px;
      }
      .agl-theme-swatch-bar {
        height: 4px;
        border-radius: 2px;
        width: 100%;
        opacity: 0.85;
      }
      .agl-theme-swatch-main {
        flex: 1;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;
        padding: 6px;
        gap: 4px;
      }
      .agl-theme-swatch-pill {
        width: 72%;
        height: 9px;
        border-radius: 4px;
        opacity: 0.9;
      }
      .agl-theme-swatch-dots {
        position: absolute;
        top: 6px;
        right: 6px;
        display: flex;
        gap: 3px;
      }
      .agl-theme-swatch-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }
      .agl-theme-meta {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
      }
      .agl-theme-name {
        font-size: 12.5px;
        font-weight: 600;
        color: var(--agl-fg);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .agl-theme-tag {
        font-size: 11px;
        color: var(--agl-muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  // --- Settings Dialog Discovery & Native Sidebar Injection ---
  function findSettingsContextInRoot(root) {
    if (!root) return null;
    const rect = root.getBoundingClientRect();
    if (rect.width < 460 || rect.height < 300) return null;

    const text = (root.textContent || '').slice(0, 4500);
    const looksLikeSettings = (text.includes('设置') || text.includes('Settings')) &&
      (text.includes('浏览器') || text.includes('Browser')) &&
      (text.includes('外观') || text.includes('Appearance') || text.includes('常规') || text.includes('General'));
    if (!looksLikeSettings) return null;

    const candidates = root.querySelectorAll('button, [role="tab"], [role="menuitem"], a, li, div[tabindex]');
    for (let j = 0; j < candidates.length; j++) {
      const el = candidates[j];
      if (el.closest('[data-aglaunch-ui]')) continue;
      const label = normalizeLabelText(el.textContent);
      if (!isBrowserTabLabel(label)) continue;

      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (r.left - rect.left > rect.width * 0.45 || r.width > rect.width * 0.48) continue;

      let navItem = el;
      let navContainer = el.parentElement;
      for (let depth = 0; depth < 2 && navContainer && navContainer !== root; depth++) {
        if (navContainer.tagName === 'LI' || navContainer.children.length === 1) {
          navItem = navContainer;
          navContainer = navContainer.parentElement;
        } else {
          break;
        }
      }
      if (!navContainer || navContainer === root) continue;

      let siblingTabs = 0;
      let inactiveSibling = null;
      let activeBg = '';
      let activeColor = '';
      const children = navContainer.children;
      for (let k = 0; k < children.length; k++) {
        const ch = children[k];
        if (ch.hasAttribute(NAV_ATTR)) continue;
        const t = normalizeLabelText(ch.textContent);
        if (isKnownSettingsTabLabel(t)) {
          siblingTabs++;
          const targetBtn = ch.matches('button, [role="tab"], a') ? ch : (ch.querySelector('button, [role="tab"], a') || ch);
          const cs = getComputedStyle(targetBtn);
          const isSelected = targetBtn.getAttribute('aria-selected') === 'true' ||
            targetBtn.getAttribute('aria-current') === 'page' ||
            targetBtn.getAttribute('data-state') === 'active' ||
            (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent');
          if (isSelected) {
            if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent') {
              activeBg = cs.backgroundColor;
            }
            activeColor = cs.color || '';
          } else if (!inactiveSibling) {
            inactiveSibling = ch;
          }
        }
      }

      if (siblingTabs < 2) continue;

      const contentHost = findContentHost(root, navContainer, rect);
      if (!contentHost) continue;

      return {
        dialog: root,
        navContainer,
        browserNavItem: navItem,
        templateSibling: inactiveSibling || navItem,
        contentHost,
        activeBg,
        activeColor
      };
    }
    return null;
  }

  function findSettingsContext() {
    const dialogs = document.querySelectorAll('[role="dialog"], [aria-modal="true"], dialog');
    for (let i = 0; i < dialogs.length; i++) {
      const dlg = dialogs[i];
      if (dlg.closest('[data-aglaunch-ui]')) continue;
      const found = findSettingsContextInRoot(dlg);
      if (found) return found;
    }
    const mainEl = document.querySelector('main, [role="main"]');
    if (mainEl && !mainEl.closest('[data-aglaunch-ui]')) {
      return findSettingsContextInRoot(mainEl);
    }
    return null;
  }

  function findContentHost(dlg, navContainer, dlgRect) {
    const navRect = navContainer.getBoundingClientRect();
    let cur = navContainer;
    while (cur && cur !== dlg) {
      const parent = cur.parentElement;
      if (!parent) break;
      const siblings = parent.children;
      let best = null;
      let bestArea = 0;
      for (let i = 0; i < siblings.length; i++) {
        const sib = siblings[i];
        if (sib === cur || sib.contains(navContainer)) continue;
        const r = sib.getBoundingClientRect();
        if (r.left >= navRect.right - 12 && r.width >= Math.max(260, dlgRect.width * 0.42) && r.height >= 200) {
          const area = r.width * r.height;
          if (area > bestArea) {
            bestArea = area;
            best = sib;
          }
        }
      }
      if (best) return best;
      cur = parent;
    }
    return null;
  }

  function preserveNativeCloseButton(contentHost) {
    if (!contentHost) return;
    const children = contentHost.children;
    for (let i = 0; i < children.length; i++) {
      const ch = children[i];
      if (ch.id === PANE_ID) continue;
      const aria = (ch.getAttribute('aria-label') || '').toLowerCase();
      const isDirectCloseBtn = ch.tagName === 'BUTTON' &&
        (aria.includes('close') || aria.includes('关闭') || (!ch.textContent.trim() && ch.querySelector('svg')));
      if (isDirectCloseBtn) {
        ch.setAttribute('data-aglaunch-keep', '1');
        continue;
      }
      const rect = ch.getBoundingClientRect();
      if (rect.width > 0 && rect.width <= 64 && rect.height > 0 && rect.height <= 64 && ch.querySelector('button svg')) {
        ch.setAttribute('data-aglaunch-keep', '1');
      }
    }
  }

  function syncPaneMaxHeight() {
    if (!activePane || !activePane.isConnected) return;
    const hostRect = activeContentHost && activeContentHost.isConnected
      ? activeContentHost.getBoundingClientRect()
      : null;
    const dlgRect = activeDialog && activeDialog.isConnected
      ? activeDialog.getBoundingClientRect()
      : null;
    const h = (hostRect && hostRect.height > 120)
      ? hostRect.height
      : (dlgRect && dlgRect.height > 120 ? dlgRect.height : window.innerHeight * 0.85);
    if (h > 120) {
      activePane.style.maxHeight = Math.floor(h) + 'px';
    }
  }

  function createRocketSvg(templateSvg) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    if (templateSvg) {
      const cls = templateSvg.getAttribute('class');
      if (cls) svg.setAttribute('class', cls);
      const w = templateSvg.getAttribute('width');
      const h = templateSvg.getAttribute('height');
      if (w) svg.setAttribute('width', w);
      if (h) svg.setAttribute('height', h);
    } else {
      svg.setAttribute('width', '16');
      svg.setAttribute('height', '16');
    }
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');

    const paths = [
      'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z',
      'M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z',
      'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0',
      'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5'
    ];
    for (let i = 0; i < paths.length; i++) {
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', paths[i]);
      svg.appendChild(p);
    }
    return svg;
  }

  function buildNavItemFromTemplate(templateItem, activeBg, activeColor) {
    const clone = templateItem.cloneNode(true);
    clone.setAttribute(NAV_ATTR, '1');
    clone.setAttribute('data-aglaunch-ui', 'settings-nav-item');
    clone.setAttribute('data-aglaunch-skip', '1');
    clone.removeAttribute('id');
    clone.removeAttribute('aria-current');
    if (clone.getAttribute('aria-selected') === 'true') {
      clone.setAttribute('aria-selected', 'false');
    }
    if (clone.getAttribute('data-state') === 'active') {
      clone.setAttribute('data-state', 'inactive');
    }

    if (activeBg) clone.style.setProperty('--agl-nav-active-bg', activeBg);
    if (activeColor) clone.style.setProperty('--agl-nav-active-fg', activeColor);

    const oldSvg = clone.querySelector('svg');
    if (oldSvg && oldSvg.parentNode) {
      oldSvg.parentNode.replaceChild(createRocketSvg(oldSvg), oldSvg);
    }

    const s = getStrings(state.i18n.enabled);
    let labelNode = null;
    const tw = document.createTreeWalker(clone, NodeFilter.SHOW_TEXT);
    let tn;
    while ((tn = tw.nextNode())) {
      if (tn.nodeValue && tn.nodeValue.trim()) {
        tn.nodeValue = s.navLabel;
        labelNode = tn;
        break;
      }
    }
    if (!labelNode) {
      const span = document.createElement('span');
      span.textContent = s.navLabel;
      clone.appendChild(span);
      labelNode = span.firstChild;
    }
    clone.__labelNode = labelNode;

    clone.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      activateLauncherTab();
    });

    return clone;
  }

  // --- Native-Style Grouped Row Helpers ---
  function formatPercent(val) {
    return Math.round(val * 100) + '%';
  }

  function createRow(withSub) {
    const row = document.createElement('div');
    row.className = 'agl-row';
    const left = document.createElement('div');
    left.className = 'agl-row-left';
    const textWrap = document.createElement('div');
    textWrap.className = 'agl-row-text';
    const label = document.createElement('div');
    label.className = 'agl-label';
    textWrap.appendChild(label);
    let sub = null;
    if (withSub) {
      sub = document.createElement('div');
      sub.className = 'agl-sub';
      textWrap.appendChild(sub);
    }
    left.appendChild(textWrap);
    const right = document.createElement('div');
    right.className = 'agl-row-right';
    row.appendChild(left);
    row.appendChild(right);
    return { row, left, textWrap, label, sub, right };
  }

  function createSwitch(onClick) {
    const sw = document.createElement('button');
    sw.type = 'button';
    sw.className = 'agl-switch';
    sw.setAttribute('role', 'switch');
    sw.setAttribute('aria-checked', 'false');
    sw.addEventListener('click', onClick);
    return sw;
  }

  function createPillBtn(onClick) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'agl-pill-btn';
    btn.addEventListener('click', onClick);
    return btn;
  }

  function createSeg(options, onSelect) {
    const wrap = document.createElement('div');
    wrap.className = 'agl-seg';
    const buttons = {};
    options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.val = opt.value;
      btn.addEventListener('click', () => onSelect(opt.value));
      wrap.appendChild(btn);
      buttons[opt.value] = btn;
    });
    return { wrap, buttons };
  }

  function createSliderRow(min, max, step, formatter, onInput) {
    const { row, label, right } = createRow(false);
    const wrap = document.createElement('div');
    wrap.className = 'agl-slider-wrap';
    const input = document.createElement('input');
    input.type = 'range';
    input.className = 'agl-slider';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    const valSpan = document.createElement('span');
    valSpan.className = 'agl-slider-val';
    input.addEventListener('input', () => {
      const next = Number(input.value);
      valSpan.textContent = formatter(next);
      onInput(next);
    });
    wrap.appendChild(input);
    wrap.appendChild(valSpan);
    right.appendChild(wrap);
    return { row, label, input, valSpan, formatter };
  }

  let splashPatchTimer = null;
  let pendingSplashPatch = null;

  function formatMediaSize(bytes) {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n <= 0) return '';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function updateSplashPatch(patch, debounce) {
    state.splash = Object.assign({}, state.splash, patch);
    if (debounce) {
      pendingSplashPatch = Object.assign(pendingSplashPatch || {}, patch);
      if (splashPatchTimer) clearTimeout(splashPatchTimer);
      splashPatchTimer = setTimeout(() => {
        splashPatchTimer = null;
        const toSend = pendingSplashPatch;
        pendingSplashPatch = null;
        if (toSend) {
          sendLauncherMsg({ type: 'splash:update-config', patch: toSend });
        }
      }, 180);
    } else {
      if (splashPatchTimer) {
        clearTimeout(splashPatchTimer);
        splashPatchTimer = null;
      }
      const merged = Object.assign(pendingSplashPatch || {}, patch);
      pendingSplashPatch = null;
      sendLauncherMsg({ type: 'splash:update-config', patch: merged });
    }
    syncSettingsPaneUI();
  }

  function updateSkinPatch(patch, debounce) {
    state.skin = Object.assign({}, state.skin, patch);
    if (window.__AGL_SKIN__ && typeof window.__AGL_SKIN__.updateConfig === 'function') {
      window.__AGL_SKIN__.updateConfig(patch, { debounce: Boolean(debounce) });
    } else {
      sendLauncherMsg({ type: 'skin:update-config', patch });
    }
    syncSettingsPaneUI();
  }

  function updateThemePatch(patch) {
    const prevPreset = state.theme.preset || 'none';
    state.theme = Object.assign({}, state.theme, patch);
    if (window.__AGL_THEME__ && typeof window.__AGL_THEME__.updateConfig === 'function') {
      window.__AGL_THEME__.updateConfig(patch);
    } else {
      sendLauncherMsg({ type: 'theme:update-config', patch });
    }
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'preset') && patch.preset !== prevPreset) {
      const nextPreset = state.theme.preset || 'none';
      const targetPolarity = resolvePresetPolarity(nextPreset);
      syncNativeAppearanceSetting(targetPolarity || 'restore');
    }
    syncSettingsPaneUI();
  }

  function resolvePresetPolarity(presetId) {
    if (!presetId || presetId === 'none') return '';
    const list = getThemePresetsList();
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === presetId) {
        if (list[i].polarity) return list[i].polarity;
      }
    }
    if (presetId === 'aurora' || presetId === 'cyber') return 'dark';
    if (presetId === 'washi' || presetId === 'botanical' || presetId === 'pixel') return 'light';
    return '';
  }

  function isElementSelectedOption(el) {
    if (!el) return false;
    if (el.getAttribute('aria-checked') === 'true' ||
        el.getAttribute('aria-selected') === 'true' ||
        el.getAttribute('aria-pressed') === 'true' ||
        el.getAttribute('data-active') === '1' ||
        el.getAttribute('data-active') === 'true' ||
        el.getAttribute('data-state') === 'checked' ||
        el.getAttribute('data-state') === 'on' ||
        el.getAttribute('data-state') === 'active') {
      return true;
    }
    const input = el.tagName === 'INPUT' ? el : (el.querySelector && el.querySelector('input[type="radio"]'));
    if (input && input.checked) return true;
    try {
      const bg = getComputedStyle(el).backgroundColor;
      if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
        return true;
      }
    } catch (_) {}
    return false;
  }

  // Matches Antigravity's native "外观 -> 主题" row with 3 icon-only segmented buttons: [Monitor/System, Sun/Light, Moon/Dark].
  function findThemeRowIconButtons(container) {
    if (!container) return null;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let tn;
    while ((tn = walker.nextNode())) {
      if (!tn.nodeValue || !isThemeRowLabel(tn.nodeValue)) continue;
      const parentEl = tn.parentElement;
      if (!parentEl || (parentEl.closest && parentEl.closest('[data-aglaunch-ui]'))) continue;

      // Walk up from the "主题 / Theme" label to find the row containing the 3 segmented icon buttons.
      let row = parentEl;
      for (let depth = 0; depth < 5 && row && row !== container; depth++) {
        const rawBtns = row.querySelectorAll('button, [role="radio"], [role="button"], [role="tab"]');
        const btns = [];
        for (let i = 0; i < rawBtns.length; i++) {
          const b = rawBtns[i];
          if (b.closest && b.closest('[data-aglaunch-ui]')) continue;
          btns.push(b);
        }
        if (btns.length === 3) {
          const map = {};
          for (let i = 0; i < btns.length; i++) {
            const b = btns[i];
            const svg = b.querySelector('svg');
            const svgClass = svg
              ? (typeof svg.className === 'string' ? svg.className : (svg.className && svg.className.baseVal) || '')
              : '';
            const pol = matchAppearanceIconButtonPolarity({
              text: b.textContent,
              ariaLabel: b.getAttribute('aria-label') || '',
              title: b.getAttribute('title') || '',
              value: b.getAttribute('data-value') || b.getAttribute('value') || '',
              svgClass
            });
            if (pol && !map[pol]) map[pol] = b;
          }
          // Guaranteed Antigravity visual order in "主题" row: [0]=System(Monitor), [1]=Light(Sun), [2]=Dark(Moon)
          if (!map.system && !map.light && !map.dark) {
            map.system = btns[0];
            map.light = btns[1];
            map.dark = btns[2];
          } else {
            const used = new Set(Object.values(map));
            const remaining = btns.filter((b) => !used.has(b));
            if (!map.system && remaining.length) map.system = remaining.shift();
            if (!map.light && remaining.length) map.light = remaining.shift();
            if (!map.dark && remaining.length) map.dark = remaining.shift();
          }
          if (map.light && map.dark) return map;
        }
        row = row.parentElement;
      }
    }
    return null;
  }

  function findInlineAppearanceOptions(container) {
    if (!container) return null;
    const candidates = container.querySelectorAll('button, [role="radio"], [role="option"], [role="tab"], [role="button"], label');
    const byParent = new Map();
    const byGrandParent = new Map();
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates[i];
      if (el.closest && el.closest('[data-aglaunch-ui]')) continue;
      const pol = matchAppearanceOptionPolarity(el.textContent);
      if (!pol) continue;
      const p1 = el.parentElement;
      const p2 = p1 && p1.parentElement;
      if (p1) {
        let e1 = byParent.get(p1);
        if (!e1) { e1 = {}; byParent.set(p1, e1); }
        if (!e1[pol]) e1[pol] = el;
      }
      if (p2) {
        let e2 = byGrandParent.get(p2);
        if (!e2) { e2 = {}; byGrandParent.set(p2, e2); }
        if (!e2[pol]) e2[pol] = el;
      }
    }
    for (const entry of byParent.values()) {
      if (entry.light && entry.dark) return entry;
    }
    for (const entry of byGrandParent.values()) {
      if (entry.light && entry.dark) return entry;
    }
    return null;
  }

  function findAppearanceSelect(container) {
    if (!container) return null;
    const selects = container.querySelectorAll('select');
    for (let i = 0; i < selects.length; i++) {
      const sel = selects[i];
      if (sel.closest && sel.closest('[data-aglaunch-ui]')) continue;
      const map = {};
      for (let j = 0; j < sel.options.length; j++) {
        const opt = sel.options[j];
        const pol = matchAppearanceOptionPolarity(opt.textContent) || matchAppearanceOptionPolarity(opt.value);
        if (pol && !map[pol]) map[pol] = opt.value;
      }
      if (map.light && map.dark) return { select: sel, map };
    }
    return null;
  }

  function findAppearanceCombobox(container) {
    if (!container) return null;
    const triggers = container.querySelectorAll('button[role="combobox"], button[aria-haspopup], [role="combobox"], button');
    let fallback = null;
    for (let i = 0; i < triggers.length; i++) {
      const btn = triggers[i];
      if (btn.closest && btn.closest('[data-aglaunch-ui]')) continue;
      const pol = matchAppearanceOptionPolarity(btn.textContent);
      if (!pol) continue;
      const hasPopup = btn.getAttribute('role') === 'combobox' ||
        btn.hasAttribute('aria-haspopup') ||
        btn.hasAttribute('aria-expanded');
      if (hasPopup) return { trigger: btn, currentPolarity: pol };
      if (!fallback) fallback = { trigger: btn, currentPolarity: pol };
    }
    return fallback;
  }

  function setReactSelectValue(selectEl, value) {
    const desc = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value');
    if (desc && typeof desc.set === 'function') {
      desc.set.call(selectEl, value);
    } else {
      selectEl.value = value;
    }
    selectEl.dispatchEvent(new Event('input', { bubbles: true }));
    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function triggerNativeClick(el) {
    if (!el) return;
    try {
      el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
    } catch (_) {}
    el.click();
  }

  function tryApplyAppearanceInHost(desiredPolarity) {
    if (!activeContentHost || !activeContentHost.isConnected) return false;

    // 0. Native Antigravity "主题" row with 3 icon-only buttons: [System/Monitor, Light/Sun, Dark/Moon]
    const themeIconBtns = findThemeRowIconButtons(activeContentHost);
    if (themeIconBtns) {
      if (savedNativeAppearance === null && desiredPolarity !== 'restore') {
        if (isElementSelectedOption(themeIconBtns.system)) savedNativeAppearance = 'system';
        else if (isElementSelectedOption(themeIconBtns.light)) savedNativeAppearance = 'light';
        else if (isElementSelectedOption(themeIconBtns.dark)) savedNativeAppearance = 'dark';
      }
      const targetKey = desiredPolarity === 'restore' ? (savedNativeAppearance || 'system') : desiredPolarity;
      const targetEl = themeIconBtns[targetKey];
      if (targetEl) {
        targetEl.click();
        if (desiredPolarity === 'restore') savedNativeAppearance = null;
        return true;
      }
    }

    // 1. Inline segmented buttons / radio buttons / visual theme cards (Light | Dark | System)
    const inlineOpts = findInlineAppearanceOptions(activeContentHost);
    if (inlineOpts) {
      if (savedNativeAppearance === null && desiredPolarity !== 'restore') {
        if (isElementSelectedOption(inlineOpts.system)) savedNativeAppearance = 'system';
        else if (isElementSelectedOption(inlineOpts.light)) savedNativeAppearance = 'light';
        else if (isElementSelectedOption(inlineOpts.dark)) savedNativeAppearance = 'dark';
      }
      const targetKey = desiredPolarity === 'restore' ? (savedNativeAppearance || 'system') : desiredPolarity;
      const targetEl = inlineOpts[targetKey];
      if (targetEl) {
        if (!isElementSelectedOption(targetEl)) {
          triggerNativeClick(targetEl);
        }
        if (desiredPolarity === 'restore') savedNativeAppearance = null;
        return true;
      }
    }

    // 2. Native <select> dropdown
    const selInfo = findAppearanceSelect(activeContentHost);
    if (selInfo) {
      if (savedNativeAppearance === null && desiredPolarity !== 'restore') {
        const curVal = selInfo.select.value;
        for (const k of ['system', 'light', 'dark']) {
          if (selInfo.map[k] === curVal) {
            savedNativeAppearance = k;
            break;
          }
        }
      }
      const targetKey = desiredPolarity === 'restore' ? (savedNativeAppearance || 'system') : desiredPolarity;
      const targetVal = selInfo.map[targetKey];
      if (targetVal !== undefined) {
        if (selInfo.select.value !== targetVal) {
          setReactSelectValue(selInfo.select, targetVal);
        }
        if (desiredPolarity === 'restore') savedNativeAppearance = null;
        return true;
      }
    }

    // 3. Custom Radix / popup combobox dropdown
    const combo = findAppearanceCombobox(activeContentHost);
    if (combo) {
      if (savedNativeAppearance === null && desiredPolarity !== 'restore') {
        savedNativeAppearance = combo.currentPolarity;
      }
      const targetKey = desiredPolarity === 'restore' ? (savedNativeAppearance || 'system') : desiredPolarity;
      if (combo.currentPolarity === targetKey) {
        if (desiredPolarity === 'restore') savedNativeAppearance = null;
        return true;
      }
      triggerNativeClick(combo.trigger);
      setTimeout(() => {
        const popOpts = document.querySelectorAll('[role="option"], [role="menuitem"], [role="menuitemradio"], [data-radix-popper-content-wrapper] button, [role="listbox"] button, [role="menu"] button');
        for (let i = 0; i < popOpts.length; i++) {
          const opt = popOpts[i];
          if (opt === combo.trigger) continue;
          if (opt.closest && opt.closest('[data-aglaunch-ui]')) continue;
          if (matchAppearanceOptionPolarity(opt.textContent) === targetKey) {
            triggerNativeClick(opt);
            if (desiredPolarity === 'restore') savedNativeAppearance = null;
            break;
          }
        }
      }, 65);
      return true;
    }

    return false;
  }

  function findAppearanceTabButton() {
    if (activeNavContainer && activeNavContainer.isConnected) {
      const children = activeNavContainer.children;
      for (let i = 0; i < children.length; i++) {
        const ch = children[i];
        if (ch.hasAttribute(NAV_ATTR)) continue;
        if (isAppearanceTabLabel(ch.textContent)) {
          return ch.matches('button, [role="tab"], a') ? ch : (ch.querySelector('button, [role="tab"], a') || ch);
        }
      }
    }
    if (activeDialog && activeDialog.isConnected) {
      const btns = activeDialog.querySelectorAll('button, [role="tab"], a');
      for (let i = 0; i < btns.length; i++) {
        const b = btns[i];
        if (b.closest && b.closest('[data-aglaunch-ui]')) continue;
        if (isAppearanceTabLabel(b.textContent)) return b;
      }
    }
    return null;
  }

  // Silently syncs Antigravity's native Settings -> Appearance -> Theme (Light / Dark)
  // while keeping the Launcher Settings pane visible (zero tab flash).
  function syncNativeAppearanceSetting(desiredPolarity) {
    if (pendingAppearanceSyncTimer) {
      clearTimeout(pendingAppearanceSyncTimer);
      pendingAppearanceSyncTimer = null;
    }
    if (!desiredPolarity) return;
    if (desiredPolarity === 'restore' && !savedNativeAppearance) return;
    if (!activeDialog || !activeDialog.isConnected || !activeContentHost) return;

    // If the hidden native Appearance view is already mounted, apply immediately.
    if (tryApplyAppearanceInHost(desiredPolarity)) {
      setTimeout(() => syncSettingsPaneUI(), 100);
      return;
    }

    const appearanceBtn = findAppearanceTabButton();
    if (!appearanceBtn) return;

    // Silently switch React's hidden native tab to "外观 (Appearance)" without leaving Launcher Settings.
    suppressNavDeactivate = true;
    try {
      appearanceBtn.click();
    } finally {
      suppressNavDeactivate = false;
    }

    let attempts = 0;
    const poll = () => {
      attempts++;
      if (tryApplyAppearanceInHost(desiredPolarity)) {
        pendingAppearanceSyncTimer = null;
        setTimeout(() => syncSettingsPaneUI(), 100);
        return;
      }
      if (attempts < 8) {
        pendingAppearanceSyncTimer = setTimeout(poll, 50);
      } else {
        pendingAppearanceSyncTimer = null;
      }
    };
    pendingAppearanceSyncTimer = setTimeout(poll, 45);
  }

  function getThemePresetsList() {
    if (window.__AGL_THEME__ && typeof window.__AGL_THEME__.getPresets === 'function') {
      const list = window.__AGL_THEME__.getPresets();
      if (Array.isArray(list) && list.length > 0) return list;
    }
    return FALLBACK_THEME_PRESETS;
  }

  function updateI18nPatch(patch) {
    state.i18n = Object.assign({}, state.i18n, patch);
    if (window.__AGL_I18N__ && typeof window.__AGL_I18N__.applyConfig === 'function') {
      window.__AGL_I18N__.applyConfig(state.i18n);
    }
    sendLauncherMsg({ type: 'i18n:update-config', patch });
    syncSettingsPaneUI();
  }

  function buildSettingsPane() {
    const pane = document.createElement('div');
    pane.id = PANE_ID;
    pane.setAttribute('data-aglaunch-ui', 'settings-pane');
    pane.setAttribute('data-aglaunch-skip', '1');

    const inner = document.createElement('div');
    inner.className = 'agl-inner';

    // Page header (minimal, identical to native "常规" header)
    const pageHead = document.createElement('div');
    pageHead.className = 'agl-page-head';
    const titleEl = document.createElement('h2');
    titleEl.className = 'agl-page-title';
    const subtitleEl = document.createElement('p');
    subtitleEl.className = 'agl-page-sub';
    pageHead.appendChild(titleEl);
    pageHead.appendChild(subtitleEl);
    inner.appendChild(pageHead);

    // Optional notice toast
    const noticeEl = document.createElement('div');
    noticeEl.className = 'agl-notice';
    inner.appendChild(noticeEl);

    // --- Section 1: 界面汉化 ---
    const i18nSec = document.createElement('section');
    i18nSec.className = 'agl-section';
    const i18nSecTitle = document.createElement('div');
    i18nSecTitle.className = 'agl-section-title';
    const i18nGroup = document.createElement('div');
    i18nGroup.className = 'agl-group';

    const i18nEnableRow = createRow(true);
    const i18nEnableSwitch = createSwitch(() => updateI18nPatch({ enabled: !state.i18n.enabled }));
    i18nEnableRow.right.appendChild(i18nEnableSwitch);

    const i18nAutoRow = createRow(true);
    const i18nAutoSwitch = createSwitch(() => updateI18nPatch({ autoTranslate: !state.i18n.autoTranslate }));
    i18nAutoRow.right.appendChild(i18nAutoSwitch);

    const dictCacheRow = createRow(true);
    const clearCacheBtn = createPillBtn(() => sendLauncherMsg({ type: 'i18n:clear-cache' }));
    const exportDictBtn = createPillBtn(() => sendLauncherMsg({ type: 'i18n:export-dict' }));
    dictCacheRow.right.appendChild(clearCacheBtn);
    dictCacheRow.right.appendChild(exportDictBtn);

    i18nGroup.appendChild(i18nEnableRow.row);
    i18nGroup.appendChild(i18nAutoRow.row);
    i18nGroup.appendChild(dictCacheRow.row);
    i18nSec.appendChild(i18nSecTitle);
    i18nSec.appendChild(i18nGroup);
    inner.appendChild(i18nSec);

    // --- Section 1.5: 预设主题（5 套内置方案 + 全套图标替换） ---
    const themeSec = document.createElement('section');
    themeSec.className = 'agl-section';
    const themeSecTitle = document.createElement('div');
    themeSecTitle.className = 'agl-section-title';
    const themeGroup = document.createElement('div');
    themeGroup.className = 'agl-group';

    const themeGridWrap = document.createElement('div');
    themeGridWrap.className = 'agl-theme-grid-wrap';
    const themeGrid = document.createElement('div');
    themeGrid.className = 'agl-theme-grid';

    const themeCards = {};
    const cardItems = [
      {
        id: 'none',
        previewGradient: 'linear-gradient(135deg, #1b1e28 0%, #272b38 50%, #f1f5f9 50%, #e2e8f0 100%)',
        accentHex: '#5b8def',
        secondaryHex: '#94a3b8',
        surfaceHex: 'rgba(127,127,127,0.22)',
        isDefault: true
      }
    ].concat(getThemePresetsList());

    cardItems.forEach((item) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'agl-theme-card';
      card.dataset.presetId = item.id;

      const swatch = document.createElement('div');
      swatch.className = 'agl-theme-swatch';
      swatch.style.background = item.previewGradient;

      const side = document.createElement('div');
      side.className = 'agl-theme-swatch-side';
      side.style.background = item.surfaceHex;
      const ctaBar = document.createElement('div');
      ctaBar.className = 'agl-theme-swatch-bar';
      ctaBar.style.background = item.accentHex;
      const line1 = document.createElement('div');
      line1.className = 'agl-theme-swatch-bar';
      line1.style.background = item.secondaryHex;
      line1.style.width = '70%';
      line1.style.opacity = '0.5';
      const line2 = document.createElement('div');
      line2.className = 'agl-theme-swatch-bar';
      line2.style.background = item.secondaryHex;
      line2.style.width = '55%';
      line2.style.opacity = '0.35';
      side.appendChild(ctaBar);
      side.appendChild(line1);
      side.appendChild(line2);

      const main = document.createElement('div');
      main.className = 'agl-theme-swatch-main';
      const dots = document.createElement('div');
      dots.className = 'agl-theme-swatch-dots';
      const d1 = document.createElement('span');
      d1.className = 'agl-theme-swatch-dot';
      d1.style.background = item.accentHex;
      const d2 = document.createElement('span');
      d2.className = 'agl-theme-swatch-dot';
      d2.style.background = item.secondaryHex;
      dots.appendChild(d1);
      dots.appendChild(d2);

      const pill = document.createElement('div');
      pill.className = 'agl-theme-swatch-pill';
      pill.style.background = item.surfaceHex;
      pill.style.border = `1px solid ${item.accentHex}`;
      main.appendChild(dots);
      main.appendChild(pill);

      swatch.appendChild(side);
      swatch.appendChild(main);

      const meta = document.createElement('div');
      meta.className = 'agl-theme-meta';
      const nameEl = document.createElement('div');
      nameEl.className = 'agl-theme-name';
      const tagEl = document.createElement('div');
      tagEl.className = 'agl-theme-tag';
      meta.appendChild(nameEl);
      meta.appendChild(tagEl);

      card.appendChild(swatch);
      card.appendChild(meta);
      card.addEventListener('click', () => updateThemePatch({ preset: item.id }));

      themeGrid.appendChild(card);
      themeCards[item.id] = { card, nameEl, tagEl, item };
    });

    themeGridWrap.appendChild(themeGrid);

    const themeIconsRow = createRow(true);
    const themeIconsSwitch = createSwitch(() => updateThemePatch({ replaceIcons: !state.theme.replaceIcons }));
    themeIconsRow.right.appendChild(themeIconsSwitch);

    const themeBackdropRow = createRow(true);
    const themeBackdropSwitch = createSwitch(() => updateThemePatch({ useBackdrop: !state.theme.useBackdrop }));
    themeBackdropRow.right.appendChild(themeBackdropSwitch);

    themeGroup.appendChild(themeGridWrap);
    themeGroup.appendChild(themeIconsRow.row);
    themeGroup.appendChild(themeBackdropRow.row);
    themeSec.appendChild(themeSecTitle);
    themeSec.appendChild(themeGroup);
    inner.appendChild(themeSec);

    // --- Section 2: 自定义皮肤 ---
    const skinSec = document.createElement('section');
    skinSec.className = 'agl-section';
    const skinSecTitle = document.createElement('div');
    skinSecTitle.className = 'agl-section-title';
    const skinGroup = document.createElement('div');
    skinGroup.className = 'agl-group';

    const skinEnableRow = createRow(true);
    const skinEnableSwitch = createSwitch(() => {
      if (!state.skinImageDataUrl && !state.skin.enabled) {
        sendLauncherMsg({ type: 'skin:pick-image' });
        return;
      }
      updateSkinPatch({ enabled: !state.skin.enabled }, false);
    });
    skinEnableRow.right.appendChild(skinEnableSwitch);

    const skinImgRow = createRow(true);
    const thumbEl = document.createElement('div');
    thumbEl.className = 'agl-thumb';
    thumbEl.addEventListener('click', () => sendLauncherMsg({ type: 'skin:pick-image' }));
    skinImgRow.left.insertBefore(thumbEl, skinImgRow.textWrap);

    const pickImgBtn = createPillBtn(() => sendLauncherMsg({ type: 'skin:pick-image' }));
    const clearImgBtn = createPillBtn(() => sendLauncherMsg({ type: 'skin:clear-image' }));
    const floatPreviewBtn = createPillBtn(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      setTimeout(() => {
        if (window.__AGL_SKIN__ && typeof window.__AGL_SKIN__.openFloatingPanel === 'function') {
          window.__AGL_SKIN__.openFloatingPanel();
        }
      }, 60);
    });
    skinImgRow.right.appendChild(pickImgBtn);
    skinImgRow.right.appendChild(clearImgBtn);
    skinImgRow.right.appendChild(floatPreviewBtn);

    const modeRow = createRow(false);
    const modeSeg = createSeg([{ value: 'blend' }, { value: 'overlay' }], (val) => {
      if (state.skin.mode !== val) updateSkinPatch({ mode: val }, false);
    });
    modeRow.right.appendChild(modeSeg.wrap);

    const scopeRow = createRow(false);
    const scopeSeg = createSeg([{ value: 'full' }, { value: 'main' }], (val) => {
      if (state.skin.scope !== val) updateSkinPatch({ scope: val }, false);
    });
    scopeRow.right.appendChild(scopeSeg.wrap);

    const fitRow = createRow(false);
    const fitSeg = createSeg([{ value: 'cover' }, { value: 'contain' }, { value: 'fill' }], (val) => {
      updateSkinPatch({ fit: val }, false);
    });
    fitRow.right.appendChild(fitSeg.wrap);

    const posRow = createRow(false);
    const posSeg = createSeg(
      [{ value: 'center' }, { value: 'top' }, { value: 'bottom' }, { value: 'left' }, { value: 'right' }],
      (val) => updateSkinPatch({ position: val }, false)
    );
    posRow.right.appendChild(posSeg.wrap);

    const opacityCtrl = createSliderRow(0.1, 1.0, 0.01, formatPercent, (v) => updateSkinPatch({ opacity: v }, true));
    const scrimCtrl = createSliderRow(0.0, 0.85, 0.01, formatPercent, (v) => updateSkinPatch({ scrimOpacity: v }, true));
    const surfaceCtrl = createSliderRow(0.0, 0.9, 0.01, formatPercent, (v) => updateSkinPatch({ surfaceOpacity: v }, true));
    const overlayCtrl = createSliderRow(0.03, 0.5, 0.01, formatPercent, (v) => updateSkinPatch({ overlayOpacity: v }, true));
    const blurCtrl = createSliderRow(0, 24, 1, (v) => `${Math.round(v)}px`, (v) => updateSkinPatch({ blur: Math.round(v) }, true));

    const resetSkinRow = createRow(false);
    const resetSkinBtn = createPillBtn(() => sendLauncherMsg({ type: 'skin:reset-defaults' }));
    resetSkinRow.right.appendChild(resetSkinBtn);

    skinGroup.appendChild(skinEnableRow.row);
    skinGroup.appendChild(skinImgRow.row);
    skinGroup.appendChild(modeRow.row);
    skinGroup.appendChild(scopeRow.row);
    skinGroup.appendChild(fitRow.row);
    skinGroup.appendChild(posRow.row);
    skinGroup.appendChild(opacityCtrl.row);
    skinGroup.appendChild(scrimCtrl.row);
    skinGroup.appendChild(surfaceCtrl.row);
    skinGroup.appendChild(overlayCtrl.row);
    skinGroup.appendChild(blurCtrl.row);
    skinGroup.appendChild(resetSkinRow.row);
    skinSec.appendChild(skinSecTitle);
    skinSec.appendChild(skinGroup);
    inner.appendChild(skinSec);

    // --- Section 2.5: 启动动画 ---
    const splashSec = document.createElement('section');
    splashSec.className = 'agl-section';
    const splashSecTitle = document.createElement('div');
    splashSecTitle.className = 'agl-section-title';
    const splashGroup = document.createElement('div');
    splashGroup.className = 'agl-group';

    const splashEnableRow = createRow(true);
    const splashEnableSwitch = createSwitch(() => {
      const hasValid = Boolean(state.splash.mediaPath && state.meta.splashMeta && state.meta.splashMeta.valid);
      if (!hasValid && !state.splash.enabled) {
        sendLauncherMsg({ type: 'splash:pick-media' });
        return;
      }
      updateSplashPatch({ enabled: !state.splash.enabled }, false);
    });
    splashEnableRow.right.appendChild(splashEnableSwitch);

    const splashMediaRow = createRow(true);
    const splashBadgeEl = document.createElement('div');
    splashBadgeEl.className = 'agl-media-badge';
    splashBadgeEl.addEventListener('click', () => sendLauncherMsg({ type: 'splash:pick-media' }));
    splashMediaRow.left.insertBefore(splashBadgeEl, splashMediaRow.textWrap);

    const pickSplashBtn = createPillBtn(() => sendLauncherMsg({ type: 'splash:pick-media' }));
    const clearSplashBtn = createPillBtn(() => sendLauncherMsg({ type: 'splash:clear-media' }));
    const previewSplashBtn = createPillBtn(() => sendLauncherMsg({ type: 'splash:preview' }));
    splashMediaRow.right.appendChild(pickSplashBtn);
    splashMediaRow.right.appendChild(clearSplashBtn);
    splashMediaRow.right.appendChild(previewSplashBtn);

    const splashFitRow = createRow(false);
    const splashFitSeg = createSeg([{ value: 'cover' }, { value: 'contain' }], (val) => {
      if (state.splash.fit !== val) updateSplashPatch({ fit: val }, false);
    });
    splashFitRow.right.appendChild(splashFitSeg.wrap);

    const splashEndRow = createRow(false);
    const splashEndSeg = createSeg([{ value: 'loaded' }, { value: 'complete' }], (val) => {
      if (state.splash.endMode !== val) updateSplashPatch({ endMode: val }, false);
    });
    splashEndRow.right.appendChild(splashEndSeg.wrap);

    const splashMinDurCtrl = createSliderRow(0, 8, 0.5, (v) => `${Number(v).toFixed(1)}s`, (v) => {
      updateSplashPatch({ minDuration: v }, true);
    });

    const splashMutedRow = createRow(true);
    const splashMutedSwitch = createSwitch(() => updateSplashPatch({ muted: !state.splash.muted }, false));
    splashMutedRow.right.appendChild(splashMutedSwitch);

    const splashVolumeCtrl = createSliderRow(0, 1, 0.05, formatPercent, (v) => {
      updateSplashPatch({ volume: v }, true);
    });

    const resetSplashRow = createRow(false);
    const resetSplashBtn = createPillBtn(() => sendLauncherMsg({ type: 'splash:reset-defaults' }));
    resetSplashRow.right.appendChild(resetSplashBtn);

    splashGroup.appendChild(splashEnableRow.row);
    splashGroup.appendChild(splashMediaRow.row);
    splashGroup.appendChild(splashFitRow.row);
    splashGroup.appendChild(splashEndRow.row);
    splashGroup.appendChild(splashMinDurCtrl.row);
    splashGroup.appendChild(splashMutedRow.row);
    splashGroup.appendChild(splashVolumeCtrl.row);
    splashGroup.appendChild(resetSplashRow.row);
    splashSec.appendChild(splashSecTitle);
    splashSec.appendChild(splashGroup);
    inner.appendChild(splashSec);

    // --- Section 3: 通用 ---
    const genSec = document.createElement('section');
    genSec.className = 'agl-section';
    const genSecTitle = document.createElement('div');
    genSecTitle.className = 'agl-section-title';
    const genGroup = document.createElement('div');
    genGroup.className = 'agl-group';

    const configRow = createRow(true);
    const openDirBtn = createPillBtn(() => sendLauncherMsg({ type: 'launcher:open-config-dir' }));
    const homepageBtn = createPillBtn(() => sendLauncherMsg({ type: 'launcher:open-homepage' }));
    configRow.right.appendChild(openDirBtn);
    configRow.right.appendChild(homepageBtn);

    genGroup.appendChild(configRow.row);
    genSec.appendChild(genSecTitle);
    genSec.appendChild(genGroup);
    inner.appendChild(genSec);

    pane.appendChild(inner);

    pane.__refs = {
      titleEl,
      subtitleEl,
      noticeEl,
      i18nSecTitle,
      i18nEnableRow,
      i18nEnableSwitch,
      i18nAutoRow,
      i18nAutoSwitch,
      dictCacheRow,
      clearCacheBtn,
      exportDictBtn,
      themeSecTitle,
      themeCards,
      themeIconsRow,
      themeIconsSwitch,
      themeBackdropRow,
      themeBackdropSwitch,
      skinSecTitle,
      skinEnableRow,
      skinEnableSwitch,
      skinImgRow,
      thumbEl,
      pickImgBtn,
      clearImgBtn,
      floatPreviewBtn,
      modeRow,
      modeSeg,
      scopeRow,
      scopeSeg,
      fitRow,
      fitSeg,
      posRow,
      posSeg,
      opacityCtrl,
      scrimCtrl,
      surfaceCtrl,
      overlayCtrl,
      blurCtrl,
      resetSkinRow,
      resetSkinBtn,
      splashSecTitle,
      splashEnableRow,
      splashEnableSwitch,
      splashMediaRow,
      splashBadgeEl,
      pickSplashBtn,
      clearSplashBtn,
      previewSplashBtn,
      splashFitRow,
      splashFitSeg,
      splashEndRow,
      splashEndSeg,
      splashMinDurCtrl,
      splashMutedRow,
      splashMutedSwitch,
      splashVolumeCtrl,
      resetSplashRow,
      resetSplashBtn,
      genSecTitle,
      configRow,
      openDirBtn,
      homepageBtn
    };

    return pane;
  }

  function syncSettingsPaneUI() {
    const s = getStrings(state.i18n.enabled);
    const isDark = detectThemeDark();

    if (activeNavItem && activeNavItem.isConnected && activeNavItem.__labelNode) {
      activeNavItem.__labelNode.nodeValue = s.navLabel;
    }

    if (!activePane || !activePane.__refs) return;
    const r = activePane.__refs;
    activePane.setAttribute('data-theme', isDark ? 'dark' : 'light');

    r.titleEl.textContent = s.pageTitle;
    r.subtitleEl.textContent = s.pageSubtitle;

    if (currentNotice) {
      r.noticeEl.textContent = currentNotice.text;
      r.noticeEl.setAttribute('data-kind', currentNotice.kind || 'info');
      r.noticeEl.setAttribute('data-visible', '1');
    } else {
      r.noticeEl.removeAttribute('data-visible');
    }

    // Section 1: I18n
    r.i18nSecTitle.textContent = s.i18nSection;
    r.i18nEnableRow.label.textContent = s.i18nEnableLabel;
    r.i18nEnableRow.sub.textContent = s.i18nEnableSub;
    r.i18nEnableSwitch.setAttribute('aria-checked', state.i18n.enabled ? 'true' : 'false');

    r.i18nAutoRow.label.textContent = s.i18nAutoLabel;
    r.i18nAutoRow.sub.textContent = s.i18nAutoSub;
    r.i18nAutoSwitch.setAttribute('aria-checked', state.i18n.autoTranslate ? 'true' : 'false');
    r.i18nAutoSwitch.disabled = !state.i18n.enabled;

    r.dictCacheRow.label.textContent = s.dictCacheLabel;
    r.dictCacheRow.sub.textContent = s.dictCacheSub(state.meta.dictVersion || '2.35.2.3', state.meta.cacheCount || 0);
    r.clearCacheBtn.textContent = s.clearCache;
    r.exportDictBtn.textContent = s.exportDict;

    // Section 1.5: Preset Themes
    r.themeSecTitle.textContent = s.themeSection;
    const isPresetActive = state.theme.preset && state.theme.preset !== 'none';
    Object.keys(r.themeCards).forEach((id) => {
      const entry = r.themeCards[id];
      entry.card.dataset.active = (state.theme.preset || 'none') === id ? '1' : '0';
      if (entry.item.isDefault) {
        entry.nameEl.textContent = s.themeDefaultName;
        entry.tagEl.textContent = s.themeDefaultTag;
      } else {
        entry.nameEl.textContent = state.i18n.enabled ? entry.item.nameZh : entry.item.nameEn;
        entry.tagEl.textContent = state.i18n.enabled ? entry.item.tagZh : entry.item.tagEn;
      }
    });
    r.themeIconsRow.label.textContent = s.themeIconsLabel;
    r.themeIconsRow.sub.textContent = s.themeIconsSub;
    r.themeIconsSwitch.setAttribute('aria-checked', state.theme.replaceIcons ? 'true' : 'false');
    r.themeIconsSwitch.disabled = !isPresetActive;

    r.themeBackdropRow.label.textContent = s.themeBackdropLabel;
    const customSkinBlocking = Boolean(state.skin.enabled && state.skinImageDataUrl);
    r.themeBackdropRow.sub.textContent = customSkinBlocking ? s.themeBackdropOverridden : s.themeBackdropSub;
    r.themeBackdropSwitch.setAttribute('aria-checked', state.theme.useBackdrop ? 'true' : 'false');
    r.themeBackdropSwitch.disabled = !isPresetActive;

    // Section 2: Custom Skin
    r.skinSecTitle.textContent = s.skinSection;
    r.skinEnableRow.label.textContent = s.skinEnableLabel;
    r.skinEnableSwitch.setAttribute('aria-checked', state.skin.enabled ? 'true' : 'false');
    if (!state.skinImageDataUrl) {
      r.skinEnableRow.sub.textContent = s.skinStatusEmpty;
    } else if (!state.skin.enabled) {
      r.skinEnableRow.sub.textContent = s.skinStatusPaused;
    } else {
      r.skinEnableRow.sub.textContent = s.skinStatusActive(state.skin.mode, state.skin.scope);
    }

    r.skinImgRow.label.textContent = s.skinImageLabel;
    const imgErr = state.meta.skinMeta && state.meta.skinMeta.imageError;
    const imgName = state.meta.skinMeta && state.meta.skinMeta.imageName;
    if (imgErr) {
      r.skinImgRow.sub.textContent = imgErr;
      r.skinImgRow.sub.className = 'agl-sub error';
    } else {
      r.skinImgRow.sub.textContent = imgName || s.skinImageEmpty;
      r.skinImgRow.sub.title = state.skin.imagePath || imgName || '';
      r.skinImgRow.sub.className = 'agl-sub';
    }

    r.thumbEl.textContent = '';
    if (state.skinImageDataUrl) {
      const img = document.createElement('img');
      img.src = state.skinImageDataUrl;
      img.alt = imgName || 'skin';
      r.thumbEl.appendChild(img);
    } else {
      r.thumbEl.textContent = s.skinThumbEmpty;
    }

    r.pickImgBtn.textContent = s.skinPickBtn;
    r.clearImgBtn.textContent = s.skinClearBtn;
    r.clearImgBtn.disabled = !state.skin.imagePath && !state.skinImageDataUrl;
    r.floatPreviewBtn.textContent = s.skinFloatBtn;
    r.floatPreviewBtn.disabled = !state.skinImageDataUrl;

    r.modeRow.label.textContent = s.skinModeLabel;
    r.modeSeg.buttons.blend.textContent = s.skinModeBlend;
    r.modeSeg.buttons.overlay.textContent = s.skinModeOverlay;
    r.modeSeg.buttons.blend.dataset.active = state.skin.mode === 'blend' ? '1' : '0';
    r.modeSeg.buttons.overlay.dataset.active = state.skin.mode === 'overlay' ? '1' : '0';

    r.scopeRow.label.textContent = s.skinScopeLabel;
    r.scopeSeg.buttons.full.textContent = s.skinScopeFull;
    r.scopeSeg.buttons.main.textContent = s.skinScopeMain;
    r.scopeSeg.buttons.full.dataset.active = state.skin.scope === 'full' ? '1' : '0';
    r.scopeSeg.buttons.main.dataset.active = state.skin.scope === 'main' ? '1' : '0';

    r.fitRow.label.textContent = s.skinFitLabel;
    r.fitSeg.buttons.cover.textContent = s.skinFitCover;
    r.fitSeg.buttons.contain.textContent = s.skinFitContain;
    r.fitSeg.buttons.fill.textContent = s.skinFitFill;
    ['cover', 'contain', 'fill'].forEach((k) => {
      r.fitSeg.buttons[k].dataset.active = state.skin.fit === k ? '1' : '0';
    });

    r.posRow.label.textContent = s.skinPosLabel;
    r.posSeg.buttons.center.textContent = s.skinPosCenter;
    r.posSeg.buttons.top.textContent = s.skinPosTop;
    r.posSeg.buttons.bottom.textContent = s.skinPosBottom;
    r.posSeg.buttons.left.textContent = s.skinPosLeft;
    r.posSeg.buttons.right.textContent = s.skinPosRight;
    ['center', 'top', 'bottom', 'left', 'right'].forEach((k) => {
      r.posSeg.buttons[k].dataset.active = state.skin.position === k ? '1' : '0';
    });

    const isBlend = state.skin.mode === 'blend';
    const syncSlider = (ctrl, labelText, val, vis) => {
      ctrl.row.setAttribute('data-hidden', vis ? '0' : '1');
      ctrl.label.textContent = labelText;
      ctrl.input.value = String(val);
      ctrl.valSpan.textContent = ctrl.formatter(val);
    };
    syncSlider(r.opacityCtrl, s.skinOpacity, state.skin.opacity, isBlend);
    syncSlider(r.scrimCtrl, s.skinScrim, state.skin.scrimOpacity, isBlend);
    syncSlider(r.surfaceCtrl, s.skinSurface, state.skin.surfaceOpacity, isBlend);
    syncSlider(r.overlayCtrl, s.skinOverlayOpacity, state.skin.overlayOpacity, !isBlend);
    syncSlider(r.blurCtrl, s.skinBlur, state.skin.blur, true);

    r.resetSkinRow.label.textContent = s.skinResetLabel;
    r.resetSkinBtn.textContent = s.skinResetBtn;

    // Section 2.5: Startup Animation
    const sm = state.meta.splashMeta || {};
    const hasSplashFile = Boolean(state.splash.mediaPath);
    const hasValidSplash = Boolean(hasSplashFile && sm.valid);
    const isSplashVideo = !sm.mediaKind || sm.mediaKind === 'video';

    r.splashSecTitle.textContent = s.splashSection;
    r.splashEnableRow.label.textContent = s.splashEnableLabel;
    r.splashEnableSwitch.setAttribute('aria-checked', state.splash.enabled ? 'true' : 'false');
    if (!hasValidSplash) {
      r.splashEnableRow.sub.textContent = s.splashStatusEmpty;
    } else if (!state.splash.enabled) {
      r.splashEnableRow.sub.textContent = s.splashStatusPaused;
    } else {
      r.splashEnableRow.sub.textContent = s.splashStatusActive(
        state.splash.endMode,
        state.splash.minDuration,
        state.splash.muted,
        sm.mediaKind || 'video'
      );
    }

    r.splashMediaRow.label.textContent = s.splashMediaLabel;
    if (sm.mediaError) {
      r.splashMediaRow.sub.textContent = sm.mediaError;
      r.splashMediaRow.sub.className = 'agl-sub error';
    } else if (sm.mediaName) {
      const sz = formatMediaSize(sm.mediaSize);
      r.splashMediaRow.sub.textContent = sz ? `${sm.mediaName} · ${sz}` : sm.mediaName;
      r.splashMediaRow.sub.title = state.splash.mediaPath || sm.mediaName;
      r.splashMediaRow.sub.className = 'agl-sub';
    } else {
      r.splashMediaRow.sub.textContent = s.splashMediaEmpty;
      r.splashMediaRow.sub.title = '';
      r.splashMediaRow.sub.className = 'agl-sub';
    }

    r.splashBadgeEl.setAttribute('data-active', hasValidSplash ? '1' : '0');
    r.splashBadgeEl.textContent = '';
    if (hasValidSplash) {
      const ns = 'http://www.w3.org/2000/svg';
      const icon = document.createElementNS(ns, 'svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('fill', 'none');
      icon.setAttribute('stroke', 'currentColor');
      icon.setAttribute('stroke-width', '2');
      icon.setAttribute('stroke-linecap', 'round');
      icon.setAttribute('stroke-linejoin', 'round');
      if (sm.mediaKind === 'image') {
        const rect = document.createElementNS(ns, 'rect');
        rect.setAttribute('x', '3');
        rect.setAttribute('y', '3');
        rect.setAttribute('width', '18');
        rect.setAttribute('height', '18');
        rect.setAttribute('rx', '2');
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', 'm21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21');
        icon.appendChild(rect);
        icon.appendChild(path);
      } else {
        const poly = document.createElementNS(ns, 'polygon');
        poly.setAttribute('points', '6 3 20 12 6 21 6 3');
        icon.appendChild(poly);
      }
      const tag = document.createElement('span');
      tag.textContent = sm.mediaKind === 'image' ? s.splashBadgeImage : s.splashBadgeVideo;
      r.splashBadgeEl.appendChild(icon);
      r.splashBadgeEl.appendChild(tag);
    } else {
      r.splashBadgeEl.textContent = s.splashBadgeEmpty;
    }

    r.pickSplashBtn.textContent = s.splashPickBtn;
    r.clearSplashBtn.textContent = s.splashClearBtn;
    r.clearSplashBtn.disabled = !hasSplashFile;
    r.previewSplashBtn.textContent = s.splashPreviewBtn;
    r.previewSplashBtn.disabled = !hasValidSplash;

    r.splashFitRow.label.textContent = s.splashFitLabel;
    r.splashFitSeg.buttons.cover.textContent = s.splashFitCover;
    r.splashFitSeg.buttons.contain.textContent = s.splashFitContain;
    r.splashFitSeg.buttons.cover.dataset.active = state.splash.fit === 'cover' ? '1' : '0';
    r.splashFitSeg.buttons.contain.dataset.active = state.splash.fit === 'contain' ? '1' : '0';

    r.splashEndRow.row.setAttribute('data-hidden', isSplashVideo ? '0' : '1');
    r.splashEndRow.label.textContent = s.splashEndModeLabel;
    r.splashEndSeg.buttons.loaded.textContent = s.splashEndLoaded;
    r.splashEndSeg.buttons.complete.textContent = s.splashEndComplete;
    r.splashEndSeg.buttons.loaded.dataset.active = state.splash.endMode === 'loaded' ? '1' : '0';
    r.splashEndSeg.buttons.complete.dataset.active = state.splash.endMode === 'complete' ? '1' : '0';

    const showMinDur = !isSplashVideo || state.splash.endMode !== 'complete';
    syncSlider(r.splashMinDurCtrl, s.splashMinDurationLabel, state.splash.minDuration, showMinDur);

    r.splashMutedRow.row.setAttribute('data-hidden', isSplashVideo ? '0' : '1');
    r.splashMutedRow.label.textContent = s.splashMutedLabel;
    r.splashMutedRow.sub.textContent = s.splashMutedSub;
    r.splashMutedSwitch.setAttribute('aria-checked', state.splash.muted ? 'true' : 'false');

    syncSlider(r.splashVolumeCtrl, s.splashVolumeLabel, state.splash.volume, isSplashVideo && !state.splash.muted);

    r.resetSplashRow.label.textContent = s.splashResetLabel;
    r.resetSplashBtn.textContent = s.splashResetBtn;

    // Section 3: General
    r.genSecTitle.textContent = s.generalSection;
    r.configRow.label.textContent = s.configDirLabel;
    r.configRow.sub.textContent = 'AntigravityZH v' + (state.meta.launcherVersion || '1.0.0');
    r.openDirBtn.textContent = s.openConfigDir;
    r.homepageBtn.textContent = s.homepage;
  }

  function activateLauncherTab() {
    if (!activeDialog || !activeNavItem || !activePane) return;
    isLauncherTabActive = true;
    activeDialog.setAttribute('data-aglaunch-settings-active', '1');
    activeNavItem.setAttribute('data-active', '1');
    activeNavItem.setAttribute('aria-selected', 'true');
    syncSettingsPaneUI();
    syncPaneMaxHeight();
  }

  function deactivateLauncherTab() {
    isLauncherTabActive = false;
    if (activeDialog && activeDialog.isConnected) {
      activeDialog.removeAttribute('data-aglaunch-settings-active');
    }
    if (activeNavItem && activeNavItem.isConnected) {
      activeNavItem.removeAttribute('data-active');
      activeNavItem.setAttribute('aria-selected', 'false');
    }
  }

  function ensureInjectedIntoSettings() {
    ensureStyles();
    const ctx = findSettingsContext();
    if (!ctx) {
      if (activeDialog && !activeDialog.isConnected) {
        activeDialog = null;
        activeNavContainer = null;
        activeContentHost = null;
        activeNavItem = null;
        activePane = null;
        isLauncherTabActive = false;
      }
      return false;
    }

    const { dialog, navContainer, browserNavItem, templateSibling, contentHost, activeBg, activeColor } = ctx;
    activeDialog = dialog;
    activeNavContainer = navContainer;
    activeContentHost = contentHost;
    navContainer.setAttribute('data-aglaunch-nav-container', '1');
    contentHost.setAttribute('data-aglaunch-content-host', '1');
    preserveNativeCloseButton(contentHost);

    if (!navContainer.__aglClickBound) {
      navContainer.__aglClickBound = true;
      navContainer.addEventListener('click', (ev) => {
        if (suppressNavDeactivate) return;
        const clickedLauncher = ev.target && ev.target.closest && ev.target.closest(`[${NAV_ATTR}="1"]`);
        if (!clickedLauncher && isLauncherTabActive) {
          deactivateLauncherTab();
        }
      }, true);
    }

    let navItem = navContainer.querySelector(`[${NAV_ATTR}="1"]`);
    if (!navItem) {
      navItem = buildNavItemFromTemplate(templateSibling, activeBg, activeColor);
      browserNavItem.parentNode.insertBefore(navItem, browserNavItem.nextSibling);
    } else if (navItem.previousElementSibling !== browserNavItem) {
      browserNavItem.parentNode.insertBefore(navItem, browserNavItem.nextSibling);
    }
    activeNavItem = navItem;

    let pane = contentHost.querySelector('#' + PANE_ID);
    if (!pane) {
      pane = buildSettingsPane();
      contentHost.appendChild(pane);
    }
    activePane = pane;

    if (pendingOpenLauncherTab) {
      pendingOpenLauncherTab = false;
      activateLauncherTab();
    } else if (isLauncherTabActive) {
      dialog.setAttribute('data-aglaunch-settings-active', '1');
      navItem.setAttribute('data-active', '1');
      syncPaneMaxHeight();
    }

    syncSettingsPaneUI();
    return true;
  }

  function scheduleSettingsCheck() {
    if (checkTimer) clearTimeout(checkTimer);
    checkTimer = setTimeout(() => {
      checkTimer = null;
      ensureInjectedIntoSettings();
    }, 90);
  }

  function openLauncherSettings() {
    if (ensureInjectedIntoSettings()) {
      activateLauncherTab();
      return;
    }
    pendingOpenLauncherTab = true;
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
    setTimeout(() => {
      if (!ensureInjectedIntoSettings()) {
        setTimeout(() => ensureInjectedIntoSettings(), 260);
      }
    }, 120);
  }

  function showNotice(text, kind) {
    currentNotice = { text: String(text || ''), kind: kind || 'info' };
    syncSettingsPaneUI();
    if (noticeTimer) clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => {
      noticeTimer = null;
      currentNotice = null;
      syncSettingsPaneUI();
    }, 3500);
  }

  function applyState(payload) {
    if (!payload || typeof payload !== 'object') return;
    if (payload.config && typeof payload.config === 'object') {
      if (payload.config.enabled !== undefined || payload.config.autoTranslate !== undefined) {
        state.i18n = Object.assign({}, state.i18n, payload.config);
      }
    }
    if (payload.skinConfig && typeof payload.skinConfig === 'object') {
      state.skin = Object.assign({}, state.skin, payload.skinConfig);
    }
    if (payload.themeConfig && typeof payload.themeConfig === 'object') {
      state.theme = Object.assign({}, state.theme, payload.themeConfig);
    }
    if (payload.splashConfig && typeof payload.splashConfig === 'object') {
      state.splash = Object.assign({}, state.splash, payload.splashConfig);
    }
    if (typeof payload.skinImageDataUrl === 'string') {
      state.skinImageDataUrl = payload.skinImageDataUrl;
    }
    if (payload.meta && typeof payload.meta === 'object') {
      state.meta = Object.assign({}, state.meta, payload.meta);
      if (payload.meta.skinMeta) {
        state.meta.skinMeta = Object.assign({}, state.meta.skinMeta, payload.meta.skinMeta);
      }
      if (payload.meta.splashMeta) {
        state.meta.splashMeta = Object.assign({}, state.meta.splashMeta, payload.meta.splashMeta);
      }
    }
    syncSettingsPaneUI();
  }

  window.__AGL_SETTINGS__ = {
    applyState,
    showNotice,
    open: openLauncherSettings
  };
  window.__AGL_OPEN_LAUNCHER_SETTINGS__ = openLauncherSettings;

  function boot() {
    if (!document.body) return;

    window.addEventListener('resize', () => {
      if (isLauncherTabActive) syncPaneMaxHeight();
    });

    if (window.__AGL_SKIN__ && typeof window.__AGL_SKIN__.subscribe === 'function') {
      window.__AGL_SKIN__.subscribe((snap) => {
        state.skin = Object.assign({}, snap.config);
        state.skinImageDataUrl = snap.imageDataUrl;
        state.meta.skinMeta = Object.assign({}, snap.meta);
        syncSettingsPaneUI();
      });
    }

    if (window.__AGL_THEME__ && typeof window.__AGL_THEME__.subscribe === 'function') {
      window.__AGL_THEME__.subscribe((snap) => {
        state.theme = Object.assign({}, snap.config);
        syncSettingsPaneUI();
      });
    }

    if (window.__AGL_I18N__ && typeof window.__AGL_I18N__.subscribe === 'function') {
      window.__AGL_I18N__.subscribe((cfg) => {
        state.i18n = Object.assign({}, cfg);
        syncSettingsPaneUI();
      });
    }

    ensureInjectedIntoSettings();

    const obs = new MutationObserver((mutations) => {
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type !== 'childList') continue;
        const target = m.target;
        if (target && target.nodeType === 1 && target.closest && target.closest('[data-aglaunch-ui]')) continue;
        if (m.addedNodes.length > 0 || m.removedNodes.length > 0) {
          scheduleSettingsCheck();
          break;
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
