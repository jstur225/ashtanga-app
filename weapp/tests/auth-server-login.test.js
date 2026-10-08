const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const routeSource = fs.readFileSync(path.join(root, 'app/api/auth/login/route.ts'), 'utf8');
const sendCodeSource = fs.readFileSync(path.join(root, 'app/api/auth/send-verification-code/route.ts'), 'utf8');
const authSource = fs.readFileSync(path.join(root, 'weapp/services/auth.js'), 'utf8');
const modalSource = fs.readFileSync(path.join(root, 'weapp/components/auth-modal/index.js'), 'utf8');

test('小程序邮箱登录复用网页版官方 Supabase SDK 的服务端认证入口', () => {
  assert.match(authSource, /appApiRequest\('\/api\/auth\/login'/);
  assert.doesNotMatch(authSource, /supabaseRequest\('\/auth\/v1\/token\?grant_type=password'/);
  assert.match(routeSource, /createClient\(supabaseUrl, supabaseKey/);
  assert.match(routeSource, /auth\.signInWithPassword\(\{ email, password \}\)/);
  assert.match(routeSource, /persistSession:\s*false/);
  assert.match(routeSource, /Cache-Control['"]?:\s*['"]no-store/);
  assert.match(routeSource, /credential_transport_match/);
  assert.match(routeSource, /provider_error_code/);
  assert.match(authSource, /diagnostic_probe: credentialProbe/);
  assert.match(authSource, /authDiagnosticDetails/);
  assert.doesNotMatch(routeSource, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.doesNotMatch(routeSource, /console\.(log|info|error).*password/);
  assert.doesNotMatch(authSource, /password_plaintext|credential_plaintext/);
});

test('历史账号登录不套用新密码强度规则', () => {
  assert.match(modalSource, /if \(!password\) return '请输入密码'/);
  assert.match(modalSource, /if \(requireCode\) \{\s*const passwordError = this\.validatePassword\(password\)/);
});

test('验证码用途只保留注册与忘记密码', () => {
  assert.ok(sendCodeSource.indexOf("if (!supportedTypes.includes(type))") < sendCodeSource.indexOf('const sixtySecondsAgo'));
  assert.match(sendCodeSource, /\['email_verification', 'reset_password'\]/);
  assert.doesNotMatch(sendCodeSource, /type === 'login'|登录验证码/);
  assert.equal(fs.existsSync(path.join(root, 'app/api/auth/login-with-code/route.ts')), false);
});
