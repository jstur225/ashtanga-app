#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复飞书文档内容
"""

import os
import sys
import requests

# 强制UTF-8输出
sys.stdout.reconfigure(encoding='utf-8')
os.environ['PYTHONUTF8'] = '1'

APP_ID = "cli_a91435e1d6f81cc2"
APP_SECRET = "HTPH9VIZvfZm7b9rKNPdKhwnhLIHKBG0"
APP_TOKEN = "ORVubUAk3ajAg2s9O0bcIuVbn2b"


def get_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    resp = requests.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET})
    return resp.json()["tenant_access_token"]


def read_content():
    filepath = "D:/BaiduSyncdisk/work/cursor app/claude code/XBB-APP/ashtanga-xiaohongshu/01-内容生产/01-待深化的选题/春节练习感悟_2026-02-25.md"
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()


def create_doc(token):
    url = "https://open.feishu.cn/open-apis/docx/v1/documents"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {"title": "春节练习感悟 - 3个角度文案"}
    resp = requests.post(url, headers=headers, json=payload)
    result = resp.json()
    return result["data"]["document"]["document_id"]


def add_text_block(token, doc_id, text):
    """添加纯文本段落"""
    url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    payload = {
        "children": [
            {
                "block_type": 2,
                "paragraph": {
                    "elements": [
                        {"type": "textRun", "textRun": {"content": text}}
                    ]
                }
            }
        ]
    }

    resp = requests.post(url, headers=headers, json=payload)
    return resp.json()


def add_heading1(token, doc_id, text):
    """添加标题1"""
    url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    payload = {
        "children": [
            {
                "block_type": 1,
                "heading1": {
                    "elements": [
                        {"type": "textRun", "textRun": {"content": text}}
                    ]
                }
            }
        ]
    }

    resp = requests.post(url, headers=headers, json=payload)
    return resp.json()


def add_heading2(token, doc_id, text):
    """添加标题2"""
    url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    payload = {
        "children": [
            {
                "block_type": 3,
                "heading2": {
                    "elements": [
                        {"type": "textRun", "textRun": {"content": text}}
                    ]
                }
            }
        ]
    }

    resp = requests.post(url, headers=headers, json=payload)
    return resp.json()


def update_table(token, doc_url):
    """更新飞书表格"""
    record_id = "recNvwmCyK"
    table_id = "tblHnoAMur4hffED"

    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{table_id}/records/{record_id}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    payload = {
        "fields": {
            "知识库链接": {"link": doc_url, "text": "查看文案"}
        }
    }

    resp = requests.put(url, headers=headers, json=payload)
    return resp.json()


def main():
    print("=" * 60)
    print("修复飞书文档内容")
    print("=" * 60)

    # 获取token
    token = get_token()
    print("[OK] 获取token成功")

    # 读取内容
    content = read_content()
    print(f"[OK] 读取文件成功 ({len(content)} 字符)")

    # 创建新文档
    doc_id = create_doc(token)
    print(f"[OK] 创建文档: {doc_id}")

    # 解析内容并添加
    lines = content.split('\n')
    success_count = 0

    for line in lines:
        line = line.strip()
        if not line or line == '---':
            continue

        try:
            if line.startswith('# '):
                result = add_heading1(token, doc_id, line[2:])
                if result.get('code') == 0:
                    success_count += 1
            elif line.startswith('## '):
                result = add_heading2(token, doc_id, line[3:])
                if result.get('code') == 0:
                    success_count += 1
            else:
                result = add_text_block(token, doc_id, line)
                if result.get('code') == 0:
                    success_count += 1
        except Exception as e:
            print(f"[WARN] 添加失败: {line[:30]}... - {e}")

    print(f"[OK] 成功添加 {success_count} 个内容块")

    # 获取文档链接
    doc_url = f"https://my.feishu.cn/docx/{doc_id}"
    print(f"[OK] 文档链接: {doc_url}")

    # 更新飞书表格
    result = update_table(token, doc_url)
    if result.get('code') == 0:
        print("[OK] 飞书表格已更新")
    else:
        print(f"[WARN] 表格更新失败: {result}")

    print("\n" + "=" * 60)
    print("完成!")
    print(f"文档链接: {doc_url}")
    print("=" * 60)


if __name__ == "__main__":
    main()
