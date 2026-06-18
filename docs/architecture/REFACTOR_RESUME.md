# 解耦重构恢复入口

> 下次启动本项目时先读这里。阶段 2 已完成，不需要重新调查刷新恢复问题。

## 一句话状态

解耦阶段 1、2 已完成，阶段 3 正在进行。两个媒体 Hook 已提取并通过自动化，下一轮直接复验口令模式的完整浏览器链路，不需要重新审计媒体代码。

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

结果：20 个测试文件 / 170 项测试、TypeScript、lint、Next.js 生产构建全部通过。

## 阶段 3 当前结果

- `useGuidedAudio` 和 `useChantPlayback` 已新增。
- 页面不再持有 `HTMLAudioElement`、Blob URL 或唱诵 interval。
- 页面约 2500 行、43 个 `useState`。
- 22 个测试文件 / 176 项测试、TypeScript、lint、生产构建通过。
- 普通练习和唱诵生产回归通过。

## 下一步：完成阶段 3

严格按以下顺序执行：

1. 在生产浏览器选择“老掌门人版口令”，确认选中状态。
2. 点击绿色开始圆钮，确认进入计时页并显示加载、播放或明确失败 UI。
3. 验证暂停/继续、快进/后退和结束清理。
4. 如果开始圆钮只在口令模式无响应，调查固定卡片选择状态与点击时序；不要回滚已通过的 Hook 拆分。
5. L4 通过后更新路线图和测试矩阵，把阶段 3 标记完成。

不要在阶段 3 混入 `useSync` 拆分。同步属于阶段 5，是独立的高风险工作。

## 当前规模

- `app/practice/page.tsx`：约 2500 行，仍是后续拆分主体
- `hooks/useSync.ts`：1348 行，阶段 5 再处理
- 核心阶段 1–6：已完成 2/6，阶段 3 接近完成

## 真源文档

- 总路线：[`DECOUPLING_ROADMAP.md`](./DECOUPLING_ROADMAP.md)
- 测试缺口：[`DECOUPLING_TEST_MATRIX.md`](./DECOUPLING_TEST_MATRIX.md)
- 当前执行清单：[`../../TODO.md`](../../TODO.md)
- 历史记录：[`../../ASHTANGA_PROJECT_LOG.md`](../../ASHTANGA_PROJECT_LOG.md)
