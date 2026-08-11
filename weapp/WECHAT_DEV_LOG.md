# 微信小程序开发日志 — 熬汤日记

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
