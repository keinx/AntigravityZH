'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createTranslator } = require('./renderer_i18n.js');

const dict = JSON.parse(fs.readFileSync(path.join(__dirname, 'dict_zh_cn.json'), 'utf8'));
const { translateString } = createTranslator(dict);

// 1. Exact matches, menu merges, and Unicode ellipsis/quote normalization
assert.strictEqual(translateString('Settings', false), '设置');
assert.strictEqual(translateString('View', false), '视图');
assert.strictEqual(translateString('Workspace', false), '工作区');
assert.strictEqual(translateString('Window', false), '窗口');
assert.strictEqual(translateString('Search Hosts\u2026', true), '搜索主机...');
assert.strictEqual(translateString('Connect to SSH Host\u2026', false), '连接到 SSH 主机...');
assert.strictEqual(translateString('Choose File\u2026', false), '选择文件...');
assert.strictEqual(translateString('Connecting\u2026', false), '连接中...');
assert.strictEqual(translateString('Connecting to 127.0.0.1\u2026', false), '正在连接到 127.0.0.1...');
assert.strictEqual(translateString('A host can\u2019t contain spaces.', false), '主机名不能包含空格。');
assert.strictEqual(translateString('No matching hosts', false), '没有匹配的主机');
assert.strictEqual(translateString('Remote', false), '远程');
assert.strictEqual(translateString('Runs in a cloud environment', false), '在云端环境中运行');
assert.strictEqual(translateString('Invalid Media', false), '无效的媒体文件');
assert.strictEqual(translateString('Maximum number of attachments reached', false), '已达到附件数量上限');

// 2. Multi-line SSH error messages
const sshErr = "Couldn't connect to the SSH host. Check its name, your network and ssh config (e.g. a ProxyCommand), and that ssh to it works in a terminal without a prompt.\nssh exited (exit code 255): Connection refused";
const sshErrZh = translateString(sshErr, false);
assert.ok(sshErrZh.includes('无法连接到 SSH 主机'), 'expected translated SSH error');
assert.ok(sshErrZh.includes('SSH 已退出（退出码 255）：Connection refused'), 'expected translated exit code line');

assert.strictEqual(translateString("Couldn't connect to 127.0.0.1", false), '无法连接到 127.0.0.1');
assert.strictEqual(translateString("Couldn't connect to user@203.0.113.10:2222", false), '无法连接到 user@203.0.113.10:2222');

// 3. Mixed CJK + English greeting patterns
assert.strictEqual(
  translateString('Welcome back, 小明. Where should we pick up?', false),
  '欢迎回来，小明。我们从哪里继续？'
);
assert.strictEqual(
  translateString("Good to see you, 小明. What's next?", false),
  '很高兴见到你，小明。接下来做什么？'
);

// 4. Usage & dynamic regex patterns
assert.strictEqual(translateString('97% left', false), '剩余 97%');
assert.strictEqual(translateString('Resets in 6d 20h', false), '距重置还有 6 天 20 小时');
assert.strictEqual(translateString('Resets in 1h 21m', false), '距重置还有 1 小时 21 分钟');
assert.strictEqual(translateString('Enabling\u2026', false), '正在启用...');
assert.strictEqual(translateString('Disabling...', false), '正在禁用...');
assert.strictEqual(translateString('just now', false), '刚刚');
assert.strictEqual(translateString('· just now', false), '· 刚刚');
assert.strictEqual(translateString('Editing', false), '正在编辑');
assert.strictEqual(translateString('Editing renderer_i18n.js', false), '正在编辑 renderer_i18n.js');
assert.strictEqual(translateString('Preview is not available for this file type.', false), '此文件类型暂不支持预览。');
assert.strictEqual(translateString('Keep Open', false), '保持打开');
assert.strictEqual(translateString('Close Other Tabs', false), '关闭其他标签页');
assert.strictEqual(translateString('Close Tabs to the Left', false), '关闭左侧标签页');
assert.strictEqual(translateString('Close Tabs to the Right', false), '关闭右侧标签页');
assert.strictEqual(translateString('Drag to select a region to comment', false), '拖动以选择要批注的区域');
assert.strictEqual(translateString('Setup required', false), '需要配置');
assert.strictEqual(translateString('Search MCP servers by name', true), '按名称搜索 MCP 服务');
assert.strictEqual(translateString('Search for MCP servers to add to your configuration', false), '搜索要添加到配置中的 MCP 服务');
assert.strictEqual(translateString('Loading MCP servers...', false), '正在加载 MCP 服务...');
assert.strictEqual(translateString('Authenticate', false), '身份验证');
assert.strictEqual(translateString('Delete MCP Server', false), '删除 MCP 服务');
assert.strictEqual(translateString('Are you sure you want to delete', false), '确定要删除');
assert.strictEqual(translateString('? This will remove it from your MCP configuration.', false), ' 吗？此操作将从你的 MCP 配置中移除该服务。');
assert.strictEqual(translateString('Prerequisites', false), '前置条件');
assert.strictEqual(translateString('Example prompts', false), '示例提示词');
assert.strictEqual(translateString('Resources', false), '相关资源');
assert.strictEqual(translateString('Application', false), '应用程序');
assert.strictEqual(translateString('Interface Layout', false), '界面布局');
assert.strictEqual(translateString('Models & Usage', false), '模型与用量');
assert.strictEqual(translateString('Your plan: Google AI Pro', false), '当前方案：Google AI Pro');
assert.strictEqual(
  translateString('You have used some of your weekly limit, it will fully refresh in 6 days, 16 hours.', false),
  '你已使用部分每周配额，将在 6 天 16 小时后完全重置。'
);
assert.strictEqual(
  translateString('You have used some of your 5-hour limit, it will fully refresh in 2 hours, 53 minutes.', false),
  '你已使用部分 5 小时配额，将在 2 小时 53 分钟后完全重置。'
);
assert.strictEqual(translateString('Enter', false), null);
assert.strictEqual(translateString('Sign in required', false), '需要登录');
assert.strictEqual(translateString('Global Permissions', false), '全局权限');
assert.strictEqual(translateString('Tool Permissions', false), '工具权限');
assert.strictEqual(translateString('Network Permissions', false), '网络权限');
assert.strictEqual(translateString('Queue until after the current turn.', false), '排队等待当前轮次结束后发送。');
assert.strictEqual(translateString('Confident and clear', false), '自信清晰');
assert.strictEqual(translateString("How loud Antigravity's voice is.", false), '调整 Antigravity 的语音播放音量。');
assert.strictEqual(translateString('File Permissions', false), '文件权限');
assert.strictEqual(translateString('Available AI credits: 0', false), '可用 AI 额度：0');
assert.strictEqual(
  translateString('Models within this group: Gemini 4 Neon, Gemini 4 Carbon', false),
  '此分组包含的模型：Gemini 4 Neon, Gemini 4 Carbon'
);
assert.strictEqual(translateString('Chat Layout', false), '对话布局');
assert.strictEqual(translateString('Screen reader mode', false), '屏幕阅读器模式');
assert.strictEqual(translateString('Thinking for 7s', false), '已思考 7 秒');
assert.strictEqual(translateString('Run tests finished', false), 'Run tests 已完成');
assert.strictEqual(translateString('Built-in Browser', false), '内置浏览器');
assert.strictEqual(translateString('Danger Zone', false), '危险区域');
assert.strictEqual(translateString('1 active conversation and 1 archived conversation.', false), '1 个活跃对话和 1 个已归档对话。');
assert.strictEqual(translateString('Send feedback as user@example.com', false), '以 user@example.com 的身份发送反馈');
assert.strictEqual(translateString('Enable telemetry', false), '启用遥测数据');
assert.strictEqual(translateString('Welcome to Antigravity!', false), '欢迎使用 Antigravity！');
assert.strictEqual(translateString('Continue with Google', false), '使用 Google 账号继续');
assert.strictEqual(translateString('Use Business Account', false), '使用企业账号');
assert.strictEqual(translateString('Having trouble signing in?', false), '登录遇到问题？');
assert.strictEqual(translateString('Delete All Remote Agents Data?', false), '确定删除所有远程智能体数据？');
assert.strictEqual(translateString('Enabled "测试BUG".', false), '已启用「测试BUG」。');
assert.strictEqual(translateString('Daily at 9:00 AM', false), '每天上午 9:00');
assert.strictEqual(translateString('Tomorrow 9:00 AM', false), '明天上午 9:00');
assert.strictEqual(translateString('Next run tomorrow around 9:00 AM GMT+8', false), '下次运行：明天上午 9:00 左右 GMT+8');
assert.strictEqual(translateString('Gemini 4 Neon (Medium) · This computer', false), 'Gemini 4 Neon（中）· 本机电脑');
assert.strictEqual(translateString('Delete Task', false), '删除任务');
assert.strictEqual(translateString('? This action cannot be undone.', false), ' 吗？此操作无法撤销。');
assert.strictEqual(translateString('Started "测试BUG".', false), '已启动「测试BUG」。');
assert.strictEqual(translateString('Restarted "测试BUG".', false), '已重启「测试BUG」。');
assert.strictEqual(translateString('Standalone', false), '独立对话');
assert.strictEqual(translateString('Run tests and rebuild AntigravityZH.exe finished', false), '运行测试并重新编译 AntigravityZH.exe 已完成');
assert.strictEqual(translateString('Explored files, ran commands', false), '已浏览文件、运行命令');
assert.strictEqual(translateString('Edited artifact', false), '已编辑产物');
assert.strictEqual(translateString('Proceeded with', false), '已确认执行');
assert.strictEqual(translateString('Optimization Plan', false), '优化方案');
assert.strictEqual(translateString('已运行 in the sandbox', false), '已在沙箱中运行');
assert.strictEqual(translateString('in the sandbox', false), '（沙箱内）');
assert.strictEqual(translateString('Cancel (Ctrl+D)', false), '取消生成 (Ctrl+D)');
assert.strictEqual(translateString('Permissions cannot be changed while the agent is running', false), '智能体运行期间无法更改权限');
assert.strictEqual(translateString('Model cannot be changed while the agent is running', false), '智能体运行期间无法切换模型');
assert.strictEqual(translateString('Queue Message', false), '排队发送消息');
assert.strictEqual(translateString('Edit Conversation Title', false), '编辑对话标题');
assert.strictEqual(translateString('Downloading Update', false), '正在下载更新');
assert.strictEqual(translateString('Loading plugin...', false), '正在加载插件...');
assert.strictEqual(translateString('Modify permissions for file and terminal tools.', false), '修改文件与终端工具的权限。');
assert.strictEqual(translateString('Create and edit images with Kling Image 4.0, generate videos.', false), '使用可灵图像 4.0 创建和编辑图像、生成高质量视频内容。');
assert.strictEqual(translateString('Bring Claude, GPT, Muse, Kimi & more into Antigravity.', false), '将 Claude、GPT、Muse、Kimi 等多款大模型接入 Antigravity。');
assert.strictEqual(translateString('Not set', false), '未设置');
assert.strictEqual(translateString('Notification Preferences', false), '通知偏好设置');
assert.strictEqual(translateString('Open Preferences', false), '打开偏好设置');
assert.strictEqual(translateString('Dismiss', false), '忽略');
assert.strictEqual(translateString('Sorry, this account is ineligible to use Antigravity', false), '抱歉，当前账号暂不支持使用 Antigravity');
assert.strictEqual(translateString('Continue with different account', false), '切换其他账号继续');
assert.strictEqual(translateString('Compacting', false), '压缩中');
assert.strictEqual(translateString('Compacting...', false), '压缩中...');
assert.strictEqual(translateString('Applies to /btw and messages sent after this turn', false), '适用于 /btw 及本轮之后发送的消息');
assert.strictEqual(translateString('Stop Execution', false), '停止执行');
assert.strictEqual(translateString('User cancelled agent execution.', false), '用户已取消智能体执行。');
assert.strictEqual(translateString('Comment (C)', false), '批注 (C)');
assert.strictEqual(translateString('Explored artifact, ran command', false), '已浏览产物、运行命令');
assert.strictEqual(translateString('Exploring', false), '浏览中');
assert.strictEqual(translateString('Ran run', false), '已运行');
assert.strictEqual(translateString('Running commit CI fix, update tag', false), '正在运行 commit CI fix, update tag');
assert.strictEqual(translateString('Waiting for user input..', false), '等待用户输入...');
assert.strictEqual(translateString('Yes, allow this time', false), '是，仅本次允许');
assert.strictEqual(translateString('No (tell the agent what to do instead)', false), '否（告诉智能体改为执行什么）');
assert.strictEqual(translateString('(tell the agent what to do instead)', false), '（告诉智能体改为执行什么）');
assert.strictEqual(translateString('Yes, and always allow', false), '是，且始终允许');
assert.strictEqual(translateString('Skip (Esc), Skip All (Ctrl+Esc)', false), '跳过 (Esc)，全部跳过 (Ctrl+Esc)');
assert.strictEqual(translateString('Submit (↵)', false), '提交 (↵)');
assert.strictEqual(translateString('Yes, allow', false), '是，允许');
assert.strictEqual(translateString('Using browser · Thinking...', false), '正在使用浏览器 · 思考中...');
assert.strictEqual(translateString('8 browser steps', false), '8 个浏览器步骤');
assert.strictEqual(translateString('System Message', false), '系统消息');

// 4b. AutoCache is gated by allowAutoCache so cached plugin names never leak
const { translateString: txWithCache } = createTranslator(dict, {
  'Google Docs': '谷歌文档',
  'Read and edit your documents easily.': '轻松阅读和编辑您的文档。'
});
assert.strictEqual(txWithCache('Google Docs', false, false), null);
assert.strictEqual(txWithCache('Read and edit your documents easily.', false, true), '轻松阅读和编辑您的文档。');

// 5. Already Chinese / unmatched / long text skipped safely
assert.strictEqual(translateString('已经是中文', false), null);
assert.strictEqual(translateString('12345', false), null);
assert.strictEqual(translateString('Some brand new v3.0 button text', false), null);
assert.strictEqual(translateString('a'.repeat(700), false), null);

// 6. Performance benchmark for bucketed regex index (5000 unmatched English strings)
const t0 = Date.now();
for (let i = 0; i < 5000; i++) {
  translateString('Some unmatched English text string number ' + i, false);
}
const elapsedMs = Date.now() - t0;
console.log('ALL JS TRANSLATOR TESTS PASSED (5000 unmatched lookups: ' + elapsedMs + 'ms)');
