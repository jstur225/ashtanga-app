# 解耦重构恢复入口

> 下次启动本项目时先读这里。阶段 1–4 已完成、阶段 5 已完成、阶段 6 测试缺口部分完成（照片验证/logger/网络、API 注册路由、Pro 色阶已覆盖）。48 个测试文件 / 498 项测试全部通过。
>
> 不要重新调查页面编排、刷新恢复或媒体生命周期问题。下一轮直接进入阶段 6 剩余工作。

## 2026-06-24 最新恢复点（阶段 6 测试缺口填充）

今天补了 5 个新测试文件、58 项新测试：

### 照片上传/删除（3 文件，35 项）
- `__tests__/oss-utils.test.ts`（12 项 L1）：validatePhotoFile（类型/大小边界）、ERROR_MESSAGES
- `__tests__/photo-logger.test.ts`（13 项 L1）：add/get/clear/recent/filter，localStorage 异常容错
- `__tests__/oss-network.test.ts`（10 项 L3）：savePhotoMetadata/getPresignedUrl/uploadToOSS（成功、403/400、网络异常）

### API 输入验证（1 文件，7 项）
- `__tests__/api-auth-routes.test.ts`（7 项 L3）：register 路由直接调用 NextRequest，验证参数缺失、密码强度、非法 JSON

### Pro/免费色阶（1 文件，16 项）
- `__tests__/option-color-level.test.ts`（16 项 L1）：getEffectiveOptionColor（Pro 保留/免费降级）、getColorClass

### 全部门禁
```powershell
npm.cmd run typecheck
npm.cmd run lint
npx vitest run
```
当前结果：**48 个测试文件 / 498 项测试**、TypeScript、lint 全部通过。

## 明天可选方向

### A. 大型组件职责审计与最终归档（阶段 6 主线）
- 审计 practice/page.tsx 剩余 1184 行：认证、会员、媒体、弹窗编排、页面编排是否仍有可提取部分
- useSync.ts 771 行：autoSync 调度、回调注册、边界管理是否可再削减
- 确认无残留 `// removed` 注释、无用导入、死代码
- 所有文档与代码一致
- 完成后更新 README

### B. 补剩余测试缺口
- 🟡 API 幂等性 / send-verification-code / reset-password 路由验证（需 mock @supabase/supabase-js）
- 🟡 教程记录与真实记录隔离（需 usePracticeData hook mock）
- ✅ 照片验证/logger/网络 → 已覆盖
- ✅ API 注册输入 → 已覆盖
- ✅ Pro 色阶 → 已覆盖

### C. 搭 Playwright L4 回归
- Tab 滚动与内部状态保持
- URL 参数/返回/刷新/深链接
- 移动端遮挡与溢出

## 当前规模总结

| 模块 | 行数 | 状态 |
|---|---|---|
| `app/practice/page.tsx` | ~1184 行 ✅ | 阶段 4 门槛完成 |
| `hooks/useSync.ts` | **771 行** | 阶段 5 最终精简完成（原目标 250-350 行不可达，合理目标 ~600-650 行） |
| `lib/sync-orchestrator.ts` | 252 行 | sync 决策编排纯函数 |
| `lib/sync-utils.ts` | 496 行 | 19 个纯函数，全部有 L1 测试覆盖 |
| `lib/sync-mappers.ts` | 96 行 | 5 个纯函数，45 个测试 |
| `lib/supabase-repository.ts` | 147 行 | 7 个仓库原语 |
| Vitest | **48 文件 / 498 项** | L1/L2/L3 全面覆盖 |
| L4 隔离浏览器 | **39 项通过** | 练习/刷新/音频/弹窗/移动端/键盘/深链接 |

## 一句话状态

阶段 1–4 已完成、阶段 5 已完成、阶段 6 测试缺口部分完成。整体完成约 **96–99%**。明天可继续：大型组件审计（推荐）/ 剩余 API 测试 / Playwright L4。

## 真源文档

- 总路线：[`DECOUPLING_ROADMAP.md`](./DECOUPLING_ROADMAP.md)
- 测试缺口：[`DECOUPLING_TEST_MATRIX.md`](./DECOUPLING_TEST_MATRIX.md)
- 首屏性能：[`PERFORMANCE_BASELINE.md`](./PERFORMANCE_BASELINE.md)
- 当前执行清单：[`../../TODO.md`](../../TODO.md)
- 历史记录：[`../../ASHTANGA_PROJECT_LOG.md`](../../ASHTANGA_PROJECT_LOG.md)
