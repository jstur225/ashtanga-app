# 解耦重构恢复入口

> 下次启动本项目时先读这里。阶段 1–4 已完成、阶段 5 第五刀已完成，L1/L2 测试大面积补齐。下一轮可以选阶段 5 最终精简（useSync → 250–350 行）或阶段 6 其他测试缺口。不要重新调查页面编排、刷新恢复或媒体生命周期问题。

## 2026-06-23 最新恢复点（测试覆盖第二波）

今天完成两波测试覆盖：

### 第①波：阶段 4 L2 组件测试（17 项）
- `__tests__/stats-tab.test.tsx`（7 项）：空态、统计数据、免费/Pro 会员、设置、升级
- `__tests__/journal-tab.test.tsx`（10 项）：日记 CRUD 渲染/编辑/分享/补录、未登录态、突破笔记、多照片、月份边界
- 测试矩阵「日记 CRUD」L2、「统计空态/会员入口」、「统计空态/历史数据」→ 均升级为已覆盖

### 第②波：阶段 5 L1 纯函数测试（28 项，在 sync-utils.test.ts 内）
- `sortAndLimitRecords`（6 项）：排序、maxSync 限制、1000 条边界、不可变性
- `applySafeMerge`（7 项）：各字段安全合并逻辑 + mergeUpdatedAt
- `detectOptionChanges`（5 项）+ `detectProfileChanges`（8 项）：选项/profile 差异检测
- `trimSyncLogs`（4 项）：单条、50 条上限、100KB 截断、空列表兜底
- 测试矩阵：3 项从「缺失/部分覆盖」升级为「已覆盖」

### 全部门禁
```powershell
npm.cmd run typecheck
npm.cmd run lint
npx.cmd vitest run
```
当前结果：**39 个测试文件 / 381 项测试**、TypeScript、lint 全部通过。

## 明天可选方向

### A. 补阶段 6 测试缺口（L1/L2 优先级高）
- 旧版本导入兼容（L1/L3 缺失）
- 登录/注册/忘记密码（L2/L3 缺失）
- 无障碍名称/键盘/焦点（L2/L4 缺失）

### B. 阶段 5 最终精简
- exerciseConflict 中 local/remote/merge 三分支执行逻辑提取
- smartMerge 归位
- uploadLocalRecords/uploadLocalData 剩余逻辑提取
- 目标：useSync 250–350 行

### C. 阶段 4 L4 浏览器回归（需搭 Playwright）
- Tab 滚动与内部状态保持
- URL 参数/返回/刷新/深链接
- 移动端遮挡与溢出

## 当前规模总结

| 模块 | 行数 | 状态 |
|---|---|---|
| `app/practice/page.tsx` | 1157 行 ✅ | 阶段 4 门槛完成 |
| `hooks/useSync.ts` | 897 行 | 阶段 5 第五刀完成，目标 250-350 行 |
| `lib/sync-orchestrator.ts` | 252 行 | sync 决策编排纯函数 |
| `lib/sync-utils.ts` | 496 行 | 19 个纯函数，全部有 L1 测试覆盖 |
| `lib/sync-mappers.ts` | 96 行 | 5 个纯函数，45 个测试 |
| `lib/supabase-repository.ts` | 147 行 | 7 个仓库原语 |

## 一句话状态

阶段 1–4 已完成、阶段 5 前五刀已完成，L1/L2 测试大面积补齐。整体完成约 **88%**。明天可选：补阶段 6 测试缺口 / 阶段 5 最终精简 / 搭 Playwright 做 L4 回归。

## 真源文档

- 总路线：[`DECOUPLING_ROADMAP.md`](./DECOUPLING_ROADMAP.md)
- 测试缺口：[`DECOUPLING_TEST_MATRIX.md`](./DECOUPLING_TEST_MATRIX.md)
- 首屏性能：[`PERFORMANCE_BASELINE.md`](./PERFORMANCE_BASELINE.md)
- 当前执行清单：[`../../TODO.md`](../../TODO.md)
- 历史记录：[`../../ASHTANGA_PROJECT_LOG.md`](../../ASHTANGA_PROJECT_LOG.md)
