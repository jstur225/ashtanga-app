#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成文案 - 一键处理飞书表格中的待生成选题

触发指令: "生成文案"

工作流程 (5步):
1. [读取] 查找飞书表格中 🟡待生成 的选题
2. [生成] 调用NotebookLM生成3个角度的文案
3. [保存] 直接保存到飞书知识库（包含3个角度）
4. [更新] 更新飞书表格两个字段:
   - 状态 → 🟠待审核
   - 文案角度 → 角度1-xxx、角度2-xxx、角度3-xxx
5. [完成] 提示创始人审核

使用方法:
    python generate_content.py

注意:
- 此脚本只处理飞书表格中的选题
- 需要NotebookLM已认证 (storage_state.json)
- 生成的文案直接保存到飞书知识库
"""

import asyncio
import json
import os
import sys
from datetime import datetime

import requests

sys.stdout.reconfigure(encoding='utf-8')

APP_ID = "cli_a91435e1d6f81cc2"
APP_SECRET = "HTPH9VIZvfZm7b9rKNPdKhwnhLIHKBG0"
APP_TOKEN = "ORVubUAk3ajAg2s9O0bcIuVbn2b"
NOTEBOOK_ID = "80059318-e0e8-4971-95cc-fde4b231d3a0"

# 3个推荐角度
DEFAULT_ANGLES = [
    "角度1-对话叙述型",
    "角度2-第二人称提问型",
    "角度6-场景代入型"
]


class ContentGenerator:
    def __init__(self):
        self.token = None
        self.table_id = None
        self.topic_record_id = None
        self.topic_text = None
        self.generated_contents = {}  # angle -> content

    def get_token(self):
        url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
        resp = requests.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET})
        result = resp.json()
        if result.get("code") == 0:
            self.token = result["tenant_access_token"]
            return True
        return False

    def get_table(self):
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables"
        headers = {"Authorization": f"Bearer {self.token}"}
        resp = requests.get(url, headers=headers)
        result = resp.json()
        if result.get("code") == 0:
            self.table_id = result["data"]["items"][0]["table_id"]
            return True
        return False

    def find_pending_topic(self):
        """查找🟡待生成的选题"""
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{self.table_id}/records"
        headers = {"Authorization": f"Bearer {self.token}"}
        resp = requests.get(url, headers=headers, params={"page_size": 500})
        result = resp.json()

        if result.get("code") != 0:
            print(f"[FAIL] 获取记录失败: {result}")
            return False

        records = result["data"]["items"]

        for record in records:
            fields = record.get("fields", {})
            status = fields.get("状态", "")

            # 检查是否是待生成状态
            if "🟡待生成" in str(status) or "待生成" in str(status):
                self.topic_record_id = record["record_id"]
                self.topic_text = fields.get("选题/灵感", "")

                # 处理文本字段格式
                if isinstance(self.topic_text, list) and len(self.topic_text) > 0:
                    if isinstance(self.topic_text[0], dict):
                        self.topic_text = self.topic_text[0].get("text", "")
                    else:
                        self.topic_text = str(self.topic_text[0])

                if self.topic_text:
                    print(f"[OK] 找到待生成选题: {self.topic_text[:50]}...")
                    return True

        print("[WARN] 未找到🟡待生成的选题")
        return False

    def update_feishu_record(self, doc_url=None):
        """更新飞书表格记录"""
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{self.table_id}/records/{self.topic_record_id}"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 构建文案角度字符串
        angle_text = "、".join(self.generated_contents.keys())

        payload = {
            "fields": {
                "状态": "🟠待审核",
                "文案角度": angle_text
            }
        }

        # 如果有知识库链接，也更新
        if doc_url:
            payload["fields"]["知识库链接"] = {"link": doc_url, "text": "查看文案"}

        resp = requests.put(url, headers=headers, json=payload)
        result = resp.json()

        if result.get("code") == 0:
            print("[OK] 飞书表格更新成功")
            print(f"  状态: 🟠待审核")
            print(f"  文案角度: {angle_text}")
            if doc_url:
                print(f"  知识库链接: {doc_url}")
            return True
        else:
            print(f"[FAIL] 更新飞书表格失败: {result}")
            return False

    async def call_notebooklm(self, topic, angle):
        """调用NotebookLM生成文案"""
        try:
            os.environ['HTTP_PROXY'] = 'http://127.0.0.1:7897'
            os.environ['HTTPS_PROXY'] = 'http://127.0.0.1:7897'

            from notebooklm import NotebookLMClient

            async with await NotebookLMClient.from_storage() as client:
                prompt = f"""基于素材库中的"ashtanga-xiaohongshu.md"的8个角度模板，为选题"{topic}"写一篇小红书文案。

要求：
1. 使用 {angle}
2. 引用金句库中的相关金句
3. 符合小红书风格（200-300字，真诚温暖）
4. 包含3个标题选项和正文

请直接输出完整的文案内容。"""

                result = await client.chat.ask(
                    notebook_id=NOTEBOOK_ID,
                    question=prompt
                )
                return result.answer
        except Exception as e:
            print(f"[ERR] NotebookLM调用失败: {e}")
            return None

    def get_wiki_space_id(self):
        """获取知识库ID"""
        wiki_url = "https://open.feishu.cn/open-apis/wiki/v2/spaces"
        headers = {"Authorization": f"Bearer {self.token}"}
        resp = requests.get(wiki_url, headers=headers)
        result = resp.json()

        if result.get("code") == 0:
            items = result.get("data", {}).get("items", [])
            if items:
                return items[0].get("space_id")
        return None

    def find_folder_node(self, space_id, folder_name):
        """查找指定名称的文件夹节点"""
        nodes_url = f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes"
        headers = {"Authorization": f"Bearer {self.token}"}
        resp = requests.get(nodes_url, headers=headers, params={"page_size": 50})
        result = resp.json()

        if result.get("code") == 0:
            items = result.get("data", {}).get("items", [])
            for item in items:
                title = item.get("title", "")
                if folder_name in title or title in folder_name:
                    return item.get("node_token")
        return None

    def create_doc_in_wiki(self, space_id, title, parent_token=None):
        """在知识库中创建文档"""
        # 如果没有指定父节点，查找"02-创作中"文件夹
        if not parent_token:
            parent_token = self.find_folder_node(space_id, "02-创作中")

        # 如果还是没找到，使用知识库的第一个节点
        if not parent_token:
            nodes_url = f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes"
            headers = {"Authorization": f"Bearer {self.token}"}
            resp = requests.get(nodes_url, headers=headers, params={"page_size": 10})
            result = resp.json()

            if result.get("code") != 0 or not result.get("data", {}).get("items"):
                print(f"[FAIL] 无法获取知识库节点: {result}")
                return None

            parent_node = result["data"]["items"][0]
            parent_token = parent_node.get("node_token")

        # 创建文档节点
        create_url = f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes"
        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}
        payload = {
            "parent_node_token": parent_token,
            "node_type": "origin",
            "obj_type": "docx",
            "title": title
        }

        resp = requests.post(create_url, headers=headers, json=payload)
        result = resp.json()

        if result.get("code") == 0:
            doc_token = result["data"]["node"]["obj_token"]
            return doc_token
        else:
            print(f"[FAIL] 创建文档失败: {result}")
            return None

    def add_content_to_doc(self, doc_id, content):
        """添加内容到文档"""
        # 获取root block ID
        blocks_url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks"
        headers = {"Authorization": f"Bearer {self.token}"}
        resp = requests.get(blocks_url, headers=headers)
        result = resp.json()

        if result.get("code") != 0:
            print(f"[FAIL] 无法获取文档blocks: {result}")
            return 0

        root_block_id = result["data"]["items"][0]["block_id"]

        # 添加内容的API URL
        create_url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{root_block_id}/children"
        headers = {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}

        lines = content.split('\n')
        success_count = 0

        for line in lines:
            line = line.strip()
            if not line or line == '---':
                continue

            # 根据行内容构建block
            if line.startswith('# '):
                payload = {
                    "children": [{
                        "block_type": 3,
                        "heading1": {"elements": [{"text_run": {"content": line[2:]}}]}
                    }]
                }
            elif line.startswith('## '):
                payload = {
                    "children": [{
                        "block_type": 4,
                        "heading2": {"elements": [{"text_run": {"content": line[3:]}}]}
                    }]
                }
            elif line.startswith('### '):
                payload = {
                    "children": [{
                        "block_type": 5,
                        "heading3": {"elements": [{"text_run": {"content": line[4:]}}]}
                    }]
                }
            else:
                payload = {
                    "children": [{
                        "block_type": 2,
                        "text": {"elements": [{"text_run": {"content": line}}]}
                    }]
                }

            resp = requests.post(create_url, headers=headers, json=payload)
            result = resp.json()

            if result.get("code") == 0:
                success_count += 1

        return success_count

    def save_to_feishu_kb(self, date):
        """保存到飞书知识库"""
        # 获取知识库ID
        space_id = self.get_wiki_space_id()
        if not space_id:
            print("[FAIL] 无法获取知识库")
            return None

        # 构建文档标题
        safe_topic = "".join(c for c in self.topic_text[:20] if c.isalnum() or c in "_-")
        doc_title = f"{safe_topic} - 3个角度文案"

        # 构建包含3个角度的文档内容
        content_sections = []
        for i, (angle, content) in enumerate(self.generated_contents.items(), 1):
            content_sections.append(f"""
## {angle}

{content}
""")

        file_content = f"""# {self.topic_text} - 3个角度文案

选题主题: {self.topic_text}
状态: 🟠待审核
文案角度: {"、".join(self.generated_contents.keys())}
排期日期: {date}

{chr(10).join(content_sections)}

---

## 发布建议

**推荐选择：**
- 角度1（对话叙述型）：适合有具体故事感的场景，更容易引起共鸣
- 角度2（第二人称提问型）：互动性强，适合引发评论
- 角度6（场景代入型）：代入感强，适合产品推广

**配图建议：**
- 春节后的练习场景（自己的身体感受）
- app截图（热力图、觉察日记界面）
- 对比图（春节前后练习状态）

---

生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M")}
NotebookLM笔记本: {NOTEBOOK_ID}
"""

        # 创建文档（自动放在 02-创作中 目录下）
        doc_id = self.create_doc_in_wiki(space_id, doc_title)
        if not doc_id:
            return None
        print(f"[OK] 文档已创建在 '02-创作中' 目录")

        # 添加内容
        count = self.add_content_to_doc(doc_id, file_content)
        if count == 0:
            print("[WARN] 内容添加失败")

        return doc_id, doc_title


async def main():
    print("="*60)
    print("小红书内容生成器 - 自动流程")
    print("="*60)

    gen = ContentGenerator()

    # 1. 飞书认证
    if not gen.get_token():
        print("[FAIL] 飞书认证失败")
        return
    print("[OK] 飞书认证成功")

    # 2. 获取表格
    if not gen.get_table():
        print("[FAIL] 获取表格失败")
        return
    print(f"[OK] 获取表格成功")

    # 3. 查找待生成选题
    print("\n" + "-"*60)
    print("[1/5] 查找🟡待生成的选题...")
    if not gen.find_pending_topic():
        print("[INFO] 没有待生成的选题，流程结束")
        return

    # 4. 生成3个角度的文案
    print("\n" + "-"*60)
    print("[2/5] 生成3个角度的文案...")
    print("-"*60)

    for angle in DEFAULT_ANGLES:
        print(f"\n生成 {angle}...")
        content = await gen.call_notebooklm(gen.topic_text, angle)
        if content:
            gen.generated_contents[angle] = content
            print(f"[OK] {angle} 生成完成")
        else:
            print(f"[FAIL] {angle} 生成失败")

    if not gen.generated_contents:
        print("[FAIL] 所有角度生成失败，流程终止")
        return

    # 5. 保存到飞书知识库
    print("\n" + "-"*60)
    print("[3/5] 保存到飞书知识库...")
    date = datetime.now().strftime("%Y-%m-%d")
    result = gen.save_to_feishu_kb(date)
    if not result:
        print("[FAIL] 保存到知识库失败")
        return
    doc_id, doc_title = result
    doc_url = f"https://my.feishu.cn/docx/{doc_id}"
    print(f"[OK] 文档已创建: {doc_title}")
    print(f"[OK] 知识库链接: {doc_url}")

    # 6. 更新飞书表格
    print("\n" + "-"*60)
    print("[4/5] 更新飞书表格...")
    gen.update_feishu_record(doc_url)

    # 7. 完成
    print("\n" + "="*60)
    print("[5/5] 处理完成!")
    print("="*60)
    print(f"\n选题: {gen.topic_text[:50]}...")
    print(f"生成角度: {len(gen.generated_contents)} 个")
    print(f"知识库文档: {doc_url}")
    print(f"\n飞书表格状态: 🟠待审核")
    print(f"请在飞书知识库中查看3个角度的文案，选择要发布的版本")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(main())
