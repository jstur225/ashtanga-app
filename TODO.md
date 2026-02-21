# 待处理问题

## 2026-02-10

### ❌ 待修复：AccountBindingSection 弹窗滚动问题

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
