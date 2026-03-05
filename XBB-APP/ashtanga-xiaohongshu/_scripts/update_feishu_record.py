#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
更新飞书表格记录
"""

import os
import sys
import requests
import urllib3
from datetime import datetime

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
sys.stdout.reconfigure(encoding='utf-8')

APP_ID = "cli_a91435e1d6f81cc2"
APP_SECRET = "HTPH9VIZvfZm7b9rKNPdKhwnhLIHKBG0"
APP_TOKEN = "ORVubUAk3ajAg2s9O0bcIuVbn2b"
TABLE_ID = "tblHnoAMur4hffED"

# 已创建的文档链接
DOC_URL = "https://my.feishu.cn/docx/WR3nd5hBHomlDcxPR8gcqFvpnEc"


def get_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    resp = requests.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET}, verify=False)
    result = resp.json()
    if result.get("code") == 0:
        return result["tenant_access_token"]
    return None


def create_record(token):
    """创建新记录"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/records"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 日期转换为Unix时间戳（毫秒）
    dt = datetime.strptime("2025-02-26", "%Y-%m-%d")
    timestamp = int(dt.timestamp() * 1000)

    # 使用字段名
    payload = {
        "fields": {
            "选题/灵感": "马年第一练，她笑着说肚子挤得慌",
            "文案角度": ["角度1-对话叙述型"],
            "排期日期": timestamp,
            "状态": "🟠待审核",
            "知识库链接": {"link": DOC_URL, "text": "查看文案"}
        }
    }

    resp = requests.post(url, headers=headers, json=payload, verify=False)
    result = resp.json()

    print(f"响应: {result}")

    if result.get("code") == 0:
        return result["data"]["record"]["record_id"]
    else:
        print(f"[FAIL] 创建记录失败: {result.get('msg')}")
        return None


def main():
    print("=" * 60)
    print("创建飞书表格记录")
    print("=" * 60)

    token = get_token()
    if not token:
        print("[FAIL] 认证失败")
        return

    print("[OK] 认证成功")

    record_id = create_record(token)
    if record_id:
        print(f"[OK] 记录创建成功: {record_id}")
    else:
        print("[FAIL] 记录创建失败")

    print("=" * 60)


if __name__ == "__main__":
    main()
