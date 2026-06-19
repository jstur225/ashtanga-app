# 解耦重构恢复入口

> 下次启动本项目时先读这里。阶段 1–3 已完成，阶段 4 正在进行，不需要重新调查刷新恢复或媒体生命周期问题。

## 2026-06-19 最新恢复点

阶段 4 已开始，导航、动态 Tab 与 Dashboard 三刀已经完成并通过门禁：

- `JournalTab`、`StatsTab`、`PosesTab` 已改为真正的 `next/dynamic` 按需加载，并有统一 loading 状态。
- 底部导航已提取为 `components/practice/PracticeNavigation.tsx`。
- 练习首页已提取为 `components/practice/PracticeDashboard.tsx`；页面只保留选项选择与开始练习的业务决策。
- 页面顶层覆盖层统一决定导航显隐；真实浏览器已验证“打开自定义练习弹窗后导航退出，关闭后恢复”。
- 当前 `app/practice/page.tsx` 为 2342 行、43 个 `useState`。
- 当前门禁：24 个测试文件 / 187 项测试，typecheck、lint、生产 build 全部通过。
- 生产浏览器已验证：选择 Mysore → 开始按钮启用 → 进入计时 → 结束并放弃，控制台 0 错误。

下次不要重新排查阶段 1–3，也不要重做 Tab、导航或 Dashboard。直接从阶段 4 的 `PracticeSessionView` 开始，随后提取 `PracticeModalHost`；首屏 JS 可重复基线尚未建立，仍是本阶段硬门槛。

## 一句话状态

解耦阶段 1、2、3 已完成。会话与媒体生命周期已经移出页面，下一轮直接进入阶段 4 的页面编排与真正按需加载。

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

当前结果：23 个测试文件 / 185 项测试、TypeScript、lint、Next.js 生产构建全部通过。

## 阶段 3 当前结果

- `useGuidedAudio` 和 `useChantPlayback` 已新增。
- 页面不再持有 `HTMLAudioElement`、Blob URL 或唱诵 interval。
- 页面约 2500 行、43 个 `useState`。
- 22 个测试文件 / 179 项测试、TypeScript、lint、生产构建通过。
- 普通练习、唱诵和口令失败降级生产回归通过。

## 阶段 4 当前执行顺序

1. ✅ `PracticeNavigation` 已提取，顶层覆盖层导航显隐已统一。
2. ✅ Journal、Stats、Poses Tab 已改为真正按需加载。
3. ✅ `PracticeDashboard` 已提取；下一刀直接提取 `PracticeSessionView`。
4. ⏳ 最后提取 `PracticeModalHost`，建立首屏 JS 可重复基线并验收相对下降至少 20%。

不要提前混入 `useSync` 拆分。同步属于阶段 5，是独立的高风险工作。

## 当前规模

- `app/practice/page.tsx`：2342 行，仍是后续拆分主体
- `hooks/useSync.ts`：1348 行，阶段 5 再处理
- 核心阶段 1–6：阶段 1–3 完成、阶段 4 进行中，约 55%

## 真源文档

- 总路线：[`DECOUPLING_ROADMAP.md`](./DECOUPLING_ROADMAP.md)
- 测试缺口：[`DECOUPLING_TEST_MATRIX.md`](./DECOUPLING_TEST_MATRIX.md)
- 当前执行清单：[`../../TODO.md`](../../TODO.md)
- 历史记录：[`../../ASHTANGA_PROJECT_LOG.md`](../../ASHTANGA_PROJECT_LOG.md)
