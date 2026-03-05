#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
查看飞书表格中的所有选题
"""

import json
import sys
import requests

sys.stdout.reconfigure(encoding='utf-8')

APP_ID = "cli_a91435e1d6f81cc2"
APP_SECRET = "HTPH9VIZvfZm7b9rKNPdKhwnhLIHKBG0"
APP_TOKEN = "ORVubUAk3ajAg2s9O0bcIuVbn2b"

def get_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    resp = requests.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET})
    result = resp.json()
    if result.get("code") == 0:
        return result["tenant_access_token"]
    return None

def get_table_id(token):
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers)
    result = resp.json()
    if result.get("code") == 0:
        return result["data"]["items"][0]["table_id"]
    return None

def get_fields(token, table_id):
    """获取字段映射"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{table_id}/fields"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers)
    result = resp.json()
    field_map = {}
    if result.get("code") == 0:
        for field in result["data"]["items"]:
            field_map[field["field_id"]] = field["field_name"]
    return field_map

def get_records(token, table_id):
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{table_id}/records"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, params={"page_size": 500})
    result = resp.json()
    if result.get("code") == 0:
        return result["data"]["items"]
    return []

def main():
    token = get_token()
    if not token:
        print("[FAIL] 认证失败")
        return

    table_id = get_table_id(token)
    if not table_id:
        print("[FAIL] 获取表格失败")
        return

    field_map = get_fields(token, table_id)
    records = get_records(token, table_id)

    print("="*60)
    print(f"飞书表格选题列表（共{len(records)}条）")
    print("="*60)

    for i, record in enumerate(records, 1):
        fields = record.get("fields", {})
        print(f"\n[{i}] Record ID: {record['record_id']}")
        for field_id, value in fields.items():
            field_name = field_map.get(field_id, field_id)
            print(f"    {field_name}: {value}")

if __name__ == "__main__":
    main()
