# 微信小程序开发日志 — 熬汤日记

## 2026-08-13 - 删除照片时连 OSS 对象一起删（源头清理）✅ 代码完成，待部署

### 本轮改动
- 新增 `lib/oss-delete.ts`：原生 OSS V1 签名 `DELETE`（无需安装 SDK）；`extractOssKey` 校验 URL 归属，`deleteOssObjectByUrl` 支持按用户 id 前缀校验对象归属，404 视为成功。
- `POST /api/photos/delete-by-record`（小程序删除路径）与 `PATCH /api/photos/:id`（网页版删除路径）：在元数据软删**之后**尽力删除 OSS 对象；失败只记录、不影响删除结果。
- 效果：今后任何"删除照片"都会同时清掉 OSS 文件字节，从源头消除删除类孤儿。
- 测试：新增 `__tests__/oss-delete.test.ts`（签名 URL/归属/404/5xx）；typecheck + vitest + `223/223` 小程序测试通过。

### 说明与待办
- 前提：服务端 OSS AccessKey 需有 `oss:DeleteObject` 权限（通常在阿里云 RAM 里配）。
- 删除现在是"文件级不可逆"（元数据仍软删留痕，但字节即删）；当前产品无"撤销删除"功能，符合用户预期。
- 仍未覆盖：上传字节后未登记即退出的孤儿（方案 C 可能出现）→ 待方式二（Vercel 定时兜底清理）补。


## 2026-08-13 - 照片上传提速方案 C：保存不等元数据登记 ✅ 代码完成，待真机复验

### 本轮改动
- **方案 C = “传到上海 OSS 就算过”**：保存门从“等元数据登记完（慢 5s）”改为“等字节落地 OSS + 客户端 HEAD 校验（快 ~300ms）”。
- `weapp/services/photo-storage.js` 拆分：`uploadPhotoToOss()`（签名+PUT+客户端 HEAD 校验）与 `registerPhotoMetadata()`（POST /api/photos 登记）；原 `uploadPhoto()` 保留给后台同步路径。
- `weapp/services/data-repository.js` 表单即时上传：PUT 成功后立即 `replaceRecordPhoto`（照片显示成功、保存门放开），并把“上传”待办换成“登记”待办；尾部触发后台 `syncPendingRecords({includePhotos:true})` 补登记（有并发保护，不重复登记）；同步器新增 `photo/register` 分支。
- `weapp/components/practice-record-form/index.js`：保存时若照片登记仍在后台，轻提示“照片已上传，保存后自动同步”。
- 测试：新增 `photo-upload-split.test.js`；更新 `photo-storage.test.js`（HEAD mock、4 步断言）、`account-workspace.test.js`（新架构断言）；`223/223` 通过、包体门禁通过。

### 已知：删除照片只清元数据、不清 OSS 文件字节
- `POST /api/photos/delete-by-record` 只软删 `photos` 行并重建记录 photos 字段，**不删除 OSS 对象**。任何“删除照片”操作（含表单里移除已上传照片）都会在 OSS 留下孤儿对象字节。
- 已登记为待办：OSS 孤儿清理脚本（需 OSS 凭据）。

### 下一步
1. 真机验证：选多张→到 OSS 即“已上传”可保存；保存后登记后台补；时间轴正常；断网 PUT 失败仍拦保存。
2. 决定是否补做 OSS 孤儿清理脚本。

## 2026-08-12 - 真机日志(3)分析 + 时间轴加载更多 + 照片上传提速 ✅ 部分已部署/待真机复验

### 真机日志（ashtanga-debug-log-2026-08-12(3).json）结论
- `_meta.version = 3.0-weapp`、`diagnostics = full`；本会话 0 错误、0 网络失败，同步 0 pending，3 条记录、6 张照片云端健康。
- `server_timing` 已随请求日志导出：membership/status `auth;dur=344~644, profile;dur=234~628, membership_view;dur=222~228`；stats/today `practice_records;dur=664, daily_user_activity;dur=239`。
- 字体真机成功：`font_load_finish success` 2.44s，确认 `ERR_CACHE_MISS` 只是 Windows 开发者工具缓存误报。
- 照片上传诊断：单张 32KB 直传上海 OSS 仅 255ms；慢的是传完后 `POST /api/photos` 元数据接口 5.6s（美东 Vercel 串行 7 次远程调用）。

### 本轮改动
- **tab2 觉察日记时间轴“滚到底自动加载历史”已实现（对照网页版）**：`onReachBottom` 自动加载上一个月并追加，底部三态「加载中… / 上拉加载更多 / 已经到底啦~」，以最早记录日期为边界；切月历月份时重置已加载旧月份；新增 `weapp/tests/journal-load-more.test.js`，`220/220` 通过。
- **照片元数据接口并行化（未部署）**：`POST /api/photos` 把会员状态 / 已有照片数 / 记录归属校验 / OSS 对象大小校验从串行 4 次收敛为 1 批并行；响应体与错误规则不变，网页版无感知；typecheck + photos-api-integrity 测试通过。
- 小程序请求日志新增 `server_timing` 字段（`weapp/utils/request.js` + request-logging 测试）。

### 决定与下一步
- **Vercel 区域不改**（暂不迁移 hkg1/sin1）；照片提速备选方向：① 保存不阻塞（传完 OSS 即可保存、登记后台补，需改产品行为）② 客户端并发 2→4 + 批量签名 ③ 服务端批量登记接口 ④ 上传前压缩大图。
- 下一步：真机复验时间轴加载更多；下次发版带上照片接口并行化，再测单张/9 张上传耗时。


## 2026-08-12 - 服务端慢请求定位上线：Server-Timing + date 索引 ✅ 已部署，待真机复验

### 本轮结果
- 服务端两个慢接口（`/api/membership/status`、`/api/stats/today`）已加 `Server-Timing` 响应头，逐段计时 Supabase 调用；响应体完全不变，网页版/小程序无感知。
- 新增 `lib/server-timing.ts` 打点工具；`/api/membership/status` 计时 auth / profile / membership_view / 兜底查询；`/api/stats/today` 计时 practice_records / daily_user_activity。
- 新增 `supabase/migrations/20260812_add_practice_records_date_index.sql`：`practice_records(date)` 索引，消除 stats/today 全表扫描（已在生产 Supabase 执行成功）。
- 已 cherry-pick 到生产 master（`e7d6fc9b`）并推送，Vercel 自动部署完成；线上接口实测 `Server-Timing` 生效。
- 小程序请求日志同步记录 `server_timing` 响应头（`weapp/utils/request.js` + request-logging 测试），导出的 V3 JSON 可直接看到服务端各段耗时。

### 线上实测（本机请求/开发者工具，非真机）
- `stats/today`：`practice_records;dur=319~689ms`、`daily_user_activity;dur=208~619ms`。
- `membership/status`（开发者工具响应头）：`auth;dur=643.6, profile;dur=582.0, membership_view;dur=309.7` —— 三段串行合计约 1.5s，均落在 Vercel（sfo1::iad1，美东）↔ Supabase 的网络往返上，属区域延迟，非查询本身；剩余 ~3s 为冷启动。
- 字体 `ERR_CACHE_MISS`（Windows 开发者工具）：线上 WOFF 验证 200 / 295,564B / immutable / HIT / CORS 正常，属开发工具缓存小毛病；Android 真机此前实测字体成功加载（5.26s），非线上故障。

### 下一步测试
1. Android 真机正常使用一轮（含会员页/今日练习/觉察日记），清缓存后复测字体。
2. 导出一份 V3 JSON，核对 `_meta.version = 3.0-weapp`、`server_timing` 字段与会员/照片诊断无超时。
3. 若真机字体仍失败，再按预案把 WOFF 迁到国内 OSS/CDN。


## 2026-08-12 - 完整诊断日志 V3 ✅ 代码完成，待真机验收

### 与网页版对齐结果

- 从“设备 + 数量 + 时间线”升级为完整现场包：全部记录、练习类型、资料、标注、登录状态、会员状态、pending payload、同步冲突和照片引用均进入 JSON。
- 登录账号导出时额外发起只读云端快照，逐条比较本机工作区和云端有效记录，输出 `local_only / remote_only / divergent / matched`、变化字段、更新时间和较新一侧。
- 照片部分与网页版保持同样的健康检查边界：全部照片写入引用清单，最近 12 个唯一对象以 4 并发、单张 3 秒超时检查。其余照片没有被丢弃，只是不额外发起 HEAD 请求。
- 同步部分保留全部待同步 payload、孤儿操作、100 条工作区同步日志、冲突解决和失败记录，可还原“本地写入 → 排队 → 合并 → 上传/失败”的完整过程。
- 运行时间线按网络接口聚合，并拆出页面、认证、同步、照片、会员/支付、字体分区；事件容量保持 240，导出最近 200 条。
- 敏感信息继续递归脱敏：不导出密码、验证码、Access/Refresh Token、Cookie、密钥和支付签名；邮箱以占位符表示，照片签名查询参数被擦除。

### 文件进度

- 新增 `weapp/services/debug-diagnostics.js`：完整快照、云端只读对照、合并诊断、照片健康检查和脱敏。
- 更新 `weapp/services/data-capsule.js`：schema/version 升级为 `3 / 3.0-weapp`，新增异步 `collectDebugLog()`。
- 更新 `weapp/pages/profile/profile.js`：生成和导出都等待完整异步诊断，不再导出生成前的旧快照。
- 新增 `weapp/tests/debug-diagnostics.test.js`：覆盖全部记录、冲突、pending payload、登录、会员、照片健康、云端差异和秘密脱敏。
- 完整小程序自动化测试 `212/212` 通过。

### 下一步测试

在 Android 真机先进行一次登录、记录编辑、同步或照片操作，再导出 JSON。检查 `_meta.version`、`records_snapshot`、`sync_diagnostics`、`cloud_diagnostics.merge_comparison` 和 `photo_diagnostics`；如果某项网络检查超时，JSON 仍应生成并明确标注超时分区。

## 2026-08-12 - 首份 Android V2 日志分析与重复请求治理 ✅

### 日志结论

- OnePlus PLR110 的本地界面没有慢：觉察日记缓存渲染 `8–9ms`，我的缓存渲染 `21–28ms`。
- Noto Serif SC 从 Vercel 加载满 20 秒后被微信判定超时，但字体加载处于后台增强流程，没有阻塞首屏；失败时系统字体立即接管。
- 线上 WOFF 文件为 `295,564B`，响应 `200`，`Access-Control-Allow-Origin: *`、长期缓存和 `X-Vercel-Cache: HIT` 均正常，因此不是 404、CORS 或部署遗漏。
- 43 秒日志中会员状态请求 9 次、记录和选项各 9 次；Vercel 会员接口单次约 1.8–3.5 秒，Supabase 单次约 140–291ms。主要浪费来自快速切 Tab 时重复后台刷新。
- `/api/membership/order/status` 出现一次 `502 PAYMENT_STATUS_FAILED`；旧的空路径 `onPageNotFound` 发生在约两小时前，不属于本轮启动。
- 真机调试面板的 `15512ms` 是手机与开发工具调试通道的往返延迟；服务状态“正常”只表示连接未断开，不代表链路快速。

### 本轮修复

- 新增 `page-refresh-gate.js`：三个主页面同一账号/模式下，10 秒内快速往返使用本地新鲜数据；同一后台刷新中的重复调用直接复用 Promise。
- `membership.js` 增加账号级在途请求合并，多个页面同时读取会员状态只发送一次请求。
- `custom-font.js` 在远程字体超时后记录 6 小时冷却，避免每次切后台再回来又等待 20 秒；下个字体版本会自动重新尝试。
- 诊断事件容量由 120 提升到 240，JSON 导出时间线由 100 提升到 200，保住完整启动阶段。
- 完整小程序自动化测试 `211/211` 通过。

### 下一步测试

清缓存并重新编译，快速往返三个主页面两轮后重新导出 JSON。应看到请求数明显下降；再用预览版/体验版复测字体，避免 15.5 秒真机调试通道干扰。如果非调试版本仍出现字体超时，再把 WOFF 迁到国内 OSS/CDN。订单页另外手动刷新一次，核对 502 是否为偶发服务端错误。

## 2026-08-12 - 小程序诊断日志 V2 ✅ 代码完成，待真机采样

### 本轮结果

- 新增统一运行事件时间线，覆盖 App 启动/前后台、网络变化、页面缓存渲染、后台刷新、登录/会话刷新、同步队列、照片上传、支付、远程字体与全局异常。
- 所有普通 API 请求记录方法、去查询参数后的接口、HTTP 状态、耗时和服务端 Request-ID；3 秒以上自动标记慢请求，超时记录 timeout/errno。
- OSS 二进制照片上传单独记录耗时、状态、文件字节数和 MIME，补齐原来普通 request 日志覆盖不到的阶段。
- 同步记录开始/结束、各实体待处理数量、成功/剩余数量与失败步骤；照片批次记录选择、校验、持久化、上传及最终数量；支付记录登录凭证、下单、收银台、查单和恢复阶段。
- 日志采用最多 120 条的内存环形队列并延迟 350ms 写入本地；错误和断网立即落盘，避免日志本身频繁同步写存储拖慢页面。
- 递归脱敏邮箱、JWT、Bearer、Supabase 密钥、密码、Token、验证码/签名等字段；导出不再包含完整邮箱，只显示掩码。
- “我的 → 设置 → 数据管理 → 运行日志”按网页版真源改为生成后预览，并用底部唯一的“导出文件”按钮生成 `ashtanga-debug-log-YYYY-MM-DD.json`。
- 真机通过 `wx.getFileSystemManager().writeFile` 写入 UTF-8 JSON，再由 `wx.shareFileMessage` 调起微信文件分享；开发者工具或旧环境不支持时才降级复制完整 JSON。
- 导出日志升级为 schema v2，增加小程序 AppID/环境/版本、设备、屏幕、安全区、授权、存储占用、风险标记、诊断摘要和最近 100 条时间线。

### 自动化验证

- 新增网络成功/超时、接口脱敏、事件容量、递归脱敏和运行日志 UI 回归。
- 小程序完整自动化测试 `206/206` 通过；新增 JSON 文件名、内容校验、文件写入、微信分享及降级路径回归。

### 下一步测试

重新编译后在真机复现一次“冷启动 → Tab1 → 觉察日记 → 我的设置”，如果再慢或报错，进入运行日志点击“导出文件”，把 JSON 分享到文件传输助手或发给开发者。重点看 `diagnostic_flags`、`diagnostic_summary` 和 `recent_events`；开发者工具不支持文件分享时会自动复制完整 JSON。

## 2026-08-12 - 真机冷启动超时与组件 WXSS 警告修复 ✅ 代码完成，待重新编译真机复测

### 日志结论

- `SharedArrayBuffer`、HarmonyOS `getSystemInfo` 和 `reportRealtimeAction:fail not support` 均来自微信开发者工具/基础库提示，不是小程序无法启动的业务异常。
- 真正相关的是冷启动阶段出现的 `request:fail timeout`。此前 App 一进入前台就同时加载远程字体并补查历史待确认支付订单；旧沙箱订单会把一次 15 秒网络请求带进启动期。
- 多个自定义组件还使用了微信组件 WXSS 不支持的标签、属性或后代标签选择器，虽然多数情况下只是警告，但真机编译行为可能与开发者工具不同。

### 本轮结果

- 远程字体改为首屏渲染后的延迟增强，不再放在 `App.onLaunch` 的关键路径。
- App 自动查单只检查当前账号 30 分钟内最新的 1 笔订单；旧测试订单仍保留在订单页供手动刷新，不再每次启动自动请求。
- “我的”后台自动查单使用同一限制；页面和设置继续先显示本地缓存。
- 清理 `membership-prompt`、`account-guest-panel`、`change-password-modal`、`auth-modal`、`record-share-card`、`annotation-manager` 中微信不允许的组件 WXSS 选择器，全部改用显式 class。
- 网络请求失败现在会把“请求方法 + 去除查询参数后的接口地址”写入本地运行日志；若仍超时，不再只有无法定位的 `request:fail timeout`。
- 新增旧订单跳过与超时地址日志回归，完整小程序自动化测试 `200/200` 通过；静态扫描确认 `weapp/components/**/*.wxss` 不再包含标签、ID 或属性选择器。

### 下一步测试

在微信开发者工具执行“清缓存并编译”，再生成新的真机调试二维码。先确认 Tab1 能立即显示本地练习界面，再切换“我的 → 设置”。若仍报 `request:fail timeout`，导出新的运行日志；新日志里的请求已不再可能来自旧沙箱订单，可继续按具体接口定位。

## 2026-08-12 - Tab1 / 我的缓存优先首屏 ✅ 代码完成，待真机测速

### 根因

- Tab1 首屏原来同时等待练习选项、当月记录、今日人数和会员状态，任何一个网络请求较慢都会持续显示“正在准备练习空间…”。
- “我的”原来先逐笔补查待确认支付订单，再等待全年记录、资料、练习类型和会员状态，因此设置入口也被整页 loading 一起挡住。
- 数据其实已经保存在微信本地账号工作区，但页面只把缓存用于网络失败兜底，没有用于首屏渲染。

### 本轮结果

- `data-repository` 新增同步的练习类型缓存读取入口，与已有记录/profile 缓存组成完整首屏快照。
- Tab1 在 `onLoad` 立即用本机选项、当月记录、会员和今日人数缓存构建全部按钮；网络刷新只负责后台校准，不再控制页面能否显示。
- “我的”在 `onShow` 立即用本机全年记录、资料、选项和会员缓存渲染统计、热力图和设置入口。
- 待确认订单恢复脱离主加载链路；即使微信查单需要数秒，用户也能立即打开设置。若后台确认到账，仍会更新会员期限。
- 后台刷新不覆盖正在编辑的昵称/签名；网络失败保留本机快照，不再清空统计或弹出整页失败状态。

### 更新文件

- `weapp/services/data-repository.js`
- `weapp/pages/practice/practice.js`
- `weapp/pages/profile/profile.js`
- `weapp/tests/account-workspace.test.js`
- `weapp/tests/navigation.test.js`
- `docs/weapp/DEVELOPMENT_PLAN.md`
- `docs/weapp/UI_MIGRATION_MATRIX.md`
- `TODO.md`
- `weapp/WECHAT_DEV_LOG.md`

### 自动化验证

- 缓存首屏专项与页面结构测试 54/54 通过。
- 小程序完整自动化测试 198/198 通过，JavaScript 语法和 `git diff --check` 通过。

### 下一步测试

开发者工具重新编译后，连续切换“今日练习 → 我的 → 设置 → 今日练习”两轮；页面主体和设置入口应立即可见。Android 真机再测试首次登录后进入、普通二次进入和弱网进入，确认网络只造成数据静默更新，不再造成 3～5 秒整页准备状态。

## 2026-08-12 - Tab1「今日练习」视觉真源对齐 ✅ 代码完成，待真机验收

### 本轮结果

- 以网页版 `components/practice/PracticeDashboard.tsx` 和 `app/globals.css` 为唯一真源，对齐小程序今日练习页的背景、练习类型卡片和开始练习圆形按钮。
- 页面背景由 `#F9F7F2` 统一为网页版 `#F9F8F6`；同时更新小程序窗口背景，避免下拉或页面边缘露出另一种底色。
- 普通未选中卡片取消半透明白底和绿色描边，改为与页面同色的纸面底、极淡中性边框和网页版软阴影。
- 选中、会员锁定、自定义卡片分别对齐网页版的渐变、透明度、虚线颜色和阴影层级；支持时增加 `backdrop-filter`，不支持时仍由底色、边框和阴影保持主要质感。
- 练习类型网格恢复网页版横向留白比例；开始练习按钮的未选中底色、选中阴影和模糊层级同步真源。
- 未修改练习选择、会员限制、音频和保存逻辑；新增 UI 真源回归断言。小程序完整测试 196/196 通过，`git diff --check` 通过。

### 更新文件

- `weapp/app.json`
- `weapp/app.wxss`
- `weapp/pages/practice/practice.wxss`
- `weapp/tests/navigation.test.js`
- `docs/weapp/DEVELOPMENT_PLAN.md`
- `docs/weapp/UI_MIGRATION_MATRIX.md`
- `TODO.md`
- `weapp/WECHAT_DEV_LOG.md`

### 项目进度同步

- 账号、同步、照片、会员限制、体式库和 Android 虚拟支付沙箱主链路均已完成代码接入。
- Android 沙箱首笔付款已成功并正确增加会员期限；订单中断恢复和会员页订单记录已完成。
- 当前进入集中验收阶段：Tab1 最新 UI、体式/分享/照片/音频真机体验，以及支付年度套餐、取消、中断恢复、重复查单和网页同步。
- 集中验收通过后才切换虚拟支付现网；iOS IAP 另开工作轮次。

### 下一步测试

在微信开发者工具重新编译并分别查看未选中、选中、自定义和会员锁定状态；重点检查普通卡片不再出现明显绿框、卡片横向留白与网页版一致、开始按钮阴影自然。再用 Android 真机确认 `backdrop-filter` 降级时仍保持同色纸面质感。

## 2026-08-12 - 会员订单记录 ✅ 接口已部署，待真机 UI 验收

### 本轮结果

- “我的 → 设置 → 会员”新增轻量订单弹层，不增加新的主页面或导航层级；根据第二轮 UI 反馈，入口最终调整为 PRO 大卡片上方的独立满宽小卡片，左侧为本地订单 SVG、标题和说明，右侧为箭头，整卡可点击。
- 订单弹层展示当前账号最近 20 笔会员订单：季卡/年卡、金额、下单时间、到账时间、订单号和状态。
- 状态区分“已到账、待支付、待确认、支付失败、已关闭、已退款”；只有待确认订单显示“刷新状态”。
- 手动刷新复用现有微信虚拟支付查单与幂等履约流程，到账后同步刷新会员天数。
- 新增服务端鉴权列表接口 `/api/membership/order/list`；服务端使用当前 Supabase 登录用户 ID 过滤订单，小程序不直接访问受保护的 `payment_orders` 表。
- 原 404 的原因是小程序代码先于服务端接口部署；接口已提交为 `a4b6e125` 并推送 GitHub `master`，Vercel 部署完成后线上匿名请求返回 `401 NOT_AUTHENTICATED`，确认路由存在且鉴权正常。
- 2026-08-12 复核两笔“待确认”季卡：均创建于 `WECHAT_VIRTUAL_PAY_ENV=1` 沙箱联调期间，属于拉起支付但未完成付款的测试订单，不会扣款或增加会员期限。
- 订单列表新增 `virtual_env` 安全展示字段；沙箱订单显示“测试订单”标签，接口更新提交 `8c05a13d` 已推送生产 `master`。
- “刷新状态”按钮移除原生固定行高，改为 flex 水平、垂直双向居中，修复文字向下偏移。

### 自动化验证

- 小程序自动化测试 `195/195` 通过。
- TypeScript 检查、Next.js 生产构建和小程序发布门禁全部通过；生产构建已识别新增订单列表 API。

### 更新文件

- `lib/payment-server.ts`
- `app/api/membership/order/list/route.ts`
- `weapp/services/payment.js`
- `weapp/pages/profile/profile.js`
- `weapp/pages/profile/profile.wxml`
- `weapp/pages/profile/profile.wxss`
- `weapp/images/icons/membership-order.svg`
- `weapp/tests/payment.test.js`
- `TODO.md`
- `weapp/WECHAT_DEV_LOG.md`

### 下一步

微信开发者工具重新编译小程序；确认订单小卡片位于 PRO 大卡片正上方并左右撑满设置内容区，图标和箭头正常显示。点击后应能看到刚才成功支付的沙箱订单及“已到账”状态。
同时确认昨日两笔未支付订单显示“测试订单”，刷新按钮文字位于胶囊正中央。

## 2026-08-11 - 虚拟支付中断恢复 ✅ 代码完成，待 Android 真机验收

### 本轮结果

- 订单创建成功后立即将 `order_id`、套餐、账号 ID 和创建时间写入小程序本地存储，不再只保存在当前函数内存中。
- 小程序每次重新进入前台会自动补查当前账号的待确认订单；进入“我的”页读取会员状态前也会等待同一轮补查，避免页面先显示旧会员期限。
- 查到已付款时由现有服务端流程幂等履约并刷新会员状态，随后清理本地订单并提示“会员已到账”。
- 用户明确取消、订单失败、关闭或退款时清理本地订单；网络错误或支付结果未知时不清理，后续继续重试。
- 待确认订单按账号隔离，最多保留最近 5 笔、最长 7 天；切换账号不会查询其他账号订单。

### 自动化验证

- 新增行为测试：订单持久化与重启恢复、明确取消清理、网络失败保留重试。
- 小程序自动化测试 `193/193` 通过。
- 小程序发布门禁通过：主包约 `0.952 MiB`，体式分包约 `1.127 MiB`，域名、AppID、密钥扫描和单资源大小检查全部通过。

### 更新文件

- `weapp/services/payment.js`
- `weapp/app.js`
- `weapp/pages/profile/profile.js`
- `weapp/tests/payment.test.js`
- `weapp/tests/payment-recovery.test.js`
- `TODO.md`
- `weapp/WECHAT_DEV_LOG.md`

### 下一步测试

1. 上传新的开发版，在 Android 沙箱付款完成后立即关闭小程序，不等待页面显示成功。
2. 重新打开小程序，确认出现“会员已到账”，会员天数只增加一次。
3. 再补测取消支付、另一套餐、网页端会员同步和重复进入页面不重复增加会员期限。
4. 上述全部通过后，发布两个道具的现网版本并将 `WECHAT_VIRTUAL_PAY_ENV` 切换为 `0`；iOS IAP 继续单独处理。

## 2026-08-11 - 微信虚拟支付 Android 首笔沙箱付款成功 ✅

### 真机结果

- 新 AppID `wx36f4826bc022d43f` 已在 Android 开发版成功拉起 `wx.requestVirtualPayment` 沙箱收银流程。
- 测试订单支付成功后，服务端查单、金额校验、会员幂等履约和发货确认完成。
- 小程序会员剩余天数已按购买套餐正确增加，说明微信订单、Supabase `payment_orders`、`user_memberships` 与前端会员状态读取已经贯通。
- 当前仍为 `WECHAT_VIRTUAL_PAY_ENV=1`；该次属于沙箱验收，不切换正式环境。

### 下一步测试与开发

1. 补测取消支付、另一套餐、网页端会员同步和重复查询同一订单不重复增加期限。
2. 增加未完成订单本机持久化与重新进入自动查单，覆盖支付后立即退出、微信 success 回调丢失和网络中断。
3. 中断恢复通过后，再发布两个道具现网版本并将支付环境切换为 `0`；苹果 IAP 仍单独处理。

## 2026-08-11 - Pro 会员切换微信虚拟支付沙箱 ✅ 代码完成，待配置联调

### 本轮结果

- 微信后台已创建 `pro90d` 与 `pro365d` 两个一次性会员道具；道具图为 200×200 白底绿字 PNG，单张小于 10KB。
- 小程序支付入口从普通 `wx.requestPayment` 切换为 `wx.requestVirtualPayment`，支付模式固定为 `short_series_goods`。
- 服务端使用虚拟支付 AppKey 生成 `paySig`，使用本次 `wx.login` 换得的 `session_key` 生成用户态 `signature`；两项密钥均不进入小程序代码包。
- 支付成功后主动调用 `/xpay/query_order` 查单，核对订单金额后复用现有数据库函数幂等开通/续费会员，并调用 `/xpay/notify_provide_goods` 确认发货。
- 新增虚拟支付订单迁移，保存 provider、product ID、openid、沙箱/现网环境及发货确认时间；旧普通支付订单保留。
- 健康检查已改为验证 OfferID、支付环境及当前环境对应 AppKey，不再依赖普通商户 API v3 证书。
- 自动化验证：小程序 188/188、支付专项 7/7、TypeScript、lint、发布配置门禁和 Next.js 生产构建全部通过；主包约 0.95 MiB。

### 更新文件

- 新增：`lib/wechat-virtual-pay.ts`
- 修改：`lib/payment-server.ts`
- 修改：`app/api/membership/order/create|status/route.ts`
- 修改：`app/api/membership/payment-health/route.ts`
- 新增：`supabase/migrations/20260811_migrate_payment_orders_to_virtual_pay.sql`
- 修改：`weapp/services/payment.js`、`weapp/pages/profile/profile.js`
- 修改：`weapp/tests/payment.test.js`、`weapp/scripts/check-release-config.mjs`
- 新增：`weapp/images/payment-products/pro-quarter-90d.png`、`pro-year-365d.png`
- 更新：`docs/weapp/WECHAT_PAY_SETUP.md`

### 下一步测试

1. 在 Supabase 执行虚拟支付订单迁移。
2. Vercel 增加 OfferID、沙箱/现网 AppKey 和 `WECHAT_VIRTUAL_PAY_ENV=1`，重新部署。
3. 健康检查确认 `provider=wechat_virtual_pay`、`env=1`、`ready=true`。
4. 上传小程序开发版，在 Android 真机分别测试取消、季卡、年卡、会员到账和网页同步。

## 2026-08-11 - 微信支付 `requestPayment:fail banned` 定位 ⚠️ 平台权限待处理

### 本轮结果

- 支付服务端配置健康检查为 `ready: true`，小程序已成功创建预支付订单并进入 `wx.requestPayment`。
- 微信客户端返回 `requestPayment:fail banned`；按微信支付官方说明，这是当前小程序支付权限被公众平台限制，优先核查微信认证、服务类目、交易类小程序订单发货管理和通知中心处置消息，不是支付签名或证书错误。
- 修正小程序提示：支付能力受限且没有进入收银台时，明确告知“本次不会扣款”，不再显示“如已扣款请勿重复支付”的误导文案。

### 更新文件

- `weapp/services/payment.js`
- `weapp/pages/profile/profile.js`
- `weapp/tests/payment.test.js`
- `weapp/WECHAT_DEV_LOG.md`

### 下一步处理与测试

登录新 AppID 的微信公众平台，先查看通知中心的支付限制原文，再确认小程序已经完成微信认证、服务类目与实际会员服务一致，并检查“交易保障/订单发货管理”是否要求接入。完成平台要求并解除限制后，重新上传体验版并验证能拉起微信收银台。

## 2026-08-11 - 上传代码质量检查修复 ✅

### 本轮结果

- `app.json` 启用 `lazyCodeLoading: requiredComponents`，满足组件按需注入检查。
- 唯一超过 200 KiB 的包内资源 `audio/opening-chant.mp3` 从 673.5 KiB 压缩到 134.9 KiB；保留完整 68.9 秒、单声道 MP3 和包内秒开能力，网页版原始音频不受影响。
- 新增自动化门禁，持续检查按需注入配置以及全部包内图片/音频单文件不超过 200 KiB。
- 小程序自动化 184/184、发布门禁、资源检查全部通过；主包约 0.932 MiB，体式分包约 1.127 MiB。

### 更新文件

- `weapp/app.json`
- `weapp/audio/opening-chant.mp3`
- `weapp/tests/upload-quality.test.js`
- `weapp/WECHAT_DEV_LOG.md`

### 下一步测试

重新编译并再次上传代码，确认“组件按需注入”和“图片和音频资源”均通过；真机播放完整开篇唱诵，检查秒开、完整时长和人声音质，然后使用预览版或体验版继续微信支付验收。

## 2026-08-11 - Android/开发者工具字体缓存修复 ✅

### 本轮结果

- 线上 `ashtanga-noto-serif-sc-ui-v2.woff` 已核验为 HTTP 200、`font/woff`、允许跨域并使用一年 immutable 缓存；字体文件和服务器响应正常。
- `ERR_CACHE_MISS` 定位为微信开发者工具保存过旧字体 URL 缓存记录，而字体资源采用不可变长缓存。
- 小程序字体 URL 增加显式版本参数 `?v=20260811-1`，在不改字体文件的情况下主动切换缓存键；加载失败仍回退系统字体，不阻塞支付或页面使用。

### 更新文件

- `weapp/services/custom-font.js`
- `weapp/tests/custom-font.test.js`
- `weapp/WECHAT_DEV_LOG.md`

### 下一步测试

在微信开发者工具执行“清缓存 → 清除全部缓存”后重新编译，确认字体请求包含 `?v=20260811-1` 且不再出现 `ERR_CACHE_MISS`；随后继续真机支付测试。

## 2026-07-09: 设计系统统一 — DESIGN.md 第二版 + WXSS 颜色对齐

### 背景

DESIGN.md 第一版定义的色值（`#2D5A27` / `#F9F8F6` / `#1A1A1A`）与实际 WebApp 代码不一致。WebApp 实际使用 `#2A4B3C`（森林绿）/ `#F9F7F2`（米白）/ `#C1A268`（金色）。小程序 WXSS 颜色也是随意的，和 WebApp 对不上。

### 修改内容

1. **DESIGN.md 第二版** — 从 WebApp `globals.css` + `page.tsx` 抽取真实 token 更新
2. **小程序 6 个 WXSS 文件统一色板**：`app.wxss`, `practice.wxss`, `index.wxss`, `journal.wxss`, `profile.wxss`, `privacy.wxss`
3. **小程序 tabBar 图标换为 lucide SVG**（base64 内嵌 Calendar / BookOpen / CircleUser）
4. **小程序练习页修复**：选中态/开始按钮使用绿色渐变，Logo 圆角 50%，开始按钮改 `<view>`
5. **tabBar 宽度缩紧**：`max-width: 560rpx` → `380rpx`

### 备注

- `backdrop-filter: blur()` 微信小程序不支持，毛玻璃效果用半透明背景替代
- 现已统一到 WebApp 实际使用的颜色体系，后续写新 WXSS 参照 `DESIGN.md`

## 2026-07-28 - Android 真机字体统一 ✅ 代码完成，待部署验收

### 本轮结果

- 确认差异原因：网页版加载真实 `Noto Serif SC`，开发者工具命中 Windows 宋体，Android 因无宋体而回退系统黑体。
- 新增 259.2KiB 的 Noto Serif SC UI 精简网络字体，覆盖当前 1,022 个小程序界面字符，不计入 1.445MiB 小程序审核包。
- 小程序启动全局调用 `wx.loadFontFace`；页面、按钮、输入框以及原有 Songti/Georgia/serif 样式统一优先使用 `Ashtanga Serif`。
- 网站 `/fonts/` 增加 CORS、跨域资源策略与长期缓存；字体加载失败仍保留安全回退。
- 自动化 172/172、TypeScript、lint、Next.js 生产构建和包体检查通过；本地生产字体端点返回 HTTP 200、`font/woff`、CORS 与一年缓存头。

### 更新文件

- `public/fonts/ashtanga-noto-serif-sc-ui-v1.woff`
- `public/fonts/OFL-Noto-Serif-SC.txt`
- `weapp/services/custom-font.js`
- `weapp/app.js|wxss`
- `weapp/` 下使用衬线字体的 14 个 WXSS 文件
- `next.config.mjs`
- `scripts/build-weapp-font-subset.py`
- `scripts/update-weapp-font-stack.mjs`
- `weapp/tests/custom-font.test.js`
- `docs/weapp/DEVELOPMENT_PLAN.md`
- `TODO.md`

### 下一步测试

先部署 Vercel 字体资源，再上传小程序开发版；Android 清缓存冷启动后检查三个 Tab、认证与设置弹窗。若仍为黑体，优先查看控制台是否出现“Noto Serif SC 字体加载失败”。

## 2026-08-10 - 网页版体式库同步 ✅ 代码完成，待真机验收

### 本轮结果

- 以网页版 `PosesTab` 和 `pose-data`/动作解析文件为唯一真源，同步拜日 A、拜日 B、站立、坐立、结束 5 分类与 94 张卡片。
- 新增体式列表、详情大图、梵文/中文标题、凝视点、Vinyasa 分解、绿色体位法步骤、停留呼吸和本分类前后循环。
- 悬浮导航升级为四入口；体式库使用分包承载，三个主包官方 Tab 保持原有切换能力。
- 94 张图片全部转换为分包内 720×720 WebP，不依赖远程图片。主包约 1.45 MiB，体式分包约 1.49 MiB。
- Noto Serif SC 网络字体升级为 v2，字符覆盖从 1,022 扩至 1,162，大小 288.6 KiB；新 URL 避免 Android 继续命中旧 v1 长缓存。
- 新增真源同步脚本、体式库回归和分包包体检查；自动化 178/178，发布门禁通过。

### 更新文件

- `weapp/pose-package/pages/poses/`
- `weapp/pose-package/services/pose-data.js`
- `weapp/pose-package/images/`
- `weapp/app.json`
- `weapp/custom-tab-bar/`
- `scripts/sync-weapp-pose-library.mjs`
- `weapp/scripts/check-package-size.mjs`
- `weapp/tests/pose-library.test.js`
- `docs/weapp/DEVELOPMENT_PLAN.md`
- `docs/weapp/UI_MIGRATION_MATRIX.md`
- `TODO.md`

### 下一步测试

开发者工具重新编译后，按五分类逐项检查数量、图片、详情长文滚动、首尾循环和底部安全区；Android/iPhone 都确认四栏宽度、图标与选中态。发现差异时只按具体 UI 项返修，不在小程序单独改冻结的数据和排序。

## 2026-08-11 - 体式图片与导航毛玻璃真机修复 ✅ 代码完成

### 诊断与修复

- 分包本地 WebP 在真机未被稳定解析，94 张图表现为全部加载失败；运行时路径改为相对页面的 `../../images/`，图片最终使用真机兼容的 720×720 透明调色板 PNG。
- JPG 兼容版因固定米白底无法跟随页面渐变，列表中出现正方形色差；同步脚本已改为保留透明通道，并在限定目录内清理旧 WebP/JPG。当前 94 张 PNG、0 张 JPG、0 张 WebP，角落透明像素已验证。
- 公共四栏、体式分包四栏和顶部分类栏加入 blur/saturate；Android 忽略模糊属性时使用 86%–88% 白底兜底，避免下面的文字和图片清晰穿透。
- 图片约 1.02 MiB，体式分包约 1.13 MiB；自动化 178/178，包体门禁通过。

### 下一步测试

微信开发者工具先清除全部缓存再编译；真机检查五分类列表与详情图片，并把内容滑到顶部分类栏和底部导航后方，确认不再清晰透出。
## 2026-08-12 · 超长 V3 日志文件分享兼容 ✅

### 问题与根因

- V3 日志包含记录、照片、同步队列和云端对照，完整文本已经不适合通过剪贴板或微信普通消息传递。
- 原实现只调用一次 `wx.shareFileMessage`；开发者工具不支持该 API，失败后却提示复制全文，造成“文件分享暂不可用”的死路。

### 本轮修复

- `weapp/services/debug-log-export.js`：真机优先分享 JSON；Android 若拒绝 JSON 扩展名，自动改为 TXT 文件继续分享，文件内容保持完整 JSON。
- `weapp/pages/profile/profile.js`：取消超长剪贴板兜底；开发者工具明确引导到手机真机，真机双格式均失败时展示实际微信错误。
- `weapp/tests/debug-log-export.test.js`：增加开发者工具不支持和 Android JSON → TXT 兼容测试。
- 根据真机返回的 `can only be invoked by user TAP gesture` 继续定位：旧流程在点击导出后重新运行完整异步诊断，分享调用已经脱离用户点击上下文。
- 调整为打开日志弹窗时提前生成日志并写好 JSON/TXT；底部按钮的 tap handler 同步调用 `shareFileMessage`，调用前不再存在 `await`、网络请求或文件写入。
- JSON 失败后的 TXT 不自动重试，而是通过“分享 TXT”确认按钮获得新的点击手势后立即分享。
- 完整自动化测试 `215/215` 通过；发布包与发布配置检查通过。

### 下一步测试

在 Android 手机微信打开最新开发版/体验版，等待运行日志弹窗完整显示后，再点击一次底部导出按钮并发送文件。重点确认不再出现 `can only be invoked by user TAP gesture`。

---
## 2026-08-12 · V3 日志驱动的跨 Tab 请求治理 ✅

### 日志证据

- 本地首屏分别只有 12ms、13ms、35ms，真正延迟来自后台接口。
- 同一会话会员状态请求 3 次、选项和记录各 3 次、空同步检查 3 次；今日人数 3198ms，标注分配 2764ms，字体后台加载 6342ms。
- 5 张照片全部健康、本地与云端两条记录完全一致，因此本轮不改照片和同步数据模型。

### 本轮实现

- 新增共享读取缓存服务；选项、相同记录范围、标注类型和月份分配按账号/范围精确复用 30 秒，并合并并发 Promise。
- 会员状态复用 30 秒，付款和查单强制刷新；今日人数复用 5 分钟，用户点击强制刷新。
- 空 pending 队列不再创建同步 trace 和同步日志；手动同步完成后主动失效共享读取缓存。
- 新增跨 Tab 顺序读取、空同步、会员强刷和今日人数强刷回归；完整测试 `218/218`、发布门禁通过。

### 下一步测试

Android 冷启动后快速切换三个主 Tab 两轮并导出 V3。当前会话预期会员 1 次、选项 1 次、同月记录 1 次加全年记录 1 次、空同步事件 0；重点比较后台刷新完成时间和界面是否仍有跳动。

---
## 2026-08-12 · 收工记录

### 今日结果

- 完整诊断日志 V3 已落地并通过真实 Android 文件分享验证；用户发回的首份 V3 文件大小 222,235 字节，schema 为 `3.0-weapp/full`。
- 真实数据检查正常：2 条本地记录与 2 条云端记录全部 matched，5 张 OSS 照片全部 HTTP 200，pending/conflict/orphan 均为 0，会员为季度 Pro、剩余 93 天。
- 性能根因从“页面渲染慢”修正为“后台接口慢且跨页面重复”：缓存首屏仅 12/13/35ms，今日人数 3198ms、标注分配 2764ms、会员 1525～2968ms。
- 已加入跨 Tab 共享读取和空同步跳过，付款/查单/手动同步仍强制刷新；完整回归 `218/218`，发布门禁通过。

### 下次继续位置

1. Android 最新开发版冷启动。
2. 快速切换今日练习、觉察日记、我的两轮。
3. 导出第二份 V3 日志，核对会员 1 次、选项 1 次、同月记录 1 次、全年记录 1 次、空同步 0 次。
4. 若次数正确但单请求仍慢，再处理 Vercel 冷延迟；若次数不正确，继续在共享读取键和失效路径排查。

---
