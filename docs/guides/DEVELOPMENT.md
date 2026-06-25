# 开发与验证说明

> 下次维护项目时先读这份，再看 [`../architecture/REFACTOR_RESUME.md`](../architecture/REFACTOR_RESUME.md)。这份文档只回答一个问题：现在怎么启动、怎么验证、哪些测试需要真实环境。

## 当前状态

- 重构阶段 1–6 主体已完成。
- 审核补漏已完成，常规门禁恢复绿色。
- L4 隔离浏览器测试已稳定：`51/51 passed, 0 skipped`。
- L5 仍是“真实云端冒烟”，需要 `.env.test`、Supabase 测试项目和专用测试账号。

## 日常启动

```powershell
npm install
npm.cmd run dev
```

默认开发服务使用 Next.js dev server。L4 Playwright 测试会自己在 `3100` 端口启动测试服务。

## 日常验证命令

按风险从低到高执行：

```powershell
npm.cmd run typecheck
npm.cmd run lint
npx.cmd vitest run
npm.cmd run build
npm.cmd run measure:initial-js
npm.cmd run test:L4
```

当前已确认结果：

| 命令 | 当前结果 |
|---|---|
| `npm.cmd run typecheck` | 通过 |
| `npm.cmd run lint` | 通过 |
| `npx.cmd vitest run` | 49 文件 / 527 项通过 |
| `npm.cmd run build` | 通过 |
| `npm.cmd run measure:initial-js` | 16 scripts / 1117.0 KiB raw / 335.5 KiB gzip |
| `npm.cmd run test:L4` | 51/51 通过，0 skipped |

## L4 测试说明

L4 是隔离浏览器测试，覆盖游客、移动端、登录态 UI：

```powershell
npm.cmd run test:L4
```

常用调试命令：

```powershell
npm.cmd run test:L4:headed
npm.cmd run test:L4:debug
npm.cmd run test:L4:ui
```

登录态 UI 不再依赖测试账号已有云端数据。`__tests__/L4/fixtures.ts` 里的 `seedL4PracticeData(page)` 会在应用启动前写入固定的本地 records/options/profile，并设置 `window.__hasAutoSynced__ = true`，避免首屏自动同步覆盖本地测试数据。

当前沙箱或离线环境访问 Supabase 测试云端可能失败，此时 `auth.setup` 会保存空白 storageState。只要 L4 使用本地 seed，这不影响 L4 结果。

如果 Playwright 结束后 dev server 没自动退出，可以检查并清理 `3100` 端口：

```powershell
netstat -ano | findstr :3100
Stop-Process -Id <LISTENING_PID>
```

## L5 测试说明

L5 是真实云端冒烟测试，只有在测试云端环境准备好后再跑：

```powershell
npm.cmd run test:L5
```

需要项目根目录 `.env.test` 至少包含：

```text
TEST_USER_EMAIL=
TEST_USER_PASSWORD=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

模板见项目根目录 [`.env.test.example`](../../.env.test.example)，完整说明见 [`L5_TESTING.md`](./L5_TESTING.md)。

注意：

- 使用专用测试账号，不要使用生产账号。
- `SUPABASE_SERVICE_ROLE_KEY` 只放在本地 `.env.test`，不要提交。
- L5 会触达真实 Supabase 数据，运行前确认 reset 脚本和测试账号隔离。

## 文档入口

- 当前恢复点：[`../architecture/REFACTOR_RESUME.md`](../architecture/REFACTOR_RESUME.md)
- L5 测试说明：[`L5_TESTING.md`](./L5_TESTING.md)
- 重构路线图：[`../architecture/DECOUPLING_ROADMAP.md`](../architecture/DECOUPLING_ROADMAP.md)
- 测试矩阵：[`../architecture/DECOUPLING_TEST_MATRIX.md`](../architecture/DECOUPLING_TEST_MATRIX.md)
- 性能基线：[`../architecture/PERFORMANCE_BASELINE.md`](../architecture/PERFORMANCE_BASELINE.md)
- 项目日志：[`../../ASHTANGA_PROJECT_LOG.md`](../../ASHTANGA_PROJECT_LOG.md)
- 当前 TODO：[`../../TODO.md`](../../TODO.md)

## 已知本机噪声

当前本机 `git status` 可能出现：

```text
unable to access 'C:\Users\BIN/.config/git/ignore': Permission denied
```

这是本机全局 Git ignore 权限问题，不是项目改动失败。要彻底消除，需要修本机 Git 配置或对应文件权限。
