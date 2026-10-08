# 阿斯汤加打卡 app - 项目记录

## 2026-07-17: 照片上传状态改为真实逐张反馈

小程序此前把两个不同事件混成了同一个“成功”：用户选择照片后，`practice-record-form` 只是调用 `persistPhotos()` 将微信临时路径复制到小程序永久目录；真正的 OSS PUT 与照片元数据写入要等记录保存后，由账号 pending queue 后台执行。表单立即展示无遮罩缩略图，会让人误以为云端已经全部成功。

网页 `components/PracticeForm.tsx` 的真源语义是：上传中的文件使用灰色虚线占位和旋转圈，`uploadPhoto()` 完成并进入 photos 列表后才显示正常 `PhotoPreview`。小程序保留“本地先写、页面不等待九张照片”的性能架构，但补齐等价状态：选图后提示“已加入，保存后上传”，本机路径在表单显示灰色“待上传”；保存进入觉察日记后，根据每个 photo upload operation 显示等待、上传中或失败。只有账号工作区把本机路径替换成 OSS HTTPS，图片才进入无遮罩成功态。

`data-repository` 新增 `getPhotoSyncStatus(recordId, path)`，以云端 URL、pending operation 和 `last_error` 判断单张状态。觉察日记同步时每 600ms 重绘本地缓存，照片上传成功一张就恢复一张；完成、页面隐藏或卸载后清理定时器。失败照片保持本机文件和队列，可手动重试，不以假成功掩盖问题。

文件进度：更新公共表单、照片状态仓库接口、觉察日记时光轴及三组回归测试。验证结果：小程序自动化 134/134。下一步真机测试九张照片逐张转为正常、断网失败态和恢复同步，再继续“我的”页真实资料。

## 2026-07-17: 游客照片权限修正为 0 张

再次核对网页 `components/PracticeForm.tsx` 后确认，照片能力不只是 FREE/PRO 数量限制，还存在更前置的账号条件：相机按钮点击和文件选择回调都会检查 `hasEmail`，没有绑定邮箱时只提示“绑定邮箱后可使用照片功能”，不会上传或保留照片。小程序技术上可以用 `wx.saveFile` 保存游客照片，但这是存储能力，不是当前产品权限；为保持网页、小程序和云端照片语义一致，最终规则修正为游客 0 张、已登录 FREE 每条 1 张、PRO 每条 9 张。

公共练习表单新增 `photoEnabled`，今日练习和觉察日记均从统一数据模式传入。游客点击相机时在打开系统选择器前被拦截；历史游客照片不再显示“继续添加”入口。`data-repository` 同时增加不可绕过的限制：游客创建记录时携带照片、或给既有游客记录新增照片都会失败；以前版本留下的游客照片仍允许查看、删除和登录后合并，避免权限修复变成数据删除。

账号 FREE 的数量规则保持为每条 1 张，但本轮确定采用整批拒绝：一次选 2 张或超过剩余名额，一张也不上传。PRO 保持每条 9 张。对应新增游客 UI、仓库拒绝与历史照片保留测试，验证结果为小程序自动化 132/132。

下一步真机分别验证游客相机不打开、账号 FREE 选 2 张整批取消、PRO 9/10 张边界，再继续“我的”页头像与资料保存。

## 2026-07-17: 照片超限整批拒绝、完成页直达与可见自动同步

本轮再次核对网页 `components/PracticeForm.tsx`。网页当前会把超额选择截取为前 N 张并提示；小程序此前又把选择器 `count` 直接限制为剩余额度，用户既看不到实际选了多少，也无法获得超限提醒。按本次产品决定，小程序改用可返回更大选择集的媒体选择入口，在任何持久化前比较本次数量与剩余名额：PRO 超过每条 9 张、游客/FREE 超过每条 1 张，或已有照片后超过剩余名额，均弹窗说明并整批取消，不产生部分保存。

完成练习的跳转闪屏来自 `saveCompletion()` 在保存后先关闭完成表单、显示 Tab Bar，再等待 350ms 切换页面。现改为保存后立即 `switchTab`，只有切换成功才清理完成页状态，因此用户直接看到觉察日记；切换失败时记录仍已保存并给出明确提示。

Tab Two 此前虽然调用了照片后台同步，但先把任何 pending 状态显示为红色，且没有设置 `syncing`，视觉上像“未自动同步”。现在页面一识别到云端待同步队列就立即显示蓝色同步态并只旋转刷新图标，同时执行 `syncPendingRecords({ includePhotos: true })`；队列清空后自动变绿，确有剩余或错误才变红。账户弹层也与网页 `AccountBindingSection.tsx` 对齐为“立即同步 / 退出登录”并列、“修改密码”独占下一行，修改密码复用公共认证弹窗的忘记密码流程。

文件进度：更新公共练习表单、今日练习保存流程、觉察日记账户同步页面及四个相关测试文件。验证结果：小程序自动化 130/130，轻量 lint、JavaScript 语法和 diff whitespace 检查通过。全项目 TypeScript 当前仍有两条来自既有照片调试日志开发中的类型错误，位置为 `__tests__/practice-debug-log.test.ts:212` 与 `lib/practice-debug-log.ts:76`，本轮未改动这些文件。

下一步真机一次验收四条主路径：PRO 超过 9 张整批拒绝、游客超过 1 张整批拒绝、完成保存直接进入觉察日记、云同步自动从蓝色旋转变绿。通过后进入“我的”页头像/资料真实保存，再处理分享卡照片长图和音频首播。

## 2026-07-17: 真机 WXML 动态属性换行修复

真机调试报错 `pages/practice/practice.wxml 32:0 unexpected character \\n`。根因是选项卡 `class` 的引号内部包含三个源代码换行；桌面预览能够容忍，但真机 WXML 严格解析器拒绝属性值内的换行。现已把选中态、自定义态和会员锁定态三段表达式合并到同一行，并同步将“开始练习”图标的跨行动态 `src` 合并，避免下一处同类编译错误。新增静态回归测试阻止今日练习页 `class/src` 动态属性再次跨行。文件进度：`weapp/pages/practice/practice.wxml`、`weapp/tests/navigation.test.js`。验证结果：小程序 127/127，TypeScript、lint 和 diff whitespace 检查通过。下一步重新编译并再次进入真机调试，然后继续日历与带图保存验收。

## 2026-07-17: 日历缓存即时渲染、标注 409 对账与读取链路收口

开发者工具日志确认，保存后体感缓慢并非单纯由照片造成，而是两个链路叠加：`journal.onShow()` 无条件重新执行完整 `loadPage()` 并把已有日历切换为 loading；同时一个本地标注类型创建任务持续收到 `/api/annotations/types` 409，同步器保留失败任务，练习选项、记录和标注读取前都会再次尝试。服务端该路由的 409 明确表示 `DUPLICATE_LABEL`。

`weapp/services/data-repository.js` 现把标注类型创建处理为幂等操作：409、`DUPLICATE_LABEL` 或达到上限但云端确有同名类型时，读取远端类型并按规范化名称匹配，随后通过 `remapAnnotationTypeId()` 替换本地临时 ID、更新待同步日期分配并移除创建任务。新增 `getCachedRecordsByDateRange()`，页面无需网络即可读取刚保存到账号工作区的记录。

`weapp/pages/journal/journal.js` 改为 stale-while-revalidate：`onShow`、保存、删除、标注保存和切月都先从账号工作区/游客本地仓库同步绘制完整日历、统计与时光轴，再以 `preserveExisting` 在后台刷新云端。会员和用户并行读取，选项与日历并行刷新；日历只并行请求一次 records、annotation types 和 month assignments，并在响应落地前核对请求月份，避免快速切月时旧响应覆盖新月份。保存成功后不会再用 loading 状态遮住本地已有结果。

`weapp/services/photo-storage.js` 的照片大小读取优先改用 `FileSystemManager.stat`，避免 9 张照片产生 9 条 `wx.getFileInfo` 废弃提醒。新增重复标注自动对账、缓存记录无网络读取、日历缓存优先和新文件 API 回归测试，并让照片 API 静态测试兼容当前统一 OSS 所有权/完整性校验工具。验证结果：小程序 126/126，TypeScript、轻量 lint、JavaScript 语法与 diff whitespace 检查全部通过。

下一步测试：旧账号首次运行允许出现一次 409 以完成历史任务对账，之后反复进页/切月不得重复；结束练习带图保存后应立即显示日历、记录和本地照片，后台同步不得遮挡或阻塞页面。通过后继续“我的”页头像/资料与修改密码。

## 2026-07-16: 唱诵真源复刻、时光轴多图与照片同步解阻塞

唱诵设置重新以网页 `components/practice/PracticeModalHost.tsx` 的 `ChantSettingsSheet` 为真源：PRO 使用分、秒两列调节，关闭弹层时应用时长；FREE 固定显示 1 分钟并保留升级入口。自定义练习重新以 `components/practice/OptionModals.tsx` 为真源，统一字段字数、按钮文案、等宽绿色渐变和胶囊圆角。对应小程序文件为 `weapp/pages/practice/practice.js`、`.wxml`、`.wxss`。

时光轴此前只渲染 `item.photos[0]`，与当前网页真源 `components/journal/JournalTab.tsx` 不一致。本轮在 `weapp/pages/journal/journal.wxml` 和 `.wxss` 改为遍历全部照片：单图按约 90% 宽和自然比例展示，两张以上按三列方形网格展示，预览时传入整组 URL。

一次上传 9 张照片时长期停留在“正在读取日历/练习记录”的根因是同步边界错误：创建记录会把 9 个照片任务加入队列，随后记录读取又等待同一个逐张上传队列完成。`weapp/services/data-repository.js` 现将普通记录同步与照片同步分离，创建后先返回本地记录，页面加载完成后后台上传照片；普通读取不会等待正在运行的照片队列，手动“立即同步”仍会显式同步照片。失败任务继续保留以便重试和日志诊断，不会丢掉本地照片。`journal.js` 和 `profile.js` 已同步接入新调用语义。

文件进度：更新 `weapp/pages/practice/*`、`weapp/pages/journal/*`、`weapp/pages/profile/profile.js`、`weapp/services/data-repository.js`，以及账户工作区、同步按钮、会员和导航回归测试。验证结果：小程序自动化 122/122，TypeScript 与 lint 通过。下一步先真机测试 9 图保存后立即返回、三列完整显示、切月不阻塞和全图预览；若仍有控制台错误，需记录第一条完整红色错误及请求状态码，再按具体接口定位。通过后继续“我的”页头像/资料保存与修改密码。

## 2026-07-16: 小程序统一 FREE/PRO 能力策略完成

本轮跳过激活码，先把已经能读取的真实会员状态变成全小程序唯一的能力策略。新增 `weapp/services/membership-policy.js`，统一规定：照片每条 1/9 张、单张 5/30 MB、练习选项 3/11 个、日历标注 1/9 种、日历颜色 FREE 只开放第 3 色阶而 PRO 开放 1–4、唱诵倒计时 FREE 固定 60 秒而 PRO 可设置 5 秒至 180 分钟。会员过期自动按 FREE 处理。

今日练习页、觉察日记页、公共记录表单和标注管理器现在都从同一策略生成上限、锁定态和 Pro 提示；既有超额选项/标注/照片在会员到期后保留，禁止继续新增，避免降级时删除用户数据或阻塞纯笔记编辑。照片数量、大小和记录色阶同时在 `data-repository` / `photo-storage` 做第二层校验，不能通过其他入口绕过；FREE 保存色阶 1、2、4 时统一规范为第 3 色阶。网页端原有“FREE 可保留第 2 色阶”的旧规则也同步修正，避免两端再次分叉。会员服务缓存最近一次按账号隔离的真实状态，短暂离线时继续按实际到期时间判断，不会把有效 Pro 瞬间误降为 FREE。

小程序“我的”会员入口已移除激活码表单与相关文案，改为说明后续小程序付款成功后自动开通或续费；本轮未实现支付。支付资格与服务端开通方案确认后再单独开发。

文件进度：新增 `weapp/services/membership-policy.js`、`weapp/tests/membership-policy.test.js`、`weapp/tests/membership-ui.test.js`；更新 `weapp/services/membership.js`、`data-repository.js`、`local-data.js`、`photo-storage.js`，`weapp/pages/practice/*`、`pages/journal/*`、`pages/profile/*`，`components/practice-record-form/*`、`components/annotation-manager/*`；同步更新网页色阶逻辑与相关测试。

验证结果：`npm.cmd run test:weapp` 119/119；网页相关 Vitest 43/43；`npm.cmd run typecheck` 与 `npm.cmd run lint` 通过。

下一步测试：用当前有效试用账号验证 Pro 六项权益，再退出到游客/FREE 验证 3 个练习选项、1 种标注、仅第 3 色阶、1 张/5 MB 照片和固定 1 分钟倒计时；锁定项应有统一 Pro 提示，既有超额数据不能消失。通过后开发“我的”页头像/资料保存与修改密码，再处理分享卡照片和口令音频首播；小程序支付暂缓。

## 2026-07-16: 账户认证渐变真源修正与验证码投递可诊断化

绑定邮箱和认证按钮颜色偏深的根因不是渐变色值抄错，而是小程序在网页版半透明 `.green-gradient` 下面额外设置了 `background-color:#2D5A27`。两个 rgba 渐变停止点与深绿底再次混合后整体明显变暗。本轮从 `account-guest-panel` 和公共 `auth-modal` 同时移除该底色，六个登录、注册、验证码和修改密码主按钮继续共用同一显式渐变 token。

验证码链路补齐失败语义：邮箱先规范化；Resend 非 2xx 时记录状态码、收件域名和有限长度响应，向客户端返回可识别的 `Resend <status>`；本次未发送验证码立即从数据库删除，不再污染 60 秒限频。Resend 接受后记录 delivery id，客户端提示检查收件箱、垃圾邮件和推广邮件。验证结果：小程序 104/104、认证 API 36/36、TypeScript 与轻量 lint 通过。该后端诊断需部署到小程序固定 API 域名后生效。

注册验证码专项复查确认：注册和忘记密码共用同一 Resend 发送函数与发件地址，注册传 `email_verification`，忘记密码传 `reset_password`；数据库只影响已注册检查、验证码保存和 60 秒限频，不能解释“接口成功但只有注册邮件不可见”。若测试使用同一收件邮箱，必须以 Resend Emails 的最终投递事件区分接收端过滤、退信或 suppression；若使用不同邮箱，则先按收件地址维度排查。生产环境是否已经包含 delivery id 诊断仍需核对部署版本。

最终投递根因已由 Gmail 只读搜索确认：`zaohezi2020@gmail.com` 在 2026-07-16 实际收到 7 封来自 `noreply@ash.ashtangalife.online` 的注册验证码邮件，全部带 `SPAM` 标签并折叠在同一会话中。Resend 的 `sent → delivered` 没有误报；问题发生在 Gmail 接收后的垃圾邮件分类，不是 SQL、验证码表、注册 API 或 Resend 发送失败。Resend Deliverability Insights 唯一需要处理的项目也是避免使用 `no-reply` 发件地址。

全新账号注册后的首轮验收暴露两项既有缺口。教程记录在游客仓库仍然存在，但 `getGuestMergeSummary()` 与 `migrateGuestDataToAccount()` 都明确过滤 `is_tutorial`，因此切换到空白账号工作区后消失；现有测试也把“不迁移教程”作为契约。会员注册路由会调用 `ensureProfileAndGetId()` 并尝试插入 31 天 `trial`，但整个赠送块使用空 `catch`，无法从注册响应判断是否成功；小程序 `profile.js` 也尚未请求会员状态，`isPro` 保持静态 false。下一轮应同时补齐空账号教程连续性和真实会员状态读取，且不再静默吞掉赠送失败。

## 2026-07-16: 账户同步登录态 UI 对齐与测试账号安全重置脚本

再次以 `components/AccountBindingSection.tsx` 和 `components/DataStorageNotice.tsx` 为真源核对“我的 → 设置 → 账户同步”。登录态提示卡改为网页原有的琥珀到橙色半透明渐变与琥珀浅边框；“立即同步”移除微信原生 `button.loading`，避免按钮额外出现一个加载圈，改为只给刷新图标添加旋转动画。操作区明确保持“立即同步 / 退出登录”并列，“修改密码”独占下一行，并增加静态回归测试保护结构与颜色不再漂移。

曾使用一次性测试账号重置 SQL，针对 `zaohezi2020@gmail.com` 先展示 Auth 用户、业务表数量和 OSS 对象 key，再在事务内按外键顺序清理日历标注、会员、照片元数据、练习记录、选项、验证码、资料和 Auth 用户。脚本要求邮箱恰好匹配一个 Auth 用户，默认以 `ROLLBACK` 结束；只有人工核对 UUID 和数量后才允许改为 `COMMIT`。SQL 无法删除阿里云 OSS 实际文件，因此预览会列出需要另行清理的 `oss_key`。删除结果已核对，三个一次性 SQL 文件已于 2026-07-16 清理。

文件进度：更新 `weapp/pages/profile/profile.wxml`、`profile.wxss` 和 `weapp/tests/account-sync-ui.test.js`；测试账号重置 SQL 已执行并清理。验证结果：小程序自动化 104/104，TypeScript 与轻量 lint 通过。下一步以清空后的全新账号一次性验收注册、登录、记录、照片和跨端同步；失败时使用运行日志定位具体 pending operation。

## 2026-07-16: 微信开发者工具照片虚拟路径误同步修复

手机测试站裂图的根因由运行日志直接定位：记录 `913c2df2-1d95-42ea-be3f-54f64269a052` 的照片字段为 `http://store/...`，同时浏览器连续产生 `IMG resource_error`。`http://store` 是微信开发者工具 `saveFile` 的本机持久路径，不是 OSS 地址。旧 `isRemotePhoto` 只排除了 `http://tmp` 和 `http://usr`，因此 record 同步把该路径当作远程 URL，跳过了签名、PUT 和照片元数据三个上传步骤。

本轮在 `photo-storage` 中统一拆分本机、远程和云端安全照片：`wxfile://` 以及开发者工具 `tmp/usr/store` 均为本机路径，只有非本机 HTTPS URL 可以进入 Supabase payload。`data-repository` 在每次同步前扫描账号工作区，把遗留本机照片补入 photo upload 队列；record create/update 发送前再次清洗旧 payload。`account-workspace` 的 record 同步合并也改为保留本机待上传照片，确保“记录先创建、照片后上传”的顺序不会丢路径。

服务端增加第二道防线：`/api/photos` 校验 `oss_url` 必须是配置 bucket 与 endpoint 对应的 HTTPS 主机，拒绝 `http://store` 或任意外部地址；`/api/oss-signature` 缺少 endpoint 时不再生成伪 URL。新增开发者工具 store 路径分类、旧记录自动补传、payload 清洗和 API 校验测试。验证结果：照片专项 24/24，小程序全套 103/103，TypeScript 与轻量 lint 通过。

现有照片的自动恢复依赖昨天那台开发者工具仍保留 `http://store` 文件；同账号重新编译并同步即可补传。若文件已被清理，云端只有无效路径而没有原图内容，只能重新选择原图。后端防线需随 Next.js API 部署后生效。

## 2026-07-15: 游客教程记录与认证入口单一真源收口

补回网页版游客初始化语义：本机游客记录为空时，在当月 1 日创建一条与 `hooks/usePracticeData.ts` 一致的教程觉察笔记；初始化幂等，退出账号、导入后切游客和“退出并清空”后可立即恢复。教程记录明确只承担引导，不进入数据胶囊，也在游客合并摘要和上传阶段双重过滤，避免它变成账号真实练习。

账户 UI 漂移的根因不是认证组件本身，而是认证前的游客账户面板在 Tab Two 和“我的”各实现了一份。新增 `weapp/components/account-guest-panel/` 后，两处只负责调用同一组件；登录、注册、忘记密码继续统一使用 `weapp/components/auth-modal/`。认证组件的六个主按钮改为同一个显式品牌渐变样式源，不再依赖父页面或全局样式，因此登录按钮的颜色、白字、宽度和 48rpx 圆角在两个入口一致。

文件进度：更新 `weapp/app.js`、`pages/index`、`pages/journal`、`pages/profile`、`services/local-data.js`、`services/data-repository.js`；新增 `components/account-guest-panel/`；收敛 `components/auth-modal/`；补充教程初始化、教程不同步及公共 UI 回归测试。验证结果：小程序自动化 100/100，通过 TypeScript、轻量 lint 和 diff whitespace 检查。

下一步先在微信开发者工具检查教程只出现一次、两个账户入口视觉一致、六个认证主按钮同款；通过后不再拆认证表单，转入会员真实状态/支付激活方案或分享卡照片与长图自适应。

## 2026-07-15: 小程序账号与照片主闭环一次收口

在结构化 pending 队列基础上，本轮补齐三个此前明确保留的缺口。首次登录现在会检测游客 records、持久照片、自定义 options、profile 和 annotations，并明确询问是否合并；合并保留账号原数据、复用原 UUID、同一账号只决策一次，游客仓库不被自动清空。记录更新增加云端版本读取和更新时间冲突保护，解析结果写入 `conflict keep_remote/keep_local` 日志，避免旧设备静默覆盖更新设备。

照片链路不再把微信 tempFilePath 写进 Supabase。公共表单选择图片后先复制到小程序 `USER_DATA_PATH`，兼容真机 `wxfile://tmp` 和开发者工具 `http://tmp`；账号同步先创建记录，再获取 `/api/oss-signature`，读取 ArrayBuffer 以 PUT 上传 OSS，随后写 `/api/photos` 元数据并把本机路径替换为 OSS URL。上传和删除都是统一队列实体，失败保留重试；编辑删除、整条记录删除和清空本地数据同步清理任务或文件。觉察日记时光轴新增第一张照片展示与系统预览。

同时修复 Web 既有 photos API 的多图覆盖问题：创建元数据后按全部未删除照片重建记录 URL 列表；删除单张后按剩余照片重建，不再清空整条记录。运行日志新增远端/本地照片和待上传/待删除计数。

文件进度：新增 `weapp/services/photo-storage.js`、`weapp/tests/photo-storage.test.js`、`weapp/tests/photo-api.test.js`；更新 `data-repository.js`、`account-workspace.js`、`practice-records.js`、公共表单、觉察日记、我的页、运行日志和三个 photos API。验证结果：小程序自动化 97/97，通过 TypeScript、轻量 lint 和 diff whitespace 检查。

下一步只做一次真机验收：游客带图重启 → 登录合并 → 网页核对记录/照片 → 小程序替换或删除照片 → 断网新增后恢复补传。生产环境还需确认微信 request 合法域名包含 API 与 OSS 上传域名，并部署本轮 Next.js photos API；通过后转入会员真实状态、个人主体支付/激活方案和分享卡照片。

## 2026-07-15: 账号结构化数据同步一次收口

在 records pending 队列基础上，本轮继续一次接完账号的练习类型、个人资料与日历标注。`account-workspace` 现按用户隔离保存 records、options、profile、annotation types/assignments、统一 pending operations、最近同步状态和同步日志。`data-repository` 成为所有结构化数据的唯一入口；页面不再在账号模式下误读游客 profile 或游客标注。

新增 `practice-options` 云端 CRUD、`user-profile` 适配器和 `cloud-annotations` 鉴权 API 适配器。标注离线创建使用本机临时 UUID，云端创建成功后会原子重映射标注类型及尚未上传的日期分配。同步增加进程内互斥锁，避免“我的”页并行读取 records/options/profile 时重复处理同一个 pending 操作。所有 pending 本机版本均优先于云端读取，包含资料上传失败后防止云端旧昵称覆盖本机新昵称。

运行日志已扩展为账号诊断包：包含实体分组 pending 数量、操作、重试次数、原始错误、最近日志、记录缓存范围和标注月份缓存；账户 UI 显示所有账号数据的待同步项和最近同步时间，重置按钮接入真实状态。账号胶囊导出同步改用账号自己的 profile 与 annotations。自动化测试增至 88 项并全部通过。

照片继续单列，因为微信 tempFilePath、持久化、压缩、OSS 上传和 photos 元数据不是同一类结构化同步。真实账号验收后，再处理游客数据主动合并、多设备冲突选择与照片链路。

## 2026-07-15: 账号练习记录本机先写与待同步队列

阶段二第二刀已完成。账号模式的练习新增、编辑和软删除不再以云端请求成功作为本地可见的前提：操作先进入按 `user.id` 隔离的本机工作区，再写入 `pending_operations` 顺序补传。连续离线编辑同一条记录会合并；删除会立即从本机界面隐藏；云端拉取不会覆盖仍在排队的本机版本。创建请求复用本机 UUID，并使用 PostgREST `on_conflict=id`，网络抖动重试不会生成重复记录。

Tab Two 左上 Cloud 与“我的 → 设置 → 账户同步”的立即同步按钮已接真实队列、待同步条数和成功/失败状态。新增离线新增、编辑合并、删除、读取保护和幂等创建测试后，`npm.cmd run test:weapp` 84 项全部通过。

本轮范围仅为 `records`；`options`、`profile`、日历标注和照片仍未进入账号同步。下一步先在微信开发者工具完成离线新增/编辑/删除与恢复网络补传验收，再同步 `options + profile`，最后处理照片持久化、上传和跨端 URL。

## 2026-07-15: rounded-xl 真实圆角 token 修正

按钮圆角偏小的原因是错误套用了 Tailwind 默认圆角：本项目 `app/globals.css` 定义 `--radius: 1.25rem`，所以 `rounded-xl` 实际为 24px，对应小程序约 48rpx。账户提示卡/按钮和 auth-modal 输入、按钮、提示块已统一改为 48rpx，全套 80 项测试通过。

## 2026-07-15: 账户与认证按钮严格全宽修复

针对开发者工具中仍出现半宽、文字变绿和忘记密码按钮异常，本轮不再依赖微信原生 button 的默认布局：账户入口和 auth-modal 全部主操作改为普通块级按钮容器，显式继承提示卡/表单的 100% 宽度。组件内固定绿色渐变、白色文字和居中规则，禁用态只降低透明度；认证方法增加加载状态防重复触发。全套 80 项测试通过。

## 2026-07-14: 认证表单统一与按钮交互收口

认证 UI 现以 `weapp/components/auth-modal/` 为唯一真源。Tab Two 账户入口的“绑定邮箱/继续本地”固定为上下等宽按钮；根据用户产品决定，登录和绑定邮箱首屏移除与右上角叉重复的底部取消按钮，只保留全宽主操作。忘记密码按钮发灰定位为组件样式隔离导致全局 `.green-gradient` 不生效，已在组件内部补同款渐变。设置页不再跳旧登录页，直接复用同一个 auth-modal 并原地刷新账户状态。全套 80 项测试通过。

## 2026-07-13: 账户同步与认证弹窗视觉二次校准

用户指出首版弹窗结构仍偏离网页版。重新逐段核验 `AccountBindingSection`、`AuthModal`、`AuthModalForms` 后，删除自创登录/注册 tab，将账户入口恢复为两个全宽纵向按钮；注册改成真源两步流程，首屏“取消/发送验证码”并排、验证码页单个全宽确认；登录保留真源并排操作，忘记密码只保留全宽主按钮。小程序强制协议勾选要求继续保留。样式同步校准居中、间距、圆角、内边距与卡片背景，全套 79 项测试通过。

## 2026-07-13: Tab Two 账户同步与 AuthModal 链路

继续核对网页版点击链后，确认 `SyncButton` 应先打开 `AccountSyncModal`，再由未登录态进入居中 `AuthModal`。小程序现已补齐两层弹窗：底部账户同步面板复刻本地风险提示和三个入口；新增通用 `weapp/components/auth-modal/`，真实接入邮箱密码登录、验证码注册、忘记密码、协议阅读与强制同意。登录成功留在觉察日记，切换 cloud 模式并重新拉取账号数据。语法、JSON 与全套 79 项测试通过。

## 2026-07-13: Tab Two 同步按钮状态复刻

按网页版 `MonthlyHeatmap.tsx` 的 `SyncButton` 核对后，修正觉察日记左上云同步入口：游客是灰底红点，账号模式是绿色渐变，并以灰/蓝/绿/红分别表示空闲、同步、成功、失败。Cloud 素材继续使用审核包内副本；新增回归测试后全套 78 项通过。当前点击账号按钮仍是刷新云端页面数据，待 pending 队列完成后再升级为真正的双向同步入口。

## 2026-07-13: 账户同步 UI 按网页版重做

用户暂停登录功能测试，指出小程序账户同步 UI 与网页版完全不同。本轮沿真源 `AccountSyncSection → AccountBindingSection → DataStorageNotice` 重新核对，确认旧实现只保留了自创简化卡，缺少网页版未登录/已登录两套完整结构。

小程序现已恢复网页版信息层级：未登录态包含琥珀风险卡、缓存丢失说明、隐私说明、未同步状态灯和三个入口；已登录态包含脱敏邮箱、云同步标题、跨设备说明、同步状态、立即同步/退出登录、条件式重置和虚线修改密码。Mail、Smartphone、Lock、CheckCircle、Cloud、RefreshCw、LogOut、Key 均按 Lucide 真源复制到审核包。退出选项补齐“仅退出”和“退出并清空”，后者进入既有三阶段确认。

新增 3 项账户同步 UI 回归测试，全套 77 项通过。下一步先在开发者工具验收两种状态的视觉，再测试登录；“立即同步、状态灯、最近同步时间”仍等待 pending 同步队列接入后变为真实动态数据。

## 2026-07-11: 阶段二登录与注册入口收口

在开始账号缓存人工验收前，用户指出登录入口尚未正式收口。本轮重新对照 Web `AuthModal`、`AuthModalForms` 和忘记密码 flow：小程序保留邮箱密码登录、邮箱验证码注册和双协议强制勾选；新增发送重置验证码、校验验证码、设置新密码三步，并接入现有三个后端 API。

同时把密码规则从“仅检查长度”修正为 8 位、字母、数字和弱密码拦截；注册页实时展示要求。修复游客模式残留有效 session 时直接进入页面却没有切 account mode 的问题。UI 增加包内 Mail/Lock 图标、圆角卡片、品牌渐变按钮、验证码状态卡和重发倒计时。新增接口与静态闭环测试后，全套 74 项通过。

下一步人工验收路径固定为“我的 → 设置 → 账户同步 → 去绑定邮箱”；登录持久化通过后再测账号缓存离线回退，之后进入 pending 写队列。

## 2026-07-11: 阶段二第一刀，账号本机工作区

真实 Web 胶囊导入验收通过后进入阶段二。本轮新增 `weapp/services/account-workspace.js`：以 Supabase `user.id` 为命名空间保存每个账号独立的 records/options 快照、已缓存日期范围和更新时间，游客 storage 保持完全独立。

`data-repository.js` 的账号读取现为“优先请求云端并刷新缓存；请求失败且该范围已有缓存时回退缓存；从未缓存的范围继续抛错”。云端创建、编辑、软删除成功后也会更新账号本机快照。“我的”页移除直接调用 cloud service 的旁路，三个主页面统一经过 repository。新增账号隔离、在线缓存、离线回退和未缓存失败 4 项测试，全套 71 项通过。

下一步不是照片，也不是会员，而是 records 本机先写与 pending 同步队列：操作先落本机立即可见，再上传 Supabase；失败保留并自动重试。完成核心 records 同步后再扩展 options/profile，最后才接照片二进制链路。

## 2026-07-11: Web 真实胶囊兼容验证与导入弹窗复刻

用户提供了 WebApp 真实导出的 JSON。该格式可被小程序解析，缺少 `annotations` 和 option `color_level` 均可兼容；样本唯一记录 `duration: 0`，所以会出现在日历/时光轴，但不会计入统计。真正的不可见问题是导入写入游客 storage 后，账号模式仍继续读取云端。

本轮导入完成后显式切到 guest 本地模式，但保留 Supabase session 和云端数据；结果弹窗显示导入总数与可计入统计数。导入 UI 按 Web `ImportModal.tsx` 调整为红色提示、字段标签、文本框、带 ClipboardPaste/Check 图标的两枚全宽绿色按钮。新增真实样本测试后，小程序 67 项测试全部通过。

开发路线确认：本地产品验收完成后，不再重复做登录 UI，而是建立“登录账号的本机工作区”，随后接 records/options/profile 双向同步、冲突和删除标记；核心同步稳定后接照片本地持久化、OSS 上传和 URL 同步；最后接会员权限与个人主体允许的支付承接。

## 2026-07-11: 数据管理二轮修复

用户在开发者工具中发现：真实账号导出后再导入虽然提示成功，但游客页面仍无记录。定位到 `profile.openExportShell()` 固定调用 `exportLocalData()`，而后者只读游客 storage，没有使用 profile 页已加载的云端 records/options。现已改为从当前页面数据生成胶囊，并统一按 `dataRepository.getMode()` 决定读取 guest/cloud；导入结果返回并展示记录条数。

同时重新对照 `SettingsModal.tsx` 和 `PracticeModalHost.tsx`：4 个入口使用 Copy、Download、Bug、Trash2 及 ChevronRight 的 Lucide 原始路径，素材固化在小程序包；补回未登录时的橙色备份提示；按钮底色、间距和危险卡恢复网页版语义；清空流程改为危险说明、输入“确认删除”、最终执行确认三阶段。`npm.cmd run test:weapp` 共 66 项全部通过。

下一步：开发者工具用真实账号重新导出，确认 `records` 非空；切游客模式导入并核对日历、时光轴、热力图。清空流程先走到第三阶段后取消，确认 UI；需要真清空时务必先保存数据胶囊。

## 2026-07-11: 小程序“我的 → 设置 → 数据管理”本地功能接入

用户确认先暂停分享卡进一步复杂化，转入页面 3 设置里的“数据管理”。本轮先核对网页版源码：数据管理真源在 `components/settings/SettingsModal.tsx`，导出/导入弹窗真源是 `components/ExportModal.tsx`、`components/ImportModal.tsx`，数据格式真源是 `lib/import-export.ts`。小程序不做文件下载，按微信能力改为“弹窗 + 剪贴板 + 可滚动文本框”。

### 本轮修改

- `weapp/services/data-capsule.js`：
  - 新增本地数据胶囊服务。
  - 导出字段包含 `records`、`options`、`profile`、`annotations`、`export_at`。
  - 导出过滤草稿、教程和已软删除记录；profile 不导出头像。
  - 导入兼容旧字段 `label_zh → label`、`isCustom → is_custom`。
  - 导入合法胶囊会覆盖本地 records/options/profile/annotations；非法 JSON 不修改本地数据。
  - 新增运行日志 JSON 和清空本地数据能力。
- `weapp/services/local-data.js`：
  - 新增 records/options 替换能力。
  - 新增清空本地记录并恢复默认选项能力。
- `weapp/services/annotations.js`：
  - 新增替换和清空标注类型/标注分配。
- `weapp/services/local-profile.js`：
  - 新增重置默认 profile。
- `weapp/pages/profile/profile.wxml`：
  - 数据管理四个入口从占位 toast 改为真实功能：导出数据胶囊、导入数据胶囊、运行日志、清空本地数据。
  - 新增导出、导入、运行日志三个居中弹窗。
- `weapp/pages/profile/profile.js`：
  - 接入剪贴板复制/粘贴。
  - 导入前校验 JSON，并在覆盖本地数据前二次确认。
  - 清空本地数据前二次确认，不退出登录，不删除云端。
- `weapp/pages/profile/profile.wxss`：
  - 新增数据文本框、数据弹窗和按钮布局样式。
- `weapp/tests/data-capsule.test.js`：
  - 新增 5 项测试覆盖导出、导入、非法 JSON、清空和运行日志。
- `weapp/tests/navigation.test.js`：
  - 更新“我的”页数据管理测试，保护四个入口不再走 `placeholderAction`。
- `TODO.md`、`docs/weapp/DEVELOPMENT_PLAN.md`、`docs/weapp/UI_MIGRATION_MATRIX.md`：
  - 更新日期、文件进度、当前测试重点和下一步。

### 验证

- `npm.cmd run test:weapp` → 65 项通过

### 下一步测试

微信开发者工具中打开“我的 → 设置 → 数据管理”：

1. 点击“导出数据胶囊”，确认弹窗可滚动，复制后剪贴板是 JSON。
2. 点击“导入数据胶囊”，粘贴刚导出的 JSON 并确认导入，数据应正常恢复；粘贴错误文本应提示错误且不覆盖现有数据。
3. 点击“运行日志”，确认日志可复制。
4. 点击“清空本地数据”，确认后只清本机记录、选项、profile 和标注，不退出登录、不删除云端。

## 2026-07-11: 小程序分享卡白框、模糊和方形底板修复

用户在微信开发者工具复验两张分享卡时反馈：月度统计分享卡右侧有白色框，导出图片偏模糊；单条练习记录分享卡有更多方形框，内部颜色不统一，统计数据区域像有一块没抠干净的背景板。

### 根因判断

- 两张卡都使用旧版 `canvas-id` 画布。CSS 展示尺寸和 canvas 内部位图尺寸不完全一致，容易在预览时出现右侧白框或边缘空隙。
- 旧版 canvas 按 320px 逻辑尺寸直接导出，在高 DPR 屏幕上会显得模糊。
- 单条记录卡首版为了快速搭结构，使用了多处 `fillRect` 方形底板，和 Web `ShareCardModal.tsx` 的白底、细分隔线、圆角胶囊视觉体系不一致。

### 本轮修改

- `weapp/components/monthly-stats-share-card/index.wxml`：
  - 从旧版 `canvas-id` 改为新版 `type="2d"` canvas。
- `weapp/components/monthly-stats-share-card/index.js`：
  - 使用 `wx.createSelectorQuery()` 获取 canvas node。
  - 按设备 DPR 设置 `canvas.width/height`。
  - 保存时使用 `destWidth/destHeight` 导出高清图片。
- `weapp/components/monthly-stats-share-card/index.wxss`：
  - canvas 增加 `display: block`，避免 inline canvas 默认基线空隙造成边缘白框。
- `weapp/components/record-share-card/index.wxml`：
  - 从旧版 `canvas-id` 改为新版 `type="2d"` canvas。
- `weapp/components/record-share-card/index.js`：
  - 同样改为 DPR 高清绘制与导出。
  - 移除统计区灰色硬方形底板。
  - 突破提示改为圆角胶囊。
  - 统计区改为白底 + 细分隔线 + 统一墨绿/灰色文字。
- `weapp/components/record-share-card/index.wxss`：
  - canvas 增加 `display: block`。
- `weapp/tests/navigation.test.js`：
  - 增加防回归断言：保护新版 2D canvas、DPR 高清导出、禁止回退旧 `canvas-id`，并禁止单条卡恢复统计灰色方形底板。
- `TODO.md`、`docs/weapp/DEVELOPMENT_PLAN.md`、`docs/weapp/UI_MIGRATION_MATRIX.md`：
  - 更新日期、文件进度、当前测试重点和下一步。

### 验证

- `npm.cmd run test:weapp` → 60 项通过

### 下一步测试

微信开发者工具中先复验两张分享卡：

1. 点击月度统计卡，确认预览右侧不再有白框，保存出的图片更清晰。
2. 点击时光轴右侧觉察笔记，确认单条记录分享卡不再出现突兀方形底板，统计区颜色统一，保存出的图片清晰。
3. 若仍有视觉漂移，下一轮基于截图继续微调卡片内部排版；若通过，再补单条记录卡照片绘制。

## 2026-07-11: 小程序分享卡组件化与觉察笔记分享卡接入

用户确认日历标注闭环可用后，重新评估下一步：相比继续“我的”页，优先完善觉察日记下方月度统计卡片的点击、卡片生成、截图和保存功能。用户随后在微信开发者工具中看到月度截图卡片整体向左偏移，并要求继续核对网页版源码，同时把时光轴右侧“觉察笔记”的分享卡也一起做出来；两个功能相似，但需要分开组件。

### 源码核对与根因

- Web 月度统计分享卡真源：`components/MonthlyStatsShareModal.tsx`。
  - 卡片是 320px 白色圆角卡片。
  - 月历圆点是 7 列、32px 圆点、4px 间距。
  - 没有小程序旧实现里额外内嵌的灰色卡片。
- Web 单条记录分享卡真源：`components/ShareCardModal.tsx`；入口来自 `components/journal/JournalTab.tsx` 时光轴右侧觉察内容区域。
- 小程序偏移根因：旧实现用 `640rpx` 展示 canvas，但绘制代码按 320px 固定坐标绘制。不同设备上 `640rpx` 不一定等于 320px，导致 320px 内容贴左，右侧留下空白，看起来整张卡往左移。

### 本轮修改

- `weapp/components/annotation-manager/index.js`：
  - 标注颜色盘收回为网页版同款 9 色。
- `weapp/components/annotation-manager/index.wxss`：
  - `.ann-color-grid` 改为 9 个颜色一行居中，避免两行 10 个与网页版不一致。
- `weapp/components/monthly-stats-share-card/`：
  - 新增月度统计分享卡独立组件。
  - 从页面内 canvas 逻辑迁出，按 Web 320px 坐标体系绘制。
  - 圆点改为 32px、间距 4px，并去掉旧实现内嵌灰色卡片。
  - 弹层 canvas 显示尺寸改为固定 320px × 500px，修复 rpx/px 不一致导致的左偏。
  - 支持 `wx.canvasToTempFilePath` + `wx.saveImageToPhotosAlbum` 保存图片。
- `weapp/components/record-share-card/`：
  - 新增单条觉察笔记分享卡独立组件。
  - 首版绘制日期、练习类型、时长、突破、觉察笔记、统计和用户信息。
  - 支持保存图片到相册；照片绘制后续再按 Web `ShareCardModal.tsx` 继续补。
- `weapp/pages/journal/journal.wxml`：
  - 月度统计卡片挂载 `monthly-stats-share-card`。
  - 时光轴右侧觉察内容增加 `catchtap="openRecordShare"`，点击打开 `record-share-card`。
- `weapp/pages/journal/journal.js`：
  - 保留 `buildMonthlyShareData()`，页面只生成月度分享数据，不再直接绘制 canvas。
  - 新增 `buildRecordShareData()` / `openRecordShare()` / `closeRecordShare()`。
  - 打开两类分享卡时隐藏底部 Tab，关闭后恢复。
- `weapp/pages/journal/journal.wxss`：
  - 新增时光轴右侧觉察内容点击区样式。
- `weapp/tests/navigation.test.js`：
  - 增加防回归断言，保护月度分享卡组件、单条记录分享卡组件、Web 对齐尺寸、相册保存入口，并确保页面不再直接创建月度 canvas。
- `TODO.md`、`docs/weapp/DEVELOPMENT_PLAN.md`、`docs/weapp/UI_MIGRATION_MATRIX.md`：
  - 更新日期、文件进度、当前测试重点和下一步。

### 验证

- `npm.cmd run test:weapp` → 60 项通过

### 下一步测试

微信开发者工具中先验收两张分享卡：

1. 点击“觉察日记”月度统计卡，确认弹出月度分享卡预览，卡片不再整体左偏；点击“保存图片”后首次真机可能要求相册授权，授权后应保存成功；点击“返回”应关闭弹层并恢复底部 Tab。
2. 点击时光轴右侧觉察笔记区域，确认弹出单条记录分享卡预览；点击保存图片应成功；关闭后底部 Tab 恢复。

若单条卡视觉通过，下一步补照片绘制或更细 Web 视觉；若当前已够用，再继续“我的”页下一刀。

## 2026-07-11: 小程序日历标注保存后主日历显示修复

用户复验日历标注后反馈三点：颜色选择第二行缺一格；选择类型和日期后点击保存应直接回到 Tab Two 主页面；最重要的是保存后关闭弹层，Tab Two 主日历没有显示对应颜色标注。用户确认“我的”页过往历史校准可以使用，本轮继续聚焦日历标注。

### 根因判断

- 小程序主日历 `weapp/pages/journal/journal.wxml` 中仍有 `item.annotationColors.slice(0, 3)`。这和之前标注类型网格的 `types.slice(...)` 属于同类问题：JS 数据已存在，但微信 WXML 模板中调用数组方法不稳定，容易导致渲染异常。
- 新建标注类型后立即标注日期时，组件内短时间使用的是临时 `opt-*` 类型 ID。如果保存时没有映射到真实类型 ID，标注分配会写入孤儿类型 ID，主日历按真实类型表构建颜色映射时自然找不到。
- `onAnnotationSave` 保存成功后只 toast，没有关闭弹层，也没有立即刷新主日历。

### 本轮修改

- `weapp/components/annotation-manager/index.js`：
  - 本轮当时曾补齐第 10 个颜色；随后按用户新决定收回为网页版同款 9 色，并改为一行居中。
  - 标注弹层打开时使用 Tab Two 当前年月 `calendarYear/calendarMonth`，不再固定使用今天所在月份。
- `weapp/pages/journal/journal.js`：
  - `buildCalendarDays()` 为主日历日期预计算 `previewAnnotationColors` 和 `extraAnnotationCount`。
  - `onAnnotationCreateType()` 记录 `optimisticId -> realId` 映射。
  - `onAnnotationSave()` 保存前把临时 ID 转为真实 ID；保存成功后自动关闭标注弹层、恢复底部 Tab，并 `await this.loadCalendar()` 刷新主日历。
- `weapp/pages/journal/journal.wxml`：
  - 主日历标注圆点改为渲染 `item.previewAnnotationColors`，移除 `annotationColors.slice(...)`。
- `weapp/tests/navigation.test.js`：
  - 增加防回归断言，保护 Tab Two 主日历不再在 WXML 中调用 `annotationColors.slice`，并保护临时 ID 映射、保存后关闭弹层和刷新主日历逻辑。
- `TODO.md`、`docs/weapp/DEVELOPMENT_PLAN.md`、`docs/weapp/UI_MIGRATION_MATRIX.md`：
  - 更新日期、文件进度、当前测试重点和下一步。

### 验证

- `npm.cmd run test:weapp` → 60 项通过

### 下一步测试

微信开发者工具中进入“觉察日记 → 日历标注”：确认颜色选择区为 9 色一行居中；新建类型或选择已有类型，点击一个日期后保存；保存后应自动回到 Tab Two 主日历，所选日期底部应显示对应颜色圆点；关闭重开仍应显示。

## 2026-07-11: 小程序“我的”页过往练习本地校准接入

修完日历标注后，继续推进“我的”页。对照网页版 `components/settings/SettingsModal.tsx` 后确认：“过往练习”不是当前统计的 disabled 展示，而是两个可编辑校准字段：`historical_days` 和 `historical_avg_minutes`。保存后网页版会把这些字段写入 profile，并在总统计中作为基础练习量累加。

### 本轮修改

- `weapp/services/local-profile.js`：
  - 新增本地 profile 存储 `weapp_guest_profile_v1`。
  - 保存昵称、签名、头像、历史练习天数、历史平均分钟。
  - 对历史数字做非负整数归一化。
- `weapp/pages/profile/profile.js`：
  - 读取本地 profile 并显示在“我的”页主屏和设置页。
  - 总熬汤天数、总熬汤时长和平均分钟改为“真实记录 + 历史校准值”合并计算。
  - 新增昵称、签名、历史练习天数、历史平均分钟输入处理。
  - 新增 `saveProfileSettings()`，保存后即时刷新主屏统计并关闭设置弹层。
- `weapp/pages/profile/profile.wxml`：
  - 昵称、签名、历史练习天数、历史平均分钟改为可输入。
  - “保存设置”按钮接入真实本地保存，不再是占位 toast。
- `weapp/tests/navigation.test.js`：
  - 更新“我的”页个人资料测试，保护本地 profile、可编辑历史校准字段和统计合并逻辑。
- `TODO.md`、`docs/weapp/DEVELOPMENT_PLAN.md`、`docs/weapp/UI_MIGRATION_MATRIX.md`：
  - 更新日期、文件进度、当前测试重点和下一步。

### 验证

- `npm.cmd run test:weapp` → 60 项通过

### 下一步测试

微信开发者工具中进入“我的 → 设置 → 个人资料”，填写历史练习天数和平均分钟，点击“保存设置”。弹层应关闭，主屏总天数/总小时/平均分钟应立即按历史校准值累加；关闭重开小程序后，填写值仍应保留。

## 2026-07-11: 小程序日历标注视觉漂移修复

用户在微信开发者工具中确认标注类型网格已可显示，但继续反馈四个视觉问题：选中类型样式和网页版不同；日历整体像右偏；创建类型时名称输入框超出界面；底部颜色圆点和保存按钮没有居中且有溢出。

### 本轮修改

- `weapp/components/annotation-manager/index.wxss`：
  - 标注类型选中态保持白底，不再整块变浅绿，改为只放大/强化色点高亮，贴近网页版交互。
  - 月历每个日期圆点改为固定 `76rpx × 76rpx`，并让 7 列 grid 的每个单元显式居中，避免整体右偏。
  - 表单容器、输入框、按钮统一 `box-sizing: border-box` 和宽度约束，防止名称输入框和保存按钮被 padding 撑出弹层。
  - 颜色选择区从 flex wrap 改为固定 5 列 grid，并居中每个颜色圆点。
- `weapp/tests/navigation.test.js`：
  - 增加标注管理器样式防漂移断言，覆盖选中态、日历居中、颜色网格居中、输入框和保存按钮不溢出。
- `TODO.md`、`docs/weapp/DEVELOPMENT_PLAN.md`、`docs/weapp/UI_MIGRATION_MATRIX.md`：
  - 更新日期、文件进度、当前测试重点和下一步。

### 验证

- `npm.cmd run test:weapp` → 60 项通过

### 下一步测试

微信开发者工具中打开“觉察日记 → 日历标注”：创建一个新类型，确认类型立即出现；选择后点击日期并保存；同时检查选中态、月历居中、名称输入框、颜色圆点和保存按钮是否不再漂移/溢出。通过后继续推进“我的”页，优先补“过往练习”的真实数据展示/入口。

## 2026-07-11: 小程序日历标注类型网格不显示修复

### 背景

TODO 顶部记录了一个 2026-07-10 未修复问题：在小程序标注管理器中创建标注类型后，类型网格不显示新类型，导致无法选择类型并点击日期进行标注。此前尝试过属性观测器、`selectComponent` 回调、`saveVersion` 和乐观更新，但微信开发者工具中仍然不稳定。

### 根因判断

对照网页版 `components/CalendarAnnotation/AnnotationManagerModal.tsx` 和小程序 `weapp/components/annotation-manager/` 后，发现小程序 WXML 中仍有两类高风险写法：

- `wx:for="{{types.slice(0, 9)}}"`：在 WXML 模板中调用数组方法，微信模板环境不可靠。
- `getDateAnnotationColors(item.day)`：在 WXML 模板中调用组件方法并继续 `.length` / `.slice()`，同样不适合小程序模板。

这会造成 JS 逻辑测试通过，但开发者工具中模板不渲染或刷新不稳定。

### 修改内容

- `weapp/components/annotation-manager/index.js`：
  - 新增 `localTypes` 和 `displayTypes`，父级 `types` 只同步到组件内部数据，WXML 只渲染 `displayTypes`。
  - 创建类型时继续乐观插入，但不再 `setData({ types })` 改写 property，而是更新 `localTypes/displayTypes`。
  - 新增 `optimisticType`，父级真实类型返回后，将选中态从临时 `opt-*` ID 对齐到真实 ID。
  - 将 `pendingAdds/pendingRemoves` 从 `Set` 改为普通数组对象，避免 `setData` 序列化和模板渲染坑。
  - 每次状态变化后在 JS 中预计算 `calendarDays[].annotationColors / previewAnnotationColors / extraAnnotationCount`。
- `weapp/components/annotation-manager/index.wxml`：
  - 类型网格改为 `wx:for="{{displayTypes}}"`。
  - 日期圆点改为渲染预计算的 `item.previewAnnotationColors`。
  - 移除 WXML 中的 `types.slice(...)` 和 `getDateAnnotationColors(...)` 调用。
- `weapp/tests/navigation.test.js`：
  - 新增防回归测试，确保标注管理器不再在 WXML 中调用数组方法或组件方法，并且使用 `displayTypes` / `previewAnnotationColors` 渲染。
- `TODO.md`、`docs/weapp/DEVELOPMENT_PLAN.md`、`docs/weapp/UI_MIGRATION_MATRIX.md`：更新日期、文件进度和下一步测试。

### 验证

- `npm.cmd run test:weapp` → 60 项通过

### 下一步测试

微信开发者工具中打开觉察日记 → 点击日历标注 → 添加一个新类型 → 保存/创建后应立即回到主界面，并在类型网格中显示新类型；点击该类型后，再点击日期，应出现待保存圆点和“保存”按钮；保存后关闭再打开，标注仍应显示。

## 2026-07-10: 小程序“我的”页热力上色、过往练习数据与会员权益卡修正

### 背景

用户复验后反馈：“我的”页年度热力图仍全白；个人资料页“保存设置”按钮需要与上方内容等宽；会员页权益卡片缺失多项，应照搬网页版；下一步优先推进“过往练习”，让它先接入数据。

### 修改内容

- `weapp/pages/profile/profile.wxss`：在 profile 页显式补齐 `.heat-dot.green-gradient-1~4` 色阶，避免热力点被 `.heat-dot` 默认浅色背景盖住，导致有记录也显示全白。
- `weapp/pages/profile/profile.js`：过往练习区块先接入当前可得统计数据，`historicalDays` 使用当前记录天数，`historicalAvgMinutes` 使用平均分钟，`historicalHours` 使用累计小时；后续接 profile 历史基数时可在此基础上叠加。
- `weapp/pages/profile/profile.js`、`weapp/pages/profile/profile.wxml`：按网页版 `PRO_BENEFITS` 补齐会员权益表 6 行：每条记录照片、单张照片大小、练习选项、日历标注、日历颜色、唱诵倒计时。
- `weapp/pages/profile/profile.wxml`、`weapp/pages/profile/profile.wxss`：将会员“开通 Pro 会员”入口改为与上方内容等宽的白色动作卡，保留后续接入小程序支付/激活码的入口。
- `weapp/pages/profile/profile.wxss`：去除微信 `button::after` 默认边框，减少保存按钮与网页版样式偏差。
- `weapp/tests/navigation.test.js`：新增回归测试，保护 profile 热力色阶、过往练习数据绑定、完整会员权益表和等宽会员入口。
- `TODO.md`、`docs/weapp/DEVELOPMENT_PLAN.md`、`docs/weapp/UI_MIGRATION_MATRIX.md`：更新当前进度、测试重点和下一步。

### 验证

- `npm.cmd run test:weapp` → 47 项通过

### 下一步测试

微信开发者工具中优先复验：有练习记录的日期是否出现绿色热力点；个人资料“过往练习”两张白色数字卡是否显示当前统计；“保存设置”按钮是否和上方输入区等宽；会员 tab 是否显示 6 行完整权益，开通入口是否与卡片等宽。

## 2026-07-10: 小程序“我的”页二轮源码核对修正

### 背景

用户继续验收“我的”页后指出：热力统计只关联游客记录，登录账号的真实练习记录没有进入统计；设置弹层四个 tab 按钮大小、颜色和样式不统一；个人资料页头像相机图标被圆形裁切，过往练习区块被做成普通表单字段，签名框高度过大。要求重新核对网页版源码做 1:1 复刻。

### 修改内容

- `weapp/pages/profile/profile.js`：有 Supabase session 时，“我的”页优先直接读取云端 `practice_records` 和云端练习选项；没有 session 时才读取游客本地记录，避免登录用户统计仍只看游客数据。
- `weapp/pages/profile/profile.wxml`：个人签名从高 textarea 改回网页版单行 input；过往练习改为独立区块，包含标题行、“累计约 X 小时”和两个白色统计小卡片（天数、分钟/次）。
- `weapp/pages/profile/profile.wxss`：设置四 tab 统一成圆角胶囊样式；未选中为浅米底，选中为绿色渐变，会员 tab 选中为金色渐变；个人资料头像允许相机按钮溢出显示，不再被圆形裁切；签名框高度收窄；过往练习卡片按网页版白底圆角卡片样式复刻。
- `weapp/scripts/generate-landing-icons.mjs`、`weapp/images/icons/profile-calendar.png`：新增 profile 过往练习 Calendar 图标，继续使用包内 lucide 语义图标，不用临时字符。
- `weapp/tests/navigation.test.js`：新增回归测试，保护 profile 页有 session 时读取云端记录、设置 tab 会员金色选中态、相机按钮不被裁切、签名框为单行 input、过往练习为源码同款卡片结构。
- `TODO.md`、`docs/weapp/DEVELOPMENT_PLAN.md`、`docs/weapp/UI_MIGRATION_MATRIX.md`：更新文件进度、测试重点和下一步。

### 验证

- `npm.cmd run test:weapp` → 46 项通过

### 下一步测试

微信开发者工具中用登录账号进入“我的”页，确认年度热力图和三列统计读取该账号云端真实练习记录；再打开设置，检查四个 tab 的胶囊大小、颜色和选中态是否统一，会员 tab 选中是否为金色；进入个人资料 tab，检查相机按钮不被头像裁切，签名框是否为单行高度，过往练习是否为标题行 + 两张白色数字卡片。

## 2026-07-10: 小程序“我的”页 UI 漂移修正

### 背景

用户验收“我的”页时指出四个漂移点：右上角齿轮图标不一致、默认头像不一致、空记录时年度热力图不应整块隐藏、个人资料页保存按钮样式不对。本次只修复这四项，不扩展真实功能。

### 修改内容

- `weapp/scripts/generate-landing-icons.mjs`：补充 `profile-settings.png`、`profile-user.png`、`profile-user-muted.png`、`profile-camera.png` 四个 profile 专用 lucide 语义图标，并重新生成到 `weapp/images/icons/`。
- `weapp/pages/profile/profile.wxml`：右上角设置、主屏默认头像、个人资料头像和相机入口从临时字符改为包内 PNG；热力图改为始终渲染 12 个月底盘，空状态文案不再替代热力图；个人资料按钮文案改为网页版的“保存设置”。
- `weapp/pages/profile/profile.wxss`：补齐 profile 图标尺寸；个人资料头像改回浅色底 + muted User；保存按钮改为全宽圆角渐变样式。
- `weapp/tests/navigation.test.js`：新增防漂移断言，禁止 profile 页继续使用 `⚙`、`♙`、`⌁` 临时字符；保护 profile 图标包内路径、空记录热力图渲染和“保存设置”文案。
- `TODO.md`、`docs/weapp/DEVELOPMENT_PLAN.md`：更新本轮文件进度和下一步验收点。

### 验证

- `npm.cmd run test:weapp` → 45 项通过

### 下一步测试

微信开发者工具中切到“我的”页，重点看四处：右上角齿轮是否变成网页版同款线框；默认头像是否是 User 线框而不是棋子/字符；没有练习记录时是否仍显示全年热力图圆点；个人资料 tab 的“保存设置”是否为全宽圆角绿色渐变按钮。

## 2026-07-10: 小程序“我的”页复刻网页版我的数据 UI 外壳

### 背景

用户确认这一轮先不处理口令音频慢的问题，改为迁移小程序“我的”页。要求是先完整复刻网页版“我的数据”页的按钮、UI、布局和设置弹层外壳，功能可以后续一个按钮一个按钮接入；网页版真源为 `components/stats/StatsTab.tsx`、`components/settings/SettingsModal.tsx`、`AccountBindingSection.tsx`、`MembershipCard.tsx` 和 `MembershipActions.tsx`。用户已明确小程序不保留网页版左上角 PWA“安装到主屏幕”按钮。

### 修改内容

- `weapp/pages/profile/profile.js`：重写“我的”页状态与本地数据派生逻辑；读取当年记录和练习选项，计算总熬汤天数、总熬汤时长、平均分钟，并生成 12 个月、16 列年度热力图数据。
- `weapp/pages/profile/profile.wxml`：复刻网页版 StatsTab 主屏结构：右上角设置按钮、居中渐变头像、昵称、FREE/PRO badge、升级 Pro 胶囊、ID、签名、三列统计卡和年度热力图；不保留 Download/PWA 安装按钮。
- `weapp/pages/profile/profile.wxml`：新增设置底部弹层外壳，包含“个人资料 / 会员 / 账户同步 / 数据管理”四个 tab；补齐保存、开通 Pro、绑定邮箱、继续本地存储、点击登录、立即同步、退出登录、同步卡住重置、修改密码、复制/导入数据胶囊、运行日志、清空本地数据等按钮。
- `weapp/pages/profile/profile.wxml`：新增激活码、退出选项、修改密码三个居中弹窗外壳；真实提交功能暂不接入，占位按钮统一提示“下一步接入”。
- `weapp/pages/profile/profile.wxss`：按网页版视觉迁移圆形渐变头像、FREE/PRO badge、会员胶囊、三列白色圆角统计卡、年度热力图、底部上滑设置弹层、会员金色卡片、设置列表项和居中弹窗。
- `weapp/tests/navigation.test.js`：新增“我的”页 UI 回归测试，覆盖主屏结构、PWA 安装按钮移除、四个设置分区、全部占位按钮、年度热力图和包内 Moon Day 图片路径。
- `TODO.md`、`docs/weapp/DEVELOPMENT_PLAN.md`、`docs/weapp/UI_MIGRATION_MATRIX.md`：更新日期、文件进度、测试重点和下一步。

### 验证

- `npm.cmd run test:weapp` → 45 项通过

### 下一步测试

微信开发者工具中切到“我的”页，对照网页版“我的数据”检查：顶部只保留右上角设置按钮；头像、昵称、FREE badge、升级 Pro 胶囊、ID、签名、三列统计卡和年度热力图的间距/圆角/色阶是否接近；打开设置弹层，逐个切换四个 tab，确认按钮都出现、关闭正常、底部导航被遮住。若 UI 通过，下一步按按钮接入真实功能，优先建议接“个人资料保存”或“会员激活码”。

## 2026-07-10: 小程序唱诵/口令按钮互斥与口令音频预热

### 背景

继续对照网页版源码发现：网页版在开始练习时明确禁止“开篇唱诵”和“一序列口令跟练”同时使用。小程序此前只在点击开始时拦截，按钮状态层仍可能同时显示为开启/选中，容易造成误解。同时，远程 44MB 口令音频首次加载超过 10 秒，需要先做小程序侧可控的预热优化。

### 修改内容

- `weapp/pages/practice/practice.js`：打开“开篇唱诵”时，如果当前选中“一序列口令”，自动取消口令选中并释放口令音频。
- `weapp/pages/practice/practice.js`：选中“一序列口令”时，如果“开篇唱诵”已开启，自动关闭唱诵并更新按钮文案为“关”。
- `weapp/pages/practice/practice.js`：选中“一序列口令”时立即调用 `guidedAudio.preload()`，提前建立音频上下文和请求资源；取消选择时释放音频。
- `weapp/services/guided-audio.js`：新增 `preload()`；音频上下文默认 `autoplay = false`，真正开始练习时复用已预热的上下文并播放，避免点开始后才重新发起加载。
- `weapp/tests/navigation.test.js`：新增按钮互斥和口令预热的回归保护。
- `TODO.md`、`docs/weapp/DEVELOPMENT_PLAN.md`：更新文件进度、测试重点和下一步。

### 验证

- `npm.cmd run test:weapp` → 42 项通过

### 下一步测试

微信开发者工具中测试两种互斥路径：先开唱诵再点一序列，应自动关闭唱诵；先选一序列再点唱诵，应自动取消口令。音频速度测试要分两种：刚进入页面立刻点开始的冷启动速度；先选中“一序列”等 3–5 秒再点开始的预热速度。如果预热后仍超过 2 秒，下一步应优化音频源本身（faststart/切片/码率/CDN Range），不要把 44MB 文件重新打入审核包。

## 2026-07-10: 小程序今日练习音频链路收口与包体修正

### 背景

当前落地页与整体 UI 已由用户确认“可以接受”，主线从继续抠落地页视觉，切回今日练习的真实可用闭环。继续检查时发现两个需要在真机验收前先处理的问题：WXML 中直接调用时间格式化函数存在兼容风险；一序列口令音频如果直接打入小程序包会超过合理审核包体。

### 修改内容

- `weapp/pages/practice/practice.wxml`：音频进度文本不再写 `{{formatAudioTime(...)}}`，改为绑定 `guidedAudioCurrentText` 和 `guidedAudioDurationText`。
- `weapp/pages/practice/practice.js`：在 JS 的 `onTimeUpdate` 中预格式化音频当前时间和总时长；重新加载口令音频时同步重置显示文本。
- `weapp/services/guided-audio.js`：一序列口令音频改为远程播放 `https://ash.ashtangalife.online/audio/guruji-led-primary.m4a`，保留加载、播放、暂停、进度、失败重试和进退控制。
- `weapp/audio/`：移除 44MB 的 `guruji-led-primary.m4a`，审核包内仅保留开篇唱诵 `opening-chant.mp3`。
- `weapp/tests/navigation.test.js`：更新落地页顶部栏断言为当前已接受的 UI；新增保护测试，防止 WXML 再直接调用 `formatAudioTime`，并防止口令大音频重新打进本地包。
- `docs/weapp/DEVELOPMENT_PLAN.md`、`docs/weapp/UI_MIGRATION_MATRIX.md`、`TODO.md`：更新当前日期、文件进度、测试重点和下一步。

### 验证

- `npm.cmd run test:weapp` → 41 项通过
- `weapp/audio` 当前约 1.05MB，仅包含 `opening-chant.mp3`
- 运行时代码扫描：UI 素材已包内化；仅保留 API / Supabase 配置和一序列口令音频远程 URL

### 下一步测试

微信开发者工具中优先验收今日练习完整链路：普通练习开始/暂停/继续/结束/保存；开篇唱诵倒计时、播放和跳过；一序列口令加载、播放、暂停、继续、进退、失败重试；保存后觉察日记刷新。重点观察远程音频合法域名、首播缓冲、切后台/回前台后的恢复行为。

## 2026-07-10: 小程序 UI 素材包内化

### 背景

小程序后续需要单独上传代码审核，不能只引用网页工程 `public/` 下的素材，也不应依赖线上图片或 `data:image` 图标。继续排查发现：今日练习页 logo 和开始按钮仍使用线上图片；Moon Day 图片仍使用线上 URL；Tab、公共表单、今日练习音量、觉察日记工具栏仍有 `data:image` 图标。

### 修改内容

- `weapp/images/`：补齐小程序包内 UI 素材：`icon-light.png`、`icon-green.png`、Moon Day 图片、Tab 图标、公共表单图标、今日练习音量图标、觉察日记工具栏图标。
- `weapp/scripts/generate-landing-icons.mjs`：从“落地页图标生成脚本”扩展为小程序图标生成脚本，统一生成落地页、Tab、表单、音量、工具栏图标。
- `weapp/custom-tab-bar/index.js`：底部 Tab 的 Calendar / BookOpen / User 图标从 `data:image` 改为 `/images/icons/tab-*.png`。
- `weapp/pages/practice/practice.wxml`：品牌 logo、开始按钮 `icon-light` / `icon-green` 改为包内 `/images/...`。
- `weapp/pages/practice/practice.js`：音量图标改为 `/images/icons/practice-volume*.png`。
- `weapp/pages/journal/journal.js`：工具栏 Cloud / Message / Pencil / Plus 图标改为包内 PNG；Moon Day 图片改为 `/images/moon-phase/*.png`。
- `weapp/components/practice-record-form/index.js`：相机、全屏编辑图标和日期选择器 Moon Day 图片改为包内资源。
- `weapp/tests/navigation.test.js`：新增递归扫描测试，禁止运行时代码再次出现 `data:image` UI 图标或网页托管的 icon/moon-phase 图片路径。
- `docs/weapp/DEVELOPMENT_PLAN.md`、`docs/weapp/UI_MIGRATION_MATRIX.md`、`TODO.md`：更新日期、文件进度、测试重点和下一步。

### 验证

- `rg -n "https://|data:image" weapp -g "*.js" -g "*.wxml" -g "*.wxss" -g "*.json"`：运行时代码仅剩 API / Supabase 配置；素材路径已本地化。
- `npm.cmd run test:weapp` → 40 项通过

### 下一步测试

微信开发者工具中重点看：底部 Tab 图标、今日练习 logo/开始按钮/音量图标、觉察日记工具栏、Moon Day 图标、公共表单相机/全屏图标、落地页所有图标是否都正常显示。若有图标尺寸或颜色偏差，先改 `weapp/scripts/generate-landing-icons.mjs` 再重新生成 PNG。

## 2026-07-10: 小程序落地页二轮修正——图标、顶部安全区和按钮

### 背景

微信开发者工具继续验收落地页时发现：6 个核心卡片图标仍是临时符号，不是网页版 lucide 图标；顶部 logo 和“开始练习”按钮仍可能被微信自定义导航栏/胶囊区域压住；两个“开始练习”按钮样式和网页版不一致；Hero 中 `&amp;` 被当作字面量显示；logo 下方英文 slogan 过长导致换行。

### 修改内容

- `weapp/pages/landing/landing.wxml`：移除 `◷`、`□`、`▦`、`◇`、`☕`、`⌁` 等自编符号；改为引用本地图标资源；Hero 的 `&` 改为数据绑定，避免显示成 `&amp;`。
- `weapp/pages/landing/landing.js`：增加落地页图标路径映射，引用 `/images/icons/landing-*.png`；保留首次展示逻辑 `has_seen_landing`。
- `weapp/pages/landing/landing.wxss`：顶部栏高度从 `124rpx` 级别继续加高到 `178rpx + safe-area`，hero 首屏内容下移；logo 保持圆形；英文 slogan 缩小并强制单行省略；两个“开始练习”按钮改为网页版深绿到墨绿渐变、金色箭头和阴影。
- `weapp/scripts/generate-landing-icons.mjs`：新增图标生成脚本，从网页版 lucide 语义生成小程序本地 PNG，避免微信端 SVG/data URI 兼容性问题。
- `weapp/images/icons/landing-*.png`：新增 12 个落地页本地图标：ArrowRight、Loader、Leaf、ChevronDown、Timer、BookOpen、BarChart3、Moon、Wind、Shield、Coffee、Github。
- `weapp/tests/navigation.test.js`：增加保护，禁止落地页继续使用自编符号、`&amp;` 字面量和旧安全区高度；锁定 6 个核心图标为本地 PNG。
- `docs/weapp/DEVELOPMENT_PLAN.md`、`docs/weapp/UI_MIGRATION_MATRIX.md`、`TODO.md`：更新日期、文件进度、测试重点和下一步。

### 验证

- `npm.cmd run test:weapp` → 39 项通过

### 下一步测试

在微信开发者工具中清空本地数据后重新打开小程序，重点看：顶部 logo/按钮是否还被挡；logo 是否圆形；6 个卡片图标和其他装饰图标是否全部显示；两个“开始练习”按钮是否接近网页版；Hero 是否显示真实 `&` 而不是 `&amp;`；英文 slogan 是否保持单行。

## 2026-07-10: 小程序落地页重新核对与首轮修正

### 背景

小程序独立落地页 `pages/landing/landing` 和网页版 `app/page.tsx` 存在明显偏差：顶部品牌栏被自定义导航/安全区挤压，logo 不是圆形；多个 `data:image/svg+xml` 图标在微信环境下可能不显示；WXML 使用了不稳妥的 `nav` / `section` 标签；Hero 引文把 `<br/>` 当成文字展示；页面仍残留 `Est. 2026`、`Scroll`、`Rest In Peace`、`Journal` 等未按小程序语境处理的英文；动画也不完整。

### 修改内容

- `weapp/pages/landing/landing.wxml`：按网页版层级重写为稳定小程序结构：Navbar、Hero、Features、Brand Story、Guruji、Promise、CTA。
- 将 `nav` / `section` 改为 `view`，避免小程序解析和样式不稳定。
- 顶部品牌栏加大安全区和高度，避免被顶部区域遮挡；logo 改为圆形并加轻阴影。
- 移除小程序不稳定的 SVG data image 图标，改用可渲染的文字/符号图标。
- 修复 Hero 引文换行，不再显示假 `<br/>`。
- 文案本地化：`始于 2026`、`向下`、`谨以纪念`、`日记`、`© 2026 熬汤日记`。
- `weapp/pages/landing/landing.wxss`：补进入动画、下滑提示动画、月亮旋转、CTA 光泽、特征区纹理和按钮渐变。
- `weapp/tests/navigation.test.js`：增加落地页质量保护，防止再出现不稳定标签、SVG data image、假换行和未翻译文案。

### 验证

- `npm.cmd run test:weapp` → 39 项通过
- `npm.cmd run typecheck` → 通过

### 下一步

在微信开发者工具中验收落地页：首次展示/二次跳过/清空数据后重现；顶部品牌栏是否避开导航区域；logo 是否圆形；图标是否全部显示；动画是否自然；文案是否符合小程序语境。

## 2026-07-10: 小程序唱诵倒计时位置修正、保存按钮全宽 + 口令跟练（一序列）音频接入

### 背景

微信开发者工具验收时发现三处问题：唱诵倒计时大圆圈和计时大圆圈位置不一致（圆圈在同一个位置，但倒计时的 padding 布局导致位置偏差）；3 个编辑记录表单的保存按钮未左右顶满（与网页版不一致）。同时需将网页版的口令跟练音频（一序列）完整迁移到小程序。

### 修改内容

- `weapp/pages/practice/practice.wxss`：唱诵倒计时遮罩改为 `rgba(255,255,255,0.3) + backdrop-filter: blur(8px) + border: 1rpx solid rgba(255,255,255,0.3)`，与网页版 `bg-white/30 backdrop-blur-[8px]` 一致；新增 `.chant-countdown-main`（flex:1 居中布局，与计时大圆圈同位置）；新增 `.chant-skip-area`（底部位置对齐 session controls）。`.completion-save` 增加 `width: 100%`、`min-width: 0`、`margin-left/right: 0`、`line-height: 1`、`padding: 0`、`box-sizing: border-box` 覆盖微信 button 默认宽度限制。
- `weapp/components/practice-record-form/index.wxss`：`.save-button` 增加 `width: 100%` 和 `box-sizing: border-box`。
- `weapp/pages/practice/practice.wxml`：唱诵倒计时遮罩重构为 flex:1 布局；新增 3 段音频 UI（加载中旋转卡片、错误卡片+重试、进度条+时间标签）；新增进退控制（‹/› 圆形按钮 + 10/15/30 秒步长选择器）。
- `weapp/pages/practice/practice.js`：新增 `guidedAudio` require；新增强口令相关 7 个 data 字段；`onStartPractice` 对口令模式创建 `initiallyPaused` 会话并调用 `loadGuidedAudio()`；`onHide/onUnload` 释放音频；`togglePause` 同步音频播放状态；`requestEndPractice/cancelEndPractice` 控制音频暂停/恢复；`restorePracticeSession` 支持口令音频自动加载（暂停状态静默加载）。
- `weapp/services/practice-session.js`：`start(option, now, initiallyPaused = false)` 新增 `initiallyPaused` 参数，口令模式下创建暂停会话（加载期间不计时）。
- `weapp/services/guided-audio.js`（新增）：基于 WebApp `hooks/useGuidedAudio.ts`，使用 `wx.createInnerAudioContext()` 播放 `/audio/guruji-led-primary.m4a`，`obeyMuteSwitch = false`；支持 `load/play/pause/seek/retry/releaseAudio/getState`。
- `weapp/audio/guruji-led-primary.m4a`：从 WebApp `public/audio/` 复制（44MB）。

### 技术细节

- 唱诵和口令跟练互斥（网页版限制已保留）。
- 口令模式练习计时从音频加载完成开始，加载时间（约 10 秒首次）不计入练习时长。
- 会话恢复时：暂停状态的口令 session 静默加载音频但不自动恢复计时。
- 音频结束自动触发「结束练习」确认弹窗。

### 验证

- `node --check weapp/services/guided-audio.js weapp/services/practice-session.js weapp/pages/practice/practice.js` → 通过
- `npm.cmd run test:weapp` → 通过（已有测试未受影响）
- `npm.cmd run typecheck` → 通过

### 下一步

微信开发者工具验收倒计时位置、保存按钮宽度和口令音频加载/播放/进退/错误恢复。通过后进入公共表单视觉收口和真机验收。

---

## 2026-07-10: 小程序公共表单三处视觉细节修复

### 背景

微信开发者工具验收时发现三处视觉细节：完成弹层“练习完成”标题和下方表单距离太近；全屏编辑页左上角“收起”的 V 形箭头和文字没有垂直对齐；小程序顶部原生导航栏不能做按钮同款渐变，应保持 logo/品牌主绿。

### 修改内容

- `weapp/pages/practice/practice.wxss`：为 `.completion-title` 增加 `margin-bottom: 34rpx`，拉开标题与公共表单距离。
- `weapp/components/practice-record-form/index.wxml` / `.wxss`：把文字 `⌄` 换成 CSS chevron，和“收起”文字使用 flex 居中对齐。
- `weapp/app.json`：确认微信原生导航栏不支持 CSS 渐变，`navigationBarBackgroundColor` 保持 logo/品牌主绿 `#2A4B3C`。
- `weapp/tests/practice-record-form.test.js` / `weapp/tests/navigation.test.js`：增加标题间距、CSS chevron 和顶部栏色值保护。

### 验证

- `npm.cmd run test:weapp` → 38 项通过
- `npm.cmd run typecheck` → 通过

### 下一步

在微信开发者工具中确认三处视觉：完成标题与表单间距是否舒展；“收起”箭头是否和文字居中；顶部原生导航栏是否与 logo/品牌主绿协调。

### 补充确认

小程序当前也已有独立落地页 `pages/landing/landing`：使用 `has_seen_landing` 控制首次展示，点击“开始练习”后写入本地标记并进入今日练习；后续进入小程序会自动跳过落地页。清空本地数据后，该标记消失，落地页会再次展示。

## 2026-07-10: 小程序公共表单突破解锁、图片和全屏入口修复

### 背景

微信开发者工具验收时发现四类问题：公共表单点击“解锁/突破”后没有展开；完成练习弹层顶部重复显示序列和时间，而下方表单已经有同样字段；完成、补录、编辑三处共用表单缺少图片入口；第一版图片入口做成了独立大块区域，和网页版“笔记框右下角相机/展开圆按钮”不一致。

### 修改内容

- `weapp/components/practice-record-form/index.js`：把 `breakthroughEnabled` 纳入表单状态一起向父级传递，避免父级回传空 `breakthrough` 时把按钮状态重置。
- `weapp/components/practice-record-form/index.wxml` / `.wxss`：按网页版把相机上传和全屏编辑放到“觉察/笔记”输入框右下角的两个绿色圆形按钮；支持微信本地选择图片、预览和删除。
- `weapp/components/practice-record-form/index.js`：新增全屏笔记编辑开关和同步输入逻辑；全屏页收起后内容同步回公共表单。
- `weapp/pages/practice/practice.wxml`：移除完成练习弹层顶部重复的序列/时间摘要。
- `weapp/pages/practice/practice.js`：完成练习保存时带上 `photos`，待保存表单恢复时保留图片和突破开关状态。
- `weapp/pages/journal/journal.js`：补录和编辑表单保存/回显 `photos`。
- `weapp/services/data-repository.js`：游客本地记录保留 `photos` 字段。
- `weapp/services/practice-records.js`：云端 create/update payload 允许 `photos` 字段；真正 OSS 上传和照片元数据仍放到阶段二账号同步统一完成。
- `weapp/tests/practice-record-form.test.js`：新增公共表单突破解锁、图片入口、全屏入口位置和完成弹层去重保护。

### 落地页逻辑确认

网页版落地页 `app/page.tsx` 当前只依赖 `localStorage.has_seen_landing`：第一次点击“开始练习”后写入 `true`，后续访问 `/` 会自动跳转 `/practice`；如果清空浏览器本地数据，该标记消失，落地页会再次展示。小程序当前冷启动直接进入 `pages/practice/practice`，没有独立落地页。

### 验证

- `node --check weapp/components/practice-record-form/index.js weapp/pages/practice/practice.js weapp/pages/journal/journal.js weapp/services/data-repository.js weapp/services/practice-records.js` → 通过
- `npm.cmd run test:weapp` → 36 项通过
- `npm.cmd run typecheck` → 通过

### 下一步

在微信开发者工具验收完成练习、补录、编辑三处公共表单：突破解锁是否展开、图片是否在笔记框右下角相机按钮进入、全屏编辑是否在右下角展开按钮进入、图片能否选择/预览/删除/保存、完成弹层是否不再重复显示序列和时间。通过后继续按网页版抠表单视觉细节。

## 2026-07-10: 小程序纯本地测试入口阻塞修复

### 背景

微信开发者工具中仍无法顺畅测试纯本地版本：冷启动会先进旧的测试/登录入口；历史登录 session 会让仓库进入云端模式，导致云端练习选项为空时看不到网页版默认选项；自定义练习弹层被底部悬浮导航盖住。

### 修改内容

- `weapp/app.json`：冷启动首页改为 `pages/practice/practice`，登录/注册页保留为非 Tab 页面，由“我的”入口进入。
- `weapp/app.js`：启动时默认游客模式；只有明确设置 `weapp_account_mode_enabled` 且存在 session 才进入云端，避免历史登录残留干扰纯本地测试。
- `weapp/services/data-repository.js`：游客开关优先；账号模式显式开启才走云端；练习选项为空时回退到网页版默认选项 `一序列 / Mysore`、`半序列 / 站立+休息`。
- `weapp/pages/index/index.js`：真实登录成功后清理游客开关并开启账号模式，避免登录后仍停留在游客仓库。
- `weapp/pages/profile/profile.js`：登录入口开启账号模式；退出后清理账号模式并回到游客模式。
- `weapp/pages/practice/practice.wxss`：提高练习页弹层遮罩层级，确保自定义练习弹窗盖住底部悬浮导航。
- `weapp/components/practice-record-form/index.wxss`：提高日期/类型底部选择器层级，避免被底部导航遮挡。
- `weapp/tests/navigation.test.js`：增加冷启动首页必须是今日练习的保护。
- `weapp/tests/local-data.test.js`：增加游客模式优先于历史登录 session 的保护。

### 验证

- `node --check weapp/app.js weapp/services/data-repository.js weapp/pages/index/index.js weapp/pages/practice/practice.js` → 通过
- `npm.cmd run test:weapp` → 32 项通过
- `npm.cmd run typecheck` → 通过

### 下一步

在微信开发者工具中先验证：冷启动直接进入今日练习；默认练习选项出现；点击 `+ 自定义` 后底部悬浮导航被遮罩盖住。确认纯本地入口可用后，再继续验收完成/补录/编辑公共表单。

## 2026-07-10: 小程序公共练习记录表单接入

### 背景

小程序的“完成练习”“补录练习”“编辑记录”原本各自有一套表单或原生 picker，和网页版 `PracticeForm` / `RecordPickers` 的结构差距较大。继续分别改会导致 UI 越修越分叉，也不利于后续账号同步和会员能力统一。

### 修改内容

- 新增 `weapp/components/practice-record-form/` 公共练习记录表单。
- 表单顺序按网页版迁移：日期/类型、时长/突破、突破内容、日历颜色、觉察/笔记、保存。
- 用自定义日期月历底部弹层替换微信原生日期 picker，并在月历中显示已有练习色阶、突破点和 Moon Day 图标。
- 用三列类型卡片底部弹层替换原生类型 picker，过滤唱诵、今日人数和自定义按钮，只展示真实练习类型。
- `weapp/pages/journal/` 的补录和编辑接入公共表单。
- `weapp/pages/practice/` 的完成练习弹层接入公共表单；完成前已填写的表单内容会写入 pending completion，重启后可恢复。
- 更新小程序总路线、UI 迁移矩阵和 TODO，下一步固定为微信开发者工具真机验收公共表单及视觉收口。

### 验证

- `node --check weapp/components/practice-record-form/index.js weapp/pages/journal/journal.js weapp/pages/practice/practice.js` → 通过
- `npm.cmd run test:weapp` → 30 项通过
- `npm.cmd run typecheck` → 通过

### 下一步

在微信开发者工具中验收完成练习、补录、编辑三处公共表单；重点看底部弹层高度、安全区、保存按钮可见性、已有练习日期着色和类型选择器内容。通过后继续迁移唱诵和一序列口令控制。

## 2026-06-26: 会员页开通流程收口 + 免费照片上限调整

### 背景

DESIGN.md 第一版定义的色值（`#2D5A27` / `#F9F8F6` / `#1A1A1A`）与实际 WebApp 代码不一致。WebApp 实际使用 `#2A4B3C`（森林绿）/ `#F9F7F2`（米白）/ `#C1A268`（金色）。小程序 WXSS 颜色也是随意的，和 WebApp 对不上。

### 修改内容

1. **DESIGN.md 第二版** — 删除过时色值，从 WebApp `globals.css` + `page.tsx` 抽取真实 token：
   - 主色 `#2A4B3C`，背景 `#F9F7F2`，金色 `#C1A268`
   - 文字层级用 `#2A4B3C` + opacity 实现，小程序等效实色对照表
   - 增加 WebApp vs 小程序组件差异对照

2. **小程序 6 个 WXSS 文件统一色板**：
   - `app.wxss`, `practice.wxss`, `index.wxss`, `journal.wxss`, `profile.wxss`, `privacy.wxss`
   - 删除旧色 `#26352E` / `#7A817C` / `#747D78` / `#9B814D` / `#273A30` / `#D9DDD9` 等

3. **小程序 tabBar 图标换为 lucide SVG**：
   - 从 WebApp 的 lucide-react 提取 Calendar / BookOpen / CircleUser 路径
   - base64 内嵌，选中/未选中两套色值

4. **小程序练习页修复**：
   - 选中态/开始按钮使用 WebApp 同款绿色渐变 `rgba(74,122,68,0.7) → rgba(45,90,39,0.85)`
   - 开始按钮从 `<button>` 改为 `<view>` + `overflow:hidden` 保证正圆
   - Logo 圆角 `50%`

5. **tabBar 宽度缩紧**：`max-width: 560rpx` → `380rpx`

### 备注

- `backdrop-filter: blur()` 微信小程序不支持，毛玻璃效果用半透明背景替代
- DESIGN.md 换为以 WebApp 代码为真实源，更新记录在 Decisions Log

### 背景

会员页原来有购买和激活两个入口，点击后还会再弹购买引导/激活码弹窗，交互显得绕。会员权益展示也和真实上传限制出现口径分叉。

### 修改内容

- 会员提示弹窗整合成单张卡片：标题、关闭按钮、普通/Pro 对比表和开通按钮都在同一个容器内。
- 购买/激活入口收口为一个「开通/续费 Pro」流程：统一弹窗内支持输入激活码，也直接展示开发者微信 `xiao519216978` 和复制按钮。
- 删除旧 `PurchaseGuideModal` 独立购买弹窗，避免弹窗套弹窗。
- 会员权益对比统一为：普通每条记录 1 张照片、单张 5 MB、3 个练习选项、1 种日历标注、2 种日历颜色、1 分钟唱诵倒计时；Pro 每条记录 9 张照片、单张 30 MB、11 个练习选项、9 种日历标注、4 种日历颜色、自定义唱诵倒计时。
- 真实上传逻辑同步调整：免费用户单张照片上限从 10 MB 改为 5 MB，Pro 保持 30 MB。

### 验证

- `npm.cmd run typecheck` → 通过
- `npx.cmd vitest run --config vitest.config.ts __tests__/oss-utils.test.ts __tests__/membership-prompt-stacking.regression-1.test.tsx __tests__/settings-modal.test.tsx` → 3 文件 / 25 项通过

## 2026-06-26: 照片上传限制与友好提示

### 背景

用户上传超过免费上限的照片时会失败，但前端提示不够友好；同时 Pro 用户应能上传更大的练习照片。这个任务属于真实产品痛点，不是结构型重构。

### 修改内容

- `lib/oss.ts` 增加免费/Pro 文件大小上限：免费 5 MB，Pro 30 MB。
- `validatePhotoFile(file, { isPro })` 根据会员状态返回不同限制与友好错误文案。
- `uploadPhoto(file, recordId, { isPro })` 在上传流程入口复用同一套校验。
- `components/PracticeForm.tsx` 在文件选择后使用实时会员状态判断 `isPro`，并传给上传流程。
- 前端不再把校验错误吞成“上传失败，请重试”，会展示具体原因，例如免费版超过 5 MB 或 Pro 超过 30 MB。
- `components/PhotoUpload/PhotoUploader.tsx` 同步支持 `isPro` 参数，保留导出组件的一致性。

### 验证

- `npm.cmd run typecheck` → 通过
- `npm.cmd run lint` → 通过
- `npx.cmd vitest run --config vitest.config.ts __tests__/oss-utils.test.ts` → 1 文件 / 16 项通过
- `npx.cmd vitest run --config vitest.config.ts` → 49 文件 / 539 项通过

## 2026-06-26: 会员激活 API 对口测试补齐

### 背景

会员激活 API 完成最后一刀后，已有 typecheck、lint、API auth routes 和全量 Vitest 兜底，但缺少直接覆盖 `POST /api/membership/activate` 的对口测试。为避免“最后一刀”只靠横向回归保护，本次补齐最小必要 L3 API 测试。

### 测试覆盖

- 未登录返回 `NOT_AUTHENTICATED`。
- malformed JSON 返回 `INVALID_REQUEST`。
- 缺少 code 返回 `MISSING_CODE`。
- code 格式错误返回 `INVALID_CODE_FORMAT`。
- 已使用激活码返回 `CODE_USED`。
- 已过期激活码返回 `CODE_EXPIRED`。
- 新开通会员会写入 `user_memberships`、消费激活码，并返回原响应字段。
- 续费会员会从当前未过期会员的到期时间继续累加，而不是从当前时间重新计算。

### 验证

- `npm.cmd run typecheck` → 通过
- `npm.cmd run lint` → 通过
- `npx.cmd vitest run --config vitest.config.ts __tests__/api-auth-routes.test.ts` → 1 文件 / 35 项通过
- `npx.cmd vitest run --config vitest.config.ts` → 49 文件 / 535 项通过

## 2026-06-26: 会员激活 API 最后一刀 — 重构正式收口

### 背景

解耦重构已进入维护模式后，仅保留一个可选的小刀：会员激活 API。它仍把鉴权、激活码查询、会员写入、激活码消费和响应格式化集中在同一个 route 主流程里。按“真实职责分离，而不是为了降行数”的标准，这刀值得做完；做完后不再保留默认下一刀。

### 修改内容

- `app/api/membership/activate/route.ts` 保持单文件 route，不新增对外 API。
- 将主流程收敛为顶层编排：创建 Supabase client、鉴权、解析激活码、查询/校验激活码、获取 profile、计算到期时间、写入会员、消费激活码、返回成功响应。
- 抽出 route 内部 helper：`authenticateRequest`、`parseActivationCode`、`getActivationCode`、`getProfileId`、`getCurrentLatestExpiry`、`calculateMembershipExpiry`、`createMembershipRecord`、`consumeActivationCode`。
- 未改数据库 schema、未改响应字段、未改用户可见行为。
- 更新恢复入口、路线图和 TODO：重构正式收口，进入维护模式；后续不再以“继续阶段 N”或默认“下一刀”为节奏。

### 验证

- `npm.cmd run typecheck` → 通过
- `npx.cmd vitest run --config vitest.config.ts __tests__/api-auth-routes.test.ts` → 1 文件 / 35 项通过
- `npx.cmd vitest run --config vitest.config.ts` → 49 文件 / 535 项通过

### 下一步

默认不再主动拆。后续优先业务增长、获客、转化、线上 bug 与安全问题；只有具体业务改动重新制造多职责热点，或出现明确维护痛点时，再顺手做小范围优化。

## 2026-06-25: L5 真实云端测试模板、说明与实测通过

### 背景
L5 基础设施已经存在，但缺少可复制的 `.env.test` 模板和独立说明。没有这层文档，下次容易误跑真实账号，或者不知道 reset 流程实际会删哪些表。

### 修改内容

- 新增 `.env.test.example`，列出 `TEST_USER_EMAIL`、`TEST_USER_PASSWORD`、Supabase URL、anon key、service role key。
- `.gitignore` 增加 `!.env.test.example`，继续忽略真实 `.env.test`，允许提交安全模板。
- 新增 `docs/guides/L5_TESTING.md`，说明 L5 运行条件、测试账号准备、reset 流程、常见失败和 L4/L5 区别。
- `docs/guides/DEVELOPMENT.md` 和 `docs/architecture/REFACTOR_RESUME.md` 增加 L5 说明链接。
- `TODO.md` 增加 L5 模板与说明完成项。
- 用户已填写本地 `.env.test`；验证 `npm.cmd run test:L5` 通过：3 个测试文件 / 8 项测试。

### 下一步

保持 `.env.test` 本地私有，不提交真实密钥。后续改动 Supabase/auth/sync 时，把 `npm.cmd run test:L5` 纳入回归。

## 2026-06-25: README / 开发说明归档

### 背景
重构补漏和 L4 登录态稳定化完成后，项目已经不缺代码入口，缺的是“下次打开直接知道怎么继续”的维护入口。

### 修改内容

- `README.md` 增加“开发维护入口”，写清当前重构状态、恢复文档、开发说明、验证基线。
- 新增 `docs/guides/DEVELOPMENT.md`，集中说明日常启动、门禁命令、L4 seed、L5 `.env.test` 要求和已知 Git 全局 ignore 权限噪声。
- `docs/architecture/REFACTOR_RESUME.md` 的下一步更新为 L5 真实云端环境可重复化。
- `TODO.md` 增加 README/开发说明归档完成项。

### 下一步

固化 L5 真实云端测试环境：专用测试账号、`.env.test` 模板、reset 脚本和运行说明。

## 2026-06-25: L4 登录态稳定化 — 51/51 全量通过

### 背景
上一轮审核补漏后，L4 全量仍有 3 个登录态用例因为测试账号缺少稳定云端数据而 `skipped`。这会让下次排查误以为还需要先处理 auth 环境。

### 修复内容

- `__tests__/L4/fixtures.ts` 新增 `seedL4PracticeData(page)`，在应用启动前写入固定 records/options/profile。
- seed 时设置 `window.__hasAutoSynced__ = true`，避免真实 auth session 下首屏自动同步覆盖本地测试数据。
- Journal L4 用例改为断言固定 seed 记录、补录 sheet、分享卡真实路径。
- Settings L4 用例改为进入“数据管理”分区后断言导出弹窗。
- 为 Journal 补录、记录分享触发器、Settings 导出按钮补充稳定 `data-testid`，降低文案/图标变更导致的测试脆弱性。

### 验证

- `npm.cmd run typecheck` → 通过
- `npm.cmd run lint` → 通过
- `npx.cmd playwright test __tests__/L4/journal.spec.ts __tests__/L4/settings.spec.ts --project=auth-chromium` → 5/5 通过
- `npm.cmd run test:L4` → 51/51 通过，0 skipped

### 注意

当前沙箱访问 Supabase 测试云端仍会被网络权限拦截，因此 `auth.setup` 会保存空白 storageState；L4 登录态 UI 现在不再依赖该云端数据。真正仍需要 `.env.test`/测试云端的是 L5 真实上传、下载、冲突与 auth 冒烟。

## 2026-06-25: 重构审核补漏 — 门禁恢复绿色

### 背景
对阶段 1–6 解耦结果做重新审核后，发现主体架构已经完成，但当前门禁有三类红灯：TypeScript 类型边界、全量 Vitest 中同步 L3 测试污染、L4 smoke 被本地/外部网络噪声污染。

### 修复内容

- `hooks/useSync.ts`：`readLatestLocalData` 返回明确 `RemoteSyncData`，避免 `unknown[]` 流入同步编排。
- `hooks/usePracticeData.ts` / `components/practice-record/RecordModals.tsx`：兼容同步层返回的 `breakthrough/start_time: null`。
- `lib/import-export.ts`：`migrateOldOptions` 同时接受旧 option 胶囊和当前 `PracticeOption`。
- `__tests__/sync-isolation-and-rollback.test.ts`：测试手动冲突路径时禁用自动同步，避免调用计数被 hook mount 副作用污染。
- `__tests__/L4/fixtures.ts`：等待 `document.head` 可用后再注入禁用动画样式，修复 `appendChild` pageerror。
- `app/api/stats/today/route.ts`：缺 Supabase service key 时返回 `{ count: 0 }`，不在本地 L4 中制造 console error。
- `app/layout.tsx` / `lib/analytics.ts`：开发环境不挂 Vercel Analytics / Speed Insights；localhost 不加载 Mixpanel。

### 验证

- `npm.cmd run typecheck` → 通过
- `npm.cmd run lint` → 通过
- `npx.cmd vitest run` → 49 文件 / 527 项通过
- `npm.cmd run build` → 通过
- `npm.cmd run measure:initial-js` → 16 scripts / 1117.0 KiB raw / 335.5 KiB gzip
- `npx.cmd playwright test __tests__/L4/smoke.spec.ts --project=guest-chromium` → 4/4 通过

### 注意

历史备注：本条记录写入时 L4 登录态仍可能 skip；随后已通过本地 seed 固化解决，当前 L4 为 51/51 通过、0 skipped。L5 真实云端仍需要可访问的 `.env.test`/测试云端环境。

## 2026-06-25: 阶段 6 测试暴露的 3 个缺陷修复

### 背景
阶段 6 跨模块测试缺口填充过程中，通过 `EXPOSES GAP` 测试暴露了 3 个真实缺陷。本日完成全部修复，并把对应测试改为 `VERIFIES FIX`。

### 修复内容

**缺陷 1：`reset-password` 无幂等机制**
- 文件：`app/api/auth/reset-password/route.ts`
- 改动：现在强制要求 `code` 字段，查询 `verification_codes` 表 `type='reset_password' && used=false && 未过期` 记录，成功后标记 `used=true`。与 register/verify-code 单次消费机制对齐。

**缺陷 2：`send-verification-code` 无防刷限频**
- 文件：`app/api/auth/send-verification-code/route.ts`
- 改动：API 入口加 60s 限频——查询该邮箱 `verification_codes` 表最近一条 `created_at`，未过 60s 返回 429。查询失败 fail-open。

**缺陷 3：Stats Tab 切换不保持滚动位置**
- 文件：`components/stats/StatsTab.tsx`
- 改动：三段式策略「scroll 事件实时保存 + sessionStorage 持久化 + mount 时轮询恢复」。
- 关键发现：最初用模块变量 + unmount 时读取 `el.scrollTop` 失败。诊断显示 unmount cleanup 运行时 `scrollTop` 已是 0——**AnimatePresence exit 动画先于 unmount 把 scrollTop 重置为 0**。所以必须用 scroll 事件实时保存。
- sessionStorage 选择理由：dev 模式下 next/dynamic 可能重新求值模块变量；sessionStorage 在 tab 关闭时清空（重启浏览器后回到顶部是合理行为），比 localStorage 更合适。

### 测试结果
- vitest：527 项全部通过（含新增 VERIFIES FIX 测试）
- L4 Playwright：48 项通过、3 项 skipped
- TODO.md 3 个缺陷全部标记为 ✅ 已修复

### 涉及文件
- `app/api/auth/reset-password/route.ts`
- `app/api/auth/send-verification-code/route.ts`
- `components/stats/StatsTab.tsx`
- `__tests__/api-auth-routes.test.ts`
- `__tests__/L4/tab.spec.ts`
- `TODO.md`

## 2026-06-24（续2）: 阶段 5 最终精简 — resolveConflict + smartMerge 提取

### 背景
阶段 5 最后一项工作：将 `resolveConflict`（三分支执行逻辑）和 `smartMerge` 从 useSync.ts 提取到 sync-orchestrator.ts，合计约 132 行。

### 修改内容

**`lib/sync-orchestrator.ts`**（267 → 402 行）：
- 新增 `ConflictDeps` 接口（依赖注入类型）
- 新增 `RemoteSyncData` 类型
- 新增 `resolveConflict(strategy, userId, user, localData, deps)` — 三分支执行编排
  - `remote` 分支：下载远程 → 构建 profile → onSyncComplete → localStorage
  - `local` 分支：删除远程 → uploadLocalData
  - `merge` 分支：diffRecords → smartMerge
- 新增 `smartMerge(localOnly, remoteOnly, localNewer, remoteNewer, remoteData, userId, localData, deps)` — 合并并上传
- 两个函数均接受 `localData` 作为参数（而非调用 getter），避免测试中 localStorage 为空导致数据丢失

**`hooks/useSync.ts`**（872 → 771 行）：
- 删除 `smartMerge` 内联函数（35 行）
- 删除 `resolveConflict` 内联函数（97 行），替换为 20 行包装器
- 移除 `diffRecords`、`computeSmartMergeData` 的 import（不再直接使用）
- 包装器传递 `localDataRef.current` 作为 localData 参数

### 关键决策
- `getLatestLocalData` 从 `ConflictDeps` 移除，改为传参 `localData`
- 原因为：`readLatestLocalData` 从 localStorage 读取，在测试中为空。使用调用方传入的引用（`localDataRef.current`）确保数据一致性

### 结果
- useSync 872 → 771 行（−101 行，距合理目标 ~600–650 行差 ~120 行，主要由 autoSync 和 uploadLocalData 不可削减的业务逻辑构成）
- Vitest 440 项全部通过
- L4 39 项全部通过
- Phase 5 正式结束

## 2026-06-24（续）: L4 测试回归修复

### 背景
L4 测试中 practice #19（普通计时：选择→开始→暂停→继续→结束）和 refresh #24（暂停中刷新保持状态）因 auto-pause 逻辑缺陷持续失败。

### 根因
hydration 效果使用了 `[sessionHydrated, activePractice, isPaused]` 作为依赖数组。当用户新开始练习时：
1. `handleStartPractice` 调用 `startPracticeSession` → `activePractice` 从 `null` 变为对象
2. 效果重新触发 → 调用 `loadGuidedAudio()`（第二次加载）+ 设置 `autoPauseRef.current = true`
3. onReady(resumePracticeSession) 恢复练习后，auto-pause 效果立即重新暂停
4. 测试期望正常暂停/恢复流程，但被中断

### 修复
将依赖改为仅 `[sessionHydrated]`，使自动加载/暂停效果仅在 hydration 结束时触发一次。新练习不会触发此效果。

```tsx
// 修改前
useEffect(() => { ... }, [sessionHydrated, activePractice, isPaused])

// 修改后
useEffect(() => { ... }, [sessionHydrated])  // eslint-disable-line
```

### 结果
- L4 测试 39/39 全部通过，零失败
- 练习中刷新：保持练习状态 ✓
- 暂停中刷新：暂停状态保持 ✓
- 多次刷新：无 hydration 错误 ✓
- 普通计时开始→暂停→继续→结束：正常 ✓
- 全量 Vitest 440 项继续通过 ✓

## 2026-06-24: 阶段 5/6 测试缺口覆盖 + useSync 精简

### 完成内容

**Path A — 测试缺口覆盖（47 项新测试）**

- `__tests__/auth-modal.test.tsx`（21 项 L2 组件测试）：
  - login/register/forgot-password 三模式渲染与切换
  - X 按钮、Cancel、背景遮罩三种关闭路径
  - 密码强度验证（长度/字母/数字/弱密码列表）
  - 注册步骤 1→2 流转、忘记密码邮箱/验证码验证
  - 登录成功/失败/网络错误翻译
- `__tests__/auth-modal-accessibility.test.tsx`（9 项 L2 无障碍测试）：
  - X 关闭按钮 `aria-label="关闭"`
  - Esc 键关闭弹窗（loading 时禁用）
  - submit 按钮 type、Tab 聚焦、required/minLength 验证
- `__tests__/sync-limit-integration.test.ts`（5 项 L3 集成测试）：
  - 通过 `useSync.uploadLocalData` 真实调用路径验证 1000 条限制
  - 1001/1002/1000/500/0 条记录分别验证上传数量与排除最旧记录
  - 修复了测试数据用 `i%28+1` 生成导致日期重复、排序不稳定的问题
- `__tests__/practice-commands.test.tsx`（+6 项 handleDeleteRecord 同步路径）：
  - 已登录 + skipConfirm true/false、草稿删除、远端失败、未登录、网络异常
- `__tests__/import-export-utils.test.ts`（+17 项 L1 旧版本兼容）：
  - 旧 records 缺 updated_at/photos 为字符串、profile 含 is_pro、options 含 label_zh
  - 斜杠/ISO/混合日期格式排序、真实旧版数据胶囊端到端

**AuthModal 改进**
- X 关闭按钮加 `aria-label="关闭"`
- Esc 键关闭弹窗（loading 时禁用，避免取消请求中途）

**Path B — useSync 精简（955 → 879 行，−76 行）**
- 抽离 `getLatestLocalData` 为模块级 `readLatestLocalData<T>(fallback)` 函数（hook 内 23 行 → 2 行包装器）
- 统一并精简 syncDebug 日志（删除 ~55 行噪音）：
  - 多行 "function called" banner（`🚨🚨🚨` + `=`.repeat(50) + 详情对象）
  - useEffect 触发详情、autoSync 微步骤（设置同步标志/添加日志/状态已设置）
  - 与 addLog 重复的提示（分析结果、数据对比、数据已一致）
  - downloadRemoteData 逐字段日志（5 行 error/data.length 合并为 1 行）
  - uploadLocalData profile 调试、记录 IDs 列表
  - 顺手修复 uploadLocalRecords 中重复的 `准备上传 N 条记录` addLog
- 保留的 syncDebug：跳过原因、限制触达、队列行为、重试、脏数据过滤、merge 成功

**测试矩阵状态升级（5 项）**
- 旧版本导入兼容 L1：缺失 → 已覆盖
- 登录/注册/忘记密码 L2：缺失 → 已覆盖
- 无障碍名称/键盘/焦点 L2：缺失 → 已覆盖
- 1000 条限制 L3：部分覆盖 → 已覆盖（L1+L3）
- 草稿/软删除 L1：部分覆盖 → 已覆盖

### 关键决策

**Path B 目标修正**：原计划目标"250–350 行"被诚实评估为不可达。原因：
- `autoSync` 包含 ~200 行 orchestrator 调度 + switch case 4 分支业务流（upload-local、merge-remote、use-remote-only、conflict）
- `smartMerge`、`resolveConflict`、`uploadLocalData`、`uploadLocalRecords` 都是独立业务流，强提取会增加抽象成本
- 实际健康目标约 600–650 行（已达成 879 行，距目标还差 ~230 行）

**保留的诚实做法**：合并 `uploadLocalRecords`/`uploadLocalData` 的 build+merge 重复逻辑为 `prepareRecordsForSafeUpload` 助手（30 行助手 vs 42 行重复，净 +11 行，但消除重复便于后续维护）+ 本次 syncDebug 清理 + getLatestLocalData 抽离。

### 状态
- 全量 42 个测试文件 / 436 项通过（+55 项 / +3 文件）
- 提交：`03f63d3` test+refactor: 阶段5/6 测试缺口覆盖 + useSync 精简

## 2026-06-23: 阶段 5 L1 纯函数测试覆盖 — sync-utils 剩余缺口

### 完成内容

- 新增 `sortAndLimitRecords` 测试（6 项）：
  - 空数组、日期排序、maxSync 限制、1000 条边界 >1000 进 localOnly、maxSync=0、不可变性
  - 覆盖「1000 条限制与排序」（L1 从「缺失」→「已覆盖」）
- 新增 `applySafeMerge` 测试（7 项）：
  - 无云端匹配、本地 notes 空→保留云端、本地 notes 有内容→保持本地、breakthrough 空→保留云端、photos 空→保留云端、mergeUpdatedAt 同步时间
  - 覆盖安全合并逻辑剩余分支
- 新增 `detectOptionChanges` 测试（5 项）：
  - 完全相同、local 更多、remote 更多、数量相同 ID 不同、都空
- 新增 `detectProfileChanges` 测试（8 项）：
  - 完全相同、仅 local/remote、都空、内容优先于时间、本地/云端新
  - 覆盖「profile/options/records 独立变化」（L1 从「部分覆盖」→「已覆盖」）
- 新增 `trimSyncLogs` 测试（4 项）：
  - 单条、50 条上限、100KB 截断到 20、空列表兜底
  - 覆盖「日志数量/大小/敏感信息过滤」（L1 从「部分覆盖」→「已覆盖」）

### 状态
- 测试矩阵阶段 5 同步 L1 缺口大面积收窄：3 项从「缺失/部分覆盖」升级为「已覆盖」
- 全量 39 个测试文件 / 381 项通过（+28 项）

## 2026-06-23: 阶段 4 测试矩阵 L2 缺口覆盖 — JournalTab + StatsTab

### 完成内容

- 新增 `__tests__/stats-tab.test.tsx`（7 项 L2 组件测试）：
  - 空态显示「暂无练习数据」
  - 统计数据卡片渲染（总天数/总时长/平均分钟）
  - 免费用户 FREE 标签 + 升级入口
  - Pro 用户 PRO 标签 + 到期信息
  - 会员加载中 spinner
  - 设置按钮点击回调
  - 升级按钮点击回调
- 新增 `__tests__/journal-tab.test.tsx`（10 项 L2 组件测试）：
  - 无记录时显示「查看更多」
  - 记录所在月与加载月相同时显示「已经到底啦~」
  - 记录时间线渲染（日期/时长/类型/笔记）
  - 点击日期触发编辑回拨
  - 点击笔记打开分享弹窗
  - 未登录用户显示绑定邮箱提示
  - 已登录用户隐藏绑定邮箱提示
  - 突破笔记显示 Sparkles 图标
  - 多照片网格渲染
  - 补录按钮打开添加弹窗
- 更新测试矩阵：日记 CRUD 状态「部分覆盖 → L2 已覆盖」、统计空态/会员「部分覆盖 → 已覆盖」

### 状态
- 测试矩阵「日记 CRUD、分享、月份切换」L2 缺口已覆盖；L4 仍待补
- 测试矩阵「统计空态/历史数据/会员入口」已覆盖
- 全量 39 个测试文件 / 353 项通过（+2 文件 / +17 项）

## 2026-06-23: 导入导出纯函数提取 + L2 组件测试覆盖

### 完成内容

- 新增 `lib/import-export.ts`，从 `usePracticeData` 提取以下纯函数：
  - `parseAndValidateImportData` — JSON 解析 + 结构校验（至少含 records/options/profile 之一）
  - `sortRecordsByDate` — 导入记录按日期倒序
  - `migrateOldOptions` — 迁移 label_zh→label、isCustom→is_custom
  - `serializeExportData` — 导出 JSON 构建（过滤草稿、移除头像 base64）
- 更新 `hooks/usePracticeData.ts`：importData/exportData 改为调用提取的纯函数
- 新增 `__tests__/import-export-utils.test.ts` — 25 项 L1 纯函数测试（合法/非法 JSON、结构校验、排序、旧字段迁移、导出过滤）
- 新增 `__tests__/import-modal.test.tsx` — 6 项 L2 组件测试（渲染/隐藏、文本输入、确认回调、清空输入、背景关闭、空文本提示）
- 新增 `__tests__/export-modal.test.tsx` — 6 项 L2 组件测试（渲染/隐藏、数据显示、只读、复制按钮、提示信息、背景关闭）
- 新增 `__tests__/data-conflict-modal.test.tsx` — 8 项 L2 组件测试（渲染/隐藏、条数显示、三种策略选择、二次确认逻辑）
- 三步清空已在 practice-modal-host.test.tsx（`转发清空数据三步确认流程`）覆盖，无需新增
- 全量 37 个测试文件 / 336 项通过；TypeScript 编译通过

### 状态
- 测试矩阵「导入合法/非法、导出、三步清空」从「缺失」升级为「已覆盖」

## 2026-06-23: 动态 Tab error boundary — DynamicTabShell 错误捕获与重试

### 完成内容

- 新增 `components/practice/DynamicTabWrapper.tsx`：
  - `ErrorBoundaryInner` — class 组件错误边界，`getDerivedStateFromError` 捕获渲染异常
  - `DynamicTabShell(Component)` — HOC 包装器，key 递增强制卸载/重建触发动 import()
  - 错误态展示「页面加载失败」+「点击重试」按钮，重试时通过 `setMountKey` 递增强制 remount
- 更新 `app/practice/page.tsx`：
  - `JournalTab` / `StatsTab` / `PosesTab` 的 `dynamic()` 调用包裹 `DynamicTabShell()`
  - 所有 Tab 保留原有 `loading: TabLoading` 和 `ssr: false`
- 新增 `__tests__/dynamic-tab-error.test.tsx`（2 项）：正常渲染 + 子组件崩溃显示重试
- 更新 `__tests__/modal-lazy-loading.test.ts`：Tab 动态导入模式匹配更新为 `DynamicTabShell(dynamic(`
- 全量 33 个测试文件 / 293 项通过；TypeScript 编译通过

### 状态

- 阶段 4 测试矩阵「动态模块 loading/success/error」从「部分覆盖」升级为「已覆盖」
- 消除 chunk 加载失败白屏风险

## 2026-06-23: 损坏数据防御 — isValidRemoteRecord + 安全 fallback

### 完成内容

- `lib/sync-mappers.ts`：
  - 新增 `isValidRemoteRecord(raw)` — 严格校验远端记录类型（`typeof id === 'string'` + `date != null`）
  - `mapRemoteRecord` 增加 null/undefined 参数安全回退（返回空 photos 数组）
  - 新增 `isValidRemoteOption` 用于选项数据校验
- `lib/supabase-repository.ts`：
  - `fetchCloudRecordsForMerge` 返回前过滤非法记录
- `hooks/useSync.ts`：
  - `downloadRemoteData` 对远端记录批量调用 `isValidRemoteRecord` 过滤
- 新增 9 项测试（sync-mappers.test.ts）
- 全量 31 个测试文件 / 282 项通过

## 2026-06-23: 全站字体修正 — body 改为宋体（font-sans → font-serif）

### 改动
- `app/layout.tsx` body className 从 `font-sans` 改为 `font-serif`。
- 全站文字使用宋体（`Songti SC` / `STSong` / `SimSun` / `Noto Serif CJK SC`），对齐项目设计哲学"宋体禅意"。
- 此前 body 一直使用 `--font-sans`（系统无衬线字体栈），虽然 `app/globals.css` 中已有正确的 `--font-serif` 宋体配置，但未应用到 body。

### 验证
- TypeScript 编译通过
- 无需新增测试（纯 CSS class 变更）
- TODO.md 已跟新

## 2026-06-23: 阶段 5 第五刀 — sync orchestrator 提取（useSync 897 行）

### 完成内容

- 新增 `lib/sync-orchestrator.ts`（252 行），包含：
  - `analyzeSync` — 6 分支同步决策树纯函数（both/remote-only/local-only/no-data + noop/upload/merge/conflict）
  - `executeConflictStrategy` — 冲突策略数据选择（local/remote/merge）
  - `computeSyncStats` — 统计计算（totalPractices/recentMonthsTotal/thisMonthTotal）
  - `recordPracticeIfNeeded` — finally 块 API 调用提取
  - `SyncAction`、`SyncAnalysis`、`SyncStats`、`ConflictStrategy` 类型
- `hooks/useSync.ts`：
  - autoSync 中的 ~130 行 6 分支决策树（含内联色阶 diff、diffRecords/detectOptionChanges/detectProfileChanges）替换为 `analyzeSync()` + switch-case
  - finally 块内联 API 调用替换为 `recordPracticeIfNeeded()`
  - 统计 useEffect 使用 `computeSyncStats()` 计算统计
- **useSync.ts 从 997 行降至 897 行**。全量 30 个测试文件 / 268 项通过；typecheck 通过。

### 设计决策

- 色阶同步不再通过内联 `updated_at` 突变触发 diffRecords 差检测，改由 orchestrator 的 `colorLevelDiffers` 直接检测。
- orchestrator 只做决策不做执行：`analyzeSync` 返回 `SyncAction` union，useSync switch-case 负责实际的上传/下载/合并操作。
- `executeConflictStrategy` 返回 resolved data + shouldDeleteRemote/shouldUpload 标记，简化冲突处理的数据选择。

### 规模总结

| 文件 | 行数 |
|------|-----:|
| `app/practice/page.tsx` | 1157 |
| `hooks/useSync.ts` | 897 |

## 2026-06-23: 同步弹性 — 重试+并发锁（第一、二刀）

### 第一刀：超时、重试、部分失败恢复
- 新增 `lib/sync-retry.ts`：
  - `withRetry(fn, options)` — 通用指数退避重试包装器（默认 1s, 2s，最多 3 次）
  - `persistFailedSyncIds` / `loadFailedSyncIds` — 失败记录 ID 持久化到 LocalStorage
- 加固 `batchUploadRecords`（`lib/sync-utils.ts`）：
  - 每批自动重试（重试耗尽后才记为失败），不再一次失败丢弃整批
- 加固 `hooks/useSync.ts`：
  - `uploadLocalData` 中的 `repoUpsertRecords` / `repoUpsertOptions` 包裹 `withRetry`
  - 失败 ID 双写（React state + LocalStorage 持久化）
  - `autoSync` 顶层 catch 自动重试一次（2s 延迟）

### 第二刀：并发同步锁
- 新增 `pendingSyncRef`：并发调用不再静默丢弃，标记排队
- finally 块检测排队标记，同步完成后自动补一次

### 新增测试
- `__tests__/sync-retry.test.ts` — `withRetry` 行为 + 持久化（10 项）
- `__tests__/sync-upload.test.ts` — `batchUploadRecords` 重试（4 项）

### 验证
- 32 个测试文件 / 282 项测试全部通过
- TypeScript 编译通过
- 已有同步行为零变化

### 第三刀：损坏本地数据和异常远端响应
- 新增 `isValidRemoteRecord` 防御：`downloadRemoteData` 中过滤 id/date 缺失的坏记录，`mapRemoteRecord` 对 null/undefined 安全 fallback
- 加固 `fetchCloudRecordsForMerge`：返回结果过滤无 id 条目
- 加固 `uploadLocalData`：profile 上传响应加入 JSON 格式校验，非 2xx 且非 JSON 时使用 statusText
- 新增 9 项防御性测试

### 验证
- 32 个测试文件 / 291 项测试全部通过

| 文件 | 行数 |
|------|-----:|
| `app/practice/page.tsx` | 1157 |
| `hooks/useSync.ts` | 897 |
| `lib/sync-orchestrator.ts` | 252 |
| `lib/sync-utils.ts` | 496 |
| `lib/sync-mappers.ts` | 96 |
| `lib/supabase-repository.ts` | 147 |

## 2026-06-23: 阶段 5 第四刀 — 差异检测/日志/批量上传/options payload 提取（useSync < 1000 行 🎯）

### 完成内容

- `lib/sync-utils.ts` 新增 `detectOptionChanges` / `detectProfileChanges` / `createSyncLogEntry` / `trimSyncLogs` / `appendSyncErrorHistory` / `batchUploadRecords` / `buildOptionsUploadPayload` 等 7 个纯函数 + 类型。
- 去重 ~60 行 autoSync 选项/profile 差异检测、~40 行批量上传循环、~20 行日志格式、~20 行 options payload。
- `hooks/useSync.ts` autoSync 差异检测、uploadLocalRecords 批量循环、addLog 格式化、uploadLocalData options 映射全部替换为共享函数。
- **里程碑：useSync.ts 首次低于 1000 行（997 行）**。全量 30 个测试文件 / 268 项通过；typecheck、lint 通过。

### 设计决策

- `batchUploadRecords` 不包含日志输出，由调用方根据返回的 `BatchUploadResult` 自行处理，保持通用性。
- `createSyncLogEntry` / `trimSyncLogs` / `appendSyncErrorHistory` 三者分离：纯创建、纯裁剪、副作用写入，职责清晰。
- `detectOptionChanges` / `detectProfileChanges` 返回结构化结果对象，而非松散变量，便于组合使用。

### 下一刀

阶段 5 第五刀：提取 sync orchestrator + 冲突决策提取，目标 `useSync.ts` 500–700 行。

## 2026-06-23: 阶段 5 第三刀 — 共享纯函数提取

### 完成内容

- `lib/sync-utils.ts` 新增 `applySafeMerge`、`sortAndLimitRecords`、`buildUploadRecordPayload`、`resolveRecordColorLevel`、`UploadRecordPayload` 类型。
- 去重 ~63 行 safe-merge 逻辑（uploadLocalRecords 和 uploadLocalData 两处重复）和 ~30 行 sort/limit/mapping 逻辑。
- `hooks/useSync.ts` 两处 safe-merge 块替换为共享 `applySafeMerge` 调用（一处带 mergeUpdatedAt=true，一处不带）；三处 sort+limit+payload 替换为 `sortAndLimitRecords` + `buildUploadRecordPayload` + `resolveRecordColorLevel`。
- 修复 `buildUploadRecordPayload` 返回 `Record<string, unknown>` 导致下游 `.id` 访问为 `unknown` 的类型问题，改用显式 `UploadRecordPayload` 接口。
- `useSync.ts` 从 1244 行降至 1149 行。全量 30 个测试文件 / 268 项通过；typecheck、lint 通过。

### 设计决策

- `applySafeMerge` 使用泛型 `<T extends Record<string, any>>` 并设可选的 `mergeUpdatedAt` 参数，单函数服务两个调用点。
- `sortAndLimitRecords` 使用泛型 `<T extends { date: string }>`，不绑定 PracticeRecord 类型。
- `buildUploadRecordPayload` 返回具名 `UploadRecordPayload` 接口而非 `Record<string, unknown>`，保持下游 `.id`/`.date` 等字段的类型安全。

### 下一刀

阶段 5 第四刀：提取同步编排函数，精简批量上传循环，冲突决策提取；目标 `useSync.ts` < 1000 行。

## 2026-06-23: 阶段 5 第二刀 — Supabase 仓库层提取

### 完成内容

- 新增 `lib/supabase-repository.ts`，承接 7 个仓库原语：`fetchAllUserData`（并发下载+超时）、`fetchCloudRecordsForMerge`（安全合并查询）、`repoUpsertRecords` / `repoUpsertOptions`（单次 upsert）、`repoDeleteAllUserRecords` / `repoDeleteAllUserOptions`（冲突策略清空）、`withQueryTimeout`（通用超时保护）。
- `hooks/useSync.ts` 删除 `supabase` / `TABLES` 直接导入和内联 `queryWithTimeout`，7 处 Supabase 调用替换为仓库原语。重试、安全合并、批量分片、日志等业务逻辑保留在 useSync。
- 修复类型问题：`CloudRecordForMerge` 类型、`withQueryTimeout` 对 Supabase thenable 的支持、merge updated_at 可空性。
- `useSync.ts` 从 1306 行降至 1244 行（累计从 1348 → 1244，降 104 行）。全量 30 个测试文件 / 268 项通过；typecheck、lint、生产 build 通过。

### 设计决策

- 仓库层只做 I/O 原语，不做业务决策：不重试、不分批、不安全合并、不归一化。
- `fetchAllUserData` 返回 `any` 风格的响应（与原 useSync 内联实现一致），因为 downloadRemoteData 后续会有自己的归一化。
- `fetchCloudRecordsForMerge` 用 `await` + 显式 `as unknown as` 转换来获得类型安全的响应，而不是让 Supabase 推断。

### 下一刀

阶段 5 第三刀：安全合并逻辑在 uploadLocalRecords 和 uploadLocalData 中几乎完全重复（~160 行），提取为共享函数后可再节省 ~80 行，目标 `useSync.ts` < 1000 行。

## 2026-06-23: 阶段 5 第一刀 — 远端映射纯函数提取

### 完成内容

- 新增 `lib/sync-mappers.ts`，承接 5 个纯函数：`parseRemotePhotos` / `buildCompleteProfile` / `mapRemoteRecord` / `isValidRemoteOption` / `mapRemoteProfile`，以及 `DEFAULT_PROFILE_NAME` / `DEFAULT_PROFILE_SIGNATURE` / `RemoteProfileInput`。
- `hooks/useSync.ts` 删除三个内联函数和两个常量，改为 import；`downloadRemoteData` 中三段内联归一化（records photos、options 过滤、profile 数字名兼容）替换为对应纯函数。
- 行为零变化：`buildCompleteProfile`（宽松）继续供 conflict/merge 路径（514/1190 行）使用；`mapRemoteProfile`（叠加数字名脏数据兼容）仅供下载路径使用，保留原历史兼容逻辑。
- `useSync.ts` 从 1348 行降至 1306 行；新增 45 个纯函数测试，全量 30 个测试文件 / 268 项通过；typecheck、lint、生产 build 全部通过。

### 设计决策

- `mapRemoteRecord` 用 `Omit<T, 'photos'> & { photos: string[] }` 而不是 `T & { photos: string[] }`，避免传入 `{ photos: null }` 时返回类型归约为 `never`。
- 没有把 Supabase I/O 移入新模块（暂保持下载路径不变），下一刀再单独提取仓库层。
- 没有合并 `buildCompleteProfile` 与 `mapRemoteProfile`，因为两个调用路径行为差异（脏数据兼容）是历史结果，不能改动。

### 下一刀

阶段 5 第二刀：把 Supabase 下载、上传、重试和超时提取为 `lib/supabase-repository.ts`，目标 `useSync.ts` 进入 1000 行以内。

## 2026-06-18: master2 练习页第一阶段解耦收尾

### 完成内容

- `app/practice/page.tsx` 从 6476 行降至 3238 行，减少约 50%。
- 拆出日记、统计、设置、练习完成/补录/编辑弹窗、日期/类型选择器和分享卡片。
- 抽取 `journal-utils`、`stats-utils` 纯函数，并补齐组件边界与交互测试。
- 整理同步数据类型、远端照片解析和开发环境同步日志，移除 Google 字体运行时依赖。
- 解耦基线提交：`0f81449 refactor: 拆分练习页并整理类型边界`，已推送 `origin/master2`。

### 自动验证

- Vitest：13 个测试文件，131 项全部通过。
- `npm run typecheck`：通过。
- `npm run lint`：通过。
- `npm run build`：通过，22 个页面/路由完成构建。
- 浏览器回归使用移动端视口和假 Supabase 地址，不写真实云端数据。
- 已验证：落地页、练习选择、开始/暂停/恢复、保存/放弃、完成表单、日记新增/编辑/删除、统计页、设置页。
- 浏览器安全策略在“数据管理”入口阻止继续操作；导入导出、体式和账号弹窗由现有组件测试与静态检查覆盖，本轮未做真实云端登录回归。

### 下一阶段解耦

1. 移出日期选择器、选项编辑弹窗、结束确认框和格式化工具。
2. 提取练习会话控制器，统一计时、暂停、草稿、结束和保存状态。
3. 拆分唱诵与口令音频 hook。
4. 将 `JournalTab`、`StatsTab` 改为真正动态加载，并比较构建产物。
5. 单独拆分 1110 行的 `useSync`，不与练习页重构混做。

目标：`practice/page.tsx` 降到 1500 行以内，只保留页面组合与顶层导航。

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

---

## 2026-06-18 - 完整解耦阶段 1：基础 UI 与工具 ✅ 已完成

**提交**：`0300ad4`、`443f75a`、`917812f`

### 实现

- 新增 `lib/practice-utils.ts`，集中日期、时长和 HTML 清理纯函数。
- 新增 `components/practice/PracticePickers.tsx`，包含日期选择器与下拉选择器。
- 新增 `components/practice/OptionModals.tsx`，包含自定义练习与编辑选项弹窗。
- 新增 `components/practice/PracticeSessionControls.tsx`，包含结束确认与呼吸动画。
- `practice/page.tsx` 本轮移除 682 行内联实现，当前 2738 行。

### 测试与 QA

- 新增工具、选择器、选项弹窗、结束确认与嵌套弹窗回归测试。
- 全量结果：18 个测试文件、150 项测试通过；TypeScript、lint、生产构建通过。
- 隔离浏览器通过落地页导航、选择练习、开始、暂停、继续、结束、放弃、自定义选项及免费色阶锁定。
- QA 发现会员提示层级低于父弹窗，修复遮罩/内容层级并增加关闭按钮无障碍名称。
- 修复后二次浏览器刷新被本地 URL 安全策略拦截；永久组件回归测试已通过，下一阶段浏览器回归继续复验。

### 下一步

进入阶段 2：提取 `usePracticeSession`，先覆盖计时、暂停累计、刷新恢复、草稿和幂等保存状态转换。

## 2026-06-18 - 完整解耦阶段 2：练习会话 ✅ 已完成

**提交**：`30a5700`、`ba7824a`、`dfbcadf`

- 已提取计时状态模型和 `usePracticeSession`，保留五个原 LocalStorage 键。
- 已覆盖开始、重复开始、暂停/恢复、多次暂停、跨天、设备时间倒退、损坏状态、0 分钟结束、保存失败重试和草稿删除补偿。
- 当前 20 个测试文件、167 项测试通过；TypeScript、lint、生产构建通过。
- 浏览器刷新后计时恢复，但练习类型丢失，且控制台报告 hydration mismatch。
- 三轮候选修复均未通过真实浏览器复验，已全部撤回，未将猜测性改动提交到 `master2`。
- 下一步先独立审计 SSR/客户端持久化初始化顺序，再完成阶段 2；阶段 3 音频拆分暂不提前。

### 2026-06-18 续：刷新恢复第四版候选修复（未提交）

**工作区状态**：`master2@edb1e93`，3 个代码/测试文件有未提交修改。

- `hooks/usePracticeSession.ts` 新增 `activePractice` 持久化快照，记录选项 ID、显示名称和备注。
- Hook 新增 `isHydrated`，页面在客户端挂载前渲染确定性空壳，避免服务端 HTML 与客户端首屏不同。
- `app/practice/page.tsx` 在刷新恢复时优先使用持久化练习快照，不再依赖异步加载的选项列表。
- `__tests__/use-practice-session.test.tsx` 新增首屏一致和练习类型恢复两个回归场景。
- 验证：TypeScript 通过，轻量 lint 通过，20 个测试文件 / 169 项测试通过。
- 生产构建未完成：`.next/server/chunks/ssr` 文件被运行中的 Node 进程占用，报 `EBUSY`。停止开发服务后重跑即可判断构建结果。
- 尚未完成真实浏览器刷新复验，因此没有提交，也没有把阶段 2 标成完成。

**下次直接执行**：阅读 `docs/architecture/REFACTOR_RESUME.md`，先保留现有未提交修改，完成浏览器刷新回归和生产构建。通过后再提交阶段 2；不要先进入音频拆分。

### 2026-06-18 续：阶段 2 完成 ✅

**最终根因**：`react-use/useLocalStorage` 根据运行环境条件性调用 Hook。服务端直接返回默认值，客户端调用 `useRef/useState/useLayoutEffect/useCallback`，因此页面恢复壳仍可能在真实 Next.js hydration 中失配。

**最终实现**：

- `usePracticeSession` 内新增 SSR 安全的 LocalStorage 适配器，服务端和客户端首次渲染统一使用默认状态。
- 客户端挂载后读取原有五个计时键和新增的 `ashtanga_active_practice`，保持历史数据格式兼容。
- 练习快照保存 `optionId`、`label`、`notes`，刷新恢复不再依赖选项列表的异步加载顺序。
- 完成或放弃后清理练习快照；存储不可用时仍保留内存会话，非法 JSON 自动回退为空会话。

**验收**：

- 生产版隔离浏览器完成正常计时刷新、暂停后刷新、练习类型恢复和不保存退出清理。
- 每次刷新后检查新产生的浏览器日志，均无 hydration mismatch。
- 20 个测试文件 / 170 项测试通过；TypeScript、轻量 lint、Next.js 生产构建全部通过。

**结论**：解耦阶段 2 完成。下一阶段只处理 `useGuidedAudio` 与 `useChantPlayback`，不提前混入同步拆分。

## 2026-06-18 - 完整解耦阶段 3：媒体 Hook ✅ 已完成

### 第一检查点

- 新增 `hooks/useGuidedAudio.ts`：口令音频元素、缓存决策、进度、跳转、失败恢复和 Blob URL 清理全部移出页面。
- 新增 `hooks/useChantPlayback.ts`：唱诵倒计时、跳过、播放、失败降级、单次完成保护和 interval 清理全部移出页面。
- 页面不再持有任何 `HTMLAudioElement`，结束保存与放弃统一调用两个 Hook 的 `reset`，删除两段重复清理代码。
- 口令音频加载失败会恢复普通练习计时，不再让用户停在暂停状态；加载中的重复启动被拒绝。
- `practice/page.tsx` 从 2701 行降至 2500 行，页面 `useState` 从 57 个降至 43 个。
- 新增 2 个测试文件、6 项 Hook 测试；全量为 22 文件 / 176 项通过，TypeScript、轻量 lint、生产构建通过。
- 生产浏览器验证普通练习与唱诵倒计时、跳过、音频失败降级。口令 Hook 的 L3 测试通过，但口令卡片的 L4 开始链路仍待复验，因此阶段 3 保持进行中。

### 最终检查点：阶段 3 完成 ✅

- 真实根因：页面先创建普通运行会话，再立即用启动前的旧状态执行暂停，导致刚创建的口令会话被覆盖回未开始；音频事件也捕获了启动前的回调。
- 修复：口令练习直接以暂停状态启动，`useGuidedAudio` 用 ref 调用最新的 `resume/end` 回调。
- 修复失败降级 UI：音频失败后继续普通计时，并保留暂停、继续、结束按钮。
- 新增口令暂停启动、最新回调和失败状态控制策略测试。
- 最终全量：22 个测试文件 / 179 项通过；TypeScript、轻量 lint、生产构建通过。
- 生产 L4：口令卡片选择 → 开始 → 失败降级 → 暂停 → 继续 → 结束 → 放弃清理全链路通过，无新增控制台错误。

**结论**：阶段 3 完成，下一步进入阶段 4 页面编排与真正按需加载。

## 2026-06-19 - 完整解耦阶段 4：页面编排第一检查点

- 提取 `components/practice/PracticeNavigation.tsx`，页面只传入当前 Tab、显隐状态和切换回调。
- `JournalTab`、`StatsTab`、`PosesTab` 改为 `next/dynamic` 按需加载，加入统一 loading UI。
- 浏览器 QA 发现自定义练习弹窗打开后导航仍在背景显示；已将所有页面顶层覆盖层收口到统一显隐策略。
- 生产浏览器复验：弹窗打开后等待退出动画，导航数量为 0；关闭后恢复为 1。
- 当前规模：`practice/page.tsx` 2456 行、43 个 `useState`；23 个测试文件 / 185 项测试通过，typecheck、lint、生产 build 通过。
- 阶段 4 仍在进行：下一刀提取 `PracticeDashboard` 和 `PracticeSessionView`，之后处理 `PracticeModalHost` 与首屏 JS 基线。

### 第二检查点：PracticeDashboard

- 新增 `components/practice/PracticeDashboard.tsx`，承接首页标题、练习选项网格、锁定/口令提示和开始按钮。
- 页面仅传入选项、选择状态、锁定集合、唱诵状态与两个事件；会员判断、双击编辑和会话启动仍由页面负责。
- 新增组件测试，覆盖选项事件、会员锁定、口令提示，以及开始按钮禁用/启用。
- 页面从 2456 行降至 2342 行；24 个测试文件 / 187 项测试、typecheck、lint、生产 build 通过。
- 生产浏览器完成选择、开始、计时、结束和放弃回归，控制台 0 错误。
- 下一步直接提取 `PracticeSessionView`，不重新调查 Dashboard 边界。

### 第三检查点：PracticeSessionView

- 新增 `components/practice/PracticeSessionView.tsx`，承接全屏计时、唱诵倒计时、口令状态、暂停/继续、音频跳转与结束确认。
- `CompletionSheet` 和完成保存/同步留在页面，SessionView 仅接收状态与事件，不拥有业务副作用。
- 新增 4 项组件测试，覆盖普通计时、唱诵、口令 loading/error/progress 和跳转控制。
- 页面从 2342 行降至 2151 行；25 个测试文件 / 191 项测试、typecheck、lint、生产 build 通过。
- 生产浏览器通过普通练习完整链路；口令媒体失败后暂停、继续、结束和放弃仍可用。仅出现用于触发降级的浏览器媒体 `NotAllowedError`，无新增业务异常。
- 下一步直接提取 `PracticeModalHost`，不重新调查 SessionView。

### 第四检查点：PracticeModalHost 第一部分

- 新增 `components/practice/PracticeModalHost.tsx`，承接三步清空数据与唱诵设置；页面保留清空、退出登录、路由和会员转化副作用。
- 新增 3 项组件测试，覆盖清空三步确认、唱诵数值边界和免费用户升级入口。
- 页面从 2151 行降至 1883 行；26 个测试文件 / 194 项测试、typecheck、lint、生产 build 通过。
- 给统计页设置按钮补充 `aria-label="打开设置"`。
- 生产 QA 发现清空确认低于设置弹窗，点击取消会穿透并误开导入；将嵌套警告提升至 `z-[200]/z-[210]` 并补层级回归。
- 修复后生产验证：取消清空会关闭警告、保留设置、不会打开导入，控制台 0 错误；唱诵设置关闭与导航恢复正常。
- 下一步继续收拢其余独立弹窗的渲染接线，ModalHost 尚未整体完成。

### 第五检查点：PracticeModalHost 完成

- Custom/Edit、Settings、会员、账户、导入导出、Auth、FakeDoor、邀请、冲突等独立弹窗的动态加载与渲染接线已移入 `PracticeModalHost`；页面继续保留业务状态和决策。
- 页面从 1883 行降至 1829 行；新增源码约束回归，防止弹窗渲染重新回流页面。
- 26 个测试文件 / 209 项测试、typecheck、lint、生产 build 全部通过。
- 生产浏览器已验证自定义练习→会员提示、设置→清空数据、设置→登录的嵌套关闭与父层恢复；无新增应用错误。
- 下一次直接建立 `/practice` 首屏 JS 可重复基线，确认动态弹窗未进入初始包，再依据包体证据决定页面编排的下一刀；不要重新排查阶段 1–3 或已完成的 ModalHost。

### 第六检查点：首屏 JS 基线与 Mixpanel 延迟加载

- 新增可重复测量脚本：生产构建后自动启动服务器并统计 `/practice` HTML 直接引用的 JavaScript。
- 初始基线 427.9 KiB gzip；拆出邀请版本常量后 426.5 KiB；Mixpanel 改为空闲期异步加载后 333.8 KiB，累计下降 22.0%。
- Mixpanel 代码仍在独立异步 chunk 中，没有删除分析能力；真实浏览器开始/放弃练习与控制台检查通过。
- 当前门禁：27 个测试文件 / 213 项测试、typecheck、lint、生产 build 全部通过。
- 下一次直接提取 `handleExportDebugLog` 内约 480 行采集逻辑，不重新排查性能基线；页面保留触发、显示和下载编排。

### 第七检查点：调试日志采集模块

- 新增 `lib/practice-debug-log.ts`，调试采集与 React 页面解耦；页面通过显式快照传参，不改变 `useSync`。
- `app/practice/page.tsx` 从 1829 行降至 1406 行；页面 handler 只负责调用、JSON、弹窗和错误提示。
- 首屏复测 334.1 KiB gzip，相比拆分前 +0.3 KiB，阶段累计降幅仍为 21.9%。
- 28 个测试文件 / 218 项测试、typecheck、lint、生产 build 通过；完整采集测试覆盖未登录降级、照片/同步摘要和 JSON 序列化。
- 浏览器插件三次阻塞在本地导航，未把真实浏览器回归冒充为通过；端口已清理。
- 下一次直接提取记录/选项命令处理器，接收 `autoSync` 回调但不拆 `useSync`，目标让页面进入 800–1200 行。

### 阶段 4 最终检查点：记录/选项命令与正式结项

- 新增 `hooks/usePracticeCommands.ts`，收拢选项交互、会员名额、色阶保护、记录/选项 CRUD 和同步触发条件。
- `autoSync` 仅作为显式回调注入，没有改动 `useSync`；页面从 1406 行降至 1157 行。
- 29 个测试文件 / 223 项测试、typecheck、lint、生产 build 通过；首屏 334.6 KiB gzip，累计下降 21.8%。
- 生产浏览器验证选项选择、自定义弹窗、运行日志完整 JSON、父子弹窗关闭与导航恢复，控制台 0 应用错误。
- 阶段 4 全部门槛完成。下一次进入阶段 5，先拆远端字段映射与输入归一化纯函数，再处理 Supabase 仓库层。

### 第四批（续）：L3 用户隔离 + resolveConflict 错误一致性 + L5 基础设施

**代码修复**：
- `hooks/useSync.ts`：`uploadLocalData` 首行加 `if (!user) return` 守卫（external call 路径）
- `hooks/useSync.ts`：`resolveConflict('local')` 中 `repoDeleteAllUserOptions` 返回值未检查 → 改为 throw，与 `repoDeleteAllUserRecords` 一致

**L3 新增测试 (sync-isolation-and-rollback.test.ts 4 项)**：
- user=null 调 uploadLocalData → fetch/upsert 均未被调用，返回 `{ success: false }`
- user=undefined → 同样被拒绝（falsy 守卫）
- resolveConflict('local') deleteOptions 失败 → syncStatus='error'
- resolveConflict('local') 删除成功 + upsert 失败 → syncStatus='error'

**L5 新增基础设施**：
- `vitest.config.e2e.mjs` — node 环境、30s 超时、串行、加载 `.env.test`
- `__tests__/L5/setup.ts` — 环境变量 fail-fast + 邮箱白名单 + service_role key 格式校验
- `__tests__/L5/helpers/test-client.ts` — signInTestUser / signOutTestUser / getTestClient
- `scripts/reset-test-account.ts` — `resetTestAccountByUserId()` 按 FK 顺序清空 7 张表
- `package.json` 新增 `test:L5` / `test:L5:watch` 脚本
- 主 `vitest.config.ts` 排除 `__tests__/L5/` 防止被默认套件扫到

**L5 端到端测试全部跑通（3 文件 / 8 项）**：
- ✅ `auth.smoke.e2e.test.ts`（4/4）— 登录/reset/CRUD/退登 RLS
- ✅ `sync.upload.e2e.test.ts`（2/2）— 批量 upsert + 幂等
- ✅ `sync.conflict.e2e.test.ts`（2/2）— 双设备冲突检测 + smartMerge

**修复**：
- `hooks/useSync.ts`：`uploadLocalData` 添加 `!user` 守卫；`repoDeleteAllUserOptions` 失败后 throw
- `scripts/reset-test-account.ts`：修复删除顺序（user_memberships 先于 user_profiles），移除不存在的 `calendar_annotations`
- 冲突测试改用 `beforeEach` 逐条 reset 保证隔离

**状态**：
- 全量 43 个测试文件 / 444 项通过（+4 L3 + 8 L5）
- 当前未 commit（后续统一发版流程处理）

## 2026-06-24: 阶段 6 测试缺口填充

### 背景
按照解耦路线图，阶段 6 填补测试矩阵中"缺失"和"部分覆盖"的缺口。用户指定"先补缺口"。

### 完成的测试文件（5 个新文件，58 项新测试）

**`__tests__/oss-utils.test.ts`（12 项，L1）**
- `validatePhotoFile`：图片类型（JPEG/PNG/WebP/GIF）、非图片类型（PDF/TXT/空类型）、文件大小边界（恰好上限、超出1字节、2倍上限、0字节）
- `ERROR_MESSAGES`：所有错误码均有非空消息

**`__tests__/photo-logger.test.ts`（13 项，L1）**
- `addPhotoLog`/`getPhotoLogs`：添加、逆序排列、100 条上限、自动生成 id/timestamp、localStorage 异常容错
- `clearPhotoLogs`、`getRecentPhotoLogs`、`getPhotoLogsByRecord`、`getPhotoErrorLogs`

**`__tests__/oss-network.test.ts`（10 项，L3）**
- `getPresignedUrl`：成功返回、fetch 网络异常、请求体验证
- `savePhotoMetadata`：成功返回、API 错误传播、网络异常
- `uploadToOSS`：200 成功、403/400 错误码映射、网络异常

**`__tests__/api-auth-routes.test.ts`（7 项，L3）**
- `POST /api/auth/register`：缺失 email/password/verificationCode、非法 JSON、密码 < 8 位、无字母、无数字
- 使用 `NextRequest` 直接调用路由处理器，mock Supabase 依赖

**`__tests__/option-color-level.test.ts`（16 项，L1）**
- `getEffectiveOptionColor`：Pro 保留全部色阶（1/2/3/4）、免费降级（1→3、4→3）、保留（2/3）、未知 label、undefined color_level、空 options
- `getColorClass`：1→绿色1、2→绿色2、3→绿色3、4→绿色4、undefined/0/5→默认

### 覆盖的测试矩阵缺口

| 缺口 | 之前状态 | 现在状态 |
|---|---|---|
| 照片上传/删除失败恢复与上限 | 缺失 | 已覆盖（L1 validate + 网络边界） |
| API 输入、未授权、异常、幂等 | 缺失 | 部分覆盖（register 输入验证） |
| 免费/Pro 色阶 | 部分覆盖 | 已覆盖（L1 纯函数） |

### 未覆盖的缺口（为后续保留）

| 缺口 | 原因 |
|---|---|
| 教程记录与真实记录隔离 | 依赖 usePracticeData hook，需要复杂 mock，且当前无对应源文件 |
| API 幂等性 | 需要数据库状态，不适用纯单元测试 |
| send-verification-code/reset-password API 验证 | 使用 `@supabase/supabase-js` 直接构造 client，mock 复杂度较高 |

### 结果
- 48 个测试文件 / **498 项通过**（+5 文件，+58 项）
- TypeScript、lint 未改动
- 阶段 6 测试缺口部分完成，继续推进大型组件审计与最终归档

## 2026-06-25: 阶段 6 完成 - 跨模块测试缺口清零

### 背景
继续阶段 6 测试缺口填充。按用户偏好串行推进，L1/L3 优先（无浏览器依赖），L4 浏览器测试最后。

按计划完成 4 个「缺失」矩阵项清零：
1. 教程记录与真实记录隔离（L1/L3）
2. API 幂等与 AUTH 路由完整验证（L3）
3. 媒体后台恢复进度（L3/L4）
4. Tab 滚动与内部状态保持（L4）
5. URL 参数/返回/刷新/深链接（L4）

### P1: 教程记录隔离（新增 `__tests__/tutorial-record.test.ts`，9 项）

**问题**：教程记录（`hooks/usePracticeData.ts`）唯一可识别信号是 `tutorial-` id 前缀，但代码库任何地方都不读取此前缀。后果：教程记录被原样同步到 Supabase 云端、原样导出到数据胶囊、计入用户统计（duration=5400s, date=本月1号）。

**方案 A**：加 `is_tutorial: boolean` 字段（而非 id 前缀 hack），与 `type: '草稿'` 的处理方式保持一致。

**生产代码改动**：
- `lib/supabase.ts` — `PracticeRecord` 接口新增 `is_tutorial?: boolean`
- `hooks/usePracticeData.ts` — 本地 `PracticeRecord` 接口同步；教程记录创建时添加 `is_tutorial: true`；新增一次性迁移：旧 `tutorial-` 前缀记录标记为 `is_tutorial: true`（与草稿清理同位置）
- `lib/import-export.ts` — `serializeExportData` 过滤 `is_tutorial`（`nonDraftRecords` → `nonSystemRecords`）
- `hooks/useSync.ts` — `prepareRecordsForSafeUpload` 函数开头加 `recordsToSync.filter(r => !r.is_tutorial)`

**架构决策**：纯函数 `diffRecords`/`sortAndLimitRecords`/`applySafeMerge` 不修改，过滤在上层做。测试 4-6 验证这一接口契约（is_tutorial 记录流经纯函数无特殊处理）。

**测试 9 项**：
1. serializeExportData 过滤 is_tutorial
2. serializeExportData 不凭 tutorial- 前缀误过滤
3. serializeExportData 保留普通记录
4. diffRecords 保持纯函数（is_tutorial 无特殊处理）
5. sortAndLimitRecords 保持纯函数
6. applySafeMerge 保持纯函数
7. prepareRecordsForSafeUpload 上传前过滤（验证过滤逻辑）
8. 旧 tutorial- 前缀迁移契约（保守策略：所有 tutorial- 前缀都标记）
9. 已 is_tutorial: true 的记录不被重复处理

### P2: API 幂等 + AUTH 路由（扩展 `__tests__/api-auth-routes.test.ts`，+18 项）

**重构 mock 策略**：从全局 `vi.mock` 改为 `vi.hoisted` 模式，让每个测试可独立控制 mock 返回值。同时新增 `@supabase/supabase-js` 的 `createClient` mock（reset-password 和 send-verification-code 直接用 createClient 而非 @/lib/supabase）。

**register +2 项幂等**：
- 同一 (email, code) 第二次调用失败（验证码已 used=true）
- 重复赠送会员被 `.maybeSingle()` 检查阻止

**verify-code +5 项**（之前 0 项）：
- 3 项输入验证（缺 email、缺 code、malformed JSON）
- 2 项幂等（第一次成功第二次失败；标记 used=true 被调用）

**reset-password +7 项**（之前 0 项）：
- 6 项输入验证（缺 email、缺 newPassword、< 8 位、无字母、无数字、malformed JSON）
- 1 项 `EXPOSES GAP`：两次相同请求都成功 → 暴露无验证码消费机制

**send-verification-code +4 项**（之前 0 项）：
- 3 项输入验证（缺 email、邮箱格式错误、malformed JSON）
- 1 项 `EXPOSES GAP`：连续 5 次调用都生成新验证码 → 暴露无 60s 限频

**暴露的缺陷已记入 `TODO.md`**（2026-06-25 条目），不在本阶段修复（遵循"surgical changes"原则）。

### P3: L4 浏览器测试（4 文件 +9 项）

**新增 `__tests__/L4/visibility.spec.ts`（3 项）**：
- 练习中切后台 → UI 应进入暂停态（用 `page.evaluate` 模拟 visibilitychange）
- 暂停后切回前台 → 仍处于暂停态
- 口令模式中切后台 → 控件状态保持

**扩展 `__tests__/L4/tab.spec.ts`（+1 项）**：
- stats Tab 滚动位置：切走再切回保持（容差 50px；内容不够长时跳过断言）

**扩展 `__tests__/L4/deep-link.spec.ts`（+3 项）**：
- `?tab=invalid` → 应回退到 practice（默认）
- `?tab=` 空值 → 应回退到 practice
- 深链接刷新 → 无 hydration 错误

**新增 `__tests__/L4/url-state.spec.ts`（2 项）**：
- 浏览器返回 → 无 hydration 错误
- 浏览器前进 → 无 hydration 错误

### 覆盖的测试矩阵缺口

| 缺口 | 之前状态 | 现在状态 |
|---|---|---|
| 教程记录与真实记录隔离 | 缺失 | 已覆盖（L1 9 项） |
| API 输入、未授权、异常、幂等 | 部分覆盖（7 项 register 输入） | 已覆盖（L3 25 项，含 4 个 AUTH 路由 + 幂等 + 暴露缺陷） |
| Tab 滚动与内部状态保持 | 缺失 | 已覆盖（L4 1 项） |
| URL 参数、返回、刷新、深链接 | 缺失 | 已覆盖（L4 6 项：deep-link 扩展 + url-state 新增 + visibility 新增） |
| 媒体后台恢复进度 | 缺失 | 已覆盖（L4 visibility.spec.ts 3 项） |

### 最终状态

| 指标 | 阶段 6 开始 | 阶段 6 完成 |
|---|---|---|
| 测试文件数 | 48 | **49**（+1 P1；P2/P3 扩展现有文件） |
| 测试通过数 | 498 | **525**（+27 L1/L3） |
| L4 测试数 | 39 | **51**（+9 P3，需 dev server 验证） |
| 矩阵「缺失」项 | 4 | **0** |
| 阶段 6 状态 | 进行中 | **已完成** |

### 暴露但未修复的缺陷（记入 TODO.md）
1. `reset-password` 无幂等机制（无验证码消费）
2. `send-verification-code` 无防刷限频（无限频）

### 文件变更清单

**生产代码（4 文件）**：
- `lib/supabase.ts` — PracticeRecord 加 `is_tutorial?: boolean`
- `hooks/usePracticeData.ts` — 教程记录加 `is_tutorial: true` + 旧前缀迁移
- `lib/import-export.ts` — serializeExportData 过滤 is_tutorial
- `hooks/useSync.ts` — prepareRecordsForSafeUpload 过滤 is_tutorial

**测试文件（6 文件）**：
- `__tests__/tutorial-record.test.ts`（新增，9 项）
- `__tests__/api-auth-routes.test.ts`（重写，25 项 = 7 原有 + 18 新）
- `__tests__/L4/visibility.spec.ts`（新增，3 项）
- `__tests__/L4/tab.spec.ts`（扩展，+1 项）
- `__tests__/L4/deep-link.spec.ts`（扩展，+3 项）
- `__tests__/L4/url-state.spec.ts`（新增，2 项）

**文档（3 文件）**：
- `TODO.md` — 新增 AUTH 路由幂等/防刷缺口条目
- `docs/architecture/DECOUPLING_TEST_MATRIX.md` — 缺失项清零，基线 49/525
- `docs/architecture/DECOUPLING_ROADMAP.md` — 阶段 6 状态改为「已完成」

### 验证
- `npx vitest run` → 49 文件 / 525 项通过（baseline 498 + P1 9 + P2 18 = 525）
- L4 浏览器测试待 `npm run test:L4`（需 dev server @ port 3100）

### 架构决策记录

**为什么 is_tutorial 过滤只在上层做，不修改纯函数？**
保持纯函数单一职责。`diffRecords`/`sortAndLimitRecords`/`applySafeMerge` 是数据结构操作函数，不感知业务语义（草稿、教程、软删除等）。业务过滤责任在边界（导出/上传）。这样：
1. 纯函数可被复用（如未来用于统计、迁移脚本）
2. 测试更稳定（纯函数测试不依赖业务规则）
3. 业务规则集中可见（`serializeExportData` 和 `prepareRecordsForSafeUpload` 一眼看出过滤了什么）

**为什么用 `EXPOSES GAP` 而非直接修复 reset-password / send-verification-code？**
遵循 "Surgical Changes" 原则。本阶段目标是测试缺口填充，不是修复 API 缺陷。暴露的缺陷需要单独评估（影响面、修复方案、回归测试），不应混在测试 PR 中。测试通过 `EXPOSES GAP` 标记明确告知读者：测试本身是断言"缺陷存在"，未来修复后需把 `EXPOSES GAP` 测试改为 `VERIFIES FIX` 测试。


## 2026-06-25: 百度 SEO 补齐 — 发现型关键词覆盖

### 背景
商业模式诊断确认核心瓶颈：每日 intake 仅 ~1 人，需求在获客通道。品牌词「熬汤日记」能搜到官网，但发现型关键词零排名（「阿斯汤加 记录」「瑜伽 打卡工具」等均搜不到）。

### 修改内容

- `app/layout.tsx` — title 改为「熬汤日记 - 阿斯汤加瑜伽练习记录与打卡工具」，description 融入「免费」「Mysore 计时」「无需下载」等搜索意图。
- `app/seo/page.tsx` — 新增 SEO 着陆页，纯服务端组件（无 'use client'），6 个功能卡片自然融入关键词，底部 CTA 链接回首页。
- `app/sitemap.ts` — 新增，包含 `/` `/practice` `/seo` 三个 URL。
- `app/robots.ts` — 新增，允许所有爬虫，指向 sitemap。

### 验证

- `npx next build` → 通过
- `/seo` 预渲染为静态内容 ✓
- `/robots.txt` `/sitemap.xml` 正确生成 ✓

### 下一步

部署后到百度站长平台提交 sitemap 和手动收录。

## 2026-06-25: 留存数据 — 全量 3877 条练习记录分布

来源：数据库全量查询，105 个有练习记录的用户。

### 用户分层

| 练习次数 | 人数 | 占比 | 解读 |
|---------|------|------|------|
| 1 次 | 7 人 | 6.7% | 试了一次就走了 |
| 2-5 次 | 20 人 | 19% | 试了几次放弃了 |
| 6-20 次 | 22 人 | 21% | 坚持了一阵 |
| 21-50 次 | 30 人 | 28.6% | 核心用户 |
| 51-100 次 | 19 人 | 18.1% | 重度用户 |
| 100+ 次 | 7 人 | 6.7% | 铁粉 |

### 关键洞察

- **核心+重度+铁粉 = 53.4%**（超过一半用户练习超过 20 次），说明产品留存侧没问题
- **26.7% 用户试了 5 次以内就走**，这部分可能不是产品问题，而是「不是目标用户」（随便试试就走的过客）
- 瓶颈确实在获客（daily intake ~1 人），而非留存


## 2026-06-25: 购买弹窗优化 — 闲鱼改微信号 + z-index 修复

### 背景
用户反馈：在 Tab1 点击加锁的练习选项后弹出 Pro 会员提示，点击"购买"按钮无反应。

### Bug 修复
- `components/Membership/PurchaseGuideModal.tsx` — 遮罩层 z-index 从 `z-50` 提升到 `z-[140]`，内容层从 `z-[110]` 提升到 `z-[150]`
- 根因：`MembershipPromptModal` 的 z-index 为 `z-[120]/z-[130]`，购买弹窗实际打开了但被挡在后方不可见
- 影响范围：所有调用了 `PurchaseGuideModal` 的地方（MembershipPromptModal、ActivateModal、Settings 页）

### 功能调整
- 购买弹窗内容从「闲鱼链接 + 一键复制链接」改为「微信号 xiao519216978 + 复制微信号」，减少一步操作

### 涉及文件
- `components/Membership/PurchaseGuideModal.tsx`

### 提交
- `7ec65a4` — 闲鱼链接改为微信号
- `02fd308` — z-index 修复

## 2026-06-25: 解耦重构安全卫生清理

### 背景

重构主体完成后做复审，发现历史排查阶段留下的 debug/test API 与敏感日志仍在运行路径中。它们不影响 L4/L5 通过，但会扩大生产日志和接口暴露面。

### 修改内容

- 删除公开临时路由：`/api/debug/env`、`/api/debug/membership`、`/api/test/membership`。
- Auth/验证码路径去除验证码、session、注册响应、邮箱流程等调试输出。
- 会员接口去除 auth header、token、请求体、激活码、原始会员记录等敏感日志。
- `membership/status` 从调试型多路 fallback/全表扫描收束为正式查询链路。
- 调试日志导出不再调用 `/api/debug/membership`。
- 清空本地数据从 `localStorage.clear()` 改为只清本应用 key。
- 删除记录和日历标注类型删除不再使用原生 `confirm/window.confirm`。

### 验证

- `npm.cmd run typecheck` → 通过
- `npm.cmd run lint` → 通过
- `npx.cmd vitest run __tests__/api-auth-routes.test.ts` → 1 文件 / 27 项通过
- `npm.cmd run test:L5` → 3 文件 / 8 项通过
- `npx.cmd playwright test __tests__/L4/practice.spec.ts --project=guest-chromium` → 4 项通过

## 2026-06-25: AuthModal 流程拆分

### 背景

安全卫生清理后，`components/AuthModal.tsx` 仍是剩余较大的前端组件，混合了登录、注册、忘记密码、验证码倒计时和错误翻译逻辑。

### 修改内容

- `components/AuthModal.tsx` 从 933 行降到 579 行，继续只负责弹窗 UI 与接线。
- 新增 `hooks/useRegisterFlow.ts`，封装注册验证码发送/重发、注册倒计时、服务端注册与自动登录。
- 新增 `hooks/useForgotPasswordFlow.ts`，封装忘记密码三步流程、验证码重发倒计时与密码重置。
- 新增 `hooks/useCountdownTimer.ts`，复用 60 秒倒计时。
- 新增 `lib/auth-modal-utils.ts`，集中 Auth 错误翻译、密码强度校验与 Auth POST helper。
- 修正忘记密码前端重置密码请求，显式传递验证码 `code`。
- 更新 `practice-commands` 测试，适配删除记录确认已从原生 confirm 改为 Sonner Toast action。

### 验证

- `npm.cmd run typecheck` → 通过
- `npm.cmd run lint` → 通过
- `npx.cmd vitest run --config vitest.config.ts __tests__/auth-modal.test.tsx __tests__/auth-modal-accessibility.test.tsx` → 2 文件 / 30 项通过
- `npx.cmd vitest run --config vitest.config.ts` → 49 文件 / 527 项通过

## 2026-06-26: 解耦重构收尾 — 进入维护模式

### 背景

复盘整个解耦任务后确认：继续按行数驱动拆分的边际收益已经下降，容易制造文件跳转成本。重构目标已经达成，后续应按真实痛点、风险和业务优先级推进。

### 收尾结论

- 核心阶段 1–6 已完成，可以停止主动重构。
- `app/practice/page.tsx` 已在目标范围内，不再为了降到 800 行硬拆。
- `hooks/useSync.ts`、`lib/sync-utils.ts`、`components/AuthModalForms.tsx` 暂不主动拆。
- 会员 API helper/repository 化只保留为可选优化，不作为默认下一阶段。
- 后续优先级改为：业务增长/获客/转化、线上 bug、安全问题、有测试保护的小范围优化。

### 后续规则

只有出现具体 bug、具体业务改动、具体维护痛点，才开启下一刀。纯行数型拆分暂停。

## 2026-06-26: AuthModal 表单视图拆分

### 背景

上一刀已将 AuthModal 的注册/忘记密码/倒计时流程抽到 hook，但弹窗组件仍包含大量 Login/Register/ForgotPassword JSX。

### 修改内容

- `components/AuthModal.tsx` 从 579 行降到 226 行，只保留弹窗壳、标题、模式切换、hook 接线和 submit 编排。
- 新增 `components/AuthModalForms.tsx`，承接：
  - `LoginForm`
  - `RegisterForm`
  - `ForgotPasswordForm`
  - 共享输入框、密码要求、验证码提示、重发按钮和错误提示。
- 未改 API 与用户可见流程。
- 补齐 `practice-commands` 测试中 Sonner Toast action mock 的 TypeScript 类型。

### 验证

- `npm.cmd run typecheck` → 通过
- `npm.cmd run lint` → 通过
- `npx.cmd vitest run --config vitest.config.ts __tests__/auth-modal.test.tsx __tests__/auth-modal-accessibility.test.tsx` → 2 文件 / 30 项通过
- `npx.cmd vitest run --config vitest.config.ts` → 49 文件 / 527 项通过

## 2026-06-30: 同步重复事故修复与 master 恢复上线

### 背景

生产环境上线后出现严重同步异常：部分用户本地练习记录数量翻倍，但 Supabase 审查显示云端没有重复记录。用户手动回滚后，继续基于导出的调试日志排查。

### 排查结论

- 重复主要发生在本地 `localStorage` 的 `ashtanga_records` 中，云端未被污染。
- 典型日志表现：
  - 本地 `localCount: 78`
  - 云端 `remoteCount: 39`
  - `failedSyncIds` 中每个记录 ID 重复出现
  - 错误历史出现 `ON CONFLICT DO UPDATE command cannot affect row a second time`
- 根因不是应用层“审查机制”拦截，而是同一批 upsert 内包含重复 `id`，Postgres/Supabase 在 `ON CONFLICT(id)` 时拒绝同一目标行被同一条 SQL 更新两次。
- 因此批量上传失败，没有把本地重复记录写成云端重复行。

### 修复内容

- `lib/sync-utils.ts`
  - 新增 `dedupeRecordsById`
  - `diffRecords`、`mergeRecords` 在参与比较/合并前去重
  - 同一 ID 保留 `updated_at` 较新的记录
- `hooks/useSync.ts`
  - 读取本地数据时对 `ashtanga_records` 去重
  - 发现本地重复后，把清理后的数组写回 `localStorage`
  - `merge-remote` 写入前再次去重
- `lib/sync-orchestrator.ts`
  - 修正同步方向判断：
    - 无记录/颜色/选项变化时 `noop`
    - 只有本地记录变化时 `upload-local`
    - 只有远端记录变化时 `merge-remote`
    - 双边变化才进入冲突/合并路径
- 补充测试：
  - 本地同 ID 重复不会翻倍
  - 同 ID 保留更新时间较新的记录
  - 本地新增只触发上传
  - 远端新增只触发下载
  - 两端同 ID 无变化时不做多余同步

### 移动端字体修复

用户确认 `master2` 上重复记录已消失后，又发现手机 Chrome 仍显示默认黑体，电脑 Chrome 正常显示宋体。

排查结论：

- 之前 CSS 只依赖 `'Songti SC' / 'STSong' / 'SimSun'` 等系统字体。
- macOS/Windows 桌面通常有对应宋体，所以显示正常。
- Android Chrome 通常没有这些系统宋体，会 fallback 到系统黑体。

修复：

- `app/layout.tsx` 引入 `next/font/google` 的 `Noto_Serif_SC`，生成 `--font-noto-serif-sc`。
- `app/globals.css` 让 `--font-sans`、`--font-serif`、`--font-playfair`、`--font-mono` 全部优先使用 `var(--font-noto-serif-sc)`。
- 对 `html/body/button/input/textarea/select` 增加全局字体兜底，避免表单控件继续使用系统默认黑体。

### 上线状态

- `master2` 修复提交：
  - `1ecf515 fix: prevent sync duplicate records`
  - `080612d fix: load serif font on mobile`
- 已合并到 `master`：
  - `4a34f23 merge master2 hotfixes into master`
- 已推送 `origin/master`，触发生产部署。

### 验证

- `npm.cmd run typecheck` → 通过
- `npm.cmd exec vitest run __tests__/sync-utils.test.ts __tests__/sync-orchestrator.test.ts` → 2 文件 / 59 项通过
- `npm.cmd run build` → 通过

### 当前恢复点

- 生产分支：`master`
- 最新生产提交：`4a34f23`
- 重点观察：
  - 用户打开新版本后，本地重复记录应自动清理并写回本地。
  - 后续导出日志/数据胶囊应基于清理后的本地数据。
  - Android Chrome 应加载 `Noto Serif SC`，不再回落到系统黑体。
- 工作区仍有两个与本次上线无关的本地项未处理：
  - `.claude/skills/gstack`
  - `.claude/skills/gstack.bak/`

## 2026-07-03: SEO / GEO 阶段 0 完成，公开内容技术地基落地

### 目标

把网站从只有品牌落地页和客户端应用的结构，扩展为搜索引擎与 AI 可以直接抓取、理解和引用的公开内容层。中文市场优先，内容来自正确的运营真源：

`D:\BaiduSyncdisk\work\cursor app\xiaohongshu内容运营`

### 阶段 0

- 建立 20 个固定 SEO 查询和 20 个固定 GEO 问题。
- 完成首批 15 页的关键词、搜索意图、素材、来源和 CTA 映射。
- 记录百度现状：网站已提交，品牌词“熬汤日记”可搜，非品牌词暂无可见度。
- 明确外部笔记只用于研究，烧冰冰原创稿和内容单元才可改编为网站正文。

### 技术地基

- 新增 Markdown 内容目录、frontmatter 校验和服务端内容读取器。
- 新增公开内容模板、索引页、作者页、公众号二维码和统一页头页尾。
- 首批页面：
  - `/tools/ashtanga-practice-tracker`
  - `/ashtanga/practice-record`
  - `/poses/padangusthasana-padahastasana`
  - `/authors/shao-bingbing`
- 首页增加可抓取的工具、练习指南、体式库和作者入口。
- 增加 canonical、Open Graph、Twitter Card、Article、SoftwareApplication、Person 和 BreadcrumbList。
- sitemap 改用内容真实更新时间，收录公开内容并移除 `/practice` 与旧 `/seo`。
- `/practice` 设置 `noindex, follow`。
- `/seo` 永久重定向到真正的工具页。
- robots 明确允许公开抓取和 `OAI-SearchBot` / `Baiduspider`，阻止 `/api/`。

### 测试

- 新增 SEO 内容、frontmatter、canonical、sitemap、robots 和二维码测试。
- 修正两类既有测试：
  - 字体测试更新为当前 Noto Serif SC 自托管方案。
  - 日记组件测试固定系统日期，避免跨月后自动失败。
- Vitest：55 文件 / 560 项通过。
- TypeScript：通过。
- 生产构建：当前环境连接 Google Fonts 失败，需联网后复验；与本次页面代码无关。

### 当前恢复点

继续补 `/ashtanga/awareness-journal`，然后进入 Mysore、一序列、月相和唱诵知识支柱。生产发布前必须补跑联网构建。

## 2026-07-03: SEO / GEO 首批 15 页开发完成

### 本次完成

- 补齐阿斯汤加知识中心与 5 个专题：
  - `/ashtanga/mysore`
  - `/ashtanga/primary-series`
  - `/ashtanga/moon-days`
  - `/ashtanga/opening-chant`
  - `/ashtanga/awareness-journal`
- `/ashtanga` 增加“阿斯汤加是什么、初学者从哪里开始、知识库提供什么”的可抓取正文。
- 补齐公开体式库与剩余 4 个体式详情：
  - `/poses/upavishta-konasana`
  - `/poses/supta-konasana`
  - `/poses/matsyasana`
  - `/poses/uttana-padasana`
- `/poses` 增加体式提示的用途、边界和安全说明。
- 12 篇 Markdown 内容互相加入相关页面链接；15 个计划页面均可由首页经聚合页在两次点击内到达。
- 月相页明确区分阿斯汤加传统休息安排与缺乏依据的“月亮牵引人体水分”解释。
- 体式页沿用 App 当前 WebP 图片与简明提示，不加入医疗效果，不把图片深度写成练习标准。

### 验证

- 定向 Vitest：3 文件 / 24 项通过。
- 全量 Vitest：55 文件 / 560 项通过。
- `npm.cmd run typecheck`：通过。
- `npm.cmd run lint`：通过。
- 生产构建仍需在可连接 Google Fonts 的环境复验；此前失败点为 Noto Serif SC 下载，不是页面编译错误。

### 下一次恢复点

不再扩写第二批 SEO 页面，直接进入发布验收：

1. 补跑联网生产构建。
2. 人工确认 5 张体式图片使用权、作者简介和公众号二维码真机识别。
3. 在预览环境检查 15 页移动端排版、CTA、内部链接、图片和结构化数据。
4. 部署后提交 Google、Bing、百度 sitemap 与新增 canonical URL。
5. 补录站长平台基线，30 天后根据抓取、索引和非品牌词展现决定是否继续。

## 2026-07-03: SEO 内容定位校正——工具与科普，不做教学

### 定位

用户明确熬汤日记不是专业教学网站。公开内容的长期边界调整为：

- 产品核心是阿斯汤加练习记录工具。
- 内容面向小白和普通练习者，提供入门科普、工具说明和烧冰冰的个人练习感悟。
- 体式页只帮助识别中文名、梵文名、图片、序列位置和相邻体式关系。
- 不发布进入、停留、退出、呼吸计数、纠错、辅助或身体调整教程。
- 不评价动作是否标准，不以专业老师或医疗人员身份发言。

### 页面调整

- 重写首批 5 个体式详情页，删除所有编号动作步骤和练法说明。
- `/poses` 从“体式提示库”改为“体式名称科普”，明确能做什么和不做什么。
- `/ashtanga` 改为“普通练习者的阿斯汤加科普”。
- 一序列页改成结构与常见误解科普，不再回答具体怎样练。
- 唱诵页删除步骤式跟唱方法，改为新手体验和个人感受。
- 首页、作者页、公开导航与页脚统一“工具 + 小白科普 + 个人感悟、不做体式教学”的表达。
- SEO / GEO 计划、内容地图与固定问题集同步调整，避免用“怎么做体式”吸引错误搜索意图。

### 防回退

- SEO 内容测试新增非教学边界：
  - 体式标题不得出现“怎么做、怎样练、练习提示”。
  - 描述不得使用“动作顺序、呼吸提示、安全提示”。
  - 正文不得出现动作步骤标题或编号步骤。
  - 每页必须明确说明非教学边界。

### 最终验证

- Vitest：55 文件 / 561 项通过。
- TypeScript 与轻量 lint：通过。
- 联网生产构建：通过，39 个路由完成静态生成。
- 本地生产服务：主页、聚合页、15 个计划页面、sitemap 和 robots 共 19 个入口全部返回 200。
- 浏览器检查：
  - 手机 375px、平板 768px、桌面 1280px 响应式页面可读。
  - 发现并修复手机公开导航逐字断行问题。
  - 体式详情没有编号动作步骤或横向溢出。
  - 体式图片、公众号二维码和自托管 Noto Serif SC 均返回 200。
  - canonical、Article 和 BreadcrumbList JSON-LD 输出正确。
  - 本地出现的 Vercel Analytics / Speed Insights 404 属于非 Vercel 本地运行的预期现象。

### 剩余人工项

- 最终确认作者页“四年练习经历”的公开表述。
- 部署后提交搜索平台并记录 30 天基线。

## 2026-07-03: 撤销公开体式 SEO 页面

用户确认：

- App 内不需要增加跳转到公开科普页面的入口。
- 公众号二维码没有问题。
- 体式图片版权存在争议，因此公开网站不再讲体式。

处理：

- 删除 `/poses` 聚合页与 5 个体式详情页。
- 删除 `content/knowledge/poses/` 下全部公开体式稿件。
- 从 sitemap、首页、公开导航和文章内部链接移除 `/poses`。
- 从内容读取器移除 `poses` 内容类型，防止以后误加入。
- 固定 SEO / GEO 测试集改为工具、记录与练习常识问题。
- 原 15 页计划收缩为 9 页：1 个工具页、`/ashtanga` 与 6 个科普页、1 个作者页。
- App 内现有体式库保持不变；本次只撤销新增的公开 SEO 内容。

更新后的原则：网站可以科普阿斯汤加的练习方式、传统和记录方法，但不建设体式图解或动作教学页面。

验证：

- Vitest：55 文件 / 562 项通过。
- TypeScript 与轻量 lint：通过。
- 联网生产构建：通过，33 个路由完成静态生成，路由清单中不存在 `/poses`。
- sitemap 测试确认没有任何 `/poses` URL。
- 新增测试确认 `/practice` 及其练习组件没有跳转到公开科普页的入口。

## 2026-07-03: 公开内容升级为瑜伽杂志版式

用户确认公开页面内容基本没有问题，希望排版更精美、更像瑜伽杂志。

本次只调整公开工具、科普和作者页面，不修改 `/practice` App：

- 公开页头改为杂志刊头，增加英文刊名与栏目说明。
- 聚合页使用卷期信息、编辑式双栏标题、三栏导读和编号目录。
- 文章页使用双栏题头、作者侧注、窄正文栏、首字下沉和杂志式引文。
- 作者页改为人物档案、主理人自述、社交入口和精选阅读。
- 页脚改为纸张色杂志落款，保留公众号二维码。
- 移除公开内容层的大面积白色圆角卡片和装饰阴影，改用细分隔线与留白。
- 保留既有宋体、墨绿、米白和旧金配色，不引入外部图片。
- 在 `DESIGN.md` 增加“Public Editorial Layer”，明确公开内容与 App 功能界面的不同版式规则。

验证：

- 手机 375px、平板 768px、桌面 1280px 截图检查通过。
- 页面无横向溢出，中文大标题没有桌面端末字孤行。
- Vitest 55 文件 / 562 项、TypeScript 和轻量 lint 通过。

---

## 2026-07-03: 公开内容杂志版式迭代优化

**类型**: UI 优化

**状态**: 已推送至 master

### 修改内容

1. **纸纹背景** — 修复 `bg-paper-pattern` SVG（去掉无效属性），新增 `bg-paper-dark` 页脚纸纹变体，全局框架改用纸纹质感替代平面渐变。

2. **入场动画** — 新增 `animate-enter` + 5 档延迟工具类（`animate-enter-delay-1` 至 `animate-enter-delay-5`），页头、正文区、页脚分段渐入。

3. **金色装饰** — 栏目页标题下加入金色标尺线、侧栏标记加粗为 `border-t-2`、首字下沉放大至 `text-7xl`，区块引号边框加粗。

4. **页头重构单行** — 去掉「阿斯汤加 Ashtanga」副标，三行变一行：`[icon 24px] 熬汤日记 · 呼吸·觉察 · Practice, practice... | 记录工具 · 阿斯汤加 · 关于作者`。字号统一 `text-base`，层级靠透明度区分。品牌名去掉跳转链接。

5. **页脚精简** — 去掉 ASHTANGA JOURNAL 装饰分割线、去掉「开始练习」按钮。二维码缩小至 64px，左对齐。最终 5 行：描述 → 二维码+扫码文字 → 分割线 → 版权行。

6. **条目交互** — 目录和精选链接标题悬停变金色，↗ 箭头悬停右上位移。卡片区 hover 添加轻微阴影。

### 提交记录
- `dac2e09` — 页头字号统一为 text-sm（后改为 text-base）
- `6d744b2` — 页头熬汤日记去掉跳转链接
- `cf406b0` — 页脚精简：去掉开始练习按钮，二维码左对齐
- `104d10c` — master2 合并至 master

设计方向：纸张质感瑜伽杂志，宋体（Noto Serif SC）+ 墨绿(#2A4B3C) / 米白(#F9F7F2) / 旧金(#C1A268) 配色不变。

---

## 2026-07-09: 小程序迁移路线收口

### 当前事实

- 原生小程序验证工程位于 `weapp/`，微信开发者工具可正常导入并显示首屏。
- 正式站点公开 API 与前台唱诵音频已在小程序环境跑通。
- `wx.login` 已验证可以取得 code，`wx.checkSession` 已验证可以检查微信侧会话。
- 当前缓存的 `auth_token` 仍是探针生成的 `test-token`，没有交换 Supabase session，不能访问真实用户数据。
- 现有 WebApp 登录实际使用 Supabase 邮箱和密码；`/api/auth/register` 是新用户注册接口，需要邮箱、密码和验证码，不是验证码登录接口。
- WebApp 的练习记录主要由客户端直接访问 Supabase PostgREST，并由 RLS 保护；当前没有一套完整的练习记录 CRUD 业务 API。

### 路线决策

- 继续使用原生微信小程序，不切换 Taro。
- 首版沿用现有邮箱账号体系，不建设微信身份绑定。
- 老用户使用邮箱和密码登录；新用户复用现有邮箱、密码和验证码注册流程。
- 小程序通过 Supabase Auth REST 获取和刷新 session，通过 PostgREST + RLS 访问同一份业务数据。
- 不建立微信云数据库副本，不接微信支付，不一次性复制全部 WebApp 页面。

### 三步计划

1. 真实账号接入：登录、注册、token 保存与刷新、退出和会话失效处理。
2. 只读数据：最近记录、日历、基础统计、会员状态，并验证同账号两端一致。
3. 写入闭环：新增、编辑、软删除，以及 WebApp 与小程序之间的同步、冲突、去重和失败恢复。

### 关键保护线

- 小程序只能包含公开 anon key，禁止包含 Supabase service role key、微信 AppSecret 等服务端密钥。
- “微信 session 有效”与“熬汤日记账号已登录”必须明确区分。
- 小程序直接写云端，WebApp 使用本地优先同步；第三步必须完成真实跨端回归，不能只以数据库写入成功作为验收。
- 小程序迁移期间不启动练习选项固定槽位系统。

### 文档入口

- 详细计划与验收标准：`docs/weapp/DEVELOPMENT_PLAN.md`
- 当前勾选进度：`TODO.md`

### 2026-07-09 第一刀实现：真实邮箱账号接入

- 新增 `weapp/config.js`，只包含公开站点地址、Supabase URL 和 publishable/anon key。
- 新增 `weapp/utils/request.js`，统一封装小程序请求、Supabase 请求头和错误响应。
- 新增 `weapp/services/auth.js`：
  - 邮箱密码登录；
  - 新用户验证码注册后登录；
  - session 本地持久化；
  - access token 提前刷新；
  - refresh token 轮换保存；
  - 401 后刷新恢复；
  - 退出时无论远端是否成功都清理本地会话与旧 `test-token`。
- 首页由技术探针页改为真实登录/注册页；登录后展示真实账号邮箱和会话状态。
- 新增 `npm run test:weapp`，覆盖登录保存、token 刷新、鉴权请求头和退出清理。

联网协议验证：

- 专用老账号通过 Supabase Auth REST 登录成功。
- access token 可读取当前用户身份。
- refresh token 可正常续期并返回轮换后的 session。
- 验证过程未输出邮箱、密码或 token。

下一步：在微信开发者工具和真机中验收老账号登录、重启恢复、退出与新用户验证码注册；通过后再进入只读练习数据阶段。

### 2026-07-09 登录注册协议与隐私审查

- 登录/注册页增加默认未勾选的双协议复选框。
- 未勾选时同时禁止获取验证码和提交登录/注册；按钮禁用之外另有函数级守卫。
- 点击《用户协议》或《隐私政策》打开底部弹窗，使用 `scroll-view` 阅读完整正文。
- 协议统一存放在 `weapp/content/agreements.js`，独立隐私页也读取同一数据源。
- 成功登录或注册后，本地记录协议版本、同意时间和用户 ID。
- 新增《用户协议》，补足账号、用户内容、会员、知识产权、非医疗/非教学边界和服务终止规则。
- 隐私政策删除未经证实的“服务器位于中国境内”和“定期备份”承诺，补充第三方服务、保存期限、数据权利、儿童监护人同意与重大变更重新同意。
- 详细审查：`docs/weapp/AGREEMENT_REVIEW.md`。

上线阻塞：必须确认 Supabase 实际部署地域；如存在境外处理，应按真实情况补充跨境告知和单独同意。同时在微信公众平台核对隐私保护指引。

补充主体信息：

- 用户确认小程序和公众号均为个人主体。
- 当前审核版本按用户要求暂不在协议正文展示个人登记姓名，统一表述为“微信小程序登记的个人开发者”；若审核要求再补充。
- 对外联系邮箱确认为 `519216978@qq.com`，微信为 `xiao519216978`。
- 账号安全、会员、责任边界、数据存储与删除、协议更新等重大条款已增加醒目的“重要提示”样式。

真机测试发现协议弹窗底部按钮被固定高度计算挤出屏幕。弹窗已改为 flex 纵向布局：页头和“我已阅读，返回勾选”按钮固定可见，中间正文独立滚动。

### 2026-07-09 真实登录真机通过并进入只读数据阶段

用户在微信开发者工具中使用现有 WebApp 账号 `zaohezi2020@gmail.com` 登录成功：

- 页面显示 `ACCOUNT CONNECTED`；
- 显示正确账号邮箱；
- Supabase 用户身份验证通过；
- 刷新后 session 仍保持。

随后开始第二步：

- 新增小程序练习记录服务，通过 Supabase PostgREST + RLS 读取当前账号最近 10 条未删除记录；
- 查询只选择首屏展示所需字段，不读取照片；
- 登录成功或恢复 session 后自动读取，也支持手动刷新；
- 页面覆盖加载、空数据和错误状态；
- 新增对鉴权请求头、软删除过滤、排序和数量限制的测试。

### 2026-07-09 小程序重进后 Supabase session_id 失效修复

真机重新进入小程序时出现：

`Session from session_id claim in JWT does not exist`

原因：

- 本地 session 已持久化，但 Supabase `/auth/v1/user` 判断 JWT 中的 session ID 不存在。
- Supabase 对该错误可能返回 403；原恢复逻辑只在 401 时尝试 refresh token，因此直接把英文错误显示给用户。

修复：

- 401、403、`session_id claim`、session 不存在和无效 JWT 均进入一次性 session 恢复。
- 使用本地 refresh token 换取新 access token 与轮换后的 refresh token。
- 用新 access token 重新查询用户，并保存完整新 session。
- 练习记录请求复用同一恢复判断。
- 如果 refresh token 本身也已失效，清理本地会话并显示“登录状态已过期，请重新登录”。
- 新增 403 session_id 不存在 → refresh → 用户查询成功的回归测试。

真机复验结果：修复后重新进入小程序可以保持登录，最近练习记录正常显示。真实账号持久会话闭环完成。

### 2026-07-09 小程序三 Tab 骨架与统一 UI 基础

在继续开发日历、统计前，先确定首版信息架构：

- 今日练习：承接练习类型、计时、唱诵和完成记录。
- 觉察日记：承接月历、最近记录、查看和补录。
- 我的：承接统计、会员、账号和设置。

本次实现：

- `app.json` 增加原生底部三 Tab。
- 登录页与业务页面分离；已有 session 或登录成功后 `switchTab` 进入今日练习。
- 最近练习从登录页迁入觉察日记。
- 邮箱、会员占位、统计占位和退出登录迁入我的。
- 新增 `page-auth` 守卫，三个业务 Tab 无有效 session 时统一返回登录页。
- `app.wxss` 建立三页共用的页面留白、刊头、标题、卡片、按钮和加载/错误状态样式。
- 暂不把 WebApp 的体式库放入小程序首版 Tab。
- 新增导航结构测试，防止后续把记录重新堆回登录页或意外改变三个主入口。

### 2026-07-09 小程序 UI 路线纠偏

用户明确：小程序 UI 保持网页版熬汤日记一致，不需要也不接受另一套视觉设计。

因此调整原则：

- 网页版 `/practice` 是唯一 UI 和交互设计真源。
- 原生小程序只做技术实现适配，不重新设计品牌、版式或信息层级。
- 当前三 Tab 的英文刊头、方形卡片和解释性占位文案仅用于验证路由，不作为目标 UI。
- 后续先停止堆叠日历、统计等功能，按“今日练习 → 觉察日记 → 我的 → 底部导航”的顺序对齐网页版视觉骨架，再继续功能迁移。
- 网页版有四个入口，小程序首版仍保留三个入口；体式库暂不进入底部导航，其余页面尽量保持网页版外观与操作习惯。

执行方式进一步确认：

- 不采用“先把全部静态 UI 画完，再集中接功能”的瀑布式迁移。
- 先建立全量 UI / 功能地图和公共设计系统。
- 然后按“今日练习 → 觉察日记 → 我的”逐 Tab 纵向完成：先复刻该 Tab 的网页版 UI，紧接着完成其中按钮、图标、数据和异常状态，真机验收后再进入下一个 Tab。
- 新增 `docs/weapp/UI_MIGRATION_MATRIX.md`，列出公共层、三个 Tab、每个控件的 UI 与功能状态，以及逐 Tab 完成门。

### 2026-07-09 今日练习首轮网页版 UI 迁移

- 系统默认 tabBar 改为自定义悬浮圆角导航，保留今日练习、觉察日记、我的三个入口。
- 今日练习删除杂志式英文刊头、方形卡片和解释性占位布局。
- 按网页版 `PracticeDashboard` 重建 Logo、品牌名、日期、三列圆角选项、选中渐变、今日人数、自定义虚线入口与圆形呼吸开始按钮。
- 接入真实 Supabase `practice_options` 只读查询和现有今日练习人数 API。

### 2026-07-09 小程序色阶与真实月历迁移

- 保留用户已手工调整的今日练习布局与悬浮 Tab 样式，没有整页覆盖。
- 将 WebApp `globals.css` 中的 `green-gradient`、深浅渐变与 1–4 级日历绿色提取为小程序公共样式。
- 觉察日记移除静态月历占位，改为按当前月份从 Supabase PostgREST + RLS 读取真实练习记录。
- 月历同一天有多条记录时使用最高有效 `color_level`，仅完成且非草稿的记录显示练习色阶。
- 月历加入上月、下月控制；今日使用金色描边，未来日期使用弱化文字。
- 今日练习的音频提示由字符占位替换为与 WebApp 相同语义的 Lucide Volume 图标。
- `npm run test:weapp` 通过 17 项，根项目 `npm run typecheck` 通过；真机颜色、间距和小程序 SVG data URI 表现仍需在微信开发者工具复验。

### 2026-07-09 觉察日记完整骨架对齐

- 修复日历着色逻辑：与 WebApp 一致，只要存在非草稿记录就显示绿色，不再额外要求 `duration > 0`。
- 迁入 2026 年新月/满月日期，未练习的 Moon Day 显示原站月相图片，点击显示与 Web 相同的休息提示；已练习 Moon Day 显示黄色标记。
- 月历顶部从两个翻月按钮补齐为六个：云同步、社群消息、上月、下月、日历标注、补录练习；尚未接入的动作提供轻提示，不再缺席 UI。
- 移除临时的英文刊头与“最近练习”卡片，按 WebApp 结构改为顶部留白、月历、四栏月度统计卡、当前月真实记录时光轴。
- 时光轴迁移日期、分钟、练习类型、中轴标记、突破内容和觉察正文；点击绿色日期可滚动定位对应记录。

### 2026-07-09 觉察日记写入闭环

- 日历 `+` 按钮已接入补录底部弹层，字段包含日期、练习类型、分钟、突破、觉察正文和 1–4 级日历颜色。
- 点击时光轴记录可打开同一套编辑弹层；保存后刷新当前月月历、统计和时光轴。
- 新增记录通过 Supabase PostgREST 写入当前 session 的 `user_id`；编辑仅允许更新业务白名单字段。
- 删除采用 `deleted_at` 软删除，不物理删除数据库记录；RLS 继续作为最终访问边界。
- 云同步按钮现在会重新拉取练习选项和当前月记录。
- 小程序自动化测试增加新增、更新和软删除请求校验，共 21 项通过。

### 2026-07-09 小程序游客本地模式第一阶段

- 产品决策改为“免登录打开即用；登录用于云端备份和跨设备”，不再把账号作为进入三个业务 Tab 的前置条件。
- 新增 `weapp/services/local-data.js`，使用微信 Storage 保存游客记录和默认练习选项；游客删除保留 `deleted_at` 标记。
- 新增 `weapp/services/data-repository.js`，页面只依赖统一仓库接口；当前按 Supabase session 在游客本机与登录云端之间切换。
- 登录页增加游客入口并持久记住选择；再次打开小程序时可直接进入。
- 今日练习、觉察日记移除强制登录守卫；月历、补录、编辑、色阶和删除均可操作游客记录。
- “我的”页面增加游客身份、本机记录数量和登录入口；退出账号后切回游客工作区。
- 本阶段刻意不实现游客记录合并和登录账号离线缓存，下一阶段完成；游客数据仍保留在本机，不会因登录而删除。
- `npm run test:weapp` 通过 25 项，根项目 `npm run typecheck` 通过。
- 详细文件进度、验收步骤和下一步见 `docs/weapp/LOCAL_DATA_MODE.md`。

### 2026-07-09 小程序开发路线重新收口

- 将 `docs/weapp/DEVELOPMENT_PLAN.md` 重写为唯一开发总路线，其他文档降为 UI、本地同步、协议专项说明。
- 开发顺序固定为：纯本地完整产品 → 账号本地缓存与云同步 → 会员与付费能力。
- 当前阶段只做本地版三个 Tab，并按“一个 Tab 的 UI + 功能 + 真机验收”纵向完成。
- 当前唯一下一步是今日练习本地计时闭环；已有认证和云端 CRUD 保留但冻结，不继续扩展同步。
- 总路线新增当前文件进度、UI 1:1 验收方法、本地/跨端完成门、当前测试项和明确暂不执行范围。

### 2026-07-09 今日练习本地计时闭环

- 新增 `weapp/services/practice-session.js`，活动计时使用时间戳计算，不依赖页面定时器累计，切后台后可按真实时间恢复。
- 计时状态持久保存练习类型、开始时间、累计秒数和暂停状态；重新进入今日练习时自动恢复。
- 今日练习接入全屏计时、呼吸圆环、暂停/继续、结束确认、结束并保存和放弃操作。
- 完成弹层接入突破、觉察笔记和四级日历颜色，保存后通过统一仓库创建记录并跳转觉察日记。
- 结束后尚未保存的完成状态和表单文字也会持久保存；关闭、重开后可继续填写，保存成功后才清理。
- 自定义 tabBar 在计时页、结束确认和完成弹层期间隐藏，退出流程后恢复。
- 新增计时服务测试：开始、暂停、继续、重进恢复、结束待保存和放弃；小程序自动化测试共 29 项通过，根项目类型检查通过。
- 下一步不是继续堆功能，而是在微信开发者工具完成计时闭环与网页版视觉对照测试，再接唱诵和口令联动。

### 2026-07-09 真机反馈：表单、日期选择、色阶与默认类型纠偏

- 用户指出完成练习和补录练习的表单与网页版差异明显，微信原生日期 picker 不等同于网页版自定义月历。
- 根因确认：两个入口分别手写表单，没有迁移网页版共用的 `PracticeForm`、`DatePickerModal` 和 `TypeSelectorModal`。
- 修复月历加载顺序：先加载练习类型再构建月历；记录缺少 `color_level` 时按精确类型或“类型 + 说明”前缀回退到类型默认色阶。
- 游客默认保留“一序列 Mysore”和“半序列”，加上固定口令一序列共三个可选类型；自定义入口现在可补足第三个本地类型槽位。
- 本地第三类型使用 UUID、说明和四级颜色保存，超过三个本地类型时明确拒绝。
- 自动化测试增加本地第三类型和上限验证，共 30 项通过，根项目类型检查通过。
- 当前唯一下一步改为公共练习表单组件及自定义日期/类型选择器，不再继续扩展其他功能。
- 生产表没有 `practice_options.updated_at` 字段，真实查询首次暴露 400 后已按服务端提示移除该字段。
- 修正后的第二次远程复验因工具联网额度限制未执行；本地契约测试已更新，仍需在微信开发者工具真机编译时确认真实选项。

## 2026-07-10: 标注管理器修复尝试（乐观更新 + CSS）— 放弃

### 背景

用户反馈标注管理器两个问题：
1. **CSS 布局**：颜色选择圆圈选中时 box-shadow 被容器边缘截断、圆圈行不居中、"名称"输入框溢出画面。
2. **核心功能**：创建标注类型后，类型网格不显示新类型，无法选择类型点击日期标注。

此前已尝试过三种修复方案（types 属性观测器 → selectComponent 回调 → saveVersion 属性观测器），均未成功。

### 修复尝试：乐观更新

第四种方案放弃依赖父级异步回调，改由组件直接修改自己的 types 数据。

**改动内容**：

- `weapp/components/annotation-manager/index.js`：
  - `confirmCreate()` — 立即插入带临时 ID 的乐观类型到本地列表，state 回 showMode: 'main'，同步触发 parent event
  - `confirmEdit()` — 立即修改本地 types 中匹配项，state 回 main
  - `confirmDelete()` — 立即从本地 types 中移除，state 回 main
  - 移除 `saveVersion` property 和 observer
  - 移除 `isSaving` 数据字段及相关逻辑

- `weapp/components/annotation-manager/index.wxss`：
  - `.ann-color-grid`: padding 4rpx → 8rpx（给 box-shadow 留空间）
  - `.ann-form-scroll`: 左右 padding 40rpx → 32rpx（防止输入框溢出）

- `weapp/pages/journal/journal.js` / `.wxml`：移除所有 `annotationSaveVersion` 数据字段、递增逻辑和 WXML 绑定

- `weapp/tests/annotations.test.js`：新增 12 项测试覆盖完整 CRUD、幂等性、月标注地图、颜色查询和导出

### 验证结果

- `npm.cmd run test:weapp` → 59 项全部通过（12 项新增 + 47 项已有）
- 但微信开发者工具中标注管理器仍然不显示新类型

### 结论

**放弃修复**。根因判定为 `triggerEvent` → parent async handler（dataRepository.createAnnotationType → await loadAnnotationTypes 更新 annotationTypes property）→ WeChat 组件 property binding 更新之间的时序问题无法可靠解决。乐观更新可以让组件内立即看见新类型，但 WeChat 的 property 绑定机制似乎会在一轮 setData 后覆盖组件内的临时状态，导致乐观数据不生效。

将此事登记为 TODO 中的长期已知问题，待后续找到更可靠的小程序组件状态管理方案后再处理。

## 2026-07-16 - 小程序新账号教程连续性与真实会员状态

### 实现结果

- 新注册账号进入账号模式时，会把游客教程复制到该账号独立的本机工作区；教程仍不上传、不导出、不计入真实练习统计。
- 对已经注册但错过注册回调的新账号增加一次恢复路径：账号创建 24 小时内首次读取会补回游客教程，即使已经新增真实记录也不会漏掉。
- 账号云端刷新会保留本机教程及其软删除标记；教程编辑和删除不建立 pending operation，用户主动删除后不会被后续空云端刷新复活。
- 新增 `weapp/services/membership.js`，用 Supabase access token 请求 `/api/membership/status`，会话失效时刷新并重试。
- “我的”主屏和“设置 → 会员”接入真实 FREE/PRO、会员类型、到期日和剩余天数；有效会员入口显示“续费 Pro 会员”。
- 注册接口的试用赠送异常由空 `catch` 改为服务端错误日志，便于以后直接定位赠送失败。

### 文件进度

- `weapp/services/account-workspace.js`：保留教程与删除 tombstone。
- `weapp/services/data-repository.js`：教程恢复、本机专用编辑/删除、统计隔离。
- `weapp/components/auth-modal/index.js`、`weapp/pages/index/index.js`：注册成功教程连续性接线。
- `weapp/services/membership.js`：真实会员状态服务。
- `weapp/pages/profile/profile.js`、`profile.wxml`、`profile.wxss`：真实会员 UI。
- `app/api/auth/register/route.ts`：试用赠送失败日志。
- `weapp/tests/account-workspace.test.js`、`auth.test.js`、`navigation.test.js`：新增回归保护。

### 验证与下一步

- `npm.cmd run test:weapp`：109/109 通过。
- `npx.cmd vitest run __tests__/api-auth-routes.test.ts`：36/36 通过。
- `npm.cmd run typecheck`：通过。
- `npm.cmd run lint`：通过。
- 微信开发者工具下一步核对：当前测试账号重新编译后出现一条教程；“我的”显示 PRO；会员页显示 trial、到期日和约 31 天；教程删除后刷新不复活。
- 验收通过后接 `/api/membership/activate`，再建立统一 FREE/PRO 能力策略。

## 2026-07-17 - 小程序照片上传改为表单内即时完成

### 根因

小程序此前在选图时只保存微信本机路径，真正的 OSS 上传要等记录保存后由觉察日记后台同步，因此表单一直显示“待上传”，保存后主页面仍长时间 loading。网页版会先创建草稿，选图后立即上传，保存只完成草稿；两端时机不同造成了明显体验差异。

### 实现

- 公共表单移除重复添加方框；3 张以内为三列 1:1，更多照片用固定方图横向滚动。
- 数据仓库新增 `uploadRecordPhotos()`：保证草稿已同步后上传，按网页版每批并发 2 张，成功即把本机路径替换为 OSS HTTPS URL。
- 每张照片具备读取、上传、成功、失败状态；失败任务保留在账号队列与运行日志中，可在表单点击重试。
- 补录创建可清理草稿；完成练习草稿 ID 持久化，重启后不会重复建草稿；编辑复用原记录。
- 上传未完成时公共表单禁止保存，觉察日记也禁止关闭表单；完成练习草稿建立期间禁止抢先保存，消除重复记录竞态。
- 上传使用页面现有会员能力，避免重复请求会员状态造成额外延迟；服务端照片数量和文件大小限制仍保留最终校验。

### 文件与验证

- 代码：`weapp/components/practice-record-form/`、`weapp/services/data-repository.js`、`weapp/pages/journal/`、`weapp/pages/practice/`。
- 测试：`weapp/tests/practice-record-form.test.js`、`membership-ui.test.js`、`account-workspace.test.js`。
- `node --check` 全部通过；`npm.cmd run test:weapp` 137/137 通过。

### 下一步

在微信开发者工具和真机一次性验收 3 张网格、4～9 张横滑、逐张上传状态、保存锁定、失败重试以及保存后觉察日记立即显示；验收通过后回到总路线中的“我的”页剩余资料/修改密码功能。

## 2026-07-17 - 小程序会员限制统一与网页版提示 UI 复刻

### 真源审计

- 会员提示真源：`components/Membership/MembershipPromptModal.tsx`、`MembershipCard.tsx`。
- 锁定态真源：`components/practice/PracticeDashboard.tsx`、`OptionModals.tsx`、`PracticeForm.tsx`、`CalendarAnnotation/AnnotationManagerModal.tsx`。
- 唱诵限制真源：`components/practice/PracticeModalHost.tsx`。
- 确认权益仍为：照片 1/9 张、单张 5/30 MB、选项 3/11、标注 1/9、颜色 1/4、唱诵倒计时固定 1 分钟/自定义。

### 实现

- 新增公共小程序会员 Sheet，两个主业务页共用同一组件和 reason 文案。
- 将练习页、日记页散落的 `wx.showModal` 会员提示替换为真源底部 Sheet。
- FREE 照片超量整批拒绝后直接显示会员 Sheet；Pro 超过剩余额度仍显示普通数量错误，不误导升级。
- 全部锁定态用从 Lucide 真源复制的 Crown/Lock SVG，不再显示自造 PRO 字样。
- 升级入口写入一次性页面意图并切到 Profile，Profile 自动打开会员设置分区。
- 未接支付和激活码；会员 Sheet 保留真实价格/UI，按钮说明为小程序支付后自动开通。

### 文件与验证

- 新增：`weapp/components/membership-prompt/`、三个 `membership-*.svg` 包内素材。
- 修改：`weapp/pages/practice/`、`weapp/pages/journal/`、`weapp/pages/profile/profile.js`、公共练习表单、标注管理器和会员 UI 测试。
- `node --check` 通过。
- `npm.cmd run test:weapp`：140/140 通过。

### 下一步

微信开发者工具和真机一次性验收 FREE 五个可见限制入口、Pro 全额度和降级保留数据；通过后开发“我的”页剩余头像/资料/修改密码功能。

## 2026-07-17 - 小程序账号资料闭环：头像上传与真实修改密码

### 真源核对

- 头像与资料保存：`components/settings/SettingsModal.tsx`。
- 修改密码：`components/AccountBindingSection.tsx`。
- 保留平台差异：小程序用 `wx.chooseMedia`、`wx.compressImage` 和现有 OSS 签名接口；字段、校验、状态反馈和视觉层级对齐网页版。

### 实现

- `photo-storage.uploadAvatar()` 复用 OSS 签名和 PUT 上传，但不创建练习照片元数据，避免头像污染照片表。
- `user-profile` 不再强制丢弃 `avatar`；`data-repository` 读取账号资料时以云端头像为准，本机缓存只作为离线回退。
- Profile 头像入口支持登录判断、5MB 校验、压缩、上传、保存、加载遮罩和失败反馈；相机按钮保持在头像圆形外侧。
- `auth.changePassword()` 先用邮箱和当前密码取得新会话，再带 Bearer token 更新 Supabase Auth 密码。
- 修改密码弹窗加入完整字段、动态强度规则、错误提示、防重复提交和成功后关闭。
- 资料保存按钮加入提交中状态，保留姓名、签名和过往练习校准数据的一次性保存。

### 文件与验证

- 服务：`weapp/services/photo-storage.js`、`user-profile.js`、`data-repository.js`、`auth.js`。
- 页面：`weapp/pages/profile/profile.js|wxml|wxss`。
- 测试：`auth.test.js`、`photo-storage.test.js`、`account-workspace.test.js`、`account-sync-ui.test.js`、`navigation.test.js`。
- 语法与差异检查通过；`npm.cmd run test:weapp` 144/144 通过。

### 下一步

先真机验收头像跨刷新/跨设备读取和修改密码重新登录，再进入分享卡照片、长文自适应、滚动缩放与高清导出；音频首播性能和支付分别放到后续独立轮次。

## 2026-07-20 - 密码规则前置校验与 Gmail 投递排查

- 根因一：公共认证组件的注册第一步只校验邮箱和协议，未在调用 `sendRegisterCode()` 前执行已有的 `validatePassword()`；现已前置，错误密码不再触发邮件接口。
- 补充确认：用户实际测试的是登录表单“忘记密码？”，确实应该发送邮件；此前将其判断为已登录改密是错误的，现已纠正。
- 修改密码的组合错误拆成具体提示：缺字母提示“密码必须包含字母”，缺数字提示“密码必须包含数字”。
- 通过 Gmail 全邮箱检索确认连接账号为 `zaohezi2020@gmail.com`；用户反馈时确实没有重置密码邮件。
- 初次用 Windows `curl.exe --data-raw` 直接嵌 JSON 的测试被 PowerShell 改写双引号，因此产生的 HTTP 500 是无效请求体导致的诊断误差；随后改用 JSON 文件消除此变量。
- 数据库临时写入/删除诊断成功，表结构未损坏；本地服务端改为用 Service Role 处理验证码查询、写入和清理，并记录未预期异常。
- `a041193b` 推到 `master2` 后只生成 Preview；随后从干净 `origin/master` worktree cherry-pick 为 `bb9ea5af`，相对生产分支只修改验证码接口一个文件，并完成 Vercel Production 部署。
- 生产复验返回 HTTP 200 和 Resend `delivery_id=9383a340-752f-412a-9110-63d2e3a10e55`；Gmail 同秒收到重置密码验证码，位于 Inbox。
- 文件：`weapp/components/auth-modal/index.js`、`weapp/pages/profile/profile.js`、`weapp/tests/account-sync-ui.test.js`、`app/api/auth/send-verification-code/route.ts`、`__tests__/api-auth-routes.test.ts`。
- 验证：TypeScript、`git diff --check` 通过；API 路由 37/37、小程序 145/145 通过。

### 下一步

忘记密码生产闭环已完成，继续既定分享卡路线。后续生产热修复继续使用干净 `master` worktree，禁止从主脏工作区整包部署。

## 2026-07-27 - 小程序切换个体工商户主体与新 AppID

- 新主体确认为“广州市番禺区车棚与四月信息技术部（个体工商户）”，新 AppID 为 `wx36f4826bc022d43f`。
- `weapp/project.config.json` 已从旧个人主体 AppID 切换到新 AppID。
- 当前认证仍为邮箱密码 + Supabase Auth，代码未使用 `wx.login`，因此 AppSecret 当前不参与账号或同步功能；AppSecret 继续禁止进入客户端和仓库。
- 用户协议与隐私政策已更新运营主体和版本日期，会员条款移除激活码旧口径，保留未来微信支付成功后自动开通/续费的路线。
- 新增 `weapp/tests/appid-migration.test.js`，保护新 AppID 并检查小程序公开配置不包含 AppSecret。
- 新增 `docs/weapp/APPID_MIGRATION.md`，记录新旧 AppID Storage 隔离、游客数据迁移、合法域名、隐私指引和支付前置。

### 下一步

使用新 AppID 重新导入微信开发者工具，在公众平台重配合法域名和用户隐私保护指引；完成新 AppID 下游客冷启动、旧邮箱账号恢复、照片、口令音频和相册保存最小真机回归后，再恢复非支付集中收口。

## 2026-07-27 - 非支付功能集中收口

- 用户已在微信开发者工具确认工程显示新 AppID；本地代码工程不重建。
- 删除 `weapp/pages/profile/profile.js` 中无任何页面入口的 `placeholderAction`，清除最后一处“功能下一步接入”运行时死代码。
- `weapp/tests/navigation.test.js` 增加防回归断言，禁止占位处理器重新进入“我的”页。
- 新增 `docs/weapp/NON_PAYMENT_ACCEPTANCE.md`，将游客、FREE、PRO、离线同步、照片、分享卡、口令音频、认证和数据管理整理成一次性真机验收门。
- 验证：小程序自动化 158/158、TypeScript、lint 和 `git diff --check` 全部通过。

### 下一步

在新 AppID 下完成非支付集中真机验收。通过后冻结非支付功能，只开发微信支付与服务端自动开通/续费，最后执行提审回归。

## 2026-08-13 - 小程序首次提审提交（1.0.0）

- 首次提审版本 1.0.0 已上传微信公众平台，等待审核。
- 提审排雷（对照 reject.html 全量自查，唯一实质缺口已补）：
  - 内容过滤 3.2.11：本地敏感词过滤，小程序 + 网页共用词库，接入日记/备注/自定义练习类型/标注标签保存。
  - 审核账号 zaohezi2020@gmail.com + Pro 开通 SQL（supabase/grant_review_account_pro.sql）。
  - 订单中心页 pages/orders/orders（交易类小程序硬性要求）。
  - 日记页联系入口去小红书、改「联系作者」，只留微信（components/contact-author）。
  - 隐私保护指引按实际采集完整填写（含 Supabase 孟买跨境告知已在隐私政策体现）。
- 两笔 ¥19.8 测试款（沙箱 + 现网）均已原路退款。
- 代码包体检「图片和音频资源」为建议项未通过（主包媒体约 390KB），不阻塞审核，后续可挪 CDN 优化。
- 验证：小程序测试 238/238、web vitest、typecheck、发布门禁全部通过。

## 2026-09-04 - Sharath Jois 口令双版本与跨端播放闭环 ✅

- 网页与小程序的固定“一序列”口令支持两个版本：老掌门人仍为默认版；双击按钮打开可上下滚动的版本选择弹窗，可切换到 Sharath Jois 版并持久化选择。
- Sharath 使用完整口令音轨，不从 `42:07` 裁剪；最终 M4A 为 AAC 双声道，时长 `5380.806` 秒（约 `89:41`）。两版复用同一套加载、播放、暂停、跳转、锁屏后台播放与结束逻辑，缓存按版本隔离。
- 首次加载保留心理安慰型进度条：平滑运行到 99%，成功后完成；不显示帧数，也不伪装为真实字节下载进度。缓存清理和播放错误日志同步增强。
- 小程序首次真机播放提示“当前无法播放”。根因不是微信播放器或合法域名，而是 Vercel 将 Git LFS 的 133 字节文本指针作为 `audio/mp4` 发布；故障响应为 `Content-Range: bytes 0-132/133`，正文以 Git LFS 版本声明开头。
- 修复将生产 Git 对象替换为真实 `32,273,838` 字节 M4A，并移除该文件的 LFS 规则；新增静态资源门禁，检查文件大小、`ftyp` 文件头和 `.gitattributes`，避免本机自动还原成功掩盖部署端指针问题。
- 小程序音频 URL 升级为 `v=20260904`，缓存版本升级为 `20260904-v2`，完整文件有效门槛调整为 30MB，旧失败缓存无需用户手动清理。
- 发布提交：`master2` 为 `a2970dd4`，生产 `master` 为 `742a8fa5`。Vercel 部署后线上 Range 响应总大小为 `32,273,838`，完整下载 SHA-256 为 `88d0c8c96ecc611567f3d97a7e53ab00a76598402133fed8b4dd188d62811b1d`。
- 验证：小程序完整自动化 `261/261`；网页 `master2` 全量 `603/603`；生产基线音频专项 `28/28`。用户随后完成小程序真机播放，确认没有问题。
