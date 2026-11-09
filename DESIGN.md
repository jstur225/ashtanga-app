# Design System — 熬汤日记

> **源：** 从 WebApp 实际代码（`app/globals.css` + `app/page.tsx` + 组件）抽取，DESIGN.md 第二版。
> **覆盖范围：** WebApp（Next.js + Tailwind v4）与微信小程序共享同一套色板。

## Product Context

- **What this is:** 阿斯汤加瑜伽练习记录工具，专注打卡和身体觉察
- **Who it's for:** 阿斯汤加练习者（有练习经验的人群）
- **Space/industry:** 健康/运动/瑜伽记录类应用
- **Project type:** 移动端优先的 Web PWA + 微信小程序

## Aesthetic Direction

- **Direction:** 禅意新中式 (Zen Neo-Chinese)
- **Decoration level:** intentional (有意图的简约，纸质纹理、微妙渐变)
- **Mood:** 温暖、沉静、专注。像一本手写的练习日记，有温度但不喧嚣。
- **Design Philosophy:**
  - 宋体禅意 — 用衬线字体传达传统瑜伽的文化感
  - 自然质感 — 纸张纹理、植物绿色、微妙阴影
  - 呼吸感 — 动画节奏模拟瑜伽呼吸，不急促不突兀

## Typography

### Font Stack

| Role | Font | Fallback | Usage |
|------|------|----------|-------|
| **Display/Hero** | Playfair Display | serif | 大标题、品牌展示 |
| **Body** | Noto Serif SC / Songti SC | STSong, SimSun, serif | 正文、觉察笔记、所有中文内容 |
| **UI/Labels** | (same as Body) | serif | WebApp 全站统一宋体，无无衬线体 |
| **Mini-Program** | system-ui | -apple-system, sans-serif | 微信小程序默认系统字体 |

> WebApp 使用 Songti SC 全局字体（`globals.css` 中 `--font-sans`、`--font-serif`、`--font-playfair` 全部指向宋体）。小程序因平台限制使用系统字体。

### Typography Scale

| Level | WebApp (Tailwind) | Mini-Program (rpx) | Usage |
|-------|-------------------|-------------------|-------|
| Hero | text-5xl ~ text-6xl | 54rpx | 页面主标题 |
| Heading | text-xl ~ text-2xl | 34~44rpx | 卡片标题、章节标题 |
| Body | text-sm ~ text-base | 24~28rpx | 正文内容 |
| Caption | text-[10px] ~ text-xs | 18~22rpx | 辅助说明、时间戳 |

## Color

### Approach
**Restrained with warmth** — 以森林绿为主轴，配合温暖的金色点缀。色彩克制但有温度，绿色不刺眼，金色不张扬。

### Primary Palette

| Name | Hex | CSS Variable | Usage |
|------|-----|-------------|-------|
| **Forest Green** | `#2A4B3C` | `--color-forest` | 主文字色、按钮、选中状态、重点标记 |
| **Dark Green** | `#1a2f26` | n/a (inline) | 渐变终点、悬停态 |
| **Moss Green** | `#4A7A44` | n/a | 渐变起点、选中态背景 |
| **Sage Green** | `#E8EDE7` | `--secondary` / `--muted` | 次要背景、卡片边框 |

### Accent Colors

| Name | Hex | CSS Variable | Usage |
|------|-----|-------------|-------|
| **Gold** | `#C1A268` | `--color-gold` | 金色按钮、特殊成就、品牌点缀 |
| **Gold Light** | `#D4AF37` | `--color-gold-light` | 金色渐变高光 |
| **Gold Label** | `#9B814D` | n/a | 卡片标签文字（小程序专用） |

### Background Colors

| Name | Hex | CSS Variable | Usage |
|------|-----|-------------|-------|
| **Cream** | `#F9F7F2` | `--color-cream` | 页面背景、全局底色 |
| **Light Paper** | `#F6F1E7` | n/a | 公开页/杂志层 header 背景 |
| **Dark Paper** | `#EDE5D6` | n/a | 公开页 footer |
| **Card** | `#FFFFFF` | `--card` | 卡片背景 |

### Text Hierarchy

WebApp 通过 `#2A4B3C` + opacity 实现，小程序用等效实色：

| Level | WebApp | Mini-Program (solid) | Usage |
|-------|--------|---------------------|-------|
| Primary | `#2A4B3C` | `#2A4B3C` | 标题、正文 |
| Secondary | `#2A4B3C/80` | `#536D60` | 正文次要内容 |
| Body/Muted | `#2A4B3C/65` | `#68716C` | 描述文字 |
| Label/Soft | `#2A4B3C/50` | `#868C88` | 标签、时间戳 |
| Extra Soft | `#2A4B3C/40` | `#999F9B` | 极淡文字 |
| Faint | `#2A4B3C/30` | `#A8ADAA` | 占位提示 |

### Border Palette

| Level | WebApp | Mini-Program | Usage |
|-------|--------|-------------|-------|
| Subtle | `#2A4B3C/5` | `rgba(42,75,60,0.05)` | 极细分割线 |
| Light | `#2A4B3C/10` | `rgba(42,75,60,0.10)` | 卡片外框 |
| Medium | `#2A4B3C/15` | `rgba(42,75,60,0.15)` | 导航栏边框 |
| Divider | `#2A4B3C/20` | `#D9DDD9` | 段落分割线 |
| Card | `#E8EDE7` | `#E8EDE7` | 卡片边框 (sage) |

### Semantic Colors

| State | Color | Usage |
|-------|-------|-------|
| **Primary Button** | `bg-[#2A4B3C]` → white text | 主要操作按钮 |
| **Gold Button** | `bg-gradient from-[#2A4B3C] to-[#1a2f26]` + `text-[#C1A268]` | 品牌 CTA 按钮 |
| **Secondary Button** | transparent + `border-[#E8EDE7]` | 次要操作 |
| **Success** | `#4A7A44` → `#2D5A27` gradient | 已完成练习 |
| **Error** | `#A34837` | 错误提示、失败状态 |

### Special Colors

- **Breakthrough Orange**: `#E07724` — 突破日专用
- **Rest Day Yellow**: `#FEDB5E` — 休息日标记
- **Calendar Level 1–4**: `#C4CCBE` / `#8DA688` / `#4A7A44` / `#1A3D1A`

### Color Usage Patterns

```css
/* 主按钮（纯色，适合小程序） */
background: #2A4B3C;
color: #FFFFFF;

/* WebApp 品牌按钮渐变 */
background: linear-gradient(to top left, rgba(74, 122, 68, 0.7), rgba(45, 90, 39, 0.85));

/* 金色按钮渐变 */
background: linear-gradient(135deg, #C1A268 0%, #E5C585 50%, #C1A268 100%);

/* 选中态渐变 */
background: linear-gradient(145deg, #4A7A44 0%, #2D5A27 100%);
```

## Spacing

### Base Unit
**4px** / **~2rpx** — WebApp 基于 4px，小程序基于 4rpx（约 2px @ 375 设计稿）

### Spacing Scale

| Token | WebApp (px) | Mini-Program (rpx) | Usage |
|-------|-------------|-------------------|-------|
| `2xs` | 2px | 4rpx | 极细间距 |
| `xs` | 4px | 8rpx | 紧凑元素间 |
| `sm` | 8px | 16rpx | 小按钮内边距 |
| `md` | 16px | 30rpx | 标准卡片内边距 |
| `lg` | 24px | 44rpx | 大卡片内边距 |
| `xl` | 32px | 60rpx | 屏幕边缘间距 |
| `2xl` | 48px | 90rpx | 大模块间距 |

### Density Pattern
**Comfortable** — 不过于紧凑，留有呼吸空间，符合瑜伽的放松感。

## Layout

### Approach
**Mobile-first** — 以移动端为核心，底部导航，全屏滚动。

### Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 4px / 8rpx | 小标签 |
| `md` | 12rpx | 按钮、输入框 |
| `lg` | 20px / 40rpx | 卡片、大按钮 |
| `xl` | 24px | 大卡片、弹窗 |
| `full` / `round` | 50% | 圆形按钮、头像 |

### WebApp Specific

```css
/* 标准卡片 */
border-radius: 1.25rem; /* 20px */
padding: 1.5rem;
background: #FFFFFF;
box-shadow: 0 4px 16px rgba(45, 90, 39, 0.08);

/* 弹窗 */
border-radius: 24px;
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
```

### Mini-Program Specific

```wxss
/* 标准卡片 */
border: 1rpx solid #E8EDE7;
border-radius: 0rpx; /* 小程序卡片无圆角 */
padding: 28rpx 26rpx;
background: rgba(255, 255, 255, 0.9);
```

### Public Editorial Layer (WebApp Only)

公开工具页、科普页和作者页使用"安静的瑜伽杂志"版式，与 App 功能界面保持区分：

- **版心：** `max-width: 64rem`，正文阅读栏控制在约 `40rem`
- **结构：** 刊头、卷期信息、双栏文章头、编号目录和细分隔线
- **标题：** 移动端约 36px，平板及桌面约 48px
- **正文：** 17px、32px 行高
- **颜色：** 纸张米白 `#F6F1E7`、墨绿 `#2A4B3C`、旧金 `#C1A268`
- **组件：** 尽量不用圆角卡片和阴影；目录使用横线、编号和留白建立层级

## Motion

### Approach
**Intentional & Breathing** — 动画模拟瑜伽呼吸节奏，缓慢、流畅、有起伏。

### Animation Presets

| Name | Duration | Easing | Usage |
|------|----------|--------|-------|
| **micro** | 100ms | ease-out | 微交互、按钮反馈 |
| **short** | 200ms | ease-out | 悬停状态、小过渡 |
| **medium** | 300ms | ease-in-out | 页面切换、弹窗 |
| **breath** | 4000ms | ease-in-out | 呼吸动画（循环） |
| **pulse** | 3000ms | ease-in-out | 脉冲光晕（循环） |

### Keyframe Animations

#### 1. Breathing (呼吸)

```css
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}
/* 4秒一个周期 */
```

#### 2. Pulse Subtle (微妙脉冲)

```css
@keyframes pulse-subtle {
  0%, 100% { box-shadow: 0 4px 20px rgba(45, 90, 39, 0.15); }
  50% { box-shadow: 0 4px 30px rgba(45, 90, 39, 0.25); }
}
```

#### 3. Enter (页面入场)

```css
@keyframes enter-fade {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
```

## Components

### Buttons

#### Primary Button (主按钮)

| Property | WebApp | Mini-Program |
|----------|--------|-------------|
| Background | `#2A4B3C` (或 gradient) | `#2A4B3C` |
| Text | `#FFFFFF` | `#FFFFFF` |
| Border | none | none |
| Border radius | `20px` / `rounded-full` | `0` |
| Height | `48px+` | `84rpx` |
| Disabled | `opacity-50` | `opacity-50` |
| Font | serif | system |

#### Gold Button (金色 CTA)

| Property | Value |
|----------|-------|
| Background | `bg-gradient-to-br from-[#2A4B3C] to-[#1a2f26]` |
| Text | `#C1A268` |
| Border | `border-[#C1A268]/20` |
| Shadow | `shadow-[#C1A268]/20` |

#### Secondary Button (次要按钮)

| Property | WebApp | Mini-Program |
|----------|--------|-------------|
| Background | transparent | transparent |
| Border | `1px solid #E5E5E5` | `1rpx solid #9BA69F` |
| Text | `#1A1A1A` | `#2A4B3C` |

### Cards

| Property | WebApp | Mini-Program |
|----------|--------|-------------|
| Background | `#FFFFFF` | `rgba(255,255,255,0.9)` |
| Border | `1px solid #E5E5E5` (optional) | `1rpx solid rgba(42,75,60,0.13)` |
| Border radius | `20px` | `0` |
| Padding | `24px` | `28rpx 26rpx` |
| Shadow | `0 4px 16px rgba(0,0,0,0.08)` | none |

## Design Token Quick Reference

```css
/* ========== WEBAPP (globals.css) ========== */
:root {
  --background: #F9F7F2;
  --foreground: #2A4B3C;
  --card: #FFFFFF;
  --card-foreground: #2A4B3C;
  --primary: #2A4B3C;
  --secondary: #E8EDE7;
  --muted: #E8EDE7;
  --muted-foreground: #2A4B3C at 50%;
  --accent: #E8EDE7;
  --border: #E5E5E5;
  --ring: #2A4B3C;
  --color-cream: #F9F7F2;
  --color-forest: #2A4B3C;
  --color-gold: #C1A268;
  --color-gold-light: #D4AF37;
}

/* ========== MINI-PROGRAM (app.wxss) ========== */
/* page { color: #2A4B3C; background: #F9F7F2; } */
/* .app-card { background: rgba(255,255,255,0.9); border: 1px solid #E8EDE7; } */
/* .app-primary-button { background: #2A4B3C; color: #FFFFFF; } */
```

## Responsive Design

### Mobile-First Strategy

1. **Base styles** — 移动端默认样式
2. **Tablet** — 640px+ 微调间距
3. **Desktop** — 1024px+ 可选增强

### Touch Targets

- **Minimum**: 44px × 44px
- **Preferred**: 48px × 48px

## Accessibility

### Color Contrast

- `#2A4B3C` on `#F9F7F2` — 约 6.5:1 ✅
- `#2A4B3C` on `#FFFFFF` — 约 8:1 ✅
- 白色 on `#2A4B3C` — 约 6.5:1 ✅

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01 | 选用 Noto Serif SC 作为主字体 | 中文衬线体有书写感，契合瑜伽的传统东方气质 |
| 2026-01 | (过时) Forest Green #2D5A27 作为主色 | 第二版已改为 #2A4B3C |
| 2026-01 | 金色 #C1A268 作为强调色 | 金色象征成就和突破，与绿色搭配有禅意质感 |
| 2026-01 | 呼吸动画 4秒周期 | 模拟瑜伽呼吸节奏，4秒接近自然呼吸频率 |
| 2026-02 | 米白色背景 #F9F7F2 | 比纯白更温暖，减少眼部疲劳，像纸质日记 |
| 2026-03 | 底部固定导航 | 移动端单手操作友好 |
| 2026-07 | **主色改为 #2A4B3C** | WebApp 全站实际使用，文字和按钮统一用这个色值，替代旧 #2D5A27 |
| 2026-07 | 文字色阶改用单一绿色 + opacity | WebApp 通过 #2A4B3C 不同透明度实现层级，小程序用等效实色 |

---

**Last Updated:** 2026-07-09
**Source of Truth:** WebApp code (`globals.css` + page components)
**Maintained by:** Claude Code /design-consultation
