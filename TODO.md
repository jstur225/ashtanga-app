# 待处理问题

> 当前解耦阶段与完整测试缺口以 `docs/architecture/DECOUPLING_ROADMAP.md` 和 `docs/architecture/DECOUPLING_TEST_MATRIX.md` 为准。本文件只保留当前执行项。

## 2026-06-18 - 解耦阶段 2：练习会话模块 ✅ 已完成

- [x] 记录代码、测试与构建基线
- [x] 建立完整解耦路线图
- [x] 建立分层自动化测试矩阵
- [x] 提交并推送阶段 0 文档（`ecb9a13`）
- [x] 完成阶段 1：低风险 UI 与工具拆分（`0300ad4`）
- [x] 修复嵌套会员弹窗层级并补回归测试（`443f75a`、`917812f`）
- [x] 建立练习会话状态转换模型与保护测试
- [x] 提取 `usePracticeSession`，保持现有 LocalStorage 键兼容（`30a5700`）
- [x] 完成保存幂等、失败重试和草稿删除补偿（`ba7824a`）
- [x] 完成刷新恢复：持久化练习类型快照并使用 SSR 安全的 LocalStorage 适配器
- [x] 增加真实 hydration、练习类型刷新恢复和损坏存储回退测试；20 文件 / 170 项通过
- [x] 使用生产版浏览器复验：开始练习 → 刷新 → 类型、计时、暂停状态均正确且控制台无 hydration mismatch
- [x] 完成 `npm.cmd run build`，Next.js 生产构建通过
- [x] 完成阶段 2 全量门禁与隔离浏览器回归

## 下一执行项 - 解耦阶段 3：媒体 Hook

- [ ] 先补唱诵倒计时、音频失败和模式切换保护测试
- [ ] 提取 `useGuidedAudio`
- [ ] 提取 `useChantPlayback`
- [ ] 确保页面不再持有 `HTMLAudioElement`

## 2026-06-03 - 会员降级色阶锁定处理 ✅ 已实现

**状态**: ✅ 已实现

### 问题
Pro 用户降级为免费后，选项（PracticeOption）的 `color_level` 可能仍为 1 或 4（Pro 专属）。此时：
- `typeColorMap` 返回锁定值 → 日历/热力图/新记录默认色都错
- 编辑选项弹窗打开时，已选中的 1 或 4 不会自动降回 3

### 要求
- 选项被锁（1 或 4）就自动改为 3
- 已有练习记录（PracticeRecord）的 `color_level` 不修正

### 修改方案（审查后更新）

| # | 位置 | line | 改动 |
|---|------|------|------|
| 0 | 顶层共享函数 | 新增 | 提取 `getEffectiveOptionColor(options, label, isPro)` 共享辅助函数，所有调用统一走此函数 |
| 1 | `EditOptionModal useEffect` | 436-442 | 免费用户打开弹窗时，原始值 1/4 自动显示为 3 |
| 2 | `handleEditSave` | 4625-4635 | 免费用户保存时，1/4 强制改为 3 |
| 3 | `typeColorMap ×2` | 2871 / 3845 | CalendarTab + StatsTab 各有一个 `typeColorMap`，都需过滤 |
| 4 | `getTypeColorLevel ×3` | 634 / 1418 / 2321 | EditRecordModal + AddPracticeModal + CompletionSheet，改用共享函数 |

### 额外工作
- 单元测试：`__tests__/color-level.test.ts` — 共享辅助函数 8 个 case 覆盖所有分支

### 不改
PracticeForm（locked 逻辑已正确）、同步逻辑、CSS、历史记录、数据库

### 涉及文件
- `app/practice/page.tsx`（仅此一个文件）
- `__tests__/color-level.test.ts`（新增）

## 2026-06-02 - 日历色阶：记录级颜色选择器 🔶 已部署

**状态**: ✅ 已部署，2026-06-03 改为 4 级实色
**已推提交**: 4 次 commit 到 `master2`

### 改动内容

color_level 从 PracticeOption（类型级）扩展到 PracticeRecord（记录级），完成/补录/编辑练习时都可以单独设置颜色。

### 色阶定义（4级实色 + 会员权限）

| 等级 | CSS class | 颜色 | 权限 |
|------|-----------|------|------|
| 0 | `bg-stone-200`（已有） | 灰色 — 无练习 | — |
| 1 | `green-gradient-1` | `#E5E8E1` | 免费 |
| 2 | `green-gradient-2` | `#A6B39E` | 免费 |
| 3 | `green-gradient-3` | `#4A7A44`（原色） | 免费 |
| 4 | `green-gradient-4` | `#365533` | Pro |

- 免费用户可选等级 1/2/3
- Pro 用户可选全部 4 级
- 等级 4 加锁图标，点击提示升级

### 数据存储

**颜色优先级：** `record.color_level ?? typeColorMap[record.type] ?? 3`

- PracticeRecord 新增 `color_level?: number` — 记录级覆盖
- PracticeOption 保留 `color_level?: number` — 类型默认色（用户在设置中配置）
- 不配色的用户：所有记录回退到类型默认色（`????`），行为和以前一样

### UI 实现

- PracticeForm 底部新增折叠式颜色选择器（折叠：小绿点 + "选择" 文字，展开：5 个色阶圆点）
- 三个入口自动获得：完成练习、补录练习、编辑记录
- 选择类型时自动填充该类型的默认色阶
- 免费用户：等级 2/3 可选；Pro 用户：全部 5 级可选

### 数据库

```sql
ALTER TABLE practice_records ADD COLUMN color_level INTEGER DEFAULT 3;
```
✅ 已执行

### 已改文件

| 文件 | 改动 |
|------|------|
| `app/globals.css` | 4 级改为 5 级 CSS，新增 `.green-gradient-3/5` |
| `lib/supabase.ts` | `PracticeRecord` 接口加 `color_level?` |
| `lib/sync-utils.ts` | `getColorClass()` 改为 5 级映射 |
| `components/PracticeForm.tsx` | 新增折叠式颜色选择器，`color_level` 传入 `onSave` |
| `app/practice/page.tsx` | 三个表单入口支持 `color_level`，日历/热力图优先用记录级色阶 |
| `hooks/usePracticeData.ts` | `updateOption` 支持 `color_level` 参数 |
| `hooks/useSync.ts` | `uploadLocalRecords` 包含 `color_level` 字段 |

---

## 2026-06-03 - 智能合并死循环：云端孤立草稿导致假冲突 ✅ 已修复

**状态**: 已修复（代码 + 数据清理）

### 最终根因

前两个 bug（smartMerge 不处理 localNewer、localStorage 双写不同步）已通过 commit `94f2152` 修复（Step 1-3），但用户 6/3 仍报同样问题。

真正根因是 **3 条云端孤立草稿记录**：
- 用户取消练习时，旧版代码只本地删除草稿，不上传删除到云端
- `downloadRemoteData` 下载时不过滤草稿 → 草稿被下载到本地
- `usePracticeData` 的 `useEffect`（mount 时执行）过滤掉 `type === '草稿'` 的记录
- 每次页面刷新：下载 3 条草稿 → useEffect 过滤掉 → 下次 sync 又检测到 3 条 remoteOnly → 冲突

### 修复

1. **数据清理**：Supabase 执行 `DELETE FROM practice_records WHERE type = '草稿' AND deleted_at IS NULL`，清理 18 个用户共 18 条孤立草稿
2. **代码修复**：`downloadRemoteData` 查询加 `.neq('type', '草稿')`，防止云端草稿进入同步流程

### 涉及文件
- `hooks/useSync.ts` — `downloadRemoteData` 记录查询加 `.neq('type', '草稿')`

---

## 2026-06-18 - 练习页第一阶段解耦 ✅ 已完成

**状态**: 组件文件拆分和测试覆盖已完成；真正按需加载待下一阶段

### 背景
第一期已完成：删除 recharts/html2canvas、12 个弹窗懒加载、字体优化（预计减少初始 JS ~400-500KB）。

### 已完成

`practice/page.tsx` 从 6476 行降至 3238 行，以下组件已移出页面：

| 组件 | 行数 | 说明 |
|------|------|------|
| StatsTab | `components/stats/StatsTab.tsx` | 已拆分，仍为静态导入 |
| JournalTab | `components/journal/JournalTab.tsx` | 已拆分，仍为静态导入 |
| SettingsModal | `components/settings/SettingsModal.tsx` | 已拆分并使用 `dynamic()` |
| 记录弹窗 | `components/practice-record/` | 完成、补录、编辑和选择器已拆分 |

自动验证：131 项测试、TypeScript、lint、生产构建全部通过；浏览器核心练习与日记流程通过。

### 下一步

1. 提取页面顶部日期选择器、选项弹窗、结束确认框和格式化工具。
2. 提取练习会话状态与音频逻辑。
3. 将 JournalTab、StatsTab 改为动态加载，比较首屏构建产物。
4. 页面降至 1500 行以内后，再单独规划 `useSync` 拆分。

### 风险
- 涉及大量 props 传递和状态管理，6800 行文件的拆分有中高风险
- 需要仔细处理共享状态（计时器状态、同步状态、用户信息等）

### 验收要求

- 每阶段独立提交，保持 131 项现有测试持续通过。
- 浏览器回归不写真实云端；登录同步使用专用测试账号后另测。
- 解耦完成后更新 README、项目日志和本 TODO。

---

## 2026-05-22 - 瑜伽练习海报生成功能 💭 考虑中

**状态**: 考虑中，尚未开始开发

### 需求概述
用户在 app 中上传练习照片 → 生成一张上下分区的瑜伽海报：
- 上半部分：瑜伽人物冰箱贴图标（从照片提取姿势轮廓，简化成冰箱贴风格）
- 下半部分：原始照片
- 纯色背景从照片提取主色
- 底部一行手写英文字（如 "Ashtanga" / "Flow"）
- 整体像高级旅行卡片

### 已确认的决策
| 问题 | 决定 |
|------|------|
| AI API | 国内服务（硅基流动，不用翻墙，约¥0.1/张） |
| 海报文字 | 用户从 Flow / Practice / Breathe / Ashtanga 选一个 |
| 存储 | 只下载到本地（不保存云端，不跨设备） |
| 入口 | 底部 Tab 新增一个「海报」Tab |

### 技术方案
- **AI 图片生成**: 调用硅基流动 API（服务端，防泄漏 Key）
- **后端**: `app/api/generate-poster/route.ts`，接收照片 URL + prompt → 返回生成图片
- **前端**: 新增底部 Tab「海报」→ 选照片 → 生成 loading → 展示 → 下载
- **复用**: PhotoUploader / OSS 上传 / PhotoLightbox 预览

### 不涉及
- ❌ 不改数据库
- ❌ 不改同步逻辑
- ❌ 不改设计系统

### 执行步骤
1. 注册硅基流动 API 账号，获取 Key，添加到 `.env.local`
2. 新建 `app/api/generate-poster/route.ts` 后端路由
3. 底部 Tab 新增「海报」Tab + 海报生成 UI 流程
4. 测试验证

---

## 2026-05-09 - 微信用户回访（36 人）⏳ 进行中

**目标**：对微信 36 个用户做一对一文字回访，收集真实反馈

**执行步骤**：
1. 选一个最可能友好回复的用户，发第一条邀请（今天就发）
2. 用 20 分钟文字访谈结构：工具反馈 → 练习现状 → 未来可能
3. 每次聊完立刻标注关键洞察
4. 逐步完成 36 人

**参考话术**：
> "XX 你好呀，我是【熬汤日记】的 orange。看到你使用工具也有一段时间了，特别感谢你的支持。最近我们上线快 3 个月了，我特别想听听像你这样早期用户最真实的想法。不知道方不方便占用你 20 分钟左右的时间，我们简单做个文字交流？时间看你方便，我随时配合。"

**访谈核心问题**：
1. 工具对你最大的帮助是什么？哪里不好用？最想优化什么？
2. 最近练习还顺利吗？遇到困难怎么解决？最不方便的地方？
3. 理想的解决方案是什么样的？社群/约练感兴趣吗？

**原则**：一次只问一个问题 / 先理解需求再提方案 / 完成比完美重要

**进展记录**：
- [x] 发出第 1 条邀请（周五发了4人，1人回复愿意聊）
- [x] 完成第 1 次访谈（yimaqi，6/3）
- [ ] 完成第 10 次访谈
- [ ] 完成全部 36 次

**第1次访谈总结（℃）**：
- 核心洞察：不同序列用不同颜色区分（序列颜色功能由此而来）
- 其他需求：姨妈期标注、地点/老师/伤痛记录、呼吸/放松/专注星级打分
- 体式库不需要，喜欢简洁
- 付费意愿：暂无

---

## 2026-04-29 - Tab2 绑定邮箱提醒条 ✅ 已完成

**状态**：已完成
**提交**：`6fb7add` feat: Tab2 顶部绑定邮箱提醒条（金色可点击，未登录可见）
**改动文件**：`app/practice/page.tsx`（第 3202 行）

### 实现细节
- 条件渲染 `!user`，未登录时显示
- 金色文字 `#C1A268`（DESIGN.md Gold），可点击触发 `onOpenFakeDoor`
- `pl-4` 视觉对齐云同步图标（SyncButton）
- 文案：`👇绑定邮箱，免费领 62 天 Pro 会员（5.1统一发放）`

### 注意事项
- ✅ 过期提醒条代码已清理

---

## 2026-04-29 - 公告弹窗更新 v4 ✅ 已完成

**状态**：已完成
**提交**：`a0610f2` feat: 更新公告弹窗v4 + `ea86a99` fix: 添加公告图片
**改动文件**：`components/XiaohongshuInviteModal.tsx`、`public/xhs-join-group2.jpg`

### 更新内容
- INVITE_VERSION: v3 → v4（所有用户重新看到红点）
- 群链接：新群 ZH9565
- 图片：xhs-join-group.jpg → xhs-join-group2.jpg
- 主文案：去掉"被禁言"，改为"欢迎进小红书交流群"
- 副文案：去掉"也防丢失"

---

## 2026-04-29 - 觉察笔记全屏编辑功能 ✅ 已完成

**状态**：已完成
**改动文件**：`components/PracticeForm.tsx`（仅此一个文件）

### 需求
三个弹窗（完成练习、补录练习、编辑练习）的觉察/笔记 textarea 右下角有 Expand 按钮，目前点击只弹 toast 占位。需要实现全屏编辑。

### 实现方案
1. PracticeForm 新增 `isFullscreen` 内部状态
2. Expand 按钮 onClick 改为 `setIsFullscreen(true)`
3. 全屏覆盖层：z-[100]，顶部栏（收起按钮 + 字数），全屏 textarea（text-base 字号，autoFocus）
4. notes 状态共享——全屏和弹窗共用同一个 state，收起后内容自动同步
5. 不需要新增 props，对外部透明

### 验证
- [ ] 点击 Expand → 全屏覆盖层出现，textarea 自动聚焦
- [ ] 输入文字 → 收起 → 文字保留在弹窗中
- [ ] 字数计数器正常
- [ ] 照片上传等其他功能不受影响

---

## 2026-04-24 - 会员状态查询优化 + 调试日志增强 ✅ 已完成

**状态**：已完成
**提交**：`a502b8a` fix: 会员状态查询增加 5 路 fallback + 增强 debug API 全链路诊断

### 已实现
- 会员状态查询 5 路 fallback（视图→email直查→profileId直查→遍历 profiles→全表扫描）
- 增强 debug API 支持 token 查特定用户全链路数据
- 调试日志导出增加会员状态模块（本地状态+API 查询 +debug 全链路 + 唱诵状态）
- `MembershipStatus` type 补充 `trial` 类型

### 涉及文件
- `app/api/membership/status/route.ts` — 5 路 fallback 查询
- `app/api/debug/membership/route.ts` — 增强全链路诊断
- `app/practice/page.tsx` — 调试日志增加会员模块
- `hooks/useMembership.ts` — 补充 trial 类型

---

## 2026-04-24 - 今日练习次数显示优化 ✅ 已完成

**状态**：已完成
**提交**：`4835808` fix: 今日练习次数禁缓存 + 单击刷新 + 页面可见时自动刷新

### 已实现
- 从"今日在线人数"改为"今日总练习次数"（更准确反映活跃度）
- API 禁缓存（`force-no-store`, `revalidate=0`）确保数据实时
- 单击按钮自动刷新数据
- 页面可见时自动刷新（从其他 app 切回时）
- 练习完成后自动刷新

### 涉及文件
- `app/api/stats/today/route.ts` — 从 `count(distinct user_id)` 改为`count(*)`
- `app/practice/page.tsx` — 单击刷新 + 页面可见刷新

---

## 2026-04-24 - 唱诵设置改用数字输入框 ✅ 已完成

**状态**：已完成
**提交**：`9c9f67b` fix: 唱诵设置改用数字输入框替代滚轮（PWA 滚动穿透无法解决）

### 已实现
- Pro 用户设置从滚轮改为数字输入框 + 上下箭头
- 分钟上限从 5 分扩到 180 分（3 小时）
- 输入框加宽适配三位数显示
- 免费用户升级按钮改为金色渐变

### 涉及文件
- `app/practice/page.tsx` — 唱诵设置 UI 重构

---

## 2026-04-22 - 全站数据统计追踪 ✅ 已完成

**状态**：已完成
**提交**：`a7af1b7` feat: 全站统计追踪 + 生产优化

### 已实现
- 新建 `daily_user_activity` 表（每用户每天一行，标记 is_new）
- 新建 `POST /api/stats/heartbeat` 接口记录每日活跃
- 在 `AnalyticsInitializer` 的 `app_open` 事件旁调用 heartbeat
- 查询 SQL：JOIN `daily_user_activity` + `user_profiles` + `practice_records`

### 数据库变更
- `supabase/migrations/20260422_daily_user_activity.sql` — 建表
- `supabase/migrations/20260422_fk_on_delete_set_null.sql` — 外键优化

---

## 2026-04-17 - Tab 切换动画引入的布局 Bug ✅ 已修复

**状态**：已完成
**提交**：`18a7e25` fix: 修复 Tab 动画导致的布局断裂

### Bug 列表
1. ✅ **开始练习按钮位置偏上** — AnimatePresence 外层加 flex 容器
2. ✅ **时光轴无限滚动失效** — 同上修复
3. ✅ **回到顶部按钮消失** — 同上修复

---

## 2026-04-22 - 练习页第一栏三个固定功能位 ✅ 已完成

**状态**：已完成
**提交**：`1def067` fix: 口令跟练名称改为「一序列」，notes 改为「老掌门人版口令」

**实现细节**：
- 固定按钮常量 `FIXED_BUTTONS` 定义（3 个固定位）
- 口令跟练显示名称「一序列」，notes「老掌门人版口令」，带喇叭图标
- 固定按钮不计入用户选项名额（免费 3 个/Pro 11 个自定义选项）
- 唱诵音频文件已添加（`public/audio/opening-chant.mp3`, 1.1MB）

### 功能概要
把练习选项网格的第一行（3 个位置）改成固定功能卡片，不占用户自定义选项的名额：

| 位置 | 功能 | 说明 |
|------|------|------|
| 第1个 | 唱诵开关 | 倒计时 → 播放唱诵 → 开始练习计时 |
| 第2个 | 口令跟练 | 把现有 guided_audio 预设挪到固定栏 |
| 第3个 | 今日练习人数 | 数据已就绪（daily_user_activity），后续接入显示 |

### 第1个：唱诵开关（开篇唱诵）✅ 已完成

**流程**：
```
单击切换开/关 → 开启后点击开始练习 → 全屏玻璃倒计时 → 播放 /audio/opening-chant.mp3 → 唱诵结束 → 从0开始练习计时
```

**免费用户**：
- 单击切换开/关，状态持久化（localStorage）
- 开启后按钮变绿色，备注显示"XX秒后播放"
- 双击打开设置 sheet（锁定状态 + 功能说明 + 升级 Pro 按钮）
- 默认倒计时60秒

**Pro 会员**：
- 同上开/关切换
- 双击打开设置 sheet，数字输入框 + 上下箭头（分钟 0-180，秒 0-59）
- 与口令跟练互斥（开启唱诵自动关闭口令跟练，反之亦然）

**UI 细节**：
- 倒计时覆盖层：薄玻璃效果（`bg-white/30 backdrop-blur-[8px]`），圆圈与练习计时圆圈同尺寸同位置
- 计时页控件统一毛玻璃风格（进度条、加载状态、步长选择器）
- 练习结束后自动清理唱诵状态和音频资源

### 第2个：口令跟练
- 把现有 `guided_audio` 预设从选项列表移到固定栏第2格
- 口令播放逻辑不变，只改渲染位置

### 第3个：今日练习人数
- ✅ 显示今日全平台总练习次数（金色数字）
- 数据来源：`GET /api/stats/today`（查询 `practice_records` 按日期统计总次数）
- 固定按钮，单击刷新数据 + toast 提示

### 渲染顺序
```
grid-cols-3
┌──────────┬──────────┬──────────┐
│ 唱诵开关  │ 口令跟练  │ 今日人数  │  ← 固定功能栏（不计入上限）
├──────────┼──────────┼──────────┤
│ 一序列    │ 半序列    │ 自定义1   │  ← 用户选项
├──────────┼──────────┼──────────┤
│ 自定义2   │    +     │          │  ← 用户选项 + 添加按钮
└──────────┴──────────┴──────────┘
```

### 设计要点
- 这 3 个是固定功能位，不算入用户的 4/10 选项上限
- 用户自定义选项从第二行开始排列
- 固定栏不可编辑、不可删除

### 涉及改动
- `hooks/usePracticeData.ts` — 添加唱诵预设，调整 guided_audio
- `app/practice/page.tsx` — 固定栏渲染 + 唱诵倒计时/播放逻辑 + 设置弹窗
- `lib/audioCache.ts` — 复用现有缓存播放

---

## 2026-04-17 - 新用户绑定邮箱赠送 31 天 Pro 会员 ✅ 已完成

**状态**：已完成
**提交**：`16ec701` feat: 绑定邮箱赠送 31 天 Pro 会员

### 功能需求
新用户绑定邮箱时，自动发放 31 天 Pro 会员（作为绑定 incentive）

### 实现细节
- ✅ 注册成功后自动创建 `trial` 类型会员（31 天到期）
- ✅ 防重复赠送：检查已有会员记录则跳过
- ✅ 赠送失败不影响注册流程（`try/catch` 隔离）
- ✅ 注册后自动刷新会员状态，避免显示旧账号缓存数据
- ✅ 前端绑定成功提示：「🎉 已赠送 31 天 Pro 会员」
- ✅ 注册表单添加金色引导文案：「🎁 绑定邮箱即享 31 天 Pro 会员」

### 涉及文件
- `lib/membership-utils.ts` — 新建 `ensureProfileAndGetId()` 共享函数
- `app/api/auth/register/route.ts` — 注册后自动赠送
- `app/api/membership/activate/route.ts` — 重构使用共享函数
- `lib/supabase.ts` — 类型定义添加 `trial`
- `components/AuthModal.tsx` — 前端文案更新
- `app/practice/page.tsx` — 注册后刷新会员状态

### 验证
| 场景 | 预期 |
|------|------|
| 新用户绑定邮箱 | 自动创建 trial 会员，31 天到期 |
| 绑定后查看会员状态 | isPro=true |
| 已有会员重复触发 | 跳过（不重复创建） |
| useMembership 自动刷新 | 页面可见时自动查询，显示 Pro |

### 注意事项
- 数据库 `user_memberships.type` 列无需 CHECK 约束（自由文本）
- 试用会员不关联激活码（`activated_by_code_id: null`）

---

## 2026-04-08 - 练习选项同步重构（固定槽位系统）⏳ 待推进

**状态变更：** 2026-04-09 - 采用方案 C（手动修复），槽位系统暂缓推进，后续条件成熟时再实施。

**修复内容（方案 C）：**
- ✅ `app/practice/page.tsx` 第 3604 行添加 `o.visible !== false` 过滤，修复删除后仍显示的问题

**待推进内容（槽位系统）：**
- ⏳ 数据库迁移（添加 slot_index 等字段）
- ⏳ 数据迁移脚本
- ⏳ 同步逻辑重构
- **推进条件：** 用户量增长需要更复杂的选项管理，或需要跨设备严格同步顺序

**原方案（已废弃）：**

| 决策项 | 选择 | 说明 |
|--------|------|------|
| 数据库迁移 | 两步迁移 | ① 先添加 nullable 字段 ② 迁移数据 ③ 添加约束 |
| 部署策略 | 分阶段 | 阶段 1 改上传（所有实际槽位），阶段 2 改下载，降低风险 |
| 超量处理 | 需处理 | 现有用户可能有 4-7 个选项，迁移时分配到 slot 1-10 |
| 类型复用 | 从 supabase 导入 | PracticeOption 类型统一从 lib/supabase.ts 导出 |
| Pro 降级 | 保留可编辑 | 超出的槽位可正常使用，删除后不可恢复超出部分 |

### 🔧 常量定义

```typescript
// lib/constants.ts
export const SLOT_CONFIG = {
  DEFAULT_VISIBLE: 3,      // 默认可见：一序列 Mysore/Led、半序列
  DEFAULT_HIDDEN: 1,       // 默认 1 个隐藏空槽（给用户自定义）
  MAX_FREE: 4,             // 普通用户上限
  MAX_PRO: 10,             // Pro 用户上限
  TOTAL_DEFAULT_SLOTS: 4,  // 新用户自动创建的槽位数
} as const;
```

**说明：**
- 普通用户最多 4 个槽位（3 个默认可见 + 1 个空槽）
- Pro 用户可解锁到 10 个槽位
- 现有用户可能已经创建 4-7 个选项（因为之前限制是 7 个），迁移时需分配到 slot 1-10
- 迁移时不足 4 个的用户，补全到 4 槽（3 默认 + 1 空槽）
- **注意：** "新用户注册" = "游客绑定邮箱"，两者是同一流程

### 📋 执行步骤（评审后）

#### Step 1: 数据库迁移 ⏳ 待执行

**迁移脚本（分两步）：**

```sql
-- 第 1 步：添加 nullable 字段
ALTER TABLE practice_options
  ADD COLUMN slot_index INTEGER,
  ADD COLUMN visible BOOLEAN DEFAULT true,
  ADD COLUMN is_default BOOLEAN DEFAULT false,
  ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;

-- 第 2 步：迁移现有数据（为每个用户分配 slot_index 1-10）
-- 按 user_id 分组，按 created_at 排序分配槽位
-- 现有用户可能有 4-7 个选项，全部分配到 1-10

-- 第 3 步：为没有选项的用户创建 4 个默认槽位

-- 第 4 步：添加约束（数据迁移完成后）
ALTER TABLE practice_options
  ALTER COLUMN slot_index SET NOT NULL;

CREATE UNIQUE INDEX idx_user_slot ON practice_options(user_id, slot_index);
```

**注意事项：**
- 现有用户可能已经创建 4-7 个选项（之前限制 7 个），迁移时需分配 slot_index 1-10
- Pro 用户最多支持到 10 槽，普通用户 4 槽（但现有超出的保留）
- 迁移时需为每个用户的现有选项分配槽位，不足 4 个的补全到 4 个默认槽

#### Step 2: 阶段 1 - 修改上传逻辑 ⏳ 待执行

**目标：** 上传时发送所有实际槽位（4-10 个，含 visible=false 的）

**修改文件：** `hooks/useSync.ts`

```typescript
// 当前代码（第 918-924 行）
const optionsToUpload = options.filter(o => o.is_custom).map(...)

// 新逻辑
// 1. 上传所有本地选项（含 slot_index）
// 2. 使用 onConflict: 'user_id,slot_index'
const optionsToUpload = options.map((o) => ({
  user_id: userId,
  slot_index: o.slot_index,  // 必须已分配
  label: o.label || '',
  notes: o.notes || null,
  visible: o.visible !== false,  // 默认为 true
  is_default: o.is_default || false,
  updated_at: new Date().toISOString(),
}));

// 确保有 slot_index（迁移后的数据应该都有）
const validOptions = optionsToUpload.filter(o => o.slot_index > 0);

await supabase
  .from(TABLES.PRACTICE_OPTIONS)
  .upsert(validOptions, {
    onConflict: 'user_id,slot_index'  // 改为复合唯一键
  });
```

**验证：** 部署后检查 Supabase 日志，确认上传了所有槽位（4-10 条）

#### Step 3: 阶段 2 - 修改下载逻辑 ⏳ 待执行

**目标：** 下载时接收云端所有槽位，按 slot_index 排序

**修改文件：** `hooks/useSync.ts` - `downloadRemoteData`

```typescript
// 下载云端选项（已按 slot_index 排序）
const { data: optionsData } = await supabase
  .from(TABLES.PRACTICE_OPTIONS)
  .select('*')
  .eq('user_id', userId)
  .order('slot_index', { ascending: true });

// 云端返回的是用户的所有槽位（4-10 个）
// 如果为空（旧用户未迁移），返回空数组让本地逻辑处理
const slots = optionsData || [];
```

**验证：** 新设备登录后，检查本地 storage 中有正确数量的选项

#### Step 4: 本地逻辑修改 ⏳ 待执行

**修改文件：** `hooks/usePracticeData.ts`

1. **删除本地 PracticeOption 接口定义**，改为从 supabase.ts 导入
2. **DEFAULT_OPTIONS** 改为 4 个默认槽位
3. **addOption**：找第一个 visible=false 的槽位复用
4. **deleteOption**：标记 visible=false

#### Step 5: 注册/绑定流程（游客→登录用户）⏳ 待执行

**场景：** 游客用户绑定邮箱完成注册/登录，需要将本地选项迁移到云端

**注意：** "新用户注册"和"游客绑定邮箱"是同一流程，都需要处理本地数据迁移

**修改文件：** `app/api/auth/callback/route.ts`

**流程：**
1. 用户绑定邮箱，Supabase 创建用户账户
2. **检查云端是否已有槽位数据**
   - 如果有：以云端为准（正常同步流程）
   - 如果没有：执行迁移逻辑
3. **迁移逻辑：**
   - 本地默认 3 个选项 → slot 1-3
   - 本地自定义选项 → slot 4-N（按 created_at 排序）
   - 不足 4 槽的，创建空槽补全

```typescript
// 在创建 user_profiles 后，检查并创建 practice_options
const migrateOptionsToCloud = async (userId: string, localOptions: PracticeOption[]) => {
  // 1. 检查云端是否已有数据
  const { data: cloudOptions } = await supabase
    .from('practice_options')
    .select('*')
    .eq('user_id', userId)
    .order('slot_index', { ascending: true });

  // 2. 云端已有数据，跳过
  if (cloudOptions && cloudOptions.length > 0) {
    return cloudOptions;
  }

  // 3. 云端没有数据，迁移本地选项
  const defaultLabels = ['一序列 Mysore', '一序列 Led class', '半序列 站立 + 休息'];
  const visibleOptions = localOptions.filter(o => o.visible);
  const customOptions = visibleOptions.filter(o =>
    !defaultLabels.includes(`${o.label} ${o.notes}`)
  );

  // 构建槽位数据
  const slotsToCreate = [
    { slot_index: 1, label: '一序列', notes: 'Mysore', visible: true, is_default: true },
    { slot_index: 2, label: '一序列', notes: 'Led class', visible: true, is_default: true },
    { slot_index: 3, label: '半序列', notes: '站立 + 休息', visible: true, is_default: true },
    // 自定义选项
    ...customOptions.map((opt, idx) => ({
      slot_index: 4 + idx,
      label: opt.label,
      notes: opt.notes,
      visible: true,
      is_default: false,
    })),
  ];

  // 补全到 4 槽
  while (slotsToCreate.length < 4) {
    slotsToCreate.push({
      slot_index: slotsToCreate.length + 1,
      label: '',
      notes: '',
      visible: false,
      is_default: false,
    });
  }

  // 插入云端（限制最多 10 槽）
  const slotsToInsert = slotsToCreate.slice(0, 10).map(slot => ({
    user_id: userId,
    ...slot,
    is_custom: !slot.is_default,
  }));

  await supabase.from('practice_options').insert(slotsToInsert);
  return slotsToCreate;
};
```

#### Step 6: 前端渲染逻辑 ⏳ 待执行

**修改文件：** `app/practice/page.tsx`

```typescript
// 渲染时只显示 visible=true 的选项
const visibleOptions = practiceOptions.filter(o => o.visible);

// ⭐ 按 slot_index 排序显示（固定槽位顺序）
visibleOptions.sort((a, b) => a.slot_index - b.slot_index);
```

**说明：**
- 删除选项后再新建，会复用被删除的 slot_index
- 例如：删除 slot 2，新建选项占用 slot 2，显示顺序为 1,3,4,2
- 这是预期行为，新建选项排在后面（视觉上靠后）可接受

#### Step 7: 验证清单 ⏳ 待执行

- [ ] **数据库迁移：** slot_index 字段添加成功，现有数据已分配槽位
- [ ] **新用户注册/绑定：** 游客绑定邮箱后，本地选项正确迁移到云端槽位（3 默认 + 自定义→slot 1-N）
- [ ] **添加选项：** 复用空槽，普通用户最多 4 个，Pro 用户最多 10 个
- [ ] **删除选项：** 标记为 visible=false，不物理删除，可复用
- [ ] **同步验证：** 上传所有槽位（4-10 个），下载完整覆盖
- [ ] **新设备登录：** 能看到完整的 3 个默认选项（一序列 Mysore/Led、半序列）+ 1 个空槽
- [ ] **降级场景：** Pro 用户降级后，仍上传全部槽位（保留数据），但前端限制不能新建超出 4 槽

#### Step 8: 数据迁移脚本（一次性）⏳ 待执行

```typescript
// scripts/migrate-to-slots.ts
// 1. 查询所有有选项的用户
// 2. 按 user_id 分组，按 created_at 排序分配 slot_index 1-10
//    - 现有用户可能有 4-7 个选项（之前限制 7 个），全部分配到 1-10
//    - 超出 10 个的（理论上不可能，但做兜底）：只保留前 10 个
// 3. 不足 4 个的，补全到 4 槽（3 个默认 + 1 个空槽）
// 4. 更新所有记录的 visible=true, is_default=!is_custom
```

**迁移策略：**
- **目标：** 已有云端账户的老用户（部署前已注册用户）
- **普通用户（4-7 个选项）**：全部分配 slot 1-N（N=实际数量），全部 visible=true
- **Pro 用户（可能 4-10 个）**：同上，最多到 slot 10
- **新用户（注册后）**：已在 Step 5 处理（注册/绑定流程自动创建）

### ❌ 不做（NOT in Scope）

| 功能 | 不做原因 |
|------|---------|
| 超过 10 槽（如 18 槽高级会员） | 当前 Pro 只到 10，后续再扩展 |
| 槽位拖拽排序 | 复杂度较高，当前按 created_at 足够 |
| 选项分类/分组 | 超出当前需求 |
| 迁移脚本 UI | 一次性脚本，命令行足够 |

### 📁 涉及文件

- `lib/supabase.ts` - 更新 PracticeOption 接口
- `lib/constants.ts` - 新增 SLOT_CONFIG 常量
- `hooks/usePracticeData.ts` - 修改 addOption/deleteOption，删除重复类型定义
- `hooks/useSync.ts` - 修改上传/下载逻辑（分阶段部署）
- `app/api/auth/callback/route.ts` - 注册/绑定流程：创建槽位并迁移本地选项
- `app/practice/page.tsx` - 渲染时过滤 visible=true
- `scripts/migrate-to-slots.ts` - 一次性数据迁移脚本

### 🚨 部署顺序

1. **Day 1：** 执行数据库迁移（添加 nullable 字段）
2. **Day 2：** 运行数据迁移脚本（为已有云端账户的老用户分配槽位 1-10）
3. **Day 3：** 部署阶段 1（修改上传逻辑，上传所有实际槽位）
4. **Day 4：** 验证上传正常，部署阶段 2（修改下载逻辑 + 注册/绑定流程创建槽位）
5. **Day 5：** 验证新设备同步和游客绑定迁移正常，完成

**状态：** ✅ 评审完成，等待执行

---

---

## 🐛 待修复 Bug

### 2026-05-22 - 云端孤立草稿导致假冲突覆盖用户笔记 ✅ 已修复

**状态**: 已修复
**提交**: `89c0e9a`
**根因**: CompletionSheet/AddPracticeModal 取消弹窗时仅本地删除草稿，云端孤立记录累积导致「本地N条，云端M条」假冲突，用户选云端后实际笔记被空白草稿覆盖
**修复**: 取消草稿路径改为调用 `handleDeleteRecord`（本地删除 + Supabase 软删除）
**文件**: `app/practice/page.tsx`

### 2026-05-20 - 同步时本地空白覆盖云端内容 ✅ 已修复

**状态**: 已修复
**根因**: 用户在新设备查看旧记录时，编辑表单覆盖了原始 notes，后续 `upsert` 将空白内容上传云端覆盖原始数据
**修复**: `uploadLocalRecords` 和 `uploadLocalData` 新增安全合并——上传前对比云端，若本地 notes 为空/默认文案但云端有内容 → 保留云端
**文件**: `hooks/useSync.ts`

### 2026-04-22 - 练习页按钮上限计算错误 ✅ 已修复

**状态**: 已修复（随固定功能栏一起修复）
**提交**: `f15654f` feat: 今日练习人数固定按钮 + 选项上限计算修复

**修复内容**:
- `isOptionsFull` 和 `lockedOptionIds` 已正确过滤 `is_fixed` 固定按钮
- 固定按钮不计入用户选项名额

