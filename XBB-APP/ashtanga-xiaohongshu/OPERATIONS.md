# 小红书内容生产 - 操作手册

本文档供 Claude Code 使用，包含完整的工作流程、技术规范和操作指令。

---

## 一、团队角色定义

| 角色        | 成员          | 职责                          | 绝对不做        |
| --------- | ----------- | --------------------------- | ----------- |
| **创始人**   | orange      | 选题决策、文案审核、最终发布、数据复盘         | 不写文案、不操作文件  |
| **文案创作者** | NotebookLM  | 基于素材库写文案、生成标题、优化表达          | 不管理状态、不操作文件 |
| **监督执行者** | Claude Code | 流程管理、调用NotebookLM、文件操作、状态更新 | **绝对不写文案**  |

---

## 二、触发指令

| 创始人说 | Claude Code 执行 |
|---------|-----------------|
| "生成文案" | 找🟡选题 → 调用NotebookLM生成 → 同步飞书 → 更新状态（**默认只处理🟡待生成状态，不再询问**） |
| "保存到知识库" | 读取文案 → 创建飞书文档 → 更新知识库链接 |
| "让LM重写 [要求]" | 重新调用LM生成 → 更新文档 → 保持🟠待审核 |
| "我发布了 [链接]" | 更新链接 → 状态改🔵已发布 → 提醒填数据 |
| "列表" | 显示所有选题状态统计 |

---

## 三、工作流程

### Step 1: 生成文案

**前提**：飞书表格中有 🟡待生成 状态的选题

**执行步骤**:
1. 读取飞书表格中 🟡待生成 的选题
2. 调用 NotebookLM API 生成文案（**不是Claude写**）
3. 保存文案到本地文件
4. 同步到飞书知识库
5. **更新飞书表格**：状态改为 🟠待审核，添加知识库链接

### Step 2: 审核与发布

- 创始人在飞书知识库查看文案
- ✅ 通过 → 创始人说"我发布了 + 链接" → Claude更新状态为 🔵已发布
- ❌ 不通过 → 创始人说"让LM重写，要求XXX" → 重新调用NotebookLM

---

## 四、状态流转规则（固化）

| 状态 | 含义 | 触发条件 |
|------|------|----------|
| 🟡待生成 | 等待NotebookLM生成文案 | 在多维表格新建选题后 |
| 🟠待审核 | 文案已同步到飞书知识库，等待审核 | **本脚本同步后自动设置** |
| 🟢待发布 | 审核通过，等待排期发布 | 人工审核通过后手动设置 |
| 🔵已发布 | 已发布到小红书 | 发布完成后手动设置 |
| ⏸️暂停 | 暂时搁置 | 人工判断后手动设置 |

**流转路径：**
```
🟡待生成 → [NotebookLM生成] → 🟠待审核 → [人工审核] → 🟢待发布 → [发布] → 🔵已发布
                                           ↓
                                        ⏸️暂停
```

---

## 五、格式规范（固化）

### 1. NotebookLM 输入格式

**正确格式**：
```
以"[主题内容]"为主题，帮我写2个不同角度的小红书文案
```

**错误格式**：
```
马年的第一练，过年吃胖了几斤...
请用角度1-对话叙述型写一篇小红书文案，要求口语化、真诚、有画面感。
```

### 2. 禁止使用 Markdown 加粗语法 `**`
- 飞书文档和小红书都不支持 `**` 加粗格式
- 标题直接写文字，不要加 `**`
- 需要强调的地方使用 emoji 或纯文字

### 3. 文档内容规范（固化）

**【2个必须固化的关键点】**

#### 必须包含 📋 选题状态管理区块

每个同步到飞书知识库的文档，**必须在文档最顶部**添加：

```
📋 选题状态管理
─────────────────
当前状态：🟠待审核
👉 点击修改状态: [链接到多维表格]
─────────────────

[文案内容...]
```

**技术实现**：
- 代码位置：`sync_generated_to_feishu.py` 的 `add_status_management_block()` 函数
- 逐个添加block（避免批量API的invalid param错误）
- 不使用空elements数组（会导致API错误）

#### 必须保留表情符号
- ✅ 标题中的表情：**必须保留**（如 🟢2026的垫上时光、🌱马年第一练）
- ✅ 正文中的表情：**必须保留**（如 ✨🙏💚🍀等）
- ✅ 列表标记中的表情：**必须保留**（如 ✅ 免费无广告）
- ❌ 不要删除或替换为文字描述

---

## 六、notebooklm-py 技能文档

### 简介

`notebooklm-py` 是 NotebookLM 的 Python 客户端，用于通过代码方式与 NotebookLM 交互。

### 安装与认证

```bash
# 安装
pip install notebooklm

# 登录（仅需一次）
notebooklm login

# Windows 下如果命令找不到，使用完整路径
& "C:\Users\BIN\AppData\Roaming\Python\Python314\Scripts\notebooklm.exe" login

# 验证
notebooklm whoami
```

**登录步骤**：
1. 运行登录命令后会打开 Chrome 浏览器
2. 完成 Google 账号登录
3. 等待看到 NotebookLM 首页
4. 回到终端按 ENTER 保存认证

**认证信息存储**：`C:\Users\{用户名}\.notebooklm\storage_state.json`

### 常用命令

```bash
# 列出所有笔记本
notebooklm list

# 切换到阿斯汤加笔记本
notebooklm use 80059318-e0e8-4971-95cc-fde4b231d3a0

# 查看当前笔记本
notebooklm current
```

### Python API 使用（推荐）

**保存到文件**：
```python
import asyncio
import sys
import io
from notebooklm import NotebookLMClient

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

async def send_topic():
    async with await NotebookLMClient.from_storage() as client:
        result = await client.chat.ask(
            notebook_id='80059318-e0e8-4971-95cc-fde4b231d3a0',
            question='以"[主题内容]"为主题，帮我写2个不同角度的小红书文案'
        )
        with open('notebooklm_response.md', 'w', encoding='utf-8') as f:
            f.write(result.answer)
        print('已保存到 notebooklm_response.md')

asyncio.run(send_topic())
```

### 故障排查

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `Authentication required` | 认证过期 | 重新运行 `notebooklm login` |
| `Notebook not found` | notebook_id 错误 | 检查ID是否正确 |
| 请求超时 | 生成内容过长 | 使用 Python API 而非 CLI |
| 中文乱码 | 编码问题 | 确保文件使用 UTF-8 编码 |

---

## 七、同步流程（固化）

### 主方案：notebooklm-py（推荐）

```bash
# 1. 切换到阿斯汤加笔记本
notebooklm use 80059318-e0e8-4971-95cc-fde4b231d3a0

# 2. 发送主题（Python API方式，避免超时）
python send_to_notebooklm.py

# 3. 同步到飞书
python sync_generated_to_feishu.py
```

### 完整流程步骤

1. 读取飞书表格中 🟡待生成 的选题
2. 发送主题到NotebookLM（格式：以"xxx"为主题，帮我写2个不同角度的小红书文案）
3. NotebookLM生成文案（已内置提示词，会自动输出2个角度）
4. **保留表情符号**（✅💚🌱🙏等）——**不可删除**
5. 移除所有 `**` 格式
6. 创建文档到"📁 02-创作中"
7. **添加 📋 选题状态管理区块**（在文档最顶部）
8. **更新原记录**：状态从🟡待生成 → 🟠待审核，添加知识库链接

### 降级方案：MCP + Chrome（备用）

当 notebooklm-py 遇到问题时使用（认证过期、API限制等）。

---

## 八、飞书配置

### 文档存放位置
- 新创建的文案文档必须放在"📁 02-创作中"文件夹下
- Node Token: `UkvnwPEwoioBXxkd0RXcINlcnqd`

### 飞书表格字段
- 选题/灵感: 文本字段
- 状态: 单选字段（🟡待生成/🟠待审核/🟢待发布/🔵已发布/⏸️暂停）
- 知识库链接: 链接字段
- 最后更新数据时间: 文本字段（记录数据抓取时间）

### 飞书 API 字段创建格式（重要）

**正确格式**（扁平化结构）：
```python
payload = {
    "field_name": "字段名称",
    "type": 1  # 1=文本, 2=数字, 5=日期, ...
}
```

**错误格式**（嵌套 field 对象）：
```python
# ❌ 不要这样写
payload = {
    "field": {
        "field_name": "字段名称",
        "type": 1
    }
}
```

### 项目链接
- **飞书多维表格**：https://my.feishu.cn/base/ORVubUAk3ajAg2s9O0bcIuVbn2b
- **飞书知识库**：https://my.feishu.cn/wiki/JKV9wsajOiPwLvkDJ3zcqu3cnwc
- **NotebookLM笔记本**：80059318-e0e8-4971-95cc-fde4b231d3a0

---

## 九、关键规则

### 规则1: Claude Code 绝不写文案
- 所有文案必须由 NotebookLM 生成
- Claude Code 只负责：调用API、保存文件、更新状态
- 如果 NotebookLM 不可用，流程暂停，告知创始人

### 规则4: 默认只处理 🟡待生成 状态的选题
- 当创始人说"生成文案"时，**自动处理所有🟡待生成状态的选题**
- 不再询问"只生成待生成还是全部"
- 🔵已发布、🟠待审核、🟢待发布的选题不会重复生成

### 规则2: 创始人不操作文件
- 不手动改文件状态
- 不手动移动文件
- 所有文件操作由监督执行者完成

### 规则3: NotebookLM 不管理状态
- NotebookLM 只负责创作内容
- 不感知流程状态
- 由监督执行者传参调用

---

## 十、项目目录

```
XBB-APP/ashtanga-xiaohongshu/
├── 01-内容生产/
│   ├── 选题管理/
│   ├── 01-待深化的选题/     # 🟠 待审核
│   └── 02-已发布的选题/     # 🔵 已发布
├── 02-业务运营/
├── 内容素材库/              # NotebookLM 的知识源
├── 方法论沉淀/
├── 内容数据统计/
├── _scripts/                # 自动化脚本
├── OPERATIONS.md            # 本文件（操作手册）
├── README.md               # 项目首页
└── PROJECT_LOG.md          # 开发日志
```

---

**创建日期**: 2026-02-26
**版本**: v2.0（整合版）
