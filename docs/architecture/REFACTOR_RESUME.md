# 解耦重构恢复入口

> 下次启动本项目时先读这里。阶段 1–6 主体已完成；本轮审核补齐了 TypeScript/Vitest/L4 smoke 红灯，当前常规门禁恢复绿色。
>
> 不要重新排查页面编排、刷新恢复、媒体生命周期或同步分层。下一轮优先做最终归档、README 对齐，以及 L4 登录态/真实云端环境的可重复化。

## 2026-06-25 最新恢复点（审核补漏完成）

### 本轮修复

- TypeScript 类型边界收口：
  - `readLatestLocalData` 返回明确的同步数据形状，不再把 `unknown[]` 传入同步编排。
  - `usePracticeData` 接受同步层的 `breakthrough/start_time: null` 数据。
  - `migrateOldOptions` 同时兼容旧 option 胶囊与当前 `PracticeOption`。
- Vitest 稳定性：
  - `sync-isolation-and-rollback.test.ts` 禁止 hook 自动同步污染手动冲突测试。
- L4 smoke 降噪：
  - `/api/stats/today` 缺 Supabase service key 时静默返回 `{ count: 0 }`。
  - L4 fixture 等待 `document.head` 可用后再注入禁用动画样式，修复 `appendChild` pageerror。
  - localhost 不加载 Mixpanel，开发环境不挂载 Vercel Analytics / Speed Insights。

### 当前门禁

```powershell
npm.cmd run typecheck
npm.cmd run lint
npx.cmd vitest run
npm.cmd run build
npm.cmd run measure:initial-js
npx.cmd playwright test __tests__/L4/smoke.spec.ts --project=guest-chromium
```

当前结果：

- TypeScript：通过
- lint：通过
- Vitest：**49 文件 / 527 项通过**
- build：通过
- `/practice` 首屏 JS：**16 scripts / 1117.0 KiB raw / 335.5 KiB gzip**
- L4 smoke：**4/4 通过**

说明：完整 `npm.cmd run test:L4` 仍依赖 `.env.test`/网络登录态。当前环境下 `auth.setup` 访问测试云端会被网络权限拦截，登录态用例可能 skip；这不是本轮代码门禁失败，但最终归档时要把 L4 登录态环境说明写清楚。

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
| L4 隔离浏览器 | smoke 4/4；全量需登录态环境 | 游客核心链路稳定；登录态依赖测试云端 |

## 下一轮建议

1. 更新 README/开发说明，把解耦后入口、测试命令、L4/L5 环境变量写清楚。
2. 处理临时测试产物：`debug.log` 是否删除或加入忽略规则。
3. 如需最终全绿，配置可访问的 `.env.test` 后跑完整 `npm.cmd run test:L4` 和 `npm.cmd run test:L5`。
4. 可选：再审计 `practice/page.tsx` 的认证/会员/媒体编排，但不建议继续为行数硬拆。

## 真源文档

- 总路线：[`DECOUPLING_ROADMAP.md`](./DECOUPLING_ROADMAP.md)
- 测试矩阵：[`DECOUPLING_TEST_MATRIX.md`](./DECOUPLING_TEST_MATRIX.md)
- 首屏性能：[`PERFORMANCE_BASELINE.md`](./PERFORMANCE_BASELINE.md)
- 当前执行清单：[`../../TODO.md`](../../TODO.md)
- 历史记录：[`../../ASHTANGA_PROJECT_LOG.md`](../../ASHTANGA_PROJECT_LOG.md)
