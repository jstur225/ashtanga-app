# 解耦重构恢复入口

> 下次启动本项目时先读这里。解耦重构主体已完成，当前进入维护模式；后续不再为了行数继续拆分，只按真实痛点/风险/改动频率做小刀优化。
>
> 不要重新排查页面编排、刷新恢复、媒体生命周期、同步分层、公开 debug/test API、验证码/会员日志泄露或 AuthModal 流程拆分。README/开发说明与 L5 模板/说明已归档；本地 `.env.test` 已填写并跑通 L5。

## 2026-06-26 最新恢复点（重构收尾，进入维护模式）

### 当前结论

- 核心阶段 1–6 已完成，可以停止主动重构。
- 后续不再以“继续阶段 N”或“降低行数”为默认节奏。
- 除非出现具体 bug、具体业务改动、具体维护痛点，否则不继续拆。
- 业务增长、获客、转化、线上 bug 和安全问题优先于纯结构优化。

### 后续拆分标准

只有满足以下任一条件，才继续拆：

- 模块经常改，而且每次改都要在一个文件里找很久。
- 一个文件同时承担两类以上职责，例如 UI + API 请求 + 状态机 + 数据格式化。
- 有安全、测试、线上 bug 或回归风险。
- 拆完后可以新增明确测试，或者让已有测试更容易写。
- 拆分后调用方更少知道内部细节，而不是只是多跳一个文件。

不满足这些条件就不拆。尤其不要因为“某文件还有 400/500/700 行”继续拆。

### 建议保留不拆

- `hooks/useSync.ts`：777 行，但它是同步 React facade + 副作用编排，已到合理下限；除非同步再出 bug，不主动拆。
- `lib/sync-utils.ts`：551 行，多为纯函数集合，测试覆盖较好；等具体函数变复杂再拆。
- `components/AuthModalForms.tsx`：421 行，目前可读性足够；继续拆输入框/按钮收益不高。
- `app/practice/page.tsx`：1196 行，已在目标范围内；除非新增功能继续挤进去，否则不要为了降到 800 行硬拆。

### 最后一刀已完成：会员激活 API

会员激活 API 已完成轻拆，作为本轮解耦重构的最后一刀：

- 目标：`app/api/membership/activate/route.ts`
- 拆分内容：鉴权、激活码解析/查询/校验、profile 获取、会员到期时间计算、会员写入、激活码消费均拆成 route 内部 helper。
- 边界：没有改数据库 schema、没有改响应字段、没有改用户可见行为。
- 对口测试：已覆盖未登录、malformed JSON、缺 code、格式错误、已使用、已过期、新开通写入/消费、续费累加 8 个场景。
- 验证：`npm.cmd run typecheck` 通过；API 对口测试 1 文件 / 35 项通过；全量 Vitest 49 文件 / 535 项通过。
- 结论：不再保留默认“下一刀”。后续只在具体 bug、业务改动、安全问题或维护痛点出现时小范围优化。

### 维护模式规则

1. 业务增长/获客/转化问题优先。
2. 线上 bug 和安全问题优先。
3. 有测试保护的小范围优化优先。
4. 纯行数型拆分暂停。

每次新功能开始前，只问一个问题：这个改动会不会把某个文件重新变成多职责热点？如果会，再顺手小拆；如果不会，就直接做业务。

## 2026-06-26 上一恢复点（AuthModal 表单视图拆分完成）

### 本轮拆分

- `components/AuthModal.tsx` 从 579 行降到 226 行，只保留弹窗壳、标题、模式切换、hook 接线和 submit 编排。
- 新增 `components/AuthModalForms.tsx`：
  - `LoginForm`
  - `RegisterForm`
  - `ForgotPasswordForm`
  - 共享 `AuthField`、`PasswordRequirements`、验证码已发送提示、重发按钮和错误提示。
- 没有改 API、hook 语义或用户可见流程。
- 补齐 `__tests__/practice-commands.test.tsx` 中 Sonner Toast action mock 的 TypeScript 类型，避免 `tsc` 报 tuple 类型错误。

### 本轮验证

```powershell
npm.cmd run typecheck
npm.cmd run lint
npx.cmd vitest run --config vitest.config.ts __tests__/auth-modal.test.tsx __tests__/auth-modal-accessibility.test.tsx
npx.cmd vitest run --config vitest.config.ts
```

当前结果：

- TypeScript：通过
- lint：通过
- AuthModal 对口测试：**2 文件 / 30 项通过**
- Vitest 全量：**49 文件 / 527 项通过**

## 2026-06-25 上一恢复点（AuthModal 流程拆分完成）

### 本轮拆分

- `components/AuthModal.tsx` 从 933 行降到 579 行，保留弹窗 UI 与接线职责。
- 新增 `hooks/useRegisterFlow.ts`：
  - 注册验证码发送/重发。
  - 注册验证码校验前置状态。
  - 注册倒计时与注册后自动登录。
- 新增 `hooks/useForgotPasswordFlow.ts`：
  - 忘记密码邮箱、验证码、新密码三步状态机。
  - 重发验证码倒计时。
  - 重置密码请求现在显式携带验证码 `code`。
- 新增 `hooks/useCountdownTimer.ts` 复用倒计时逻辑。
- 新增 `lib/auth-modal-utils.ts`：
  - Auth 错误翻译。
  - 密码强度校验。
  - Auth JSON POST 与验证码发送 helper。
- 同步更新 `__tests__/practice-commands.test.tsx`，适配上一刀把删除确认从原生 `confirm` 改成 Sonner Toast action 的行为。

### 本轮验证

```powershell
npm.cmd run typecheck
npm.cmd run lint
npx.cmd vitest run --config vitest.config.ts __tests__/auth-modal.test.tsx __tests__/auth-modal-accessibility.test.tsx
npx.cmd vitest run --config vitest.config.ts
```

当前结果：

- TypeScript：通过
- lint：通过
- AuthModal 对口测试：**2 文件 / 30 项通过**
- Vitest 全量：**49 文件 / 527 项通过**

## 2026-06-25 上一恢复点（安全卫生清理完成）

### 本轮安全清理

- 删除公开临时路由：
  - `app/api/debug/env/route.ts`
  - `app/api/debug/membership/route.ts`
  - `app/api/test/membership/route.ts`
- 清理敏感日志：
  - Auth/验证码路径不再打印验证码、session、注册响应、邮箱调试流程。
  - 会员接口不再打印 auth header、token 前缀、请求体、激活码和原始会员记录。
- 收束会员接口：
  - `app/api/membership/status/route.ts` 从调试型多路 fallback/全表扫描收束为正式查询链路。
  - `app/api/membership/activate/route.ts` 去掉 debug 响应字段与敏感错误细节。
- 调试日志导出降级：
  - `lib/practice-debug-log.ts` 不再调用 `/api/debug/membership`，只保留正式 membership status 结果。
- 交互与本地数据清理：
  - `app/practice/page.tsx` 不再使用 `localStorage.clear()`，改为只清本应用拥有的 key。
  - 删除记录与日历标注类型删除不再使用原生 `confirm/window.confirm`。

### 本轮验证

```powershell
npm.cmd run typecheck
npm.cmd run lint
npx.cmd vitest run __tests__/api-auth-routes.test.ts
npm.cmd run test:L5
npx.cmd playwright test __tests__/L4/practice.spec.ts --project=guest-chromium
```

当前结果：

- TypeScript：通过
- lint：通过
- API auth routes：**1 文件 / 27 项通过**
- L5 真实云端：**3 文件 / 8 项通过**
- L4 practice 子集：**4/4 通过**

说明：本轮也启动过全量 L4，51 条用例均打印完成，但 Playwright runner 收尾未退出；其中 practice 子集已单独复跑通过。L4 auth setup 在沙箱内仍会因远程网络受限降级为空白 state，这是既有测试兜底行为。

## 2026-06-25 上一恢复点（L4 登录态稳定化完成）

### 本轮修复

- TypeScript 类型边界收口：
  - `readLatestLocalData` 返回明确的同步数据形状，不再把 `unknown[]` 传入同步编排。
  - `usePracticeData` 接受同步层返回的 `breakthrough/start_time: null` 数据。
  - `migrateOldOptions` 同时兼容旧 option 胶囊与当前 `PracticeOption`。
- Vitest 稳定性：
  - `sync-isolation-and-rollback.test.ts` 禁止 hook 自动同步污染手动冲突测试。
- L4 smoke 降噪：
  - `/api/stats/today` 缺 Supabase service key 时静默返回 `{ count: 0 }`。
  - L4 fixture 等待 `document.head` 可用后再注入禁用动画样式，修复 `appendChild` pageerror。
  - localhost 不加载 Mixpanel，开发环境不挂载 Vercel Analytics / Speed Insights。
- L4 登录态稳定化：
  - `seedL4PracticeData(page)` 在应用启动前注入固定本地 records/options/profile。
  - seed 时设置 `window.__hasAutoSynced__ = true`，避免真实 auth session 下首屏自动同步覆盖本地测试数据。
  - Journal/Settings L4 用例改为走稳定 UI 锚点，不再因为测试账号无云端数据而 skip。

### 当前门禁

```powershell
npm.cmd run typecheck
npm.cmd run lint
npx.cmd vitest run
npm.cmd run build
npm.cmd run measure:initial-js
npm.cmd run test:L4
```

当前结果：

- TypeScript：通过
- lint：通过
- Vitest：**49 文件 / 527 项通过**
- build：通过
- `/practice` 首屏 JS：**16 scripts / 1117.0 KiB raw / 335.5 KiB gzip**
- L4 隔离浏览器：**51/51 通过，0 skipped**
- L5 真实云端：**3 文件 / 8 项通过**

说明：L4 登录态 UI 已改为本地 seed 固化，不依赖真实云端数据。L5 依赖本地 `.env.test` 和专用测试账号，已验证真实 Supabase auth、CRUD、上传同步与冲突测试可跑通。

## 当前规模总结

| 模块 | 行数 | 状态 |
|---|---:|---|
| `app/practice/page.tsx` | 1196 行 | 阶段 4 门槛完成；本轮新增 scoped localStorage 清理 helper |
| `components/AuthModal.tsx` | 226 行 | 弹窗壳与流程接线 |
| `components/AuthModalForms.tsx` | 421 行 | Login/Register/ForgotPassword 表单视图 |
| `app/api/membership/status/route.ts` | 139 行 | 已从调试型多路 fallback 收束为正式查询链路 |
| `app/api/membership/activate/route.ts` | 279 行 | 最后一刀完成：route 顶层编排 + 内部 helper 分层；响应与行为不变 |
| `hooks/useSync.ts` | 777 行 | 阶段 5 已完成；剩余体量主要是 React 外壳与副作用编排 |
| `lib/sync-orchestrator.ts` | 402 行 | sync 决策/冲突编排 |
| `lib/sync-utils.ts` | 551 行 | 同步/统计/色阶等纯函数集合 |
| `lib/sync-mappers.ts` | 108 行 | 远端字段映射与归一化 |
| `lib/supabase-repository.ts` | 152 行 | Supabase 仓库原语 |
| Vitest | 49 文件 / 539 项 | L1/L2/L3 高风险缺口基本清零；会员激活 API 与照片上传大小限制对口测试已补齐 |
| L4 隔离浏览器 | 51/51 | guest、mobile、登录态 UI 全量通过 |

## 维护期建议

1. 保持 `.env.test` 本地私有，不提交真实密钥。
2. 如改动 Supabase/auth/sync，回归 `npm.cmd run test:L5`。
3. 默认不再开新重构阶段；只有具体业务改动、bug、安全问题或维护痛点出现时，才顺手小拆。
4. 会员激活 API 最后一刀已完成；不再保留默认下一刀。

## 真源文档

- 总路线：[`DECOUPLING_ROADMAP.md`](./DECOUPLING_ROADMAP.md)
- 测试矩阵：[`DECOUPLING_TEST_MATRIX.md`](./DECOUPLING_TEST_MATRIX.md)
- 首屏性能：[`PERFORMANCE_BASELINE.md`](./PERFORMANCE_BASELINE.md)
- 开发说明：[`../guides/DEVELOPMENT.md`](../guides/DEVELOPMENT.md)
- L5 测试说明：[`../guides/L5_TESTING.md`](../guides/L5_TESTING.md)
- 当前执行清单：[`../../TODO.md`](../../TODO.md)
- 历史记录：[`../../ASHTANGA_PROJECT_LOG.md`](../../ASHTANGA_PROJECT_LOG.md)
