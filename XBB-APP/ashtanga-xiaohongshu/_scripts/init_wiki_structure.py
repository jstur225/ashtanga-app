#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
初始化飞书知识库目录结构
"""

import sys
import requests

sys.stdout.reconfigure(encoding='utf-8')

APP_ID = "cli_a91435e1d6f81cc2"
APP_SECRET = "HTPH9VIZvfZm7b9rKNPdKhwnhLIHKBG0"

# 目录结构
FOLDERS = [
    "01-选题池",
    "02-创作中",
    "03-已发布",
    "素材库",
    "素材库/金句库",
    "素材库/爆款结构",
    "素材库/核心概念",
    "方法论",
]


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


def get_root_node(token, space_id):
    """获取知识库根节点"""
    nodes_url = f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(nodes_url, headers=headers, params={"page_size": 50})
    result = resp.json()

    if result.get("code") == 0:
        items = result.get("data", {}).get("items", [])
        for item in items:
            if item.get("title") == "首页":
                return item.get("node_token")
        # 如果没有首页，返回第一个节点
        if items:
            return items[0].get("node_token")
    return None


def create_folder(token, space_id, parent_token, title):
    """在知识库中创建文件夹节点"""
    create_url = f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "parent_node_token": parent_token,
        "node_type": "origin",
        "obj_type": "docx",
        "title": f"📁 {title}"
    }

    resp = requests.post(create_url, headers=headers, json=payload)
    result = resp.json()

    if result.get("code") == 0:
        return result["data"]["node"]["node_token"]
    else:
        print(f"  [FAIL] 创建失败: {result.get('msg')}")
        return None


def create_doc(token, space_id, parent_token, title):
    """在知识库中创建文档节点"""
    create_url = f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    payload = {
        "parent_node_token": parent_token,
        "node_type": "origin",
        "obj_type": "docx",
        "title": title
    }

    resp = requests.post(create_url, headers=headers, json=payload)
    result = resp.json()

    if result.get("code") == 0:
        return result["data"]["node"]["node_token"]
    else:
        print(f"  [FAIL] 创建失败: {result.get('msg')}")
        return None


def main():
    print("=" * 60)
    print("初始化飞书知识库目录结构")
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

    # 3. 获取根节点
    root_token = get_root_node(token, space_id)
    if not root_token:
        print("[FAIL] 无法获取根节点")
        return
    print(f"[OK] 根节点: {root_token}")

    # 4. 创建目录结构
    print("\n" + "-" * 60)
    print("创建目录结构")
    print("-" * 60)

    created_nodes = {}

    for folder_path in FOLDERS:
        print(f"\n创建: {folder_path}")

        # 解析路径
        parts = folder_path.split("/")

        if len(parts) == 1:
            # 一级目录，直接挂在根节点下
            parent = root_token
            title = parts[0]
        else:
            # 多级目录，挂在父目录下
            parent_name = parts[0]
            if parent_name not in created_nodes:
                print(f"  [SKIP] 父目录 {parent_name} 不存在")
                continue
            parent = created_nodes[parent_name]
            title = parts[1]

        # 创建文件夹
        node_token = create_folder(token, space_id, parent, title)
        if node_token:
            created_nodes[folder_path] = node_token
            print(f"  [OK] 创建成功")

    # 5. 在"方法论"下创建一个示例文档
    print("\n" + "-" * 60)
    print("创建示例文档")
    print("-" * 60)

    if "方法论" in created_nodes:
        doc_token = create_doc(
            token, space_id, created_nodes["方法论"],
            "📌 小红书标题方法论"
        )
        if doc_token:
            print("[OK] 创建: 📌 小红书标题方法论")

    # 6. 把"春节练习感悟"移到 02-创作中
    print("\n" + "-" * 60)
    print("迁移现有文档")
    print("-" * 60)
    print("[INFO] 需要手动在飞书网页端移动'春节练习感悟'到 02-创作中 目录")

    print("\n" + "=" * 60)
    print("初始化完成!")
    print("=" * 60)
    print(f"\n共创建 {len(created_nodes)} 个目录/文件夹")
    print("\n目录结构:")
    for name in created_nodes.keys():
        print(f"  ✓ {name}")
    print("=" * 60)


if __name__ == "__main__":
    main()
