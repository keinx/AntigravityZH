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

assert.ok(SUPPORTED_SKIN_EXTENSIONS.includes('.png'));
assert.ok(SUPPORTED_SKIN_EXTENSIONS.includes('.webp'));
assert.ok(SUPPORTED_SKIN_EXTENSIONS.includes('.avif'));
assert.ok(!SUPPORTED_SKIN_EXTENSIONS.includes('.gif'));
assert.ok(!SUPPORTED_SKIN_EXTENSIONS.includes('.svg'));

assert.deepStrictEqual(normalizeSkinConfig(null), Object.assign({}, DEFAULT_SKIN_CONFIG));

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

assert.deepStrictEqual(parseRgbColor('rgb(18, 20, 26)'), { r: 18, g: 20, b: 26, a: 1 });
assert.deepStrictEqual(parseRgbColor('color(srgb 0.1 0.1 0.1 / 1)'), { r: 26, g: 26, b: 26, a: 1 });
assert.strictEqual(parseRgbColor('transparent'), null);

assert.strictEqual(isDarkRgb({ r: 20, g: 22, b: 28, a: 1 }), true);
assert.strictEqual(isDarkRgb({ r: 245, g: 247, b: 250, a: 1 }), false);
assert.strictEqual(isNeutralSurfaceColor({ r: 24, g: 26, b: 33, a: 1 }), true);
assert.strictEqual(isNeutralSurfaceColor({ r: 37, g: 99, b: 235, a: 1 }), false);
assert.strictEqual(isColorClose({ r: 20, g: 22, b: 26 }, { r: 24, g: 24, b: 29 }, 8), true);

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
assert.strictEqual(darkVars['--aglaunch-skin-size'], '100% 100%');
assert.strictEqual(darkVars['--aglaunch-skin-position'], 'center bottom');
assert.strictEqual(darkVars['--aglaunch-skin-scrim-rgb'], '11, 13, 18');
assert.strictEqual(darkVars['--aglaunch-skin-blur'], '4px');
assert.strictEqual(darkVars['--aglaunch-surface-alpha'], '0.5');
assert.strictEqual(darkVars['--aglaunch-panel-blur'], '10px');

const clearVars = resolveCssVars({ surfaceOpacity: 0 }, true);
assert.strictEqual(clearVars['--aglaunch-panel-blur'], '0px');

// Regression: never override direct body children's position/z-index (breaks fixed modal/dialog portals)
const fs = require('fs');
const path = require('path');
const skinSrc = fs.readFileSync(path.join(__dirname, 'renderer_skin.js'), 'utf8');
assert.ok(!/body\s*>\s*:not\([^)]+\)\s*\{[^}]*position\s*:\s*relative/i.test(skinSrc),
  'must not force position:relative on direct body children (clobbers fixed modals)');
assert.ok(/html\[data-aglaunch-skin-mode="blend"\]\s+body\s*\{[^}]*isolation\s*:\s*isolate/i.test(skinSrc),
  'blend mode should isolate body stacking context instead of repositioning body children');

console.log('ALL JS SKIN ENGINE TESTS PASSED');
