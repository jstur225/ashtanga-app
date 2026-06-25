# L5 真实云端测试说明

> L5 会真实访问 Supabase。只在你准备好专用测试账号和 `.env.test` 后运行。不要用生产账号冒险。

## 什么时候需要跑 L5

L5 用来验证真实云端链路：

- 测试账号能登录。
- 测试账号数据能被 reset 流程清空。
- `practice_records` 能真实插入、查询、删除。
- 同步上传、冲突合并能通过真实 Supabase RLS。

日常代码重构先跑 L1-L4。只有改到 Supabase、认证、同步、RLS、上传下载、真实账号隔离时，再跑 L5。

## 准备 `.env.test`

复制模板：

```powershell
Copy-Item .env.test.example .env.test
```

填写真实测试环境：

```text
TEST_USER_EMAIL=ashtanga+l5-test@example.com
TEST_USER_PASSWORD=replace-with-test-account-password

NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=replace-with-test-anon-key
SUPABASE_SERVICE_ROLE_KEY=replace-with-test-service-role-key
```

安全要求：

- `.env.test` 已被 `.gitignore` 忽略，不要提交。
- `SUPABASE_SERVICE_ROLE_KEY` 只能放本地。
- `TEST_USER_EMAIL` 必须是专用测试账号，不能是真实用户账号。
- 当前白名单规则在 [`__tests__/L5/setup.ts`](../../__tests__/L5/setup.ts)，邮箱需要包含 `@test.com`、`+test`、`@example.com` 或明确列入白名单。

## 测试账号准备

在 Supabase 测试项目里创建一个专用账号：

1. 创建 `TEST_USER_EMAIL` 对应账号。
2. 设置 `TEST_USER_PASSWORD`。
3. 确认账号可以使用 password 登录。
4. 不要把真实用户数据放到这个账号下。

## 运行

```powershell
npm.cmd run test:L5
```

L5 配置在 [`vitest.config.e2e.mjs`](../../vitest.config.e2e.mjs)：

- 只运行 `__tests__/L5/**/*.e2e.test.ts`
- Node 环境
- 串行执行，避免同一个测试账号并发互相污染
- 每个 worker 内由 [`__tests__/L5/setup.ts`](../../__tests__/L5/setup.ts) 加载 `.env.test`

## reset 流程

L5 测试文件会在 `beforeAll/afterAll` 调用 [`scripts/reset-test-account.ts`](../../scripts/reset-test-account.ts)。

当前 reset 设计：

- 使用已经登录的 anon client。
- 严格按 `user_id = 当前测试账号 user.id` 删除。
- 不删除 `auth.users` 账号本身。
- 按依赖顺序清理业务表：
  - `photos`
  - `practice_records`
  - `practice_options`
  - `annotation_types`
  - `user_memberships`
  - `user_profiles`

如果某张表删除失败，测试会暴露出来；不要手动改生产数据来“修”测试。

## 常见失败

### 缺 `.env.test`

现象：

```text
[L5 setup] 缺少 .env.test
```

处理：复制 `.env.test.example` 为 `.env.test` 并填写真实测试环境。

### 邮箱不在白名单

现象：

```text
[L5 setup] TEST_USER_EMAIL=... 不在测试白名单内
```

处理：换成专用测试邮箱，或在确认安全后更新 `__tests__/L5/setup.ts` 白名单。

### 登录失败

现象：

```text
[signInTestUser] 登录失败
```

处理：检查 Supabase Auth 账号是否存在、密码是否正确、项目 URL/anon key 是否来自同一个测试项目。

### service role key 不对

现象：

```text
[L5 setup] SUPABASE_SERVICE_ROLE_KEY 值不对
```

处理：从 Supabase 测试项目 Settings → API 复制 service_role key。不要使用 anon key 代替。

## 与 L4 的区别

L4 登录态 UI 已通过本地 seed 固化，不依赖云端数据。

L5 是真实云端测试，会触达 Supabase。它验证的是“云端链路真的通”，不是浏览器 UI 是否能打开。
