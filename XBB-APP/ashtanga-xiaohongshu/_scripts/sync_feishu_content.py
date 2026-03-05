#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
飞书多维表格 ↔ 知识库/Obsidian 同步脚本
功能：
1. 读取飞书表格中的选题
2. 在知识库创建文档
3. 调用NotebookLM生成文案
4. 更新飞书表格状态
"""

import asyncio
import json
import os
import sys
from datetime import datetime
from typing import Optional

import requests

# 设置stdout编码
sys.stdout.reconfigure(encoding='utf-8')

# 飞书API配置
APP_ID = "cli_a91435e1d6f81cc2"
APP_SECRET = "HTPH9VIZvfZm7b9rKNPdKhwnhLIHKBG0"
APP_TOKEN = "ORVubUAk3ajAg2s9O0bcIuVbn2b"

# NotebookLM配置
NOTEBOOK_ID = "80059318-e0e8-4971-95cc-fde4b231d3a0"

class FeishuSync:
    def __init__(self):
        self.token = None
        self.table_id = None
        self.field_map = {}  # 字段名 -> field_id

    def get_tenant_token(self) -> Optional[str]:
        """获取tenant_access_token"""
        url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
        payload = {"app_id": APP_ID, "app_secret": APP_SECRET}

        resp = requests.post(url, json=payload)
        result = resp.json()

        if result.get("code") == 0:
            self.token = result["tenant_access_token"]
            return self.token
        else:
            print(f"[FAIL] 认证失败: {result}")
            return None

    def get_table_info(self) -> bool:
        """获取表格信息"""
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables"
        headers = {"Authorization": f"Bearer {self.token}"}

        resp = requests.get(url, headers=headers)
        result = resp.json()

        if result.get("code") == 0:
            tables = result["data"]["items"]
            if tables:
                self.table_id = tables[0]["table_id"]
                print(f"[OK] 表格: {tables[0]['name']} (ID: {self.table_id})")
                return True
        print(f"[FAIL] 获取表格失败: {result}")
        return False

    def get_fields(self) -> bool:
        """获取字段列表，建立字段名到ID的映射"""
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{self.table_id}/fields"
        headers = {"Authorization": f"Bearer {self.token}"}

        resp = requests.get(url, headers=headers)
        result = resp.json()

        if result.get("code") == 0:
            for field in result["data"]["items"]:
                self.field_map[field["field_name"]] = field["field_id"]
            print(f"[OK] 获取到 {len(self.field_map)} 个字段")
            return True
        print(f"[FAIL] 获取字段失败: {result}")
        return False

    def get_records(self, status_filter: Optional[str] = None) -> list:
        """获取记录列表"""
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{self.table_id}/records"
        headers = {"Authorization": f"Bearer {self.token}"}

        params = {"page_size": 500}
        if status_filter and "状态" in self.field_map:
            # 使用 filter 参数过滤状态
            field_id = self.field_map["状态"]
            params["filter"] = json.dumps({
                "field": field_id,
                "operator": "is",
                "value": status_filter
            })

        resp = requests.get(url, headers=headers, params=params)
        result = resp.json()

        if result.get("code") == 0:
            return result["data"]["items"]
        print(f"[FAIL] 获取记录失败: {result}")
        return []

    def update_record(self, record_id: str, fields: dict) -> bool:
        """更新记录"""
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{self.table_id}/records/{record_id}"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 转换字段名到field_id
        payload_fields = {}
        for name, value in fields.items():
            if name in self.field_map:
                field_id = self.field_map[name]
                payload_fields[field_id] = {"value": value}

        payload = {"fields": payload_fields}

        resp = requests.put(url, headers=headers, json=payload)
        result = resp.json()

        if result.get("code") == 0:
            return True
        print(f"[FAIL] 更新记录失败: {result}")
        return False

    def create_knowledge_doc(self, title: str, content: str) -> Optional[str]:
        """在飞书知识库创建文档"""
        # 使用飞书文档API创建
        url = "https://open.feishu.cn/open-apis/docx/v1/documents"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 创建文档
        payload = {
            "title": title,
            "folder_token": "JKV9wsajOiPwLvkDJ3zcqu3cnwc"  # 知识库folder_token
        }

        resp = requests.post(url, headers=headers, json=payload)
        result = resp.json()

        if result.get("code") == 0:
            doc_id = result["data"]["document"]["document_id"]
            print(f"[OK] 创建文档: {title} (ID: {doc_id})")

            # 添加内容
            self._add_doc_content(doc_id, content)

            # 获取文档链接
            return f"https://my.feishu.cn/docx/{doc_id}"
        else:
            print(f"[FAIL] 创建文档失败: {result}")
            return None

    def _add_doc_content(self, doc_id: str, content: str):
        """向文档添加内容"""
        url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 创建段落块
        payload = {
            "children": [
                {
                    "block_type": 2,  # 段落
                    "paragraph": {
                        "elements": [
                            {
                                "type": "textRun",
                                "textRun": {"content": content}
                            }
                        ]
                    }
                }
            ]
        }

        resp = requests.post(url, headers=headers, json=payload)
        result = resp.json()
        if result.get("code") != 0:
            print(f"[WARN] 添加文档内容可能失败: {result}")

    async def generate_content_with_notebooklm(self, topic: str, angle: str) -> Optional[str]:
        """使用NotebookLM生成文案"""
        try:
            # 设置代理
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
            print(f"[FAIL] NotebookLM生成失败: {e}")
            return None

    def sync_to_obsidian(self, topic: str, content: str, angle: str, date: str) -> str:
        """同步到Obsidian（创建本地Markdown文件）"""
        # 构建文件路径
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        target_dir = os.path.join(base_dir, "01-内容生产", "01-待深化的选题")

        # 确保目录存在
        os.makedirs(target_dir, exist_ok=True)

        # 文件名
        filename = f"{topic}_{date}.md"
        filepath = os.path.join(target_dir, filename)

        # 文件内容
        file_content = f"""---
选题主题: {topic}
状态: 🟠待审核
文案角度: {angle}
排期日期: {date}
类型: 产品推广
---

# {topic}

## 标题选项

（NotebookLM生成）

## 正文

{content}

## 数据复盘

| 指标 | 数值 |
|------|------|
| 阅读量 | - |
| 点赞 | - |
| 收藏 | - |
| 评论 | - |

---

*生成时间: {datetime.now().strftime("%Y-%m-%d %H:%M")}*
"""

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(file_content)

        print(f"[OK] 创建Obsidian文件: {filepath}")
        return filepath

    def list_pending_topics(self) -> list:
        """列出待处理的选题"""
        if not self.get_tenant_token():
            return []
        if not self.get_table_info():
            return []
        if not self.get_fields():
            return []

        records = self.get_records()
        pending = []

        for record in records:
            fields = record.get("fields", {})
            # 解析字段（需要根据实际field_id反查字段名）
            topic_data = {
                "record_id": record["record_id"],
                "fields": fields
            }
            pending.append(topic_data)

        return pending

    async def process_topic(self, record_id: str, topic: str, angle: str, date: str):
        """处理单个选题：生成文案并更新状态"""
        print(f"\n开始处理选题: {topic}")
        print(f"角度: {angle}")
        print(f"排期: {date}")

        # 1. 使用NotebookLM生成文案
        print("\n[1/4] 调用NotebookLM生成文案...")
        content = await self.generate_content_with_notebooklm(topic, angle)
        if not content:
            print("[FAIL] 文案生成失败")
            return False

        print("[OK] 文案生成完成")

        # 2. 创建知识库文档
        print("\n[2/4] 在知识库创建文档...")
        doc_url = self.create_knowledge_doc(f"{topic}_{date}", content)
        if doc_url:
            print(f"[OK] 文档链接: {doc_url}")
        else:
            doc_url = ""

        # 3. 同步到Obsidian
        print("\n[3/4] 同步到Obsidian...")
        self.sync_to_obsidian(topic, content, angle, date)

        # 4. 更新飞书表格状态
        print("\n[4/4] 更新飞书表格...")
        update_fields = {
            "状态": "🟠待审核",
            "知识库链接": doc_url
        }
        if self.update_record(record_id, update_fields):
            print("[OK] 状态已更新为 🟠待审核")
        else:
            print("[FAIL] 状态更新失败")

        return True


def main():
    """主函数 - 显示待处理选题列表"""
    sync = FeishuSync()

    if not sync.get_tenant_token():
        return
    if not sync.get_table_info():
        return
    if not sync.get_fields():
        return

    print("\n" + "="*60)
    print("飞书多维表格选题同步系统")
    print("="*60)

    # 获取所有记录
    records = sync.get_records()

    print(f"\n共有 {len(records)} 条记录\n")

    # 显示记录
    for i, record in enumerate(records, 1):
        fields = record.get("fields", {})
        # 显示原始字段数据
        print(f"[{i}] Record ID: {record['record_id']}")
        for field_id, value in fields.items():
            print(f"    {field_id}: {value}")
        print()

    print("\n使用示例:")
    print("  python sync_feishu_content.py --generate <record_id>")
    print("  或调用 process_topic(record_id, topic, angle, date)")


if __name__ == "__main__":
    main()
