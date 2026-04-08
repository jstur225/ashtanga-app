# 待处理问题

## 2026-04-08 - 练习选项同步重构（固定槽位系统）🚧 评审完成

### ✅ 架构评审结论

| 决策项 | 选择 | 说明 |
|--------|------|------|
| 数据库迁移 | 两步迁移 | ① 先添加 nullable 字段 ② 迁移数据 ③ 添加约束 |
| 部署策略 | 分阶段 | 阶段1改上传（所有实际槽位），阶段2改下载，降低风险 |
| 超量处理 | 需处理 | 现有用户可能有4-7个选项，迁移时分配到 slot 1-10 |
| 类型复用 | 从 supabase 导入 | PracticeOption 类型统一从 lib/supabase.ts 导出 |
| Pro降级 | 保留可编辑 | 超出的槽位可正常使用，删除后不可恢复超出部分 |

### 🔧 常量定义

```typescript
// lib/constants.ts
export const SLOT_CONFIG = {
  DEFAULT_VISIBLE: 3,      // 默认可见：一序列Mysore/Led、半序列
  DEFAULT_HIDDEN: 1,       // 默认1个隐藏空槽（给用户自定义）
  MAX_FREE: 4,             // 普通用户上限
  MAX_PRO: 10,             // Pro用户上限
  TOTAL_DEFAULT_SLOTS: 4,  // 新用户自动创建的槽位数
} as const;
```

**说明：**
- 普通用户最多 4 个槽位（3个默认可见 + 1个空槽）
- Pro 用户可解锁到 10 个槽位
- 现有用户可能已经创建 4-7 个选项（因为之前限制是 7 个），迁移时需分配到 slot 1-10
- 迁移时不足 4 个的用户，补全到 4 槽（3默认 + 1空槽）
- **注意：** "新用户注册" = "游客绑定邮箱"，两者是同一流程

### 📋 执行步骤（评审后）

#### Step 1: 数据库迁移 ⏳ 待执行

**迁移脚本（分两步）：**

```sql
-- 第1步：添加 nullable 字段
ALTER TABLE practice_options
  ADD COLUMN slot_index INTEGER,
  ADD COLUMN visible BOOLEAN DEFAULT true,
  ADD COLUMN is_default BOOLEAN DEFAULT false,
  ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;

-- 第2步：迁移现有数据（为每个用户分配 slot_index 1-10）
-- 按 user_id 分组，按 created_at 排序分配槽位
-- 现有用户可能有 4-7 个选项，全部分配到 1-10

-- 第3步：为没有选项的用户创建4个默认槽位

-- 第4步：添加约束（数据迁移完成后）
ALTER TABLE practice_options
  ALTER COLUMN slot_index SET NOT NULL;

CREATE UNIQUE INDEX idx_user_slot ON practice_options(user_id, slot_index);
```

**注意事项：**
- 现有用户可能已经创建 4-7 个选项（之前限制 7 个），迁移时需分配 slot_index 1-10
- Pro 用户最多支持到 10 槽，普通用户 4 槽（但现有超出的保留）
- 迁移时需为每个用户的现有选项分配槽位，不足 4 个的补全到 4 个默认槽

#### Step 2: 阶段1 - 修改上传逻辑 ⏳ 待执行

**目标：** 上传时发送所有实际槽位（4-10个，含 visible=false 的）

**修改文件：** `hooks/useSync.ts`

```typescript
// 当前代码（第918-924行）
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

**验证：** 部署后检查 Supabase 日志，确认上传了所有槽位（4-10条）

#### Step 3: 阶段2 - 修改下载逻辑 ⏳ 待执行

**目标：** 下载时接收云端所有槽位，按 slot_index 排序

**修改文件：** `hooks/useSync.ts` - `downloadRemoteData`

```typescript
// 下载云端选项（已按 slot_index 排序）
const { data: optionsData } = await supabase
  .from(TABLES.PRACTICE_OPTIONS)
  .select('*')
  .eq('user_id', userId)
  .order('slot_index', { ascending: true });

// 云端返回的是用户的所有槽位（4-10个）
// 如果为空（旧用户未迁移），返回空数组让本地逻辑处理
const slots = optionsData || [];
```

**验证：** 新设备登录后，检查本地 storage 中有正确数量的选项

#### Step 4: 本地逻辑修改 ⏳ 待执行

**修改文件：** `hooks/usePracticeData.ts`

1. **删除本地 PracticeOption 接口定义**，改为从 supabase.ts 导入
2. **DEFAULT_OPTIONS** 改为4个默认槽位
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
   - 本地默认3个选项 → slot 1-3
   - 本地自定义选项 → slot 4-N（按 created_at 排序）
   - 不足4槽的，创建空槽补全

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
  const defaultLabels = ['一序列 Mysore', '一序列 Led class', '半序列 站立+休息'];
  const visibleOptions = localOptions.filter(o => o.visible);
  const customOptions = visibleOptions.filter(o =>
    !defaultLabels.includes(`${o.label} ${o.notes}`)
  );

  // 构建槽位数据
  const slotsToCreate = [
    { slot_index: 1, label: '一序列', notes: 'Mysore', visible: true, is_default: true },
    { slot_index: 2, label: '一序列', notes: 'Led class', visible: true, is_default: true },
    { slot_index: 3, label: '半序列', notes: '站立+休息', visible: true, is_default: true },
    // 自定义选项
    ...customOptions.map((opt, idx) => ({
      slot_index: 4 + idx,
      label: opt.label,
      notes: opt.notes,
      visible: true,
      is_default: false,
    })),
  ];

  // 补全到4槽
  while (slotsToCreate.length < 4) {
    slotsToCreate.push({
      slot_index: slotsToCreate.length + 1,
      label: '',
      notes: '',
      visible: false,
      is_default: false,
    });
  }

  // 插入云端（限制最多10槽）
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
- [ ] **新用户注册/绑定：** 游客绑定邮箱后，本地选项正确迁移到云端槽位（3默认+自定义→slot 1-N）
- [ ] **添加选项：** 复用空槽，普通用户最多4个，Pro用户最多10个
- [ ] **删除选项：** 标记为 visible=false，不物理删除，可复用
- [ ] **同步验证：** 上传所有槽位（4-10个），下载完整覆盖
- [ ] **新设备登录：** 能看到完整的3个默认选项（一序列Mysore/Led、半序列）+ 1个空槽
- [ ] **降级场景：** Pro用户降级后，仍上传全部槽位（保留数据），但前端限制不能新建超出4槽

#### Step 8: 数据迁移脚本（一次性）⏳ 待执行

```typescript
// scripts/migrate-to-slots.ts
// 1. 查询所有有选项的用户
// 2. 按 user_id 分组，按 created_at 排序分配 slot_index 1-10
//    - 现有用户可能有 4-7 个选项（之前限制7个），全部分配到 1-10
//    - 超出10个的（理论上不可能，但做兜底）：只保留前10个
// 3. 不足4个的，补全到4槽（3个默认 + 1个空槽）
// 4. 更新所有记录的 visible=true, is_default=!is_custom
```

**迁移策略：**
- **目标：** 已有云端账户的老用户（部署前已注册用户）
- **普通用户（4-7个选项）**：全部分配 slot 1-N（N=实际数量），全部 visible=true
- **Pro用户（可能4-10个）**：同上，最多到 slot 10
- **新用户（注册后）**：已在 Step 5 处理（注册/绑定流程自动创建）

### ❌ 不做（NOT in Scope）

| 功能 | 不做原因 |
|------|---------|
| 超过10槽（如18槽高级会员） | 当前Pro只到10，后续再扩展 |
| 槽位拖拽排序 | 复杂度较高，当前按 created_at 足够 |
| 选项分类/分组 | 超出当前需求 |
| 迁移脚本UI | 一次性脚本，命令行足够 |

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
3. **Day 3：** 部署阶段1（修改上传逻辑，上传所有实际槽位）
4. **Day 4：** 验证上传正常，部署阶段2（修改下载逻辑 + 注册/绑定流程创建槽位）
5. **Day 5：** 验证新设备同步和游客绑定迁移正常，完成

**状态：** ✅ 评审完成，等待执行

---

---

## 2026-04-02 - 照片上传功能修复 ✅ 已完成

### ✅ 已完成：照片上传 RECORD_NOT_FOUND 修复

**完成时间：** 2026-04-02

**问题：**
- 完成练习后在编辑页面上传照片失败
- 错误码：`RECORD_NOT_FOUND`
- 原因：草稿记录未及时同步到云端

**修复内容：**
- ✅ CompletionSheet 创建草稿后立即触发同步
- ✅ 修复重复创建记录问题
- ✅ 修复时光轴排序错乱问题

**涉及文件：**
- `app/practice/page.tsx`
- `hooks/usePracticeData.ts`

---

## 2026-03-31 - 照片上传限制功能 ✅ 已完成

### ✅ 已完成：照片上传限制功能

**完成时间：** 2026-04-01

**实现内容：**
- ✅ 后端 API 限制：`app/api/photos/route.ts` 检查 `is_pro` 和邮箱绑定
- ✅ 前端权限控制：`components/PracticeForm.tsx` 传入 user 信息
- ✅ 提示信息："当前版本只能上传1张照片"、"绑定邮箱后可使用照片功能"
- ✅ 延迟删除：删除照片时本地标记，保存时批量执行（避免3-5秒等待）
- ✅ 数据同步：加载记录时从数据库查询真实照片状态
- ✅ 删除后上传：上传前先执行待删除，避免空间不足问题

**涉及文件：**
- `app/api/photos/route.ts`
- `app/api/oss-signature/route.ts`
- `components/PracticeForm.tsx`
- `lib/oss.ts`
- `app/practice/page.tsx`

**状态：** ✅ 代码已推送 master2 分支，测试完成，准备部署生产环境

---

## 2026-03-27 - 新功能需求与设计优化

### ✅ 已完成：编辑记录页面照片布局优化（3张以上横向滑动）

**完成时间：** 2026-03-27

**实现内容：**
- 照片 ≤ 3 张：九宫格布局（3列网格）
- 照片 > 3 张：横向滑动布局（flex + overflow-x-auto，固定 96x96px 大小）
- 减少页面高度，提升编辑体验

**涉及文件：**
- `components/PracticeForm.tsx`

---

### ✅ 已完成：照片上传/删除交互反馈优化

**完成时间：** 2026-03-27

**实现内容：**
- 上传：点击相机按钮立即显示"读取中"占位符，解决选择照片时的卡顿感
- 删除：添加点击动效（scale + spin），提供即时视觉反馈
- 占位符样式：灰色虚线边框，淡雅风格
- 超过3张照片时自动切换为横向滑动布局

**涉及文件：**
- `components/PracticeForm.tsx`
- `components/PhotoUpload/PhotoPreview.tsx`

---

### 📌 待设计：底部导航栏样式更新

**需求描述：**
- 重新设计底部导航栏（Tab1/Tab2/Tab3 切换区域）的视觉样式
- **设计方案：悬浮胶囊样式**
  - 固定宽度胶囊容器（约屏幕80%，居中悬浮）
  - 圆角设计（rounded-full 或 rounded-2xl）
  - 选中项有背景高亮块（主色/20透明度）
  - 图标+文字垂直排列，选中时整体高亮
  - 点击切换，不需要滑动
- 视觉参考：智能家居类App的底部导航（如米家App风格）

**涉及文件：**
- `app/practice/page.tsx`

**优先级：** 下周开发

---

### ✅ 已完成：日历下方增加本月统计卡片

**完成时间：** 2026-04-08

**实现内容：**
- 在 MonthlyHeatmap 组件中添加 `MonthlyStatsCard` 子组件
- 显示本月练习天数、总时长(分钟)、平均时长三个维度
- 样式：浅绿色背景卡片，三列等分布局，中间有分隔线
- 与现有统计页面形成互补（统计页显示累计，卡片显示本月）

**涉及文件：**
- `app/practice/page.tsx` - 新增 `MonthlyStatsCard` 组件，在日历下方渲染

---

### ✅ 已完成：日历切换月份时同步筛选记录列表

**完成时间：** 2026-04-08

**实现内容：**
- MonthlyHeatmap 添加 `onMonthChange` 回调，切换月份时通知父组件
- JournalTab 添加 `viewMonth` 状态，跟踪当前查看的月份
- 记录列表根据 `viewMonth` 筛选当月记录
- 排序方式保持倒序（最晚的练习在最上方）

**涉及文件：**
- `app/practice/page.tsx` - JournalTab 和 MonthlyHeatmap 组件

---

### 📌 待开发：日历上方增加自定义标注功能（生理期/事件标记）

**需求描述：**
- 在日历上方增加一个图标入口
- 点击图标弹出标注弹窗，支持选择：
  - 颜色标记（如红色、蓝色等）
  - 事件类型（如生理期、旅行、生病等）
  - 日期范围
- 在日历上以颜色/图标形式显示标记

**背景与用途：**
- 最初目的：快速记录生理期，解释某天没有练习的原因
- 拓展方向：通用自定义标注系统
- 用户场景：旅行、生病、生理期、休息日等各种未练习原因的标记

**功能规格：**
- 预设默认事件：生理期（用户可修改名称和颜色）
- 支持自定义事件类型（文字 + 颜色）
- 支持选择日期范围进行批量标注
- 数量限制：
  - 免费用户：最多 1 个自定义标注类型
  - 付费用户：最多 9 个自定义标注类型

**商业模式关联：**
- 可作为 Pro 功能的一部分（增加付费转化点）

**涉及文件：**
- `app/practice/page.tsx`（日历组件区域）
- 新增：`components/MarkEventModal.tsx` 或类似组件

---

### 📌 待开发：全屏编辑功能

**需求描述：**
- 编辑记录页面支持全屏模式
- 更大的编辑区域，提升长文本和照片编辑体验
- 可能通过点击展开按钮或手势进入全屏

**涉及文件：**
- `components/PracticeForm.tsx`
- `app/practice/page.tsx`（编辑弹窗区域）

---

## 2026-03-25 - 照片上传功能优化

### ✅ 已修复：删除照片仍有延迟感

**修复内容：**
- `PhotoPreview.tsx`: 添加 `e.preventDefault()` 和 `e.stopPropagation()` 阻止事件冒泡，添加 `onMouseDown` 阻止默认行为
- `PhotoUploader.tsx`: 将 `await deletePhoto()` 改为 `.catch()` 异步处理，确保 UI 更新不阻塞

**修复时间：** 2026-03-26

---

### ❌ ~~待修复：删除照片仍有延迟感~~

**问题描述：**
- 删除照片操作仍有延迟感（需进一步排查原因）

**相关文件：**
- `components/PhotoUpload/PhotoPreview.tsx`

**已完成功能：**
- ✅ 解除9张照片限制（后端/API/前端已统一支持）
- ✅ 多选上传（支持一次选多张，并发上传）
- ✅ 照片上传进度条（占位图中间显示，无数字）
- ✅ 照片增删不自动保存（点击保存时一起提交）

---

## 2026-03-22 - PracticeForm 提取与弹窗改造

### ✅ 已完成：提取 PracticeForm 公共组件

**背景：**
工程评审结论要求提取公共表单组件，减少 3 个弹窗（EditRecordModal、AddPracticeModal、CompletionSheet）的重复代码。

**实施策略：**
- 草稿记录清理：取消时立即删除（2A）
- 实施顺序：分阶段（3B）

**阶段计划：**
- [x] Phase 1: EditRecordModal 改造
- [x] Phase 2: 移除自定义练习功能
- [x] Phase 3: AddPracticeModal 改造（含预创建草稿）
- [x] Phase 4: CompletionSheet 改造（含预创建草稿）
- [x] Phase 5: 最终验证

**完成时间：** 2026-03-22
**主要提交：** `7861b4a` refactor: extract PracticeForm component and simplify modals

**详细计划：** `.claude/plans/dazzling-knitting-pie.md`

---

## 2026-02-10

### ✅ 已修复：AccountBindingSection 弹窗滚动问题

**修复内容：**
- 退出登录确认弹窗：添加 `max-h-[calc(100vh-2rem)] overflow-y-auto` 支持滚动
- 修改密码弹窗：已有滚动支持，无需修改

**修复时间：** 2026-03-26

---

### ❌ ~~待修复：AccountBindingSection 弹窗滚动问题~~

**问题描述：**
- 账户与同步弹窗内部的子弹窗（退出登录、修改密码、设备登录提醒）存在滚动问题
- 当前尝试使用 Portal + 滚动锁定后，弹窗下方无法滚动
- 弹窗应该跟父容器（账户与同步弹窗）在同一层级，但不能固定背景滚动

**问题分析：**
1. AccountBindingSection 在 SettingsModal/AccountSyncModal 内部（都是 fixed 容器）
2. 子弹窗需要相对于视口 fixed 定位，而不是相对于父容器
3. 当前方案：使用 Portal 渲染到 document.body + 滚动锁定
4. 问题：滚动锁定后，弹窗本身也无法滚动了

**正确的结构参考：**
```
page.tsx (根级别)
└── AccountSyncModal (fixed, z-50)
    └── AccountBindingSection
        └── 子弹窗需要：fixed 相对于视口，z-index 高于 AccountSyncModal
```

**需要修复的弹窗：**
- 退出登录确认弹窗
- 修改密码弹窗
- 设备登录提醒弹窗

**文件位置：**
- `components/AccountBindingSection.tsx`

---

### ✅ 已修复：弹窗背景色统一为 bg-card

**问题：** 多个弹窗使用 `bg-white` 而非 `bg-card`，导致暗黑模式下样式不一致

**修复文件：**
- ✅ `components/AuthModal.tsx` - 第499行
- ✅ `components/DataConflictModal.tsx` - 第45行、第176行
- ✅ `components/AccountBindingSection.tsx` - 第285行、第351行、第614行
- ✅ `app/practice/page.tsx` - 第4164行（清空数据弹窗）

**修改内容：** `bg-white` → `bg-card`

---

### ✅ 已修复：弹窗缺少底部内边距 pb-10

**问题：** 退出登录、修改密码、设备登录提醒弹窗缺少 `pb-10`，导致内容紧贴底部

**修复文件：**
- ✅ `components/AccountBindingSection.tsx` - 3处弹窗添加 `pb-10`

---

### ✅ 已修复：忘记密码验证码类型不匹配

**问题：** 忘记密码流程中，验证码类型不匹配导致验证失败

**原因：**
- 发送验证码时：`type: 'reset_password'`
- 验证验证码时：缺少 type 参数，使用默认的 `type: 'email_verification'`

**修复文件：**
- ✅ `components/AuthModal.tsx` - 第372行添加 `type: 'reset_password'`

---

## 2026-02-10

### ✅ 已解决：Supabase 注册504超时问题

**问题分析过程：**

#### 1. 问题现象
- 用户注册时填写验证码后，请求超时（504 Gateway Timeout）
- 验证码功能正常（说明 Resend API 工作正常）
- 注册流程在启用邮箱确认时超时

#### 2. 根本原因定位
通过对比两条邮件发送路径：
- **验证码路径**（正常）：`自定义 API → Resend HTTP API` ✅ 快速成功
- **注册路径**（超时）：`代码 → Supabase Auth → Custom SMTP (Resend)` ❌ 超时

**关键发现：Supabase Auth 使用 SMTP 协议（非 HTTP API）**

#### 3. SMTP 配置问题
检查 Supabase Dashboard SMTP Settings：
- ❌ **SMTP Port 配置错误**：`466` （不存在的端口）
- ✅ 正确端口应该是：`587` 或 `2525`

**错误流程：**
```
Supabase 尝试连接 smtp.resend.com:466
→ 连接失败（端口不存在）
→ 一直等待...（60秒超时）
→ 返回 504 Gateway Timeout
```

#### 4. 修复步骤
1. 登录 Supabase Dashboard：https://supabase.com/dashboard/project/xojbgxvwgvjanxsowqik/auth/settings
2. 找到 SMTP Settings 部分
3. 将 **SMTP Port** 从 `466` 改为 `587`
4. 点击 "Save changes" 保存

**修复后的配置：**
| 配置项 | 值 | 状态 |
|--------|---|------|
| Host | smtp.resend.com | ✅ |
| Port | 587 | ✅ 已修复 |
| Username | resend | ✅ |
| Password | re_4VQ2Bnpn_Ei3fYAKgrRf478buu15eVy77 | ✅ |
| Sender Email | noreply@ash.ashtangalife.online | ✅ |
| Sender Name | 熬汤日记 | ✅ |

#### 5. 附带修复：编译错误
修复过程中发现 `components/AuthModal.tsx` 有语法错误：
- 问题：第238行有多余的 `}`，破坏了 `try-catch-finally` 结构
- 修复：删除多余的闭合大括号

#### 6. 当前状态
- ✅ SMTP Port 已修复（587）
- ✅ 语法错误已修复
- ✅ 本地服务器运行正常（端口 3001）
- ⏳ 待测试：注册功能是否正常

#### 7. 测试访问地址
**本地开发服务器：**
- 电脑访问：http://localhost:3001
- 手机访问：http://192.168.1.16:3001（需在同一 Wi-Fi）

**测试步骤：**
1. 打开注册页面
2. 填写邮箱和密码
3. 填写验证码
4. 点击注册
5. 预期：3-5秒内完成，收到确认邮件

#### 8. 技术总结
**为什么验证码正常但注册超时？**
- 验证码：直接调用 Resend **HTTP API**（快速）
- 注册：Supabase Auth 内部通过 **SMTP 协议**发送（慢）

**SMTP vs HTTP API：**
| 方式 | 速度 | 说明 |
|------|------|------|
| HTTP API | 快 | 直接 POST 请求 |
| SMTP 协议 | 慢 | 需要 TCP 握手、SMTP 握手、邮件传输 |

**端口配置错误的影响：**
- Port 466：非标准端口，无法连接
- Port 587：标准 SMTP Submission 端口（TLS/STARTTLS）
- Port 2525：Resend 备用端口

#### 9. 相关文件
- `lib/supabase.ts` - Supabase 客户端配置（120秒超时）
- `hooks/useAuth.ts` - 注册逻辑（60秒超时）
- `components/AuthModal.tsx` - 注册 UI（已修复语法错误）

---

## 2026-01-27

### 📌 待办：准备突破日圆点 PNG 图标

**用途**：
- 突破日的橙色圆点标记（右上角小圆点）

**尺寸要求**：
- **显示尺寸**：6px × 6px（Tailwind: `w-1.5 h-1.5`）
- **建议 PNG 尺寸**：**32px × 32px** 或 **64px × 64px**（高清，代码中会自动缩放）
- **格式**：PNG（支持透明背景）
- **颜色**：橙色 `#E07724`（或金黄色渐变）

**存放位置**：
- 文件名：`breakthrough-dot.png`
- 路径：`public/breakthrough-dot.png`

**参考位置**：
- 主日历视图（Tab2 觉察日记）
- 时间线视图（每个记录的圆点标记）

---

## 已完成

### 2026-01-27
- ✅ **修复日历颜色显示问题**
  - 修复 `breakthrough` 字段判断（`!!record?.breakthrough`）
  - 统一主日历和编辑日历的样式
  - 实现毛玻璃渐变 + 主色边框设计
  - 休息日：黄色 (#FEDB5E) 边框 + 淡黄色渐变
  - 突破日：橙色 (#E07724) 边框 + 淡橙色渐变
- ✅ **修复 Vercel 自动部署**
  - 问题根源：Vercel 的 "Require Verified Commits" 导致未签名的 commit 部署被取消
  - 解决方案：在 Vercel Dashboard → Settings → Git 关闭该选项
  - Webhook 实际上是正常工作的
- ✅ 更新版本历史至 v1.0.1

### 2026-01-26
- ✅ 添加"开始练习"按钮到落地页
- ✅ 更新README v1.0.0正式版文档
- ✅ 移除README开源相关内容
