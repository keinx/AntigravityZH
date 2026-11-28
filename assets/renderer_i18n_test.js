'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTranslator } = require('./renderer_i18n.js');

const dict = JSON.parse(fs.readFileSync(path.join(__dirname, 'dict_zh_cn.json'), 'utf8'));
const { translateString } = createTranslator(dict);

assert.strictEqual(translateString('Settings', false), '设置');
assert.strictEqual(translateString('Browser', false), '浏览器');
assert.strictEqual(translateString('Appearance', false), '外观');
assert.strictEqual(translateString('Search Hosts\u2026', true), '搜索主机...');
assert.strictEqual(translateString('97% left', false), '剩余 97%');
assert.strictEqual(translateString('Resets in 6d 20h', false), '距重置还有 6 天 20 小时');
assert.strictEqual(translateString('Welcome back, 小明. Where should we pick up?', false), '欢迎回来，小明。我们从哪里继续？');
assert.strictEqual(translateString('Using browser · Thinking...', false), '正在使用浏览器 · 思考中...');
assert.strictEqual(translateString('8 browser steps', false), '8 个浏览器步骤');
assert.strictEqual(translateString('已经是中文', false), null);
assert.strictEqual(translateString('a'.repeat(700), false), null);

// Verify skipSelectors include Launcher UI markers.
assert.ok(dict.skipSelectors.includes('[data-aglaunch-skip]'));
assert.ok(dict.skipSelectors.includes('[data-aglaunch-ui]'));

// AutoCache isolation test.
const { translateString: txWithCache } = createTranslator(dict, {
  'Google Docs': '谷歌文档',
  'Read and edit your documents easily.': '轻松阅读和编辑您的文档。'
});
assert.strictEqual(txWithCache('Google Docs', false, false), null);
assert.strictEqual(txWithCache('Read and edit your documents easily.', false, true), '轻松阅读和编辑您的文档。');

// Performance check (5000 unmatched lookups).
const t0 = Date.now();
for (let i = 0; i < 5000; i++) {
  translateString('Some unmatched English text string number ' + i, false);
}
const elapsedMs = Date.now() - t0;
console.log('ALL JS I18N TESTS PASSED (5000 unmatched lookups: ' + elapsedMs + 'ms)');
