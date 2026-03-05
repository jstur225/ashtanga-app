#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
检查飞书知识库状态
"""

import requests

APP_ID = "cli_a91435e1d6f81cc2"
APP_SECRET = "HTPH9VIZvfZm7b9rKNPdKhwnhLIHKBG0"


def get_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    resp = requests.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET})
    return resp.json()["tenant_access_token"]


def check_wiki_spaces(token):
    """获取知识库列表"""
    url = "https://open.feishu.cn/open-apis/wiki/v2/spaces"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers)
    result = resp.json()

    print("=" * 60)
    print("知识库列表")
    print("=" * 60)

    if result.get("code") == 0:
        items = result.get("data", {}).get("items", [])
        if not items:
            print("[WARN] 没有找到任何知识库")
            return None

        for item in items:
            print(f"\n名称: {item.get('name')}")
            print(f"空间ID: {item.get('space_id')}")
            print(f"描述: {item.get('description', '无')}")
        return items[0].get("space_id")
    else:
        print(f"[FAIL] 获取知识库失败: {result}")
        return None


def check_wiki_nodes(token, space_id):
    """获取知识库节点"""
    url = f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, params={"page_size": 50})
    result = resp.json()

    print("\n" + "=" * 60)
    print("知识库节点列表")
    print("=" * 60)

    if result.get("code") == 0:
        items = result.get("data", {}).get("items", [])
        if not items:
            print("[WARN] 知识库中没有任何节点/文档")
            print("\n解决方案：")
            print("1. 在飞书知识库中手动创建一个文档作为根节点")
            print("2. 或者使用飞书网页版创建目录结构")
            return False

        print(f"\n找到 {len(items)} 个节点:\n")
        for item in items:
            print(f"  - 标题: {item.get('title', '无标题')}")
            print(f"    类型: {item.get('node_type')} / {item.get('obj_type')}")
            print(f"    节点token: {item.get('node_token')}")
            print()
        return True
    else:
        print(f"[FAIL] 获取节点失败: {result}")
        return False


def main():
    print("=" * 60)
    print("飞书知识库状态检查")
    print("=" * 60)

    # 1. 获取token
    token = get_token()
    print("[OK] 飞书认证成功")

    # 2. 检查知识库
    space_id = check_wiki_spaces(token)
    if not space_id:
        return

    # 3. 检查节点
    has_nodes = check_wiki_nodes(token, space_id)

    print("\n" + "=" * 60)
    if has_nodes:
        print("状态: 知识库正常，可以创建文档")
    else:
        print("状态: 知识库为空，需要先在飞书中创建目录结构")
    print("=" * 60)


if __name__ == "__main__":
    main()
