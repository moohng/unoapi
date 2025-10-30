const ua = process.env.npm_config_user_agent || '';
const expected = 'pnpm/';

if (!ua.startsWith(expected)) {
  console.error(`❌ 错误：本项目要求使用 ${expected.replace('/', '')} 安装依赖`);
  console.error(`当前检测到：${ua || '未知'}`);
  console.error(`请先使用 corepack enable，然后运行 pnpm install`);
  process.exit(1);
}