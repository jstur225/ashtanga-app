# 待处理问题

## 2026-06-02 - 日历色阶：练习类型 → 绿色深浅 💭 待审核

**状态**: 代码已实现，待数据库加列后部署

### 需求概述
日历中用不同深浅的绿色来区分练习类型。用户自己配置"什么练习类型用什么绿色深浅"。日记Tab月历和统计Tab全年热力图都加。同一天多次练习取最深色。

### 色阶定义（4级 + 会员权限）

| 等级 | CSS class | 效果 | 权限 |
|------|-----------|------|------|
| 0 | `bg-stone-200`（已有） | 灰色 — 无练习 | — |
| 1 | `green-gradient-1`（新增） | 最浅绿 | Pro |
| 2 | `green-gradient-2`（新增） | 浅绿 | 免费 |
| 3 | `green-gradient-deep`（已有） | 默认绿（现在的颜色） | 免费 |
| 4 | `green-gradient-4`（新增） | 深绿 | Pro |

- 免费用户只能选等级 2（浅绿）和 3（默认）
- Pro 用户 4 个等级全选
- 设置 UI 中等级 1 和 4 加锁图标，点击提示升级

### 数据存储与同步

**方案：`color_level` 作为 PracticeOption 的字段，跟着选项同步。**

因为 PracticeOption 已经在同步了，颜色等级跟着选项走就自然同步。不需要单独的 color map。

1. Supabase `practice_options` 表加列 `color_level INTEGER DEFAULT 3`
2. 前端 `PracticeOption` 类型加 `color_level?: number` 字段
3. 同步时 `mergeOptions` 中像保留 `is_preset`/`can_edit` 一样保留 `color_level`

### UI 入口

设置弹窗新增「显示」tab：
- 列出所有练习选项（`practiceOptionsData`）
- 每个选项右侧 4 个小圆点（4 级绿色），点击即选中
- 免费用户等级 1、4 灰显 + 锁图标，点击 toast 升级提示
- 底部说明：「未配置的练习类型统一使用默认色」

### 改动文件清单

| 文件 | 改动 |
|------|------|
| `app/globals.css` | 新增 `.green-gradient-1/2/4` 三个 CSS class |
| `lib/supabase.ts` | `PracticeOption` 接口加 `color_level?` 字段 |
| `hooks/usePracticeData.ts` | 导出 colorLevel 相关逻辑 |
| `hooks/useSync.ts` | `mergeOptions` 保留 `color_level` 字段 |
| `app/practice/page.tsx` | 6 处改动（见下方详细说明） |
| Supabase 控制台 | `practice_options` 表加 `color_level` 列 |

### page.tsx 内 6 处改动

1. **MoonDayButton**（行 242-304）：新增 `colorLevel` prop，`green-gradient-deep` 替换为动态 class
2. **SettingsModal**（行 1517）：新增「显示」tab，色阶配置 UI
3. **JournalTab practiceMap**（行 2781-2787）：boolean 扩展为 `{ practiced, colorLevel }`，同天多次取最深
4. **JournalTab 日历渲染**（行 2920-2950）：传 `colorLevel` 给 MoonDayButton
5. **StatsTab HeatmapDot**（行 3721-3724）：新增 `colorLevel` 字段
6. **StatsTab 热力图渲染**（行 3950-3986）：删除 `dotConfig.levels`，用 `colorLevel` 动态取色

### 默认行为

- 新用户 / 未配置 → 所有选项 `color_level = 3`（`green-gradient-deep`），行为和现在完全一致
- 同一天多次练习取最深色（level 数字越大越深）

### 不在范围内

- ❌ 分享卡片（MonthlyStatsShareModal）不改，保持 `green-gradient-deep`
- ❌ 数据库迁移脚本（直接在 Supabase 控制台手动加列）

### 验证

| 场景 | 预期 |
|------|------|
| 不配置色阶 | 日历行为和现在完全一致 |
| 设置中选择不同色阶 | 月历和热力图即时反映 |
| 同一天两种练习 | 显示更深的那个颜色 |
| 免费用户点等级 1 或 4 | toast 提示升级 Pro |
| Pro 用户 | 4 个等级全可选 |
| 跨设备同步 | 颜色设置跟着练习选项一起同步 |
| `npx next build` | 编译通过 |

---

## 2026-06-02 - 智能合并死循环：冲突反复出现 🐛 待修复

**状态**: Step 1 已完成（纯函数提取 + diffRecords 替换），Step 2-3 待执行

### 用户反馈
用户（烧冰冰，519216978@qq.com）每次打开 app 都看到"数据冲突"弹窗（本地 35 条，云端 38 条），点了多次"智能合并"后下次登录仍然弹出。

### 根因分析

两个 bug 共同导致：

#### Bug 1：`smartMerge` 不处理「时间戳更新」的记录

**文件**：`hooks/useSync.ts`

**问题**：`autoSync` 检测冲突时计算 4 种差异（line 252-284）：

```
localOnly   — 仅本地有（ID 不在云端）
localNewer  — 两边都有，本地时间戳更新
remoteOnly  — 仅云端有（ID 不在本地）
remoteNewer — 两边都有，云端时间戳更新
```

`totalLocalChanges = localOnly + localNewer`
`totalRemoteChanges = remoteOnly + remoteNewer`

但 `resolveConflict('merge')` 重新计算差异时（line 1289-1290）**只用 ID 比较**：

```typescript
const localOnly = records.filter(r => !remoteIds.has(r.id))
const remoteOnly = remoteData.records.filter(r => !localIds.has(r.id))
```

传给 `smartMerge` 的只有 `localOnly` 和 `remoteOnly`，**丢失了 `localNewer` 和 `remoteNewer`**。

该用户的情况：
- `localNewer = 1`（1 条记录两边都有，本地 updated_at 更新）→ **永远不会被上传**
- `remoteOnly = 3`（3 条记录只存在于云端）→ 会被下载
- 合并后本地应该 38 条，但那条 localNewer 记录永远卡在"有变更"状态

#### Bug 2：合并后数据不持久化

**文件**：`hooks/useSync.ts` + `hooks/usePracticeData.ts`

**问题**：`smartMerge` 的保存链路有冲突：

1. `smartMerge` 调用 `onSyncComplete`（line 672）→ 触发页面的 `clearAllData()` + `importData()`
2. `clearAllData()` 调用 `setRecords([])` → `useLocalStorage` 的 `set` 写空数组到 localStorage
3. `importData()` 调用 `setRecords(sortedRecords)` → `useLocalStorage` 的 `set` 写 38 条到 localStorage
4. `smartMerge` 又直接 `localStorage.setItem('ashtanga_records', ...)`（line 678）— 绕过 hook 直接写

问题在于 `useLocalStorage`（来自 `react-use`）**不监听外部 localStorage 变更**。React state 可能和 localStorage 不同步。当 app 重新加载时，`useLocalStorage` 从 localStorage 读到合并数据，但如果中间有任何 React state 变化触发了 hook 的 `set` 回调，旧的 React state 值会被写回 localStorage，覆盖合并结果。

日志证据：合并后日志显示"下载3条云端记录"（成功），但下次登录 autoSync 仍读到 35 条 → 说明 3 条被覆盖了。

### 修复计划

#### Step 1：`resolveConflict` 传递完整差异给 `smartMerge` ✅ 已完成

**文件**：`hooks/useSync.ts` + `lib/sync-utils.ts`

已将 diff 逻辑提取为纯函数 `diffRecords()`（`lib/sync-utils.ts`），`resolveConflict` 的 merge 分支现在调用 `diffRecords()` 一次性计算 4 种差异（localOnly/remoteOnly/localNewer/remoteNewer），不再丢失时间戳更新的记录。同时 `autoSync` 中同样的逻辑也替换为 `diffRecords()` 调用，消除重复代码。25 个单元测试覆盖。

#### Step 2：`smartMerge` 处理 `localNewer` 和 `remoteNewer`

**文件**：`hooks/useSync.ts` line 635-694

修改函数签名和逻辑：

```typescript
const smartMerge = async (
  localOnly: PracticeRecord[],
  remoteOnly: PracticeRecord[],
  localNewer: PracticeRecord[],   // 新增
  remoteNewer: PracticeRecord[],  // 新增
  remoteData: any
) => {
  // ... 现有 profile 合并逻辑 ...

  // 合并记录：本地基础 + 云端独有 + 云端更新的覆盖本地
  const mergedRecords = (() => {
    const base = [...freshLocalData.records, ...remoteOnly] // 现有逻辑
    // 用云端更新的记录覆盖本地旧版本
    const remoteNewerMap = new Map(remoteNewer.map(r => [r.id, r]))
    return base.map(r => remoteNewerMap.get(r.id) || r)
  })()

  // ... options 合并逻辑不变 ...

  onSyncComplete({
    records: mergedRecords,
    options: mergedOptions,
    profile: mergedProfile
  })
  // 不再直接 localStorage.setItem（见 Step 3）

  // 上传本地独有 + 本地更新的记录
  const toUpload = [...localOnly, ...localNewer]
  if (toUpload.length > 0) {
    addLog(`上传${toUpload.length}条本地记录`, 'success')
    const result = await uploadLocalRecords(user.id, toUpload)
    if (!result.success) {
      throw new Error('上传本地记录失败')
    }
  }

  // ...
}
```

#### Step 3：移除 `smartMerge` 中直接 `localStorage.setItem` 调用

**文件**：`hooks/useSync.ts` line 677-679

删除以下 3 行（它们绕过 `useLocalStorage` hook，可能导致 React state 和 localStorage 不同步）：

```typescript
// 删除：
localStorage.setItem('ashtanga_records', JSON.stringify(mergedRecords))
localStorage.setItem('ashtanga_options', JSON.stringify(mergedOptions))
```

数据持久化统一走 `onSyncComplete` → `clearAllData + importData` → `useLocalStorage` 的 `set` 函数。

#### Step 4：验证

| 场景 | 预期 |
|------|------|
| 该用户下次打开 app | 不再出现冲突弹窗 |
| 智能合并后重新打开 | 本地 38 条，云端 38 条，无冲突 |
| 其他用户正常同步 | 不受影响 |
| 只有本地变更 → 上传 | 正常上传（原有逻辑不受影响） |
| 只有云端变更 → 下载 | 正常下载（原有逻辑不受影响） |

### 涉及文件

| 文件 | 改动 |
|------|------|
| `lib/sync-utils.ts` | 新建 — 4 个纯函数（diffRecords/buildProfileFromRemote/mergeRecords/mergeOptions） |
| `hooks/useSync.ts` | 6 处内联逻辑替换为导入函数调用（autoSync×4 + smartMerge×1 + resolveConflict×1） |
| `__tests__/sync-utils.test.ts` | 新建 — 25 个单元测试 |

### 风险评估

- **风险**：低。改动集中在 `smartMerge` 和 `resolveConflict` 的 merge 分支，不影响其他同步路径（仅本地变更 / 仅云端变更 / 数据一致）
- **回滚**：单一提交，可一键 revert
- **影响范围**：所有遇到"双方都有变更"冲突的用户，不影响正常同步流程

---

## 2026-05-22 - Tab 级代码分割（性能优化第二期）⏳ 待观察

**状态**: 等第一期优化上线后观察效果再决定

### 背景
第一期已完成：删除 recharts/html2canvas、12 个弹窗懒加载、字体优化（预计减少初始 JS ~400-500KB）。

### 待做内容
`practice/page.tsx` 中以下大型内联组件仍在初始 bundle 中，可进一步拆分为独立文件 + `dynamic()` 懒加载：

| 组件 | 行数 | 说明 |
|------|------|------|
| StatsTab | ~410 行 | 统计页，只在用户点"我的数据"标签时才需要 |
| JournalTab | ~520 行 | 日记页，包含分享/编辑/补录等，只在"日记"标签时才需要 |
| SettingsModal | ~560 行 | 设置页，只在用户点设置时才需要 |

### 风险
- 涉及大量 props 传递和状态管理，6800 行文件的拆分有中高风险
- 需要仔细处理共享状态（计时器状态、同步状态、用户信息等）

### 推进条件
- Vercel Speed Insights 数据显示 LCP > 2.5 秒
- 或者首屏 JS 仍超过 500KB

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
- [ ] 发出第 1 条邀请
- [ ] 完成第 1 次访谈
- [ ] 完成第 10 次访谈
- [ ] 完成全部 36 次

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

