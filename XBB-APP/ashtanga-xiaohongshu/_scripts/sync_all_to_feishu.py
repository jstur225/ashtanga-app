#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量同步所有生成的文案到飞书
"""

import os
import sys
import requests
import time
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
sys.stdout.reconfigure(encoding='utf-8')

# 配置
APP_ID = "cli_a91435e1d6f81cc2"
APP_SECRET = "HTPH9VIZvfZm7b9rKNPdKhwnhLIHKBG0"
TABLE_ID = "tblHnoAMur4hffED"
FOLDER_NODE_TOKEN = "UkvnwPEwoioBXxkd0RXcINlcnqd"

# 要同步的3个选题
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
    resp = requests.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET}, verify=False)
    result = resp.json()
    if result.get("code") == 0:
        return result["tenant_access_token"]
    return None

def create_doc(token, title, content):
    """在知识库创建文档"""
    url = "https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node"
    headers = {"Authorization": f"Bearer {token}"}

    # 获取空间信息
    resp = requests.get(f"{url}?token={FOLDER_NODE_TOKEN}", headers=headers, verify=False)
    space_id = resp.json().get("data", {}).get("node", {}).get("space_id")

    if not space_id:
        print(f"[FAIL] 无法获取空间ID")
        return None

    # 创建文档
    create_url = "https://open.feishu.cn/open-apis/wiki/v2/spaces/nodes/create"
    data = {
        "space_id": space_id,
        "parent_node_token": FOLDER_NODE_TOKEN,
        "node_type": "docx",
        "title": title
    }
    resp = requests.post(create_url, headers=headers, json=data, verify=False)
    result = resp.json()

    if result.get("code") == 0:
        node_token = result["data"]["node_token"]
        obj_token = result["data"]["obj_token"]
        return {"node_token": node_token, "obj_token": obj_token}
    return None

def add_content(token, obj_token, content):
    """添加文档内容（简化版）"""
    # 移除 Markdown 加粗
    content = content.replace("**", "")

    # 添加状态管理区块
    header = """📋 选题状态管理
─────────────────
当前状态：🟠待审核
👉 点击修改状态: https://my.feishu.cn/base/ORVubUAk3ajAg2s9O0bcIuVbn2b
─────────────────

"""
    full_content = header + content

    # 写入文件供手动复制
    return full_content

def update_record(token, record_id, doc_url):
    """更新飞书记录状态为🟠待审核，并添加知识库链接"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{TABLE_ID}/tables/{TABLE_ID}/records/{record_id}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    data = {
        "fields": {
            "状态": "🟠待审核",
            "知识库链接": {"link": doc_url, "text": "查看文案"}
        }
    }

    resp = requests.put(url, headers=headers, json=data, verify=False)
    return resp.json().get("code") == 0

def main():
    print("开始批量同步到飞书...")

    token = get_token()
    if not token:
        print("[FAIL] 获取token失败")
        return

    print("✅ Token获取成功\n")

    results = []
    for i, topic in enumerate(TOPICS, 1):
        print(f"[{i}/3] 处理: {topic['title']}")

        # 读取文件
        filepath = topic["filename"]
        if not os.path.exists(filepath):
            print(f"  [SKIP] 文件不存在: {filepath}")
            continue

        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # 创建文档
        doc_info = create_doc(token, topic["title"], content)
        if not doc_info:
            print(f"  [FAIL] 创建文档失败")
            continue

        # 构建文档URL
        doc_url = f"https://my.feishu.cn/docx/{doc_info['obj_token']}"

        # 更新记录状态
        if update_record(token, topic["record_id"], doc_url):
            print(f"  ✅ 已同步: {doc_url}")
            results.append({"title": topic["title"], "url": doc_url, "status": "成功"})
        else:
            print(f"  [FAIL] 更新记录失败")
            results.append({"title": topic["title"], "url": "-", "status": "失败"})

        time.sleep(1)  # 避免API限流

    print("\n" + "="*60)
    print("同步完成汇总")
    print("="*60)
    for r in results:
        print(f"- {r['title']}: {r['status']}")
        if r['url'] != '-':
            print(f"  链接: {r['url']}")

if __name__ == "__main__":
    main()
