# 待处理问题

## 2026-08-07 - 更新小红书群链接文案 ⏰

**到期日**: 2026-08-07

**改动文件**: `components/XiaohongshuInviteModal.tsx`
**改动位置**: 第 10 行 `XIAOHONGSHU_GROUP_TEXT` 常量

**操作**: 生成新的群链接文案，替换旧文案。

当前文案（8月7日前的模板）：
```
8【复制全文→返回薯队APP】 仅限8月7日内，"🆓熬汤日记App交流群"等你很久了 MU525
```

**注意**：每次更新后版本号前缀（如 8→9→10...）和日期、群口令都要换。

---

## 2026-07-03 - SEO / GEO 增长计划 ⏳ 开发完成，待发布验收

完整计划：[`docs/growth/SEO_GEO_GROWTH_PLAN.md`](./docs/growth/SEO_GEO_GROWTH_PLAN.md)

已确认：

- [x] 中文市场优先
- [x] 网站定位为“阿斯汤加记录工具 + 小白科普 + 个人练习感悟”
- [x] 明确不是专业教学网站，不提供体式教学、动作纠错或身体调整
- [x] 首批建设 9 个常青页面，后续低维护
- [x] 公开作者使用“烧冰冰”，关联小红书主页
- [x] 公众号使用“阿斯汤加-熬汤日记”，作者页、文章底部和页脚展示二维码
- [x] 内容运营真源为 `D:\BaiduSyncdisk\work\cursor app\xiaohongshu内容运营`
- [x] 不搬运外部笔记；原创稿和内容单元用于改编，运营数据用于确定优先级

下一步：

- [ ] 阶段 0：站长平台收录与流量基线待人工补录
- [x] 已建立 20 个 SEO 查询和 20 个 GEO 问题的固定测试集
- [x] 已完成首批 9 页的关键词、素材、来源与 CTA 映射
- [x] 百度已完成首次网站提交，品牌词“熬汤日记”可以搜到
- [ ] 百度记录当前索引量、展现量、点击量，并添加非品牌定制关键词
- [ ] 首批公开页面上线后，只提交新增 canonical URL 和更新后的 sitemap
- [x] 阶段 1：四类模板、索引策略、结构化数据和自动化测试已完成
- [x] 首批 9 个计划页面已完成，另有 `/tools` 聚合入口
- [x] 因图片版权有争议，已撤销 `/poses` 与全部 5 个公开体式详情页
- [x] 体式页面已移出 sitemap、首页、公开导航、内部链接和测试集
- [x] App 内不增加公开科普入口，现有体式库产品功能保持不变
- [x] 首页、知识中心、作者页和页脚已统一非教学定位
- [x] 55 个测试文件 / 562 项、TypeScript 和轻量 lint 通过
- [x] 联网生产构建通过，33 个路由完成静态生成，构建清单中无 `/poses`
- [x] 手机、平板、桌面响应式检查通过；修复公开导航在 375px 手机上断字
- [x] 真实页面 canonical、Article / BreadcrumbList JSON-LD 已核对
- [x] 公众号二维码已由用户确认无问题
- [ ] 用户查看 master2 页面布局并最终确认作者简介
- [x] 公开内容升级为瑜伽杂志版式：刊头、卷期、编号目录、窄正文栏和作者档案
- [x] 杂志版手机、平板和桌面响应式检查通过
- [ ] 部署后复查生产域名上的抓取、内部链接、CTA 和二维码
- [ ] 部署后向 Google、Bing、百度提交 sitemap 与新增 canonical URL
- [ ] 上线 30 天内只观察抓取、索引和非品牌词展现，不新增第二批页面

## 2026-07-01 - 公众号先行导流，小程序准备阶段 ⏳ 进行中

### 当前决策

- [x] 公众号已注册
- [x] 公众号第一阶段不开发复杂功能，先铺内容并导流到现有 WebApp
- [x] 现有 Next.js WebApp 继续作为主产品和会员承接端
- [x] 小程序使用 `weapp/` 原生客户端，复用现有 Auth、API、Supabase 数据与 RLS，不另建微信云业务数据库
- [x] 暂不接微信支付；会员继续使用现有激活码体系
- [x] 不把现有 Next.js/PWA 主工程整体迁移，也不切换 Taro
- [x] 首版沿用邮箱账号体系；微信身份绑定留待未来确有需求时评估

### 公众号：下一步优先执行

- [ ] 完善公众号名称、头像、简介和自动回复，品牌信息与 WebApp 保持一致
- [ ] 配置菜单：
  - 「开始使用」→ WebApp 首页
  - 「使用指南」→ 新手教程/帮助内容
  - 「联系作者」→ 微信号与会员激活说明
- [ ] 准备第一批基础内容：
  - 产品介绍：熬汤日记解决什么问题
  - 新手教程：打开、记录练习、查看日历与数据
  - 安装教程：如何把 WebApp 添加到手机桌面
  - 会员说明：免费版与 Pro 权益、季卡/年卡价格、激活方式
  - 数据说明：登录、同步、换设备和数据安全
- [ ] 每篇文章保留统一行动入口，引导用户打开 WebApp：`https://ash.ashtangalife.online`
- [x] 已决定第一阶段不添加影响链接观感的来源参数，使用平台后台、referrer 和站内事件观察
- [ ] 上线后观察：文章阅读量、WebApp 点击量、新注册数、首次记录完成数

### 小程序：账号与准入准备

- [x] 注册个人主体小程序，取得 AppID（wx7c2db098856e4ac4）
- [x] 名称「阿斯汤加-熬汤日记」与公众号一致，审核通过
- [x] 微信公众平台已配置服务器域名白名单（ash.ashtangalife.online + supabase）
- [ ] 提交小程序备案，开发与备案并行
- [ ] 核实个人主体下的会员展示、激活码、联系作者、外部链接及音频能力的审核边界

### 小程序：微信能力与网络探针 — 2026-07-09 已通过 ✅

- [x] 验证工程已创建在 `weapp/`（原生小程序框架）
- [x] 安装微信开发者工具
- [x] 导入项目并首屏正常加载
- [x] **探针 1**：API 连接成功 → `GET /api/stats/today` 返回 `{"count":39}`
- [x] **探针 2**：`wx.login` 可取得临时 code；尚未交换真实业务 token
- [x] **探针 3**：`wx.checkSession` 可检查微信侧会话；不代表熬汤日记账号已登录
- [x] **探针 4**：唱诵音频播放正常 → 前台播放通过
- [x] 服务器域名白名单已配置（request 合法域名：ash.ashtangalife.online + supabase）

### 小程序：三步功能迁移 ⏳ 进行中

**唯一开发总路线与验收标准：[`docs/weapp/DEVELOPMENT_PLAN.md`](./docs/weapp/DEVELOPMENT_PLAN.md)**

当前阶段：纯本地完整产品。
当前唯一下一步：微信开发者工具验收今日练习完整链路：普通练习、开篇唱诵、一序列口令、结束保存和觉察日记刷新；重点检查唱诵/口令按钮互斥、口令音频预热后的加载速度、远程口令音频合法域名、进度时间显示、暂停/继续、进退、切后台恢复。本地版完成前冻结账号同步和会员付费开发。

网页版到小程序逐项迁移矩阵：[`docs/weapp/UI_MIGRATION_MATRIX.md`](./docs/weapp/UI_MIGRATION_MATRIX.md)

本地/云端双模式进度：[`docs/weapp/LOCAL_DATA_MODE.md`](./docs/weapp/LOCAL_DATA_MODE.md)

#### 三 Tab 产品骨架

- [x] 原生底部导航：今日练习 / 觉察日记 / 我的
- [x] 登录页与业务页分离，登录成功进入今日练习
- [x] 最近记录迁入觉察日记
- [x] 账号与退出迁入我的
- [x] 确认网页版 `/practice` 为小程序唯一 UI 真源，不另做一套设计
- [x] 建立全部 UI 与功能迁移矩阵，采用逐 Tab 纵向完成而非先画全部静态页面
- [x] 今日练习删除杂志式刊头、方形卡片和说明性占位布局
- [x] 今日练习首轮复刻网页版品牌头、日期、三列选项和圆形开始按钮
- [x] 自定义悬浮圆角三 Tab 导航替换系统默认导航
- [x] 今日练习接入真实练习选项和今日练习人数
- [x] 2026-07-09：第一阶段游客模式——免登录入口、微信本地记录 CRUD、统一数据仓库、游客状态与持久进入
- [ ] 第二阶段账号本地缓存——按 `user_id` 隔离、离线写入、游客首次登录合并、冲突与重试
- [x] 真机验收今日练习视觉、选项数量和悬浮导航（模拟器已确认，真机待复验）
- [x] 2026-07-09：接通圆形开始按钮、本地计时、暂停/继续、结束/放弃、完成弹层、本机保存和重启恢复
- [x] 2026-07-09：修复日历色阶回退加载顺序，游客可补足第三个本地练习类型
- [x] 2026-07-10：完成/补录/编辑统一使用公共练习表单，替换原生日期和类型 picker
- [x] 2026-07-10：冷启动首页为小程序落地页；已看过落地页后自动进入今日练习；默认游客模式，只有明确进入账号模式才使用历史登录 session；默认练习选项为空时回退网页版默认值
- [x] 2026-07-10：重新核对小程序落地页；修复顶部安全区、圆形 logo、不可显示 SVG 图标、假换行、英文残留和基础动效
- [x] 2026-07-10：落地页二轮修正——6 个核心卡片图标改为网页版 lucide 同款本地 PNG；顶部安全区继续加高；两个“开始练习”按钮改回网页版深绿渐变 + 金色箭头；修复 `&amp;` 字面量和英文 slogan 换行
- [x] 2026-07-10：小程序 UI 素材包内化——复制/生成 logo、icon-light、icon-green、Moon Day、Tab、表单、音量、工具栏和落地页图标到 `weapp/images/`；运行时代码不再依赖网页 `public/`、线上 UI 图片或 `data:image` 图标
- [x] 2026-07-10：修复自定义练习弹层被底部悬浮导航盖住的问题
- [x] 2026-07-10：修复公共表单”解锁/突破”点击后被父级空 breakthrough 重置的问题
- [x] 2026-07-10：公共表单加入图片选择、预览、删除和本地 photos 保存字段
- [x] 2026-07-10：图片上传和全屏编辑入口改为网页版同款——位于觉察/笔记框右下角的两个绿色圆形按钮
- [x] 2026-07-10：移除完成练习弹层顶部重复显示的序列和时间摘要
- [x] 2026-07-10：加大”练习完成”标题与下方表单间距；修正全屏编辑”收起”箭头居中；顶部原生导航栏保持 logo/品牌主绿（原生栏不支持渐变）
- [x] 2026-07-10：唱诵倒计时圆圈位置修正——与计时大圆圈同一位置（flex:1 居中布局），玻璃效果改为 `rgba(255,255,255,0.3) + backdrop-filter: blur(8px)`
- [x] 2026-07-10：保存按钮修正为全宽——`.completion-save` 和 `.save-button` 均加 `width: 100%`、`min-width: 0` 等覆盖微信 button 默认样式
- [x] 2026-07-10：口令跟练（一序列）音频完整接入——新增 `services/guided-audio.js`、加载/播放/进度/失败/进退控制 UI；`practice-session.js` 支持 `initiallyPaused` 参数，加载期间不记时
- [x] 2026-07-10：practice.wxss 新增全套音频 UI 样式——加载卡片、旋转动画、错误卡片、进度条、进退按钮和步长选择器
- [x] 2026-07-10：practice.wxml 新增倒计时后三段音频 UI（加载中/失败/进度条）和进退控制；session 保存按钮宽度修正
- [x] 2026-07-10：今日练习音频链路收口——WXML 音频时间改为 JS 预格式化字段；一序列 44MB 口令音频改为远程 HTTPS 播放并移出审核包；`weapp/audio` 仅保留约 1.05MB 开篇唱诵音频；小程序自动化测试更新为 41 项通过
- [x] 2026-07-10：唱诵/口令按钮互斥与口令预热——打开唱诵会取消已选口令；选中口令会关闭唱诵；选中口令时提前 `preload()` 音频，点开始时复用已预热上下文；小程序自动化测试更新为 42 项通过

- [ ] 微信开发者工具验收今日练习完整闭环：普通练习开始/暂停/继续/结束/保存；保存后觉察日记月历、统计、时光轴同步刷新
- [ ] 微信开发者工具验收开篇唱诵：倒计时位置、播放、跳过、进入计时、结束保存
- [ ] 微信开发者工具验收唱诵/口令互斥：先开唱诵再点一序列应自动关闭唱诵；先选一序列再点唱诵应自动取消口令
- [ ] 微信开发者工具验收一序列口令：冷启动加载速度、选中后等待 3–5 秒再开始的预热速度、播放、暂停/继续、进退、步长切换、错误重试、切后台/回前台恢复
- [ ] 如果预热后一序列仍超过 2 秒才能播放，下一步优化音频源本身：faststart/切片/码率/CDN Range；不要把 44MB 音频重新打入小程序包
- [ ] 微信开发者工具验收公共表单：完成练习、补录、编辑三处日期/类型/时长/突破/色阶/笔记/右下角图片入口/全屏编辑行为一致
- [ ] 按网页版截图继续修正公共表单、日期月历、类型选择器和底部安全区视觉
- [x] 觉察日记接入真实按月记录与网页版 1–4 级日历色阶（修复存在记录但时长为 0 时不着色）
- [x] 觉察日记迁移六个日历工具按钮、Moon Day 图标/提示、月度统计卡和同月时光轴
- [x] 觉察日记补录、记录详情/编辑、四级颜色选择与软删除接入真实 Supabase
- [ ] 觉察日记继续接入日历标注、照片预览和分享卡
- [ ] 我的复刻网页版统计、会员和设置视觉
- [x] 底部导航首轮对齐网页版悬浮圆角导航，待真机视觉验收
- [ ] 微信开发者工具真机确认三 Tab 切换、登录导流和统一布局

#### 已完成并冻结：真实账号基础能力

- [x] 邮箱＋密码登录接入 Supabase Auth REST
- [x] 新用户复用邮箱、密码、验证码注册流程（代码完成，待真机注册验证）
- [x] 正确保存和刷新 access token / refresh token
- [x] 统一 Supabase 请求头：anon key + Bearer token
- [x] 实现退出、会话失效恢复和脱敏日志
- [x] 专用老账号联网验证：登录、用户查询、refresh token 轮换均通过
- [x] 微信开发者工具真机验证：WebApp 老账号登录、重启恢复（403 session_id 自动刷新修复后复验通过）
- [ ] 真机验证退出后回到登录页并可再次登录
- [ ] 真机验证新用户验证码注册
- [x] 登录/注册增加默认未勾选的《用户协议》《隐私政策》复选框
- [x] 未同意协议时禁止登录、注册和获取验证码
- [x] 双协议使用可滚动弹窗展示完整正文
- [x] 完成协议工程审查：[`docs/weapp/AGREEMENT_REVIEW.md`](./docs/weapp/AGREEMENT_REVIEW.md)
- [ ] 上线前确认 Supabase 实际部署地域；涉及境外处理时补充单独同意
- [ ] 微信公众平台隐私保护指引与代码正文核对一致

#### 历史阶段：只读数据展示

- [x] 最近练习记录（代码完成，待真机核对数量与内容）
- [ ] 日历与按日查看
- [ ] 基础统计
- [ ] 会员状态
- [ ] 验证同一账号两端数据一致与 RLS 隔离

#### 后续阶段：账号本地缓存、写入闭环与跨端同步

- [ ] 新增、编辑、软删除练习记录
- [ ] 保存防重复、失败重试和必要的幂等保护
- [ ] 验证小程序写入后 WebApp 正确下载，不反向覆盖
- [ ] 验证 WebApp 写入后小程序可见
- [ ] 验证冲突、删除、连点保存和网络恢复不会丢失或重复数据

### 暂不执行

- 不切换 Taro，不重写现有 WebApp。
- 不先做微信云数据库版练习记录。
- 首版不做微信身份绑定；未来按真实需求评估。
- 不承诺“几天完成全量迁移”。
- 暂不启动下方旧的「练习选项固定槽位系统」，避免在小程序准备期同时扩大同步风险。

## 2026-06-26 - 解耦重构收尾：进入维护模式 ✅ 已完成

- [x] 核心阶段 1–6 已完成，停止“为了拆而拆”
- [x] `app/practice/page.tsx` 已在目标范围内，不再为了降到 800 行硬拆
- [x] `hooks/useSync.ts`、`lib/sync-utils.ts`、`components/AuthModalForms.tsx` 暂不主动拆
- [x] 后续拆分标准改为：真实痛点、风险、改动频率、测试收益
- [x] 会员激活 API 最后一刀已完成：route 顶层编排 + 内部 helper 分层，响应与行为不变
- [x] 会员激活 API 对口测试已补齐：覆盖 8 个 activate 场景；全量 Vitest 49 文件 / 535 项通过
- [x] 照片上传限制与友好提示已完成：免费 5 MB / Pro 30 MB；全量 Vitest 49 文件 / 539 项通过
- [x] 会员开通入口已收口：会员提示弹窗内直接展示权益对比、激活码入口和开发者微信复制入口

下一步：优先处理业务增长/获客/转化、线上 bug、安全问题。不再保留默认“下一刀”；只有出现具体维护痛点时再小刀优化。

## 2026-06-25 - L5 真实云端测试模板与说明 ✅ 已完成

- [x] 新增 `.env.test.example`，给出 L5 必需环境变量模板
- [x] 新增 `docs/guides/L5_TESTING.md`，说明测试账号、白名单、reset 流程、常见失败
- [x] `.gitignore` 继续忽略真实 `.env.test`，但允许提交 `.env.test.example`
- [x] `docs/guides/DEVELOPMENT.md` 和恢复入口已链接 L5 专门说明
- [x] 本地 `.env.test` 已填写并验证：`npm.cmd run test:L5` 3 文件 / 8 项通过

下一步：保持 `.env.test` 本地私有；如改动 Supabase/auth/sync，再跑 `npm.cmd run test:L5`。

## 2026-06-25 - 百度 SEO 补齐：发现型关键词覆盖 ⏳ 代码已完成，待分支合并后提交百度

**目的**：让用户在百度搜索"阿斯汤加 记录"、"瑜伽 打卡工具"等发现型关键词时能搜到官网。

**诊断背景**：品牌词"熬汤日记"已能搜到，但发现型关键词无排名。当前每日 intake 仅 ~1 人，瓶颈在获客通道。

### 已完成的代码改动（在 master2 分支）
- [x] `app/layout.tsx` — title/description 加入发现型关键词
- [x] `app/seo/page.tsx` — 新增 SEO 着陆页（纯服务器组件）
- [x] `app/sitemap.ts` — 新增 sitemap.xml
- [x] `app/robots.ts` — 新增 robots.txt 指向 sitemap

### 当前百度状态与下一步
- [x] 百度搜索资源平台已提交网站
- [x] 品牌词“熬汤日记”可以找到网站
- [ ] 非品牌词目前没有可见度，转入 [`SEO / GEO 增长计划`](./docs/growth/SEO_GEO_GROWTH_PLAN.md) 执行
- [ ] 首批新页面上线后提交新增 URL 和更新后的 sitemap
- [ ] 观察索引量、展现量、点击量和落地页，不再重复提交相同首页

### 来源
- dbs-diagnosis 商业模式诊断（2026-06-25）
- 用户选了搜索流量路径（B），而非内容分发扩量（A）

## 2026-06-25 - README / 开发说明归档 ✅ 已完成

- [x] README 增加开发维护入口、当前验证基线、核心文档链接
- [x] 新增 `docs/guides/DEVELOPMENT.md`，说明日常启动、门禁命令、L4 seed、L5 `.env.test` 要求
- [x] 恢复入口文档已把下一步推进到 L5 真实云端环境可重复化

下一步：固化 L5 `.env.test`、测试账号和 reset 流程。

## 2026-06-25 - L4 登录态稳定化 ✅ 已完成

- [x] 登录态 L4 用例改为本地 seed 固化，不再依赖测试账号已有云端记录
- [x] Journal 补录、分享卡、Settings 导出路径从条件 skip 改成真实断言
- [x] `npm.cmd run test:L4`：51/51 通过，0 skipped

下一步：README/开发说明已完成；继续固化 L5 `.env.test` 与真实云端测试账号。

> 当前解耦阶段与完整测试缺口以 `docs/architecture/DECOUPLING_ROADMAP.md` 和 `docs/architecture/DECOUPLING_TEST_MATRIX.md` 为准。本文件只保留当前执行项。

## 2026-06-25 - 重构审核补漏 ✅ 已完成

- [x] TypeScript 门禁恢复：`npm.cmd run typecheck` 通过
- [x] Vitest 全量恢复：49 文件 / 527 项通过
- [x] L4 smoke 恢复：4/4 通过
- [x] 生产构建通过
- [x] 首屏 JS 复测：16 scripts / 1117.0 KiB raw / 335.5 KiB gzip
- [x] 文档同步：恢复入口、路线图、测试矩阵、性能基线、项目日志已更新

下一步：README/开发说明已完成；如需完整 L5，全量验证前先配置可访问的 `.env.test`/测试云端环境。

## 2026-06-25 - 阶段 6 测试暴露的 3 个缺陷 ✅ 已修复

**来源**: 阶段 6 测试通过 `EXPOSES GAP` 断言暴露，已全部修复并改为 `VERIFIES FIX` 测试。

### 缺口 1：`reset-password` 无幂等机制 ✅ 已修复

**问题**: `app/api/auth/reset-password/route.ts` 不消费任何验证码或一次性 token，可重复触发密码重置。

**修复**: 重置密码现在强制要求 `code` 字段，查询 `verification_codes` 表 `type='reset_password' && used=false && 未过期` 的记录，成功后标记 `used=true`。与 `register`/`verify-code` 的单次消费机制对齐。

**测试**: `__tests__/api-auth-routes.test.ts > VERIFIES FIX: 同一验证码第二次调用失败（已被消费）`

### 缺口 2：`send-verification-code` 无防刷限频 ✅ 已修复

**问题**: `app/api/auth/send-verification-code/route.ts` 没有任何速率限制，可对同一邮箱无限触发。

**修复**: API 入口处加 60s 限频——查询 `verification_codes` 表该邮箱最近一条 `created_at`，未过 60s 则返回 429。查询失败时 fail-open（避免误伤用户）。

**测试**: `__tests__/api-auth-routes.test.ts > VERIFIES FIX: 60s 限频：第一次成功，后续被拒绝`

### 缺口 3：Stats Tab 切换不保持滚动位置 ✅ 已修复

**问题**: 切到其他 Tab 再切回 stats 时，`scrollTop` 重置为 0。原因：AnimatePresence exit 动画先于 unmount 把 scrollTop 重置为 0，最初尝试在 unmount cleanup 中读取已无效。

**修复**: 改用「scroll 事件实时保存 + sessionStorage 持久化 + mount 时轮询恢复」三段式策略。
- `scroll` 事件 listener 用 rAF throttled 实时把 scrollTop 写入 sessionStorage
- mount 时读取 sessionStorage，轮询最多 15 次（每次 100ms）等待异步内容撑起足够高度后再设置 scrollTop
- 选 sessionStorage 而非模块变量：dev 模式下 next/dynamic 可能重新求值模块导致变量重置；选 sessionStorage 而非 localStorage：重启浏览器后回到顶部是合理行为

**测试**: `__tests__/L4/tab.spec.ts > stats Tab 滚动位置：切走再切回保持`

## 2026-06-24 - 照片上传限制：免费 5 MB / 付费 30 MB ✅ 已完成

**问题**: 用户照片超过免费上限时上传失败，无友好提示
**日志**: `ashtanga-debug-log-2026-06-24.json`（3次 VALIDATION_FAILED：10.27MB / 10.58MB / 10.63MB）

### 方案
1. **免费用户**：单张照片上限为 5 MB，上传失败时展示友好提示
2. **付费用户**：单张照片上限为 30 MB（手机 ProRAW 最大约 25MB，30 MB 充裕）
3. **不做自动压缩** — 文件大小限制是免费与付费的差异点，"不爽"才有付费动力

### 涉及文件
- [x] `lib/oss.ts` — `validatePhotoFile` 支持免费/Pro 不同文件大小上限
- [x] `components/PracticeForm.tsx` — 上传时使用实时会员状态传入文件大小校验
- [x] 前端弹窗提示文案区分免费/Pro，并保留具体文件大小
- [x] `__tests__/oss-utils.test.ts` — 覆盖免费 5 MB、Pro 30 MB 与友好错误文案

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

## 2026-06-18 - 解耦阶段 3：媒体 Hook ✅ 已完成

**最终状态**：口令模式 L4 已闭环；修复启动时陈旧状态覆盖和失败后控制按钮隐藏。

- [x] 补唱诵倒计时、单次完成、音频失败、重复加载和跳转边界测试
- [x] 提取 `useGuidedAudio`
- [x] 提取 `useChantPlayback`
- [x] 确保页面不再持有 `HTMLAudioElement`
- [x] 完成普通练习与唱诵生产浏览器回归
- [x] 复验口令卡片 → 开始圆钮 → 加载/播放/失败 UI 的完整 L4 链路
- [x] 音频失败后普通计时仍可暂停、继续、结束和清理
- [x] 完成阶段 3 最终门禁并更新为已完成

## 下一执行项 - 解耦阶段 4：页面编排与按需加载

- [x] 提取 `PracticeDashboard`，保留页面中的选择与启动业务决策
- [x] 提取 `PracticeNavigation`，统一顶层覆盖层的导航显隐策略
- [x] 提取 `PracticeSessionView`：全屏计时、唱诵倒计时与口令控制已移出，完成保存/同步仍在页面
- [x] `PracticeModalHost` 第一部分：提取三步清空数据与唱诵设置状态机
- [x] `PracticeModalHost` 第二部分：收拢其余独立弹窗渲染接线，业务决策继续留在页面
- [x] 建立 `/practice` 首屏 JS 可重复基线；427.9 KiB → 333.8 KiB gzip（-22.0%）
- [x] 将 Journal/Stats/Poses Tab 真正改为按需加载
- [x] 建立可重复的首屏 JS 基线并比较下降幅度
- [x] 第七检查点：调试日志采集移入 `lib/practice-debug-log.ts`，页面 1829 → 1406 行
- [x] 提取记录/选项命令处理器；页面 1406 → 1157 行，阶段 4 行数门槛完成

## 2026-06-24 — L3+L5 测试矩阵补全 ✅ 已完成

- [x] Phase 1.1：useSync.ts `uploadLocalData` 加 `!user` 守卫 + `repoDeleteAllUserOptions` 返回值检查（与 records 分支一致）
- [x] Phase 1.2：L3 测试 `sync-isolation-and-rollback.test.ts`（4 项全部通过，主套件 440 项）
- [x] Phase 2：L5 测试基础设施（vitest.config.e2e.mjs + setup.ts + test-client + reset 脚本）
- [x] Phase 3：L5 测试文件编写（auth.smoke + sync.upload + sync.conflict 共 5 项）
- [x] Phase 4：测试矩阵文档更新（3 项缺口升级） + 项目日志
- [x] L5 端到端测试全部跑通（auth.smoke 4/4 + sync.upload 2/2 + sync.conflict 2/2）
- [x] 全量测试 444 项通过（+4 L3 + 8 L5）

## 下一执行项 - 解耦阶段 5：同步分层 ✅ 已完成

- [x] 第一刀：提取远端记录/选项/profile 的字段映射与归一化纯函数到 `lib/sync-mappers.ts`，新增 45 个纯函数测试（2026-06-23 完成）
- [x] 第二刀：Supabase I/O 提取到 `lib/supabase-repository.ts`：`fetchAllUserData` / `fetchCloudRecordsForMerge` / `upsertRecords/Option` / `deleteAllUserRecords/Option`（2026-06-23 完成）
- [x] 第三刀：提取共享的 `applySafeMerge` / `sortAndLimitRecords` / `buildUploadRecordPayload` / `resolveRecordColorLevel` 纯函数到 `lib/sync-utils.ts`，去重 ~93 行重复逻辑（2026-06-23 完成）
- [x] 第四刀：提取 `detectOptionChanges` / `detectProfileChanges` / `createSyncLogEntry` / `batchUploadRecords` / `buildOptionsUploadPayload`，useSync 首次低于 1000 行（2026-06-23 完成）
- [x] 第五刀：提取 sync orchestrator（`analyzeSync` / `executeConflictStrategy` / `computeSyncStats` / `recordPracticeIfNeeded`），useSync 897 行（2026-06-23 完成）
- [x] 合并 `uploadLocalRecords` / `uploadLocalData` 的 build+merge 重复逻辑为 `prepareRecordsForSafeUpload` 助手（2026-06-24）
- [x] 抽离 `getLatestLocalData` 为模块级 `readLatestLocalData` + 统一 syncDebug 日志（2026-06-24，useSync 955 → 879 行）
- [x] 最终精简：`exerciseConflict` 三分支提取 + `smartMerge` 归位（useSync 879 → 771 行）
- [x] **阶段 5 关闭**：771 行是合理终点，剩余 ~8 行 setState 重复是显式胜于隐式的 conscious tradeoff

## 2026-06-23 — 阶段 4 测试矩阵 L2 缺口覆盖 ✅ 已完成

- [x] `__tests__/stats-tab.test.tsx`（7 项）：空态、统计数据、免费/Pro 会员、设置按钮
- [x] `__tests__/journal-tab.test.tsx`（10 项）：CRUD 渲染/编辑/分享/补录、未登录态、突破笔记、多照片
- [x] 测试矩阵「日记 CRUD」L2 缺口已覆盖、「统计空态/会员入口」已覆盖

## 2026-06-23 — 阶段 5 L1 纯函数测试覆盖 ✅ 已完成

- [x] `sortAndLimitRecords` 6 项（排序、maxSync 限制、1000 条边界、不可变性）
- [x] `applySafeMerge` 7 项（各字段安全合并、mergeUpdatedAt）
- [x] `detectOptionChanges` 5 项 + `detectProfileChanges` 8 项（相同、单边、内容差异检测）
- [x] `trimSyncLogs` 4 项（单条、50 条上限、100KB 截断、空列表兜底）
- [x] 测试矩阵 3 项从「缺失/部分覆盖」升级为「已覆盖」

## 2026-06-24 — 阶段 5/6 测试缺口覆盖 + useSync 精简 ✅ 已完成

- [x] 旧版本导入兼容 L1 测试（17 项）
- [x] AuthModal 组件测试（21 项）
- [x] AuthModal 无障碍改进 + a11y 测试（9 项）
- [x] 1000 条限制 L3 集成测试（5 项）
- [x] handleDeleteRecord 同步路径测试（6 项）
- [x] 测试矩阵更新 5 项状态
- [x] syncDebug 日志统一（砍 ~55 行噪音）
- [x] getLatestLocalData 抽离为模块级函数
- [x] useSync 955 → 879 行（−76 行）
- [x] exerciseConflict 三分支执行逻辑提取（`computeSmartMergeData` → sync-utils.ts，`executeConflictStrategy` merge 修复）✅
- [x] smartMerge 归位（调用 `computeSmartMergeData`，useSync 872 行）✅

### 诚实评估 — useSync 最终精简 ✅ 已完成

**已达成**: useSync 879 → 771 行（−108 行）
- `computeSmartMergeData` → `sync-utils.ts`
- `smartMerge` / `executeConflictStrategy` / `resolveConflict` / `prepareRecordsForSafeUpload` 均归位到 orchestrator

**评估**: 771 行是合理终点。剩余 ~8 行 setState 重复是显式胜于隐式的 conscious tradeoff，`uploadLocalData` 三段提取会引入回调注入。阶段 5 关闭。

## 2026-06-24 - 阶段 6 测试缺口填充 ✅ 已完成

- [x] 照片验证纯函数（oss-utils.test.ts，12 项）
- [x] 照片日志全功能（photo-logger.test.ts，13 项）
- [x] OSS 网络函数边界（oss-network.test.ts，10 项）
- [x] API 注册路由输入验证（api-auth-routes.test.ts，7 项）
- [x] Pro/免费色阶函数（option-color-level.test.ts，16 项）
- [x] 照片上传验证 → 已覆盖（L1 + L3）
- [x] 免费/Pro 色阶 → 已覆盖（L1）
- [x] API 输入验证 → 部分覆盖（register route）
- [x] 更新项目日志、TODO、测试矩阵、路线图
- [x] 全量测试 **498 项通过**（+58 项，从 440 起）

## 2026-06-23 — 全站字体修正 ✅ 已完成

- [x] body 从 `font-sans` 改为 `font-serif`，全站文字统一宋体

## 2026-06-23 — 同步弹性 ✅ 已完成

- [x] 第一刀：`withRetry` 指数退避重试 + batch 逐批重试 + uploadLocalData 加固 + 失败 ID 持久化
- [x] 第二刀：`pendingSyncRef` 并发排队，同步结束后补调，不再静默丢弃
- [x] `__tests__/sync-retry.test.ts`（10 项）+ `__tests__/sync-upload.test.ts`（4 项）

## 2026-06-23 — 损坏数据防御 ✅ 已完成

- [x] `isValidRemoteRecord` + `mapRemoteRecord` null/undefined fallback
- [x] `fetchCloudRecordsForMerge` 返回过滤
- [x] profile 上传响应 JSON 格式校验
- [x] 新增 9 项测试（sync-mappers.test.ts）

## 2026-06-23 — 动态 Tab error boundary ✅ 已完成

- [x] 新增 `DynamicTabShell` error boundary 捕获动态模块渲染异常
- [x] 失败时显示「页面加载失败」+「点击重试」按钮，key 递增强制 remount
- [x] JournalTab / StatsTab / PosesTab 包裹 DynamicTabShell
- [x] `__tests__/dynamic-tab-error.test.tsx`（2 项）
- [x] 测试矩阵「动态模块 loading/success/error」升级为已覆盖

## 2026-06-23 — 导入导出纯函数 + 组件测试 ✅ 已完成

- [x] 提取 `lib/import-export.ts`（parseAndValidateImportData / sortRecordsByDate / migrateOldOptions / serializeExportData）
- [x] `usePracticeData` importData/exportData 改为调用提取函数
- [x] `__tests__/import-export-utils.test.ts`（25 项 L1 纯函数测试）
- [x] `__tests__/import-modal.test.tsx`（6 项 L2）
- [x] `__tests__/export-modal.test.tsx`（6 项 L2）
- [x] `__tests__/data-conflict-modal.test.tsx`（8 项 L2）
- [x] 测试矩阵「导入合法/非法、导出、三步清空」升级为已覆盖

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
- [x] 点击 Expand → 全屏覆盖层出现，textarea 自动聚焦
- [x] 输入文字 → 收起 → 文字保留在弹窗中
- [x] 字数计数器正常
- [x] 照片上传等其他功能不受影响

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

