# 部署与更新日志 (2026-01-21)

## 1. Vercel 部署修复记录
在最近的 UI 与逻辑重构后，部署过程中遇到了一系列构建错误，主要原因是**重构过程中依赖库和 Hooks 的导入遗漏**。以下是详细的排查与修复过程：

### ❌ 错误 1: `ReferenceError: usePracticeData is not defined`
- **原因**:
  1. `app/page.tsx` 中使用了新抽离的 `usePracticeData` Hook 但未导入。
  2. `hooks/usePracticeData.ts` 使用了 `useLocalStorage` (依赖浏览器 API) 但缺少 `"use client"` 指令。
  3. **Metadata 警告**: `viewport` 配置在 `metadata` 对象中（Next.js 14+ 要求独立导出）。
- **修复**:
  - `app/page.tsx`: 添加 `usePracticeData` 导入。
  - `hooks/usePracticeData.ts`: 顶部添加 `"use client"`。
  - `app/layout.tsx`: 将 `viewport` 从 `metadata` 中移出，改为独立 `export const viewport`。

### ❌ 错误 2: `ReferenceError: useLocalStorage is not defined`
- **原因**: `app/page.tsx` 中直接使用了 `react-use` 库的 `useLocalStorage` 和 `useInterval`，但重构时未保留导入语句。
- **修复**:
  - `app/page.tsx`: 添加 `import { useLocalStorage, useInterval } from 'react-use';`。

### ❌ 错误 3: `ReferenceError: motion is not defined`
- **原因**: 页面大量使用了 `framer-motion` 的动画组件 (`motion.div`, `AnimatePresence`)，但未引入相关库。
- **修复**:
  - `app/page.tsx`: 添加 `import { motion, AnimatePresence } from "framer-motion"`。

## 2. 功能更新概览 (本次重构背景)
本次部署问题源于对应用核心架构的重构：

- **Hooks 逻辑抽离**: 将原先耦合在 `page.tsx` 中的数据管理逻辑（练习记录、自定义选项、用户资料）完整抽离至 `hooks/usePracticeData.ts`，提升了代码可维护性。
- **UI 动效增强**: 全面引入 `framer-motion`，实现了：
  - 模态框 (Modal) 的弹簧弹出效果。
  - 页面切换的淡入淡出。
  - 计时器页面的呼吸波纹动效。
- **Next.js 规范适配**: 修复了旧版 Metadata 写法，适配 Next.js 14+ 的 Viewport 配置标准。

## 3. 部署迁移清理 (Zeabur -> Vercel)
确认项目已完全迁移至 Vercel 部署，已清理所有 Zeabur 遗留配置：

- **删除文件**:
  - `.zeabur.yaml`: Zeabur 核心配置文件。
  - `Dockerfile`: Zeabur 专用的 Docker 构建文件。
  - `nixpacks.toml`: Zeabur 构建环境配置。
  - `.deploy-info`: 旧部署时间戳文件。
- **清理配置**:
  - `.gitignore`: 移除了 Zeabur 相关的忽略规则。

---
**当前状态**: 
1. 修复了所有构建时的引用错误 (ReferenceErrors)。
2. 清理了不再使用的 Zeabur 部署文件。
3. 代码已准备好在 Vercel 上进行纯净构建。
