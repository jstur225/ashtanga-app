#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试飞书API访问多维表格
"""

import requests
import json

# 飞书API配置
APP_ID = "cli_a91435e1d6f81cc2"
APP_SECRET = "HTPH9VIZvfZm7b9rKNPdKhwnhLIHKBG0"
TABLE_URL = "https://my.feishu.cn/base/ORVubUAk3ajAg2s9O0bcIuVbn2b"

# 租户自建应用获取tenant_token
def get_tenant_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    payload = {
        "app_id": APP_ID,
        "app_secret": APP_SECRET
    }

    print(f"正在获取飞书 access_token...")
    resp = requests.post(url, json=payload)
    result = resp.json()

    if result.get("code") == 0:
        print(f"[OK] 认证成功")
        return result["tenant_access_token"]
    else:
        print(f"[FAIL] 认证失败: {result}")
        return None

# 提取bitetable token（从URL）
def extract_bitetable_token(table_url):
    print(f"\n表格URL: {table_url}")
    # URL格式: https://my.feishu.cn/base/{table_id}
    # 需要额外的API调用来获取access_token
    # 暂时跳过，等获取tenant_token后再处理
    return None

# 获取多维表格数据
def get_bitetable_data(tenant_token, table_id):
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{table_id}/tables"

    headers = {
        "Authorization": f"Bearer {tenant_token}",
        "Content-Type": "application/json"
    }

    print(f"\n正在获取多维表格列表...")
    resp = requests.get(url, headers=headers)
    result = resp.json()

    if result.get("code") == 0:
        print(f"[OK] 成功获取表格列表")
        print(f"表格数据: {json.dumps(result, ensure_ascii=False, indent=2)}")
        return result["data"]
    else:
        print(f"[FAIL] 获取失败: {result}")
        return None

if __name__ == "__main__":
    token = get_tenant_token()
    if token:
        print(f"\nTenant Token: {token[:20]}...")

        # 从URL提取table_id
        # URL: https://my.feishu.cn/base/ORVubUAk3ajAg2s9O0bcIuVbn2b
        app_id = "ORVubUAk3ajAg2s9O0bcIuVbn2b"

        tables = get_bitetable_data(token, app_id)
        if tables and tables.get("items"):
            table_id = tables["items"][0]["table_id"]
            print(f"\n表格ID: {table_id}")

            # 获取表格字段
            fields_url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_id}/tables/{table_id}/fields"
            resp = requests.get(fields_url, headers={"Authorization": f"Bearer {token}"})
            fields_result = resp.json()

            print(f"\n字段信息:")
            print(json.dumps(fields_result, ensure_ascii=False, indent=2))

            # 获取表格记录
            records_url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_id}/tables/{table_id}/records"
            resp = requests.get(records_url, headers={"Authorization": f"Bearer {token}"})
            records_result = resp.json()

            print(f"\n记录数据:")
            print(json.dumps(records_result, ensure_ascii=False, indent=2))
