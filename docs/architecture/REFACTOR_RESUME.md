# 解耦重构恢复入口

> 下次启动本项目时先读这里。阶段 1–4 已完成、阶段 5 前四刀已完成，useSync 首次低于 1000 行。下一轮进入阶段 5 第五刀（sync orchestrator 提取 + 冲突决策提取）；不要重新调查页面编排、刷新恢复或媒体生命周期问题。

## 2026-06-23 最新恢复点

阶段 5 第四刀（差异检测/日志创建/批量上传/options payload 提取）已完成并通过全部门禁：

- `lib/sync-utils.ts` 新增 `detectOptionChanges` / `detectProfileChanges` / `createSyncLogEntry` / `trimSyncLogs` / `appendSyncErrorHistory` / `batchUploadRecords` / `buildOptionsUploadPayload` 等 7 个纯函数 + 类型。去重 ~60 行 autoSync 选项/profile 差异检测 + ~40 行批量上传循环 + ~20 行日志格式 + ~20 行 options payload 映射。
- `hooks/useSync.ts` autoSync 中的选项/profile 差异检测、uploadLocalRecords 中的批量上传循环、addLog 中的格式化和 localStorage 写入、uploadLocalData 中的 options payload 映射全部替换为共享函数。
- 行为零变化：差异检测策略、错误日志级别、上下文记录内容、触发原因传播完全一致。
- **里程碑：`useSync.ts` 首次低于 1000 行（997 行）**；全量 30 个测试文件 / 268 项测试、typecheck、lint 全部通过。

阶段 5 第二刀（Supabase 仓库层 I/O 原语）已完成并通过全部门禁：

- 新增 `lib/supabase-repository.ts`：`fetchAllUserData` / `fetchCloudRecordsForMerge` / `repoUpsertRecords` / `repoUpsertOptions` / `repoDeleteAllUserRecords` / `repoDeleteAllUserOptions` + `withQueryTimeout` + `CloudRecordForMerge` 类型。
- `hooks/useSync.ts` 删除 `supabase` / `TABLES` 直接导入和内联 `queryWithTimeout`，7 处 Supabase 调用替换为仓库原语。
- 行为零变化：重试、安全合并、批量分片、addLog 等业务逻辑保留在 useSync。

阶段 4 已完成并通过全部门禁（保留如下供回溯）：

- `JournalTab`、`StatsTab`、`PosesTab` 已改为真正的 `next/dynamic` 按需加载，并有统一 loading 状态。
- 底部导航已提取为 `components/practice/PracticeNavigation.tsx`。
- 练习首页已提取为 `components/practice/PracticeDashboard.tsx`；页面只保留选项选择与开始练习的业务决策。
- 全屏练习已提取为 `components/practice/PracticeSessionView.tsx`（`4fea12a`）；完成保存与同步仍留在页面编排层。
- `PracticeModalHost` 已承接三步清空数据、唱诵设置，以及 Custom/Edit、Settings、会员、账户、导入导出、Auth、FakeDoor、邀请与冲突等独立弹窗的懒加载和渲染接线；认证、会员、同步等业务决策仍留在页面。
- 页面顶层覆盖层统一决定导航显隐；真实浏览器已验证“打开自定义练习弹窗后导航退出，关闭后恢复”。
- 当前 `app/practice/page.tsx` 为 1157 行、43 个 `useState`，已进入 800–1200 行目标区间。
- 记录/选项命令已移入 `hooks/usePracticeCommands.ts`；`autoSync` 仅作为外部能力注入，没有改动同步算法。
- 调试日志采集已移入 `lib/practice-debug-log.ts`；页面只保留快照传参、JSON 格式化、弹窗与错误提示。
- 首屏 JS 已有可重复脚本：当前 427.9 KiB → 334.6 KiB gzip，下降 21.8%；Mixpanel 保留为异步 chunk，在浏览器空闲期加载。
- 当前门禁：30 个测试文件 / 268 项测试，typecheck、lint、生产 build 全部通过。
- 生产浏览器已验证普通练习的开始、暂停、继续、结束和放弃；口令媒体失败后降级控制与清理通过，仅出现用于触发降级的浏览器媒体错误，无新增业务异常。

真实生产浏览器已补齐：选项选择、自定义弹窗、数据管理、运行日志完整 JSON、父子弹窗关闭与导航恢复通过，控制台 0 应用错误。

下次不要重新排查阶段 1–4 或阶段 5 第一、二刀。直接进入阶段 5 第三刀：把 `uploadLocalRecords` 和 `uploadLocalData` 中重复的 safe-merge 逻辑提取为共享函数，精简批量上传循环，目标 `useSync.ts` 进入 < 1000 行。

## 一句话状态

阶段 1–4 已完成、阶段 5 前四刀已完成，useSync 首次低于 1000 行。下一轮提取 sync orchestrator + 冲突决策提取，目标 500–700 行。

## 阶段 2 最终结果

- `usePracticeSession` 管理练习会话和计时状态。
- `lib/practice-session.ts` 保存纯状态转换与时间计算。
- LocalStorage 仍兼容原有五个计时键，新增 `ashtanga_active_practice` 保存练习类型快照。
- 不再使用 `react-use/useLocalStorage` 管理练习会话；该 Hook 的服务端/客户端调用结构不一致，会导致 hydration mismatch。
- 生产版浏览器已验证：运行中刷新、暂停后刷新、类型恢复、退出清理，控制台无新增 hydration 错误。

## 最近门禁

```powershell
npm.cmd run typecheck
npm.cmd run lint
npx.cmd vitest run
npm.cmd run build
```

当前结果：30 个测试文件 / 268 项测试、TypeScript、lint、Next.js 生产构建全部通过。

## 阶段 3 当前结果

- `useGuidedAudio` 和 `useChantPlayback` 已新增。
- 页面不再持有 `HTMLAudioElement`、Blob URL 或唱诵 interval。
- 页面约 2500 行、43 个 `useState`。
- 22 个测试文件 / 179 项测试、TypeScript、lint、生产构建通过。
- 普通练习、唱诵和口令失败降级生产回归通过。

## 阶段 4 当前执行顺序

1. ✅ `PracticeNavigation` 已提取，顶层覆盖层导航显隐已统一。
2. ✅ Journal、Stats、Poses Tab 已改为真正按需加载。
3. ✅ `PracticeDashboard` 与 `PracticeSessionView` 已提取。
4. ✅ `PracticeModalHost` 与首屏 JS 基线已完成；当前 427.9 KiB → 334.6 KiB gzip，下降 21.8%。
5. ✅ 调试日志采集和记录/选项命令已移出页面；页面最终 1157 行。

## 下一次优化目标

阶段 5 第五刀：sync orchestrator 提取 + 冲突决策提取：

1. 把 `autoSync` 中的同步编排逻辑（四种路径选择、数据加载、回退）提取为独立 orchestrator 模块。
2. 把 `resolveConflict` 中的冲突策略执行提取为纯函数，hook 只保留状态更新。
3. 最终 `useSync` 只保留：编排状态、React 状态桥接、日志、冲突选择回调。
4. 仍不改变 local/remote/merge 冲突策略和本地存储键。
5. 验证：`useSync.ts` 进入 500–700 行。

阶段 5 前四刀已完成。阶段 5 的硬门槛是：`useSync.ts` 降到 250–350 行，同步矩阵通过，真实测试账户云端冒烟通过。

## 当前规模

- `app/practice/page.tsx`：1157 行，阶段 4 完成
- `hooks/useSync.ts`：**997 行**，阶段 5 第四刀完成（首次 < 1000 行 🎯）
- `lib/sync-utils.ts`：496 行，含差异检测/日志创建/批量上传/options payload 等 19 个纯函数
- `lib/sync-mappers.ts`：96 行，5 个纯函数
- `lib/supabase-repository.ts`：147 行，7 个仓库原语
- 核心阶段 1–6：阶段 1–4 完成、阶段 5 第四刀完成，约 80%

## 真源文档

- 总路线：[`DECOUPLING_ROADMAP.md`](./DECOUPLING_ROADMAP.md)
- 测试缺口：[`DECOUPLING_TEST_MATRIX.md`](./DECOUPLING_TEST_MATRIX.md)
- 首屏性能：[`PERFORMANCE_BASELINE.md`](./PERFORMANCE_BASELINE.md)
- 当前执行清单：[`../../TODO.md`](../../TODO.md)
- 历史记录：[`../../ASHTANGA_PROJECT_LOG.md`](../../ASHTANGA_PROJECT_LOG.md)
