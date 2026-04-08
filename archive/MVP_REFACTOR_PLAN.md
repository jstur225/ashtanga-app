# MVP 重构技术实施文档 (Markdown)

**Role**: Senior Full-Stack Architect & Product Manager  
**Date**: 2026-01-20  
**Status**: Draft  

---

## 1. 需求分析 (Requirement Analysis)

本次重构旨在将 App 转变为**“纯本地、无后端、极简版”**，以验证 MVP。核心变动如下：

1.  **🔪 移除图片功能**: 
    *   隐藏所有图片上传/展示入口。
    *   **UI优化**: 缩小日志时间轴的字号，减少因移除图片留下的空白间距，使排版更紧凑。
2.  **🔓 移除登录体系**:
    *   移除 Supabase Auth 相关逻辑。
    *   **UI优化**: 在设置页中隐藏“账号绑定”入口。
    *   采用 **UUID** 作为用户匿名唯一标识，存储于 LocalStorage。
3.  **🗳️ 假门测试 (Fake Door Testing)**:
    *   **Cloud Sync (云同步)**:
        *   入口：顶部云图标。
        *   **图标逻辑**: 默认显示红色。用户点击“投票”后，图标变为绿色（持久化状态）。
        *   交互：点击触发 Modal，文案“云端同步和上传照片（高级版）”，收集投票。
    *   **Pro Features (会员)**:
        *   入口：用户昵称旁的 "Pro" 图标。
        *   交互：点击不再跳转页面，而是弹出 Modal。
        *   **内容**: 展示权益（云同步、照片日记、进阶分析）。
        *   **逻辑**: 显示“已有 342 人投票”。点击“我也想要” -> 数字+1，按钮变绿，触发埋点 `click_vote_pro_features`。
4.  **💾 数据存储降级**:
    *   弃用 Supabase Client，改用 **Browser LocalStorage**。
    *   **热力图修复**: 确保统计页面的热力图正确关联本地存储的真实打卡数据。
5.  **⏱️ 计时器与交互优化**:
    *   **后台保活**: 修复倒计时在锁屏/后台不准的问题（改用 Timestamp Diff 机制）。
    *   **状态持久化**: 将 `startTime` 和 `isPracticing` 存入 LocalStorage。即使页面刷新，也能恢复计时状态。
        *   *注*: 此数据量极小（几十字节），完全不会影响 5MB 的存储上限。练习结束后即清除。
    *   **UI细节**: 
        *   添加秒级显示（右下角小字）以提示运行状态。
        *   主按钮缩小 30%，暂停/结束按钮上移 20%（适配移动端浏览器底部栏）。
    *   **防误触**: 增加“结束”按钮的防抖保护，防止重复提交。
    *   **反馈机制**: 提交成功后弹出 Toast（区分“打卡成功”和“补卡成功”）。
6.  **📝 记录录入优化**:
    *   **布局调整**: “练习时长”输入框缩短，与“解锁突破”开关并排显示。
    *   **交互逻辑**: 仅当开启“解锁突破”时，展开输入框。
7.  **📤 数据兜底 (Import/Export)**:
    *   新增数据导出（JSON 到剪贴板）和导入功能，防止数据丢失。
8.  **🕵️ 接入埋点**:
    *   集成 **Mixpanel**，追踪关键行为。
    *   **Token**: 暂时使用占位符 `YOUR_MIXPANEL_TOKEN`，后续在 `.env` 中配置。

---

## 2. 技术方案 (Technical Solution)

### 2.1 架构调整
*   **模式**: 从 Next.js SSR/Client Hybrid 转变为 **Pure Client-Side Rendering (CSR)**。
*   **数据流**: Component -> Custom Hooks -> LocalStorage。
*   **状态管理**: 使用 React Hooks (`useState`, `useEffect`) 配合 LocalStorage 实现持久化。

### 2.2 数据结构设计 (LocalStorage Keys)
严格遵循原 Supabase Table 结构，采用 Snake Case 命名，确保未来迁移兼容性。

| Key | Description | Storage Format |
| :--- | :--- | :--- |
| `ashtanga_uuid` | 用户唯一标识 | String (UUID v4) |
| `ashtanga_profile` | 用户信息 | JSON Object (对应 `user_profiles`) |
| `ashtanga_records` | 练习记录 | JSON Array (对应 `practice_records`) |
| `ashtanga_options` | 练习选项 | JSON Array (对应 `practice_options`) |

#### 📊 详细 Schema 定义

**1. `practice_records` (练习记录)**
> 注意：本地化后 `id` 调整为 `string` (UUID) 以支持离线生成。

```typescript
interface PracticeRecord {
  id: string;           // ⚠️ 变动: LocalStorage 使用 UUID，原 Supabase 为 number
  created_at: string;   // ISO 8601
  date: string;         // YYYY-MM-DD
  type: string;         // 关联 practice_options.label (英文)
  duration: number;     // 秒 (Seconds)
  notes: string;
  photos: string[];     // ⚠️ 变动: 始终存为空数组 []
  breakthrough?: string;
}
```

**2. `practice_options` (练习选项)**
> 包含默认选项 + 用户自定义选项。

```typescript
interface PracticeOption {
  id: string;           // ⚠️ 变动: 使用 UUID
  created_at: string;
  label: string;        // 英文标签 (Key)
  label_zh: string;     // 中文标签
  notes?: string;
  is_custom: boolean;
}
```
*默认数据预设*:
```json
[
  { "id": "uuid-1", "label": "Primary Series", "label_zh": "初级序列", "is_custom": false },
  { "id": "uuid-2", "label": "Mysore Style", "label_zh": "迈索尔风格", "is_custom": false },
  { "id": "uuid-3", "label": "Led Class", "label_zh": "领课", "is_custom": false }
]
```

**3. `user_profiles` (用户信息)**

```typescript
interface UserProfile {
  id: string;           // UUID (与 ashtanga_uuid 一致)
  created_at: string;
  name: string;
  signature: string;
  avatar: string | null;
  phone?: string;       // 留空
  email?: string;       // 留空
  is_pro: boolean;      // 默认为 false
}
```

### 2.4 假门测试持久化逻辑 (Persistence for Fake Doors)
采用“方案 A”，即基于 LocalStorage 的前端伪同步逻辑。

| 功能 | LocalStorage Key | 初始状态 (False) | 投票后状态 (True) |
| :--- | :--- | :--- | :--- |
| **云同步** | `voted_cloud_sync` | 图标红色 | 图标绿色 |
| **Pro 会员** | `voted_pro_features` | 显示 342 票 | 显示 343 票，按钮变绿并禁用 |

#### 🧠 心理学文案微调 (妈妈测试原则)
*   **云同步弹窗**: 
    *   **标题**: ☁️ 云端同步和上传照片（高级版）
    *   **正文**: "害怕 **数据丢失**？云端备份功能（支持多设备同步）正在开发中。投一票，上线第一时间通知您。"
*   **Pro 会员弹窗**: 
    *   **正文**: "同学你是怎么样的？让您的阿斯汤加练习更进一步。"

#### ⚙️ 状态管理细则
1.  **独立存储**: 两个 Key `voted_cloud_sync` 和 `voted_pro_features` 互不影响。
2.  **持久化变色**: 页面初始化时读取 LocalStorage，根据值实时渲染图标颜色和按钮状态。
3.  **互不影响**: 确保点击云同步投票不会导致 Pro 弹窗状态改变，反之亦然，以便分别统计需求。
4.  **埋点**: 仅在状态从 `false` 变为 `true` 的瞬间触发一次 Mixpanel 事件。

---

## 3. 文件修改清单 (File Modification List)

### 3.1 新增文件 (New Files)

1.  **`lib/analytics.ts`**
    *   **功能**: 封装 Mixpanel 初始化和埋点方法。
    *   **方法**: `initAnalytics()`, `trackEvent(name, props)`。

2.  **`hooks/usePracticeData.ts`**
    *   **功能**: 数据层核心 Hook，替代 Supabase 查询。
    *   **API**:
        *   `records`: 数据列表。
        *   `addRecord(record)`: 新增记录。
        *   `updateRecord(id, data)`: 更新记录。
        *   `deleteRecord(id)`: 删除记录。
        *   `exportData()`: 导出 JSON。
        *   `importData(json)`: 导入 JSON。

3.  **`components/CloudSyncModal.tsx`**
    *   **功能**: 统一的“假门测试”弹窗组件 (Fake Door)。
    *   **Props**: 
        *   `type`: 'cloud' | 'pro' (区分云同步和Pro会员)
        *   `isOpen`: boolean
        *   `onClose`: () => void
    *   **UI 内容 (Pro 模式)**:
        *   **标题**: "解锁专业版 (Pro Features)"
        *   **副标题**: "让您的阿斯汤加练习更进一步。"
        *   **功能列表**: 
            *   ☁️ 云端数据同步 (永久保存，多设备同步)
            *   📸 体式照片日记 (视觉化记录你的进步)
            *   📊 进阶数据分析 (查看长周期趋势)
        *   **底部状态**: "功能开发中... 已有 342 人投票期待上线。"
    *   **交互逻辑**:
        *   **主按钮**: “我想要！(Vote +1)” -> 触发埋点 `click_vote_pro_features` -> 数字+1 -> 按钮变绿 -> 提示 Toast。
        *   **次按钮**: “暂不需要” -> 触发埋点-> 直接关闭弹窗。

### 3.2 修改文件 (Modified Files)

1.  **`package.json`**
    *   **Action**: 安装依赖 `npm install uuid mixpanel-browser`。

2.  **`lib/supabase.ts` & `lib/database.ts` & `lib/storage.ts`**
    *   **Action**: 标记为 Deprecated (已弃用)。
    *   **Details**: 可以在文件顶部添加注释，或者暂时注释掉导出，防止误用。

3.  **`app/layout.tsx`**
    *   **Action**: 全局初始化。
    *   **Logic**:
        *   `useEffect` 中检查 `localStorage.getItem('ashtanga_uuid')`，不存在则生成。
        *   初始化 Mixpanel: `initAnalytics()`。
        *   触发埋点: `trackEvent('app_open', { uuid })`。

4.  **`app/page.tsx` (Main Logic)**
    *   **Action**: 替换数据源 & UI 调整。
    *   **Details**:
        移除所有 `supabase` 相关引用。

        *   引入 `usePracticeData` 获取和操作数据。

        *   **Header**:

            *   修改“云同步”按钮点击事件 -> 打开 `CloudSyncModal`。

            *   **图标状态**: 根据 `has_voted` 状态切换颜色 (Red -> Green)。

        *   **Add/Edit Modal**:

            *   移除图片上传区域 (UI隐藏)。

            *   **表单优化**: “时长”与“突破”开关并排；输入框按需展开。

            *   **提交反馈**: 增加防抖，成功后 Toast 提示。

            *   保存逻辑改为调用 hook 的 `addRecord`/`updateRecord`。

        *   **Timeline UI**:

            *   缩小时间/内容字号。

            *   减少 Item 间距 (Padding/Margin)。

        *   **Timer UI**:

            *   **主按钮**: `scale-75` (缩小30%)。

            *   **控制按钮**: `mb-20` (上移，增加底部边距)。

            *   **显示**: 增加秒数小字。

            *   **逻辑**: 改用 `Date.now()` 计算差值。

        *    **Settings Modal**:

            *   **数据管理区 (UI已存在)**:

                *   接入真实逻辑。

                *   **导出**: 实现 `handleExport`，将数据写入剪贴板。

                *   **导入**: 为现有“导入数据”按钮添加文件选择功能 (Hidden Input)，并实现解析覆盖逻辑。

5.  **`types/index.ts` (如有)**
    *   确保 TypeScript 类型定义能覆盖 LocalStorage 的数据结构。

---

## 4. 执行步骤 (Execution Steps)

1.  **环境准备**: 安装 `uuid`, `mixpanel-browser`。
2.  **基础设施**: 创建 `lib/analytics.ts` 和 `hooks/usePracticeData.ts`。
3.  **UI 改造**:
    *   实现 `CloudSyncModal`。
    *   修改 `app/page.tsx` 移除 Supabase 依赖，接入 LocalStorage。
    *   隐藏图片入口。
    *   实现导入/导出。
4.  **验证**: 测试数据增删改查、数据持久化、埋点触发。
