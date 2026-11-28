'use strict';

const assert = require('assert');
const {
  getStrings,
  normalizeLabelText,
  isBrowserTabLabel,
  isAppearanceTabLabel,
  isThemeRowLabel,
  matchAppearanceOptionPolarity,
  matchAppearanceIconButtonPolarity,
  isKnownSettingsTabLabel
} = require('./renderer_settings.js');
const {
  DEFAULT_I18N_CONFIG,
  DEFAULT_SKIN_CONFIG,
  DEFAULT_THEME_CONFIG,
  DEFAULT_SPLASH_CONFIG,
  getThemePolarity,
  normalizeSplashConfig,
  normalizeLauncherConfig,
  detectStaticImageMime,
  detectSplashMedia,
  parseByteRange,
  buildSplashPageHtml
} = require('./aglaunch_hook.js');

// 1. Settings tab label matching (EN & ZH)
assert.strictEqual(normalizeLabelText('  浏览器 \n '), '浏览器');
assert.strictEqual(isBrowserTabLabel('Browser'), true);
assert.strictEqual(isBrowserTabLabel('浏览器'), true);
assert.strictEqual(isBrowserTabLabel('Built-in Browser'), false);
assert.strictEqual(isKnownSettingsTabLabel('Appearance'), true);
assert.strictEqual(isKnownSettingsTabLabel('外观'), true);
assert.strictEqual(isAppearanceTabLabel('Appearance'), true);
assert.strictEqual(isAppearanceTabLabel('外观'), true);
assert.strictEqual(isAppearanceTabLabel('General'), false);
assert.strictEqual(matchAppearanceOptionPolarity('浅色'), 'light');
assert.strictEqual(matchAppearanceOptionPolarity('Light'), 'light');
assert.strictEqual(matchAppearanceOptionPolarity('深色'), 'dark');
assert.strictEqual(matchAppearanceOptionPolarity('Dark'), 'dark');
assert.strictEqual(matchAppearanceOptionPolarity('跟随系统'), 'system');
assert.strictEqual(matchAppearanceOptionPolarity('System'), 'system');
assert.strictEqual(matchAppearanceOptionPolarity('随机文本'), '');
assert.strictEqual(isThemeRowLabel('主题'), true);
assert.strictEqual(isThemeRowLabel('Theme'), true);
assert.strictEqual(isThemeRowLabel('深色主题'), false);
assert.strictEqual(matchAppearanceIconButtonPolarity({ svgClass: 'lucide lucide-monitor' }), 'system');
assert.strictEqual(matchAppearanceIconButtonPolarity({ svgClass: 'lucide lucide-sun' }), 'light');
assert.strictEqual(matchAppearanceIconButtonPolarity({ svgClass: 'lucide lucide-moon' }), 'dark');
assert.strictEqual(matchAppearanceIconButtonPolarity({ ariaLabel: 'Dark' }), 'dark');
assert.strictEqual(isKnownSettingsTabLabel('Random Button'), false);

// 2. Bilingual UI strings
const zh = getStrings(true);
const en = getStrings(false);
assert.strictEqual(zh.navLabel, '启动器设置');
assert.strictEqual(en.navLabel, 'Launcher');
assert.strictEqual(zh.themeSection, '预设主题');
assert.strictEqual(en.themeSection, 'Preset Themes');
assert.strictEqual(zh.splashSection, '启动动画');
assert.strictEqual(en.splashSection, 'Startup Animation');
assert.ok(zh.splashStatusActive('loaded', 1.5, true, 'video').includes('1.5s'));
assert.ok(zh.splashStatusActive('complete', 1.5, false, 'video').includes('播完后淡出'));
assert.ok(en.splashStatusActive('complete', 2, true, 'video').includes('Fade after playback'));
assert.ok(zh.skinStatusActive('blend', 'full').includes('背景融合'));
assert.ok(en.skinStatusActive('overlay', 'main').includes('Overlay'));

// 3. Main-process unified config normalization
const defCfg = normalizeLauncherConfig(null);
assert.strictEqual(defCfg.version, 1);
assert.deepStrictEqual(defCfg.i18n, DEFAULT_I18N_CONFIG);
assert.deepStrictEqual(defCfg.skin, DEFAULT_SKIN_CONFIG);
assert.deepStrictEqual(defCfg.theme, DEFAULT_THEME_CONFIG);
assert.deepStrictEqual(defCfg.splash, DEFAULT_SPLASH_CONFIG);

const customCfg = normalizeLauncherConfig({
  i18n: { enabled: false, autoTranslate: false },
  skin: { enabled: true, mode: 'overlay', blur: 999 },
  theme: { preset: 'cyber', replaceIcons: false, useBackdrop: true },
  splash: { enabled: true, mediaPath: '  /tmp/intro.mp4  ', fit: 'contain', muted: false, volume: 2.5, endMode: 'complete', minDuration: 99, skipOnClick: true }
});
assert.strictEqual(customCfg.i18n.enabled, false);
assert.strictEqual(customCfg.i18n.autoTranslate, false);
assert.strictEqual(customCfg.skin.enabled, true);
assert.strictEqual(customCfg.skin.mode, 'overlay');
assert.strictEqual(customCfg.skin.blur, 24);
assert.strictEqual(customCfg.theme.preset, 'cyber');
assert.strictEqual(customCfg.theme.replaceIcons, false);
assert.strictEqual(customCfg.theme.useBackdrop, true);
assert.strictEqual(customCfg.splash.enabled, true);
assert.strictEqual(customCfg.splash.mediaPath, '/tmp/intro.mp4');
assert.strictEqual(customCfg.splash.fit, 'contain');
assert.strictEqual(customCfg.splash.muted, false);
assert.strictEqual(customCfg.splash.volume, 1);
assert.strictEqual(customCfg.splash.endMode, 'complete');
assert.strictEqual(customCfg.splash.minDuration, 8);
assert.strictEqual(customCfg.splash.skipOnClick, undefined);

const badSplash = normalizeSplashConfig({ fit: 'bogus', endMode: 'weird', minDuration: -5, volume: -1 });
assert.strictEqual(badSplash.fit, 'cover');
assert.strictEqual(badSplash.endMode, 'loaded');
assert.strictEqual(badSplash.minDuration, 0);
assert.strictEqual(badSplash.volume, 0);
assert.strictEqual(badSplash.muted, true);
assert.strictEqual('skipOnClick' in badSplash, false);
assert.strictEqual(getThemePolarity('aurora'), 'dark');
assert.strictEqual(getThemePolarity('cyber'), 'dark');
assert.strictEqual(getThemePolarity('washi'), 'light');
assert.strictEqual(getThemePolarity('botanical'), 'light');
assert.strictEqual(getThemePolarity('pixel'), 'light');
assert.strictEqual(getThemePolarity('none'), '');

// 4. Static image magic-byte detection
assert.strictEqual(detectStaticImageMime(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0])), 'image/png');
assert.strictEqual(detectStaticImageMime(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0, 0, 0, 0, 0, 0, 0, 0])), 'image/jpeg');
assert.strictEqual(detectStaticImageMime(Buffer.from('GIF89a00000000')), null);

// 5. Splash media magic-byte detection
assert.deepStrictEqual(
  detectSplashMedia(Buffer.from([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D]), '.mp4'),
  { mime: 'video/mp4', kind: 'video' }
);
assert.deepStrictEqual(
  detectSplashMedia(Buffer.from([0, 0, 0, 0x14, 0x6D, 0x6F, 0x6F, 0x76, 0, 0, 0, 0]), '.mov'),
  { mime: 'video/mp4', kind: 'video' }
);
assert.deepStrictEqual(
  detectSplashMedia(Buffer.from([0x1A, 0x45, 0xDF, 0xA3, 0x9F, 0x42, 0x86, 0x81]), '.webm'),
  { mime: 'video/webm', kind: 'video' }
);
assert.deepStrictEqual(
  detectSplashMedia(Buffer.from('OggS\x00\x02\x00\x00'), '.ogv'),
  { mime: 'video/ogg', kind: 'video' }
);
assert.deepStrictEqual(
  detectSplashMedia(Buffer.from('GIF89a000000'), '.gif'),
  { mime: 'image/gif', kind: 'image' }
);
assert.deepStrictEqual(
  detectSplashMedia(Buffer.from('RIFF\x12\x34\x56\x78WEBP'), '.webp'),
  { mime: 'image/webp', kind: 'image' }
);
assert.strictEqual(detectSplashMedia(Buffer.from('not-a-video-file'), '.mp4'), null);
assert.strictEqual(detectSplashMedia(Buffer.from('GIF89a000000'), '.exe'), null);

// 6. HTTP byte-range parser for video streaming
assert.deepStrictEqual(parseByteRange('bytes=0-99', 1000), { start: 0, end: 99, unsatisfiable: false });
assert.deepStrictEqual(parseByteRange('bytes=500-', 1000), { start: 500, end: 999, unsatisfiable: false });
assert.deepStrictEqual(parseByteRange('bytes=-200', 1000), { start: 800, end: 999, unsatisfiable: false });
assert.deepStrictEqual(parseByteRange('bytes=0-5000', 1000), { start: 0, end: 999, unsatisfiable: false });
assert.deepStrictEqual(parseByteRange('bytes=1500-2000', 1000), { unsatisfiable: true });
assert.strictEqual(parseByteRange('invalid', 1000), null);

// 7. Splash player HTML generator
const videoHtml = buildSplashPageHtml({
  backgroundColor: '#131313',
  mediaUrl: 'http://127.0.0.1:12345/tok/media/abc',
  mediaKind: 'video',
  fit: 'contain',
  muted: true,
  volume: 0.7,
  loop: false,
  isPreview: false,
  isZh: true
});
assert.ok(videoHtml.includes('<video id="agl-media"'));
assert.ok(videoHtml.includes('object-fit: contain;'));
assert.ok(videoHtml.includes('muted'));
assert.ok(videoHtml.includes('const canSkip = false;'));
assert.ok(!videoHtml.includes('<button id="agl-hint"'));
assert.ok(!videoHtml.includes('点击或按 Esc 跳过'));

const imgHtml = buildSplashPageHtml({
  backgroundColor: '#FAFAFA',
  mediaUrl: 'http://127.0.0.1:12345/tok/media/def',
  mediaKind: 'image',
  fit: 'cover',
  isPreview: true,
  isZh: false
});
assert.ok(imgHtml.includes('<img id="agl-media"'));
assert.ok(imgHtml.includes('object-fit: cover;'));
assert.ok(imgHtml.includes('const canSkip = true;'));
assert.ok(imgHtml.includes('Preview · Click or press Esc to close'));

console.log('ALL JS LAUNCHER SETTINGS & HOOK TESTS PASSED');
