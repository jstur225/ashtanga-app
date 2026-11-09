const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const projectConfigPath = path.join(__dirname, '../project.config.json');
const privateProjectConfigPath = path.join(__dirname, '../project.private.config.json');
const clientConfigPath = path.join(__dirname, '../config.js');
const sitemapPath = path.join(__dirname, '../sitemap.json');
const projectConfigSource = fs.readFileSync(projectConfigPath, 'utf8');
const privateProjectConfigSource = fs.readFileSync(privateProjectConfigPath, 'utf8');
const clientConfigSource = fs.readFileSync(clientConfigPath, 'utf8');
const sitemapSource = fs.readFileSync(sitemapPath, 'utf8');
const projectConfig = JSON.parse(projectConfigSource);
const privateProjectConfig = JSON.parse(privateProjectConfigSource);
const sitemap = JSON.parse(sitemapSource);
const clientConfig = require(clientConfigPath);

test('微信开发者工具使用新个体工商户主体的小程序 AppID', () => {
  assert.equal(projectConfig.appid, 'wx36f4826bc022d43f');
  assert.notEqual(projectConfig.appid, 'wx7c2db098856e4ac4');
});

test('小程序公开配置不包含微信 AppSecret', () => {
  assert.doesNotMatch(projectConfigSource, /app[_-]?secret|appsecret/i);
  assert.doesNotMatch(clientConfigSource, /wechat[_-]?secret|app[_-]?secret|appsecret/i);
});

test('小程序只携带 Supabase publishable key，不包含服务端密钥', () => {
  assert.match(clientConfig.supabaseAnonKey, /^sb_publishable_[A-Za-z0-9_-]+$/);
  assert.doesNotMatch(clientConfig.supabaseAnonKey, /service_role|sb_secret_/i);
  assert.match(clientConfig.apiBaseUrl, /^https:\/\//);
  assert.match(clientConfig.supabaseUrl, /^https:\/\//);
});

test('发布门禁脚本与只读 RLS 审计文件已纳入项目', () => {
  assert.equal(fs.existsSync(path.join(__dirname, '../scripts/check-release-config.mjs')), true);
  assert.equal(fs.existsSync(path.join(__dirname, '../../supabase/rls_release_audit.sql')), true);
  const auditSql = fs.readFileSync(path.join(__dirname, '../../supabase/rls_release_audit.sql'), 'utf8');
  assert.match(auditSql, /not c\.relrowsecurity/);
  assert.match(auditSql, /pg_policies/);
  assert.match(auditSql, /security_definer/);
});

test('发布验收开启域名和作用域检查，并排除非运行文件', () => {
  assert.equal(projectConfig.setting.urlCheck, true);
  assert.equal(privateProjectConfig.setting.urlCheck, true);
  assert.equal(projectConfig.setting.scopeDataCheck, true);
  assert.notEqual(privateProjectConfig.setting.bigPackageSizeSupport, true);
  const ignored = projectConfig.packOptions.ignore.map((item) => `${item.type}:${item.value}`);
  assert.ok(ignored.includes('folder:tests'));
  assert.ok(ignored.includes('folder:scripts'));
  assert.ok(ignored.includes('file:WECHAT_DEV_LOG.md'));
});

test('搜索索引不暴露认证页和独立隐私页', () => {
  assert.ok(sitemap.rules.some((rule) => rule.action === 'disallow' && rule.page === 'pages/index/index'));
  assert.ok(sitemap.rules.some((rule) => rule.action === 'disallow' && rule.page === 'pages/privacy/privacy'));
});
