# Design System — 熬汤日记

## Product Context

- **What this is:** 阿斯汤加瑜伽练习记录工具，专注打卡和身体觉察
- **Who it's for:** 阿斯汤加练习者（有练习经验的人群）
- **Space/industry:** 健康/运动/瑜伽记录类应用
- **Project type:** 移动端优先的 Web PWA 应用

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
| **Body** | Noto Serif SC | SimSun, STSong, serif | 正文、觉察笔记、所有中文内容 |
| **UI/Labels** | Inter | system-ui, sans-serif | 按钮、标签、辅助文字 |
| **Code** | JetBrains Mono | monospace | 代码、技术内容 |

### Why These Fonts

- **Noto Serif SC**: 中文衬线字体，有书写感和文化气息，适合瑜伽这种有东方传统的主题
- **Playfair Display**: 优雅的英文衬线，与宋体搭配和谐
- **Inter**: 清晰的无衬线，用于UI元素确保可读性

### Typography Scale

| Level | Size | Usage |
|-------|------|-------|
| Hero | text-2xl ~ text-3xl | 页面主标题 |
| Heading | text-lg ~ text-xl | 卡片标题、章节标题 |
| Body | text-sm ~ text-base | 正文内容 |
| Caption | text-xs ~ text-[10px] | 辅助说明、时间戳 |

### Font Patterns

```css
/* 正文字体 */
font-family: var(--font-noto-serif-sc), 'Noto Serif SC', 'SimSun', 'STSong', serif;

/* 展示字体 */
font-family: var(--font-playfair), 'Playfair Display', serif;

/* UI字体 */
font-family: var(--font-inter), 'Inter', system-ui, sans-serif;
```

## Color

### Approach
**Restrained with warmth** — 以绿色为主轴，配合温暖的金色点缀。色彩克制但有温度，绿色不刺眼，金色不张扬。

### Primary Palette

| Name | Hex | Usage |
|------|-----|-------|
| **Forest Green** | `#2D5A27` | 主按钮、选中状态、重点标记 |
| **Moss Green** | `#4A7A44` | 渐变终点、悬停状态 |
| **Sage Green** | `#E8EDE7` | 次要背景、标签底色 |

### Accent Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Gold** | `#C1A268` | 突破日标记、特殊成就 |
| **Gold Light** | `#D4AF37` | 金色渐变高光 |
| **Moon Yellow** | `#FFE066` | 月相标记（新月/满月） |

### Neutral Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Background** | `#F9F8F6` | 页面背景（暖白色） |
| **Card** | `#FFFFFF` | 卡片背景 |
| **Border** | `#E5E5E5` | 边框、分割线 |
| **Text Primary** | `#1A1A1A` | 主文字 |
| **Text Muted** | `#6B7280` | 次要文字、提示 |

### Semantic Colors

| State | Color | Usage |
|-------|-------|-------|
| **Success** | `#2D5A27` (green) | 成功状态、完成标记 |
| **Warning** | `#C1A268` (gold) | 警告、提示 |
| **Error** | `#DC2626` | 错误、删除 |
| **Info** | `#6B7280` | 一般信息 |

### Special Colors

- **Breakthrough Orange**: `#E07724` / `#e67e22` — 突破日专用
- **Rest Day Yellow**: `#FEDB5E` — 休息日标记

### Color Usage Patterns

```css
/* 主按钮渐变 */
background: linear-gradient(to top left, rgba(74, 122, 68, 0.7), rgba(45, 90, 39, 0.85));

/* 金色文字渐变 */
background: linear-gradient(135deg, #C1A268 0%, #E5C585 50%, #C1A268 100%);
-webkit-background-clip: text;
background-clip: text;
color: transparent;
```

## Spacing

### Base Unit
**4px** — 所有间距基于此倍数

### Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `2xs` | 2px | 极细间距 |
| `xs` | 4px | 紧凑元素间 |
| `sm` | 8px | 小按钮内边距 |
| `md` | 16px | 标准卡片内边距 |
| `lg` | 24px | 大卡片内边距 |
| `xl` | 32px | 屏幕边缘间距 |
| `2xl` | 48px | 大模块间距 |
| `3xl` | 64px | 页面级间距 |

### Density Pattern
**Comfortable** — 不过于紧凑，留有呼吸空间，符合瑜伽的放松感。

### Common Patterns

```css
/* 卡片内边距 */
padding: 1.5rem; /* 24px */

/* 按钮内边距 */
padding: 0.75rem 1rem; /* 12px 16px */

/* 屏幕边缘 */
padding: 1rem; /* 16px */
```

## Layout

### Approach
**Mobile-first PWA** — 以移动端为核心，底部导航，全屏滚动。

### Grid System
- **Container**: 100% width, max-width 100%
- **Columns**: Flexbox-based, 2-column for stats, 3-column for calendar
- **Gutters**: 12px ~ 16px

### Breakpoints
- **Mobile**: < 640px (默认)
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Border Radius Scale

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 4px | 小标签、紧凑元素 |
| `md` | 12px | 按钮、输入框 |
| `lg` | 20px (1.25rem) | 卡片、大按钮 |
| `xl` | 24px | 大卡片、弹窗 |
| `full` | 9999px | 圆形按钮、头像 |

### Layout Patterns

```css
/* 标准卡片 */
border-radius: 1.25rem; /* 20px */
padding: 1.5rem;
background: #FFFFFF;
box-shadow: 0 4px 16px rgba(45, 90, 39, 0.08);

/* 底部导航按钮 */
border-radius: 9999px;
width: 40px;
height: 40px;

/* 大弹窗 */
border-radius: 24px;
```

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
| **ripple** | 3000ms | ease-out | 涟漪扩散（循环） |

### Keyframe Animations

#### 1. Breathing (呼吸)
```css
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}
/* 4秒一个周期，模拟深呼吸 */
```
用于：练习中的圆环、专注状态指示器

#### 2. Pulse Subtle (微妙脉冲)
```css
@keyframes pulse-subtle {
  0%, 100% { box-shadow: 0 4px 20px rgba(45, 90, 39, 0.15); }
  50% { box-shadow: 0 4px 30px rgba(45, 90, 39, 0.25); }
}
/* 3秒一个周期 */
```
用于：开始练习按钮、活跃状态

#### 3. Ripple Breath (呼吸涟漪)
```css
@keyframes ripple-breath {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.5); opacity: 0; }
}
/* 3秒一个周期，两个涟漪交替 */
```
用于：练习中背景效果

#### 4. Highlight Flash (高亮闪烁)
```css
@keyframes highlight-flash {
  0%, 100% { background-color: rgba(45, 90, 39, 0); }
  20%, 60% { background-color: rgba(45, 90, 39, 0.15); }
}
/* 1.5秒，双击效果 */
```
用于：日历日期点击反馈

### Easing Functions

```css
/* 进入 */
transition-timing-function: ease-out;

/* 退出 */
transition-timing-function: ease-in;

/* 移动 */
transition-timing-function: ease-in-out;
```

### Motion Patterns

```css
/* 标准过渡 */
transition: all 0.2s ease-out;

/* 按钮悬停 */
transition: all 0.2s ease-out;
hover: scale-[0.98] 或 hover:opacity-90

/* 弹窗进入 */
animation: 0.3s ease-out;
```

## Components

### Buttons

#### Primary Button (主按钮)
```css
/* Green Gradient Button */
background: linear-gradient(to top left, rgba(74, 122, 68, 0.7), rgba(45, 90, 39, 0.85));
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.2);
border-radius: 9999px; /* 或 20px */
box-shadow: 0 4px 16px rgba(45, 90, 39, 0.25);
color: white;
font-family: 'Noto Serif SC', serif;

/* 状态 */
hover: opacity-90;
active: scale-[0.98];
```

#### Secondary Button (次要按钮)
```css
background: #E8EDE7;
border: 1px solid #E5E5E5;
border-radius: 20px;
color: #1A1A1A;

/* 状态 */
hover: bg-secondary/80;
```

#### Ghost Button (幽灵按钮)
```css
background: transparent;
border: 1px dashed #E5E5E5;
border-radius: 20px;
color: #6B7280;

/* 状态 */
hover: border-primary/50 hover:bg-secondary/50;
```

### Cards

#### Standard Card
```css
background: #FFFFFF;
border-radius: 20px;
padding: 24px;
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
```

#### Modal Card
```css
background: #FFFFFF;
border-radius: 24px;
padding: 24px;
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
max-width: 100%;
max-height: 85vh;
```

### Forms

#### Input Field
```css
background: #E8EDE7;
border-radius: 20px;
padding: 12px 16px;
font-family: 'Noto Serif SC', serif;

/* Focus */
focus: ring-2 focus:ring-primary/20;
```

#### Textarea
```css
background: #E8EDE7;
border-radius: 16px;
padding: 16px;
resize: none;
```

### Navigation

#### Bottom Tab
```css
/* 容器 */
position: fixed;
bottom: 0;
left: 0;
right: 0;
height: 64px;
background: rgba(255, 255, 255, 0.95);
backdrop-filter: blur(12px);
border-top: 1px solid #E5E5E5;

/* 激活项 */
color: #2D5A27;
```

## Effects

### Shadows

| Name | Value | Usage |
|------|-------|-------|
| **Soft** | `0 4px 16px rgba(45, 90, 39, 0.08)` | 卡片 |
| **Medium** | `0 4px 16px rgba(45, 90, 39, 0.25)` | 主按钮 |
| **Large** | `0 8px 32px rgba(0, 0, 0, 0.12)` | 弹窗 |
| **Glow** | `0 0 20px rgba(45, 90, 39, 0.3)` | 高亮状态 |

### Backdrop Blur

```css
backdrop-filter: blur(12px);
-webkit-backdrop-filter: blur(12px);
```
用于：底部导航、浮动按钮、毛玻璃效果

### Textures

#### Paper Pattern (纸质纹理)
```css
background-color: #F9F7F2;
background-image: url("data:image/svg+xml,..."); /* 噪点纹理 */
```
用于：特殊背景、强调区域

## Responsive Design

### Mobile-First Strategy

1. **Base styles** — 移动端默认样式
2. **Tablet** (md:) — 640px+ 微调间距
3. **Desktop** (lg:) — 1024px+ 可选增强

### Touch Targets

- **Minimum**: 44px × 44px
- **Preferred**: 48px × 48px
- **Large buttons**: 56px+ height

### Typography Responsive

```css
/* 移动端优先 */
text-sm /* 默认正文 */
md:text-base /* 平板稍大 */

/* 标题 */
text-xl /* 移动端 */
md:text-2xl /* 平板 */
```

## Accessibility

### Color Contrast
- 主文字 `#1A1A1A` on `#FFFFFF` — 16.8:1 ✅
- 次要文字 `#6B7280` on `#FFFFFF` — 5.7:1 ✅
- 主按钮文字 白色 on 深绿 — 4.5:1+ ✅

### Focus States
```css
focus:ring-2 focus:ring-primary/20 focus:outline-none
```

### Touch Feedback
- 按钮点击缩放：`active:scale-[0.98]`
- 足够的触摸目标：最小 44px

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01 | 选用 Noto Serif SC 作为主字体 | 中文衬线体有书写感，契合瑜伽的传统东方气质 |
| 2026-01 | 森林绿 #2D5A27 作为主色 | 绿色代表自然、生长、平静，符合瑜伽主题 |
| 2026-01 | 金色 #C1A268 作为强调色 | 金色象征成就和突破，与绿色搭配有禅意质感 |
| 2026-01 | 呼吸动画 4秒周期 | 模拟瑜伽呼吸节奏，4秒接近自然呼吸频率 |
| 2026-01 | 大圆角设计 (20px+) | 圆润的边角给人温和、亲和的感觉，减少锐利感 |
| 2026-01 | 毛玻璃效果 | 增加层次感和现代感，同时保持背景的柔和 |
| 2026-02 | 米白色背景 #F9F8F6 | 比纯白更温暖，减少眼部疲劳，像纸质日记 |
| 2026-03 | 底部固定导航 | 移动端单手操作友好，符合现代 App 交互习惯 |

## Usage Examples

### Button with Icon
```tsx
<button className="flex items-center gap-2 px-6 py-3 green-gradient backdrop-blur-md text-white rounded-full border border-white/20 shadow-[0_4px_16px_rgba(45,90,39,0.25)] font-serif hover:opacity-90 active:scale-[0.98] transition-all">
  <Icon className="w-5 h-5" />
  <span>保存练习</span>
</button>
```

### Card with Breathing Animation
```tsx
<div className="p-6 bg-card rounded-[20px] shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
  <div className="w-32 h-32 rounded-full green-gradient animate-breathe" />
</div>
```

### Text with Gold Gradient
```tsx
<span className="text-gold-gradient font-serif">突破</span>
```

### Paper Background
```tsx
<div className="bg-paper-pattern p-6">
  {/* Content */}
</div>
```

---

**Last Updated:** 2026-04-01
**Maintained by:** Claude Code /design-consultation
