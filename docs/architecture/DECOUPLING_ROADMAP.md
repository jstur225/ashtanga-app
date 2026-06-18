# Ashtanga App 解耦路线图

> 状态真源。每完成一个阶段，更新本文件、测试矩阵和 `ASHTANGA_PROJECT_LOG.md`。

## 目标

解耦的目的不是制造更多小文件，而是让页面只负责组合，让计时、音频、同步等核心能力可以独立理解、测试和替换，同时用可重复指标确认首屏性能改善。

## 基线（2026-06-18，`master2@916db96`）

| 指标 | 基线 | 最终目标 |
|---|---:|---:|
| `app/practice/page.tsx` | 3240 行 | 800–1200 行 |
| 页面 `useState` | 53 个 | 页面仅保留导航/编排状态 |
| `hooks/useSync.ts` | 1173 行 | 250–350 行 React 外壳 |
| Vitest | 13 文件 / 131 项通过 | 高风险矩阵全部覆盖 |
| TypeScript / lint / build | 通过 | 持续通过 |
| `/practice` 首屏 JS | 待建立自动测量脚本 | 相比基线下降至少 20% |

## 约束

- 不改变数据库 schema、LocalStorage 键和用户可见行为。
- UI 解耦、媒体解耦、同步解耦分阶段提交，不混做。
- 每阶段先补保护测试，再移动逻辑。
- 每阶段必须有 checkpoint、全量检查、隔离浏览器回归、提交和项目日志。
- 真实同步只使用专用测试账号，不使用生产账号。

## 阶段

| 阶段 | 内容 | 状态 | 完成门槛 |
|---|---|---|---|
| 0 | 基线、路线图、测试矩阵 | 进行中 | 文档可追踪全部阶段与缺口 |
| 1 | 工具函数、选择器、选项弹窗、结束确认、呼吸动画 | 待开始 | 页面约 2500 行，拆出组件有行为测试 |
| 2 | `usePracticeSession` + 计时视图 | 待开始 | 计时状态转换独立测试，页面不计算时长 |
| 3 | `useGuidedAudio` + `useChantPlayback` | 待开始 | 页面不持有 `HTMLAudioElement` |
| 4 | Dashboard、导航、ModalHost、Tab 动态加载 | 待开始 | 页面 800–1200 行，首屏 JS 下降至少 20% |
| 5 | 同步仓库、映射、编排、冲突、日志分层 | 待开始 | `useSync` 250–350 行，同步矩阵通过 |
| 6 | 大型组件职责审计与最终归档 | 待开始 | 只保留职责单一的大文件，文档与代码一致 |

## 目标架构

```text
app/practice/page.tsx
  └─ PracticeAppShell
      ├─ PracticeDashboard
      │   ├─ PracticeOptionGrid
      │   └─ PracticeNavigation
      ├─ PracticeSessionView
      │   ├─ usePracticeSession
      │   ├─ useGuidedAudio
      │   └─ useChantPlayback
      ├─ dynamic JournalTab / StatsTab / PosesTab
      └─ PracticeModalHost

useSync (React facade)
  └─ sync orchestrator
      ├─ local storage adapter
      ├─ Supabase repository
      ├─ record/profile/option mappers
      ├─ conflict policy
      └─ bounded logger
```

## 阶段交付规则

1. 在测试矩阵中标出本阶段场景。
2. 为现有行为补保护测试。
3. 完成单一阶段的解耦。
4. 运行 Vitest、typecheck、lint、build。
5. 使用假 Supabase 环境跑游客浏览器回归。
6. 更新本文件、测试矩阵、TODO 和项目日志。
7. 独立提交并推送 `master2`。

## 完成定义

- 页面与同步模块达到目标职责和规模。
- 计时、媒体、同步可脱离完整页面测试。
- 高风险测试矩阵没有“缺失”项。
- Tab 与低频弹窗真正按需加载。
- 首屏 JS 有可重复基线并下降至少 20%。
- 数据格式和持久化键保持兼容。
- 新开发者可在两分钟内找到模块、测试和变更记录。

