# Ashtanga App 解耦路线图

> 状态真源。解耦阶段已收尾；后续只在具体业务改动、bug、安全问题或明确维护痛点出现时做小刀优化。

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
| `/practice` 首屏 JS | 335.5 KiB gzip（2026-06-25 审核补漏后复测） | 427.9 KiB → 335.5 KiB，下降 21.6% |

## 当前快照（2026-06-26，重构收尾，进入维护模式）

| 指标 | 当前值 | 判断 |
|---|---:|---|
| `app/practice/page.tsx` | 1196 行 | 阶段 4 门槛完成；本轮新增 scoped localStorage 清理 helper |
| 页面 `useState` | 43 个 | 认证、会员、媒体、弹窗和页面编排仍高度集中 |
| `components/AuthModal.tsx` | 226 行 | 弹窗壳与流程接线 |
| `components/AuthModalForms.tsx` | 421 行 | Login/Register/ForgotPassword 表单视图 |
| `app/api/membership/status/route.ts` | 139 行 | 已去调试型全表扫描和敏感日志 |
| `app/api/membership/activate/route.ts` | 279 行 | 最后一刀完成：route 顶层编排 + 内部 helper 分层；响应与行为不变 |
| `hooks/useSync.ts` | **777 行** | 阶段 5 最终精简完成。审核补漏后类型边界更明确 |
| `lib/sync-orchestrator.ts` | 402 行 | sync 决策与冲突编排 |
| `lib/sync-utils.ts` | 551 行 | 含差异检测、日志条目创建、批量上传、options payload、色阶等纯函数 |
| `lib/sync-mappers.ts` | 108 行 | 远端字段映射与归一化 |
| `lib/supabase-repository.ts` | 152 行 | Supabase 仓库原语 |
| Vitest | **49 文件 / 539 项通过** | L1/L2/L3 高风险覆盖扩大；会员激活 API 与照片上传大小限制对口测试已补齐 |
| L4 隔离浏览器 | **51/51 通过，0 skipped** | guest、mobile、登录态 UI 全量稳定；L4 登录态通过本地 seed 固化 |
| TypeScript / lint | 通过 |  |
| 生产构建 | 通过 | Next.js 16 生产构建成功 |

按核心阶段 1–6 估算，**解耦重构主体已完成，当前进入维护模式**。矩阵「缺失」项清零；审核补齐了 typecheck、Vitest、L4 smoke、L4 登录态 skip 与 L5 真实云端验证。安全卫生清理已删除公开 debug/test 路由，清理验证码/session/token/会员数据日志，并把全局 `localStorage.clear()` 与原生确认框替换掉。AuthModal 已完成流程与表单视图拆分，注册、忘记密码、倒计时逻辑和大块 JSX 均已离开弹窗壳。会员激活 API 最后一刀已完成，鉴权、激活码校验、会员写入和激活码消费已拆成内部 helper。README/开发说明与 L5 模板已归档。

从现在开始，不再为了“某文件还有几百行”继续拆分。后续拆分只按真实痛点驱动：高改动频率、多职责重新聚集、安全/线上 bug/回归风险、或拆完能明显改善测试。`membership/activate` helper 化已完成；不再保留默认下一刀。

## 约束

- 不改变数据库 schema、LocalStorage 键和用户可见行为。
- UI 解耦、媒体解耦、同步解耦分阶段提交，不混做。
- 每阶段先补保护测试，再移动逻辑。
- 每阶段必须有 checkpoint、全量检查、隔离浏览器回归、提交和项目日志。
- 真实同步只使用专用测试账号，不使用生产账号。

## 阶段

| 阶段 | 内容 | 状态 | 完成门槛 |
|---|---|---|---|
| 0 | 基线、路线图、测试矩阵 | 已完成 `ecb9a13` | 文档可追踪全部阶段与缺口 |
| 1 | 工具函数、选择器、选项弹窗、结束确认、呼吸动画 | 已完成 `0300ad4` | 页面 2738 行，拆出组件有行为测试 |
| 2 | `usePracticeSession` + 计时视图 | 已完成（阶段检查点） | 计时状态转换独立测试，页面不计算时长 |
| 3 | `useGuidedAudio` + `useChantPlayback` | 已完成（阶段检查点） | 页面不持有 `HTMLAudioElement` |
| 4 | Dashboard、导航、ModalHost、Tab 动态加载 | 已完成（2026-06-22） | 页面 1157 行，首屏 JS 下降 21.8% |
| 5 | 同步仓库、映射、编排、冲突、日志分层 | **已完成**（useSync 771 行） | `useSync` 250–350 行不可达，实际 771 行已达合理下限 |
| 6 | 跨模块测试缺口与最终归档 | **已完成（2026-06-25）** | 教程记录隔离（L1 9 项）、API 幂等/AUTH 路由（L3，reset-password / send-verification-code 已从 EXPOSES GAP 改为 VERIFIES FIX）、Tab 滚动与深链接/visibility/URL 状态（L4） |

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

## 维护期变更规则

1. 不再默认开启“阶段 N”式重构。
2. 业务增长/获客/转化、线上 bug、安全问题优先于纯结构优化。
3. 新功能如果会让某个文件重新变成多职责热点，可以顺手小拆；否则直接做业务。
4. 改动 Supabase/auth/sync 时，至少跑 typecheck、相关 Vitest，并视情况回归 L5。
5. 文档只记录实质性架构变化，不再为纯行数型拆分建阶段。

## 最近验收（2026-06-18）

- 阶段 1 提取 `practice-utils`、选择器、选项弹窗、结束确认和呼吸动画。
- `practice/page.tsx` 从本轮开始时约 3420 行降至 2738 行；早期总基线为 6476 行。
- Vitest 从 13 文件 / 131 项提升到 18 文件 / 150 项，全部通过。
- TypeScript、lint、生产构建通过。
- 隔离浏览器通过落地页导航、练习选择、开始、暂停、继续、结束、放弃、自定义选项和会员限制流程。
- QA 发现并修复嵌套会员弹窗层级问题：`443f75a`；永久回归测试：`917812f`。
- 浏览器修复后二次刷新被本地 URL 安全策略拦截，组件回归测试已验证修复，下一轮 L4 回归继续复验。

### 阶段 2 进展

- `30a5700` 提取 `usePracticeSession` 与纯状态转换模型，页面不再计算暂停累计和后台时间。
- `ba7824a` 增加完成保存幂等、失败重试和草稿删除补偿。
- `dfbcadf` 覆盖跨天计时与 0 分钟立即结束；当前 20 文件 / 167 项测试通过。
- 隔离浏览器确认计时可在刷新后恢复，但练习类型丢失，同时出现 hydration mismatch。
- 三轮选择持久化尝试未通过浏览器验证，均已撤回；阶段 2 保持进行中，先做独立根因审计，不进入媒体拆分。
- 最终根因是 `react-use/useLocalStorage` 在服务端和客户端调用的 Hook 数量不同，不适合当前 SSR 路径；恢复壳只能遮住内容，不能保证首次状态一致。
- `usePracticeSession` 改用项目内 SSR 安全的 LocalStorage 适配器：服务端和客户端首屏都使用默认值，挂载后读取原有键，再统一开放持久会话。
- 保留原有五个计时键，并新增 `ashtanga_active_practice` 快照，用于恢复选项 ID、名称和备注。
- 生产版隔离浏览器通过：正常计时刷新、暂停后刷新、练习类型恢复、不保存退出清理；各次刷新均无新增 hydration 错误。
- 全量结果：20 文件 / 170 项测试、TypeScript、轻量 lint、Next.js 生产构建全部通过。阶段 2 完成。

## 下次启动入口

不要重新做全项目排查。先阅读 [`REFACTOR_RESUME.md`](./REFACTOR_RESUME.md)，下一轮直接进入阶段 3 的媒体 Hook 拆分。

### 阶段 3 进展

- 新增 `useGuidedAudio`，封装缓存命中、流式播放、后台缓存、失败恢复、进度、跳转和资源释放。
- 新增 `useChantPlayback`，封装倒计时、跳过、播放、失败降级、单次完成保护和资源释放。
- `practice/page.tsx` 不再持有 `HTMLAudioElement`、Blob URL 或唱诵 interval；页面从 2701 行降至 2500 行，`useState` 从 57 个降至 43 个。
- 最终修复口令启动的陈旧状态覆盖：口令练习直接以暂停状态创建，音频事件通过 ref 调用最新会话回调。
- 音频失败后保留普通计时的暂停/继续/结束控制，不再把用户困在重试界面。
- 22 个测试文件 / 179 项测试、TypeScript、轻量 lint、生产构建通过。
- 生产浏览器通过普通练习、唱诵，以及口令选择、启动、失败降级、暂停、继续、结束和清理。阶段 3 完成。

### 阶段 4 第一检查点（2026-06-19）

- 提取 `PracticeNavigation`，四个 Tab 的当前态与切换行为已有组件测试。
- `JournalTab`、`StatsTab`、`PosesTab` 使用 `next/dynamic` 按需加载，并共用可访问的 loading 状态。
- 统一页面覆盖层导航显隐策略，补齐自定义练习等顶层弹窗；生产浏览器验证打开隐藏、关闭恢复。
- `practice/page.tsx` 当前 2456 行、43 个 `useState`；全量为 23 个测试文件 / 185 项测试，typecheck、lint、build 通过。
- 尚未完成：`PracticeModalHost`，以及可重复的首屏 JS 基线和至少 20% 降幅验收。

### 阶段 4 第二检查点（2026-06-19）

- 提取 `PracticeDashboard`，把首页标题、选项网格和开始按钮移出页面；会员锁定、选项编辑和启动策略仍由页面编排。
- 开始按钮改为原生可访问按钮：未选择时禁用，选择后启用，视觉和交互路径保持一致。
- 页面从 2456 行降至 2342 行；24 个测试文件 / 187 项测试、typecheck、lint、生产 build 全部通过。
- 生产浏览器通过“选择 Mysore → 开始 → 计时 → 结束 → 放弃”链路，控制台 0 错误。
- 当时下一刀为 `PracticeSessionView`；现已在第三检查点完成。

### 阶段 4 第三检查点（2026-06-20）

- 提取 `PracticeSessionView`，承接唱诵倒计时、计时圆环、口令加载/错误/进度、暂停/继续、跳转和结束确认。
- `CompletionSheet`、完成保存、统计上报和同步仍由页面负责，避免视图组件吸收业务副作用。
- 页面从 2342 行降至 2151 行；25 个测试文件 / 191 项测试、typecheck、lint、生产 build 全部通过。
- 生产浏览器通过普通练习的开始、暂停、继续、结束、放弃；口令媒体失败后降级控制和清理也通过。
- 下一刀：`PracticeModalHost`；之后建立 `/practice` 首屏 JS 基线并验收至少 20% 降幅。

### 阶段 4 第四检查点（2026-06-20，ModalHost 第一部分）

- 新增 `PracticeModalHost`，先承接页面内联的三步清空数据与唱诵设置两个状态机；业务副作用仍由页面回调执行。
- 页面从 2151 行降至 1883 行；26 个测试文件 / 194 项测试、typecheck、lint、生产 build 全部通过。

### 阶段 4 第五检查点（2026-06-20，ModalHost 完成）

- `PracticeModalHost` 继续承接 Custom/Edit、Settings、会员、账户、导入导出、Auth、FakeDoor、邀请、冲突等独立弹窗的动态加载与渲染接线；页面保留业务状态和决策。
- 页面从 1883 行降至 1829 行；源码约束测试确保这些弹窗不再回流页面，并继续由宿主渲染。
- 26 个测试文件 / 209 项测试、typecheck、lint、生产 build 全部通过。
- 生产浏览器复验自定义练习→会员提示、设置→清空数据、设置→登录三组父子弹窗；关闭后父弹窗和导航均正确恢复，无新增应用错误。
- 下一刀：建立 `/practice` 首屏 JS 可重复基线，确认动态弹窗不进入初始包，再按包体证据选择剩余页面编排拆分。
- 为统计页设置按钮补充无障碍名称，生产回归可以稳定进入数据管理。
- 生产 QA 发现并修复嵌套层级问题：清空警告原本低于设置弹窗，取消会穿透并误开导入；现提升至独立高层级并有永久测试。
- 生产复验：唱诵设置打开/关闭与导航恢复通过；清空警告打开/取消后设置保留、导入未误开、控制台 0 错误。
- ModalHost 已在第五检查点完成；下一刀建立首屏 JS 可重复基线。

### 阶段 4 第六检查点（2026-06-21，首屏 JS 基线）

- 新增 `scripts/measure-initial-js.mjs` 和 `npm run measure:initial-js`，固定生产 HTML 直接引用脚本、原始字节与统一 gzip 字节口径。
- 基线为 17 个脚本 / 1436.5 KiB raw / 427.9 KiB gzip；邀请常量移出弹窗模块后为 426.5 KiB gzip。
- Mixpanel 从顶层静态导入改为空闲期异步加载后，首屏为 16 个脚本 / 1112.6 KiB raw / 333.8 KiB gzip，相对下降 22.0%，达到性能门槛。
- Mixpanel 仍保留在 328,233 字节的异步 chunk 中；这是首屏解析与水合优化，不宣称整个会话总下载量同步减少。
- 27 个测试文件 / 213 项测试、typecheck、lint、生产 build 通过；真实浏览器开始并放弃练习、导航恢复、控制台 0 错误。
- 下一刀：提取页面中约 480 行调试日志采集逻辑，页面只保留触发、显示和下载编排，继续向 800–1200 行推进。

### 阶段 4 第七检查点（2026-06-21，调试日志采集）

- 新增 `lib/practice-debug-log.ts`，承接 Service Worker、环境、存储、同步摘要、照片、会员与色阶诊断；页面通过显式快照调用。
- `handleExportDebugLog` 只保留采集调用、JSON 格式化、弹窗和错误提示；`page.tsx` 从 1829 行降至 1406 行。
- 拆分后首屏复测为 334.1 KiB gzip，相比上一检查点仅 +0.3 KiB，阶段基线仍下降 21.9%。
- 新增纯摘要与完整采集集成测试；28 个测试文件 / 218 项测试、typecheck、lint、生产 build 通过。
- 浏览器插件三次阻塞在本地导航，生产端口已清理；本检查点不把真实浏览器回归标记为通过，下一次可补“设置→导出日志→关闭”链路。
- 下一刀：提取记录/选项命令处理器，显式接收 `autoSync`，但不拆 `useSync` 内部行为，目标进入 800–1200 行。

### 阶段 4 最终检查点（2026-06-22）

- 新增 `hooks/usePracticeCommands.ts`，承接选项交互、容量/锁定规则和记录/选项 CRUD 命令；`autoSync` 作为依赖注入。
- 页面从 1406 行降至 1157 行，阶段 4 的 800–1200 行门槛完成。
- 29 个测试文件 / 223 项测试、typecheck、lint、生产 build 通过；首屏 334.6 KiB gzip，阶段累计下降 21.8%。
- 生产浏览器验证选项、自定义弹窗、运行日志完整 JSON、关闭层级和导航恢复，控制台 0 应用错误。
- 阶段 4 正式完成；阶段 5 第一刀先提取远端字段映射与输入归一化纯函数，不混入 Supabase I/O 或冲突决策。

### 阶段 5 第二检查点（2026-06-23，Supabase 仓库层）

- 新增 `lib/supabase-repository.ts`，将 useSync 中分散的 Supabase I/O 调用提取为 7 个仓库原语：
  - `fetchAllUserData`（并发下载记录/选项/资料，各带 30s 超时）
  - `fetchCloudRecordsForMerge`（上传前安全合并查询）
  - `repoUpsertRecords` / `repoUpsertOptions`（单次 upsert）
  - `repoDeleteAllUserRecords` / `repoDeleteAllUserOptions`（冲突策略清空）
- `hooks/useSync.ts` 删除 `supabase` 和 `TABLES` 直接导入以及 `queryWithTimeout` 内联函数，改用仓库原语。
- 行为零变化：重试、安全合并、批量分片、日志等业务逻辑保留在 useSync。
- `useSync.ts` 从 1306 行降至 1244 行（累计从 1348 → 1244，降 104 行）。
- 全量门禁通过：30 个测试文件 / 268 项测试、typecheck、lint、生产 build 通过。
- 下一刀：（a）Duplicated safe-merge logic 合并，或（b）uploadLocalData 批量 upsert 提取，目标 < 1000 行。

## 完成定义

- 页面与同步模块达到目标职责和规模。
- 计时、媒体、同步可脱离完整页面测试。
- 高风险测试矩阵没有“缺失”项。
- Tab 与低频弹窗真正按需加载。
- 首屏 JS 有可重复基线并下降至少 20%。
- 数据格式和持久化键保持兼容。
- 新开发者可在两分钟内找到模块、测试和变更记录。
