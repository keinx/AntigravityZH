'use strict';

const assert = require('assert');
const {
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
} = require('./renderer_theme.js');

// 1. Preset completeness (all 5 themes + none)
assert.deepStrictEqual(THEME_PRESET_IDS, ['none', 'aurora', 'washi', 'cyber', 'botanical', 'pixel']);
assert.strictEqual(THEME_PRESETS.length, 5);
assert.strictEqual(ICON_KEYS.length, 26);

for (const preset of THEME_PRESETS) {
  assert.ok(THEME_BACKDROPS[preset.id], `missing backdrop for ${preset.id}`);
  assert.ok(THEME_ICONS[preset.id], `missing icon pack for ${preset.id}`);
  for (const key of ICON_KEYS) {
    const svg = THEME_ICONS[preset.id][key];
    assert.ok(typeof svg === 'string' && svg.startsWith('<svg'), `missing ${key} icon for ${preset.id}`);
    assert.ok(!svg.includes('currentColor'), `data-URI icon ${preset.id}.${key} must use explicit colors, not currentColor`);
  }
}

// 2. Config normalization & validation
assert.deepStrictEqual(normalizeThemeConfig(null), Object.assign({}, DEFAULT_THEME_CONFIG));
assert.deepStrictEqual(normalizeThemeConfig({ preset: 'unknown', replaceIcons: 0, useBackdrop: 0 }), {
  preset: 'none',
  replaceIcons: false,
  useBackdrop: false
});
assert.deepStrictEqual(normalizeThemeConfig({ preset: ' washi ', replaceIcons: true }), {
  preset: 'washi',
  replaceIcons: true,
  useBackdrop: true
});
assert.strictEqual(getPresetById('cyber').polarity, 'dark');
assert.strictEqual(getPresetById('washi').polarity, 'light');
assert.strictEqual(getPresetById('none'), null);

// 3. Data URI encoding & CSS rule generation
const uri = encodeSvgDataUri('<svg viewBox="0 0 16 16"><rect fill="#FF4D1C"/></svg>');
assert.ok(uri.startsWith('url("data:image/svg+xml,'));
assert.ok(uri.includes('xmlns='));
assert.ok(uri.includes('%23FF4D1C'));

const css = buildIconCssRules();
assert.ok(css.includes('data-aglaunch-theme="aurora"'));
assert.ok(css.includes('data-aglaunch-theme="washi"'));
assert.ok(css.includes('data-aglaunch-theme="cyber"'));
assert.ok(css.includes('data-aglaunch-theme="botanical"'));
assert.ok(css.includes('data-aglaunch-theme="pixel"'));
assert.ok(css.includes('data-agl-icon="quickGemini"'));
assert.ok(css.includes('data-agl-icon="sendVoice"'));

// 4. Icon classifier (ZH & EN + Lucide classes)
assert.strictEqual(classifyIconDescriptor({ containerText: '新建对话', inSidebar: true }), 'newChat');
assert.strictEqual(classifyIconDescriptor({ containerText: 'New conversation', inSidebar: true }), 'newChat');
assert.strictEqual(classifyIconDescriptor({ containerText: '自动化任务', inSidebar: true }), 'automation');
assert.strictEqual(classifyIconDescriptor({ containerText: '自定义配置', inSidebar: true }), 'customize');
assert.strictEqual(classifyIconDescriptor({ containerText: '设置', inSidebar: true }), 'settings');
assert.strictEqual(classifyIconDescriptor({ containerText: '帮我构建一个 Web 应用' }), 'quickWeb');
assert.strictEqual(classifyIconDescriptor({ containerText: '为我的应用添加 Gemini 功能' }), 'quickGemini');
assert.strictEqual(classifyIconDescriptor({ containerText: '从其他 AI 开发工具迁移我的配置' }), 'quickMigrate');
assert.strictEqual(classifyIconDescriptor({ containerText: '本机电脑', inComposer: true }), 'deviceLocal');
assert.strictEqual(classifyIconDescriptor({ containerText: '本地检出', inComposer: true }), 'checkout');
assert.strictEqual(classifyIconDescriptor({ containerText: 'Configure Branches', inComposer: true }), 'gitBranch');
assert.strictEqual(classifyIconDescriptor({ containerText: '极速', inComposer: true }), 'speed');
assert.strictEqual(classifyIconDescriptor({ className: 'lucide lucide-folder', inSidebar: true }), 'folder');
assert.strictEqual(classifyIconDescriptor({ className: 'lucide lucide-mic', inComposer: true }), 'mic');
assert.strictEqual(classifyIconDescriptor({ containerAria: 'Toggle Sidebar', inTopbar: true }), 'sidebarToggle');
assert.strictEqual(classifyIconDescriptor({ containerAria: 'Go Back', inTopbar: true }), 'navBack');
assert.strictEqual(classifyIconDescriptor({ containerAria: 'Go Forward', inTopbar: true }), 'navForward');
assert.strictEqual(classifyIconDescriptor({ className: 'lucide lucide-search', inTopbar: true }), 'search');
assert.strictEqual(classifyIconDescriptor({ className: 'lucide lucide-chevron-down', containerText: '本地检出', inComposer: true }), '');
assert.strictEqual(classifyIconDescriptor({ className: 'lucide lucide-chevron-down', containerText: '极速', inComposer: true }), '');
assert.strictEqual(classifyIconDescriptor({ containerAria: '新建对话', inSidebar: true, isCompactIconOnly: true, isTopCta: false }), 'addConv');
assert.strictEqual(classifyIconDescriptor({ containerText: '执行前请求确认 每条命令都需要手动批准。' }), 'permReview');
assert.strictEqual(classifyIconDescriptor({ containerText: '默认 敏感操作前请求确认。' }), 'permDefault');
assert.strictEqual(classifyIconDescriptor({ containerText: '自动 自动判断是否允许运行命令。' }), 'permAuto');
assert.strictEqual(classifyIconDescriptor({ containerText: '极速 默认 无限制运行所有命令。' }), 'speed');
assert.strictEqual(classifyIconDescriptor({ containerText: '默认', inComposer: true }), 'permDefault');
assert.strictEqual(classifyIconDescriptor({ containerText: '自动', inComposer: true }), 'permAuto');

// 5. Composer attach button vs uploaded image/attachment previews
assert.strictEqual(classifyIconDescriptor({ tagName: 'svg', className: 'lucide lucide-plus', inComposer: true }), 'attach');
assert.strictEqual(classifyIconDescriptor({ tagName: 'svg', containerAria: 'Add Context', inComposer: true }), 'attach');
assert.strictEqual(classifyIconDescriptor({ tagName: 'svg', containerAria: 'Attach files', inComposer: true }), 'attach');
assert.strictEqual(classifyIconDescriptor({ tagName: 'svg', containerAria: '添加上下文', inComposer: true }), 'attach');
assert.strictEqual(classifyIconDescriptor({ tagName: 'svg', containerAria: '附加文件', inComposer: true }), 'attach');
assert.strictEqual(classifyIconDescriptor({ tagName: 'svg', containerAria: '上传图片或文件', inComposer: true }), 'attach');
assert.strictEqual(classifyIconDescriptor({ tagName: 'img', src: 'blob:http://127.0.0.1:1234/abc', containerAria: 'Attached image', inComposer: true }), '');
assert.strictEqual(classifyIconDescriptor({ tagName: 'img', src: 'data:image/jpeg;base64,/9j/4AAQ', containerAria: 'Attachment', inComposer: true }), '');
assert.strictEqual(classifyIconDescriptor({ tagName: 'img', src: 'http://127.0.0.1:1234/preview', containerAria: '附件', inComposer: true }), '');
assert.strictEqual(classifyIconDescriptor({ tagName: 'img', src: 'data:image/png;base64,iVBOR', containerAria: 'Avatar', inTopbar: true }), '');
assert.strictEqual(classifyIconDescriptor({ tagName: 'img', src: 'https://lh3.googleusercontent.com/a/photo', containerAria: 'Search', inTopbar: true }), '');
assert.strictEqual(classifyIconDescriptor({ tagName: 'svg', containerAria: 'Remove attachment', inComposer: true }), '');
assert.strictEqual(classifyIconDescriptor({ tagName: 'svg', containerAria: '移除附件', inComposer: true }), '');
assert.strictEqual(classifyIconDescriptor({ tagName: 'svg', containerAria: 'Preview attachment', inComposer: true }), '');
assert.strictEqual(classifyIconDescriptor({ tagName: 'svg', containerAria: 'Attached image', inComposer: true }), '');

// 6. Regression: never override direct body children's position/z-index (breaks fixed modal/dialog portals)
const fs = require('fs');
const path = require('path');
const themeSrc = fs.readFileSync(path.join(__dirname, 'renderer_theme.js'), 'utf8');
assert.ok(!/body\s*>\s*:not\([^)]+\)\s*\{[^}]*position\s*:\s*relative/i.test(themeSrc),
  'must not force position:relative on direct body children (clobbers fixed modals)');
assert.ok(/html\[data-aglaunch-theme-active="1"\]\s+body\s*\{[^}]*isolation\s*:\s*isolate/i.test(themeSrc),
  'active theme should isolate body stacking context instead of repositioning body children');

console.log('ALL JS THEME ENGINE TESTS PASSED');
