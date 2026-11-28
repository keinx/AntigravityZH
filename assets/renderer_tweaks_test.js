'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const {
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
} = require('./renderer_tweaks.js');

// 1. Bilingual label matchers
assert.strictEqual(normalizeText('  查看用量 \n '), '查看用量');
assert.strictEqual(isUpgradeButtonLabel('Upgrade'), true);
assert.strictEqual(isUpgradeButtonLabel('升级'), true);
assert.strictEqual(isUpgradeButtonLabel('Update'), false);
assert.strictEqual(isUpgradeButtonLabel('Google AI Pro'), false);

assert.strictEqual(isViewUsageLabel('View Usage'), true);
assert.strictEqual(isViewUsageLabel('查看用量'), true);
assert.strictEqual(isViewUsageLabel('Usage'), false);

assert.strictEqual(isModelMenuHeader('Model'), true);
assert.strictEqual(isModelMenuHeader('Models'), true);
assert.strictEqual(isModelMenuHeader('模型'), true);
assert.strictEqual(isModelMenuHeader('Models & Usage'), false);

assert.strictEqual(isModelTooltipText('选择模型 ⌘/'), true);
assert.strictEqual(isModelTooltipText('Select Model ⌘/'), true);
assert.strictEqual(isModelTooltipText('Select Model Ctrl+/'), true);
assert.strictEqual(isModelTooltipText('选择模型'), true);
assert.strictEqual(isModelTooltipText('查看用量'), false);
assert.strictEqual(isModelTooltipText('Gemini 4 Neon 高'), false);

assert.strictEqual(isSettingsModelsTabLabel('Models & Usage'), true);
assert.strictEqual(isSettingsModelsTabLabel('模型与用量'), true);
assert.strictEqual(isSettingsModelsTabLabel('Models'), true);
assert.strictEqual(isSettingsModelsTabLabel('模型'), true);
assert.strictEqual(isSettingsModelsTabLabel('Browser'), false);

assert.strictEqual(getUsageLabel(true), '查看用量');
assert.strictEqual(getUsageLabel(false), 'View Usage');

// 2. Permission & environment exclusion vs model selector candidate scoring
assert.strictEqual(isPermissionButtonLabel('极速'), true);
assert.strictEqual(isPermissionButtonLabel('Turbo'), true);
assert.strictEqual(isPermissionButtonLabel('默认'), true);
assert.strictEqual(isPermissionButtonLabel('Default'), true);
assert.strictEqual(isPermissionButtonLabel('执行前请求确认'), true);
assert.strictEqual(isPermissionButtonLabel('Gemini 4 Neon 高'), false);

assert.strictEqual(isEnvironmentButtonLabel('本机电脑'), true);
assert.strictEqual(isEnvironmentButtonLabel('本地检出'), true);
assert.strictEqual(isEnvironmentButtonLabel('This Computer'), true);
assert.strictEqual(isEnvironmentButtonLabel('Claude Opus 5.5 中'), false);

assert.strictEqual(looksLikeModelName('Gemini 4 Neon 高'), true);
assert.strictEqual(looksLikeModelName('Claude Opus 5.5 中'), true);
assert.strictEqual(looksLikeModelName('GPT-OSS 120B (中)'), true);
assert.strictEqual(looksLikeModelName('Orchestrator Gemini 4 Neon High'), true);
assert.strictEqual(looksLikeModelName('查看用量'), false);

assert.ok(isModelButtonCandidate({ text: 'Gemini 4 Neon 高', hasDropdownHint: true, inLeftHalf: true }) >= 100);
assert.ok(isModelButtonCandidate({ text: 'Claude Sonnet 5.5 中', hasDropdownHint: true, inLeftHalf: true }) >= 100);
assert.ok(isModelButtonCandidate({ text: 'Custom Model X', ariaLabel: 'Select Model', hasDropdownHint: true, inLeftHalf: true }) >= 100);
assert.ok(isModelButtonCandidate({ text: 'Unknown Future AI', hasDropdownHint: true, inLeftHalf: true }) > 0);
assert.strictEqual(isModelButtonCandidate({ text: '极速', hasDropdownHint: true, inLeftHalf: false }), 0);
assert.strictEqual(isModelButtonCandidate({ text: '查看用量', hasDropdownHint: false, inLeftHalf: true }), 0);
assert.strictEqual(isModelButtonCandidate({ text: '', ariaLabel: 'Add Context', hasDropdownHint: true, inLeftHalf: true }), 0);
assert.strictEqual(isModelButtonCandidate({ text: '本机电脑', hasDropdownHint: true, inLeftHalf: true }), 0);

// 3. Upgrade row identification (must hide plan+upgrade row without touching View Usage or models)
assert.strictEqual(looksLikeUpgradeRowText('升级'), true);
assert.strictEqual(looksLikeUpgradeRowText('Google AI Pro 升级'), true);
assert.strictEqual(looksLikeUpgradeRowText('Google AI Free Upgrade'), true);
assert.strictEqual(looksLikeUpgradeRowText('查看用量 Google AI Pro 升级'), false);
assert.strictEqual(looksLikeUpgradeRowText('View Usage Google AI Pro Upgrade'), false);
assert.strictEqual(looksLikeUpgradeRowText('Gemini 4 Neon 高 Google AI Pro 升级'), false);
assert.strictEqual(looksLikeUpgradeRowText('GPT-OSS 120B 升级'), false);

// 4. Usage panel vs parent model menu content discrimination
assert.strictEqual(looksLikeUsageContent('用量统计 Gemini 模型 每周限额 98% 剩余 5 小时限额 100% 剩余'), true);
assert.strictEqual(looksLikeUsageContent('Usage Gemini Models Weekly limit 92% left 5h limit 100% left'), true);
assert.strictEqual(looksLikeUsageContent('Claude and GPT models Resets in 3h 20m'), true);
assert.strictEqual(looksLikeUsageContent('模型 Gemini 4 Neon 高 Gemini 4 Carbon 中 Claude Opus 5.5 查看用量 Google AI Pro 升级'), false);
assert.strictEqual(looksLikeUsageContent('Models Gemini 4 Neon High Claude Opus 5.5 View Usage Upgrade'), false);

// 5. Settings dialog discrimination (never hide Upgrade button inside Settings -> Models & Usage)
assert.strictEqual(looksLikeSettingsDialogText('设置 常规 应用程序 外观 快捷键 系统通知 模型与用量 权限管理 浏览器 账号'), true);
assert.strictEqual(looksLikeSettingsDialogText('Settings General Appearance Shortcuts Browser Account Models & Usage'), true);
assert.strictEqual(looksLikeSettingsDialogText('模型 Gemini 4 Neon 高 查看用量 Google AI Pro 升级'), false);

// 6. Model name hit counting
assert.ok(countModelNameHits('Gemini 4 Neon 高 Gemini 4 Carbon 中 Claude Opus 5.5') >= 4);
assert.strictEqual(countModelNameHits('Google AI Pro 升级'), 0);

// 7. Horizontal flex row detection (prevents button wrapping inside block/column wrappers)
assert.strictEqual(isHorizontalFlexRow({ display: 'flex', flexDirection: 'row' }), true);
assert.strictEqual(isHorizontalFlexRow({ display: 'inline-flex', flexDirection: 'row' }), true);
assert.strictEqual(isHorizontalFlexRow({ display: 'flex', flexDirection: 'column' }), false);
assert.strictEqual(isHorizontalFlexRow({ display: 'block' }), false);
assert.strictEqual(isHorizontalFlexRow({ display: 'grid', gridAutoFlow: 'column' }), true);
assert.strictEqual(isHorizontalFlexRow({ display: 'grid', gridAutoFlow: 'row' }), false);

// 8. Usage popover anchor positioning clamped cleanly inside viewport (including containing-block offset compensation)
const posNormal = computeUsagePopoverPosition(
  { left: 260, top: 640, right: 350, bottom: 668 },
  { left: 0, top: 0, width: 280, height: 220 },
  { width: 1280, height: 720 }
);
assert.strictEqual(posNormal.left, 260);
assert.strictEqual(posNormal.top, 412);
assert.strictEqual(posNormal.desiredLeft, 260);
assert.strictEqual(posNormal.desiredTop, 412);

// Compensate for transformed / backdrop-filter ancestor containing block (e.g. origin at 680, 450)
const posContainingBlock = computeUsagePopoverPosition(
  { left: 470, top: 690, right: 560, bottom: 718 },
  { left: 680, top: 450, width: 260, height: 220 },
  { width: 1280, height: 800 }
);
assert.strictEqual(posContainingBlock.desiredLeft, 470);
assert.strictEqual(posContainingBlock.desiredTop, 462);
assert.strictEqual(posContainingBlock.left, -210);
assert.strictEqual(posContainingBlock.top, 12);

const posRightEdge = computeUsagePopoverPosition(
  { left: 1120, top: 640, right: 1210, bottom: 668 },
  { left: 0, top: 0, width: 300, height: 220 },
  { width: 1280, height: 720 }
);
assert.strictEqual(posRightEdge.left, 968);
assert.strictEqual(posRightEdge.top, 412);

const posLeftEdge = computeUsagePopoverPosition(
  { left: 4, top: 640, right: 90, bottom: 668 },
  { left: 0, top: 0, width: 280, height: 220 },
  { width: 1280, height: 720 }
);
assert.strictEqual(posLeftEdge.left, 12);
assert.strictEqual(posLeftEdge.top, 412);

// 9. Static safety checks: React-safe hiding & skip attributes on injected button
const src = fs.readFileSync(path.join(__dirname, 'renderer_tweaks.js'), 'utf8');
assert.ok(src.includes('data-aglaunch-hide-upgrade'), 'must hide Upgrade via data attribute + CSS');
assert.ok(src.includes('data-aglaunch-ui'), 'injected usage button must set data-aglaunch-ui');
assert.ok(src.includes('data-aglaunch-skip'), 'injected usage button must set data-aglaunch-skip');
assert.ok(!/upgradeRow\.remove\(|usageItem\.remove\(/i.test(src), 'must never directly remove React-managed DOM nodes');

console.log('ALL JS UI TWEAKS TESTS PASSED');
