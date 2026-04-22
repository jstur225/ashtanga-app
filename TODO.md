# 待处理问题

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

### 功能概要
把练习选项网格的第一行（3 个位置）改成固定功能卡片，不占用户自定义选项的名额：

| 位置 | 功能 | 说明 |
|------|------|------|
| 第1个 | 唱诵开关 | 倒计时 → 播放唱诵 → 开始练习计时 |
| 第2个 | 口令跟练 | 把现有 guided_audio 预设挪到固定栏 |
| 第3个 | 今日练习人数 | 数据已就绪（daily_user_activity），后续接入显示 |

### 第1个：唱诵开关

**流程**：
```
点击开始练习 → 倒计时（免费1分钟，Pro可自定义）→ 播放 /audio/opening-chant.mp3 → 唱诵结束 → 开始练习计时
```

**免费用户**：
- 开/关切换
- 开启后，开始练习时先倒计时60秒，然后播放唱诵

**Pro 会员**：
- 开/关切换
- 双击弹出底部 sheet 滚动选择器，自定义倒计时时长（分钟+秒）
- 唱诵音频：`/audio/opening-chant.mp3`（1.1MB，已就绪）

### 第2个：口令跟练
- 把现有 `guided_audio` 预设从选项列表移到固定栏第2格
- 口令播放逻辑不变，只改渲染位置

### 第3个：今日练习人数
- 占位符，图标 + 文字"今日练习"
- 数据已就绪（`daily_user_activity` 表 + heartbeat API 已上线）
- 后续接入显示即可

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
