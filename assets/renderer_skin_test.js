'use strict';

const assert = require('assert');
const {
  DEFAULT_SKIN_CONFIG,
  SUPPORTED_SKIN_EXTENSIONS,
  normalizeSkinConfig,
  parseRgbColor,
  isDarkRgb,
  isNeutralSurfaceColor,
  isColorClose,
  resolveCssVars
} = require('./renderer_skin.js');

// 1. Supported static image extensions (no animated GIF or scriptable SVG)
assert.ok(SUPPORTED_SKIN_EXTENSIONS.includes('.png'));
assert.ok(SUPPORTED_SKIN_EXTENSIONS.includes('.jpg'));
assert.ok(SUPPORTED_SKIN_EXTENSIONS.includes('.jpeg'));
assert.ok(SUPPORTED_SKIN_EXTENSIONS.includes('.webp'));
assert.ok(SUPPORTED_SKIN_EXTENSIONS.includes('.bmp'));
assert.ok(SUPPORTED_SKIN_EXTENSIONS.includes('.avif'));
assert.ok(!SUPPORTED_SKIN_EXTENSIONS.includes('.gif'));
assert.ok(!SUPPORTED_SKIN_EXTENSIONS.includes('.svg'));

// 2. normalizeSkinConfig defaults & clamping
const defCfg = normalizeSkinConfig(null);
assert.deepStrictEqual(defCfg, Object.assign({}, DEFAULT_SKIN_CONFIG));

const clamped = normalizeSkinConfig({
  enabled: 1,
  imagePath: '  /tmp/wallpaper.png  ',
  mode: 'invalid-mode',
  scope: 'main',
  fit: 'fill',
  position: 'unknown-pos',
  opacity: 5.5,
  scrimOpacity: -1,
  surfaceOpacity: -0.2,
  blur: 99,
  overlayOpacity: 0.99
});
assert.strictEqual(clamped.enabled, true);
assert.strictEqual(clamped.imagePath, '/tmp/wallpaper.png');
assert.strictEqual(clamped.mode, 'blend');
assert.strictEqual(clamped.scope, 'main');
assert.strictEqual(clamped.fit, 'fill');
assert.strictEqual(clamped.position, 'center');
assert.strictEqual(clamped.opacity, 1);
assert.strictEqual(clamped.scrimOpacity, 0);
assert.strictEqual(clamped.surfaceOpacity, 0);
assert.strictEqual(clamped.blur, 24);
assert.strictEqual(clamped.overlayOpacity, 0.5);

// 2b. Untouched v1 defaults auto-migrate to crisp v2 defaults
const migrated = normalizeSkinConfig({
  version: 1,
  enabled: true,
  imagePath: '/tmp/a.jpg',
  opacity: 0.85,
  scrimOpacity: 0.45,
  surfaceOpacity: 0.78
});
assert.strictEqual(migrated.version, 2);
assert.strictEqual(migrated.opacity, 1);
assert.strictEqual(migrated.scrimOpacity, 0.22);
assert.strictEqual(migrated.surfaceOpacity, 0.45);

const overlayCfg = normalizeSkinConfig({
  enabled: true,
  mode: 'overlay',
  scope: 'full',
  fit: 'contain',
  position: 'top',
  opacity: 'not-a-number',
  blur: 6.4,
  overlayOpacity: 0.01
});
assert.strictEqual(overlayCfg.mode, 'overlay');
assert.strictEqual(overlayCfg.fit, 'contain');
assert.strictEqual(overlayCfg.position, 'top');
assert.strictEqual(overlayCfg.opacity, DEFAULT_SKIN_CONFIG.opacity);
assert.strictEqual(overlayCfg.blur, 6);
assert.strictEqual(overlayCfg.overlayOpacity, 0.03);

// 3. Color parsing and neutral surface detection
assert.deepStrictEqual(parseRgbColor('rgb(18, 20, 26)'), { r: 18, g: 20, b: 26, a: 1 });
assert.deepStrictEqual(parseRgbColor('rgba(255, 255, 255, 0.5)'), { r: 255, g: 255, b: 255, a: 0.5 });
assert.deepStrictEqual(parseRgbColor('rgb(30 34 42 / 95%)'), { r: 30, g: 34, b: 42, a: 0.95 });
assert.deepStrictEqual(parseRgbColor('color(srgb 0.1 0.1 0.1 / 1)'), { r: 26, g: 26, b: 26, a: 1 });
assert.strictEqual(parseRgbColor('transparent'), null);

assert.strictEqual(isDarkRgb({ r: 20, g: 22, b: 28, a: 1 }), true);
assert.strictEqual(isDarkRgb({ r: 245, g: 247, b: 250, a: 1 }), false);

// Neutral dark/light surfaces should be recognized; vivid accent buttons and transparent backgrounds skipped
assert.strictEqual(isNeutralSurfaceColor({ r: 24, g: 26, b: 33, a: 1 }), true);
assert.strictEqual(isNeutralSurfaceColor({ r: 244, g: 246, b: 250, a: 1 }), true);
assert.strictEqual(isNeutralSurfaceColor({ r: 37, g: 99, b: 235, a: 1 }), false);
assert.strictEqual(isNeutralSurfaceColor({ r: 220, g: 38, b: 38, a: 1 }), false);
assert.strictEqual(isNeutralSurfaceColor({ r: 24, g: 26, b: 33, a: 0.5 }), false);

assert.strictEqual(isColorClose({ r: 20, g: 22, b: 26 }, { r: 24, g: 24, b: 29 }, 8), true);
assert.strictEqual(isColorClose({ r: 20, g: 22, b: 26 }, { r: 45, g: 48, b: 56 }, 8), false);

// 4. CSS custom property generation (dark vs light, fill vs cover)
const darkVars = resolveCssVars({
  mode: 'blend',
  fit: 'fill',
  position: 'bottom',
  opacity: 0.9,
  scrimOpacity: 0.2,
  surfaceOpacity: 0.5,
  blur: 4,
  overlayOpacity: 0.12
}, true);
assert.strictEqual(darkVars['--agzh-skin-size'], '100% 100%');
assert.strictEqual(darkVars['--agzh-skin-position'], 'center bottom');
assert.strictEqual(darkVars['--agzh-skin-scrim-rgb'], '11, 13, 18');
assert.strictEqual(darkVars['--agzh-skin-blur'], '4px');
assert.strictEqual(darkVars['--agzh-surface-alpha'], '0.5');
assert.strictEqual(darkVars['--agzh-panel-blur'], '10px');
assert.strictEqual(darkVars['--agzh-modal-alpha'], '0.86');

const clearVars = resolveCssVars({ surfaceOpacity: 0 }, true);
assert.strictEqual(clearVars['--agzh-panel-blur'], '0px');

const lightVars = resolveCssVars({ fit: 'cover', position: 'left' }, false);
assert.strictEqual(lightVars['--agzh-skin-size'], 'cover');
assert.strictEqual(lightVars['--agzh-skin-position'], 'left center');
assert.strictEqual(lightVars['--agzh-skin-scrim-rgb'], '248, 250, 252');

console.log('ALL JS SKIN ENGINE TESTS PASSED');
