# 小红书阿斯汤加内容生产系统 - 开发日志

---

## 2026-02-27 小红书内容生产系统 - 迭代优化 ✅

**功能概述**: 完成流程固化、数据抓取和文案批量生产

**今日完成工作**:

### 1. 文案批量生产
- 生成 4 个 🟡待生成 选题的文案（2个角度/选题）
  - 2026要频繁大量记录自己的练习
  - AI节省时间：回到生活，爱具体的人
  - Mysore自律：在家建立晨练习惯
  - 能量提升：古老序列改变气场
- 解决 NotebookLM 超时问题（设置 `NOTEBOOKLM_TIMEOUT=300` 环境变量）

### 2. 小红书后台数据抓取
- 抓取「马年第一练」笔记数据
- 数据：曝光242 / 观看58 / 封面点击率16.10% / 点赞1 / 评论3
- 成功填入飞书多维表格对应字段

### 3. 流程固化
- **OPERATIONS.md 更新**:
  - 规则4：默认只处理 🟡待生成 状态选题，不再询问
  - 飞书表格字段规范：数字字段改为整数类型（0位小数）
  - 新增「最后更新数据时间」字段
  - 记录正确的飞书 API 字段创建格式（扁平化 payload）

### 4. 文案迭代
- AI 节省时间选题重写为 600 字第一人称心得
- 直接在旧飞书文档链接上更新内容（不创建新文档）

**技术要点**:
```python
# 解决 NotebookLM 超时
import os
os.environ['NOTEBOOKLM_TIMEOUT'] = '300'  # 5分钟

from notebooklm import NotebookLMClient
async with await NotebookLMClient.from_storage() as client:
    result = await client.chat.ask(...)
```

**相关链接**:
- 飞书多维表格：https://my.feishu.cn/base/ORVubUAk3ajAg2s9O0bcIuVbn2b
- 飞书知识库：https://my.feishu.cn/wiki/JKV9wsajOiPwLvkDJ3zcqu3cnwc

---

## 2026-02-26 NotebookLM Python API 集成成功 ✅

**功能概述**: 完成 notebooklm-py 库的认证集成，实现稳定的小红书文案生成流程

**核心实现**:
- ✅ 成功运行 `notebooklm login` 完成浏览器认证
- ✅ 生成有效的 `storage_state.json` 凭证文件
- ✅ 验证 `notebooklm list/use/ask` 命令正常工作
- ✅ 使用 Python API 发送主题并接收生成文案
- ✅ 文案生成数量：2个不同角度
- ✅ 表情符号完整保留（🟢🌱✅🙏等）
- ✅ 知识库链接自动同步到飞书表格

**技术方案**:
- **主方案**: `notebooklm-py` Python API
  - 直接调用 NotebookLM API，无需浏览器自动化
  - 稳定可靠，支持 UTF-8 编码
  - 代码：`send_to_notebooklm.py`
- **降级方案**: MCP + Chrome（备用）
  - 当 notebooklm-py 遇到问题时使用

**认证详情**:
- 库：`notebooklm-py` (https://github.com/teng-lin/notebooklm-py)
- 认证方式：Playwright 浏览器登录 + Cookie 持久化
- 凭证位置：`~/.notebooklm/storage_state.json`
- 笔记本ID：`80059318-e0e8-4971-95cc-fde4b231d3a0`

**相关文件**:
- `send_to_notebooklm.py` - 发送主题脚本
- `sync_generated_to_feishu.py` - 同步到飞书脚本
- `CONTENT_RULES.md` - 完整流程规范文档

**今日生成实例**:
- 主题："2026要频繁大量记录自己的练习"
- 角度1：对话叙述型（🟢晨练后她说，今年想好好记录练习）
- 角度2：场景代入型（🌲2026的每次垫上觉察，你留住了吗）
- 飞书文档：https://my.feishu.cn/docx/ZhfQdVvYloplQAxtZrAcWdmDnEc
- 记录状态：🟠待审核

---

## 2026-02-26 小红书文案生成流程初版 ⚠️ 已升级

**状态**: 已被 notebooklm-py 方案取代，仅作记录

**原方案**: MCP + Chrome 浏览器自动化
**问题**: 连接不稳定，提取内容困难
**解决方案**: 改用 notebooklm-py 直接 API 调用
  - NotebookLM输入格式
  - 状态流转规则
  - 文档内容规范
  - 同步流程

**已知限制**:
- 状态管理区块API有兼容性问题，需手动添加
- 旧文档无法批量删除，每次创建新文档

**相关文件**:
- `sync_generated_to_feishu.py` - 同步脚本
- `input_and_send.py` - NotebookLM输入脚本
- `CONTENT_RULES.md` - 固化规范文档
- `generated_2026频繁记录.md` - 示例文案

---

## 2026-02-25 知识库目录结构搭建完成

### 今日完成工作

1. **参考 dontbesilent 系统化理念**
   - 学习文章《从选题到发布：dontbesilent 的 Claude Code 工作流》
   - 核心理念：从碎片化创作升级到系统化创作
   - 先检索素材，后创作，避免重复造轮子

2. **飞书知识库目录结构**
   已创建以下8个节点：
   - `📁 01-选题池` - 所有想法先扔这儿
   - `📁 02-创作中` - 正在写的文案（3个角度）
   - `📁 03-已发布` - 发布后归档 + 数据复盘
   - `📁 素材库`
     - `📁 金句库`
     - `📁 爆款结构`
     - `📁 核心概念`
   - `📁 方法论`
     - `📌 小红书标题方法论`（示例文档）

3. **脚本更新**
   - `init_wiki_structure.py` - 初始化知识库目录
   - `check_wiki.py` - 检查知识库状态
   - 更新 `generate_content.py` - 文案自动保存到"02-创作中"

4. **清理工作**
   - 删除 `.obsidian/` 配置目录
   - 停止使用 Obsidian 作为工作界面

### 新工作流

```
飞书表格(🟡待生成) → NotebookLM生成3角度 → 知识库(02-创作中)
                                                      ↓
小红书 ← 发布 ← 创始人审核 ← 🟠待审核 ←─────────────┘
  ↓
数据回填 → 移至03-已发布 → 🔵已发布
```

### 待办（明天继续）

- [ ] 优化素材检索流程（写之前先查本地素材库）
- [ ] 测试新工作流完整跑通
- [ ] 考虑是否把本地素材库逐步迁移到飞书

---

## 2026-02-25 春节练习感悟选题 - 3个角度文案已生成

### 完成工作

1. **NotebookLM认证修复**
   - 重新完成Google登录认证
   - 认证文件已保存到 `C:\Users\BIN\.notebooklm\storage_state.json`
   - NotebookLM调用恢复正常

2. **文案生成完成**
   - 选题："练习感悟啊，就是春节没有怎么练习，然后感觉吃胖了很多，今天的练习有一点钝顿的要接受自己的肥肉"
   - 使用NotebookLM生成了3个不同角度的文案

### 3个角度文案概览

| 角度 | 标题示例 | 特点 |
|------|---------|------|
| **角度1-对话叙述型** | 春节后的清晨，她说只想安静记录 | 故事感强，通过对话引入 |
| **角度2-第二人称提问型** | 春节的垫上觉察，你留住了吗 | 互动性强，引发共鸣 |
| **角度6-场景代入型** | 春节晨练结束，你只想安静记录 | 代入感强，场景描述 |

### 文件位置

- **Obsidian文档**：`01-内容生产/01-待深化的选题/春节练习感悟_2026-02-25.md`
- **飞书表格**：状态已更新为 🟠待审核

### 飞书表格更新

- 记录ID: `recNvwmCyK`
- 状态: 🟠待审核
- 文案角度: 3个角度已生成

### 飞书云文档集成

3. **保存到飞书云文档**
   - 创建了 `save_to_feishu_kb.py` 脚本
   - 文案已保存到飞书云文档：https://my.feishu.cn/docx/XwIfd2S6uoHRXIxfN9acIqlUnRg
   - 飞书表格"知识库链接"字段已更新
   - 由于API权限限制，文档创建在"我的空间"，可手动移动到知识库

### 待办

- [ ] 创始人审核3个角度文案，选择发布版本
- [ ] 发布到小红书
- [ ] 填入数据到飞书表格

---

## 2026-02-25 飞书多维表格集成完成

### 今日完成工作

1. **飞书API测试**
   - 使用用户提供的API凭证：`cli_a91435e1d6f81cc2`
   - 认证成功，获取到tenant_access_token
   - 表格ID：`tblHnoAMur4hffED`

2. **多维表格字段创建**
   - 成功创建19个字段
   - 字段结构与小红书后台数据完全一致

3. **字段清单**
   - 基础字段：选题、状态、排期日期、文案角度、选题类型
   - 链接字段：知识库链接、小红书链接
   - 时间字段：发布日期、备注
   - **小红书后台数据字段**：
     - 曝光、观看、封面点击率
     - 点赞、评论、收藏
     - 涨粉、分享
     - 人均观看时长、弹幕

4. **文档创建**
   - `飞书表格字段配置指南.md` - 字段配置说明
   - `自动化内容生产系统.md` - 系统架构文档
   - `_scripts/check_topics.py` - 查看选题脚本
   - 更新 `README.md` - 添加飞书版说明

### 数据验证

- 表格中已有1条用户录入的选题：
  - 选题："练习感悟啊，就是春节没有怎么练习，然后感觉吃胖了很多，今天的练习有一点钝顿的要接受自己的肥肉"
  - 状态：待设置

### 待完成工作

- [x] NotebookLM文案生成测试（用户要求3个角度）
- [x] 知识库文档创建测试
- [x] 飞书表格状态更新测试
- [ ] 完整工作流跑通

### 遇到的问题

- Plan mode意外激活，导致脚本执行受阻
- 已退出Plan mode，恢复正常操作
- NotebookLM认证过期，已重新认证

### 下一步计划

用户希望：
1. 针对春节练习感悟选题，用NotebookLM生成3个不同角度的文案 ✅
2. 用户自己选择发布哪个版本
3. 后续完善数据记录和状态流转

---

## 项目链接

- **飞书多维表格**：https://my.feishu.cn/base/ORVubUAk3ajAg2s9O0bcIuVbn2b
- **飞书知识库**：https://my.feishu.cn/wiki/JKV9wsajOiPwLvkDJ3zcqu3cnwc
- **NotebookLM笔记本**：80059318-e0e8-4971-95cc-fde4b231d3a0

---

## 技术栈

- 飞书开放平台API（多维表格、云文档）
- NotebookLM-py（Google NotebookLM Python库）
- Python 3.x + requests
- 代理：http://127.0.0.1:7897

---
