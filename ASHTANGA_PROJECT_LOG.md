# 阿斯汤加打卡 app - 项目记录

## 2026-06-03: 颜色同步修复 + 色阶选择器优化

### 问题 1：颜色同步不生效
旧记录的 `color_level` 上传到云端后全部显示为默认值 3。根因：
1. `uploadLocalRecords` 和 `uploadLocalData` 未携带 `color_level` 字段
2. `diffRecords` 只比较 ID 和 `updated_at`，不比较 `color_level`，导致已上传的记录即使色阶不同也不会重传

### 修复
1. **uploadLocalRecords/uploadLocalData**：补齐 `color_level` 字段，记录无色阶时回退到选项默认色阶再默认 3
2. **diff 前检测色阶差异**：同步时对比本地和云端的 `color_level`，不同则更新本地 `updated_at`，让 `diffRecords` 自然检测为 localNewer 触发重传

### 问题 2：选项色阶选择器 5 级 → 4 级
EditOptionModal 颜色选择器仍显示 `[1,2,3,4,5]`，改为 `[1,2,3,4]`

### 问题 3：UI 微调
- 选中颜色框改为橙色（`ring-orange-400`）替代黑色
- 4 号色阶加深（`#2D5A27` → `#1A3D1A`）
- 热力图空白日灰色圆点减淡（`stone-200` → `stone-100`）

### 涉及文件
- `hooks/useSync.ts` — 颜色上传 + 同步检测
- `app/practice/page.tsx` — 色阶选择器5→4级、热力图灰色减淡
- `components/PracticeForm.tsx` — 选中颜色框橙色
- `app/globals.css` — 4号色阶加深

## 2026-06-03: 云端孤立草稿导致同步死循环（最终修复）

### 背景
用户（烧冰冰）每次打开 app 都看到"数据冲突"弹窗（本地 35 条，云端 38 条），选智能合并后下次刷新仍然弹出。6/2 修复了 smartMerge 的 localNewer/remoteNewer 处理和 localStorage 双写问题（commit `94f2152`），但 6/3 用户反馈问题依旧。

### 根因分析
调试日志中找到 3 条 `type: "草稿"` 的云端记录（来自 4/29 和 5/22，取消练习时上传到云端但未清理）：

```
下载 3 条云端记录 → useEffect 过滤草稿 → localStorage 只剩 35 条
→ 下次 sync 检测到 remoteOnly=3 + localNewer=1 → 冲突
→ 智能合并下载 3 条 → 页面刷新 → useEffect 再过滤 → 循环
```

### 修复
1. **数据清理**：Supabase 执行 `DELETE FROM practice_records WHERE type = '草稿' AND deleted_at IS NULL`，清理 18 个用户共 18 条孤立草稿
2. **代码修复**：`downloadRemoteData` 记录查询加 `.neq('type', '草稿')`，防止草稿进入同步流程

### 涉及文件
- `hooks/useSync.ts` — downloadRemoteData 查询加 `.neq('type', '草稿')`

## 2026-06-02: 同步模块纯函数提取 + 测试

### 背景
`hooks/useSync.ts`（1300+ 行）是整个应用最复杂的 hook，核心逻辑（diff 计算、合并策略、profile 构建）全部内嵌在闭包里，无法测试。同时存在 DRY 违规 —— 同样的 diff/merge 逻辑在 `autoSync` 和 `resolveConflict` 中重复实现。

### 改动
提取 4 个纯函数到 `lib/sync-utils.ts`：
- `diffRecords` — 对比本地/云端记录，按 ID 和时间戳分为 4 类
- `buildProfileFromRemote` — 从远端 profile 构建完整对象，缺字段用默认值填充
- `mergeRecords` — 合并记录（基础 + 追加 + 覆盖）
- `mergeOptions` — 合并选项，保留本地字段（is_preset/audio_src/can_edit）

`hooks/useSync.ts` 中 6 处内联逻辑替换为导入函数调用。新增 25 个单元测试（`__tests__/sync-utils.test.ts`）。

### 同时修复
TODO 中"智能合并死循环"Step 1：`resolveConflict` 的 merge 分支现在用 `diffRecords()` 计算 4 种差异，不再丢失 `localNewer/remoteNewer`。

### 涉及文件
- `lib/sync-utils.ts` — 新建
- `__tests__/sync-utils.test.ts` — 新建
- `hooks/useSync.ts` — 6 处替换（net -115 行）
- `TODO.md` — Step 1 标记完成

## 2026-05-15: 匿名练习埋点

### 背景
`daily_user_activity` 表只记录了设备打开 app 的情况，但无法知道这些设备是否完成了练习。未绑定用户的练习数据存在 localStorage，不落库。

### 实现

1. **新 API** `POST /api/stats/record-practice`
   - 接收 `{ uuid }`，在 `daily_user_activity` 表中设置 `has_practiced = true`（幂等 upsert）
   - 无论是否绑定邮箱，保存练习记录时都调用

2. **数据库变更**
   - `daily_user_activity` 表新增 `has_practiced` 列（boolean, default false）
   - 手动在 Supabase 控制台执行

3. **前端改动**
   - `handleSavePractice` 中调用新 API（`.catch(() => {})` 静默失败）
   - `/api/stats/today` 改为返回已绑定练习次数 + 无绑定练习设备数的总和

4. **运营脚本**
   - `fetch_app_data.js` 新增 `practicedDevices` 指标读取
   - 飞书字段更新为：练习人数（已绑定）、练习人数（无绑定）、总练习次数

### 涉及文件
- `app/api/stats/record-practice/route.ts` — 新建
- `app/api/stats/today/route.ts` — 改为返回总和
- `app/practice/page.tsx` — handleSavePractice 调用新 API
- `xiaohongshu内容运营/fetch_app_data.js` — 新增 practicedDevices 指标

## 2026-05-20: 同步数据安全修复

### 背景
用户 didosheng@163.com（空知）反馈 4 月 8 日的练习觉察内容丢失。
经 debug log 分析，根因是 sync 冲突处理导致本地空白数据覆盖云端有内容的记录。

### 根因
1. **5/13 同步冲突**：用户重新登录后，本地 localStorage 只有 1 条记录，云端 58 条
2. **冲突弹窗解决**：用户选择上传本地数据后，云端数据未下载到本地
3. **5/16 批量上传**：61 条本地记录（含 4 月 8 日空白记录）通过 `upsert` 覆盖云端
4. `upsert` 按 ID 匹配，直接用本地的空 `notes` 字段覆盖了云端原有内容

### 修复
- `hooks/useSync.ts` — 在 `uploadLocalRecords` 和 `uploadLocalData` 两个上传函数中新增**安全合并逻辑**
- 上传前先查询云端已有记录，逐字段对比：
  - 如果本地 `notes` 为空或默认文案（"今日练习完成"），但云端有内容 → 保留云端
  - 如果本地 `breakthrough` 为空但云端有 → 保留云端
  - 如果本地没有照片但云端有 → 保留云端
- 合并失败不影响上传流程（静默降级为直接上传）

### 涉及文件
- `hooks/useSync.ts` — uploadLocalRecords 和 uploadLocalData 函数新增安全合并逻辑

### 提交记录
- `95d4028` - feat: 今日练习人数统计包含无绑定设备
- `a7285a5` - feat: 匿名用户练习埋点 - 新增 record-practice API + 前端调用

---

## 2026-05-09: 用户回访计划

### 背景
微信加了 36 个用户，计划做一对一文字回访，收集真实反馈，指导产品迭代方向。

### 回访话术
核心：真诚关心 + 明确价值 + 低门槛。以"感谢支持 + 上线 3 个月 + 想听真实想法"切入，邀请 20 分钟文字/语音交流。

### 访谈结构（20 分钟）
1. **工具反馈（5min）**：最大的帮助？哪里不好用？最想优化什么？
2. **练习现状（10min）**：练习顺不顺利？遇到困难怎么解决？最不方便的地方？
3. **未来可能（5min）**：理想的解决方案？社群/约练感兴趣吗？

### 关键原则
- 一次只问一个问题，不长篇大论
- 先充分理解需求，再提方案，不急着推销
- 聊完立刻标注洞察
- 完成比完美重要，先发第一条

### 执行
- 从最可能友好回复的用户开始
- 目标：完成 36 次对话
- 记录每次访谈的关键洞察

---

## 2026-05-08: 数据快照

### App 运营数据
| 指标 | 数值 |
|------|------|
| 累计设备 | 217 |
| 累计注册用户 | 81 |
| 日活跃（登录） | ~36 |
| 收入 | ¥0 |

### 渠道
- 小红书店铺链接已恢复
- 百度收录已提交（5/9），1-2 周出结果

### 待验证
- Pro 试用 62 天到期（7 月），观察续费转化率
- 小红书 9 篇稿子排期 5/9-5/15，恢复发布频率

---

## 2026-05-07: 商业状态更新

### 渠道变动
- 小红书店铺链接已恢复，恢复正常售卖渠道
- 闲鱼 + 小红书个人售卖（私信发链接）方式停止

---

## 2026-04-29: 商业状态 + 技术改动

### 商业状态（2026-04-29 快照）
**当前阶段**：会员系统刚上线，商业模式未验证
- 1500 用户，DAU ~40，月新增 ~240
- ¥1 体验卡是获客手段不是收入，季卡 ¥19.8 / 年卡 ¥68.8 尚无成交
- **关键瓶颈**：邮箱绑定率仅 4%（~63/1500），未绑定 = 无法激活 Pro
- 5.1 前绑定送 62 天 Pro，之后送 31 天
- **2 个月验证计划**（5-7 月）：盯 Pro 到期后续费转化率
- **商业诊断结论**：从未有过真正收入；渠道是运营问题不是生死问题；「找新项目」是心理逃避

### 技术改动
- **Tab2 绑定邮箱提醒条**：金色(#C1A268)可点击，`!user` 条件渲染，点击触发 onOpenFakeDoor，5.1后需手动删除文案
- **公告弹窗 v4**：新群链接 ZH9565、新图片 xhs-join-group2.jpg、文案去掉"被禁言"
- **觉察笔记全屏编辑**：纸质纹理背景，flex自适应高度
- 公告弹窗组件：`components/XiaohongshuInviteModal.tsx`，版本号 INVITE_VERSION 控制红点显示

---

## 2026-04-22: 全站统计追踪 + 生产优化 ✅

**类型**: 新功能 + 优化

**状态**: 已推送

### 变更内容

1. **全站统计追踪** — 新建 `daily_user_activity` 表 + `POST /api/stats/heartbeat` API，每次打开 app 记录一行（每用户每天只写一次），标记新设备 `is_new`
2. **生产构建移除 console** — `next.config.mjs` 改为 `removeConsole: process.env.NODE_ENV === 'production'`
3. **激活码外键优化** — `user_memberships.activated_by_code_id` 改为 `ON DELETE SET NULL`，删码不再影响会员权益
4. **正式激活码** — 生成月卡（31天）/季卡（90天）/年卡（365天）各 10 个
5. **落地页文案** — "无功能上的限制" → "全平台能用"
6. **激活成功弹窗** — 去掉卡片类型小字行

### 提交记录
- `a7af1b7` - feat: 全站统计追踪 + 生产优化

---

## 2026-04-17: 绑定邮箱赠送 31 天 Pro 会员 ✅

**类型**: 新功能

**状态**: 已推送

### 功能需求
新用户绑定邮箱后自动发放 31 天 Pro 会员（type='trial'），作为绑定 incentive。

### 实现内容

#### 1. `lib/membership-utils.ts` — 新建共享函数
- 提取 `ensureProfileAndGetId(supabase, user)` 从 `activate/route.ts`
- 查询 `user_profiles`，不存在则创建
- 返回 `profileId`

#### 2. `app/api/auth/register/route.ts` — 注册后自动赠送
- 在 `signUp` 成功后插入 31 天 trial 会员
- 防重复检查：已有会员记录则跳过
- 优雅处理：赠送失败不影响注册流程

#### 3. `app/api/membership/activate/route.ts` — 重构
- 使用 `ensureProfileAndGetId()` 替代内联代码
- 删除约 90 行重复逻辑

#### 4. `lib/supabase.ts` — 类型扩展
- `UserMembership.type`: 添加 `'trial'`
- `UserMembershipStatus.membership_type`: 添加 `'trial'`

#### 5. `components/AuthModal.tsx` — 前端文案
- 注册成功 toast：「绑定成功，已自动登录」+ 描述「🎉 已赠送 31 天 Pro 会员」
- 注册表单引导文案：「🎁 绑定邮箱即享 31 天 Pro 会员」（金色）

#### 6. `app/practice/page.tsx` — 注册后刷新
- `onAuthSuccess` 回调添加 `refreshMembership()`
- 避免显示旧账号缓存数据

### 提交记录
- `38ea823` - fix: 注册/登录后刷新会员状态
- `89c056e` - style: Pro 会员提示左对齐
- `83bb09c` - style: 优化绑定邮箱页面文案布局
- `16ec701` - feat: 绑定邮箱赠送 31 天 Pro 会员

---

# 阿斯汤加打卡app - 项目记录

## 2026-04-17: 头像云端存储 + 同步修复 ✅

**类型**: Bug 修复

**状态**: 已推送，待部署验证

### 问题描述
1. **头像无法跨设备同步** — 设备 A 上传头像后，设备 B 登录仍显示默认头像
2. **冲突解决时头像丢失** — 用户选择"使用云端数据"时头像被硬编码为 null
3. **未登录用户可点击上传** — 应提前拦截而非选完照片后提示

### 修复内容

#### `hooks/useSync.ts`
- **问题**: `resolveConflict` 中构建 `remoteProfile` 时 `avatar: null`
- **修复**: 改为 `avatar: remoteData.profile?.avatar || null`
- **新增**: 调试日志帮助追踪头像同步流程

#### `app/practice/page.tsx`
- **问题**: `handleAvatarUpload` 只在上传时检查邮箱
- **修复**: 按钮点击时立即检查，未绑定邮箱直接提示，避免用户先选照片
- **问题**: 头像上传成功只更新本地 state
- **修复**: 上传成功后调用 `onSave()` 触发 profile 同步

### 提交记录
- `18a831c` - fix: 修复头像同步失败
- `2c73e5f` - fix: 头像上传自动保存，未登录点击提醒

---

## 2026-04-16: 移除未完成的槽位系统代码 ✅

**类型**: 代码清理

**状态**: 已推送

### 问题
槽位系统（slot system）是重构计划，但部分代码已混入主分支，导致：
1. 删除的选项重新出现（`visible: false` 逻辑不完整）
2. 选项显示混乱

### 修复
- 移除所有 `visible` 字段相关代码
- `deleteOption` 改为真实删除而非标记隐藏
- 恢复简单直接的选项管理逻辑

### 提交记录
- `f716764` - fix: 删除选项后不再重复出现，移除未完成的槽位系统代码

---

## 2026-04-15: 照片上传会员判断修复 ✅

**类型**: Bug 修复

**状态**: 已部署，待测试验证

### 问题描述
会员用户（519216978@qq.com）上传照片时仍提示"当前版本只能上传1张照片"

### 修复内容

#### 后端修复
- **文件**: `app/api/photos/route.ts`
- **问题**: 直接使用 `user.id` 查询会员状态，但视图 `user_membership_status` 的 `user_id` 字段实际是 `user_profiles.id`
- **修复**: 先查询 `user_profiles` 获取 `profile.id`，再用它查询会员状态

#### 前端修复
- **文件**: `components/PracticeForm.tsx`
- **问题**: 使用 `user?.is_pro` 判断会员，但 Supabase auth user 没有这个字段
- **修复**: 引入 `useMembership()` hook 获取真实会员状态
- **变更**: 移除 `user?.is_pro` 相关代码，统一使用 `membership?.is_active`

#### 数据获取优化
- **文件**: `app/practice/page.tsx`
- **优化**: `useMembership()` 只在父组件调用一次，通过 props 传递给 `StatsTab`
- **效果**: Tab 切换不再重新加载会员数据

### 待测试验证
- [ ] 会员用户可上传最多9张照片
- [ ] 非会员用户限制为1张照片
- [ ] Tab 切换时会员状态显示正确

### 提交记录
- `a4099fc` - 修复照片上传会员判断：使用真实会员状态
- `a6d8c2b` - 优化会员状态数据获取：避免每次切换Tab重新加载
- `7aab042` - 更新 TODO，记录照片上传会员功能修复

---

## 2026-04-14: 会员系统核心功能完成 ✅

**类型**: 新功能开发

**状态**: 核心功能已完成并部署，Bug 已修复

### 完成内容

#### 1. 数据库表结构
- 创建 `activation_codes` 表（激活码池）
- 创建 `user_memberships` 表（会员记录）
- 创建 `user_membership_status` 视图（实时查询会员状态）
- 添加 `email` 字段到 `user_memberships` 表（方便管理员查询）

#### 2. API 接口
- `POST /api/membership/activate` - 激活码校验与激活
- `GET /api/membership/status` - 查询当前会员状态
- 支持续费逻辑（未到期再激活，从原到期日顺延）
- 修复外键关联问题（使用 `user_profiles.id` 而非 `auth.users.id`）

#### 3. 前端功能
- **设置页** (`app/settings/page.tsx`):
  - 会员卡片显示（Pro 状态、有效期、天数剩余）
  - 「购买会员」按钮（跳转占位链接）
  - 「激活会员」按钮（打开激活弹窗）
  - 样式符合设计规范（金色配色 `#C1A268`、圆角 `20px`、衬线字体）
  - 返回按钮跳转 Tab3（`?tab=stats`）

- **激活弹窗** (`components/Membership/ActivateModal.tsx`):
  - 自动格式化输入（XXXX-XXXX-XXXX）
  - 激活码格式校验
  - 错误提示（无效码、已使用、过期）
  - 成功状态显示（有效期、类型、天数）
  - 样式符合设计规范（金色渐变、米色背景）

- **Tab3 会员显示** (`app/practice/page.tsx`):
  - 头像下方显示会员状态
  - Pro 用户：显示「有效期至：YYYY.MM.DD」
  - 免费用户：显示「升级 Pro」提示
  - 支持 URL 参数切换 Tab（`?tab=stats`）

### 已知问题（已修复 ✅）

**Bug**: 激活成功后界面仍显示「免费用户」
- **状态**: ✅ 已修复（2026-04-15）
- **修复方案**: 优化数据获取逻辑，`useMembership()` 只在父组件调用一次，通过 props 传递给子组件
- **效果**: Tab 切换不再重新加载会员数据，激活成功后状态正确显示

### 涉及文件
- `app/api/membership/activate/route.ts`
- `app/api/membership/status/route.ts`
- `app/settings/page.tsx`
- `components/Membership/ActivateModal.tsx`
- `app/practice/page.tsx`
- `hooks/useMembership.ts`

### 提交记录
- `fe69f27` - fix: 激活弹窗样式规范化，设置页返回跳转Tab3
- `c588f79` - fix: 添加缺失的导入，完善会员系统UI设计规范

---

## 2026-04-12: 定价策略确定 ✅

**类型**: 商业模式决策

### 定价方案

| 选项 | 价格 | 话术 |
|------|------|------|
| **季度会员** | ¥19.8 | 一杯奶茶钱，试一个季度 |
| **年度会员** | ¥68.8 | 半年瑜伽课钱，练一整年（比季度省¥10.4） |

### 免费版 vs 付费版功能对比

| 功能 | 免费版 | 付费版 |
|------|--------|--------|
| 历史记录查看 | ✅ 全部 | ✅ 全部 |
| 打卡计时 | ✅ 可用 | ✅ 可用 |
| 数据导出 | ✅ 可用 | ✅ 可用 |
| 照片上传 | ❌ 仅1张/条 | ✅ 最多9张/条 |
| 日历自定义标注 | ❌ 仅1个类型 | ✅ 最多9个类型 |
| 自定义练习选项 | ✅ 基础4个 | ✅ 最多10个 |

### 决策说明

- 不限制历史记录时间（3个月限制取消）
- 通过功能数量区分免费/付费
- 季度和年付给用户选择权
- 年付折扣约13%， incentivize 长期订阅

---

## 2026-04-10: Tab2 统计卡片新增连续熬汤周数 ✅

**类型**: 功能增强

### 功能描述
日历下方的本月统计卡片新增「连续熬汤周数」指标，帮助用户了解练习的连贯性。

### 特性
- 统计逻辑：从当前周往前检查，每周只要有练习即计入连续周
- 中断即重置：中间有任何一周未练习，连续周数归零
- 显示位置：统计卡片第4列，数字使用橙色高亮
- 文案：连续熬汤(周)

---

## 2026-04-09: 月度统计分享卡片功能 ✅

**类型**: 新功能

### 功能描述
新增月度统计分享卡片，用户可以将本月练习数据生成精美的分享图片。

### 特性
- 810×1080px 高清分享图
- 深绿色主题配色（与日历圆点一致）
- 包含：年份月份、累计熬汤时长、日历圆点、呼吸/光合作用数据
- 底部显示用户信息和"熬汤日记"品牌
- 支持一键保存图片到本地

### 技术实现
- 响应式布局：展示时适配屏幕，导出时为高清大图
- 使用 html-to-image 库生成图片
- 导出内容隐藏在屏幕外，截图时临时展开

---

## 2026-04-02: Tab2 排序问题彻底修复 ✅

**类型**: Bug 修复

### 问题描述
Tab2（觉察日记）时光轴记录排序错乱，旧记录也出现顺序错位。

### 根因分析（3个问题）

**问题1（严重）: 排序检查逻辑错误**
- 位置: `hooks/usePracticeData.ts` 第195-199行
- 代码: `const sortedRecords = parsedRecords.sort(...)`
- 原因: `sort()` 原地排序，返回原数组引用。`sortedRecords` 和 `parsedRecords` 是同一对象，比较永远无变化
- 结果: `hasChanges` 永远为 `false`，排序后数据永不保存

**问题2（严重）: 草稿清理与排序逻辑冲突**
- 位置: `hooks/usePracticeData.ts` 第186-204行
- 流程:
  1. 清理草稿 → 设置状态为 cleanedRecords
  2. 对原始 parsedRecords（含草稿）排序
  3. 用含草稿的 sortedRecords 覆盖状态
- 结果: 草稿被重新写回 localStorage，数据污染

**问题3（缺失）: JournalTab 无排序保障**
- 位置: `app/practice/page.tsx` JournalTab 第2566行
- 代码: `practiceHistory.filter(r => r.type !== '草稿').map(...)`
- 原因: 仅过滤草稿，未按日期排序
- 结果: 如果传入数据未排序，显示错乱

### 修复方案

**修复1: usePracticeData.ts 初始化逻辑重写**
- 使用 `[...cleanedRecords]` 创建副本再排序，避免原地排序
- 统一处理草稿清理和排序，避免逻辑冲突
- 正确检测变化（草稿清理或顺序调整）

**修复2: JournalTab 添加排序保障**
- 过滤后添加 `.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())`
- 确保无论传入数据是否排序，显示始终正确

### 涉及文件
- `hooks/usePracticeData.ts` - 重写初始化排序逻辑
- `app/practice/page.tsx` - JournalTab 添加排序

---

## 2026-04-02: 照片上传修复 + 重复记录修复 + 排序修复 ✅

**类型**: Bug 修复

### 1. 完成练习后照片上传失败 (RECORD_NOT_FOUND)
**问题**: 完成练习后在编辑页面上传照片提示 "记录不存在"

**原因**:
- 完成练习创建的是本地草稿记录
- 草稿未及时同步到云端数据库
- 上传照片时后端查不到记录

**解决方案**:
- `CompletionSheet` 创建草稿后立即触发同步
- 添加 `autoSync` prop 传递同步函数
- 只有绑定邮箱的用户才执行同步

### 2. 重复创建记录
**问题**: 完成练习保存后，Tab2 出现两条记录（一条空白，一条有内容）

**原因**:
- `CompletionSheet` 的 `handleSave` 调用了 `updateRecord` 后又调用 `handleSavePractice`
- `handleSavePractice` 又执行 `addRecord` 创建新记录

**解决方案**:
- `CompletionSheet` 不再调用 `handleSavePractice`
- 改为调用 `onClose` 关闭弹窗
- 添加 `onClose` prop 处理弹窗关闭逻辑

### 3. 时光轴记录排序错乱
**问题**: 新创建的记录有时排在时光轴最后

**原因**: `usePracticeData` 初始化时未对记录排序

**解决方案**: 初始化时检查并按日期倒序排序

**涉及文件**:
- `app/practice/page.tsx` - CompletionSheet 同步逻辑、重复记录修复
- `hooks/usePracticeData.ts` - 初始化排序

**提交**: `master2` 分支
- `aa431db` fix: 初始化时对记录按日期排序
- `e86a185` fix: CompletionSheet 创建草稿后立即触发同步
- `a2b8d5b` fix: 修复完成练习重复创建记录的问题
- `0c2c481` fix: 添加调试日志，修复 handleSavePractice 闭包问题
- `41f1efd` fix: 完成练习后触发同步

---

## 2026-04-01: 照片功能完善 + 延迟删除 + UI优化 ✅

**类型**: 功能完善 + 体验优化

### 1. 延迟删除照片功能
**问题**: 删除照片时需要等待3-5秒API响应，用户体验差

**解决方案**:
- 删除时仅本地标记，立即从UI移除
- 保存记录时批量执行真正的删除操作
- 上传新照片前先执行待删除，腾出空间

**涉及文件**:
- `components/PracticeForm.tsx` - `useRecordPhotos` Hook重构

### 2. 前后端照片数据同步
**问题**: 前端显示与后端数据库状态不一致

**解决方案**:
- 组件加载时从数据库查询真实照片状态
- 使用 `getRecordPhotos` 获取最新数据

### 3. Tab2觉察内容样式优化
**改进**:
- 觉察内容两端对齐 (`text-justify`)
- 右边距从 `pr-6` 增加到 `pr-8` (24px → 32px)

### 4. 觉察输入框布局调整
**改进**:
- 左右边距一致 (`px-4`)
- 按钮覆盖在文字上，不预留额外空间

**提交**: `master2` 分支
- `1aa8aeb` feat: 延迟删除照片功能
- `7e77900` fix: 前后端照片数据不一致
- `f7cb66f` fix: 删除后立即上传失败问题
- `0f32146` style: 觉察输入框文字对齐
- `5494606` style: 调整输入框右内边距
- `19eb87d` style: 觉察输入框左右边距一致
- `1ca44e9` style: Tab2觉察内容两端对齐
- `0631849` style: Tab2右边距 pr-6 -> pr-8
- `4fbe602` fix: 添加缺失的PhotoUploadButton导入

---

## 2026-03-27: 简化新用户默认记录文案 ✅

**类型**: 体验优化

**变更**:
- 将新用户的默认教程记录文案从长篇功能说明简化为简洁提示

**原文案**:
```
👋 同学你好，欢迎使用熬汤日记！
功能说明：
📱 Tab1 - 今日练习
...
```

**新文案**:
```
🔴特别提醒
👈点击左侧日期区域，可编辑或删除记录

🌟Mysore，让我们找回到自我的锚点🌟
```

**提交**: `cd2cfa4` (master), `c156803` (master2)

---

## 2026-03-27: 删除默认休息日练习选项 ✅

**类型**: 体验优化

**变更**:
- 从 `DEFAULT_OPTIONS` 中移除 id 为 '6' 的"休息日"选项
- 默认练习选项从 6 个减少到 5 个

**原因**:
- 用户反馈显示该选项几乎无人使用
- 保持练习选项的精简性

**提交**: `4679b1c` (master), `3ee5768` (master2)

---

## 2026-03-24: 照片删除修复 + React 无限循环修复 ✅

**类型**: Bug 修复

### 1. 编辑记录删除照片失败修复
**问题**: 点击删除照片时提示失败，API 返回 404

**原因**: 编辑记录时照片的 ID 是本地生成的 `photo-${index}`，不是数据库真实 ID

**修复**:
- 修改 `deletePhoto` 函数，支持通过 `practice_record_id` + `oss_url` 查找真实 ID
- 新增 `getRecordPhotos` 查询，通过 Supabase REST API 获取真实 photo ID
- 再用真实 ID 调用原有删除接口

```ts
// 本地 ID 时先查询真实 ID
if (photoId.startsWith('photo-') && practiceRecordId && ossUrl) {
  const photos = await fetch(`${SUPABASE_URL}/rest/v1/photos?...`)
  realPhotoId = photos[0].id
}
// 使用真实 ID 删除
await fetch(`/api/photos/${realPhotoId}`, { method: 'PATCH', ... })
```

### 2. React Error #185 无限循环修复
**问题**: 打开编辑记录或上传照片后出现 Application error

**原因**: `PracticeForm` 中的 `useEffect` 在照片变化时调用 `onPhotosChange`，触发父组件更新，形成无限循环

**修复**:
- 添加 `isInitialMount` 标记，跳过初始化时的回调
- 添加 `prevPhotosRef` 比较，只有真正变化时才通知父组件

```ts
const isInitialMount = useRef(true)
useEffect(() => {
  if (isInitialMount.current) {
    isInitialMount.current = false
    return
  }
  // 只有真正变化时才通知
  if (hasChanged) onPhotosChange(photoUrls)
}, [photos])
```

### 3. 时光轴图片预览样式优化
**改进**: 统一编辑记录和时光轴的图片预览样式
- 背景: `bg-black/60 backdrop-blur-sm`（半透明毛玻璃）
- 添加关闭按钮（右上角黑色半透明圆圈）

### 4. 时光轴照片展示优化
**改进**: 根据照片数量调整布局
- 1 张照片：宽度 90%，高度自适应原图比例
- 2 张及以上：九宫格（3列），正方形小图

**提交记录**:
- `2f39e94` - fix: 添加缺失的 cn 导入
- `b01f005` - fix: 修复照片上传导致的无限循环错误
- `7217d0d` - fix: 修复编辑记录弹窗自动显示更新成功的问题
- `9f31b8a` - fix: 删除照片时通过 Supabase API 查找真实 photo ID

---

## 2026-03-23: 觉察错位修复 + 时光轴照片展示 ✅

**类型**: Bug 修复与功能增强

### 1. 觉察记录数据错位修复
**问题**: 点击不同记录的"觉察记录"，第一次点击为空，之后数据显示有延迟/错位

**原因**: `PracticeForm` 中的 `hasInitialized` ref 在组件生命周期内只初始化一次，关闭弹窗后不会重置

**修复**: 增加 `prevInitialDataRef` 跟踪上一次数据，通过比较 notes/date/type 检测新记录

```tsx
const isNewRecord = prevInitialDataRef.current?.notes !== initialData?.notes
  || prevInitialDataRef.current?.date !== initialData?.date
  || prevInitialDataRef.current?.type !== initialData?.type

if (initialData && (!hasInitialized.current || isNewRecord)) {
  // 强制更新数据
}
```

### 2. 照片秒开显示优化
**问题**: 切换记录时照片仍需等待 API 加载

**修复**: 移除 `useRecordPhotos` 的 API 加载逻辑，改用 `useEffect` 监听 `initialPhotos` 直接更新
- 父组件传入 `record.photos`（URL 数组）
- 子组件通过 `convertUrlsToPhotos` 转换为 Photo 对象立即显示

### 3. 上传按钮提示修复
**问题**: 有照片后点击上传按钮无反应（disabled 状态）

**修复**: 移除 disabled 限制，点击时主动提示"当前版本只能上传1张照片"

### 4. 时光轴照片展示（新功能）
**需求**: 在时光轴（ShareCardModal）觉察文字下方展示照片

**实现**:
- 位置：觉察文字下方，宽度 90% 居中
- 布局：
  - 1 张照片：正方形固定宽度（192px），居中
  - 2 张以上：九宫格（3列），每张正方形
- 预留：支持最多 9 张照片的展示逻辑

**影响文件**:
- `components/PracticeForm.tsx` - 数据错位修复、URL 转 Photo、秒开显示
- `app/practice/page.tsx` - 时光轴照片展示

### 提交记录
- `3058320` - fix: 修复觉察记录数据错位和照片占位符问题
- `281556a` - fix: 照片秒开显示 + 上传按钮提示
- `2cdaf85` - feat: 修复照片显示并添加时光轴照片展示
- `de2e2bf` - style: 时光轴照片展示布局调整（1张固定宽度，2张以上九宫格）

---

## 2026-03-23: 照片上传限制修改 + 性能优化 ✅

**类型**: 功能调整与性能优化

### 1. 照片上传限制变更
- **之前**: 每天只能上传1张照片（日限额）
- **之后**: 每条记录只能上传1张照片，取消每日限制
- **影响文件**:
  - `app/api/photos/route.ts` - 移除日限额检查
  - `app/api/oss-signature/route.ts` - 移除日限额检查
  - `app/api/photos/can-upload/route.ts` - **已删除**
  - `components/PhotoUpload/PhotoUploader.tsx` - 移除 canUpload 状态
  - `components/PhotoUpload/PhotoUploadButton.tsx` - 更新提示文案
  - `lib/oss.ts` - 删除 canUploadToday，添加 ERROR_MESSAGES 常量
  - `components/PracticeForm.tsx` - 更新错误映射

### 2. 文件大小限制提升
- 从 5MB 提升到 10MB

### 3. 文案统一
- 记录已有照片: "当前版本只能上传1张照片"
- 未登录: "上传照片需绑定邮箱"
- 文件过大: "上传照片不可大于10m"

### 4. 照片秒开性能优化
**问题**: 编辑记录时照片加载有 1-2 秒卡顿

**方案演进**:
1. 先尝试 `hasPhotos` 预判显示占位符 - 仍有延迟
2. **最终方案**: 父组件直接传入 `initialPhotos`，子组件直接使用

**关键改动**:
```tsx
// 父组件
<PracticeForm initialPhotos={record.photos || []} />

// PracticeForm - 直接使用，无需二次请求
const [photos, setPhotos] = useState(initialPhotos || [])
```

**效果**: 打开编辑页面 → 照片**秒开显示**，零等待

### 5. 觉察输入修复
- 修复 `initialData` 变化导致输入被重置的问题
- 添加 `hasInitialized` ref 确保只初始化一次

### 提交记录
- `4d2458e` - feat: 照片上传限制从每日1张改为每记录1张
- `5f40755` - chore: 删除已废弃的 can-upload API 端点
- `e375937` - fix: 觉察文字无法输入的问题
- `a2ac158` - fix: 照片加载占位符立即显示
- `a408a43` - perf: 照片秒开显示，消除加载卡顿

---

## 2026-03-22: PracticeForm 提取与弹窗改造 ✅

**类型**: 代码重构与架构优化

### 背景与目标
`app/practice/page.tsx` 共 5369 行，包含 3 个表单弹窗（EditRecordModal、AddPracticeModal、CompletionSheet），有大量重复代码。本次重构提取公共组件，减少 ~1400 行代码。

### 已完成改造

#### 1. PracticeForm 公共组件
- 提取 `components/PracticeForm.tsx` 作为统一表单组件
- 支持受控/非受控模式（date/type 可外部控制）
- 支持字段可编辑性配置（dateEditable/typeEditable/durationEditable）
- 统一照片上传、展示、删除功能

#### 2. 三个弹窗统一使用 PracticeForm
| 弹窗 | 改造前 | 改造后 |
|-----|--------|--------|
| EditRecordModal | ~395 行 | ~100 行 |
| AddPracticeModal | ~400 行 | ~150 行 |
| CompletionSheet | ~200 行 | ~80 行 |

#### 3. 草稿记录模式
- AddPracticeModal 和 CompletionSheet 采用「预创建草稿记录」方案
- 打开弹窗时自动创建 type='草稿' 的记录，获得 record_id 用于照片上传
- 保存时更新为正式记录，取消时删除草稿
- 用户无感知，体验流畅

#### 4. 移除的功能
- 删除「自定义练习」功能（无实际使用场景）
- 删除 CustomPracticeModal 组件
- 清理相关状态管理和逻辑

### 代码优化亮点
- **消除重复**: notes/breakthrough 状态管理、formatDateDisplay 函数、突破输入 UI 不再重复
- **统一体验**: 三个弹窗的照片上传体验完全一致
- **性能优化**: 使用 `hasPhotos` 预判控制加载占位符显示

### 关键提交
- `7861b4a` - refactor: extract PracticeForm component and simplify modals
- `7a31ffb` - feat: enable real photo upload in all three modals
- `6941e9d` - feat: implement draft record pattern - transparent to users
- `4bcfb4f` - fix: use hasPhotos prop to control loading placeholder

---

## 2026-03-21: 照片上传功能完整修复 ✅

**类型**: 功能完善与 Bug 修复

### 已完成功能

#### 1. 照片上传功能（v1.0 正式发布）
- ✅ 编辑记录页面支持上传练习照片
- ✅ 阿里云 OSS 预签名 URL 上传（安全高效）
- ✅ 每日限额 1 张（内测期间临时调整为 10 张）
- ✅ 照片 Lightbox 放大查看（支持原图比例、超长图滚动）
- ✅ 照片删除功能（软删除，可重新上传）

**技术实现**:
- 前端：React + Next.js Image 组件
- 存储：阿里云 OSS（上海节点）
- 数据库：Supabase photos 表（含软删除标记）
- 安全：RLS 策略 + SECURITY DEFINER RPC 函数

#### 2. 关键 Bug 修复

**问题1：照片查询不返回数据**
- **原因**: Supabase RLS 策略 `auth.uid() = user_id` 在 service role 环境下 `auth.uid()` 为 null
- **解决**: 使用 `get_record_photos_debug` RPC 函数（SECURITY DEFINER 绕过 RLS）

**问题2：照片删除不生效**
- **原因**: 直接 UPDATE 被 RLS 阻止
- **解决**: 使用 `soft_delete_photo` RPC 函数执行软删除

**问题3：照片显示不完整**
- **原因**: OSS 签名 Content-Type 不匹配
- **解决**: 后端返回 MIME 类型，前端使用相同类型上传

### UI 优化

| 组件 | 优化内容 |
|-----|---------|
| Lightbox | 支持原图比例自适应、超长图上下滚动、圆角显示 |
| 关闭按钮 | 统一为黑色半透明圆圈 + 白色 X 图标 |
| 上传按钮 | 文案优化为「内测版本每天能上传1张照片」 |
| 语音图标 | 改为扩张图标（Maximize2），后续再定义功能 |

### 代码提交
- `627ae70` - fix: 照片上传功能完整修复 - 清理调试代码
- `a17fd40` - fix: 修复照片删除不生效问题 - 使用 RPC 绕过 RLS
- `2fc597d` - fix: 恢复使用 RPC 查询照片，绕过 RLS
- `6bcd521` - feat: Lightbox 支持原图比例自适应 + 超长图滚动

---

## 2026-03-20: Video Diary 视频日记修复 ✅

**类型**: Bug 修复（Tauri 桌面应用）

**项目路径**: `video_diary/video-diary-tauri/`

### 修复1: 全片预览黑屏问题
**问题描述**: 30 个视频片段连续播放时，片段切换有黑屏闪烁

**根本原因**: 使用 `setInterval` 检测时间精度不够，切换时有延迟

**解决方案**:
- 使用 `timeupdate` 事件替代 `setInterval`（更精确）
- 提前 50ms 触发切换，给视频解码留时间

**代码变更**:
```typescript
// 之前: setInterval(checkTime, 50)
// 现在: timeupdate 事件
video.addEventListener('timeupdate', handleTimeUpdate)

const handleTimeUpdate = () => {
  if (video.currentTime >= endTime - 0.05) {
    goToNextClip()  // 提前50ms切换
  }
}
```

### 修复2: FFmpeg 导出视频格式问题
**问题描述**: 导出视频无法正常播放，报 `Invalid argument` 错误

**根本原因**: FFmpeg concat 协议对视频格式要求严格，要求所有输入编码参数完全一致

**解决方案**:
- 改用 `filter_complex` 滤镜链进行精确剪辑和拼接
- 对每个片段使用 `trim`/`atrim` 裁剪时间
- 统一重新编码为 H.264/AAC，确保兼容性

**代码变更**:
```rust
// 构建 filter_complex 字符串
for (i, clip) in clips.iter().enumerate() {
  let filter = format!(
    "[{}:v]trim=start={}:duration={},setpts=PTS-STARTPTS[v{}]; \
     [{}:a]atrim=start={}:duration={},asetpts=PTS-STARTPTS[a{}]",
    input_idx, start, duration, i, input_idx, start, duration, i
  );
}

// 添加 concat 滤镜
format!("{}concat=n={}:v=1:a=1[outv][outa]", concat_inputs, clips.len())

// 统一编码
args(&["-c:v", "libx264", "-c:a", "aac", "-b:a", "192k"])
```

### 技术亮点
- **双视频预加载策略**：尝试过双视频元素重叠方案，但过于复杂，最终选择优化单视频切换时机
- **音量叠加计算**：支持 clip 音量 × 全局音量，灵活调整
- **filter_complex 多输入处理**：动态构建滤镜链，支持任意数量片段

**Git提交**:
- `4c99730` - fix: 全片预览黑屏问题 + FFmpeg导出视频格式修复

---

## 2026-03-19: AweSun MCP 远程控制测试

**类型**: 工具探索与评估

**背景**:
- 配置向日葵 MCP 服务器，探索通过 AI 控制远程电脑的可能性
- 测试目的是评估是否比直接向日葵远程更方便

**配置内容**:
- 向日葵 MCP 服务器：`D:\runjian\xiangrvkui\AweSun\flutter\awesun-mcp-server.exe`
- API Token：`ZThhNzg4NmQtZWQ1MC00OTQ0LWJiMzctODRjNTM4YTdhZjg0`
- 配置文件：`C:\Users\BIN\.claude\settings.local.json`

**测试过程**:
1. ✅ 发现并验证 24 个 MCP 工具可用
2. ✅ 成功搜索设备（发现 2 台：XXBB、广州仓库）
3. ✅ 成功建立 CMD 远程连接并执行命令（whoami）
4. ✅ 成功建立桌面远程连接并截图
5. ✅ 成功打开浏览器、导航到下载页面

**结论与反思**:
- **用户体验**: 配置复杂，学习成本高，每一步操作都需要写脚本
- **效率对比**: 对于 2 台设备，直接向日葵远程手动操作更简单高效
- **适用场景**: MCP 更适合批量操作（5+ 台设备）或定时自动化任务
- **最终决定**: **停用 MCP**，继续直接使用向日葵远程

**用户原话**: "这个 MCP 就是一个玩具"

**符合'简单'理念**: 最简单的方案就是最好的方案，不为了技术而技术

---

## 2026-03-05: 修复 Vercel 构建错误 ✅

**阶段**: Bug修复（部署问题）

**问题描述**:
- Vercel 部署失败，报错：`await isn't allowed in non-async function`
- 错误位置：`app/practice/page.tsx:4272`

**根本原因**:
`handleStartPractice` 函数使用了 `await` 调用 `audioCache.isCacheValid()`，但函数定义缺少 `async` 关键字。

**修复方案**:
```typescript
// 修复前
const handleStartPractice = () => {

// 修复后
const handleStartPractice = async () => {
```

**Git提交**:
- `c386e4d` (master2) - fix: 修复 handleStartPractice 函数缺少 async 关键字

---

## 项目概述
**创建时间**: 2026-01-14
**项目阶段**: 需求验证阶段
**核心理念**: 简单 - 专注打卡功能做到极致

---

## 2026-03-05: 修复口令跟练功能点击无反应问题 ✅

**阶段**: Bug修复（口令跟练功能）

**问题描述**:
- 点击口令跟练选项后，再点击"开始练习"没有反应
- 用户感觉界面卡死，没有任何反馈

**根本原因分析**:

1. **音频加载阻塞界面**: `handleStartPractice` 函数中，口令跟练模式会创建 `Audio` 对象并等待 `loadedmetadata` 事件
2. **延迟进入练习界面**: 只有在音频加载完成后（约几秒到十几秒，取决于网络），才设置 `setIsPracticing(true)` 进入练习界面
3. **用户无感知**: 在此期间用户看不到任何反馈，以为点击无效

**修复方案**:

### 修复1: 立即进入练习界面
**文件**: `app/practice/page.tsx:4240` (`handleStartPractice` 函数)

**修复前**:
```typescript
const handleStartPractice = () => {
  if (selectedOption) {
    // 口令跟练模式：先加载音频
    if (selectedOption === 'guided_audio') {
      setIsAudioLoading(true)
      const audio = new Audio(GUIDED_AUDIO_OPTION.audio_src)

      audio.addEventListener('loadedmetadata', () => {
        // 音频加载完成后才进入练习界面
        setIsPracticing(true)  // ⭐ 延迟执行
        audio.play()
      })
    }
  }
}
```

**修复后**:
```typescript
const handleStartPractice = () => {
  if (selectedOption) {
    // 先进入练习界面（立即给用户反馈）
    const now = Date.now()
    setStartTime(now)
    setIsPracticing(true)  // ⭐ 立即执行
    setIsPaused(false)
    // ...

    // 口令跟练模式：加载音频
    if (selectedOption === 'guided_audio') {
      setIsAudioLoading(true)
      setAudioError(null)
      setIsPaused(true)  // ⭐ 先暂停，等音频加载完成

      const audio = new Audio(GUIDED_AUDIO_OPTION.audio_src)

      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration)
        setIsAudioLoaded(true)
        setIsAudioLoading(false)

        // 音频加载完成，自动开始播放和计时
        setIsPaused(false)  // ⭐ 加载完成后自动开始
        audio.play()
      })
      // ...
      setAudioElement(audio)
    }
  }
}
```

### 修复2: 统一口令跟练选项样式
**文件**: `app/practice/page.tsx:4714-4720`

- 移除 `isGuidedAudio` 特殊样式判断
- 移除 `Volume2` 图标
- 样式改为和其他普通选项完全一致

**代码变更**:
```typescript
// 之前：特殊样式和图标
const isGuidedAudio = option.id === "guided_audio"
// ...
isGuidedAudio
  ? "bg-primary/10 text-primary border border-primary/30..."
  : "bg-background text-foreground..."
// ...
{isGuidedAudio && <Volume2 className="w-3.5 h-3.5 inline-block" />}

// 现在：和其他选项一样
"bg-background text-foreground shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-stone-100/50"
```

**Git提交**:
- `a3f3189` (master2) - fix: 修复口令跟练功能点击无反应问题
- `ce7a3e8` (master) - fix: 修复口令跟练功能点击无反应问题

**用户体验改进**:
- 点击"开始练习"立即进入计时界面，不再卡顿
- 音频加载期间显示"加载中..."状态
- 音频加载完成后自动开始播放和计时
- 口令跟练选项样式和其他选项一致，不突兀

**测试建议**:
1. 选择"一序列跟练"选项
2. 点击"开始练习"
3. 验证是否立即进入计时界面
4. 验证是否显示"加载中..."
5. 验证音频加载完成后是否自动开始播放

---

## 2026-02-28: 修复同步时名字签名被重置问题 ✅ 完成

**阶段**: Bug修复（同步功能优化）

**问题描述**:
- 用户在同步练习记录时，选择"智能合并"后，个人资料（名字、签名）有时会被重置为默认状态

**根本原因分析**:

1. **问题1**: `smartMerge` 函数未处理 profile 数据
   - 只同步了练习记录和选项，完全没有处理 profile
   - 如果云端 profile 被错误构建为默认值，智能合并不会修正

2. **问题2**: 使用云端数据时错误的有效性判断
   - 多处代码排除了 `'阿斯汤加习练者'` 这个值，认为它是"无效的"
   - 但实际上用户可能恰好喜欢用这个名字
   - 选择"使用云端数据"时，如果云端是默认名字，会被强制重置

3. **问题3**: 同步对比逻辑与构建逻辑不一致
   - 对比阶段已正确识别 profile 变更来源
   - 但构建 `mergedProfile` 时重新进行"有效性"判断，覆盖了对比结果

**修复方案**:

### 修复1: 智能合并时正确处理 profile 数据
**文件**: `hooks/useSync.ts:547` (`smartMerge` 函数)
```typescript
// 智能合并 profile：比较时间戳，使用更新的那个
let mergedProfile = freshLocalData.profile
if (remoteData.profile) {
  const localTime = new Date(freshLocalData.profile?.updated_at || freshLocalData.profile?.created_at || 0).getTime()
  const remoteTime = new Date(remoteData.profile.updated_at || remoteData.profile.created_at).getTime()

  if (remoteTime > localTime) {
    mergedProfile = remoteData.profile
  }
}

onSyncComplete({
  records: [...freshLocalData.records, ...remoteOnly],
  options: remoteData.options || [],
  profile: mergedProfile // ⭐ 添加 profile
})
```

### 修复2: 移除错误的默认值判断
**文件**: `hooks/useSync.ts`
**位置**: 394-408 行, 454-468 行, 928-942 行

**修复前**:
```typescript
const mergedProfile = remoteData.profile && remoteData.profile.name && !remoteData.profile.name.match(/^\d+$/) && remoteData.profile.name !== '阿斯汤加习练者'
  ? { /* 使用云端 */ }
  : { name: '阿斯汤加习练者', ... } // 默认值
```

**修复后**:
```typescript
const mergedProfile = remoteData.profile && remoteData.profile.name
  ? { /* 直接使用云端数据 */ }
  : freshLocalData.profile || { name: '阿斯汤加习练者', ... } // 只有真正没有数据时才用默认值
```

**关键原则**: 默认值 `'阿斯汤加习练者'` 只是一个初始值，不应该在同步过程中被当作"无效数据"处理。

### 修复3: 信任同步对比结果
**文件**: `hooks/useSync.ts:394-408`
- 直接使用 `profileChangeSource` 的结果
- 不要重新判断 profile 是否"有效"

**验证方案**:

1. **测试用例1**: 智能合并时 profile 不被重置
   - 设备 A：修改名字为 "小明"，等待同步到云端
   - 设备 B：触发冲突，选择智能合并
   - 验证：设备 B 的名字应该是 "小明"（不是默认值）

2. **测试用例2**: 云端是默认名字时不被强制重置
   - 云端 profile 名字为 "阿斯汤加习练者"
   - 本地 profile 名字为 "小明"
   - 同步时选择"使用云端数据"
   - 验证：云端数据被正确下载，名字为 "阿斯汤加习练者"（不是又被重置一次）

3. **测试用例3**: 基于时间戳的正确合并
   - 本地 profile 更新时间为今天 10:00，名字为 "小明"
   - 云端 profile 更新时间为今天 12:00，名字为 "大明"
   - 触发智能合并
   - 验证：最终名字为 "大明"（云端更新）

**Git提交**:
- `fd9ea26` - fix(sync): 修复同步时名字签名被重置的问题

**修改文件**:
| 文件 | 位置 | 说明 |
|------|------|------|
| `hooks/useSync.ts` | 394-408, 454-468, 547, 928-942 | 主要修复位置 |

**下一步**:
- 继续观察同步功能是否稳定
- 处理其他已知问题（练习选项同步异常）

---

## 2026-02-27: 飞书多维表格读取技能 ✅ 完成

### 背景
用户希望将飞书读取功能单独做成一个 Claude Code 技能，可以直接发送多维表格链接，Claude 就能读取表格内容进行分析。

### 实现
创建了 `.claude/skills/feishu-bitable-read/` 技能：

**文件结构**:
```
.claude/skills/feishu-bitable-read/
├── skill.yml          # 技能定义
├── config.json        # 配置文件（app_id, app_secret）
└── read_bitable.py    # 核心逻辑
```

**核心功能**:
1. **URL 解析**: 从 `https://xxx.feishu.cn/base/{app_token}?table={table_id}` 提取参数
2. **Token 管理**: 自动获取 tenant_access_token
3. **分页读取**: 处理大量数据的分页获取（每页 500 条）
4. **字段映射**: 自动将 field_id 转换为字段名显示
5. **缓存机制**: 默认 5 分钟缓存，避免重复调用 API
6. **表格目录**: 支持配置多个表格，使用 key 快速切换
7. **默认表格**: 无需输入 URL，自动使用默认表格
8. **待发货清单**: 一键查看待发货订单和订货清单

**表格目录** (`config.json`):
```json
{
  "default_table": "orders",
  "tables": {
    "orders": {
      "name": "有赞订单",
      "url": "https://xxx.feishu.cn/base/xxx",
      "description": "有赞商城订单数据"
    }
  }
}
```

**使用方式**:
```bash
# 查看待发货订单（使用默认表格）
/feishu-bitable-read

# 使用指定表格 key
/feishu-bitable-read orders

# 使用完整链接
/feishu-bitable-read https://xxx.feishu.cn/base/xxx

# 查看表格目录
/feishu-bitable-read --list-tables
```

**配置凭证**:
- `app_id`: cli_a92a4d950d385cef
- `app_secret`: rbhvYLZ8zJj5Lx3Vz4DlLcBEcJ2FgEVj

### 测试验证
使用有赞订单表格链接测试成功：
- 表格名称: 有赞订单
- 记录总数: 486 条
- 字段数量: 161 个

### 版本迭代

**v1.0 (2026-02-27)**: 基础功能
- URL 解析、Token 管理、分页读取、缓存机制

**v2.0 (2026-02-27)**: 智能表格目录
- 添加表格目录管理功能
- 支持默认表格（无需输入 URL）
- 支持表格 key 快速切换
- 待发货订单统计功能
- `--list-tables` 查看表格目录

### 复用代码
从 `XBB-APP/ashtanga-xiaohongshu/_scripts/sync_feishu_content.py` 复用了：
- `get_tenant_token()` 方法
- `get_all_records()` 分页逻辑
- 错误处理模式

---

## 用户画像
- **姓名**: orange
- **角色**: 产品经理
- **背景**: 阿斯汤加瑜伽练习3年
- **技术背景**: 不会写代码，用AI开发
- **付费意愿**: 小几十块/年

---

## 需求描述

### 现状痛点
- 在约课软件上看练了几天
- 在个人日记上记录练习
- **数据不统一**，无法看进步/状态

### 核心需求
- 打卡 + 时间 + 文字补充 + 照片
- 时间线回顾
- 以后可能生成回忆

### 功能定位
**不是**瑜伽学习app
**不是**体式教学app
**就是**专注打卡 + 身体觉察的记录工具

---

## 市场调研
- **小红书搜索**: 没有专注阿斯汤加打卡的产品
- **竞品**: 瑜伽学习app（嵌入打卡功能，不纯粹）
- **参考案例**: 鸿蒙咖啡打卡app（成功案例）

---

## 需求验证计划

### Week 1: 验证需求（不写代码）

#### 方案1: 小红书测试
- **内容**: "练了3年阿斯汤加，想做个打卡app，有人需要吗？"
- **观察指标**: 收藏数 > 50 = 需求成立
- **关键信号**: 有人问"什么时候出"、"求分享"

#### 方案2: 亲身体验
- **工具**: Excel/飞书表格
- **时长**: 1周
- **目的**: 验证自己能否坚持记录

#### 方案3: 用户调研
- **目标**: 找10个阿斯汤加练习者
- **问题**:
  - 你现在怎么打卡？
  - 打卡最痛苦的是什么？
  - 愿意为app付多少钱？

---

## 技术方案（待验证后确定）

### 候选方案

| 方案 | 成本 | 时间 | 美观度 |
|------|------|------|--------|
| v0.dev (Vercel) | 0 | 3-5天 | ⭐⭐⭐⭐⭐ |
| Claude Code + Streamlit | 0 | 1周 | ⭐⭐⭐ |
| PWA (打包) | 0 | 1周 | ⭐⭐⭐⭐ |

### 核心功能
- 打卡按钮
- 时间记录
- 文字补充
- 照片上传
- 时间线回顾

---

## 产品方法论应用

### 预测
- 阿斯汤加小众但粘性高
- 市场上没有纯打卡产品
- 打卡app留存问题（3个月后流失）

### 单点击穿
- **核心功能**: "今天练了，记录一下"
- **差异化**: 不做教学，只做记录
- **目标用户**: 练了很久的人，不是新手

### All-in
- 待需求验证后再决定

---

## 验证标准

### ✅ 需求成立的信号
- 小红书收藏 > 50
- 10+人说"希望有app"
- 自己能坚持记录1周

### ❌ 需求不成立的信号
- 小红书没人理
- 自己1周都坚持不了记录
- 反馈都是"不需要"

---

## 下一步行动

- [ ] Week 1: 小红书发帖测试
- [ ] Week 1: 用Excel记录1周
- [ ] Week 1: 收集用户反馈
- [ ] Week 2: 根据反馈决定是否开发

---

## 项目对话记录

### 2026-01-22 Tab1 UI样式优化完成 ✅

**阶段**: UI细节打磨

**核心改动**:
- ✅ 选项按钮样式全面优化
  - 按钮间距：gap-4 (16px) → gap-2 (8px)，更紧凑
  - 按钮内边距：py-2 px-2 → py-[6px] px-1 (上下6px, 左右4px)
  - 名称字号：text-xs (12px) → text-[14px]，可读性提升
  - 备注字号：text-[10px] → text-[11px]
  - 按钮最小高度：min-h-[72px]
- ✅ 默认选项文案简化（hooks/usePracticeData.ts）
  - 原来："一序列 Mysore"、"一序列 Led Class"（混用中英文，太长）
  - 现在："一序列" + "Mysore"、"一序列" + "Ledclass"（纯中文+简短英文）
  - 6个默认选项：一序列(Mysore/Ledclass)、二序列(Mysore/Ledclass)、半序列、休息日
- ✅ 底部Tab导航间距优化：pb-8 (32px) → pb-4 (16px)，更贴近屏幕底部
- ✅ 网页标题修改：熬汤日记·觉察呼吸 → 熬汤日记·呼吸·觉察（顺序调整）
- ✅ 首页添加英文标语："Practice, practice, and all is coming."
  - Pattabhi Jois的名言
  - 9px 字号，灰色50%透明度，贴在中文标题正下方
- ✅ 提示文字优化：单击选择·双击编辑（使用中点号）
  - 间距优化：mt-2 (8px) → mt-[-4px]（负值，上移4px）
  - 实际间距从24px减小到12px
- ✅ Logo图标调整：32px × 32px → 34px × 34px
- ✅ 删除Zeabur相关文档：确认使用Vercel部署

**技术实现**:
- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 自定义值：text-[14px], text-[9px], w-[34px], py-[6px]
- 负边距技巧：mt-[-4px] 实现元素重叠效果

**Git提交**:
- `d83af42` - 优化选项按钮显示 - 调整内边距为px-1，间距改为gap-4
- `495d218` - 删除Zeabur相关内容，更新为Vercel部署
- `47016ec` - 名称字号改为20px
- `fe85d6f` - 名称字号改回16px
- `1d27d9e` - 名称字号改为14px
- `da7f79e` - 按钮上下内边距改为6px
- `e4b6e83` - 底部Tab导航改为pb-4，更贴近屏幕底部
- `6551ef4` - 网页标题改为'熬汤日记·呼吸·觉察'
- `4230414` - 首页标题下方添加英文小字'Practice, practice, and all is coming.'
- `40a4199` - 英文标语改为9px，贴在中文标题正下方
- `3e30ba5` - 提示文字改为'单击选择·双击编辑'，间距改为mt-2(8px)，英文标语改为9px
- `cb52f47` - 提示文字间距改为mt-[-4px]，更贴近按钮
- `b1c6542` - logo图标大小改为34px×34px

**用户体验改进**:
- 按钮更紧凑，文字更大更清晰
- 默认选项文案更简洁，一眼就能看懂
- Tab导航更贴近底部，更方便操作
- 英文标语增添瑜伽文化气息
- 整体UI更加精致和专业

**产品决策**: 符合"简单"理念，Tab1样式打磨完成，达到稳定可用标准

**下一步计划**:
- P0: 继续使用和测试，发现其他问题
- P1: 照片上传功能（Supabase Storage）
- P2: 其他Tab的UI优化

---

### 2026-01-19 Supabase数据持久化完成 ✅

**阶段**: 从MVP到可用产品

**核心功能**:
- ✅ Supabase数据库集成（3个表：practice_records, practice_options, user_profiles）
- ✅ 完整CRUD操作（创建、读取、更新、删除）
- ✅ 编辑记录功能（点击记录左侧编辑，同步更新到Supabase）
- ✅ 删除记录功能（确认对话框，同步删除Supabase数据）
- ✅ 保存后自动跳转到觉察日记Tab
- ✅ 数据持久化（刷新页面数据不丢失）
- ✅ 错误处理优化（网络错误时优雅降级）

**技术实现**:
- Next.js 16 + React 19 + TypeScript
- Supabase PostgreSQL数据库
- @supabase/supabase-js客户端
- lib/database.ts - 完整CRUD函数库
- lib/supabase.ts - 数据库连接配置
- .env.local - 环境变量配置

**数据库表结构**:
```sql
-- practice_records (练习记录表)
- id: BIGINT (主键，自增)
- created_at: TIMESTAMP (创建时间)
- date: DATE (练习日期)
- type: TEXT (练习类型，如"一序列Mysore")
- duration: BIGINT (时长，秒)
- notes: TEXT (觉察文字)
- photos: TEXT[] (照片数组，存储URL)
- breakthrough?: TEXT (突破标题，可选)

-- practice_options (练习选项表)
- id: BIGINT (主键，自增)
- created_at: TIMESTAMP (创建时间)
- label: TEXT (英文标签)
- label_zh: TEXT (中文标签)
- notes?: TEXT (备注说明)
- is_custom: BOOLEAN (是否用户自定义)

-- user_profiles (用户信息表)
- id: BIGINT (主键，自增)
- created_at: TIMESTAMP (创建时间)
- name: TEXT (用户名)
- signature: TEXT (个性签名)
- avatar?: TEXT (头像URL)
- phone?: TEXT (手机号)
- email?: TEXT (邮箱)
- is_pro: BOOLEAN (是否付费会员)
```

**遇到的问题和解决方案**:

1. ❌ API key格式错误
   - 问题：使用了新版publishable key（`sb_publishable_xxx`格式）
   - 解决：改用legacy anon key（`eyJhbG...`JWT格式）
   - 教训：Supabase更新了API key系统，需要使用legacy key

2. ❌ 数据表缺少date字段
   - 问题：表结构与设计文档不一致
   - 解决：按照设计方案重新创建表
   - 工具：在SQL Editor中执行DROP TABLE + CREATE TABLE

3. ❌ React key重复警告
   - 问题：mock数据和Supabase数据有重复的id
   - 解决：移除mock数据，初始状态改为空数组
   - 结果：只使用Supabase真实数据

4. ❌ 删除功能失败（错误信息为空对象）
   - 问题：错误日志不够详细，无法排查
   - 解决：改进错误日志，输出JSON.stringify(error)
   - 结果：发现是RLS权限问题，关闭RLS后正常

**技术决策**:
- v1.0只给自己用，关闭RLS（Row Level Security）
- v1.5对外开放时再开启权限控制
- 符合"简单"理念，先核心功能，后权限管理

**Git提交**:
- `35cf58e` - feat: 阿斯汤加打卡app - Supabase数据持久化完成
  - 99个文件，16214行代码
  - 包含完整的Next.js项目、UI组件、数据库逻辑
- `57e7682` - docs: 更新memory.md记录今日工作

**配置文档**:
- `SUPABASE_SETUP_GUIDE.md` - 详细的Supabase配置指南
  - 创建项目的步骤
  - 3个数据表的SQL语句
  - RLS配置说明
  - API key获取方法

**下一步计划**:
- **P0（核心完善）**: 照片上传功能（压缩+存储到Supabase Storage）
- **P1（体验优化）**: 加载状态提示、错误提示美化（用toast替代alert）
- **P2（部署上线）**: 部署到Vercel、配置自定义域名

**产品决策**: 符合"简单"理念，专注核心数据功能，app现在真正可用了！

---

### 2026-01-19 Zeabur云端部署成功 ✅

**阶段**: 从本地开发到云端可用

**部署成果**:
- ✅ 成功部署到Zeabur平台
- ✅ GitHub仓库自动化部署
- ✅ 89个核心文件上传
- ✅ 环境变量配置完成
- ✅ 应用成功运行在云端

**部署过程**:

1. **GitHub仓库清理**
   - 清空远程仓库，准备重新上传
   - 保留本地文件，只清空GitHub

2. **创建部署版本**
   - 在Ashtang_app/目录初始化新git仓库
   - 配置.gitignore排除非部署文件：
     - `screenshots/` - 截图目录
     - `yoga-app-homepage/` - 备份目录
     - `docs/` - 文档目录
     - `*.md` - Markdown文件（除了.zeabur.yaml）
     - `node_modules/` - 依赖包
     - `.next/` - 构建缓存

3. **上传核心文件**（89个文件）
   - Next.js应用完整代码
   - 配置文件（package.json, tsconfig.json, next.config.mjs等）
   - 组件库（57个shadcn/ui组件）
   - 公共资源（11个图标和占位图）
   - Zeabur配置（.zeabur.yaml）

4. **Zeabur配置**
   - Root Directory: `/`（项目文件在仓库根目录）
   - 环境变量配置：
     - `NEXT_PUBLIC_SUPABASE_URL`: https://xojbgxvwgvjanxsowqik.supabase.co
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   - 自动部署配置：GitHub推送自动触发部署

5. **部署验证**
   - ✅ 文件上传成功
   - ✅ 构建过程正常
   - ✅ 应用成功运行
   - ✅ Supabase连接正常

**技术亮点**:
- 使用pnpm作为包管理器
- Zeabur自动检测Next.js项目
- 零配置部署（.zeabur.yaml只需设置build命令）
- GitHub集成实现自动化部署

**部署地址**:
- GitHub仓库: https://github.com/jstur225/ashtanga-app
- Zeabur控制台: （用户提供）

**遇到的问题**:
1. ❌ 初次部署Zeabur找不到项目文件
   - 原因：项目文件在yoga-app-homepage/子目录
   - 解决：将项目文件移到仓库根目录

2. ❌ .env.local未包含在部署中
   - 原因：.gitignore排除了.env*文件
   - 解决：在Zeabur中手动配置环境变量

**Git提交**:
- （部署版本在Ashtang_app/目录的新git仓库）

**下一步计划**:
- **P0**: 测试云端应用功能完整性
- **P1**: 配置自定义域名
- **P2**: 添加监控和错误追踪
- **P3**: 照片上传功能（Storage配置）

**产品里程碑**: 🎉 从想法到云端可用产品，只用了6天！

---

### 2026-01-16 Chrome MCP 全平台竞品调研 + 小红书用户洞察

**调研方式**: Chrome MCP 自动化搜索 + 人工整理

#### 全平台竞品调研

**调研规模**：
- 总计 **13 个竞品**
- iOS（2个）、Android（5个）、中国市场（6个）
- 搜索次数：15+ 次
- 自动化采集时间：1 小时（传统方式需 8-10 小时）

**竞品清单**：

1. **iOS 平台**：
   - Ashtanga Yoga Days - $6.98 一次性购买
   - Michael Gannon's Ashtanga Yoga - $8.99 一次性购买，#1 Health & Fitness Paid

2. **Android 平台**：
   - Ashtanga Yoga by Catico - 免费，4.56星，10,000+下载
   - Ashtanga Yoga Home - 订阅制
   - Down Dog - 订阅制，高度定制化
   - Glo - 订阅制，大量课程库
   - Pocket Yoga - 付费一次性购买

3. **中国市场**：
   - Keep - ¥248-298/年（市场领导者）
   - 每日瑜伽 - ¥168-218/年
   - Wake 瑜伽 - 几百到上千/次（线下为主）
   - 柠檬瑜伽 - ¥599/年
   - Nike Training Club - 免费
   - Nüli - 女性健康定位

**核心发现**：

1. **定价优势极其显著** 💰
   - 你的定价：30元/年 = $4.2
   - vs 海外竞品：1/6-1/7
   - vs 中国竞品：1/6-1/20

2. **差异化定位清晰**
   - 海外竞品：专注阿斯汤加，但功能复杂
   - 中国竞品：综合教学平台，不专注阿斯汤加
   - 你的定位：专注阿斯汤加打卡，极致简单

3. **平台机会明确**
   - Ashtanga Yoga Days 只支持 iOS
   - 用户强烈要求 Android 版本
   - 你的策略：同时支持 iOS 和 Android

**创建文件**：
- `全平台竞品对比报告_2026-01-16.md` - 13个竞品详细分析
- `Chrome_MCP_竞品调研指南.md` - 调研方法论
- `竞品体验报告/竞品体验_Ashtanga_Yoga_Days.md` - 直接竞品模板

---

#### 小红书用户调研

**调研规模**：
- 搜索关键词：4 个
- 分析笔记：50+ 条
- 搜索次数：4 次
- 截图保存：1 张

**搜索关键词**：
1. "阿斯汤加打卡app"
2. "阿斯汤加记录app"
3. "瑜伽打卡记录方式"
4. "阿斯汤加 excel 记录表格"

**核心发现**：

1. **用户需求真实存在** ✅
   - 直接证据：**"請大家推薦記錄阿斯湯加的APP"**（2024-02-07，获赞8）
   - 间接证据：搜索建议高频出现相关关键词
   - 结论：需求不是假设，是真实存在！

2. **Excel 记录假设验证** ✅
   - 发现用户：**"2025年，阿斯汤伽瑜伽，自我练习打卡记录表"**
   - 发现用户：**"Annie如意的阿汤笔记"**
   - 结论：完全验证了用户主要用 Excel 记录的假设！

3. **用户长期记录习惯** ✅
   - **901天** - Alan的设计手札（获赞45）
   - **半年120天** - 沪漂橙子疯狂熬汤记（获赞19）
   - 持续更新：自由行走的木子青（阿斯汤加计数系列）

4. **现有解决方案**
   - Excel 表格（手动设计）
   - Keep（综合健身平台）
   - **MarkNow App**（管理瑜伽）
   - 麦小嘉Yoga（3年练习者强推，获赞66）

5. **用户行为模式**
   - 记录练习次数（100次Mysore 庆祝）
   - 记录体式进度（阿斯汤加计数系列）
   - 记录生活大事小事（"不只计数"）

**用户痛点**：
- 缺少专门的阿斯汤加记录工具
- 现有工具不够专业（Keep 是综合平台）
- Excel 需要手动设计，不够方便
- 记录方式繁琐

**创建文件**：
- `小红书用户洞察报告_2026-01-16.md` - 50+笔记分析

---

#### Chrome MCP 技术学习

**成功应用**：
- ✅ 自动访问 Google 搜索
- ✅ 自动访问小红书搜索
- ✅ 自动提取页面文本内容
- ✅ 自动截图保存
- ✅ 自动切换标签页
- ✅ 自动读取历史记录

**遇到的问题**：
- ❌ AbortError: This operation was aborted
- 原因：session 超时
- 解决：重新连接即可

**学习成果**：
- Chrome MCP 可以极大提升调研效率
- 从传统 8-10 小时缩短到 1 小时
- 尤其适合：批量搜索、数据采集、竞品分析

**限制**：
- App Store 页面需要 JavaScript 渲染（无法直接获取内容）
- 某些网站有反爬虫机制
- Session 会超时，需要重新连接

---

#### Week 1 验证计划更新

**验证标准更新**：
- ✅ 小红书收藏 > 50（保持）
- ✅ 10+人说"希望有app"（保持）
- ✅ 自己能坚持记录1周（保持）
- **新增验证**：
  - ✅ 用户主动求推荐 app（已验证）
  - ✅ 用户主要用 Excel 记录（已验证）
  - ✅ 用户愿意长期记录（已验证）

**推荐小红书标题**：
1. **"练了3年阿斯汤加，受够了Excel记录，做了个极简打卡app，有人需要吗？"**（痛点型）
2. **"试了Keep、MarkNow、Excel，最后还是做了个专门的阿斯汤加打卡app"**（对比型）
3. **"901天阿斯汤加记录，我只想做一件简单的事情：打卡"**（共鸣型）

**下一步行动**：
- [ ] 立即发小红书测试
- [ ] 自己用 Excel 记录 1 周
- [ ] 找 10 个阿斯汤加练习者调研

**结论**：
- ✅ 需求验证通过
- ✅ 定价策略可行
- ✅ 产品定位准确
- **强烈推荐继续推进 Week 1 验证！**

---

### 2026-01-15 竞品调研（iOS/Android/中国市场）

**调研范围**：
- iOS App Store（阿斯汤加相关app）
- Android Google Play（阿斯汤加相关app）
- 中国市场（每日瑜伽、Keep、Wake等）

**核心发现**：

1. **iOS市场**：
   - Ashtanga Yoga Days - 专门的打卡工具（最接近orange的产品）
   - Michael Gannon's Ashtanga Yoga - 市场老大（$2.99一次性购买，教学工具）
   - 约12个阿斯汤加专用app

2. **Android市场**：
   - Ashtanga Yoga (by Catico) - 最流行（4.56星，10,000+下载）
   - Ashtanga Yoga Home - 面向资深练习者
   - The Ashtanga Institute - 带追踪功能
   - 约5个阿斯汤加专用app（竞品较少）

3. **中国市场（重大发现）**：
   - ✅ **完全没有专门的阿斯汤加打卡app**
   - 每日瑜伽：218元/年，综合教学平台
   - Keep：168-248元/年，综合健身平台
   - Wake：168元/年，高端瑜伽平台
   - 用户主要用小红书、Excel、约课软件记录

**关键洞察**：
- ✅ **中国市场是巨大的机会**（没有专门的阿斯汤加打卡app）
- ✅ **定价优势**：30元/年 vs 市场168-218元/年（只有1/6）
- ✅ **差异化定位**：不做教学，只做打卡记录
- ⚠️ **需要验证**：阿斯汤加练习者真的需要专门的app吗？

**创建文件**：
- `竞品体验_模板.md` - 详细的竞品体验报告模板
- `竞品体验指南.md` - 使用指南和目录结构
- `screenshots/` - 截图存放目录
- `竞品体验报告/` - 报告存放目录

**下一步行动**：
- [ ] 下载体验Ashtanga Yoga Days（iOS直接竞品）
- [ ] 下载体验Michael Gannon's Ashtanga Yoga（市场老大）
- [ ] 下载体验每日瑜伽（中国最大）
- [ ] 下载体验OH YOGA（中国阿斯汤加）
- [ ] 填写竞品体验报告
- [ ] 总结竞品调研结论

**待验证问题**：
- Ashtanga Yoga Days的定价模式（免费还是付费？）
- 用户愿意为打卡功能付30元/年吗？
- 阿斯汤加练习者真的需要专门的app吗？

---

### 2026-01-15 建立文档体系

**做了什么**：
- 更新README.md，添加完整的项目说明文档
- 创建竞品体验报告模板和使用指南
- 建立完整的目录结构

**更新内容**：

1. **README.md更新**：
   - 📖 项目简介（核心理念、产品定位、目标用户）
   - ✨ 核心功能（MVP功能、未来功能）
   - 💰 付费模式（定价、商业模式）
   - 📊 市场调研（全球市场、中国市场、竞争优势）
   - 📂 文件结构（项目文件组织）
   - 🚀 验证计划（Week 1详细方案）
   - 🛠️ 技术方案（候选方案对比）
   - 📅 开发日志（重要时间线）
   - 🤝 贡献指南（联系方式）
   - 📄 许可证信息

2. **竞品体验体系**：
   - `竞品体验_模板.md` - 详细的体验报告模板（包含基本信息、产品定位、核心功能、UI/UX、商业模式、用户评价、优缺点、可借鉴点、差异化机会、截图附件、综合评分）
   - `竞品体验指南.md` - 使用指南（目录结构、快速开始、体验清单、截图规范、填写要点、提示与技巧）
   - `screenshots/` - 截图存放目录
   - `竞品体验报告/` - 报告存放目录

**文档理念**：
- **README.md** = 项目说明书（给别人看的）
  - 回答"这个项目是什么？"
  - 回答"有什么功能？"
  - 回答"怎么用？"
  - 不记录开发过程

- **PROJECT_LOG.md** = 开发日志（给自己看的）
  - 回答"今天做了什么？"
  - 回答"为什么这么做？"
  - 回答"遇到什么问题？"
  - 记录决策过程

**下一步行动**：
- [ ] 下载体验Ashtanga Yoga Days（iOS直接竞品）
- [ ] 填写竞品体验报告（使用模板）
- [ ] 继续Week 1验证（小红书发帖 + Excel记录）

---

### 2026-01-21 Tab1 交互优化 + 数据持久化修复 ✅

**阶段**: 从功能完善到用户体验优化

**新增功能**:
1. ✅ Header 滚动整合（可被截断）
2. ✅ 标题颜色渐变（熬汤日记·呼吸·觉察）
3. ✅ 选项按钮宽度优化（支持长文本）
4. ✅ 自定义选项保存到 localStorage

**核心改动**:

#### 1. Header 滚动优化
**文件**: `app/page.tsx`
- **Header 整合到滚动区域**：不再是固定定位，随内容一起滚动
- **可被截断**：向下滚动时 header 可以移出屏幕，最大化内容展示区域
- **响应式布局**：改用 `h-screen flex flex-col`，不使用 `overflow-hidden`
- **沉浸式体验**：用户专注于打卡内容，不被固定 header 干扰

**技术实现**:
```tsx
// 之前：header 固定在外层
<div className="h-screen overflow-hidden">
  <header className="flex-shrink-0">...</header>
  <main className="flex-1 overflow-y-auto">...</main>
</div>

// 现在：header 在滚动区域
<div className="h-screen flex flex-col">
  <main className="flex-1 overflow-y-auto">
    <header>...</header>  // header 随内容一起滚
    <div>选项内容</div>
  </main>
</div>
```

#### 2. 标题颜色渐变
**文件**: `app/page.tsx`
- **主标题**：熬汤日记（纯黑，`text-foreground`）
- **副标题1**：·呼吸（中灰，`text-muted-foreground/50`）
- **副标题2**：·觉察（浅灰，`text-muted-foreground/70`）
- **视觉层次**：形成从深到浅的渐变效果

**代码**:
```tsx
<h1 className="text-lg font-serif text-foreground tracking-wide font-semibold">
  熬汤日记
  <span className="text-muted-foreground/50 font-normal">·呼吸</span>
  <span className="text-muted-foreground/70 font-normal">·觉察</span>
</h1>
```

#### 3. Header 布局横向排列
**文件**: `app/page.tsx`
- **Logo 缩小**：`w-12 h-12` → `w-8 h-8`（48px → 32px）
- **横向布局**：`flex-col` → `flex-row`，logo 和标题左右排列
- **间距优化**：`gap-3`，适当间距
- **标题缩小**：`text-xl` → `text-lg`
- **减少 padding**：`pt-14 pb-6` → `pt-12 pb-4`

#### 4. 选项按钮宽度优化
**文件**: `app/page.tsx`
- **增加 padding**：`px-2` → `px-4`
- **设置最小宽度**：`min-w-[100px]`，保证文字显示
- **文字换行**：添加 `break-words w-full`，自动换行
- **备注字号**：`text-xs` → `text-[10px]`

#### 5. 自定义选项持久化
**文件**: `app/page.tsx`, `hooks/usePracticeData.ts`

**问题根因**:
- `handleCustomConfirm` 只更新本地 `practiceOptions` state
- 没有调用 `addOption` 保存到 localStorage
- 刷新页面后丢失

**解决方案**:
```tsx
// 添加自定义选项时保存到 localStorage
const handleCustomConfirm = (name: string, notes: string) => {
  // 保存到 localStorage
  const newOption = addOption(name, name)
  if (notes) {
    updateOption(newOption.id, name, name, notes)
  }
  // 本地 state 会通过 useEffect 自动同步
  toast.success('已添加自定义选项')
}
```

#### 6. 选项字符限制
**文件**: `app/page.tsx`

**新建选项弹窗**:
- 练习名称：最多 **10 个字**（两行，每行5字）
- 备注：最多 **14 个字**（两行，每行7字）
- 计数器：x/10 和 x/14

**编辑选项弹窗**:
- 同样限制为 **10 + 14** 字符
- 保存时自动截断超出部分

**输入验证**:
```tsx
onChange={(e) => setPracticeName(e.target.value.slice(0, 10))}
onChange={(e) => setNotes(e.target.value.slice(0, 14))}
```

**Git 提交**:
- `09363d9` - style: 调整header布局为横向排列，logo缩小
- `7bd5d95` - style: header整合到滚动区域，可被截断；标题改为'熬汤日记·呼吸·觉察'
- `7d1dbca` - style: 标题颜色渐变；选项字符限制调整为5+7
- `b3448fa` - fix: 修复新建自定义选项刷新后丢失的问题
- `3fe6ac8` - fix: 修复刷新页面后自定义选项被重置的问题 - 检查localStorage而非options变量
- `9a6e32d` - style: 调整选项按钮宽度支持两行每行5个字
- `31267a8` - style: 调整选项字符限制为10+14（名称两行+备注两行）

**用户体验改进**:
- Header 随内容滚动，最大化内容展示区域
- 标题颜色渐变形成视觉层次
- 选项按钮宽度支持长文本，自动换行
- 自定义选项正确保存到 localStorage
- 刷新页面后所有设置保持不变
- 字符限制合理，避免按钮过宽

**下一步计划**:
- **P0**: 继续使用和测试，发现其他问题
- **P1**: 照片上传功能（Supabase Storage）
- **P2**: 数据备份提醒功能

**产品里程碑**: Tab1 练习打卡功能达到稳定可用标准 🎉

---

### 2026-01-21 Tab3 数据管理功能完善 ✅

**阶段**: 从基础功能到用户体验优化

**修复问题**:
1. ✅ 导入数据成功/失败提醒不显示
2. ✅ 练习选项编辑和删除后不保存到 localStorage
3. ✅ 刷新页面后自定义选项被重置
4. ✅ 365天热力图圆点布局优化
5. ✅ 导出功能弹窗交互优化

**核心改动**:

#### 1. 简化导入弹窗逻辑
**文件**: `components/ImportModal.tsx`, `app/page.tsx`
- 移除 ImportModal 内部的成功/失败状态显示
- 使用 toast 从顶部弹窗显示导入结果（3秒自动消失）
- 成功后 500ms 自动关闭导入弹窗和设置弹窗
- 失败时保持弹窗打开，方便用户重试
- 参考导出功能的交互模式，保持一致性

#### 2. 修复练习选项持久化问题
**文件**: `hooks/usePracticeData.ts`, `app/page.tsx`

**问题根因**:
- `handleEditSave` 和 `handleEditDelete` 只更新本地 state，没有同步到 localStorage
- `useLocalStorage` 默认值设置为 `DEFAULT_OPTIONS`，导致每次初始化都会覆盖用户自定义选项

**解决方案**:
- 添加 `updateOption(id, label, label_zh, notes)` 方法
- 添加 `deleteOption(id)` 方法
- 修改 `handleEditSave` 同时更新 localStorage 和本地 state
- 修改 `handleEditDelete` 同时更新 localStorage 和本地 state
- 添加 toast 提示"已保存修改"和"已删除选项"
- 将 `useLocalStorage` 默认值改为空数组 `[]`
- 修改 useEffect 逻辑，只在 options 为空时设置默认值

#### 3. 数据导出/导入验证
**导出数据包含**:
- ✅ `records` - 所有练习记录
- ✅ `options` - 所有练习选项（包括用户自定义）
- ✅ `profile` - 用户个人资料
- ✅ `export_at` - 导出时间戳

**导入验证**:
- ✅ 验证数据结构完整性
- ✅ 支持部分数据导入（records/options/profile 任一存在即可）
- ✅ 成功/失败都有明确的 toast 提示

#### 4. UI 优化
**文件**: `app/page.tsx`
- 练习按钮备注字号从 `text-xs` 改为 `text-[10px]`
- 导入/导出弹窗按钮颜色统一为全局绿色主题
- 导入弹窗背景提示信息调整为红色边框（与导出区分）

**技术实现**:
```typescript
// useLocalStorage 默认值改为空数组
const [options, setOptions] = useLocalStorage<PracticeOption[]>('ashtanga_options', []);

// useEffect 只在初始化时设置默认值
useEffect(() => {
  if (!options || options.length === 0) {
    setOptions(DEFAULT_OPTIONS);
  }
}, []);

// 导入逻辑使用 toast 提示
const result = importData(json)
if (result) {
  toast.success('✅ 数据导入成功！', {
    duration: 3000,
    position: 'top-center'
  })
} else {
  toast.error('❌ 数据导入失败，请检查格式', {
    duration: 3000,
    position: 'top-center'
  })
}
```

**Git 提交**:
- `ec6fe96` - fix: 简化导入弹窗逻辑，使用toast显示成功/失败提示
- `1b5cbef` - fix: 修复练习选项编辑和删除后不保存到localStorage的问题
- `1c990fb` - fix: 修复刷新页面后自定义选项被重置的问题

**用户体验改进**:
- 导入/导出操作现在都有明确的视觉反馈
- 用户自定义的练习选项可以正确保存和恢复
- 刷新页面不会丢失用户设置
- Tab3（我的数据）功能完整且稳定

**下一步计划**:
- **P0**: 继续使用和测试，发现其他问题
- **P1**: 照片上传功能（Supabase Storage）
- **P2**: 数据备份提醒功能

**产品里程碑**: Tab3 数据管理功能达到可用标准 🎉

---

### 2026-01-14 初始对话
**核心问题**:
1. 如何验证这个需求？
2. 这个事情到底靠不靠谱？
3. 应该选什么平台？

**Claude建议**:
1. 先用最低成本验证（小红书 + Excel）
2. 用v0.dev做原型（美观度高，AI生成）
3. 1周内看出需求是否成立

**Orange反馈**:
- 飞书模板不够美观，吸引不了用户
- 认可AI开发路线（不会花5万块找开发）
- 同意先验证需求

**决策**: 按Week 1验证计划执行
明白你的意思了，我们将结构调整为更符合“练习档案”感的**时间线布局**，并将数据中心回归到**个人用户页**。

以下是根据你的最新想法更新后的《阿斯汤加打卡 App 功能与结构需求文档》：

---

这是一份基于我们深度头脑风暴后整理的完整产品定义文档。它将作为你后续使用 AI（如 v0.dev 或 Claude Code）开发及进行市场验证的“蓝图”。

---

# 阿斯汤加打卡 App (Ashtanga Log) 产品定义文档

## 1. 项目概述

* **产品定位**：一个极简、专注、具有仪式感的阿斯汤加瑜伽练习记录工具。
* **核心理念**：简单到极致。拒绝教学、拒绝社交，只做练习后的身体觉察与档案记录。
* **目标用户**：有 3 年以上练习经验或长期坚持的资深阿斯汤加练习者（非新手）。

---

## 2. 页面架构与交互逻辑

### A. 首页：静谧的起点 (Practice)

* **视觉中心**：一个半透明磨砂质感的大圆按钮，在计时过程中会随 **Ujjayi 呼吸频率**（4-6秒/周期）缓慢放大与缩小，提供微弱的节奏引导。
* **快捷选择（按钮上方）**：
* 一序列 Mysore
* 半序列 Mysore
* 一序列口令课 (Led Class)
* 自定义 (Custom)


* **操作逻辑**：点击序列 -> 点击开始 -> 进入专注计时界面 -> 长按结束。

### B. 记录页：练习档案时间线 (Timeline)

* **布局逻辑**：采用“左日期、右内容”的档案式布局，让练习的厚度可视化。
* **左侧 (Date)**：显示具体日期和星期。
* **右侧 (Card)**：
* **练习元数据**：序列名称、精准练习时长。
* **成就标记 (Star)**：如果当日勾选了“突破时刻”，显示一个醒目的星星图标。
* **日记文字**：今日练习的身体觉察与感悟。
* **图片与 #Tag**：展示一张照片，并附带 `#体式名` 或 `#位置` 标签，方便后续通过标签筛选。



### C. 个人页：数据中心 (Me)
* **用户资料**：头像名字等基本信息
* **订阅管理**：管理 3 元/月或 30 元/年的订阅状态。
* **统计数据**：累计练习天数、累计练习总时长。
* **练习热力图**：展示一年内的练习分布，颜色深浅代表练习时长，让用户看到“复利”的痕迹。


---

## 3. 功能详情清单

| 功能 | 详情描述 | v1 版本状态 |
| --- | --- | --- |
| **精准计时** | 开始/结束手动触发，支持不锁屏下的呼吸灯动效。 | ✅ 核心功能 |
| **成就时刻** | 记录中的一个开关，标记今日是否有突破（如绑手、新体式）。 | ✅ 核心功能 |
| **#Tag 系统** | 上传图片时可自定义或选择标签，用于后续体式对比。 | ✅ 核心功能 |
| **补录功能** | 忘记计时时，允许手动添加日期、时长和序列。 | ✅ 核心功能 |
| **月相系统** | 自动标注 Moon Day 休息日，热力图特殊底纹。 | ⏳ 待开发 (v2) |
| **成就墙** | 汇总所有勾选了星星的里程碑时刻。 | ⏳ 待开发 (v2) |

---

## 4. 负向功能清单 (Why Not)

* **❌ 教学视频/音频**：用户是资深练习者，不需要在打卡工具里看视频。
* **❌ 大休息计时器**：练习结束已包含大休息，且练习场景多为多人教室，不宜频繁操作手机。
* **❌ 锁屏实时活动**：为了保持练习的绝对专注，减少手机消息干扰。
* **❌ 身体地图/量化指标**：身体感觉是复杂的，文字日记比生硬的打分更具深度。
* **❌ 社交排行榜**：瑜伽是内观的修行，不需要与他人竞争。

---

## 5. 商业模式与验证计划

### 商业模式

* **定价**：3 元/月 | 30 元/年（订阅制）。
* **收费逻辑**：核心计时功能免费；图片 #Tag 筛选、多图存储及未来的成就墙属于订阅功能。

### Week 1 验证标准 (Success Signals)

* **小红书测试**：发布包含“Timeline 档案感布局”和“呼吸感计时”的 UI 截图，收藏数 > 50。
* **用户反馈**：在调研的 10 个练习者中，超过 3 人表示愿意为“体式 #Tag 存档”付费。
* **自我验证**：Orange 自己用 Excel 模拟 Timeline 记录一周，确认“左日期、右日记”的模式确实能产生觉察。

---
---

## 开发日志

### 2026-02-23: 修复新建/补卡后编辑记录丢失问题 ✅

**阶段**: Bug修复（第十二轮最终修复）

**问题描述**:
- 新建记录 → 不刷新 → 编辑 → 保存 → 记录消失
- 刷新后记录恢复，但显示旧内容
- 再次编辑 → 仍然消失
- 再次刷新 → 才能正常编辑

**根本原因**:
- React 的 `setRecords` 是异步的
- `updateRecord` 中的 `prevRecords` 是旧状态，不包含新建的记录
- 编辑时传入的 ID 在 `prevRecords` 中找不到，导致更新失败

**解决方案**:
- 重写 `updateRecord`，直接操作 localStorage，不依赖 React 状态
- 步骤：
  1. 从 localStorage 读取最新记录
  2. 在本地数据中查找并更新
  3. 直接写入 localStorage
  4. 同时更新 React 状态（异步，但不依赖它）

**核心代码**:
```typescript
const updateRecord = (id, data, onSync) => {
  const now = new Date().toISOString();

  // 直接从 localStorage 读取最新记录
  const recordsStr = localStorage.getItem('ashtanga_records');
  const latestRecords = JSON.parse(recordsStr);

  // 查找并更新
  const updatedRecords = latestRecords.map(r =>
    r.id === id ? { ...r, ...data, updated_at: now } : r
  );

  // 直接写入 localStorage
  localStorage.setItem('ashtanga_records', JSON.stringify(sortedRecords));

  // 同时更新 React 状态
  setRecords(sortedRecords);

  // 触发同步
  setTimeout(() => onSync?.(updatedRecord), 100);
};
```

**诊断过程**:
1. 禁用同步功能 → 问题依旧 → 确定是本地保存问题
2. 添加详细日志 → 发现 ID 一致但找不到记录
3. 确认 `prevRecords` 不包含新记录 → 确定是 React 状态延迟
4. 重写 `updateRecord` → 直接操作 localStorage → 问题解决

**清理工作**:
- 移除所有诊断日志和 toast
- 移除3秒内禁止编辑的限制
- 移除点击编辑时显示 ID 的 toast
- 恢复同步功能（500ms 延迟）

**Git提交**:
- `69cb0ea` - fix: 重写 updateRecord，直接操作 localStorage
- `f831664` - cleanup: 移除诊断代码，恢复同步功能
- `23b21e1` - cleanup: 移除3秒编辑限制和ID显示toast

**测试结果**: ✅ 修复成功，新建记录后编辑不再丢失

**新发现问题** 🐛:
- 练习选项同步异常：后台只有13条记录，但10个用户应该更多
- 有用户自定义选项但在后台看不到
- 待 2026-02-24 调查

---

### 2026-01-25: 新用户教程记录系统 ✅

**目标**: 为新用户提供使用教程和示范

**核心功能**:
- ✅ 首次访问时自动添加3条教程记录（通过usePracticeData初始化）
- ✅ 修复练习类型显示：从数字ID改为完整字符串
- ✅ 教程日期使用固定日期：2026年1月1/7/10号

**3条教程记录**:

1. **首次练习教程**（2026-01-01）
   - 类型：一序列 Mysore
   - 时长：90分钟
   - 内容：🎉 开始记录你的阿斯汤加之旅！
     - 📝 如何记录觉察：身体感受、呼吸起伏、内心念头
     - 💡 小贴士：点击记录可以编辑或分享，完整编辑点击左侧区域

2. **突破时刻示范**（2026-01-07）
   - 类型：一序列 Led class
   - 时长：120分钟
   - 内容：🧘‍♂️ 今天的练习特别流畅，体式有了新的突破。超级开心
     - 🌟 突破时刻功能：记录里程碑、激励自己
     - 突破时刻：马里奇D终于可以自己绑上了

3. **休息日记录示范**（2026-01-10）
   - 类型：休息日 满月/新月
   - 时长：0分钟（不显示）
   - 内容：🌙 休息日也是练习的一部分。
     - 📖 如何记录休息日：恢复状况、期待、观察变化
     - 💤 休息是为了更好的练习，给身体时间成长

**技术实现**:
```typescript
// hooks/usePracticeData.ts - useEffect初始化
const storedRecords = localStorage.getItem('ashtanga_records');
if (!storedRecords || storedRecords === '[]') {
  const tutorialRecords: PracticeRecord[] = [
    {
      id: `tutorial-${Date.now()}-1`,
      created_at: now,
      date: '2026-01-01',
      type: '一序列 Mysore', // 完整字符串
      duration: 5400,
      notes: '🎉 开始记录你的阿斯汤加之旅！...',
      photos: []
    },
    // ... 其他2条记录
  ];
  setRecords(tutorialRecords);
}
```

**问题修复**:
1. ❌ 练习类型显示为数字（'1', '6'）
   - 原因：使用了option ID而非完整显示字符串
   - 解决：type使用完整字符串（如"一序列 Mysore"）
   - 结果：getTypeDisplayName自动截取显示"一序列"和"休息日"

2. ❌ 教程记录日期为当天
   - 原因：使用 `new Date().toISOString().split('T')[0]`
   - 解决：改为固定日期（2026-01-01, 2026-01-07, 2026-01-10）

3. ❓ 休息日时长为空
   - 结论：正常行为，duration=0时不显示（代码判断）

**时光轴间距问题**:
- 用户反馈：两条笔记之间间隔太近，文案连在一起
- 探索结果：记录之间没有垂直间距（motion.div无mb/mt类名）
- 建议：暂时不修改，等待用户实际使用反馈
- 方案：条件性间距（有内容时加间距，无内容时紧凑）

**练习备注显示问题**:
- 用户问题：练习类型下面要不要加上练习选项的备注？
- 分析：左侧列宽度只有70px，类型字体10px，不适合显示notes
- 建议：保持现有布局，不显示notes

**Git提交**:
- `5de6d73` - feat: 为新用户添加3条教程觉察记录
- `9354b13` - fix: 修复教程记录显示问题（练习类型和日期）

**部署状态**: ✅ 已推送到GitHub，Vercel自动部署完成

**用户体验**:
- 新用户首次进入tab1看到3条教程记录
- 点击记录可查看完整内容、编辑或删除
- 按照教程格式添加自己的练习

**下一步**:
- 继续使用和测试，发现其他问题
- P1: 照片上传功能（Supabase Storage）

**产品决策**: 符合"简单"理念，教程记录自动初始化，无需手动添加示范数据

---

### 2026-01-25: PWA原生应用封装完成 ✅

**目标**: 将Webapp封装为可安装的原生应用，无需应用商店审核

**核心功能**:
- ✅ PWA配置完成（manifest.json + Service Worker）
- ✅ Tab3添加PWA安装引导Banner（固定显示）
- ✅ Tab3左上角添加安装图标（点击触发）
- ✅ 智能检测用户系统和浏览器
- ✅ 根据系统+浏览器显示对应安装指引

**PWA特性**:
- 可安装到主屏幕，全屏运行，无浏览器地址栏
- 支持离线使用（Service Worker缓存）
- 图标：1024x1024全绿色icon.png
- 主题色：#4a7c59（绿色）

**安装指引**（Android）:
```
💡 安装到主屏幕方法
Chrome浏览器：点击右上角→ 选择添加到主屏幕
Edge浏览器：点击右下角→ 选择添加到手机
安装后可像App一样使用，获得最佳体验。
```

**技术实现**:
- `public/manifest.json` - PWA配置文件
- `public/sw.js` - Service Worker（离线缓存）
- `components/ServiceWorkerRegister.tsx` - 注册组件
- `components/PWAInstallBanner.tsx` - Banner组件
- `hooks/usePWAInstall.ts` - 安装逻辑hook

**浏览器兼容性**:
- 支持：Chrome、Safari、Edge、Samsung Internet
- 不支持：夸克、UC、小米、华为（不显示引导）

**Git提交**: 17个提交（fde2475 → 9d50e7c）

**部署状态**: ✅ 已推送到GitHub，Vercel自动部署完成

**用户体验**: 
- 两个提示入口（Banner固定 + Toast点击）
- 文案统一，覆盖主流浏览器
- 一键安装，无需审核，跨平台（iOS+Android）

**下一步**: 继续使用和测试，发现问题

---

### 2026-03-05: 小红书群邀请弹窗更新 ✅

**阶段**: UI优化（弹窗交互简化）

**需求背景**:
- 原有弹窗使用文本框 + 复制按钮的方式邀请用户加入小红书群
- 用户体验不够直观，需要简化为图片展示 + 一键关闭

**核心改动**:

#### 1. 文案改为图片展示
**文件**: `components/XiaohongshuInviteModal.tsx`
- 移除 `XIAOHONGSHU_INVITE_TEXT` 常量（原有复制文案）
- 移除复制框 UI（textarea + 复制按钮）
- 添加图片显示区域（使用 next/image）
- 图片路径: `public/进群方法.png`

**代码变更**:
```tsx
// 之前：复制框
<div className="bg-secondary/50 rounded-xl p-3 space-y-2">
  <p className="text-xs text-muted-foreground font-mono">📋 复制下方内容</p>
  <div className="bg-background rounded-lg p-3 text-xs text-muted-foreground font-mono break-all select-text">
    {XIAOHONGSHU_INVITE_TEXT}
  </div>
</div>

// 现在：图片展示
<div className="rounded-xl overflow-hidden border border-border">
  <Image
    src="/进群方法.png"
    alt="进群方法"
    width={400}
    height={300}
    className="w-full h-auto"
    priority
  />
</div>
```

#### 2. 按钮交互简化
**文件**: `components/XiaohongshuInviteModal.tsx`
- 按钮文案从 "一键复制" 改为 "马上去加入"
- 移除 `handleCopyAndJump` 函数（包含剪贴板操作和 toast 提示）
- 点击后直接调用 `onClose()` 关闭弹窗
- 移除 `copied` state 和 `useState` 导入
- 移除 `toast` 和 `Copy` icon 导入

**代码变更**:
```tsx
// 之前：复制功能
const handleCopyAndJump = async () => {
  await navigator.clipboard.writeText(XIAOHONGSHU_INVITE_TEXT)
  setCopied(true)
  toast.success('✅ 已复制！打开小红书即可自动识别')
}

// 现在：直接关闭
const handleJoin = () => {
  onClose()
}
```

#### 3. 版本号更新
**文件**: `components/XiaohongshuInviteModal.tsx`
```tsx
// 版本号 - 每次更新文案时修改此版本号
export const INVITE_VERSION = 'v2'  // 从 v1 更新到 v2
```

**作用**: 版本号变化会触发红点提示，让用户知道有更新

**Git提交**:
- `c2d4b66` (master2) - feat: 更新小红书群邀请弹窗为图片展示
- `cdccd4d` (master) - feat: 更新小红书群邀请弹窗为图片展示

**文件变更**:
| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `components/XiaohongshuInviteModal.tsx` | 修改 | 弹窗组件重构 |
| `public/进群方法.png` | 新增 | 进群方法图片（2.2MB） |

**验证方法**:
1. 清除 localStorage 测试红点显示:
   ```javascript
   localStorage.removeItem('xhs_invite_read')
   localStorage.removeItem('xhs_invite_version')
   location.reload()
   ```
2. 点击头像查看弹窗是否正常显示图片
3. 点击"马上去加入"按钮弹窗是否关闭

**下一步计划**:
- 继续观察用户反馈
- 根据进群转化率决定是否进一步优化

---

### 2026-02-26: NotebookLM自动化流程完成 ✅

**阶段**: 小红书文案生成自动化

**核心功能**:
- ✅ NotebookLM MCP自动化控制脚本
- ✅ 文案生成并同步到飞书知识库
- ✅ 飞书表格状态管理

**NotebookLM输入格式**:
```
以"[主题内容]"为主题，帮我写3个不同角度的小红书文案
```
- NotebookLM已内置提示词，无需重复
- 自动生成3个角度：对话叙述型、痛点共鸣型、干货分享型

**飞书同步流程**:
1. MCP控制Chrome打开NotebookLM
2. 输入主题，自动生成文案
3. 移除Markdown `**` 加粗格式（飞书/小红书不支持）
4. 创建文档到"📁 02-创作中"文件夹
5. 添加状态管理区块（带跳转链接）
6. 创建飞书表格记录

**飞书表格字段**:
- 选题/灵感: 文本
- 排期日期: Unix时间戳（毫秒）
- 状态: 🟡待生成/🟠待审核/🟢待发布/🔵已发布/⏸️暂停
- 知识库链接: 链接
- ~~文案角度~~: 已删除

**技术实现**:
- `input_and_send.py` - MCP+Playwright自动化输入
- `sync_generated_to_feishu.py` - 飞书同步脚本
- `get_wiki_nodes.py` - 知识库节点查询

**文档存放位置**:
- Node Token: `UkvnwPEwoioBXxkd0RXcINlcnqd` (📁 02-创作中)

**规范固化**:
- 创建 `CONTENT_RULES.md` 记录所有格式规范
- 禁止 `**` 加粗语法
- 正确的NotebookLM输入格式
- 完整的同步流程

**Git状态**: 工作区有未提交文件（generated_马年第一练.md等）

**下一步**:
- 测试更多选题的自动化流程
- 优化状态管理区块的交互

---

## 2026-04-29 - Tab2 绑定邮箱提醒条 + 公告弹窗 v4

**提交**：
- `6fb7add` feat: Tab2 顶部绑定邮箱提醒条（金色可点击，未登录可见）
- `477d8be` fix: 提醒条文案改为5.1统一发放
- `a0610f2` feat: 更新公告弹窗v4 - 新群链接+新图片+文案更新
- `ea86a99` fix: 添加公告图片 xhs-join-group2.jpg

**改动1：Tab2 顶部绑定邮箱提醒条**
- 位置：`app/practice/page.tsx` JournalTab 组件，MonthlyHeatmap 上方
- 条件：`!user` — 已登录用户不显示
- 样式：金色 `#C1A268`，`text-[11px]`，`pl-4` 对齐 SyncButton
- 交互：可点击，触发 `onOpenFakeDoor`（与云同步图标相同弹窗）
- 文案：`👇绑定邮箱，免费领 62 天 Pro 会员（5.1统一发放）`
- **⚠️ 5.1 后需手动删除**

**改动2：公告弹窗 v4**
- `components/XiaohongshuInviteModal.tsx`
- INVITE_VERSION: v3 → v4
- 新群链接：ZH9565
- 新图片：`public/xhs-join-group2.jpg`
- 主文案去掉"被禁言"，改为"欢迎进小红书交流群"
- 副文案去掉"也防丢失"

**工程评审**：
- Eng Review: CLEAN（0 issues, 0 critical gaps）
- Design Review: CLEAN（9/10，从灰色改为金色+可点击）

---

## 2026-05-13: 热力图月相标记 + 完成弹窗可编辑 ✅

**类型**: 功能优化

**状态**: 已推送

### 变更内容

1. **热力图月份排序修正** — 从 12→1 月倒序改为 1→12 月正序，更符合阅读直觉

2. **热力图新月满月标记** — 在热力图中标注新月和满月日期
   - 无练习的月相日：灰色底圆 + 月相 PNG 图标（115%大小）
   - 有练习的月相日：绿色渐变圆点 + 2px 黄色小圆点居中标示
   - 月相数据来源：`lib/moon-phase-data.ts`（全年 24 个月相日）

3. **完成练习弹窗全字段可编辑** — 日期、练习类型、时长现在都可以在完成弹窗中直接修改
   - 之前只能改时长，日期和类型只读
   - 新增日期选择器（DatePickerModal）和类型选择器（TypeSelectorModal）
   - 保存时同时写入 date、type、duration

### 涉及文件
- `app/practice/page.tsx` — 热力图月相标记 + 完成弹窗可编辑 + 月份排序

### 提交记录
- `93b2a76` - 完成练习弹窗中日期和练习类型改为可编辑
- `5ceb873` - 月相图标放大至115%
- `44bf1b3` - 无练习月相日加灰色底圆，黄点缩至2px
- `b7597a1` - 有练习月相日改回绿底+小黄点(3px→2px)
- `15c237f` - 热力图月相改用PNG图标，有练习日左绿右图标分割
- `d60c9e5` - 热力图添加新月满月标记（黄色圆点/绿底黄芯）
- `3b906b6` - 完成练习弹窗中日期/类型/时长改为可编辑
- `e7e6a6b` - 热力图月份改为1月→12月正序排列
- `d2e4fc2` - 更新项目日志

---

## 2026-05-12: 热力图重构 + 连续周数算法修复 ✅

**类型**: UI 重构 + Bug 修复

**状态**: 已推送

### 变更内容

1. **热力图重构** — StatsTab 热力图改为按月分组，全年12个月显示（1月1日~12月31日）
   - 固定 16 列网格，所有月份统一对齐
   - 月份从 12 月到 1 月倒序排列
   - 月份标签：宋体+斜体，对齐第一行
   - 圆点尺寸 14px，带圆角
   - 颜色 5 级渐变玻璃质感：`green-gradient-light` / `green-gradient` / `green-gradient-deep` / `green-gradient-deep+shadow`

2. **连续周数算法修复** — 不再用滚动窗口，改为检查相邻练习间隔是否 ≤7 天
   - 旧算法：每个 7 天窗口只要有练习就算连续，导致 4/30~5/11 间隔 12 天仍显示 5 周
   - 新算法：相邻练习间隔 >7 天即断开，正确显示实际连续周数

3. **去掉年视图切换按钮** — 固定显示当前年份，去掉 2026 标签

### 涉及文件
- `app/practice/page.tsx` — StatsTab 热力图重构 + 连续周数算法修复

### 提交记录
- `b1c48fa` - 去掉2026年标签
- `ecdbc11` - 修复连续周数算法
- `151a29a` - 月份标签：宋体+斜体，对齐第一行
- `763c034` - 修复：全年显示12个月、恢复绿色渐变圆点样式
- `22bc1a8` - 热力图简化：固定年视图、圆点、12月→1月倒序
- `5d7990a` - 重构热力图：按月分组、统一16列、年/季视图

---

## 2026-05-22: 草稿云端清理修复 + 同步日志增强

**类型**: Bug 修复

### 修复：取消弹窗草稿时同步删除云端孤立记录

**背景**: 用户反馈选择「使用云端数据」后，刚写的觉察笔记被空白内容覆盖。

**根因**:
1. CompletionSheet / AddPracticeModal 打开时通过 `addRecord` 创建草稿记录（用于照片上传）
2. `autoSync` 将草稿上传到云端 Supabase
3. 用户取消弹窗 → 草稿仅通过 `deleteRecord` 从本地 localStorage 删除
4. 云端孤立草稿累积 → 触发「本地1条，云端N条」假冲突
5. 用户选择「云端」→ 云端空白草稿覆盖本地实际笔记

**修复**: 所有取消草稿路径改为调用 `handleDeleteRecord`（执行本地删除 + Supabase 软删除），而非仅 `deleteRecord`。

### 增强：同步日志记录触发原因和数量

**背景**: 数据冲突时无法追踪同步触发原因和两端数据量。

**变更**:
- `SyncLogEntry` 新增 `triggerReason`, `localCount`, `remoteCount` 字段
- `addLog` 新增 `extra` 参数传入以上字段
- `autoSync` 接受 `triggerReason` 参数，传递到所有子步骤
- 所有 8 个同步触发点均已标注原因（保存后同步/编辑后同步/应用启动自动同步等）
- Debug log 导出所有练习记录（含完整 notes/photos URL），不限最近 10 条

### 涉及文件
- `app/practice/page.tsx` — 取消草稿路径改为 handleDeleteRecord；全部 8 个 autoSync 触发点标注原因
- `hooks/useSync.ts` — SyncLogEntry 增强；addLog 支持 extra 参数；autoSync 传递 triggerReason
- `components/DataConflictModal.tsx` — UI 优化（无功能变更）
- `components/DebugLogModal.tsx` — 简化 UI，去掉复制按钮

### 提交记录
- `89c0e9a` - fix: 取消草稿时同步删除云端孤立记录，防止假冲突覆盖用户笔记

---

## 2026-05-22: 口令跟练音频边下载边播放 + 网站加载优化

**类型**: 性能优化

### 1. 口令跟练音频流式播放

**背景**: 用户反馈口令跟练音频（43 MB）首次使用要等很久才能播放，体验差。

**根因**: 代码先把整个文件下载为 ArrayBuffer，再创建 Audio 播放。42 MB 文件首次下载需要等待几十秒。

**方案**:
- 缓存未命中：`new Audio(url)` 直接流式播放（1-2 秒开始），浏览器原生支持 HTTP Range 流式加载
- 后台静默缓存到 IndexedDB（不阻塞播放，`priority: 'low'`）
- 缓存命中：IndexedDB → Blob URL → Audio（秒开，不变）
- Service Worker 排除 `/audio/` 路径，确保 Range 流式播放不被拦截
- 修复 Blob URL 内存泄漏（用 ref 追踪，结束时 revokeObjectURL）
- 修复重试按钮调用未定义函数的 Bug

### 2. 网站加载速度优化

**背景**: 用户反馈打开网站慢。

**根因**: `practice/page.tsx` 是 6,680 行的 `"use client"` 单文件，所有功能全塞在一起，没有任何懒加载。

**优化**:
- 删除未使用的 `recharts` 依赖（~200-300KB gzip 白送）
- 截图库删除 `html2canvas`，只保留 `modern-screenshot` 懒加载（~80KB）
- 12 个弹窗组件改为 `next/dynamic` 懒加载
- 字体优化：`Noto_Serif_SC` 4 字重 → 2 字重 + `display: 'swap'`，移除 `JetBrains_Mono` 和 `Playfair_Display`

### 3. Vitest 测试框架搭建

新增 4 个测试文件，共 65 个自动化测试：
- `__tests__/bundle-integrity.test.ts` — 依赖清理验证
- `__tests__/screenshot.test.ts` — 截图功能验证
- `__tests__/modal-lazy-loading.test.ts` — 弹窗懒加载验证
- `__tests__/font-optimization.test.ts` — 字体配置验证

### 4. Vercel Speed Insights

添加 `@vercel/speed-insights`，在 Vercel Dashboard 查看真实用户加载性能数据。

### 涉及文件
- `app/practice/page.tsx` — 流式播放 + 弹窗懒加载 + Blob URL 修复
- `lib/audioCache.ts` — downloadAndCache 新增 priority 参数
- `lib/screenshot.ts` — 重写，只保留 modern-screenshot 懒加载
- `public/sw.js` — 排除 /audio/ 路径
- `app/layout.tsx` — 字体优化 + SpeedInsights
- `app/page.tsx` — 接收 Playfair_Display
- `vitest.config.ts` — 新建测试配置
- `__tests__/` — 新建 6 个测试文件

### 提交记录
- `e6464bb` - feat: 口令跟练音频边下载边播放
- `6ba3b69` - test: 搭建 Vitest 测试框架 + 音频缓存和播放测试
- `ff94251` - fix: 流式播放时隐藏下载进度条，后台缓存完全静默
- `82c7219` - perf: 网站加载速度优化 — 减少初始 JS ~400-500KB
- `7a65d5f` - feat: 添加 Vercel Speed Insights 性能监控
