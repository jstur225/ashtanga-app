#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
获取飞书知识库节点列表
"""

import json
import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

APP_ID = "cli_a91435e1d6f81cc2"
APP_SECRET = "HTPH9VIZvfZm7b9rKNPdKhwnhLIHKBG0"


def get_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    resp = requests.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET}, verify=False)
    return resp.json()["tenant_access_token"]


def main():
    token = get_token()

    # 获取知识库
    url = "https://open.feishu.cn/open-apis/wiki/v2/spaces"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, verify=False)
    spaces_result = resp.json()

    all_data = []

    for space in spaces_result["data"]["items"]:
        space_id = space["space_id"]
        space_name = space["name"]

        # 获取节点
        nodes_url = f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes"
        resp = requests.get(nodes_url, headers=headers, params={"page_size": 50}, verify=False)
        nodes_result = resp.json()

        space_data = {
            "space_name": space_name,
            "space_id": space_id,
            "nodes": []
        }

        for node in nodes_result["data"]["items"]:
            node_token = node.get("node_token")
            title = node.get("title", "")
            node_type = node.get("node_type")

            node_info = {
                "title": title,
                "node_token": node_token,
                "node_type": node_type
            }

            # 获取子节点
            if node_type == "origin":
                child_resp = requests.get(
                    nodes_url,
                    headers=headers,
                    params={"page_size": 50, "parent_node_token": node_token},
                    verify=False
                )
                child_result = child_resp.json()
                if child_result.get("code") == 0:
                    children = []
                    for child in child_result["data"]["items"]:
                        children.append({
                            "title": child.get("title", ""),
                            "node_token": child.get("node_token"),
                            "node_type": child.get("node_type")
                        })
                    node_info["children"] = children

            space_data["nodes"].append(node_info)

        all_data.append(space_data)

    # 保存到文件
    with open("wiki_nodes.json", "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False, indent=2)

    print("知识库节点信息已保存到 wiki_nodes.json")


if __name__ == "__main__":
    main()
