# 解耦重构恢复入口

> 下次启动本项目时先读这里。阶段 2 已完成，不需要重新调查刷新恢复问题。

## 一句话状态

解耦阶段 1、2 已完成。计时状态、暂停累计、刷新恢复、练习类型快照和 SSR 安全持久化已经从页面中抽离并通过生产版浏览器验收。下一轮直接进入阶段 3：提取媒体 Hook。

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

## 下一步：阶段 3

严格按以下顺序执行：

1. 审计 `app/practice/page.tsx` 中唱诵倒计时、口令音频、缓存和播放状态。
2. 先补唱诵结束只启动一次、音频失败不阻塞普通计时、模式切换不串状态等保护测试。
3. 提取 `useGuidedAudio`，负责口令音频加载、播放、暂停、跳转和资源释放。
4. 提取 `useChantPlayback`，负责倒计时、唱诵播放、跳过和转入练习。
5. 页面最终不再持有 `HTMLAudioElement`。
6. 全量门禁和生产版浏览器通过后，再把阶段 3 标记完成。

不要在阶段 3 混入 `useSync` 拆分。同步属于阶段 5，是独立的高风险工作。

## 当前规模

- `app/practice/page.tsx`：约 2700 行，仍是后续拆分主体
- `hooks/useSync.ts`：1348 行，阶段 5 再处理
- 核心阶段 1–6：已完成 2/6，约 33%

## 真源文档

- 总路线：[`DECOUPLING_ROADMAP.md`](./DECOUPLING_ROADMAP.md)
- 测试缺口：[`DECOUPLING_TEST_MATRIX.md`](./DECOUPLING_TEST_MATRIX.md)
- 当前执行清单：[`../../TODO.md`](../../TODO.md)
- 历史记录：[`../../ASHTANGA_PROJECT_LOG.md`](../../ASHTANGA_PROJECT_LOG.md)
