# 微信小程序开发日志 — 熬汤日记

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
