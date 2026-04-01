# 待处理问题

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

### 📌 待开发：日历下方增加本月统计卡片

**需求描述：**
- 在 Tab2 觉察日记页面，日历下方增加本月统计卡片
- 显示本月练习天数、总时长、平均时长等维度
- 与现有统计页面形成互补（统计页显示累计，卡片显示本月）

**涉及文件：**
- `app/practice/page.tsx`（StatsTab 或 JournalTab 区域）

---

### 📌 待开发：日历切换月份时同步筛选记录列表

**需求描述：**
- 日历左右切换月份时，下方记录列表同步筛选显示当月记录
- 排序方式：倒序（最晚的练习在最上方）
- 例如：切换到2月份时，显示2月28日→2月1日的记录

**涉及文件：**
- `app/practice/page.tsx`（JournalTab 组件）

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
