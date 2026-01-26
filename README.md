# 熬汤日记 (Ashtanga Life)

<div align="center">

> 极简的阿斯汤加瑜伽练习记录工具
> Practice, practice, and all is coming.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![PWA](https://img.shields.io/badge/PWA-Ready-green)](https://www.pwabuilder.com/)

**在线体验**: [ash.ashtangalife.online](https://ash.ashtangalife.online)

</div>

---

## 目录

- [项目简介](#项目简介)
- [核心功能](#核心功能)
- [设计理念](#设计理念)
- [快速开始](#快速开始)
- [功能详解](#功能详解)
- [技术架构](#技术架构)
- [部署指南](#部署指南)
- [常见问题](#常见问题)
- [版本历史](#版本历史)

---

## 项目简介

**熬汤日记**是一个专为阿斯汤加瑜伽练习者设计的极简打卡应用。我们的核心理念是**"简单到极致"**——不做教学，不做社交，不做课程推荐，只专注于练习记录这一件事。

### 为什么做这个应用？

阿斯汤加瑜伽的精髓在于**持续不断的练习**。每天早晨，铺开垫子，开始练习，记录感受，就这样简单。我们相信：

- 记录本身就是一种觉察
- 看见自己的进步需要时间维度
- 数据应该属于练习者本人
- 工具应该安静地服务，而不是喧宾夺主

### 应用特色

- 🧘‍♂️ **专注记录** - 不做教学，只做练习记录
- 📝 **觉察日记** - 记录身体感受、呼吸状态、内心变化
- ⭐ **突破时刻** - 标记每一个里程碑（如：第一次抓到脚后跟）
- 📊 **练习热力图** - 365天可视化你的坚持
- 📅 **月度日历** - 直观的月度练习记录
- 🔒 **数据私有** - 本地存储，数据完全属于你
- 📱 **PWA应用** - 可安装到桌面，支持离线使用

---

## 核心功能

### 🎯 三大核心模块

#### 1️⃣ 练习打卡 (Tab1)
- **多种练习类型**: 一序列、二序列、半序列、自定义、休息日、月亮日等
- **精准计时**: 自动记录每次练习的时长
- **觉察笔记**: 记录身体感受、呼吸状态、情绪变化
- **突破标记**: 标记重要里程碑，如"第一次倒立"
- **休息日支持**: 休息日不计入统计，但可记录

#### 2️⃣ 觉察日记 (Tab2)
- **时间线展示**: 按时间倒序展示所有练习记录
- **练习热力图**: GitHub风格的365天热力图，直观看到练习轨迹
- **月度日历**: 月历视图，快速查看任意日期的练习记录
- **详情查看**: 点击任意记录查看详细信息
- **数据筛选**: 按练习类型筛选查看

#### 3️⃣ 我的数据 (Tab3)
- **个人资料**: 编辑姓名、开始练习日期等信息
- **数据统计**:
  - 总练习天数
  - 累计练习时长
  - 当前连续练习天数
  - 最长连续练习记录
- **数据导出**: 导出JSON格式的完整数据备份
- **数据导入**: 从备份文件恢复数据
- **PWA安装**: 一键安装到桌面

### ✨ 落地页设计

- **品牌故事**: 阐述产品的设计理念
- **三大特点**: 练习计时、觉察日记、数据私有
- **优雅动画**: Framer Motion驱动的流畅动画
- **禅意美学**: 米黄色调、金色点缀、极简设计

---

## 设计理念

### 🎨 极简美学

- **米黄色调** (#F9F7F2): 温暖、宁静，像铺开的垫子
- **深绿配色** (#2A4B3C): 稳重、自然，呼应瑜伽的古老传统
- **金色点缀** (#C1A268): 尊贵、品质，标记重要时刻
- **宋体/衬线字体**: 优雅、传统，传达东方禅意

### 🧘 产品哲学

#### 我们不做：
- ❌ 教学视频
- ❌ 社交功能
- ❌ 课程推荐
- ❌ 广告推送
- ❌ 会员订阅

#### 我们只做：
- ✅ 练习记录
- ✅ 数据统计
- ✅ 觉察日记
- ✅ 隐私保护

### 🔒 隐私优先

- **本地优先**: 数据默认存储在浏览器本地
- **用户控制**: 完全由用户决定是否导出/分享
- **无账号系统**: 不需要注册登录
- **数据私有**: 所有数据只属于用户本人

---

## 快速开始

### 在线使用 (推荐)

直接访问: [ash.ashtangalife.online](https://ash.ashtangalife.online)

无需下载、无需注册、打开即用。

### 本地开发

#### 环境要求

- Node.js >= 18.17.0
- npm >= 9.0.0

#### 安装步骤

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev
```

访问 http://localhost:3000 查看应用

#### 构建生产版本

```bash
# 构建
npm run build

# 启动生产服务器
npm start
```

---

## 功能详解

### 练习类型说明

| 类型 | 说明 | 是否计入统计 |
|------|------|-------------|
| 一序列 | 完整的初级序列练习 | ✅ |
| 二序列 | 完整的中级序列练习 | ✅ |
| 半序列 | 部分序列练习 | ✅ |
| 自定义 | 自定义练习内容 | ✅ |
| 休息日 | 休息日（可记录心得） | ❌ |
| 月亮日 | 传统休息日 | ❌ |
| 女性假日 | 生理期休息 | ❌ |

### 觉察日记说明

每次练习后可以记录：
- **身体感受**: 僵硬、轻盈、疲劳、 energized...
- **呼吸状态**: 乌加依呼吸、顺畅、困难...
- **内心变化**: 平静、焦虑、喜悦、烦躁...
- **突破时刻**: 标记重要里程碑

### 数据统计说明

- **总练习天数**: 所有计入统计的练习记录数
- **累计练习时长**: 所有练习的分钟数总和
- **当前连续天数**: 从最近一次练习到今天，连续不间断的天数
- **最长连续记录**: 历史最长的连续练习天数

---

## 技术架构

### 技术栈

#### 前端框架
- **Next.js 16** - React全栈框架 (App Router)
- **React 19** - UI库
- **TypeScript** - 类型安全

#### 样式方案
- **Tailwind CSS** - 原子化CSS框架
- **shadcn/ui** - 高质量React组件库
- **Framer Motion** - 声明式动画库

#### 状态管理
- **React Hooks** - useState, useEffect, useContext
- **自定义Hooks** - usePracticeData, useTimer等

#### 数据存储
- **localStorage** - 本地数据持久化
- **JSON导出/导入** - 数据备份

#### PWA功能
- **Service Worker** - 离线缓存
- **Web App Manifest** - 应用安装配置

### 项目结构

```
ashtang-app/
├── app/                      # Next.js App Router
│   ├── practice/            # 主要应用页面
│   │   └── page.tsx        # 三个Tab的核心逻辑
│   ├── layout.tsx          # 全局布局
│   ├── page.tsx            # 落地页
│   └── globals.css         # 全局样式
│
├── components/              # React组件
│   ├── ui/                 # shadcn/ui基础组件
│   ├── TimerDisplay.tsx    # 计时器组件
│   ├── PracticeTypeCard.tsx # 练习类型卡片
│   ├── CalendarView.tsx    # 日历视图
│   ├── HeatmapView.tsx     # 热力图视图
│   └── LandingPage/        # 落地页组件
│
├── hooks/                   # 自定义Hooks
│   ├── usePracticeData.ts  # 练习数据管理
│   ├── useTimer.ts         # 计时器逻辑
│   └── useLocalStorage.ts  # 本地存储封装
│
├── lib/                     # 工具库
│   ├── analytics.ts        # 数据统计
│   ├── dateUtils.ts        # 日期处理
│   └── export.ts           # 数据导出
│
├── public/                  # 静态资源
│   ├── icon.png            # 应用图标
│   ├── manifest.json       # PWA配置
│   └── sw.js               # Service Worker
│
└── package.json            # 项目配置
```

### 核心代码说明

#### usePracticeData Hook

管理所有练习数据的Hook，提供：
- 添加/编辑/删除练习记录
- 数据持久化到localStorage
- 数据统计分析
- 导出/导入功能

#### 练习记录数据结构

```typescript
interface PracticeRecord {
  id: string;                // 唯一标识
  date: string;              // 练习日期 (YYYY-MM-DD)
  type: PracticeType;        // 练习类型
  duration: number;          // 练习时长(分钟)
  notes?: string;            // 觉察笔记
  isBreakthrough?: boolean;  // 是否标记为突破
  createdAt: string;         // 创建时间
}
```

---

## 部署指南

### Vercel 部署 (推荐)

1. **准备项目**
   - 确保代码在本地仓库
   - 测试构建：`npm run build`

2. **在 Vercel 导入项目**
   - 访问 [vercel.com](https://vercel.com)
   - 点击 "New Project"
   - 导入项目目录

3. **配置项目**
   - Framework Preset: Next.js
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. **部署**
   - 点击 "Deploy"
   - 等待部署完成（约1-2分钟）
   - 获得你的专属域名

### 其他平台

#### Netlify
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

#### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 常见问题

### Q1: 数据会丢失吗？

**A**: 数据存储在浏览器本地，以下情况会丢失：
- 清除浏览器缓存
- 换用其他浏览器
- 重装操作系统

**建议**: 定期使用"数据导出"功能备份。

### Q2: 如何备份和恢复数据？

**A**:
1. 进入"Tab3 - 我的数据"
2. 点击"导出数据"，下载JSON文件
3. 恢复时点击"导入数据"，选择备份文件

### Q3: 休息日为什么不计入统计？

**A**: 休息日的目的是记录休息原因和心得，但不应影响"连续练习天数"的统计。如果你希望计入，可以选"自定义"类型。

### Q4: 如何安装到桌面？

**A**:
1. 在浏览器中打开应用
2. 进入"Tab3 - 我的数据"
3. 点击"安装PWA应用"
4. 按浏览器提示操作

### Q5: 数据会同步到云端吗？

**A**: 当前版本不支持云端同步。数据完全在本地，保证隐私。未来可能推出可选的同步功能。

### Q6: 为什么使用本地存储而不是数据库？

**A**:
- **隐私优先**: 练习记录是个人私密信息
- **无需注册**: 降低使用门槛
- **完全控制**: 用户拥有数据所有权
- **成本为零**: 无需服务器费用

### Q7: 支持哪些浏览器？

**A**:
- ✅ Chrome/Edge (推荐)
- ✅ Safari
- ✅ Firefox
- ❌ IE (已停止支持)

### Q8: 可以多人共用吗？

**A**: 每个浏览器的数据是独立的。多人共用需要各自使用自己的设备/浏览器。

---

## 版本历史

### v1.0.0 正式版 (2026-01-26) ✨

**全部功能可用，正式上线！**

#### 核心功能
- ✅ **练习打卡**: 7种练习类型，支持计时、笔记、突破标记
- ✅ **觉察日记**: 时间线视图，365天热力图，月度日历
- ✅ **数据统计**: 练习天数、累计时长、连续天数等
- ✅ **数据管理**: 本地存储 + 导出/导入功能
- ✅ **PWA应用**: 可安装到桌面，支持离线使用
- ✅ **优雅落地页**: 品牌故事、产品特点、流畅动画

#### 技术亮点
- Next.js 16 + React 19
- Tailwind CSS + shadcn/ui
- Framer Motion 动画
- 响应式设计（移动优先）
- 本地数据存储
- Service Worker PWA支持

#### 设计理念
- **极简**: 不做教学、不做社交、不做课程，只做练习记录
- **隐私**: 数据本地存储，完全属于用户
- **优雅**: 米黄色调、金色点缀、禅意美学

---

## 联系方式

- **产品**: orange
- **在线地址**: [https://ash.ashtangalife.online](https://ash.ashtangalife.online)

---

<div align="center">

**Practice, practice, and all is coming.** 🙏

Made with ❤️ for Ashtanga practitioners

</div>
