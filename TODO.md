# 待处理问题

目前没有待处理的问题 ✅

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
