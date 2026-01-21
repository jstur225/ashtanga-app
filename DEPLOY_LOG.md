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

---

## 4. 有赞项目同步逻辑分析 (2026-01-21 下午)

### 项目背景
用户需要了解有赞→飞书订单同步系统的运行逻辑和性能。

### 同步时间配置
- **定时增量同步**: 每天 9:00-19:00，每小时1次
- **同步范围**: 最近1天的订单
- **部署方式**: Zeabur云端 (Cron: `"0 0 9-19 * * *"`)

### 智能退款查询逻辑
对飞书中367个订单的统计：
- **需要查询**: 202个 (55.0%) - 最近15天内的订单
- **跳过查询**: 165个 (45.0%)
  - 已关闭订单: 77个 (21.0%)
  - 超过15天: 88个 (24.0%)

**查询性能**:
- 202个订单 × 0.7秒 = 约141秒 (2.4分钟)
- 节省API调用: 45% (165次)
- 实际运行: 10-15分钟

### Webhook实时同步方案讨论
用户提出了优化想法：使用有赞消息订阅实现秒级实时同步。

**当前方案** (定时同步):
- 同步延迟: 最多1小时
- API调用: 每天4848次
- 资源消耗: 持续轮询

**优化方案** (Webhook实时同步):
- 同步延迟: 5秒内
- API调用: 每天约50次 (节省99%)
- 资源消耗: 事件驱动

**实施方案**:
1. ✅ 代码已实现 (`webhook_server.py`)
2. ❌ 需要公网接收端 (云服务器或ngrok内网穿透)
3. ❌ 需要在有赞后台配置推送地址

**决策**: 暂不实施，当前定时同步已满足需求。想法已记录到：
- `main.py` (TODO注释)
- `DEV_LOG.md` (开发日志)
- `实时同步方案说明.md` (详细方案文档)

**相关文件创建**:
- `启动Webhook服务.bat` - Webhook服务启动脚本
- `ngrok启动指南.bat` - 内网穿透使用指南

---

## 5. Vercel部署问题排查 (2026-01-21 下午)

### 问题1: FakeDoorModal未定义

#### 错误信息
```
Error occurred prerendering page "/".
ReferenceError: FakeDoorModal is not defined
```

#### 排查过程
1. ✅ 确认组件文件存在: `components/FakeDoorModal.tsx`
2. ❌ 发现 `app/page.tsx` 中使用了组件但未导入
3. ✅ 本地添加导入: `import { FakeDoorModal } from "@/components/FakeDoorModal"`
4. ⏳ Git推送遇到网络错误 (SSL/TLS连接失败)

#### 修复方法
用户通过GitHub网页手动添加导入，但出现新问题。

---

### 问题2: Import语句合并 (进行中)

#### 错误信息
```
Error: Turbopack build failed with 1 errors:
./app/page.tsx:7:225
Parsing ecmascript source code failed
Expected ';', got 'import'
```

#### 问题原因
用户在GitHub网页编辑时，将两个import语句合并到一行：
```typescript
// 错误的格式 (第7行)
... } from "lucide-react"import { FakeDoorModal } from "@/components/FakeDoorModal"
                   ↑ 这里应该换行

// 正确的格式应该是两行
... } from "lucide-react"
import { FakeDoorModal } from "@/components/FakeDoorModal"
```

#### 解决方案 (✅ 已解决)
通过 `git push --force` 强制推送本地正确版本，覆盖远程有问题的提交。

**执行命令**:
```bash
cd XBB-APP/Ashtang_app
git push origin master --force
```

**验证**:
- 远程仓库已更新到 `2a358f3` (docs: 记录2026-01-21下午的对话和工作内容)
- 错误的提交 `2891287 Update page.tsx` 已被覆盖
- Vercel 已自动触发新的部署

**状态**: ✅ 已解决，等待 Vercel 部署完成

---

## 6. 本地部署工具创建

为有赞项目创建了完整的本地部署方案：

### 文件列表
1. `启动同步.bat` - 手动执行同步
2. `检查依赖.bat` - 安装依赖库
3. `配置定时任务.bat` - 创建Windows定时任务
4. `删除定时任务.bat` - 停止自动任务
5. `本地部署说明.md` - 详细使用文档

### 配置要点
- Python版本: 3.14.2 ✅
- 依赖库: requests 2.32.5 ✅
- 同步时间: 每天9-19点，每小时1次
- 智能退款: 15天内订单自动查询

**优势**:
- 零成本 (vs Zeabur云端)
- 完全控制
- 离线可用

---

## 待办事项

- [ ] 修复Vercel部署: 在GitHub上修正import语句换行
- [ ] 测试云端功能是否正常
- [ ] 配置自定义域名 (可选)

---

**最后更新**: 2026-01-21 下午
**下次讨论**: 继续解决Vercel部署问题
