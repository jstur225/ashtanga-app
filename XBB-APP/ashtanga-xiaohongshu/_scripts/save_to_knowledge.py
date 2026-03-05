#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
保存文案到飞书知识库

触发指令: "保存到知识库"

工作流程:
1. 读取Obsidian中的文案文件
2. 在飞书知识库创建文档
3. 更新飞书表格的"知识库链接"字段
"""

import os
import sys
import re
import requests

sys.stdout.reconfigure(encoding='utf-8')

APP_ID = "cli_a91435e1d6f81cc2"
APP_SECRET = "HTPH9VIZvfZm7b9rKNPdKhwnhLIHKBG0"
APP_TOKEN = "ORVubUAk3ajAg2s9O0bcIuVbn2b"
FOLDER_TOKEN = "JKV9wsajOiPwLvkDJ3zcqu3cnwc"  # 知识库folder_token


class KnowledgeBaseSaver:
    def __init__(self):
        self.token = None
        self.table_id = None

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

    def find_topic_record(self, topic_keyword):
        """查找选题记录"""
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{self.table_id}/records"
        headers = {"Authorization": f"Bearer {self.token}"}
        resp = requests.get(url, headers=headers, params={"page_size": 500})
        result = resp.json()

        if result.get("code") != 0:
            return None, None

        records = result["data"]["items"]

        for record in records:
            fields = record.get("fields", {})
            topic_value = fields.get("选题/灵感", "")

            # 处理文本字段格式
            if isinstance(topic_value, list) and len(topic_value) > 0:
                if isinstance(topic_value[0], dict):
                    topic_text = topic_value[0].get("text", "")
                else:
                    topic_text = str(topic_value[0])
            else:
                topic_text = str(topic_value)

            if topic_keyword in topic_text:
                return record["record_id"], topic_text

        return None, None

    def read_obsidian_content(self, filename):
        """读取Obsidian文件内容"""
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        filepath = os.path.join(base_dir, "01-内容生产", "01-待深化的选题", filename)

        if not os.path.exists(filepath):
            print(f"[ERR] 文件不存在: {filepath}")
            return None

        with open(filepath, 'r', encoding='utf-8') as f:
            return f.read()

    def create_doc(self, title, content):
        """在飞书知识库创建文档"""
        # 1. 创建文档
        url = "https://open.feishu.cn/open-apis/docx/v1/documents"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        payload = {
            "title": title,
            "folder_token": FOLDER_TOKEN
        }

        resp = requests.post(url, headers=headers, json=payload)
        result = resp.json()

        if result.get("code") != 0:
            print(f"[FAIL] 创建文档失败: {result}")
            return None

        doc_id = result["data"]["document"]["document_id"]
        print(f"[OK] 创建文档: {title}")
        print(f"  文档ID: {doc_id}")

        # 2. 添加内容
        self._add_content(doc_id, content)

        # 3. 返回文档链接
        doc_url = f"https://my.feishu.cn/docx/{doc_id}"
        return doc_url

    def _add_content(self, doc_id, content):
        """向文档添加内容"""
        url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        # 将内容分段，每段创建一个block
        lines = content.split('\n')
        children = []

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # 处理标题
            if line.startswith('# '):
                children.append({
                    "block_type": 1,  # 标题1
                    "heading1": {
                        "elements": [{"type": "textRun", "textRun": {"content": line[2:]}}]
                    }
                })
            elif line.startswith('## '):
                children.append({
                    "block_type": 3,  # 标题2
                    "heading2": {
                        "elements": [{"type": "textRun", "textRun": {"content": line[3:]}}]
                    }
                })
            elif line.startswith('### '):
                children.append({
                    "block_type": 5,  # 标题3
                    "heading3": {
                        "elements": [{"type": "textRun", "textRun": {"content": line[4:]}}]
                    }
                })
            else:
                # 普通段落
                children.append({
                    "block_type": 2,  # 段落
                    "paragraph": {
                        "elements": [{"type": "textRun", "textRun": {"content": line}}]
                    }
                })

        # 分批添加（每批最多50个block）
        batch_size = 50
        for i in range(0, len(children), batch_size):
            batch = children[i:i + batch_size]
            payload = {"children": batch}

            resp = requests.post(url, headers=headers, json=payload)
            result = resp.json()

            if result.get("code") != 0:
                print(f"[WARN] 添加内容部分失败: {result.get('msg', 'unknown error')}")

    def update_record_link(self, record_id, doc_url):
        """更新飞书表格的知识库链接"""
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{self.table_id}/records/{record_id}"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

        payload = {
            "fields": {
                "知识库链接": {"link": doc_url, "text": "查看文案"}
            }
        }

        resp = requests.put(url, headers=headers, json=payload)
        result = resp.json()

        if result.get("code") == 0:
            print(f"[OK] 更新知识库链接成功")
            return True
        else:
            print(f"[FAIL] 更新知识库链接失败: {result}")
            return False


def main():
    print("=" * 60)
    print("保存文案到飞书知识库")
    print("=" * 60)

    saver = KnowledgeBaseSaver()

    # 1. 认证
    if not saver.get_token():
        print("[FAIL] 飞书认证失败")
        return
    print("[OK] 飞书认证成功")

    # 2. 获取表格
    if not saver.get_table():
        print("[FAIL] 获取表格失败")
        return
    print("[OK] 获取表格成功")

    # 3. 查找选题
    print("\n" + "-" * 60)
    print("[1/4] 查找选题...")
    record_id, topic_text = saver.find_topic_record("春节练习感悟")

    if not record_id:
        # 尝试用"春节"关键词查找
        record_id, topic_text = saver.find_topic_record("春节")

    if not record_id:
        print("[ERR] 未找到包含'春节'的选题")
        print("[INFO] 请检查飞书表格中是否有该选题")
        return

    print(f"[OK] 找到选题: {topic_text[:50]}...")

    # 4. 读取Obsidian文件
    print("\n" + "-" * 60)
    print("[2/4] 读取Obsidian文件...")

    filename = "春节练习感悟_2026-02-25.md"
    content = saver.read_obsidian_content(filename)

    if not content:
        print("[FAIL] 读取文件失败")
        return

    print(f"[OK] 读取文件成功 ({len(content)} 字符)")

    # 5. 创建知识库文档
    print("\n" + "-" * 60)
    print("[3/4] 创建知识库文档...")

    doc_title = f"春节练习感悟 - 3个角度文案 ({topic_text[:20]}...)"
    doc_url = saver.create_doc(doc_title, content)

    if not doc_url:
        print("[FAIL] 创建知识库文档失败")
        return

    print(f"[OK] 知识库文档链接: {doc_url}")

    # 6. 更新飞书表格
    print("\n" + "-" * 60)
    print("[4/4] 更新飞书表格...")
    saver.update_record_link(record_id, doc_url)

    # 7. 完成
    print("\n" + "=" * 60)
    print("完成!")
    print("=" * 60)
    print(f"\n文档已保存到飞书知识库:")
    print(f"  {doc_url}")
    print(f"\n飞书表格已更新知识库链接")
    print("=" * 60)


if __name__ == "__main__":
    main()
