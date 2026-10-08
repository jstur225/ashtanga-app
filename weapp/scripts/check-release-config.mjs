import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const clientConfig = require(path.join(root, 'config.js'));
const projectConfig = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
const privateProjectConfig = JSON.parse(fs.readFileSync(path.join(root, 'project.private.config.json'), 'utf8'));
const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const sitemap = JSON.parse(fs.readFileSync(path.join(root, appConfig.sitemapLocation || 'sitemap.json'), 'utf8'));

const failures = [];

function collectRuntimeText(target) {
  const stats = fs.statSync(target);
  if (stats.isFile()) return fs.readFileSync(target, 'utf8');
  return fs.readdirSync(target, { withFileTypes: true }).map((entry) => {
    const absolute = path.join(target, entry.name);
    if (entry.isDirectory()) return collectRuntimeText(absolute);
    return /\.(?:js|json|wxml|wxss)$/.test(entry.name) ? fs.readFileSync(absolute, 'utf8') : '';
  }).join('\n');
}

function check(condition, message) {
  if (condition) console.log(`PASS  ${message}`);
  else failures.push(message);
}

function isHttpsUrl(value) {
  try {
    return new URL(String(value || '')).protocol === 'https:';
  } catch (error) {
    return false;
  }
}

check(projectConfig.appid === 'wx36f4826bc022d43f', '使用新主体 AppID');
check(projectConfig.setting?.urlCheck === true, '公开项目配置开启合法域名检查');
check(privateProjectConfig.setting?.urlCheck === true, '本机项目配置未关闭合法域名检查');
check(projectConfig.setting?.scopeDataCheck === true, '开启作用域数据检查');
check(privateProjectConfig.setting?.bigPackageSizeSupport !== true, '未启用大包绕过选项');
check(isHttpsUrl(clientConfig.apiBaseUrl), '业务 API 使用 HTTPS');
check(isHttpsUrl(clientConfig.supabaseUrl), 'Supabase 使用 HTTPS');
check(
  /^sb_publishable_[A-Za-z0-9_-]+$/.test(String(clientConfig.supabaseAnonKey || '')),
  '客户端只使用 Supabase publishable key'
);
check(
  !/service_role|sb_secret_/i.test(String(clientConfig.supabaseAnonKey || '')),
  '客户端未包含 service role 或 secret key'
);
const runtimeText = [
  'app.js',
  'app.json',
  'config.js',
  'pages',
  'components',
  'services',
  'utils',
].map((entry) => collectRuntimeText(path.join(root, entry))).join('\n');
check(
  !/WECHAT_MINI_APP_SECRET|WECHAT_PAY_PRIVATE_KEY|WECHAT_PAY_API_V3_KEY|WECHAT_VIRTUAL_PAY_(?:SANDBOX|PRODUCTION)_APP_KEY|-----BEGIN PRIVATE KEY-----/.test(runtimeText),
  '小程序运行包不包含微信 AppSecret、APIv3 密钥或商户私钥'
);
check(appConfig.sitemapLocation === 'sitemap.json', '已声明小程序 sitemap');
check(
  sitemap.rules?.some((rule) => rule.action === 'disallow' && rule.page === 'pages/index/index'),
  '认证入口不参与微信搜索索引'
);
check(
  sitemap.rules?.some((rule) => rule.action === 'disallow' && rule.page === 'pages/privacy/privacy'),
  '独立隐私页不参与微信搜索索引'
);

if (failures.length) {
  for (const message of failures) console.error(`FAIL  ${message}`);
  process.exitCode = 1;
} else {
  console.log('WeApp release configuration checks passed.');
}
