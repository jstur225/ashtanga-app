#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
获取飞书表格字段信息
"""

import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

APP_ID = "cli_a91435e1d6f81cc2"
APP_SECRET = "HTPH9VIZvfZm7b9rKNPdKhwnhLIHKBG0"
APP_TOKEN = "ORVubUAk3ajAg2s9O0bcIuVbn2b"
TABLE_ID = "tblHnoAMur4hffED"


def get_token():
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    resp = requests.post(url, json={"app_id": APP_ID, "app_secret": APP_SECRET}, verify=False)
    return resp.json()["tenant_access_token"]


def get_fields(token):
    """获取表格字段"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/fields"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, verify=False)
    result = resp.json()

    if result.get("code") == 0:
        print("\n表格字段列表:")
        print("=" * 60)
        for field in result["data"]["items"]:
            print(f"  字段名: {field['field_name']}")
            print(f"  字段ID: {field['field_id']}")
            print(f"  类型: {field['type']}")
            print("-" * 40)
    else:
        print(f"[FAIL] {result}")


def get_records(token):
    """获取表格记录"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/records"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, params={"page_size": 5}, verify=False)
    result = resp.json()

    if result.get("code") == 0:
        print("\n\n表格记录示例:")
        print("=" * 60)
        for record in result["data"]["items"]:
            print(f"\n记录ID: {record['record_id']}")
            print(f"字段值: {record['fields']}")
            print("-" * 40)


if __name__ == "__main__":
    token = get_token()
    get_fields(token)
    get_records(token)
