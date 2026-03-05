#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量同步生成的文案到飞书知识库
修复版 - 2026-02-26
"""

import os
import sys
import requests
import time

sys.stdout.reconfigure(encoding='utf-8')

APP_ID = "cli_a91435e1d6f81cc2"
APP_SECRET = "HTPH9VIZvfZm7b9rKNPdKhwnhLIHKBG0"
APP_TOKEN = "ORVubUAk3ajAg2s9O0bcIuVbn2b"
TABLE_ID = "tblHnoAMur4hffED"

# 待同步的3个选题
TOPICS = [
    {
        "record_id": "recvckK3jhhLd2",
        "title": "🟢AI节省时间：回到生活，爱具体的人",
        "filename": "_scripts/generated_ai_time.md"
    },
    {
        "record_id": "recvckPLY0Fmn7",
        "title": "🟢Mysore自律：在家建立晨练习惯",
        "filename": "_scripts/generated_mysore_home.md"
    },
    {
        "record_id": "recvckPU8K02Ik",
        "title": "🟢能量提升：古老序列改变气场",
        "filename": "_scripts/generated_energy.md"
    }
]


def get_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    resp = requests.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET})
    result = resp.json()
    if result.get("code") == 0:
        return result["tenant_access_token"]
    print(f"[FAIL] 获取token失败: {result}")
    return None


def get_wiki_space_id(token):
    wiki_url = "https://open.feishu.cn/open-apis/wiki/v2/spaces"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(wiki_url, headers=headers)
    result = resp.json()
    if result.get("code") == 0:
        items = result.get("data", {}).get("items", [])
        if items:
            return items[0].get("space_id")
    return None


def get_folder_node_token(token, space_id):
    """获取'02-创作中'文件夹的node_token"""
    nodes_url = f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(nodes_url, headers=headers, params={"page_size": 50})
    result = resp.json()

    if result.get("code") != 0:
        return None

    # 查找'02-创作中'文件夹
    for item in result.get("data", {}).get("items", []):
        title = item.get("title", "")
        if "02-创作中" in title or "创作中" in title:
            return item.get("node_token")

    # 如果没找到，返回第一个节点
    items = result.get("data", {}).get("items", [])
    if items:
        return items[0].get("node_token")
    return None


def create_doc_in_folder(token, space_id, parent_token, title):
    """在指定文件夹下创建文档"""
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
        return result["data"]["node"]["obj_token"]
    print(f"[FAIL] 创建文档失败: {result}")
    return None


def add_simple_content(token, doc_id, content, record_id):
    """添加内容到文档（简化版）"""
    # 获取root block ID
    blocks_url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(blocks_url, headers=headers)
    result = resp.json()

    if result.get("code") != 0:
        print(f"[WARN] 无法获取文档blocks: {result}")
        return 0

    root_block_id = result["data"]["items"][0]["block_id"]
    create_url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{root_block_id}/children"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 添加状态管理区块
    table_url = f"https://my.feishu.cn/base/{APP_TOKEN}?table={TABLE_ID}&record={record_id}"

    status_header = {
        "children": [{
            "block_type": 4,
            "heading2": {"elements": [{"text_run": {"content": "📋 选题状态管理"}}]}
        }]
    }
    requests.post(create_url, headers=headers, json=status_header)

    # 分隔线
    divider = {"children": [{"block_type": 11, "divider": {}}]}
    requests.post(create_url, headers=headers, json=divider)

    # 状态文字
    status_text = {
        "children": [{
            "block_type": 2,
            "text": {"elements": [{"text_run": {"content": "当前状态：🟠待审核"}}]}
        }]
    }
    requests.post(create_url, headers=headers, json=status_text)

    # 链接
    link_text = {
        "children": [{
            "block_type": 2,
            "text": {"elements": [
                {"text_run": {"content": "👉 "}},
                {"text_run": {"content": "点击修改状态", "text_element_style": {"link": {"url": table_url}}}}
            ]}
        }]
    }
    requests.post(create_url, headers=headers, json=link_text)

    # 分隔线
    requests.post(create_url, headers=headers, json=divider)

    # 空行
    empty = {"children": [{"block_type": 2, "text": {"elements": []}}]}
    requests.post(create_url, headers=headers, json=empty)

    # 添加正文内容
    lines = content.split('\n')
    count = 0
    for line in lines:
        line = line.strip()
        if not line or line == '---':
            continue

        # 移除 Markdown 加粗
        line = line.replace("**", "")

        if line.startswith('# '):
            payload = {"children": [{"block_type": 3, "heading1": {"elements": [{"text_run": {"content": line[2:]}}]}}]}
        elif line.startswith('## '):
            payload = {"children": [{"block_type": 4, "heading2": {"elements": [{"text_run": {"content": line[3:]}}]}}]}
        elif line.startswith('### '):
            payload = {"children": [{"block_type": 5, "heading3": {"elements": [{"text_run": {"content": line[4:]}}]}}]}
        else:
            payload = {"children": [{"block_type": 2, "text": {"elements": [{"text_run": {"content": line}}]}}]}

        resp = requests.post(create_url, headers=headers, json=payload)
        if resp.json().get("code") == 0:
            count += 1

    return count


def update_record_status(token, record_id, doc_url):
    """更新飞书记录状态为🟠待审核，并添加知识库链接"""
    update_url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/records/{record_id}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "fields": {
            "状态": "🟠待审核",
            "知识库链接": {"link": doc_url, "text": "查看文案"}
        }
    }

    resp = requests.put(update_url, headers=headers, json=payload)
    result = resp.json()
    return result.get("code") == 0


def main():
    print("=" * 60)
    print("批量同步文案到飞书知识库")
    print("=" * 60)

    token = get_token()
    if not token:
        return
    print("[OK] 飞书认证成功")

    space_id = get_wiki_space_id(token)
    if not space_id:
        print("[FAIL] 无法获取知识库")
        return
    print(f"[OK] 知识库ID: {space_id}")

    folder_token = get_folder_node_token(token, space_id)
    if not folder_token:
        print("[FAIL] 无法获取目标文件夹")
        return
    print(f"[OK] 目标文件夹: {folder_token}")

    results = []
    for i, topic in enumerate(TOPICS, 1):
        print(f"\n[{i}/3] 处理: {topic['title']}")

        # 读取文件
        if not os.path.exists(topic['filename']):
            print(f"  [SKIP] 文件不存在: {topic['filename']}")
            continue

        with open(topic['filename'], 'r', encoding='utf-8') as f:
            content = f.read()

        # 创建文档
        doc_id = create_doc_in_folder(token, space_id, folder_token, topic['title'])
        if not doc_id:
            results.append({"title": topic['title'], "status": "创建文档失败"})
            continue

        # 添加内容
        count = add_simple_content(token, doc_id, content, topic['record_id'])
        print(f"  [OK] 添加了 {count} 个内容块")

        # 更新记录状态
        doc_url = f"https://my.feishu.cn/docx/{doc_id}"
        if update_record_status(token, topic['record_id'], doc_url):
            print(f"  [OK] 已更新飞书记录")
            results.append({"title": topic['title'], "status": "成功", "url": doc_url})
        else:
            print(f"  [WARN] 更新记录失败")
            results.append({"title": topic['title'], "status": "部分成功", "url": doc_url})

        time.sleep(1)

    print("\n" + "=" * 60)
    print("同步完成汇总")
    print("=" * 60)
    for r in results:
        print(f"\n📄 {r['title']}")
        print(f"   状态: {r['status']}")
        if 'url' in r:
            print(f"   链接: {r['url']}")


if __name__ == "__main__":
    main()
