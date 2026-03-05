#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将生成的文案同步到飞书知识库

【状态流转规则 - 固化】
🟡待生成 → NotebookLM生成文案
🟠待审核 → 已同步到飞书知识库，等待审核（本脚本设置的状态）
🟢待发布 → 审核通过，等待排期发布
🔵已发布 → 已发布到小红书
⏸️暂停   → 暂时搁置

本脚本流程:
1. 读取生成的文案文件
2. 在飞书知识库"📁 02-创作中"创建新文档
3. 添加内容（保留表情符号）
4. 更新原记录状态为🟠待审核，并添加文档链接

注意：
- 表情符号使用UTF-8编码，会正确保留
- 状态管理区块API有限制，可能需要手动添加
- 每次运行创建新文档，旧文档需手动删除
"""

import os
import sys
import requests
import time
import urllib3

# 禁用SSL警告
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

sys.stdout.reconfigure(encoding='utf-8')

# 配置请求重试
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def create_session():
    session = requests.Session()
    retry = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=[500, 502, 503, 504]
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('https://', adapter)
    session.mount('http://', adapter)
    return session

APP_ID = "cli_a91435e1d6f81cc2"
APP_SECRET = "HTPH9VIZvfZm7b9rKNPdKhwnhLIHKBG0"
APP_TOKEN = "ORVubUAk3ajAg2s9O0bcIuVbn2b"
TABLE_ID = "tblHnoAMur4hffED"

# "📁 02-创作中" 文件夹的node_token
FOLDER_02_NODE_TOKEN = "UkvnwPEwoioBXxkd0RXcINlcnqd"

# 生成的文案文件路径
GENERATED_FILE = r"D:\BaiduSyncdisk\work\cursor app\claude code\generated_2026频繁记录.md"

# 【固化】要更新的飞书记录ID（从🟡待生成更新为🟠待审核）
# 运行前需要确认这是正确的记录ID
TARGET_RECORD_ID = "recvcjOGrai8cR"

# 【固化】已有文档ID（直接更新而不是创建新文档）
# 如果为None则创建新文档
EXISTING_DOC_ID = "PGDLdzWSUo13qWx6oaBcoFZdnsc"  # 最新创建的文档


def get_token():
    """获取飞书token"""
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    session = create_session()
    resp = session.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET}, verify=False)
    result = resp.json()
    if result.get("code") == 0:
        return result["tenant_access_token"]
    print(f"[FAIL] 获取token失败: {result}")
    return None


def get_wiki_space_id(token):
    """获取知识库ID"""
    url = "https://open.feishu.cn/open-apis/wiki/v2/spaces"
    headers = {"Authorization": f"Bearer {token}"}
    session = create_session()
    resp = session.get(url, headers=headers, verify=False)
    result = resp.json()

    if result.get("code") == 0:
        items = result.get("data", {}).get("items", [])
        if items:
            return items[0].get("space_id")
    return None


def create_doc_in_wiki(token, space_id, title):
    """在知识库中创建文档 - 放在📁 02-创作中文件夹下"""
    session = create_session()

    # 使用"📁 02-创作中"文件夹作为父节点
    parent_token = FOLDER_02_NODE_TOKEN

    # 创建文档节点
    create_url = f"https://open.feishu.cn/open-apis/wiki/v2/spaces/{space_id}/nodes"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "parent_node_token": parent_token,
        "node_type": "origin",
        "obj_type": "docx",
        "title": title
    }

    resp = session.post(create_url, headers=headers, json=payload, verify=False)
    result = resp.json()

    if result.get("code") == 0:
        doc_token = result["data"]["node"]["obj_token"]
        return doc_token
    else:
        print(f"[FAIL] 创建文档失败: {result}")
        return None


def clear_document_content(token, doc_id):
    """清空文档内容（使用批量更新API）"""
    session = create_session()

    # 使用批量块操作API来删除所有非page块
    # 先获取所有blocks
    blocks_url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks"
    headers = {"Authorization": f"Bearer {token}"}
    resp = session.get(blocks_url, headers=headers, verify=False)
    result = resp.json()

    if result.get("code") != 0:
        print(f"[WARN] 无法获取文档blocks: {result}")
        return False

    items = result["data"]["items"]

    # 使用批量删除API
    if len(items) > 1:
        # 准备要删除的block IDs（除了第一个page block）
        block_ids_to_delete = [item["block_id"] for item in items[1:]]

        # 批量删除 (每次最多500个)
        batch_size = 500
        for i in range(0, len(block_ids_to_delete), batch_size):
            batch = block_ids_to_delete[i:i+batch_size]
            # 使用DELETE请求，body包含要删除的block_ids
            delete_url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/batch_delete"
            payload = {"block_ids": batch}
            resp = session.post(delete_url, headers=headers, json=payload, verify=False)

            if resp.status_code in [200, 204]:
                print(f"[OK] 批量删除: {len(batch)} 个blocks")
            else:
                print(f"[WARN] 批量删除失败: status={resp.status_code}, {resp.text[:100]}")

    print(f"[OK] 文档清空完成")
    return True


def add_status_management_block(token, doc_id, current_status="🟠待审核"):
    """在文档顶部添加状态管理区块"""
    session = create_session()

    # 获取root block ID
    blocks_url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks"
    headers = {"Authorization": f"Bearer {token}"}
    resp = session.get(blocks_url, headers=headers, verify=False)
    result = resp.json()

    if result.get("code") != 0:
        print(f"[WARN] 无法获取文档blocks: {result}")
        return False

    root_block_id = result["data"]["items"][0]["block_id"]
    create_url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{root_block_id}/children"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 构建表格链接（跳转到表格）
    base_url = f"https://my.feishu.cn/base/{APP_TOKEN}"
    table_url = f"{base_url}?table={TABLE_ID}"

    # 状态管理区块 - 【固化】必须包含📋选题状态管理
    # 使用纯文本格式，避免复杂的block类型导致API错误
    status_blocks = [
        # 标题: 📋 选题状态管理 (使用heading2)
        {
            "block_type": 4,
            "heading2": {"elements": [{"text_run": {"content": "📋 选题状态管理"}}]}
        },
        # 当前状态 (使用普通文本)
        {
            "block_type": 2,
            "text": {"elements": [{"text_run": {"content": f"当前状态：{current_status}"}}]}
        },
        # 分隔线（用文本代替）
        {
            "block_type": 2,
            "text": {"elements": [{"text_run": {"content": "─────────────────"}}]}
        }
    ]

    # 【固化】逐个添加状态区块（避免批量API的invalid param错误）
    success = True
    for i, block in enumerate(status_blocks):
        # 简化payload，不使用index参数测试
        payload = {
            "children": [block]
        }
        resp = session.post(create_url, headers=headers, json=payload, verify=False)
        result = resp.json()

        if result.get("code") != 0:
            print(f"[WARN] 添加状态区块失败 ({block.get('block_type')}): {result.get('msg')}")
            print(f"[DEBUG] Payload: {block}")
            success = False
            break
        time.sleep(0.2)  # 避免请求过快

    if success:
        print(f"[OK] 状态管理区块添加成功 (📋 选题状态管理)")
    else:
        print(f"[WARN] 状态管理区块添加失败，需要手动添加")
    return success


def add_content_to_doc(token, doc_id, content):
    """添加内容到文档"""
    session = create_session()

    # 获取root block ID
    blocks_url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks"
    headers = {"Authorization": f"Bearer {token}"}
    resp = session.get(blocks_url, headers=headers, verify=False)
    result = resp.json()

    if result.get("code") != 0:
        print(f"[FAIL] 无法获取文档blocks: {result}")
        return 0

    root_block_id = result["data"]["items"][0]["block_id"]
    create_url = f"https://open.feishu.cn/open-apis/docx/v1/documents/{doc_id}/blocks/{root_block_id}/children"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    lines = content.split('\n')
    success_count = 0

    # Debug: 检查源文件中的表情符号
    emoji_lines = []
    for i, line in enumerate(lines):
        if any(e in line for e in ['🟢', '🌱', '✅', '✨', '🙏', '💚', '🍀']):
            emoji_lines.append(i)
    print(f"[DEBUG] 源文件中发现表情符号的行数: {emoji_lines[:5]}")

    for line in lines:
        original_line = line
        line = line.strip()
        if not line or line == '---':
            continue

        # 移除Markdown加粗标记 ** (飞书和小红书都不支持)
        line = line.replace('**', '')

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

        resp = session.post(create_url, headers=headers, json=payload, verify=False)
        result = resp.json()

        if result.get("code") == 0:
            success_count += 1
        else:
            print(f"[WARN] 添加失败: {result.get('msg')}")

        # 添加延迟避免请求过快
        time.sleep(0.2)

    return success_count


def update_feishu_record(token, record_id, doc_url):
    """更新飞书表格中原记录的状态和链接

    状态流转: 🟡待生成 → 🟠待审核
    """
    session = create_session()
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/records/{record_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {
        "fields": {
            "状态": "🟠待审核",  # 固化状态：同步后变为待审核
            "知识库链接": {"link": doc_url, "text": "查看文案"}
        }
    }

    resp = session.put(url, headers=headers, json=payload, verify=False)
    result = resp.json()

    if result.get("code") == 0:
        return True
    else:
        print(f"[FAIL] 更新记录失败: {result}")
        return False


def main():
    print("=" * 60)
    print("同步生成的文案到飞书知识库")
    print("=" * 60)

    # 检查文件是否存在
    if not os.path.exists(GENERATED_FILE):
        print(f"[FAIL] 文件不存在: {GENERATED_FILE}")
        return

    # 1. 获取token
    print("\n[1/5] 飞书认证...")
    token = get_token()
    if not token:
        return
    print("[OK] 认证成功")

    # 2. 获取知识库ID
    print("\n[2/5] 获取知识库...")
    space_id = get_wiki_space_id(token)
    if not space_id:
        print("[FAIL] 无法获取知识库")
        return
    print(f"[OK] 知识库ID: {space_id}")

    # 3. 读取生成的文案
    print("\n[3/5] 读取文案...")
    with open(GENERATED_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    print(f"[OK] 读取成功 ({len(content)} 字符)")

    # 4. 创建或复用文档
    print("\n[4/5] 准备文档...")
    doc_title = GENERATED_FILE.split('\\')[-1].replace('.md', '') + ' - 小红书文案'

    if EXISTING_DOC_ID:
        # 使用已有文档，先清空内容
        doc_id = EXISTING_DOC_ID
        print(f"[OK] 使用已有文档: {doc_id}")
        clear_document_content(token, doc_id)
    else:
        # 创建新文档
        doc_id = create_doc_in_wiki(token, space_id, doc_title)
        if not doc_id:
            print("[FAIL] 文档创建失败")
            return
        print(f"[OK] 文档创建成功: {doc_id}")

    # 5. 添加状态管理区块和内容
    print("\n[5/5] 添加内容到文档...")
    add_status_management_block(token, doc_id, "🟠待审核")
    count = add_content_to_doc(token, doc_id, content)
    print(f"[OK] 成功添加 {count} 个内容块")

    # 6. 更新飞书原记录（状态: 🟡待生成 → 🟠待审核）
    print("\n[6/6] 更新飞书表格记录...")
    print(f"    记录ID: {TARGET_RECORD_ID}")
    print(f"    状态: 🟡待生成 → 🟠待审核")
    doc_url = f"https://my.feishu.cn/docx/{doc_id}"
    success = update_feishu_record(token, TARGET_RECORD_ID, doc_url)

    if success:
        print(f"[OK] 记录更新成功")
    else:
        print(f"[WARN] 记录更新失败，请手动检查")

    # 完成
    print("\n" + "=" * 60)
    print("完成!")
    print("=" * 60)
    print(f"\n📄 知识库文档: {doc_url}")
    print(f"✅ 已添加 {count} 个内容块")
    print(f"✅ 原记录已更新: {TARGET_RECORD_ID}")
    print("=" * 60)


if __name__ == "__main__":
    main()
