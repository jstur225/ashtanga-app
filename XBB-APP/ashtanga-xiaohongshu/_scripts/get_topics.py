#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
获取飞书多维表格中的选题
"""

import json
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


def get_records(token):
    """获取表格记录"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{TABLE_ID}/records"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, params={"page_size": 500}, verify=False)
    return resp.json()


def main():
    token = get_token()
    result = get_records(token)

    if result.get("code") != 0:
        print(f"[FAIL] {result}")
        return

    records = result["data"]["items"]
    print(f"\n共 {len(records)} 条记录\n")
    print("=" * 80)

    for i, record in enumerate(records, 1):
        fields = record.get("fields", {})
        record_id = record.get("record_id", "")

        # 获取关键字段
        topic = fields.get("fldt3rm5dr", "")  # 选题/灵感
        status = fields.get("fldyAxDY3P", "")  # 状态
        date = fields.get("fldbqJUm2y", "")  # 排期日期

        # 日期格式化
        if date and isinstance(date, int):
            from datetime import datetime
            date_str = datetime.fromtimestamp(date / 1000).strftime("%Y-%m-%d")
        else:
            date_str = str(date) if date else ""

        print(f"\n[{i}] Record ID: {record_id}")
        print(f"    选题: {topic[:60]}{'...' if len(str(topic)) > 60 else ''}")
        print(f"    状态: {status}")
        print(f"    排期: {date_str}")
        print("-" * 80)


if __name__ == "__main__":
    main()
