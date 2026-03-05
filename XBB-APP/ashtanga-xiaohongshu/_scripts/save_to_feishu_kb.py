#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
保存文案到飞书知识库

触发指令: "保存到知识库"

工作流程:
1. 读取Obsidian中的文案文件
2. 在飞书知识库创建文档
3. 添加内容到文档 (使用正确的字段名: text, text_run)
4. 更新飞书表格的"知识库链接"字段

正确的API字段名:
- block_type: 2=text, 3=heading1, 4=heading2, 5=heading3
- 字段名: text (不是 textRun)
- 元素字段: text_run (不是 textRun)
"""

import os
import sys
import requests

sys.stdout.reconfigure(encoding='utf-8')

APP_ID = "cli_a91435e1d6f81cc2"
APP_SECRET = "HTPH9VIZvfZm7b9rKNPdKhwnhLIHKBG0"
APP_TOKEN = "ORVubUAk3ajAg2s9O0bcIuVbn2b"


def get_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    resp = requests.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET})
    return resp.json()["tenant_access_token"]


def get_wiki_space_id(token):
    """获取知识库ID"""
    wiki_url = "https://open.feishu.cn/open-apis/wiki/v2/spaces"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(wiki_url, headers=headers)
    result = resp.json()

    if result.get("code") == 0:
        items = result.get("data", {}).get("items", [])
        if items:
            return items[0].get("space_id")
    return None


def create_doc_in_wiki(token, space_id, title):
    """在知识库中创建文档"""
    # 先获取知识库的第一个节点作为父节点
    nodes_url = f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(nodes_url, headers=headers, params={"page_size": 10})
    result = resp.json()

    if result.get("code") != 0 or not result.get("data", {}).get("items"):
        print(f"[FAIL] 无法获取知识库节点: {result}")
        return None

    parent_node = result["data"]["items"][0]
    parent_token = parent_node.get("node_token")

    # 创建文档节点
    create_url = f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
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


def add_status_management_block(token, doc_id, record_id, current_status="🟠待审核"):
    """在文档顶部添加状态管理区块"""
    # 获取root block ID
    blocks_url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(blocks_url, headers=headers)
    result = resp.json()

    if result.get("code") != 0:
        print(f"[WARN] 无法获取文档blocks: {result}")
        return False

    root_block_id = result["data"]["items"][0]["block_id"]
    create_url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{root_block_id}/children"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 构建表格记录链接（直接跳转到对应记录行）
    table_id = "tblHnoAMur4hffED"
    base_url = f"https://my.feishu.cn/base/{APP_TOKEN}"
    record_url = f"{base_url}?table={table_id}&record={record_id}"

    # 构建状态管理区块内容
    status_blocks = [
        # 标题: 📋 选题状态管理
        {
            "block_type": 4,
            "heading2": {"elements": [{"text_run": {"content": "📋 选题状态管理"}}]}
        },
        # 分隔线
        {
            "block_type": 11,
            "divider": {}
        },
        # 当前状态
        {
            "block_type": 2,
            "text": {"elements": [{"text_run": {"content": f"当前状态：{current_status}", "text_element_style": {"bold": True}}}]}},
        },
        # 跳转链接（可点击）
        {
            "block_type": 2,
            "text": {"elements": [
                {"text_run": {"content": "👉 "}},
                {"text_run": {"content": "点击修改状态", "text_element_style": {"bold": True, "link": {"url": record_url}}}}
            ]}
        },
        # 提示文字
        {
            "block_type": 2,
            "text": {"elements": [{"text_run": {"content": "点击上方链接直接跳转到表格对应行，可修改状态、添加数据", "text_element_style": {"color": 0x999999, "italic": True}}}]}},
        },
        # 分隔线
        {
            "block_type": 11,
            "divider": {}
        },
        # 空行
        {
            "block_type": 2,
            "text": {"elements": []}
        }
    ]

    # 逐个添加状态区块
    for block in status_blocks:
        payload = {"children": [block]}
        resp = requests.post(create_url, headers=headers, json=payload)
        if resp.json().get("code") != 0:
            print(f"[WARN] 添加状态区块失败: {resp.json().get('msg')}")

    return True


def add_content_to_doc(token, doc_id, content, record_id=None):
    """添加内容到文档"""
    # 如果有record_id，先添加状态管理区块
    if record_id:
        print("[INFO] 添加状态管理区块...")
        add_status_management_block(token, doc_id, record_id)

    # 获取root block ID
    blocks_url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(blocks_url, headers=headers)
    result = resp.json()

    if result.get("code") != 0:
        print(f"[FAIL] 无法获取文档blocks: {result}")
        return 0

    root_block_id = result["data"]["items"][0]["block_id"]

    # 添加内容的API URL
    create_url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{root_block_id}/children"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    lines = content.split('\n')
    success_count = 0

    for line in lines:
        line = line.strip()
        if not line or line == '---':
            continue

        # 根据行内容构建block - 使用正确的字段名
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
        else:
            print(f"[WARN] 添加失败: {result.get('msg')}")

    return success_count


def update_feishu_record(token, doc_url):
    """更新飞书表格"""
    record_id = "recNvwmCyK"
    table_id = "tblHnoAMur4hffED"

    update_url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{table_id}/records/{record_id}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "fields": {
            "知识库链接": {"link": doc_url, "text": "查看文案"}
        }
    }

    resp = requests.put(update_url, headers=headers, json=payload)
    return resp.json().get("code") == 0


def main():
    print("=" * 60)
    print("保存文案到飞书知识库")
    print("=" * 60)

    # 1. 获取token
    token = get_token()
    print("[OK] 飞书认证成功")

    # 2. 获取知识库ID
    space_id = get_wiki_space_id(token)
    if not space_id:
        print("[FAIL] 无法获取知识库")
        return
    print(f"[OK] 知识库ID: {space_id}")

    # 3. 读取Obsidian文件
    filepath = "D:/BaiduSyncdisk/work/cursor app/claude code/XBB-APP/ashtanga-xiaohongshu/01-内容生产/01-待深化的选题/春节练习感悟_2026-02-25.md"
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    print(f"[OK] 读取文件成功 ({len(content)} 字符)")

    # 4. 在知识库创建文档
    print("\n[1/3] 创建知识库文档...")
    doc_id = create_doc_in_wiki(token, space_id, "春节练习感悟 - 3个角度文案")
    if not doc_id:
        return
    print(f"[OK] 文档创建成功: {doc_id}")

    # 5. 添加内容（传入record_id以添加状态管理区块）
    print("\n[2/3] 添加内容到文档...")
    record_id = "recNvwmCyK"  # 从表格获取的记录ID
    count = add_content_to_doc(token, doc_id, content, record_id)
    print(f"[OK] 成功添加 {count} 个内容块")

    # 6. 更新飞书表格
    print("\n[3/3] 更新飞书表格...")
    doc_url = f"https://my.feishu.cn/docx/{doc_id}"
    if update_feishu_record(token, doc_url):
        print("[OK] 飞书表格已更新")
    else:
        print("[WARN] 飞书表格更新失败")

    # 7. 完成
    print("\n" + "=" * 60)
    print("完成!")
    print("=" * 60)
    print(f"\n📄 知识库文档: {doc_url}")
    print(f"✅ 已添加 {count} 个内容块")
    print("=" * 60)


if __name__ == "__main__":
    main()
