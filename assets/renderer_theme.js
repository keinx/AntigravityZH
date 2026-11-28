'use strict';

// AntigravityZH Built-in Preset Theme & Custom Icon Pack Engine (Renderer)
// Provides 5 complete preset themes (Aurora Glass, Washi Ink, Cyber Nocturne, Botanical Studio, Retro Pixel OS),
// each with bespoke atmospheric SVG backdrops, full color/surface/radius styling, and 23 custom SVG icons (115 total).
// Icon replacement uses 100% React-safe attribute tagging + CSS data-URI background substitution (zero DOM mutations).

(function initRendererTheme() {
  const THEME_PRESET_IDS = Object.freeze(['none', 'aurora', 'washi', 'cyber', 'botanical', 'pixel']);

  const DEFAULT_THEME_CONFIG = Object.freeze({
    preset: 'none',       // 'none' | 'aurora' | 'washi' | 'cyber' | 'botanical' | 'pixel'
    replaceIcons: true,   // Replace UI icons with theme's custom 23-icon SVG pack
    useBackdrop: true     // Render theme's built-in atmospheric SVG backdrop (yields to custom image skin when active)
  });

  const ICON_KEYS = Object.freeze([
    'sidebarToggle',
    'navBack',
    'navForward',
    'search',
    'moreMenu',
    'newChat',
    'automation',
    'customize',
    'filter',
    'sync',
    'folder',
    'addConv',
    'settings',
    'quickWeb',
    'quickGemini',
    'quickMigrate',
    'deviceLocal',
    'checkout',
    'gitBranch',
    'attach',
    'permReview',
    'permDefault',
    'permAuto',
    'speed',
    'mic',
    'sendVoice'
  ]);

  const THEME_PRESETS = Object.freeze([
    {
      id: 'aurora',
      nameZh: '液态琉璃',
      nameEn: 'Aurora Glass',
      tagZh: '暗色 · 极光毛玻璃',
      tagEn: 'Dark · Liquid Glass',
      polarity: 'dark',
      previewGradient: 'linear-gradient(135deg, #0b1026 0%, #3b2678 46%, #0c4a6e 100%)',
      accentHex: '#8B5CF6',
      secondaryHex: '#38BDF8',
      surfaceHex: '#10152a',
      textHex: '#F2F5FF'
    },
    {
      id: 'washi',
      nameZh: '和纸水墨',
      nameEn: 'Washi Ink',
      tagZh: '浅色 · 东方留白',
      tagEn: 'Light · Sumi Washi',
      polarity: 'light',
      previewGradient: 'linear-gradient(135deg, #F6F1E7 0%, #EBE2D2 60%, #DDD2BE 100%)',
      accentHex: '#C83E2B',
      secondaryHex: '#4E7C68',
      surfaceHex: '#EFE8DB',
      textHex: '#1F1C18'
    },
    {
      id: 'cyber',
      nameZh: '赛博夜行',
      nameEn: 'Cyber Nocturne',
      tagZh: '暗色 · 霓虹 HUD',
      tagEn: 'Dark · Neon HUD',
      polarity: 'dark',
      previewGradient: 'linear-gradient(135deg, #050814 0%, #0d1633 55%, #230c2e 100%)',
      accentHex: '#00F0FF',
      secondaryHex: '#FF2A85',
      surfaceHex: '#080e1d',
      textHex: '#E8FAFF'
    },
    {
      id: 'botanical',
      nameZh: '森系手账',
      nameEn: 'Botanical Studio',
      tagZh: '浅色 · 奶油鼠尾草',
      tagEn: 'Light · Cream Sage',
      polarity: 'light',
      previewGradient: 'linear-gradient(135deg, #FAF6EE 0%, #EDF3E8 55%, #DFEAD7 100%)',
      accentHex: '#538462',
      secondaryHex: '#D97D54',
      surfaceHex: '#EEF3E9',
      textHex: '#27372B'
    },
    {
      id: 'pixel',
      nameZh: '像素复古',
      nameEn: 'Retro Pixel OS',
      tagZh: '复古 · 90s 像素',
      tagEn: 'Retro · 90s Pixel',
      polarity: 'light',
      previewGradient: 'linear-gradient(135deg, #EFE9D8 0%, #E2DAC6 65%, #D5CCB4 100%)',
      accentHex: '#FF4D1C',
      secondaryHex: '#2B59FF',
      surfaceHex: '#E2DAC6',
      textHex: '#171717'
    }
  ]);

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

  function getPresetById(id) {
    for (let i = 0; i < THEME_PRESETS.length; i++) {
      if (THEME_PRESETS[i].id === id) return THEME_PRESETS[i];
    }
    return null;
  }

  function encodeSvgDataUri(svgMarkup) {
    if (typeof svgMarkup !== 'string' || !svgMarkup.trim()) return '';
    let clean = svgMarkup.trim().replace(/\s+/g, ' ');
    if (!/xmlns=/.test(clean)) {
      clean = clean.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const encoded = clean
      .replace(/%/g, '%25')
      .replace(/#/g, '%23')
      .replace(/"/g, "'")
      .replace(/</g, '%3C')
      .replace(/>/g, '%3E');
    return `url("data:image/svg+xml,${encoded}")`;
  }

  // Explicit-color SVG icon packs (no currentColor, so data:image/svg+xml renders identically everywhere)
  const THEME_ICONS = Object.freeze({
    aurora: {
      sidebarToggle: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="16" rx="4" fill="#8B5CF6" fill-opacity="0.2" stroke="#CBD5FF" stroke-width="1.6"/><path d="M9 4.5v15" stroke="#38BDF8" stroke-width="1.6"/><circle cx="6" cy="9" r="1.1" fill="#A78BFA"/></svg>',
      navBack: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="#8B5CF6" fill-opacity="0.16"/><path d="M14.5 7.5L9.5 12l5 4.5" stroke="#CBD5FF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      navForward: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="#38BDF8" fill-opacity="0.16"/><path d="M9.5 7.5l5 4.5-5 4.5" stroke="#CBD5FF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      search: '<svg viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6.5" fill="#38BDF8" fill-opacity="0.2" stroke="#CBD5FF" stroke-width="1.6"/><path d="M15.6 15.6L20 20" stroke="#A78BFA" stroke-width="2" stroke-linecap="round"/></svg>',
      moreMenu: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="6" r="1.8" fill="#A78BFA"/><circle cx="12" cy="12" r="1.8" fill="#38BDF8"/><circle cx="12" cy="18" r="1.8" fill="#F472B6"/></svg>',
      newChat: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="6" fill="#38BDF8" fill-opacity="0.22" stroke="#C4B5FD" stroke-width="1.5"/><path d="M12 8v8M8 12h8" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round"/></svg>',
      automation: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" fill="#8B5CF6" fill-opacity="0.2" stroke="#A78BFA" stroke-width="1.5"/><path d="M12 7.5V12l3.2 2" stroke="#38BDF8" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="1.4" fill="#F472B6"/></svg>',
      customize: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l7.5 4.3v9.4L12 21l-7.5-4.3V7.3L12 3z" fill="#38BDF8" fill-opacity="0.2" stroke="#7DD3FC" stroke-width="1.5"/><path d="M12 12l7.2-4.2M12 12v8.8M12 12L4.8 7.8" stroke="#C4B5FD" stroke-width="1.4"/></svg>',
      filter: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16M7 12h10M10 18h4" stroke="#7DD3FC" stroke-width="1.8" stroke-linecap="round"/></svg>',
      sync: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 11A7.5 7.5 0 0118.2 7.2M19.5 13A7.5 7.5 0 015.8 16.8" stroke="#A78BFA" stroke-width="1.6" stroke-linecap="round"/><path d="M18.5 4.5v3.2h-3.2M5.5 19.5v-3.2h3.2" stroke="#38BDF8" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      folder: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 7.5A2.5 2.5 0 015.5 5h4.1l2 2.2h6.9A2.5 2.5 0 0121 9.7v7.8a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5v-10z" fill="#8B5CF6" fill-opacity="0.24" stroke="#A5B4FC" stroke-width="1.5"/><path d="M6.5 11.5h11" stroke="#38BDF8" stroke-opacity="0.75" stroke-width="1.3" stroke-linecap="round"/></svg>',
      addConv: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" fill="#38BDF8" fill-opacity="0.2" stroke="#7DD3FC" stroke-width="1.5"/><path d="M12 8.5v7M8.5 12h7" stroke="#FFFFFF" stroke-width="1.7" stroke-linecap="round"/></svg>',
      settings: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="7.5" fill="#8B5CF6" fill-opacity="0.18" stroke="#A78BFA" stroke-width="1.5" stroke-dasharray="3.2 2.2"/><circle cx="12" cy="12" r="3" fill="#38BDF8" fill-opacity="0.38" stroke="#7DD3FC" stroke-width="1.5"/></svg>',
      quickWeb: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="#38BDF8" fill-opacity="0.24" stroke="#7DD3FC" stroke-width="1.6"/><ellipse cx="12" cy="12" rx="4.2" ry="9" stroke="#C4B5FD" stroke-width="1.4"/><path d="M3.5 9.5h17M3.5 14.5h17" stroke="#F472B6" stroke-opacity="0.85" stroke-width="1.3"/></svg>',
      quickGemini: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.5C12.8 8 16 11.2 21.5 12 16 12.8 12.8 16 12 21.5 11.2 16 8 12.8 2.5 12 8 11.2 11.2 8 12 2.5z" fill="#A78BFA" fill-opacity="0.36" stroke="#E0E7FF" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.2" fill="#38BDF8"/></svg>',
      quickMigrate: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="8" height="14" rx="3" fill="#8B5CF6" fill-opacity="0.28" stroke="#A78BFA" stroke-width="1.5"/><rect x="13" y="5" width="8" height="14" rx="3" fill="#38BDF8" fill-opacity="0.28" stroke="#7DD3FC" stroke-width="1.5"/><path d="M9.5 12h5m0 0l-2-2m2 2l-2 2" stroke="#F472B6" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      deviceLocal: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4.5" width="18" height="12" rx="3" fill="#38BDF8" fill-opacity="0.2" stroke="#93C5FD" stroke-width="1.5"/><path d="M8.5 19.5h7M12 16.5v3" stroke="#A78BFA" stroke-width="1.6" stroke-linecap="round"/></svg>',
      checkout: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="4" fill="#8B5CF6" fill-opacity="0.2" stroke="#A5B4FC" stroke-width="1.5"/><path d="M9 12l2.2 2.2L15.5 9.8" stroke="#38BDF8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      gitBranch: '<svg viewBox="0 0 24 24" fill="none"><circle cx="7" cy="6.5" r="2.3" fill="#A78BFA" fill-opacity="0.38" stroke="#C4B5FD" stroke-width="1.5"/><circle cx="7" cy="17.5" r="2.3" fill="#38BDF8" fill-opacity="0.38" stroke="#7DD3FC" stroke-width="1.5"/><circle cx="17" cy="9.5" r="2.3" fill="#F472B6" fill-opacity="0.38" stroke="#F9A8D4" stroke-width="1.5"/><path d="M7 8.8v6.4M17 11.8c0 3-2.5 5.7-7.7 5.7" stroke="#CBD5FF" stroke-width="1.5" stroke-linecap="round"/></svg>',
      attach: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" fill="#8B5CF6" fill-opacity="0.18" stroke="#A5B4FC" stroke-width="1.5"/><path d="M12 8.2v7.6M8.2 12h7.6" stroke="#E0E7FF" stroke-width="1.7" stroke-linecap="round"/></svg>',
      permReview: '<svg viewBox="0 0 24 24" fill="none"><path d="M2.5 12s3.8-6.5 9.5-6.5S21.5 12 21.5 12s-3.8 6.5-9.5 6.5S2.5 12 2.5 12z" fill="#8B5CF6" fill-opacity="0.2" stroke="#A5B4FC" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="#38BDF8" fill-opacity="0.45" stroke="#7DD3FC" stroke-width="1.5"/></svg>',
      permDefault: '<svg viewBox="0 0 24 24" fill="none"><rect x="4.5" y="10.5" width="15" height="10" rx="3" fill="#8B5CF6" fill-opacity="0.22" stroke="#A5B4FC" stroke-width="1.5"/><path d="M8 10.5V7.5a4 4 0 018 0v3" stroke="#7DD3FC" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="15.5" r="1.4" fill="#F472B6"/></svg>',
      permAuto: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l7.5 3.2v5.6c0 4.6-3.2 8.2-7.5 9.5-4.3-1.3-7.5-4.9-7.5-9.5V6.2L12 3z" fill="#38BDF8" fill-opacity="0.2" stroke="#7DD3FC" stroke-width="1.5" stroke-linejoin="round"/><path d="M9.2 12.2l2 2 3.8-4.2" stroke="#C4B5FD" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      speed: '<svg viewBox="0 0 24 24" fill="none"><path d="M13 2.8L5.5 13h5.7L10.3 21.2 18.5 11h-5.7L13 2.8z" fill="#38BDF8" fill-opacity="0.3" stroke="#7DD3FC" stroke-width="1.5" stroke-linejoin="round"/></svg>',
      mic: '<svg viewBox="0 0 24 24" fill="none"><rect x="8.8" y="3.5" width="6.4" height="10.5" rx="3.2" fill="#F472B6" fill-opacity="0.28" stroke="#F9A8D4" stroke-width="1.5"/><path d="M5.8 11.5a6.2 6.2 0 0012.4 0M12 17.7V21" stroke="#A5B4FC" stroke-width="1.6" stroke-linecap="round"/></svg>',
      sendVoice: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12v0M8.5 8.5v7M12 5.5v13M15.5 8.5v7M19 12v0" stroke="#090B14" stroke-width="2.2" stroke-linecap="round"/></svg>'
    },
    washi: {
      sidebarToggle: '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="4.5" width="17" height="15" rx="1.5" stroke="#23201C" stroke-width="1.4"/><path d="M9.5 4.5v15" stroke="#23201C" stroke-width="1.4"/><rect x="5.5" y="8" width="2" height="5" fill="#C83E2B"/></svg>',
      navBack: '<svg viewBox="0 0 24 24" fill="none"><path d="M15 6.5c-2.5 2-4.5 3.8-6.5 5.5 2 1.7 4 3.5 6.5 5.5" stroke="#23201C" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      navForward: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 6.5c2.5 2 4.5 3.8 6.5 5.5-2 1.7-4 3.5-6.5 5.5" stroke="#23201C" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      search: '<svg viewBox="0 0 24 24" fill="none"><circle cx="10.5" cy="10.5" r="6" stroke="#23201C" stroke-width="1.5"/><path d="M15 15l4.8 4.8" stroke="#C83E2B" stroke-width="1.8" stroke-linecap="round"/></svg>',
      moreMenu: '<svg viewBox="0 0 24 24" fill="none"><rect x="10.6" y="4.8" width="2.8" height="2.8" fill="#23201C"/><rect x="10.6" y="10.6" width="2.8" height="2.8" fill="#C83E2B"/><rect x="10.6" y="16.4" width="2.8" height="2.8" fill="#23201C"/></svg>',
      newChat: '<svg viewBox="0 0 24 24" fill="none"><path d="M16.5 4.5l3 3-9.5 9.5-4 1 1-4 9.5-9.5z" stroke="#F7F2E8" stroke-width="1.6" stroke-linejoin="round"/><path d="M14.2 6.8l3 3" stroke="#E06D58" stroke-width="1.6"/></svg>',
      automation: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#23201C" stroke-width="1.4"/><circle cx="12" cy="12" r="1.6" fill="#C83E2B"/><path d="M12 6.5v3.8M12 12l4 2.2M12 4v1.2M12 18.8V20M4 12h1.2M18.8 12H20" stroke="#23201C" stroke-width="1.3" stroke-linecap="round"/></svg>',
      customize: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="1.5" stroke="#23201C" stroke-width="1.4"/><path d="M4 12h16M12 4v16" stroke="#23201C" stroke-width="1.2"/><rect x="13.8" y="6.2" width="4" height="4" fill="#C83E2B" fill-opacity="0.85"/></svg>',
      filter: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 6.5h15M7.5 12h9M10.5 17.5h3" stroke="#5F574C" stroke-width="1.5" stroke-linecap="round"/></svg>',
      sync: '<svg viewBox="0 0 24 24" fill="none"><path d="M5.5 10.5A7 7 0 0118 7.5M18.5 13.5A7 7 0 016 16.5" stroke="#5F574C" stroke-width="1.4" stroke-linecap="round"/><path d="M17.8 4.8l.6 3.1-3.1-.5M6.2 19.2l-.6-3.1 3.1.5" stroke="#C83E2B" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      folder: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 5.5h13a1.5 1.5 0 011.5 1.5v10a1.5 1.5 0 01-1.5 1.5h-13V5.5z" fill="#E8DFCE" stroke="#363029" stroke-width="1.35"/><path d="M8 5.5v13M5.5 9h2.5M5.5 15h2.5" stroke="#363029" stroke-width="1.2"/><rect x="11.5" y="8.5" width="4.5" height="2" fill="#C83E2B" fill-opacity="0.82"/></svg>',
      addConv: '<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="5" width="14" height="14" rx="1.5" stroke="#5F574C" stroke-width="1.3"/><path d="M12 8.5v7M8.5 12h7" stroke="#C83E2B" stroke-width="1.5" stroke-linecap="round"/></svg>',
      settings: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="7.5" stroke="#23201C" stroke-width="1.4"/><rect x="9.5" y="9.5" width="5" height="5" stroke="#C83E2B" stroke-width="1.4"/><path d="M12 2.8v2.2M12 19v2.2M2.8 12h2.2M19 12h2.2" stroke="#23201C" stroke-width="1.4"/></svg>',
      quickWeb: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" fill="#4E7C68" fill-opacity="0.14" stroke="#23201C" stroke-width="1.4"/><path d="M12 3.5v17M3.5 12h17" stroke="#4E7C68" stroke-width="1.2"/><path d="M12 7l2.5 5-2.5 5-2.5-5L12 7z" fill="#C83E2B" fill-opacity="0.88"/></svg>',
      quickGemini: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="6.8" r="2.8" fill="#C83E2B" fill-opacity="0.18" stroke="#C83E2B" stroke-width="1.3"/><circle cx="12" cy="17.2" r="2.8" fill="#C83E2B" fill-opacity="0.18" stroke="#C83E2B" stroke-width="1.3"/><circle cx="6.8" cy="12" r="2.8" fill="#C83E2B" fill-opacity="0.18" stroke="#C83E2B" stroke-width="1.3"/><circle cx="17.2" cy="12" r="2.8" fill="#C83E2B" fill-opacity="0.18" stroke="#C83E2B" stroke-width="1.3"/><circle cx="12" cy="12" r="2" fill="#C83E2B"/></svg>',
      quickMigrate: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 17l7.5-12L19 17l-7.5-3.2L4 17z" fill="#23201C" fill-opacity="0.1" stroke="#23201C" stroke-width="1.4" stroke-linejoin="round"/><path d="M11.5 5v8.8" stroke="#C83E2B" stroke-width="1.4"/></svg>',
      deviceLocal: '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="5" width="17" height="11" rx="1.5" stroke="#4A443B" stroke-width="1.4"/><path d="M8 19h8M12 16v3" stroke="#4A443B" stroke-width="1.4"/></svg>',
      checkout: '<svg viewBox="0 0 24 24" fill="none"><rect x="4.5" y="4.5" width="15" height="15" rx="1.5" stroke="#4A443B" stroke-width="1.4"/><path d="M8.5 12.2l2.4 2.4 4.8-5.2" stroke="#4E7C68" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      gitBranch: '<svg viewBox="0 0 24 24" fill="none"><circle cx="7" cy="6.5" r="2" stroke="#4A443B" stroke-width="1.4"/><circle cx="7" cy="17.5" r="2" stroke="#4A443B" stroke-width="1.4"/><circle cx="17" cy="9.5" r="2" fill="#C83E2B"/><path d="M7 8.5v7M17 11.5c0 3.2-2.5 6-8 6" stroke="#4A443B" stroke-width="1.4"/></svg>',
      attach: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5.5v13M5.5 12h13" stroke="#23201C" stroke-width="1.6" stroke-linecap="round"/></svg>',
      permReview: '<svg viewBox="0 0 24 24" fill="none"><path d="M2.8 12c2.4-4 5.5-6 9.2-6s6.8 2 9.2 6c-2.4 4-5.5 6-9.2 6s-6.8-2-9.2-6z" fill="#E8DFCE" fill-opacity="0.5" stroke="#23201C" stroke-width="1.4" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.6" stroke="#23201C" stroke-width="1.3"/><circle cx="12" cy="12" r="1.2" fill="#C83E2B"/></svg>',
      permDefault: '<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="10.5" width="14" height="9.5" rx="1.8" fill="#E8DFCE" stroke="#23201C" stroke-width="1.4"/><path d="M8.5 10.5V7.6a3.5 3.5 0 017 0v2.9" stroke="#23201C" stroke-width="1.4" stroke-linecap="round"/><rect x="11" y="13.8" width="2" height="3.2" fill="#C83E2B"/></svg>',
      permAuto: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.2l7 3v5.4c0 4.4-3 7.8-7 9.2-4-1.4-7-4.8-7-9.2V6.2l7-3z" fill="#4E7C68" fill-opacity="0.16" stroke="#23201C" stroke-width="1.4" stroke-linejoin="round"/><path d="M9.5 12l1.8 1.8 3.4-3.8" stroke="#4E7C68" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      speed: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 16c2-5 6.5-9 13.5-10.5-1.5 6.5-5.5 11-10.5 12.5L5 16z" fill="#4E7C68" fill-opacity="0.24" stroke="#4E7C68" stroke-width="1.4" stroke-linejoin="round"/></svg>',
      mic: '<svg viewBox="0 0 24 24" fill="none"><rect x="9" y="4" width="6" height="10" rx="3" stroke="#363029" stroke-width="1.4"/><path d="M6 11.5a6 6 0 0012 0M12 17.5V20.5" stroke="#363029" stroke-width="1.4" stroke-linecap="round"/></svg>',
      sendVoice: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" fill="#C83E2B"/><path d="M8 14.5v-5M12 16.5v-9M16 14.5v-5" stroke="#FAF5EB" stroke-width="1.8" stroke-linecap="square"/></svg>'
    },
    cyber: {
      sidebarToggle: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 4h16v13l-3 3H3V6l2-2z" stroke="#00F0FF" stroke-width="1.5"/><path d="M9.5 4v16" stroke="#FF2A85" stroke-width="1.5"/><path d="M5.5 9h2M5.5 12h2" stroke="#00F0FF" stroke-width="1.5"/></svg>',
      navBack: '<svg viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6M19 12H9.5" stroke="#00F0FF" stroke-width="1.6" stroke-linejoin="miter"/></svg>',
      navForward: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6M5 12h9.5" stroke="#00F0FF" stroke-width="1.6" stroke-linejoin="miter"/></svg>',
      search: '<svg viewBox="0 0 24 24" fill="none"><path d="M7.5 4h6l3.5 3.5v6L13.5 17h-6L4 13.5v-6L7.5 4z" stroke="#00F0FF" stroke-width="1.5"/><path d="M16 16l4.5 4.5" stroke="#FF2A85" stroke-width="2"/></svg>',
      moreMenu: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 4.5l2 2-2 2-2-2 2-2z" fill="#00F0FF"/><path d="M12 10l2 2-2 2-2-2 2-2z" fill="#FF2A85"/><path d="M12 15.5l2 2-2 2-2-2 2-2z" fill="#00F0FF"/></svg>',
      newChat: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 3h12l3 3v12l-3 3H6l-3-3V6l3-3z" fill="#00F0FF" fill-opacity="0.16" stroke="#00F0FF" stroke-width="1.5"/><path d="M12 7.5v9M7.5 12h9" stroke="#00F0FF" stroke-width="1.8"/></svg>',
      automation: '<svg viewBox="0 0 24 24" fill="none"><path d="M8 3.5h8l4.5 4.5v8L16 20.5H8L3.5 16V8L8 3.5z" stroke="#00F0FF" stroke-width="1.5"/><path d="M12 7v5l3.5 2.5" stroke="#FF2A85" stroke-width="1.7"/></svg>',
      customize: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" stroke="#00F0FF" stroke-width="1.5"/><path d="M12 8l3.5 2v4L12 16l-3.5-2v-4L12 8z" fill="#FF2A85" fill-opacity="0.38" stroke="#FF2A85" stroke-width="1.3"/></svg>',
      filter: '<svg viewBox="0 0 24 24" fill="none"><path d="M3.5 6h17l-5.5 6v6l-4 2v-8L3.5 6z" stroke="#00F0FF" stroke-width="1.5"/></svg>',
      sync: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 9l3-3h10l3 3M20 15l-3 3H7l-3-3" stroke="#00F0FF" stroke-width="1.5"/><path d="M17 3.5l3 2.5-3 2.5M7 15.5L4 18l3 2.5" stroke="#FF2A85" stroke-width="1.5"/></svg>',
      folder: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 6h6.5l2 2H21v10l-2 2H3V6z" fill="#00F0FF" fill-opacity="0.1" stroke="#00F0FF" stroke-width="1.4"/><rect x="6" y="12" width="3" height="1.8" fill="#FF2A85"/></svg>',
      addConv: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="#00F0FF" stroke-width="1.8"/></svg>',
      settings: '<svg viewBox="0 0 24 24" fill="none"><path d="M9 3.5h6l4.5 4.5v8L15 20.5H9L4.5 16V8L9 3.5z" stroke="#00F0FF" stroke-width="1.5"/><path d="M12 8.5l3 3.5-3 3.5-3-3.5 3-3.5z" stroke="#FF2A85" stroke-width="1.5"/></svg>',
      quickWeb: '<svg viewBox="0 0 24 24" fill="none"><path d="M8 3.5h8l4.5 4.5v8L16 20.5H8L3.5 16V8L8 3.5z" fill="#00F0FF" fill-opacity="0.14" stroke="#00F0FF" stroke-width="1.5"/><path d="M3.5 12h17M12 3.5v17" stroke="#00F0FF" stroke-opacity="0.6" stroke-width="1.2"/><rect x="10" y="10" width="4" height="4" fill="#FF2A85"/></svg>',
      quickGemini: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.5l3 6.5 6.5 3-6.5 3-3 6.5-3-6.5-6.5-3 6.5-3 3-6.5z" fill="#FF2A85" fill-opacity="0.24" stroke="#00F0FF" stroke-width="1.5"/><path d="M12 9l1.8 3-1.8 3-1.8-3L12 9z" fill="#FFB800"/></svg>',
      quickMigrate: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 6l5 6-5 6M10.5 6l5 6-5 6" stroke="#00F0FF" stroke-width="1.7"/><path d="M17.5 6h2.5v12h-2.5" stroke="#FF2A85" stroke-width="1.7"/></svg>',
      deviceLocal: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 5h18v11l-2 2H5l-2-2V5z" stroke="#00F0FF" stroke-width="1.4"/><path d="M8 21h8M12 18v3" stroke="#FF2A85" stroke-width="1.5"/></svg>',
      checkout: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 4h14l1 1v14l-1 1H5l-1-1V5l1-1z" stroke="#00F0FF" stroke-width="1.4"/><path d="M8 12l3 3 5-6" stroke="#FFB800" stroke-width="1.7"/></svg>',
      gitBranch: '<svg viewBox="0 0 24 24" fill="none"><rect x="5" y="4.5" width="4" height="4" stroke="#00F0FF" stroke-width="1.4"/><rect x="5" y="15.5" width="4" height="4" stroke="#00F0FF" stroke-width="1.4"/><rect x="15" y="8" width="4" height="4" stroke="#FF2A85" stroke-width="1.4"/><path d="M7 8.5v7M17 12v3.5l-2 2H9" stroke="#00F0FF" stroke-width="1.4"/></svg>',
      attach: '<svg viewBox="0 0 24 24" fill="none"><path d="M6 4h12l2 2v12l-2 2H6l-2-2V6l2-2z" stroke="#00F0FF" stroke-width="1.4"/><path d="M12 8v8M8 12h8" stroke="#FF2A85" stroke-width="1.7"/></svg>',
      permReview: '<svg viewBox="0 0 24 24" fill="none"><path d="M2.5 12L7 6.5h10L21.5 12 17 17.5H7L2.5 12z" fill="#00F0FF" fill-opacity="0.1" stroke="#00F0FF" stroke-width="1.5"/><path d="M12 9l3 3-3 3-3-3 3-3z" fill="#FF2A85"/></svg>',
      permDefault: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 10.5h14v8l-2 2H7l-2-2v-8z" fill="#00F0FF" fill-opacity="0.12" stroke="#00F0FF" stroke-width="1.5"/><path d="M8.5 10.5V7l2-2.5h3L15.5 7v3.5" stroke="#00F0FF" stroke-width="1.5"/><rect x="11" y="13.5" width="2" height="3.8" fill="#FF2A85"/></svg>',
      permAuto: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3l7.5 3v6.5L12 21l-7.5-8.5V6L12 3z" fill="#00F0FF" fill-opacity="0.12" stroke="#00F0FF" stroke-width="1.5"/><path d="M12 8l2.5 3.5L12 15l-2.5-3.5L12 8z" fill="#FF2A85"/></svg>',
      speed: '<svg viewBox="0 0 24 24" fill="none"><path d="M13.5 3L5 13h6l-1.5 8L19 11h-6l.5-8z" fill="#FFB800" fill-opacity="0.3" stroke="#FFB800" stroke-width="1.5"/></svg>',
      mic: '<svg viewBox="0 0 24 24" fill="none"><path d="M9.5 4h5l1 1v8l-1 1h-5l-1-1V5l1-1z" stroke="#00F0FF" stroke-width="1.5"/><path d="M6 12v2l2 2h8l2-2v-2M12 16v4.5" stroke="#FF2A85" stroke-width="1.5"/></svg>',
      sendVoice: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 10v4M8.5 7v10M12 4.5v15M15.5 7v10M19 10v4" stroke="#050914" stroke-width="2.1"/></svg>'
    },
    botanical: {
      sidebarToggle: '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="4.5" width="18" height="15" rx="4.5" fill="#DCE9D5" stroke="#2D4232" stroke-width="1.7"/><path d="M9.5 5v14" stroke="#2D4232" stroke-width="1.7"/><circle cx="6.2" cy="9.5" r="1.1" fill="#D97D54"/></svg>',
      navBack: '<svg viewBox="0 0 24 24" fill="none"><path d="M14.5 7L9 12l5.5 5" stroke="#2D4232" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      navForward: '<svg viewBox="0 0 24 24" fill="none"><path d="M9.5 7l5.5 5-5.5 5" stroke="#2D4232" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      search: '<svg viewBox="0 0 24 24" fill="none"><circle cx="10.8" cy="10.8" r="6" fill="#DCE9D5" stroke="#2D4232" stroke-width="1.8"/><path d="M15.4 15.4L19.8 19.8" stroke="#D97D54" stroke-width="2.2" stroke-linecap="round"/></svg>',
      moreMenu: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="6" r="1.8" fill="#538462"/><circle cx="12" cy="12" r="1.8" fill="#D97D54"/><circle cx="12" cy="18" r="1.8" fill="#538462"/></svg>',
      newChat: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" fill="#FFFFFF" fill-opacity="0.22"/><path d="M12 7.5v9M7.5 12h9" stroke="#FBF9F4" stroke-width="2.2" stroke-linecap="round"/></svg>',
      automation: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12.5" r="7.8" fill="#DCE9D5" stroke="#2D4232" stroke-width="1.7"/><path d="M12 8.5V12.5l3 1.8" stroke="#D97D54" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 3.2h4" stroke="#538462" stroke-width="1.8" stroke-linecap="round"/></svg>',
      customize: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="6.8" height="6.8" rx="2.5" fill="#B9D6BA" stroke="#2D4232" stroke-width="1.6"/><rect x="13.2" y="4" width="6.8" height="6.8" rx="2.5" fill="#F2C8AC" stroke="#2D4232" stroke-width="1.6"/><rect x="4" y="13.2" width="6.8" height="6.8" rx="2.5" fill="#F2DFB2" stroke="#2D4232" stroke-width="1.6"/><circle cx="16.6" cy="16.6" r="3.4" fill="#DCE9D5" stroke="#2D4232" stroke-width="1.6"/></svg>',
      filter: '<svg viewBox="0 0 24 24" fill="none"><path d="M4.5 7h15M7.5 12h9M10.5 17h3" stroke="#538462" stroke-width="2" stroke-linecap="round"/></svg>',
      sync: '<svg viewBox="0 0 24 24" fill="none"><path d="M5 11A7 7 0 0118 7.5M19 13A7 7 0 016 16.5" stroke="#538462" stroke-width="1.8" stroke-linecap="round"/><path d="M18.3 4.8v3h-3M5.7 19.2v-3h3" stroke="#D97D54" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      folder: '<svg viewBox="0 0 24 24" fill="none"><path d="M3 8a3 3 0 013-3h3.6l2 2.2H18a3 3 0 013 3v6.8a3 3 0 01-3 3H6a3 3 0 01-3-3V8z" fill="#D4E5CE" stroke="#36523D" stroke-width="1.6"/><path d="M13.5 14c1.2-1.8 3-2.5 4.2-2.2-.3 1.4-1.3 3-3 3.4-.5.1-1-.4-1.2-1.2z" fill="#538462"/></svg>',
      addConv: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" fill="#DCE9D5" stroke="#538462" stroke-width="1.6"/><path d="M12 8.8v6.4M8.8 12h6.4" stroke="#2D4232" stroke-width="1.8" stroke-linecap="round"/></svg>',
      settings: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="6.2" r="2.5" fill="#DCE9D5" stroke="#2D4232" stroke-width="1.5"/><circle cx="12" cy="17.8" r="2.5" fill="#DCE9D5" stroke="#2D4232" stroke-width="1.5"/><circle cx="6.2" cy="12" r="2.5" fill="#DCE9D5" stroke="#2D4232" stroke-width="1.5"/><circle cx="17.8" cy="12" r="2.5" fill="#DCE9D5" stroke="#2D4232" stroke-width="1.5"/><circle cx="12" cy="12" r="3.2" fill="#F2C8AC" stroke="#2D4232" stroke-width="1.6"/></svg>',
      quickWeb: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" fill="#CDE2CC" stroke="#2D4232" stroke-width="1.7"/><path d="M12 3.5c-2.5 2.4-3.8 5.2-3.8 8.5s1.3 6.1 3.8 8.5c2.5-2.4 3.8-5.2 3.8-8.5S14.5 5.9 12 3.5z" fill="#F4D3B6" fill-opacity="0.7" stroke="#2D4232" stroke-width="1.4"/><path d="M4 12h16" stroke="#2D4232" stroke-width="1.5"/></svg>',
      quickGemini: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3c1.2 5.2 3.8 7.8 9 9-5.2 1.2-7.8 3.8-9 9-1.2-5.2-3.8-7.8-9-9 5.2-1.2 7.8-3.8 9-9z" fill="#F2B892" stroke="#2D4232" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="12" r="2" fill="#538462"/></svg>',
      quickMigrate: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 19V9" stroke="#2D4232" stroke-width="1.8" stroke-linecap="round"/><path d="M12 11C12 6.8 15.2 4.5 19 4.8c-.2 3.8-2.6 6.2-7 6.2z" fill="#A6CFA8" stroke="#2D4232" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 14C12 10.6 9.3 8.5 5.5 8.8c.2 3.2 2.4 5.2 6.5 5.2z" fill="#F2C8AC" stroke="#2D4232" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      deviceLocal: '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="4.5" width="17" height="11.5" rx="3" fill="#DCE9D5" stroke="#36523D" stroke-width="1.6"/><path d="M8.5 19.2h7M12 16v3.2" stroke="#36523D" stroke-width="1.6" stroke-linecap="round"/></svg>',
      checkout: '<svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="5" fill="#DCE9D5" stroke="#36523D" stroke-width="1.6"/><path d="M8.5 12.2l2.3 2.3 4.8-5" stroke="#538462" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      gitBranch: '<svg viewBox="0 0 24 24" fill="none"><circle cx="7" cy="6.5" r="2.2" fill="#A6CFA8" stroke="#36523D" stroke-width="1.5"/><circle cx="7" cy="17.5" r="2.2" fill="#A6CFA8" stroke="#36523D" stroke-width="1.5"/><circle cx="17" cy="9.5" r="2.2" fill="#F2C8AC" stroke="#36523D" stroke-width="1.5"/><path d="M7 8.8v6.4M17 11.8c0 3.2-2.4 5.7-7.8 5.7" stroke="#36523D" stroke-width="1.6" stroke-linecap="round"/></svg>',
      attach: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8.5" fill="#DCE9D5" stroke="#36523D" stroke-width="1.6"/><path d="M12 8.5v7M8.5 12h7" stroke="#2D4232" stroke-width="1.9" stroke-linecap="round"/></svg>',
      permReview: '<svg viewBox="0 0 24 24" fill="none"><path d="M2.8 12s3.6-6 9.2-6 9.2 6 9.2 6-3.6 6-9.2 6-9.2-6-9.2-6z" fill="#DCE9D5" stroke="#2D4232" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.8" fill="#F2C8AC" stroke="#2D4232" stroke-width="1.6"/></svg>',
      permDefault: '<svg viewBox="0 0 24 24" fill="none"><rect x="4.5" y="10.2" width="15" height="10" rx="3.5" fill="#F2DFB2" stroke="#2D4232" stroke-width="1.7"/><path d="M8.2 10.2V7.6a3.8 3.8 0 017.6 0v2.6" stroke="#2D4232" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="15.2" r="1.6" fill="#538462"/></svg>',
      permAuto: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.2l7.2 3v5.5c0 4.5-3.1 8-7.2 9.2-4.1-1.2-7.2-4.7-7.2-9.2V6.2l7.2-3z" fill="#CDE2CC" stroke="#2D4232" stroke-width="1.7" stroke-linejoin="round"/><path d="M9.2 12.2l2 2 3.8-4.2" stroke="#538462" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      speed: '<svg viewBox="0 0 24 24" fill="none"><path d="M13 3L6 13h5.5L10.5 21 18 11h-5.5L13 3z" fill="#F2C8AC" stroke="#2D4232" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      mic: '<svg viewBox="0 0 24 24" fill="none"><rect x="8.8" y="3.5" width="6.4" height="10.2" rx="3.2" fill="#F2C8AC" stroke="#2D4232" stroke-width="1.6"/><path d="M6 11.5a6 6 0 0012 0M12 17.6V20.5" stroke="#2D4232" stroke-width="1.7" stroke-linecap="round"/></svg>',
      sendVoice: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#D97D54"/><path d="M6 12.5v-1M9.5 8.8v6.4M12.5 6.5v11M15.5 9.2v5.6M18.5 12.5v-1" stroke="#FFFBF6" stroke-width="2" stroke-linecap="round"/></svg>'
    },
    pixel: {
      sidebarToggle: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="1" y="2" width="14" height="12" fill="#1A1A1A"/><rect x="2" y="3" width="4" height="10" fill="#FFD43B"/><rect x="7" y="3" width="7" height="10" fill="#FFFDF7"/><rect x="3" y="5" width="2" height="1" fill="#1A1A1A"/><rect x="3" y="7" width="2" height="1" fill="#1A1A1A"/></svg>',
      navBack: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="8" y="3" width="2" height="2" fill="#1A1A1A"/><rect x="6" y="5" width="2" height="2" fill="#1A1A1A"/><rect x="4" y="7" width="9" height="2" fill="#1A1A1A"/><rect x="6" y="9" width="2" height="2" fill="#1A1A1A"/><rect x="8" y="11" width="2" height="2" fill="#1A1A1A"/></svg>',
      navForward: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="6" y="3" width="2" height="2" fill="#1A1A1A"/><rect x="8" y="5" width="2" height="2" fill="#1A1A1A"/><rect x="3" y="7" width="9" height="2" fill="#1A1A1A"/><rect x="8" y="9" width="2" height="2" fill="#1A1A1A"/><rect x="6" y="11" width="2" height="2" fill="#1A1A1A"/></svg>',
      search: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="2" width="6" height="2" fill="#1A1A1A"/><rect x="2" y="4" width="2" height="6" fill="#1A1A1A"/><rect x="10" y="4" width="2" height="6" fill="#1A1A1A"/><rect x="4" y="10" width="6" height="2" fill="#1A1A1A"/><rect x="4" y="4" width="6" height="6" fill="#7DD3FC"/><rect x="10" y="10" width="2" height="2" fill="#FF4D1C"/><rect x="12" y="12" width="2" height="2" fill="#FF4D1C"/></svg>',
      moreMenu: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="7" y="2" width="2" height="2" fill="#1A1A1A"/><rect x="7" y="7" width="2" height="2" fill="#FF4D1C"/><rect x="7" y="12" width="2" height="2" fill="#1A1A1A"/></svg>',
      newChat: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="1" y="1" width="14" height="14" fill="#FF4D1C"/><rect x="7" y="3" width="2" height="10" fill="#FFFDF7"/><rect x="3" y="7" width="10" height="2" fill="#FFFDF7"/></svg>',
      automation: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="5" y="1" width="6" height="2" fill="#1A1A1A"/><rect x="3" y="3" width="10" height="10" fill="#1A1A1A"/><rect x="4" y="4" width="8" height="8" fill="#FFD43B"/><rect x="7" y="5" width="2" height="4" fill="#1A1A1A"/><rect x="7" y="8" width="4" height="2" fill="#FF4D1C"/></svg>',
      customize: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="2" width="5" height="5" fill="#FF4D1C"/><rect x="9" y="2" width="5" height="5" fill="#2B59FF"/><rect x="2" y="9" width="5" height="5" fill="#22C55E"/><rect x="9" y="9" width="5" height="5" fill="#FFD43B"/><rect x="3" y="3" width="1" height="1" fill="#FFFFFF"/><rect x="10" y="3" width="1" height="1" fill="#FFFFFF"/></svg>',
      filter: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="3" width="12" height="2" fill="#1A1A1A"/><rect x="4" y="7" width="8" height="2" fill="#1A1A1A"/><rect x="6" y="11" width="4" height="2" fill="#FF4D1C"/></svg>',
      sync: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="2" width="8" height="2" fill="#1A1A1A"/><rect x="2" y="4" width="2" height="4" fill="#1A1A1A"/><rect x="11" y="4" width="3" height="2" fill="#2B59FF"/><rect x="4" y="12" width="8" height="2" fill="#1A1A1A"/><rect x="12" y="8" width="2" height="4" fill="#1A1A1A"/><rect x="2" y="10" width="3" height="2" fill="#FF4D1C"/></svg>',
      folder: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="1" y="3" width="6" height="2" fill="#1A1A1A"/><rect x="1" y="5" width="14" height="9" fill="#1A1A1A"/><rect x="2" y="4" width="4" height="2" fill="#FFD43B"/><rect x="2" y="6" width="12" height="7" fill="#FFD43B"/><rect x="2" y="6" width="12" height="1" fill="#FFF5B8"/><rect x="2" y="12" width="12" height="1" fill="#D99B00"/></svg>',
      addConv: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="2" width="12" height="12" fill="#1A1A1A"/><rect x="3" y="3" width="10" height="10" fill="#FFFDF7"/><rect x="7" y="5" width="2" height="6" fill="#FF4D1C"/><rect x="5" y="7" width="6" height="2" fill="#FF4D1C"/></svg>',
      settings: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="6" y="1" width="4" height="14" fill="#1A1A1A"/><rect x="1" y="6" width="14" height="4" fill="#1A1A1A"/><rect x="3" y="3" width="10" height="10" fill="#1A1A1A"/><rect x="4" y="4" width="8" height="8" fill="#B8B09C"/><rect x="6" y="6" width="4" height="4" fill="#FFFDF7"/></svg>',
      quickWeb: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="1" width="8" height="14" fill="#1A1A1A"/><rect x="1" y="4" width="14" height="8" fill="#1A1A1A"/><rect x="3" y="3" width="10" height="10" fill="#2B59FF"/><rect x="4" y="4" width="4" height="3" fill="#22C55E"/><rect x="9" y="8" width="4" height="4" fill="#22C55E"/><rect x="5" y="9" width="2" height="3" fill="#22C55E"/></svg>',
      quickGemini: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="7" y="1" width="2" height="14" fill="#1A1A1A"/><rect x="1" y="7" width="14" height="2" fill="#1A1A1A"/><rect x="5" y="5" width="6" height="6" fill="#1A1A1A"/><rect x="7" y="2" width="2" height="12" fill="#FFD43B"/><rect x="2" y="7" width="12" height="2" fill="#FFD43B"/><rect x="6" y="6" width="4" height="4" fill="#FFF7CC"/></svg>',
      quickMigrate: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="2" width="12" height="12" fill="#1A1A1A"/><rect x="3" y="3" width="10" height="10" fill="#FF4D1C"/><rect x="5" y="3" width="6" height="4" fill="#FFFDF7"/><rect x="5" y="9" width="6" height="4" fill="#FFD43B"/></svg>',
      deviceLocal: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="2" width="12" height="9" fill="#1A1A1A"/><rect x="3" y="3" width="10" height="7" fill="#7DD3FC"/><rect x="6" y="11" width="4" height="2" fill="#1A1A1A"/><rect x="4" y="13" width="8" height="2" fill="#1A1A1A"/></svg>',
      checkout: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="2" y="2" width="12" height="12" fill="#1A1A1A"/><rect x="3" y="3" width="10" height="10" fill="#FFFDF7"/><rect x="5" y="8" width="2" height="2" fill="#22C55E"/><rect x="7" y="10" width="2" height="2" fill="#22C55E"/><rect x="9" y="6" width="2" height="4" fill="#22C55E"/></svg>',
      gitBranch: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="3" y="2" width="3" height="3" fill="#FF4D1C"/><rect x="3" y="11" width="3" height="3" fill="#2B59FF"/><rect x="10" y="5" width="3" height="3" fill="#22C55E"/><rect x="4" y="5" width="1" height="6" fill="#1A1A1A"/><rect x="11" y="8" width="1" height="4" fill="#1A1A1A"/><rect x="6" y="12" width="6" height="1" fill="#1A1A1A"/></svg>',
      attach: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="7" y="3" width="2" height="10" fill="#1A1A1A"/><rect x="3" y="7" width="10" height="2" fill="#1A1A1A"/></svg>',
      permReview: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="4" y="4" width="8" height="1" fill="#1A1A1A"/><rect x="2" y="5" width="2" height="1" fill="#1A1A1A"/><rect x="12" y="5" width="2" height="1" fill="#1A1A1A"/><rect x="1" y="6" width="1" height="4" fill="#1A1A1A"/><rect x="14" y="6" width="1" height="4" fill="#1A1A1A"/><rect x="2" y="10" width="2" height="1" fill="#1A1A1A"/><rect x="12" y="10" width="2" height="1" fill="#1A1A1A"/><rect x="4" y="11" width="8" height="1" fill="#1A1A1A"/><rect x="2" y="6" width="12" height="4" fill="#FFFDF7"/><rect x="4" y="5" width="8" height="6" fill="#FFFDF7"/><rect x="6" y="6" width="4" height="4" fill="#2B59FF"/><rect x="7" y="7" width="2" height="2" fill="#1A1A1A"/><rect x="6" y="6" width="1" height="1" fill="#7DD3FC"/></svg>',
      permDefault: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="5" y="2" width="6" height="1" fill="#1A1A1A"/><rect x="4" y="3" width="2" height="4" fill="#1A1A1A"/><rect x="10" y="3" width="2" height="4" fill="#1A1A1A"/><rect x="2" y="7" width="12" height="7" fill="#1A1A1A"/><rect x="3" y="8" width="10" height="5" fill="#FFD43B"/><rect x="3" y="8" width="10" height="1" fill="#FFF5B8"/><rect x="7" y="9" width="2" height="3" fill="#FF4D1C"/></svg>',
      permAuto: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="3" y="2" width="10" height="2" fill="#1A1A1A"/><rect x="2" y="3" width="12" height="6" fill="#1A1A1A"/><rect x="3" y="9" width="10" height="2" fill="#1A1A1A"/><rect x="4" y="11" width="8" height="2" fill="#1A1A1A"/><rect x="6" y="13" width="4" height="1" fill="#1A1A1A"/><rect x="3" y="3" width="10" height="6" fill="#22C55E"/><rect x="4" y="9" width="8" height="2" fill="#22C55E"/><rect x="6" y="11" width="4" height="2" fill="#22C55E"/><rect x="4" y="4" width="2" height="3" fill="#86EFAC"/><rect x="7" y="6" width="2" height="3" fill="#FFFDF7"/><rect x="6" y="7" width="4" height="1" fill="#FFFDF7"/></svg>',
      speed: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="8" y="1" width="3" height="4" fill="#FF4D1C"/><rect x="5" y="5" width="6" height="3" fill="#FFD43B"/><rect x="5" y="8" width="6" height="3" fill="#FF4D1C"/><rect x="5" y="11" width="3" height="4" fill="#FFD43B"/></svg>',
      mic: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="6" y="2" width="4" height="7" fill="#1A1A1A"/><rect x="7" y="3" width="2" height="5" fill="#FF4D1C"/><rect x="4" y="7" width="1" height="3" fill="#1A1A1A"/><rect x="11" y="7" width="1" height="3" fill="#1A1A1A"/><rect x="5" y="10" width="6" height="1" fill="#1A1A1A"/><rect x="7" y="11" width="2" height="3" fill="#1A1A1A"/></svg>',
      sendVoice: '<svg viewBox="0 0 16 16" shape-rendering="crispEdges"><rect x="1" y="1" width="14" height="14" fill="#2B59FF"/><rect x="3" y="7" width="2" height="2" fill="#FFFFFF"/><rect x="6" y="4" width="2" height="8" fill="#FFFFFF"/><rect x="9" y="3" width="2" height="10" fill="#FFFFFF"/><rect x="12" y="5" width="2" height="6" fill="#FFFFFF"/></svg>'
    }
  });

  const THEME_BACKDROPS = Object.freeze({
    aurora: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="ag_au1" cx="22%" cy="18%" r="58%"><stop offset="0%" stop-color="#7C3AED" stop-opacity="0.58"/><stop offset="48%" stop-color="#3B82F6" stop-opacity="0.22"/><stop offset="100%" stop-color="#080A14" stop-opacity="0"/></radialGradient><radialGradient id="ag_au2" cx="82%" cy="28%" r="52%"><stop offset="0%" stop-color="#06B6D4" stop-opacity="0.5"/><stop offset="50%" stop-color="#6366F1" stop-opacity="0.18"/><stop offset="100%" stop-color="#080A14" stop-opacity="0"/></radialGradient><radialGradient id="ag_au3" cx="54%" cy="84%" r="50%"><stop offset="0%" stop-color="#EC4899" stop-opacity="0.34"/><stop offset="55%" stop-color="#7C3AED" stop-opacity="0.14"/><stop offset="100%" stop-color="#080A14" stop-opacity="0"/></radialGradient><linearGradient id="ag_r1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#38BDF8" stop-opacity="0"/><stop offset="35%" stop-color="#38BDF8" stop-opacity="0.32"/><stop offset="68%" stop-color="#A78BFA" stop-opacity="0.36"/><stop offset="100%" stop-color="#F472B6" stop-opacity="0"/></linearGradient><linearGradient id="ag_r2" x1="1" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#F472B6" stop-opacity="0"/><stop offset="45%" stop-color="#8B5CF6" stop-opacity="0.26"/><stop offset="80%" stop-color="#22D3EE" stop-opacity="0.22"/><stop offset="100%" stop-color="#080A14" stop-opacity="0"/></linearGradient><filter id="ag_ba"><feGaussianBlur stdDeviation="28"/></filter></defs><rect width="1280" height="800" fill="#080A14"/><rect width="1280" height="800" fill="url(#ag_au1)"/><rect width="1280" height="800" fill="url(#ag_au2)"/><rect width="1280" height="800" fill="url(#ag_au3)"/><path d="M-80 310 C 220 120, 540 430, 880 190 C 1060 80, 1210 170, 1360 120 L 1360 350 C 1100 440, 850 320, 600 490 C 340 620, 80 460, -80 520 Z" fill="url(#ag_r1)" filter="url(#ag_ba)"/><path d="M-60 500 C 280 290, 640 520, 1020 290 C 1170 210, 1280 265, 1360 240 L 1360 470 C 1060 550, 720 550, 420 630 C 190 680, 30 600, -60 650 Z" fill="url(#ag_r2)" filter="url(#ag_ba)"/><circle cx="940" cy="230" r="165" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1.2"/><circle cx="940" cy="230" r="225" fill="none" stroke="rgba(167,139,250,0.09)" stroke-width="1"/><g fill="#FFFFFF" opacity="0.5"><circle cx="220" cy="120" r="1.2"/><circle cx="420" cy="84" r="1.6"/><circle cx="640" cy="142" r="1.1"/><circle cx="840" cy="96" r="1.5"/><circle cx="1080" cy="138" r="1.2"/><circle cx="1140" cy="310" r="1.4"/><circle cx="260" cy="340" r="1.1"/><circle cx="1010" cy="450" r="1.2"/><circle cx="480" cy="230" r="1"/><circle cx="720" cy="275" r="1.3"/></g></svg>',
    washi: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="ag_ws" cx="76%" cy="22%" r="28%"><stop offset="0%" stop-color="#D96B52" stop-opacity="0.22"/><stop offset="55%" stop-color="#E5B98A" stop-opacity="0.1"/><stop offset="100%" stop-color="#F6F1E7" stop-opacity="0"/></radialGradient><linearGradient id="ag_m1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#4A4A46" stop-opacity="0.18"/><stop offset="100%" stop-color="#F6F1E7" stop-opacity="0"/></linearGradient><linearGradient id="ag_m2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#2D2D29" stop-opacity="0.25"/><stop offset="100%" stop-color="#F6F1E7" stop-opacity="0.02"/></linearGradient><linearGradient id="ag_m3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1E1D1A" stop-opacity="0.19"/><stop offset="100%" stop-color="#F6F1E7" stop-opacity="0"/></linearGradient><filter id="ag_ib"><feGaussianBlur stdDeviation="5"/></filter></defs><rect width="1280" height="800" fill="#F6F1E7"/><rect width="1280" height="800" fill="url(#ag_ws)"/><circle cx="965" cy="175" r="64" fill="#C83E2B" fill-opacity="0.11"/><circle cx="965" cy="175" r="42" fill="#C83E2B" fill-opacity="0.09"/><path d="M-20 475 Q 190 320, 360 405 T 710 345 T 1050 400 T 1300 325 L 1300 800 L -20 800 Z" fill="url(#ag_m1)" filter="url(#ag_ib)"/><path d="M-20 550 Q 240 395, 445 480 T 860 415 T 1300 485 L 1300 800 L -20 800 Z" fill="url(#ag_m2)"/><path d="M-20 635 Q 290 530, 560 590 T 1100 520 T 1300 580 L 1300 800 L -20 800 Z" fill="url(#ag_m3)"/><g stroke="#2B2722" stroke-opacity="0.22" fill="none" stroke-linecap="round"><path d="M210 125 C 295 118, 365 86, 445 102 C 490 112, 535 88, 575 72" stroke-width="2.4"/><path d="M365 96 C 388 68, 422 48, 460 40" stroke-width="1.5"/><path d="M425 100 C 455 124, 480 138, 512 142" stroke-width="1.2"/></g><g fill="#C83E2B" fill-opacity="0.34"><circle cx="448" cy="44" r="3.8"/><circle cx="468" cy="38" r="2.8"/><circle cx="505" cy="92" r="3.5"/><circle cx="560" cy="75" r="3.1"/><circle cx="490" cy="136" r="2.9"/></g><g stroke="#2C2924" stroke-opacity="0.32" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M815 182 q 8 -7 16 0 q 8 -7 16 0"/><path d="M862 206 q 6 -5 12 0 q 6 -5 12 0"/><path d="M780 214 q 5 -4 10 0 q 5 -4 10 0"/></g></svg>',
    cyber: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="ag_cs" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#050814"/><stop offset="56%" stop-color="#0C1129"/><stop offset="100%" stop-color="#190B26"/></linearGradient><radialGradient id="ag_cg" cx="56%" cy="54%" r="46%"><stop offset="0%" stop-color="#FF2A85" stop-opacity="0.24"/><stop offset="55%" stop-color="#00F0FF" stop-opacity="0.1"/><stop offset="100%" stop-color="#050814" stop-opacity="0"/></radialGradient><linearGradient id="ag_gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#00F0FF" stop-opacity="0.02"/><stop offset="40%" stop-color="#00F0FF" stop-opacity="0.24"/><stop offset="100%" stop-color="#FF2A85" stop-opacity="0.32"/></linearGradient></defs><rect width="1280" height="800" fill="url(#ag_cs)"/><rect width="1280" height="800" fill="url(#ag_cg)"/><g fill="#080D1D" stroke="rgba(0,240,255,0.14)" stroke-width="1"><rect x="260" y="270" width="76" height="235"/><rect x="348" y="205" width="64" height="300"/><rect x="424" y="305" width="90" height="200"/><rect x="965" y="230" width="74" height="275"/><rect x="1052" y="170" width="86" height="335"/><rect x="1152" y="260" width="96" height="245"/></g><g fill="#00F0FF" opacity="0.35"><rect x="364" y="230" width="32" height="2.5"/><rect x="364" y="244" width="22" height="2.5"/><rect x="1068" y="198" width="50" height="2.5"/><rect x="1068" y="214" width="34" height="2.5"/><rect x="1172" y="288" width="48" height="2.5"/></g><g fill="#FF2A85" opacity="0.45"><rect x="278" y="296" width="38" height="2.5"/><rect x="984" y="260" width="36" height="2.5"/><rect x="1068" y="232" width="52" height="2.5"/></g><g stroke="url(#ag_gf)" stroke-width="1"><line x1="0" y1="505" x2="1280" y2="505"/><line x1="0" y1="540" x2="1280" y2="540"/><line x1="0" y1="585" x2="1280" y2="585"/><line x1="0" y1="645" x2="1280" y2="645"/><line x1="0" y1="720" x2="1280" y2="720"/><line x1="720" y1="505" x2="720" y2="800"/><line x1="720" y1="505" x2="500" y2="800"/><line x1="720" y1="505" x2="260" y2="800"/><line x1="720" y1="505" x2="-40" y2="800"/><line x1="720" y1="505" x2="940" y2="800"/><line x1="720" y1="505" x2="1180" y2="800"/><line x1="720" y1="505" x2="1460" y2="800"/></g><circle cx="720" cy="300" r="185" fill="none" stroke="rgba(0,240,255,0.12)" stroke-width="1" stroke-dasharray="6 8"/><circle cx="720" cy="300" r="245" fill="none" stroke="rgba(255,42,133,0.1)" stroke-width="1" stroke-dasharray="2 10"/></svg>',
    botanical: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="ag_bs" cx="82%" cy="16%" r="55%"><stop offset="0%" stop-color="#F6DFB7" stop-opacity="0.56"/><stop offset="55%" stop-color="#E7F0DF" stop-opacity="0.24"/><stop offset="100%" stop-color="#FAF6EE" stop-opacity="0"/></radialGradient><radialGradient id="ag_bg" cx="20%" cy="84%" r="48%"><stop offset="0%" stop-color="#CBE0C8" stop-opacity="0.45"/><stop offset="100%" stop-color="#FAF6EE" stop-opacity="0"/></radialGradient><pattern id="ag_dg" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#6F8C74" fill-opacity="0.16"/></pattern><filter id="ag_lb"><feGaussianBlur stdDeviation="6"/></filter></defs><rect width="1280" height="800" fill="#FAF6EE"/><rect width="1280" height="800" fill="url(#ag_bs)"/><rect width="1280" height="800" fill="url(#ag_bg)"/><rect width="1280" height="800" fill="url(#ag_dg)"/><g fill="#538462" fill-opacity="0.09" filter="url(#ag_lb)"><path d="M1040 -20 C 950 95, 1005 215, 1150 250 C 1185 135, 1155 35, 1040 -20 Z"/><path d="M1230 45 C 1085 112, 1040 245, 1155 340 C 1245 258, 1285 148, 1230 45 Z"/><path d="M880 35 C 835 122, 885 205, 995 218 C 1008 135, 962 68, 880 35 Z"/></g><g stroke="#538462" stroke-opacity="0.26" stroke-width="1.7" fill="none" stroke-linecap="round"><path d="M1260 18 C 1170 86, 1105 160, 1055 268"/><path d="M1165 92 C 1120 74, 1082 84, 1066 112 C 1106 122, 1142 114, 1165 92 Z" fill="#A9CCA9" fill-opacity="0.24"/><path d="M1122 148 C 1158 158, 1192 178, 1198 208 C 1156 202, 1128 182, 1122 148 Z" fill="#EBB896" fill-opacity="0.22"/><path d="M1088 204 C 1042 192, 1008 202, 996 228 C 1032 238, 1068 228, 1088 204 Z" fill="#A9CCA9" fill-opacity="0.24"/></g><ellipse cx="320" cy="680" rx="140" ry="80" fill="#E39B6D" fill-opacity="0.1"/></svg>',
    pixel: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges"><defs><pattern id="ag_pd" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#EFE9D8"/><rect x="0" y="0" width="2" height="2" fill="#E1D8C1"/><rect x="4" y="4" width="2" height="2" fill="#E1D8C1"/></pattern></defs><rect width="1280" height="800" fill="url(#ag_pd)"/><rect x="1028" y="96" width="64" height="64" fill="#FFD43B"/><rect x="1038" y="86" width="44" height="84" fill="#FFD43B"/><rect x="1018" y="106" width="84" height="44" fill="#FFD43B"/><rect x="1042" y="106" width="36" height="36" fill="#FFF3B0"/><g fill="#FFFDF7"><rect x="340" y="120" width="112" height="18"/><rect x="358" y="102" width="76" height="18"/><rect x="376" y="88" width="40" height="14"/><rect x="780" y="156" width="92" height="16"/><rect x="798" y="140" width="56" height="16"/></g><g fill="#D7CEB7"><rect x="340" y="138" width="112" height="6"/><rect x="780" y="172" width="92" height="6"/></g><g fill="#DCD3BC"><rect x="0" y="540" width="1280" height="260"/><rect x="290" y="502" width="180" height="38"/><rect x="326" y="466" width="108" height="36"/><rect x="362" y="438" width="36" height="28"/><rect x="890" y="484" width="250" height="56"/><rect x="944" y="444" width="144" height="40"/><rect x="990" y="412" width="54" height="32"/></g></svg>'
  });

  // Classify an icon element (SVG or static non-composer SVG IMG) into one of the 26 semantic icon keys.
  // Pure function usable in Node.js tests with minimal mock objects.
  function classifyIconDescriptor(desc) {
    if (!desc || typeof desc !== 'object') return '';
    const tagName = String(desc.tagName || '').toLowerCase();
    const src = String(desc.src || '').toLowerCase();
    const own = String(desc.ownText || '').toLowerCase();
    const cls = String(desc.className || '').toLowerCase();
    const containerText = String(desc.containerText || '').toLowerCase();
    const containerAria = String(desc.containerAria || '').toLowerCase();
    const combined = (own + ' ' + containerAria + ' ' + containerText).trim();
    const inTopbar = Boolean(desc.inTopbar);
    const inSidebar = Boolean(desc.inSidebar);
    const inComposer = Boolean(desc.inComposer);

    // 0. Never replace user/content images (e.g. uploaded image previews in composer, avatars, raster/blob images)
    if (tagName === 'img') {
      if (inComposer) return '';
      if (/^(blob:|file:|data:image\/(?!svg\+xml))/i.test(src)) return '';
      if (/\.(png|jpe?g|webp|gif|bmp|avif)([?#]|$)/i.test(src)) return '';
      if (/(user_uploaded|attachment|media_|avatar|googleusercontent)/i.test(src)) return '';
    }

    // 0b. Never replace dropdown chevrons, carets, close X, or remove/delete/preview controls
    if (/chevron|caret|triangle|lucide-x\b|close/.test(cls)) return '';
    if (/\b(remove|delete|dismiss|preview)\b|(移除|删除|预览)/i.test(combined)) return '';

    // 1. Quick-start suggestions on main canvas
    if (/(帮我构建一个\s*web|build\s+a\s+web\s+app|web\s+应用)/i.test(combined)) return 'quickWeb';
    if (/(添加\s*gemini|add\s+gemini|gemini\s+功能)/i.test(combined)) return 'quickGemini';
    if (/(迁移.*配置|migrate.*config|其他\s*ai\s*开发工具)/i.test(combined)) return 'quickMigrate';

    // 2. Sidebar icon-only add-conversation button (e.g. "+" next to 对话列表) before newChat
    if (inSidebar && desc.isCompactIconOnly && !desc.isTopCta && (/(新建对话|新对话|new conversation|new chat|add conversation|新增对话|添加对话)/i.test(combined) || /lucide-plus\b/.test(cls))) {
      return 'addConv';
    }

    // 3. Primary sidebar navigation & controls
    if (/(新建对话|新对话|new conversation|new chat)/i.test(combined)) return 'newChat';
    if (/(自动化任务|自动化|automations?|scheduled)/i.test(combined)) return 'automation';
    if (/(自定义配置|自定义|customizations?|customize)/i.test(combined)) return 'customize';
    if (/(^|\s)(设置|settings?)(\s|$)/i.test(containerText) || /(^|\s)(设置|settings?)(\s|$)/i.test(containerAria)) return 'settings';

    // 3. Topbar controls
    if (/(toggle sidebar|sidebar|侧边栏|折叠|展开)/i.test(combined) || /panel-left/.test(cls)) return 'sidebarToggle';
    if (inTopbar && (/(go back|back|后退|返回)/i.test(combined) || /arrow-left/.test(cls))) return 'navBack';
    if (inTopbar && (/(go forward|forward|前进)/i.test(combined) || /arrow-right/.test(cls))) return 'navForward';
    if (/(^|\s)(搜索|查找|search|find)(\s|$)/i.test(combined) || /lucide-search|\bsearch\b/.test(cls)) return 'search';
    if (inTopbar && (/(more|menu|更多|选项)/i.test(combined) || /ellipsis|more-vertical/.test(cls))) return 'moreMenu';

    // 4. Permission modes (Local Permissions menu + composer pill) & composer controls
    if (/(执行前请求确认|每条命令都需要手动批准|ask for review|request review|always ask)/i.test(combined) || /lucide-eye\b/.test(cls)) return 'permReview';
    if (/(极速|无限制运行所有命令|fast|turbo|planning|规划)/i.test(combined) || /lucide-zap|lucide-gauge/.test(cls)) return 'speed';
    if (/(敏感操作前请求确认|ask before sensitive)/i.test(combined) || /lucide-lock\b/.test(cls) || (inComposer && /^(默认|default)(\s|$)/i.test(containerText))) return 'permDefault';
    if (/(自动判断是否允许运行命令|auto[- ]?decide)/i.test(combined) || /lucide-shield/.test(cls) || (inComposer && /^(自动|auto)(\s|$)/i.test(containerText))) return 'permAuto';
    if (/(本机电脑|本机|local machine|this computer|local computer)/i.test(combined) || /lucide-monitor|lucide-laptop/.test(cls)) return 'deviceLocal';
    if (/(本地检出|local checkout|checkout|worktree)/i.test(combined)) return 'checkout';
    if (/(configure branch|branch|分支)/i.test(combined) || /git-branch/.test(cls)) return 'gitBranch';
    if (/(麦克风|语音输入|microphone|dictate|voice input)/i.test(combined) || /lucide-mic\b/.test(cls)) return 'mic';
    if (inComposer && (/(语音对话|发送|send|submit|audio|voice mode|start voice)/i.test(combined) || /audio-lines|waveform|lucide-send|arrow-up/.test(cls))) return 'sendVoice';
    const isExistingAttachment = /\b(attached|attachments?)\b/i.test(combined) && !/\b(add|upload|attach\s+a?)\b/i.test(combined);
    if (
      inComposer &&
      !isExistingAttachment &&
      (/(add\s+(context|file|files|image|images|media|attachment|attachments)|attach(\s+a)?\s+(file|files|image|images|media|context)|upload\s+(image|images|file|files)|^attach$|添加上下文|添加附件|添加文件|添加图片|附加文件|上传图片|上传文件|^添加$|^附件$)/i.test(combined) ||
        /lucide-plus\b|lucide-paperclip\b/.test(cls))
    ) {
      return 'attach';
    }

    // 5. Sidebar section actions & folders
    if (/(filter|sort|筛选|排序)/i.test(combined) || /list-filter|lucide-filter/.test(cls)) return 'filter';
    if (/(refresh|sync|reload|刷新|同步)/i.test(combined) || /refresh-cw|rotate-cw|lucide-sync/.test(cls)) return 'sync';
    if (inSidebar && (/lucide-plus\b/.test(cls) || /(add conversation|新增对话|添加对话)/i.test(combined))) return 'addConv';
    if (/lucide-folder|folder-open|\bfolder\b/.test(cls) || /folder|文件夹/.test(containerAria)) return 'folder';

    // 6. General Lucide fallbacks
    if (/lucide-clock|lucide-timer/.test(cls)) return 'automation';
    if (/lucide-blocks|lucide-sliders|lucide-puzzle/.test(cls)) return 'customize';
    if (/lucide-settings|lucide-cog/.test(cls)) return 'settings';
    if (/lucide-globe/.test(cls)) return 'quickWeb';
    if (/lucide-sparkles/.test(cls)) return 'quickGemini';
    if (/lucide-ellipsis-vertical|lucide-more-vertical/.test(cls)) return 'moreMenu';

    return '';
  }

  function buildIconCssRules() {
    const lines = [
      `html[data-aglaunch-theme-active="1"][data-aglaunch-theme-icons="1"] svg[data-agl-icon] {`,
      `  background-repeat: no-repeat !important;`,
      `  background-position: center center !important;`,
      `  background-size: contain !important;`,
      `}`,
      `html[data-aglaunch-theme-active="1"][data-aglaunch-theme-icons="1"] svg[data-agl-icon] > * {`,
      `  opacity: 0 !important;`,
      `  visibility: hidden !important;`,
      `}`,
      `html[data-aglaunch-theme-active="1"][data-aglaunch-theme-icons="1"] img[data-agl-icon] {`,
      `  object-position: -9999px -9999px !important;`,
      `  background-repeat: no-repeat !important;`,
      `  background-position: center center !important;`,
      `  background-size: contain !important;`,
      `}`
    ];

    for (let i = 0; i < THEME_PRESETS.length; i++) {
      const id = THEME_PRESETS[i].id;
      const pack = THEME_ICONS[id];
      if (!pack) continue;
      for (let j = 0; j < ICON_KEYS.length; j++) {
        const key = ICON_KEYS[j];
        const uri = encodeSvgDataUri(pack[key]);
        if (!uri) continue;
        lines.push(
          `html[data-aglaunch-theme="${id}"][data-aglaunch-theme-icons="1"] [data-agl-icon="${key}"] { background-image: ${uri} !important; }`
        );
      }
    }
    return lines.join('\n');
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      THEME_PRESET_IDS,
      DEFAULT_THEME_CONFIG,
      ICON_KEYS,
      THEME_PRESETS,
      THEME_ICONS,
      THEME_BACKDROPS,
      normalizeThemeConfig,
      getPresetById,
      encodeSvgDataUri,
      classifyIconDescriptor,
      buildIconCssRules
    };
    return;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.__AGL_THEME_INSTALLED__) return;

  const isLocalHub = (location.protocol === 'https:' || location.protocol === 'http:') &&
    (location.hostname === '127.0.0.1' || location.hostname === 'localhost');
  if (!isLocalHub) return;

  window.__AGL_THEME_INSTALLED__ = true;

  const init = typeof __AGL_THEME_INIT__ !== 'undefined' && __AGL_THEME_INIT__ ? __AGL_THEME_INIT__ : {};
  let themeConfig = normalizeThemeConfig(init.config);
  if (typeof __AGL_THEME_INIT__ !== 'undefined') {
    try { __AGL_THEME_INIT__ = null; } catch (_) {}
  }

  const STYLE_ID = 'aglaunch-theme-style';
  const BACKDROP_ID = 'aglaunch-theme-backdrop';
  const SKIP_SUBTREE_SELECTOR = [
    '[data-aglaunch-ui]',
    '[data-aglaunch-skip]',
    '.monaco-editor',
    '.xterm',
    '.cm-editor',
    'pre',
    'code',
    'canvas',
    'video'
  ].join(',');
  const STRUCTURAL_TAGS = new Set(['DIV', 'MAIN', 'ASIDE', 'NAV', 'SECTION', 'HEADER', 'FOOTER', 'ARTICLE']);
  const SKIP_SELF_SELECTOR = 'button, a, input, textarea, select, [role="button"], [role="switch"], [role="tab"], [role="menuitem"], [role="option"], [role="tooltip"]';
  const MODAL_SELECTOR = '[role="dialog"], [aria-modal="true"], dialog, [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]';

  let scanTimer = null;
  let lastAppliedPolarity = '';
  const stateListeners = new Set();

  function emitStateChange() {
    const preset = getPresetById(themeConfig.preset);
    const snap = {
      config: Object.assign({}, themeConfig),
      preset,
      active: Boolean(preset),
      polarity: preset ? preset.polarity : ''
    };
    for (const fn of stateListeners) {
      try { fn(snap); } catch (_) {}
    }
  }

  function sendLauncherMsg(payload) {
    try {
      console.debug('__AGL_MSG__' + JSON.stringify(payload));
    } catch (_) {}
  }

  function buildThemeStylesheet() {
    return `
      /* Built-in Theme Backdrop Layer */
      #${BACKDROP_ID} {
        position: fixed;
        inset: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        overflow: hidden;
        display: none;
        z-index: -9999;
        contain: strict;
      }
      #${BACKDROP_ID} svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      html[data-aglaunch-theme-active="1"][data-aglaunch-theme-backdrop="1"]:not([data-aglaunch-skin-active="1"]) #${BACKDROP_ID} {
        display: block;
      }

      /* Reveal backdrop cleanly behind neutral app surfaces (when no custom skin image overrides it) */
      html[data-aglaunch-theme-active="1"][data-aglaunch-theme-backdrop="1"]:not([data-aglaunch-skin-active="1"]),
      html[data-aglaunch-theme-active="1"][data-aglaunch-theme-backdrop="1"]:not([data-aglaunch-skin-active="1"]) body {
        background-color: var(--aglt-bg) !important;
        background-image: none !important;
      }
      html[data-aglaunch-theme-active="1"] body {
        isolation: isolate !important;
      }
      html[data-aglaunch-theme-active="1"] [data-aglaunch-theme-surface="canvas"],
      html[data-aglaunch-theme-active="1"] [data-aglaunch-theme-surface="clear"] {
        background-color: transparent !important;
        background-image: none !important;
      }
      html[data-aglaunch-theme-active="1"] [data-aglaunch-theme-surface="sidebar"],
      html[data-aglaunch-theme-active="1"] [data-aglaunch-surface="sidebar"] {
        background-color: var(--aglt-sidebar-bg) !important;
        border-color: var(--aglt-sidebar-border) !important;
        backdrop-filter: blur(var(--aglt-sidebar-blur, 18px)) !important;
        -webkit-backdrop-filter: blur(var(--aglt-sidebar-blur, 18px)) !important;
      }
      /* When custom wallpaper skin is also active, blend the theme's sidebar hue with user's surfaceOpacity slider */
      html[data-aglaunch-theme-active="1"][data-aglaunch-skin-active="1"][data-aglaunch-skin-mode="blend"] [data-aglaunch-theme-surface="sidebar"],
      html[data-aglaunch-theme-active="1"][data-aglaunch-skin-active="1"][data-aglaunch-skin-mode="blend"] [data-aglaunch-surface="sidebar"] {
        background-color: rgba(var(--aglt-sidebar-rgb), max(0.32, var(--aglaunch-surface-alpha, 0.45))) !important;
      }
      /* Prevent nested neutral/sticky sidebar wrappers & headers from showing mismatched cool-gray patches */
      html[data-aglaunch-theme-active="1"] :is([data-aglaunch-theme-surface="sidebar"], [data-aglaunch-surface="sidebar"]) :where(div, section, header, footer, nav, ul, li, a, button):not([data-aglaunch-theme-cta="1"]):not([data-aglaunch-ui]):not([data-aglaunch-ui] *):not(:hover):not([aria-selected="true"]):not([aria-current="page"]):not([data-active="true"]):not([data-state="active"]) {
        background-color: transparent !important;
        background-image: none !important;
      }
      html[data-aglaunch-theme-active="1"] :is([data-aglaunch-theme-surface="sidebar"], [data-aglaunch-surface="sidebar"]) :where(a, button, [role="button"], [role="treeitem"], [role="listitem"]):not([data-aglaunch-theme-cta="1"]):hover {
        background-color: var(--aglt-hover-bg) !important;
      }
      html[data-aglaunch-theme-active="1"] :is([data-aglaunch-theme-surface="sidebar"], [data-aglaunch-surface="sidebar"]) :where([aria-selected="true"], [aria-current="page"], [data-active="true"], [data-state="active"]):not([data-aglaunch-theme-cta="1"]) {
        background-color: var(--aglt-accent-soft) !important;
      }
      html[data-aglaunch-theme-active="1"] [data-aglaunch-theme-surface="panel"] {
        background-color: var(--aglt-panel-bg) !important;
        border-color: var(--aglt-panel-border) !important;
        box-shadow: var(--aglt-panel-shadow, none) !important;
        backdrop-filter: blur(var(--aglt-panel-blur, 16px)) !important;
        -webkit-backdrop-filter: blur(var(--aglt-panel-blur, 16px)) !important;
      }
      html[data-aglaunch-theme-active="1"][data-aglaunch-skin-active="1"][data-aglaunch-skin-mode="blend"] [data-aglaunch-theme-surface="panel"] {
        background-color: rgba(var(--aglt-panel-rgb), max(0.36, var(--aglaunch-surface-alpha, 0.45))) !important;
      }
      html[data-aglaunch-theme-active="1"] [data-aglaunch-theme-surface="modal"] {
        background-color: var(--aglt-modal-bg) !important;
        border-color: var(--aglt-panel-border) !important;
        backdrop-filter: blur(18px) !important;
        -webkit-backdrop-filter: blur(18px) !important;
      }

      /* Shared theme semantic token overrides */
      html[data-aglaunch-theme-active="1"] {
        color-scheme: var(--aglt-color-scheme);
        --background: var(--aglt-bg);
        --foreground: var(--aglt-fg);
        --card: var(--aglt-panel-bg);
        --card-border: var(--aglt-panel-border);
        --sidebar: var(--aglt-sidebar-bg);
        --border: var(--aglt-border);
        --muted-foreground: var(--aglt-muted);
        --primary: var(--aglt-accent);
        --accent: var(--aglt-accent-soft);
      }

      html[data-aglaunch-theme-active="1"] body {
        color: var(--aglt-fg) !important;
        font-family: var(--aglt-font-ui) !important;
      }

      /* High-legibility text & input harmonization (excluding code editors & launcher UI) */
      html[data-aglaunch-theme-active="1"][data-aglaunch-theme-polarity="light"] :where(body, main, aside, nav, header, footer, h1, h2, h3, button, a, input, textarea, [contenteditable="true"]):not([data-aglaunch-theme-cta="1"]):not([data-aglaunch-theme-send="1"]):not([data-aglaunch-ui]):not([data-aglaunch-ui] *):not(.monaco-editor *):not(.xterm *):not(pre *):not(code) {
        color: var(--aglt-fg);
      }
      html[data-aglaunch-theme-active="1"][data-aglaunch-theme-polarity="dark"] :where(body, main, aside, nav, header, footer, h1, h2, h3, button, a, input, textarea, [contenteditable="true"]):not([data-aglaunch-theme-cta="1"]):not([data-aglaunch-theme-send="1"]):not([data-aglaunch-ui]):not([data-aglaunch-ui] *):not(.monaco-editor *):not(.xterm *):not(pre *):not(code) {
        color: var(--aglt-fg);
      }
      html[data-aglaunch-theme-active="1"] :where(input, textarea):not([data-aglaunch-ui] *)::placeholder {
        color: var(--aglt-placeholder) !important;
        opacity: 1 !important;
      }
      html[data-aglaunch-theme-active="1"] :where(h1):not([data-aglaunch-ui] *) {
        font-family: var(--aglt-font-display) !important;
        text-shadow: var(--aglt-heading-shadow, none);
      }

      /* Composer highlight */
      html[data-aglaunch-theme-active="1"] [data-aglaunch-theme-composer="1"] {
        background-color: var(--aglt-composer-bg) !important;
        border: var(--aglt-composer-border) !important;
        border-radius: var(--aglt-composer-radius) !important;
        box-shadow: var(--aglt-composer-shadow) !important;
        backdrop-filter: blur(var(--aglt-panel-blur, 20px)) !important;
        -webkit-backdrop-filter: blur(var(--aglt-panel-blur, 20px)) !important;
      }
      html[data-aglaunch-theme-active="1"] [data-aglaunch-theme-composer="1"] [data-aglaunch-theme-send="1"] {
        background: var(--aglt-send-bg) !important;
        color: var(--aglt-send-fg) !important;
        border: var(--aglt-send-border) !important;
        border-radius: var(--aglt-send-radius) !important;
        box-shadow: var(--aglt-send-shadow, none) !important;
      }

      /* Primary New Chat CTA highlight */
      html[data-aglaunch-theme-active="1"] [data-aglaunch-theme-cta="1"] {
        background: var(--aglt-cta-bg) !important;
        color: var(--aglt-cta-fg) !important;
        border: var(--aglt-cta-border) !important;
        border-radius: var(--aglt-cta-radius) !important;
        box-shadow: var(--aglt-cta-shadow, none) !important;
      }
      html[data-aglaunch-theme-active="1"] [data-aglaunch-theme-cta="1"] * {
        color: var(--aglt-cta-fg) !important;
      }

      /* Quick suggestion chips */
      html[data-aglaunch-theme-active="1"] [data-aglaunch-theme-sugg="1"] {
        background: var(--aglt-sugg-bg) !important;
        border: var(--aglt-sugg-border) !important;
        border-radius: var(--aglt-sugg-radius) !important;
        box-shadow: var(--aglt-sugg-shadow, none) !important;
      }

      /* Custom Scrollbar */
      html[data-aglaunch-theme-active="1"] ::-webkit-scrollbar-thumb {
        background: var(--aglt-scroll-thumb) !important;
        border-radius: 999px;
      }

      /* === THEME 1: AURORA GLASS (液态琉璃) === */
      html[data-aglaunch-theme="aurora"] {
        --aglt-color-scheme: dark;
        --aglt-font-ui: -apple-system, BlinkMacSystemFont, "PingFang SC", "SF Pro Text", sans-serif;
        --aglt-font-display: -apple-system, BlinkMacSystemFont, "PingFang SC", "SF Pro Display", sans-serif;
        --aglt-bg: #080A14;
        --aglt-fg: #F2F5FF;
        --aglt-muted: rgba(186, 198, 240, 0.68);
        --aglt-placeholder: rgba(196, 208, 242, 0.48);
        --aglt-border: rgba(255, 255, 255, 0.11);
        --aglt-accent: #8B5CF6;
        --aglt-accent-soft: rgba(139, 92, 246, 0.22);
        --aglt-hover-bg: rgba(255, 255, 255, 0.08);
        --aglt-sidebar-rgb: 13, 16, 30;
        --aglt-sidebar-bg: rgba(13, 16, 30, 0.58);
        --aglt-sidebar-border: rgba(255, 255, 255, 0.1);
        --aglt-sidebar-blur: 24px;
        --aglt-panel-rgb: 16, 20, 38;
        --aglt-panel-bg: rgba(16, 20, 38, 0.58);
        --aglt-panel-border: rgba(255, 255, 255, 0.16);
        --aglt-panel-blur: 24px;
        --aglt-panel-shadow: 0 12px 32px rgba(4, 6, 18, 0.42);
        --aglt-modal-bg: rgba(14, 18, 34, 0.9);
        --aglt-composer-bg: rgba(16, 20, 38, 0.62);
        --aglt-composer-border: 1px solid rgba(255, 255, 255, 0.22);
        --aglt-composer-radius: 20px;
        --aglt-composer-shadow: 0 20px 50px rgba(4, 6, 18, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.2);
        --aglt-cta-bg: linear-gradient(135deg, rgba(139, 92, 246, 0.34), rgba(56, 189, 248, 0.26));
        --aglt-cta-fg: #F4F7FF;
        --aglt-cta-border: 1px solid rgba(255, 255, 255, 0.24);
        --aglt-cta-radius: 12px;
        --aglt-cta-shadow: 0 4px 16px rgba(99, 102, 241, 0.22);
        --aglt-send-bg: linear-gradient(135deg, #A78BFA 0%, #38BDF8 55%, #F472B6 100%);
        --aglt-send-fg: #090B14;
        --aglt-send-border: 1px solid rgba(255, 255, 255, 0.4);
        --aglt-send-radius: 999px;
        --aglt-send-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
        --aglt-sugg-bg: rgba(255, 255, 255, 0.06);
        --aglt-sugg-border: 1px solid rgba(255, 255, 255, 0.12);
        --aglt-sugg-radius: 12px;
        --aglt-heading-shadow: 0 4px 26px rgba(124, 58, 237, 0.36);
        --aglt-scroll-thumb: rgba(167, 139, 250, 0.34);
      }

      /* === THEME 2: WASHI INK (和纸水墨) === */
      html[data-aglaunch-theme="washi"] {
        --aglt-color-scheme: light;
        --aglt-font-ui: "PingFang SC", "Hiragino Sans GB", -apple-system, sans-serif;
        --aglt-font-display: "Songti SC", "STSong", "Noto Serif SC", Georgia, serif;
        --aglt-bg: #F6F1E7;
        --aglt-fg: #1F1C18;
        --aglt-muted: #6C6357;
        --aglt-placeholder: #948A7B;
        --aglt-border: rgba(58, 48, 36, 0.16);
        --aglt-accent: #C83E2B;
        --aglt-accent-soft: rgba(200, 62, 43, 0.1);
        --aglt-hover-bg: rgba(35, 32, 28, 0.06);
        --aglt-sidebar-rgb: 238, 231, 218;
        --aglt-sidebar-bg: rgba(238, 231, 218, 0.88);
        --aglt-sidebar-border: rgba(58, 48, 36, 0.15);
        --aglt-sidebar-blur: 10px;
        --aglt-panel-rgb: 252, 249, 243;
        --aglt-panel-bg: rgba(252, 249, 243, 0.9);
        --aglt-panel-border: rgba(45, 38, 28, 0.18);
        --aglt-panel-blur: 12px;
        --aglt-panel-shadow: 0 8px 24px rgba(42, 34, 22, 0.08);
        --aglt-modal-bg: rgba(248, 243, 234, 0.96);
        --aglt-composer-bg: rgba(252, 249, 243, 0.92);
        --aglt-composer-border: 1px solid rgba(45, 38, 28, 0.24);
        --aglt-composer-radius: 10px;
        --aglt-composer-shadow: 0 12px 30px rgba(42, 34, 22, 0.1);
        --aglt-cta-bg: #23201C;
        --aglt-cta-fg: #F7F2E8;
        --aglt-cta-border: 1px solid #23201C;
        --aglt-cta-radius: 6px;
        --aglt-cta-shadow: 0 3px 10px rgba(35, 32, 28, 0.16);
        --aglt-send-bg: #C83E2B;
        --aglt-send-fg: #FAF5EB;
        --aglt-send-border: 1px solid #A83222;
        --aglt-send-radius: 6px;
        --aglt-send-shadow: 0 3px 10px rgba(200, 62, 43, 0.28);
        --aglt-sugg-bg: rgba(252, 249, 243, 0.82);
        --aglt-sugg-border: 1px solid rgba(58, 48, 36, 0.16);
        --aglt-sugg-radius: 6px;
        --aglt-sugg-shadow: 0 2px 8px rgba(45, 36, 24, 0.05);
        --aglt-scroll-thumb: rgba(58, 48, 36, 0.24);
      }

      /* === THEME 3: CYBER NOCTURNE (赛博夜行) === */
      html[data-aglaunch-theme="cyber"] {
        --aglt-color-scheme: dark;
        --aglt-font-ui: -apple-system, "PingFang SC", "Noto Sans SC", sans-serif;
        --aglt-font-display: -apple-system, "PingFang SC", sans-serif;
        --aglt-bg: #060913;
        --aglt-fg: #E8FAFF;
        --aglt-muted: #84A8BE;
        --aglt-placeholder: #50738A;
        --aglt-border: rgba(0, 240, 255, 0.26);
        --aglt-accent: #00F0FF;
        --aglt-accent-soft: rgba(255, 42, 133, 0.16);
        --aglt-hover-bg: rgba(0, 240, 255, 0.1);
        --aglt-sidebar-rgb: 7, 11, 22;
        --aglt-sidebar-bg: rgba(7, 11, 22, 0.88);
        --aglt-sidebar-border: rgba(0, 240, 255, 0.26);
        --aglt-sidebar-blur: 14px;
        --aglt-panel-rgb: 8, 13, 27;
        --aglt-panel-bg: rgba(8, 13, 27, 0.86);
        --aglt-panel-border: rgba(0, 240, 255, 0.36);
        --aglt-panel-blur: 14px;
        --aglt-panel-shadow: 0 0 22px rgba(0, 240, 255, 0.12);
        --aglt-modal-bg: rgba(8, 12, 24, 0.94);
        --aglt-composer-bg: rgba(8, 13, 27, 0.88);
        --aglt-composer-border: 1px solid rgba(0, 240, 255, 0.44);
        --aglt-composer-radius: 4px;
        --aglt-composer-shadow: 0 16px 38px rgba(0, 0, 0, 0.72), 0 0 22px rgba(0, 240, 255, 0.14);
        --aglt-cta-bg: rgba(0, 240, 255, 0.12);
        --aglt-cta-fg: #00F0FF;
        --aglt-cta-border: 1px solid #00F0FF;
        --aglt-cta-radius: 3px;
        --aglt-cta-shadow: 0 0 14px rgba(0, 240, 255, 0.2);
        --aglt-send-bg: linear-gradient(135deg, #00F0FF, #00B8D4);
        --aglt-send-fg: #050914;
        --aglt-send-border: 1px solid #8AF8FF;
        --aglt-send-radius: 3px;
        --aglt-send-shadow: 0 0 14px rgba(0, 240, 255, 0.45);
        --aglt-sugg-bg: rgba(9, 15, 30, 0.8);
        --aglt-sugg-border: 1px solid rgba(0, 240, 255, 0.3);
        --aglt-sugg-radius: 3px;
        --aglt-heading-shadow: 0 0 22px rgba(0, 240, 255, 0.42);
        --aglt-scroll-thumb: rgba(0, 240, 255, 0.32);
      }

      /* === THEME 4: BOTANICAL STUDIO (森系手账) === */
      html[data-aglaunch-theme="botanical"] {
        --aglt-color-scheme: light;
        --aglt-font-ui: "PingFang SC", "Hiragino Sans GB", -apple-system, sans-serif;
        --aglt-font-display: "PingFang SC", "Hiragino Sans GB", sans-serif;
        --aglt-bg: #FAF6EE;
        --aglt-fg: #27372B;
        --aglt-muted: #657D6A;
        --aglt-placeholder: #8DA191;
        --aglt-border: rgba(71, 100, 77, 0.16);
        --aglt-accent: #538462;
        --aglt-accent-soft: rgba(83, 132, 98, 0.14);
        --aglt-hover-bg: rgba(83, 132, 98, 0.1);
        --aglt-sidebar-rgb: 238, 243, 233;
        --aglt-sidebar-bg: rgba(238, 243, 233, 0.92);
        --aglt-sidebar-border: rgba(71, 100, 77, 0.16);
        --aglt-sidebar-blur: 10px;
        --aglt-panel-rgb: 255, 254, 250;
        --aglt-panel-bg: rgba(255, 254, 250, 0.94);
        --aglt-panel-border: rgba(83, 132, 98, 0.22);
        --aglt-panel-blur: 12px;
        --aglt-panel-shadow: 0 8px 24px rgba(48, 70, 52, 0.08);
        --aglt-modal-bg: rgba(251, 249, 243, 0.96);
        --aglt-composer-bg: rgba(255, 254, 250, 0.95);
        --aglt-composer-border: 1.5px solid rgba(83, 132, 98, 0.24);
        --aglt-composer-radius: 22px;
        --aglt-composer-shadow: 0 14px 36px rgba(48, 70, 52, 0.1);
        --aglt-cta-bg: #538462;
        --aglt-cta-fg: #FBF9F4;
        --aglt-cta-border: 1px solid #487556;
        --aglt-cta-radius: 14px;
        --aglt-cta-shadow: 0 4px 14px rgba(83, 132, 98, 0.25);
        --aglt-send-bg: #D97D54;
        --aglt-send-fg: #FFFBF6;
        --aglt-send-border: 1px solid #C56B43;
        --aglt-send-radius: 999px;
        --aglt-send-shadow: 0 4px 12px rgba(217, 125, 84, 0.34);
        --aglt-sugg-bg: rgba(255, 255, 255, 0.88);
        --aglt-sugg-border: 1px solid rgba(83, 132, 98, 0.22);
        --aglt-sugg-radius: 999px;
        --aglt-sugg-shadow: 0 3px 12px rgba(45, 68, 50, 0.06);
        --aglt-scroll-thumb: rgba(83, 132, 98, 0.3);
      }

      /* === THEME 5: RETRO PIXEL OS (像素复古) === */
      html[data-aglaunch-theme="pixel"] {
        --aglt-color-scheme: light;
        --aglt-font-ui: "PingFang SC", "Hiragino Sans GB", monospace;
        --aglt-font-display: "PingFang SC", monospace;
        --aglt-bg: #EFE9D8;
        --aglt-fg: #171717;
        --aglt-muted: #5C5548;
        --aglt-placeholder: #837A69;
        --aglt-border: #1A1A1A;
        --aglt-accent: #FF4D1C;
        --aglt-accent-soft: #FFD43B;
        --aglt-hover-bg: #D5CCB4;
        --aglt-sidebar-rgb: 226, 218, 198;
        --aglt-sidebar-bg: #E2DAC6;
        --aglt-sidebar-border: #1A1A1A;
        --aglt-sidebar-blur: 0px;
        --aglt-panel-rgb: 255, 253, 247;
        --aglt-panel-bg: #FFFDF7;
        --aglt-panel-border: #1A1A1A;
        --aglt-panel-blur: 0px;
        --aglt-panel-shadow: 4px 4px 0px #1A1A1A;
        --aglt-modal-bg: #F5EFE0;
        --aglt-composer-bg: #FFFDF7;
        --aglt-composer-border: 2px solid #1A1A1A;
        --aglt-composer-radius: 3px;
        --aglt-composer-shadow: 5px 5px 0px #1A1A1A;
        --aglt-cta-bg: #FF4D1C;
        --aglt-cta-fg: #FFFDF7;
        --aglt-cta-border: 2px solid #1A1A1A;
        --aglt-cta-radius: 2px;
        --aglt-cta-shadow: 3px 3px 0px #1A1A1A;
        --aglt-send-bg: #2B59FF;
        --aglt-send-fg: #FFFFFF;
        --aglt-send-border: 2px solid #1A1A1A;
        --aglt-send-radius: 2px;
        --aglt-send-shadow: 2px 2px 0px #1A1A1A;
        --aglt-sugg-bg: #FFFBF0;
        --aglt-sugg-border: 2px solid #1A1A1A;
        --aglt-sugg-radius: 2px;
        --aglt-sugg-shadow: 3px 3px 0px #1A1A1A;
        --aglt-heading-shadow: 2px 2px 0px #FFFFFF;
        --aglt-scroll-thumb: #1A1A1A;
      }

      /* === 115 BESPOKE DATA-URI ICON OVERRIDES === */
      ${buildIconCssRules()}
    `;
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.setAttribute('data-aglaunch-skip', '1');
    style.textContent = buildThemeStylesheet();
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureBackdrop(presetId) {
    let el = document.getElementById(BACKDROP_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = BACKDROP_ID;
      el.setAttribute('data-aglaunch-ui', 'theme-backdrop');
      el.setAttribute('data-aglaunch-skip', '1');
      el.setAttribute('aria-hidden', 'true');
      if (document.body) {
        document.body.insertBefore(el, document.body.firstChild);
      }
    }
    if (el.dataset.renderedPreset !== presetId) {
      el.dataset.renderedPreset = presetId || '';
      el.innerHTML = (presetId && THEME_BACKDROPS[presetId]) ? THEME_BACKDROPS[presetId] : '';
    }
    return el;
  }

  function clearThemeMarkers() {
    const surfs = document.querySelectorAll('[data-aglaunch-theme-surface]');
    for (let i = 0; i < surfs.length; i++) surfs[i].removeAttribute('data-aglaunch-theme-surface');
    const ctas = document.querySelectorAll('[data-aglaunch-theme-cta]');
    for (let i = 0; i < ctas.length; i++) ctas[i].removeAttribute('data-aglaunch-theme-cta');
    const suggs = document.querySelectorAll('[data-aglaunch-theme-sugg]');
    for (let i = 0; i < suggs.length; i++) suggs[i].removeAttribute('data-aglaunch-theme-sugg');
    const comps = document.querySelectorAll('[data-aglaunch-theme-composer]');
    for (let i = 0; i < comps.length; i++) comps[i].removeAttribute('data-aglaunch-theme-composer');
    const sends = document.querySelectorAll('[data-aglaunch-theme-send]');
    for (let i = 0; i < sends.length; i++) sends[i].removeAttribute('data-aglaunch-theme-send');
  }

  function parseAlphaAndNeutral(bgStr) {
    if (!bgStr || bgStr === 'transparent' || bgStr === 'rgba(0, 0, 0, 0)') return null;
    const m = /^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(bgStr.trim());
    if (!m) return null;
    const r = Number(m[1]), g = Number(m[2]), b = Number(m[3]);
    let a = 1;
    if (m[4] !== undefined) a = m[4].endsWith('%') ? Number(m[4].slice(0, -1)) / 100 : Number(m[4]);
    if (!Number.isFinite(a) || a < 0.5) return null;
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    return { r, g, b, a, neutral: spread <= 38 };
  }

  function scanThemeSurfacesAndIcons() {
    const preset = getPresetById(themeConfig.preset);
    if (!preset || !document.body) return;

    const vw = window.innerWidth || 1280;
    const vh = window.innerHeight || 720;

    // 1. Tag structural surfaces (React-safe attribute markers)
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
      acceptNode(n) {
        try {
          if (n.matches(SKIP_SUBTREE_SELECTOR)) return NodeFilter.FILTER_REJECT;
        } catch (_) {}
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let visited = 0;
    let node;
    while (visited < 2200 && (node = walker.nextNode())) {
      visited++;
      const tag = node.tagName;

      // Tag Composer container around main textarea/contenteditable
      if ((tag === 'TEXTAREA' || node.getAttribute('contenteditable') === 'true') && !node.closest('[role="dialog"]')) {
        let p = node.parentElement;
        for (let d = 0; d < 5 && p && p !== document.body; d++) {
          const pr = p.getBoundingClientRect();
          if (pr.width >= 320 && pr.width <= vw * 0.78 && pr.height >= 64 && pr.height <= 280) {
            p.setAttribute('data-aglaunch-theme-composer', '1');
            // Tag rightmost action button (send / voice waveform circle) inside composer
            const cBtns = p.querySelectorAll('button, [role="button"]');
            let rightmost = null;
            let maxRight = -1;
            for (let b = 0; b < cBtns.length; b++) {
              const br = cBtns[b].getBoundingClientRect();
              if (br.width >= 22 && br.width <= 46 && br.height >= 22 && br.height <= 46 && br.top >= pr.top + pr.height * 0.45 && br.right > maxRight) {
                maxRight = br.right;
                rightmost = cBtns[b];
              }
            }
            if (rightmost) {
              rightmost.setAttribute('data-aglaunch-theme-send', '1');
              const sSvg = rightmost.querySelector('svg');
              if (sSvg && themeConfig.replaceIcons) sSvg.setAttribute('data-agl-icon', 'sendVoice');
            }
            break;
          }
          p = p.parentElement;
        }
      }

      // Tag interactive CTA / quick suggestion controls (supports button, a, div[role="button"], div[tabindex])
      if (tag === 'BUTTON' || tag === 'A' || node.getAttribute('role') === 'button' || node.getAttribute('tabindex') === '0') {
        const txt = (node.textContent || '').replace(/\s+/g, ' ').trim();
        if (txt.length > 0 && txt.length <= 48) {
          if (/^(新建对话|新对话|New conversation|New chat)(\s|$)/i.test(txt)) {
            const nr = node.getBoundingClientRect();
            if (nr.top < 140 && nr.left < 280 && nr.width >= 100 && nr.height >= 26 && nr.height <= 52) {
              node.setAttribute('data-aglaunch-theme-cta', '1');
            }
          } else if (/(帮我构建一个\s*Web|Build a web app|添加\s*Gemini|Add Gemini|迁移我的配置|Migrate)/i.test(txt)) {
            node.setAttribute('data-aglaunch-theme-sugg', '1');
          }
        }
      }

      // Tag Icons (SVG & small IMG) without mutating DOM children
      if (themeConfig.replaceIcons && (tag === 'svg' || tag === 'SVG' || tag === 'IMG')) {
        const existingKey = node.getAttribute('data-agl-icon');
        const isDynamicModeIcon = existingKey === 'speed' || existingKey === 'permReview' || existingKey === 'permDefault' || existingKey === 'permAuto';
        if (!existingKey || isDynamicModeIcon) {
          const rect = node.getBoundingClientRect();
          if (rect.width >= 10 && rect.width <= 34 && rect.height >= 10 && rect.height <= 34) {
            const interactive = node.closest('button, a, [role="button"], [role="menuitem"], [role="menuitemradio"], [role="option"], [role="tab"], li') || node.parentElement;

            // Inside a multi-SVG interactive item with text (e.g. dropdown chip with chevron or menu item with badge/checkmark),
            // only replace the leading (first) SVG icon so badge icons, chevrons, and checkmarks stay untouched.
            if (interactive && (tag === 'svg' || tag === 'SVG')) {
              const sibSvgs = interactive.querySelectorAll('svg');
              if (sibSvgs.length > 1 && sibSvgs[0] !== node && (interactive.textContent || '').trim().length > 0) {
                continue;
              }
            }

            const cText = interactive ? (interactive.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80) : '';
            const cAria = [
              interactive && interactive.getAttribute('aria-label'),
              interactive && interactive.getAttribute('title'),
              node.getAttribute('aria-label'),
              node.getAttribute('title'),
              node.getAttribute('alt')
            ].filter(Boolean).join(' ');
            const cls = typeof node.className === 'string'
              ? node.className
              : (node.className && typeof node.className.baseVal === 'string' ? node.className.baseVal : '');
            const inTopbar = rect.top <= 54;
            const inSidebar = rect.left <= 290 && rect.top > 42;
            const inComposer = Boolean(node.closest('[data-aglaunch-theme-composer="1"]')) || rect.top >= vh * 0.58;
            const isCompactIconOnly = !cText && interactive && interactive.getBoundingClientRect().width <= 44;
            const isTopCta = Boolean(interactive && interactive.hasAttribute('data-aglaunch-theme-cta')) || (inSidebar && rect.top < 110 && cText.length > 0);

            const isSvg = tag === 'svg' || tag === 'SVG';
            const imgSrc = !isSvg ? (node.getAttribute('src') || node.currentSrc || '') : '';

            let key = classifyIconDescriptor({
              tagName: isSvg ? 'svg' : 'img',
              src: imgSrc,
              ownText: node.getAttribute('data-icon') || node.getAttribute('data-lucide') || '',
              className: cls,
              containerText: cText,
              containerAria: cAria,
              inTopbar,
              inSidebar,
              inComposer,
              isCompactIconOnly,
              isTopCta
            });

            // Heuristic fallback for sidebar project folder icons (SVG only)
            if (!key && isSvg && inSidebar && rect.left < 56 && cText && cText.length <= 44 && rect.top > 120 && rect.top < vh - 64) {
              if (!/(新建对话|自动化|自定义|设置|New|Automation|Custom|Setting|项目|对话列表|Projects|Conversations)/i.test(cText)) {
                key = 'folder';
              }
            }

            if (key) {
              node.setAttribute('data-agl-icon', key);
            }
          }
        }
        continue;
      }

      // Tag structural surfaces for backdrop transparency & themed sidebar/cards
      if (!STRUCTURAL_TAGS.has(tag)) continue;
      if (node.id === BACKDROP_ID || node.id === 'aglaunch-skin-layer' || node.id === 'aglaunch-skin-floating-panel') continue;
      if (node.hasAttribute('data-aglaunch-theme-surface')) continue;
      try {
        if (node.matches(SKIP_SELF_SELECTOR)) continue;
      } catch (_) {}

      const skinSurf = node.getAttribute('data-aglaunch-surface');
      if (skinSurf === 'sidebar' || skinSurf === 'canvas' || skinSurf === 'panel' || skinSurf === 'modal' || skinSurf === 'clear') {
        node.setAttribute('data-aglaunch-theme-surface', skinSurf);
        continue;
      }

      const cs = getComputedStyle(node);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const parsed = parseAlphaAndNeutral(cs.backgroundColor);
      const rect = node.getBoundingClientRect();
      if (rect.width < 110 || rect.height < 36) continue;

      const isSidebar = rect.left <= 24 && rect.width >= 140 && rect.width <= Math.min(380, vw * 0.36) && rect.height >= vh * 0.55;
      if (isSidebar && (tag === 'ASIDE' || tag === 'NAV' || (parsed && parsed.neutral))) {
        const parentSidebar = node.parentElement && node.parentElement.closest('[data-aglaunch-theme-surface="sidebar"], [data-aglaunch-surface="sidebar"]');
        node.setAttribute('data-aglaunch-theme-surface', parentSidebar ? 'clear' : 'sidebar');
        continue;
      }

      if (!parsed || !parsed.neutral) continue;

      let isModal = false;
      try {
        isModal = node.matches(MODAL_SELECTOR) || Boolean(node.closest(MODAL_SELECTOR));
      } catch (_) {}

      if (isModal) {
        const parentModal = node.parentElement && node.parentElement.closest('[data-aglaunch-theme-surface="modal"]');
        node.setAttribute('data-aglaunch-theme-surface', parentModal ? 'clear' : 'modal');
        continue;
      }

      const parentGlass = node.parentElement && node.parentElement.closest('[data-aglaunch-theme-surface="sidebar"], [data-aglaunch-theme-surface="panel"]');
      if (parentGlass) {
        node.setAttribute('data-aglaunch-theme-surface', 'clear');
        continue;
      }

      const isLargeCanvas = rect.width >= vw * 0.32 && rect.height >= vh * 0.42;
      const isTopOrBottomBar = rect.width >= vw * 0.38 && rect.height <= 68;
      if (isLargeCanvas || isTopOrBottomBar) {
        node.setAttribute('data-aglaunch-theme-surface', 'canvas');
        continue;
      }

      node.setAttribute('data-aglaunch-theme-surface', 'panel');
    }
  }

  function scheduleScan() {
    if (!getPresetById(themeConfig.preset)) return;
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(() => {
      scanTimer = null;
      scanThemeSurfacesAndIcons();
    }, 50);
  }

  function applyThemeVisuals() {
    ensureStyle();
    const html = document.documentElement;
    const preset = getPresetById(themeConfig.preset);
    const nextPolarity = preset ? preset.polarity : '';
    const polarityChanged = nextPolarity !== lastAppliedPolarity;
    lastAppliedPolarity = nextPolarity;

    if (preset) {
      html.setAttribute('data-aglaunch-theme', preset.id);
      html.setAttribute('data-aglaunch-theme-active', '1');
      html.setAttribute('data-aglaunch-theme-polarity', preset.polarity);
      html.setAttribute('data-aglaunch-theme-icons', themeConfig.replaceIcons ? '1' : '0');
      html.setAttribute('data-aglaunch-theme-backdrop', themeConfig.useBackdrop ? '1' : '0');
      ensureBackdrop(themeConfig.useBackdrop ? preset.id : '');
      if (polarityChanged) clearThemeMarkers();
      scanThemeSurfacesAndIcons();
    } else {
      html.removeAttribute('data-aglaunch-theme');
      html.removeAttribute('data-aglaunch-theme-active');
      html.removeAttribute('data-aglaunch-theme-polarity');
      html.removeAttribute('data-aglaunch-theme-icons');
      html.removeAttribute('data-aglaunch-theme-backdrop');
      ensureBackdrop('');
      clearThemeMarkers();
    }

    emitStateChange();
  }

  function updateConfig(patch) {
    if (!patch || typeof patch !== 'object') return;
    themeConfig = normalizeThemeConfig(Object.assign({}, themeConfig, patch));
    applyThemeVisuals();
    sendLauncherMsg({ type: 'theme:update-config', patch: Object.assign({}, themeConfig) });
  }

  function applyFromMain(payload) {
    if (!payload || typeof payload !== 'object') return;
    if (payload.config) {
      themeConfig = normalizeThemeConfig(payload.config);
    }
    applyThemeVisuals();
  }

  window.__AGL_THEME__ = {
    getPresets: () => THEME_PRESETS.slice(),
    getState: () => {
      const preset = getPresetById(themeConfig.preset);
      return {
        config: Object.assign({}, themeConfig),
        preset,
        active: Boolean(preset),
        polarity: preset ? preset.polarity : ''
      };
    },
    updateConfig,
    applyFromMain,
    subscribe(fn) {
      if (typeof fn === 'function') stateListeners.add(fn);
      return () => stateListeners.delete(fn);
    }
  };

  function boot() {
    if (!document.body) return;
    applyThemeVisuals();

    const obs = new MutationObserver((mutations) => {
      if (!getPresetById(themeConfig.preset)) return;
      for (let i = 0; i < mutations.length; i++) {
        const m = mutations[i];
        if (m.type !== 'childList' || m.addedNodes.length === 0) continue;
        const target = m.target;
        if (target && target.nodeType === 1 && target.closest && target.closest('[data-aglaunch-ui]')) continue;
        scheduleScan();
        return;
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    // Re-scan surfaces when Antigravity natively switches Light/Dark Appearance.
    const appearanceObs = new MutationObserver(() => {
      if (!getPresetById(themeConfig.preset)) return;
      clearThemeMarkers();
      scheduleScan();
    });
    appearanceObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme', 'data-color-scheme']
    });
    if (document.body) {
      appearanceObs.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'data-theme', 'data-color-scheme']
      });
    }

    window.addEventListener('resize', scheduleScan);
    setTimeout(() => {
      if (getPresetById(themeConfig.preset)) scanThemeSurfacesAndIcons();
    }, 750);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
