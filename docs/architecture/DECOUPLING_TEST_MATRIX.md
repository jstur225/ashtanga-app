# 解耦自动化测试矩阵

状态：`已覆盖` / `部分覆盖` / `缺失` / `阻塞` / `不适用`。

测试层级：L1 纯函数、L2 组件、L3 Hook/适配器集成、L4 隔离浏览器、L5 测试云端冒烟。

## 当前覆盖概览

当前自动化基线：49 个 Vitest 测试文件、535 项测试通过；L4 隔离浏览器 51/51 通过、0 skipped（2026-06-26，会员激活 API 对口测试补齐后）。

| 领域 | 当前状态 | 主要缺口 | 计划阶段 |
|---|---|---|---|
| 统计与日记纯函数 | 已覆盖 | 边界与时区补充 | 1 |
| 完成练习/设置组件 | 部分覆盖 | 重复提交、父子弹窗、错误恢复 | 1–2 |
| 练习会话 | 已覆盖 | 锁屏/移动端后台可继续扩大设备覆盖 | 2 |
| 音频/唱诵 | 已覆盖核心链路 | 后台刷新恢复可继续扩展 | 3 |
| Tab/页面编排 | 已覆盖核心链路 | L5 真实云端仍需 `.env.test` | 4 |
| 同步 | 已覆盖核心链路 | L5 真实云端仍需 `.env.test` | 5 |
| Auth/API/照片 | 已覆盖核心链路 | 真实邮件/云端冒烟需专用环境 | 6 |

## 阶段 1：UI 与工具

| 场景 | 层级 | 状态 |
|---|---|---|
| 日期边界、跨月、未来日期、时区 | L1/L2 | 部分覆盖（本地日期、跨月、未来上限已覆盖；多时区待补） |
| 时长 0 秒、秒数、整分钟、超长练习 | L1 | 已覆盖 |
| 自定义选项空值、重名、上限、重复点击 | L2 | 部分覆盖（空值、长度、上限已覆盖） |
| 免费/Pro 色阶与锁定选项 | L1/L2 | 已覆盖 |
| 编辑、删除、取消删除、弹窗关闭 | L2 | 已覆盖 |
| 子弹窗打开时父弹窗不关闭 | L2/L4 | 已覆盖（ISSUE-001 回归测试） |
| 键盘与禁用状态 | L2 | 部分覆盖（禁用已覆盖，完整键盘/焦点待补） |

## 阶段 2：练习会话

| 场景 | 层级 | 状态 |
|---|---|---|
| 开始、暂停、恢复、结束、保存、放弃 | L3/L4 | 已覆盖（浏览器已覆盖至放弃；保存数据流由 CompletionSheet 覆盖；L4 全量 39 项通过） |
| 连续开始/保存幂等 | L3 | 已覆盖 |
| 多次暂停累计 | L1/L3 | 已覆盖 |
| 刷新、后台、锁屏恢复 | L3/L4 | 已覆盖（L3 状态机 + L4 浏览器覆盖运行中刷新/暂停中刷新/多次刷新，均无 hydration 错误；锁屏使用时间戳模型） |
| LocalStorage 缺失/损坏/部分字段 | L3 | 已覆盖（缺失使用默认值，非法 JSON 安全回退，损坏数值归一化） |
| 0 分钟与短时确认 | L2/L3 | 部分覆盖 |
| 保存失败恢复与重试 | L3 | 已覆盖 |
| 草稿创建、转正、删除失败 | L3 | 部分覆盖（删除失败补偿已覆盖，完整生命周期待补） |
| 跨天、设备时间变化、负数保护 | L1/L3 | 已覆盖 |
| 完成后切换日记 | L4 | 已覆盖（临时回归） |

## 阶段 3：媒体

| 场景 | 层级 | 状态 |
|---|---|---|
| 网络加载、缓存命中/失败、网络失败 | L3 | 已覆盖 |
| 加载中重复点击 | L3 | 已覆盖 |
| 播放、暂停、恢复、快进/后退边界 | L1/L3 | 已覆盖 |
| 结束复位与卸载资源释放 | L3 | 已覆盖 |
| 后台恢复进度 | L3/L4 | 缺失 |
| 唱诵倒计时、跳过、取消、结束 | L3 | 已覆盖；L4 已覆盖倒计时和跳过 |
| 唱诵结束只启动一次练习 | L3 | 已覆盖 |
| 音频失败不阻塞普通计时 | L3/L4 | 已覆盖（唱诵与口令 L4；口令失败仍可暂停、继续、结束） |
| 媒体模式切换不串状态 | L3/L4 | 已覆盖（唱诵/口令互斥，口令独立启动状态） |

## 阶段 4：页面与动态加载

| 场景 | 层级 | 状态 |
|---|---|---|
| 四个 Tab 双向/快速切换 | L2/L4 | 已覆盖基础切换；快速切换待补 |
| Dashboard 选项选择、锁定提示与开始门槛 | L2/L4 | 已覆盖（组件行为 + 生产开始/退出链路） |
| SessionView 普通计时、唱诵倒计时与口令控制 | L2/L4 | 已覆盖（组件状态矩阵 + 普通/失败降级生产链路） |
| 三步清空数据与唱诵设置 | L2/L4 | 已覆盖（状态转换、数值边界、嵌套层级与生产取消链路） |
| 独立弹窗宿主归属与父子切换 | L2/L4 | 已覆盖（源码约束 + 自定义/会员、设置/清空、设置/Auth 生产链路） |
| 首屏 JS 测量与分析 SDK 懒加载 | L1/L4 | 已覆盖（源码约束、双次基线复测、生产开始/放弃链路） |
| 调试日志采集与失败降级 | L1/L3 | 已覆盖（练习/同步摘要、未登录会员、照片日志、JSON 序列化、页面归属约束） |
| 记录/选项命令与会员门槛 | L1/L3/L4 | 已覆盖（色阶、锁定名额、删除失败补偿、同步触发；生产选择/自定义弹窗） |
| 动态模块 loading/success/error | L2/L4 | 已覆盖（DynamicTabShell error boundary + 重试按钮） |
| Tab 滚动与内部状态保持 | L4 | 已覆盖（`__tests__/L4/tab.spec.ts`：切走再切回 scrollTop 保持） |
| 弹窗打开隐藏导航、关闭恢复 | L2/L4 | 已覆盖（组件策略 + 自定义练习生产回归） |
| URL 参数、返回、刷新、深链接 | L4 | 已覆盖（`__tests__/L4/deep-link.spec.ts` 深链接有效/非法值/空值/刷新 hydration；`__tests__/L4/url-state.spec.ts` 浏览器返回/前进 hydration；`__tests__/L4/visibility.spec.ts` 后台暂停/前台恢复） |
| 日记 CRUD、分享、月份切换 | L2/L4 | 部分覆盖（L2 已覆盖渲染、编辑、分享、补录交互；L4 待补） |
| 统计空态/历史数据/会员入口 | L2/L4 | 已覆盖（L2 空态、统计数据、免费/Pro 会员标签、升级入口、设置按钮） |
| 设置四分区与数据管理 | L2/L4 | 部分覆盖 |
| 导入合法/非法、导出、三步清空 | L2/L4 | 已覆盖（导入导出 45 项纯函数+组件测试；三步清空已在 practice-modal-host 覆盖） |
| 移动端遮挡与溢出 | L4 | 部分覆盖 |

## 阶段 5：同步

| 场景组 | 层级 | 状态 |
|---|---|---|
| 本地/云端空、仅一端新增或更新 | L1/L3 | 部分覆盖 |
| 两端修改不同/相同记录 | L1/L3 | 部分覆盖 |
| remote/local/merge 策略 | L1/L3 | 部分覆盖 |
| profile/options/records 独立变化 | L1/L3 | 部分覆盖 |
| 字段映射与照片四种输入 | L1 | 已覆盖（`__tests__/sync-mappers.test.ts` 覆盖 photos 数组/JSON 字符串/null/undefined/对象/数字/混合类型；profile 缺失/空对象/数字名脏数据/默认值；record photos 解析与字段保留；option 三种有效/无效组合） |
| 草稿、软删除、孤立记录 | L1/L3 | L1 已覆盖（`practice-commands.test.tsx` 6 项 handleDeleteRecord 同步路径：已登录成功、skipConfirm false/true、草稿删除、远端失败、未登录、远端异常） |
| 1000 条限制与排序 | L1/L3 | L1+L3 已覆盖（L1: `sortAndLimitRecords` 排序/边界/不可变性 6 项；L3: `__tests__/sync-limit-integration.test.ts` 5 项 — 通过 `useSync.uploadLocalData` 验证 1001/1002/1000/500/0 条记录实际上传数量与排除最旧记录的真实行为） |
| 超时、重试、部分失败恢复 | L1/L3 | 部分覆盖（`withRetry` + batch 每批重试 + autoSync 顶层重试 + 失败 ID 持久化；`__tests__/sync-retry.test.ts` 10 项 + `sync-upload.test.ts` 4 项） |
| 重复/并发同步锁 | L3 | 部分覆盖（`pendingSyncRef` 排队补调，不再静默丢弃；已有 `isSyncingRef` 防止重复） |
| 损坏本地数据和异常远端响应 | L1/L3 | 部分覆盖（`isValidRemoteRecord` / `isValidRemoteOption` 双重过滤 + `mapRemoteRecord` 安全 fallback + `fetchCloudRecordsForMerge` 返回过滤 + profile 上传 JSON 格式校验 + `applySafeMerge` 7 项 L1） |
| 用户隔离与未登录禁止上传 | L3/L5 | L3 已覆盖（`__tests__/sync-isolation-and-rollback.test.ts` 4 项：未登录 user=null/undefined 调 uploadLocalData 必须拒绝；L5 等下一阶段补） |
| 删除的本地成功/云端失败补偿 | L3/L5 | L3 已覆盖（`__tests__/sync-isolation-and-rollback.test.ts` 2 项：resolveConflict('local') repoDeleteAllUserOptions 失败 / upsert 失败 都应 setSyncStatus('error')） |
| 日志数量、大小、敏感信息过滤 | L1/L3 | L1 已覆盖（`trimSyncLogs` 4 项：单条、50 条上限、100KB 截断、空列表兜底） |
| profile/options/records 独立变化 | L1/L3 | L1 已覆盖（`detectOptionChanges` 5 项 + `detectProfileChanges` 8 项：相同、单边、内容变化、时间戳比较） |
| 测试账号真实上传/下载/冲突 | L5 | 已跑通（`npm.cmd run test:L5`：3 文件 / 8 项通过）；基础设施与说明见 `vitest.config.e2e.mjs`、`__tests__/L5/`、`scripts/reset-test-account.ts`、`.env.test.example`、`docs/guides/L5_TESTING.md` |

## 阶段 6：跨模块

| 场景 | 层级 | 状态 |
|---|---|---|
| 登录/注册/忘记密码状态与错误 | L2/L3 | L2 已覆盖（`__tests__/auth-modal.test.tsx` 21 项：login/register/forgot-password 三模式渲染、模式切换、关闭、密码强度验证、登录成功/失败/网络错误翻译、注册步骤1→2 流转、忘记密码邮箱空/验证码长度错误） |
| 照片上传/删除失败恢复与上限 | L1/L2/L3 | 已覆盖（`__tests__/oss-utils.test.ts` 12 项 validatePhotoFile + ERROR_MESSAGES；`__tests__/photo-logger.test.ts` 13 项 add/get/clear/filter；`__tests__/oss-network.test.ts` 10 项 savePhotoMetadata/getPresignedUrl/uploadToOSS 成功与网络异常） |
| 旧版本导入兼容 | L1/L3 | L1 已覆盖（`__tests__/import-export-utils.test.ts` 17 项：旧 records 缺 updated_at/photos 为字符串、旧 profile 含 is_pro、旧 options 含 label_zh、斜杠/ISO/混合日期格式排序、真实旧版数据胶囊端到端） |
| 教程记录与真实记录隔离 | L1/L3 | 已覆盖（`__tests__/tutorial-record.test.ts` 9 项：serializeExportData 过滤 is_tutorial、不凭 tutorial- 前缀误过滤、保留普通记录；diffRecords/sortAndLimitRecords/applySafeMerge 保持纯函数不感知 is_tutorial；prepareRecordsForSafeUpload 上传前过滤；旧 tutorial- 前缀一次性迁移契约） |
| API 输入、未授权、异常、幂等 | L3 | 已覆盖（`__tests__/api-auth-routes.test.ts`：register / verify-code / reset-password / send-verification-code 输入验证、异常与幂等；membership activate 覆盖未登录、输入错误、激活码状态、新开通写入/消费与续费累加；reset-password 已强制消费 reset code，send-verification-code 已加 60s 限频，相关测试已从 `EXPOSES GAP` 改为 `VERIFIES FIX`） |
| 免费/Pro 色阶与降级 | L1 | 已覆盖（`__tests__/option-color-level.test.ts` 16 项：getEffectiveOptionColor Pro 保留/免费降级 1→3/4→3、getColorClass 四色阶映射） |
| 无障碍名称、键盘、焦点恢复 | L2/L4 | L2 已覆盖（`__tests__/auth-modal-accessibility.test.tsx` 9 项：X 关闭按钮 aria-label、Esc 键关闭、submit 按钮、Tab 聚焦、required/minLength 验证） |

## 规则

- 每次修复回归必须留下永久测试。
- 新模块所有公共操作和错误分支必须有测试。
- 状态机每条合法转换必须覆盖。
- 无法自动化的项目必须记录原因、风险和人工验证方法。
- 测试数量不是完成标准，矩阵中的高风险缺口清零才是。
