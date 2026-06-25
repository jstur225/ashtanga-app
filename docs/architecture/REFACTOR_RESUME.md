# 解耦重构恢复入口

> 下次启动本项目时先读这里。阶段 1–6 主体已完成；审核补漏与 L4 登录态稳定化已收口，当前常规门禁恢复绿色。
>
> 不要重新排查页面编排、刷新恢复、媒体生命周期或同步分层。README/开发说明与 L5 模板/说明已归档；本地 `.env.test` 已填写并跑通 L5。

## 2026-06-25 最新恢复点（L4 登录态稳定化完成）

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
| `app/practice/page.tsx` | 1185 行 | 阶段 4 门槛完成 |
| `hooks/useSync.ts` | 777 行 | 阶段 5 已完成；剩余体量主要是 React 外壳与副作用编排 |
| `lib/sync-orchestrator.ts` | 402 行 | sync 决策/冲突编排 |
| `lib/sync-utils.ts` | 551 行 | 同步/统计/色阶等纯函数集合 |
| `lib/sync-mappers.ts` | 108 行 | 远端字段映射与归一化 |
| `lib/supabase-repository.ts` | 152 行 | Supabase 仓库原语 |
| Vitest | 49 文件 / 527 项 | L1/L2/L3 高风险缺口基本清零 |
| L4 隔离浏览器 | 51/51 | guest、mobile、登录态 UI 全量通过 |

## 下一轮建议

1. 保持 `.env.test` 本地私有，不提交真实密钥。
2. 如改动 Supabase/auth/sync，回归 `npm.cmd run test:L5`。
3. 可选：继续审计 `practice/page.tsx` 的认证/会员/媒体编排，但不建议继续为了行数硬拆。

## 真源文档

- 总路线：[`DECOUPLING_ROADMAP.md`](./DECOUPLING_ROADMAP.md)
- 测试矩阵：[`DECOUPLING_TEST_MATRIX.md`](./DECOUPLING_TEST_MATRIX.md)
- 首屏性能：[`PERFORMANCE_BASELINE.md`](./PERFORMANCE_BASELINE.md)
- 开发说明：[`../guides/DEVELOPMENT.md`](../guides/DEVELOPMENT.md)
- L5 测试说明：[`../guides/L5_TESTING.md`](../guides/L5_TESTING.md)
- 当前执行清单：[`../../TODO.md`](../../TODO.md)
- 历史记录：[`../../ASHTANGA_PROJECT_LOG.md`](../../ASHTANGA_PROJECT_LOG.md)
