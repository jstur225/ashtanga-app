# 阿斯汤加打卡app (Ashtanga Life)

> 极简的阿斯汤加瑜伽练习记录工具

## 项目简介

这是一个专为阿斯汤加瑜伽练习者设计的极简打卡应用，核心理念是"简单到极致"。

- 🧘‍♂️ **专注记录**: 不做教学，只做练习记录
- 📝 **觉察日记**: 记录身体感受、呼吸状态、内心变化
- ⭐ **突破时刻**: 标记每一个里程碑
- 📊 **练习热力图**: 可视化你的坚持
- 🔒 **数据私有**: 本地存储，数据完全属于你

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
```bash
copy .env.example .env.local
```

编辑 `.env.local` 填入你的配置（可选，不配置也能使用本地功能）

### 3. 启动开发服务器
双击 `start-dev.bat` 或运行：
```bash
npm run dev
```

访问 http://localhost:3000

### 4. 构建生产版本
```bash
npm run build
npm start
```

## 核心功能

### Tab1 - 练习打卡
- 选择练习类型（一序列、二序列、半序列、休息日等）
- 计时功能
- 填写觉察笔记
- 标记突破时刻

### Tab2 - 觉察日记
- 时间线展示所有练习记录
- 365天练习热力图
- 查看记录详情

### Tab3 - 我的数据
- 编辑个人资料
- 数据导出/导入
- 安装 PWA 应用
- 练习统计

## 技术栈

- **框架**: Next.js 16 (React 19)
- **样式**: Tailwind CSS
- **UI组件**: shadcn/ui
- **状态管理**: React Hooks
- **数据存储**: localStorage + Supabase (可选)
- **PWA**: Service Worker

## 项目特色

### 极简理念
- 不做教学视频
- 不做社交功能
- 不做课程推荐
- **只做练习记录**

### 数据安全
- 优先本地存储
- 可选云端同步
- 数据完全属于你
- 支持导出备份

### PWA 应用
- 可安装到桌面
- 离线可用
- 无需应用商店
- 跨平台支持

## 部署地址

生产环境: https://ash.ashtangalife.online

## 开发说明

### 目录结构
```
ashtang-app/
├── app/              # Next.js 应用
├── components/       # React 组件
├── hooks/           # 自定义 Hooks
├── lib/             # 工具库
├── public/          # 静态资源
└── start-dev.bat    # 快速启动脚本
```

### 主要文件
- `app/practice/page.tsx` - 主要应用页面
- `hooks/usePracticeData.ts` - 数据管理
- `lib/analytics.ts` - 数据统计
- `lib/database.ts` - 数据库操作

### 环境变量
```env
NEXT_PUBLIC_SUPABASE_URL=        # Supabase 项目 URL（可选）
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Supabase Anon Key（可选）
NEXT_PUBLIC_MIXPANEL_TOKEN=      # Mixpanel Token（可选）
```

## 版本历史

### v1.0.0 正式版 (2026-01-26) ✨
**全部功能可用，正式上线！**

#### 核心功能
- ✅ **练习打卡**: 支持一序列、二序列、半序列、自定义、休息日等多种练习类型
- ✅ **计时功能**: 精确记录练习时长
- ✅ **觉察日记**: 记录身体感受、呼吸状态、内心变化
- ✅ **突破时刻**: 标记每一个重要里程碑
- ✅ **练习热力图**: 365天可视化练习轨迹
- ✅ **日历视图**: 直观的月度练习记录
- ✅ **数据统计**: 总练习天数、累计时长、当前连续天数等
- ✅ **数据管理**: 本地存储 + 导出/导入功能
- ✅ **PWA应用**: 可安装到桌面，支持离线使用
- ✅ **优雅的落地页**: 品牌故事、产品特点、开始练习按钮

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

### v1.0.5 (2026-01-26)
- 添加新用户教程记录
- 修复练习类型显示
- 优化落地页体验

### v1.0.0 (2026-01-14)
- 初始版本发布
- 核心打卡功能
- PWA 支持

## 许可证

MIT License

## 联系方式

- 产品: orange
- 开发: Claude Code
- 仓库: https://github.com/jstur225/ashtanga-app

---

**Practice, practice, and all is coming.** 🙏
