#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
更新飞书表格中选题的状态
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
            field_map[field["field_name"]] = field["field_id"]
    return field_map

def get_records(token, table_id):
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{table_id}/records"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers, params={"page_size": 500})
    result = resp.json()
    if result.get("code") == 0:
        return result["data"]["items"]
    return []

def update_record(token, table_id, record_id, field_map, fields):
    """更新记录"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{APP_TOKEN}/tables/{table_id}/records/{record_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 转换字段名到field_id
    payload_fields = {}
    for name, value in fields.items():
        if name in field_map:
            field_id = field_map[name]
            payload_fields[field_id] = {"value": value}

    payload = {"fields": payload_fields}

    resp = requests.put(url, headers=headers, json=payload)
    result = resp.json()
    return result.get("code") == 0

def main():
    print("="*60)
    print("更新飞书表格选题状态")
    print("="*60)

    # 获取token
    token = get_token()
    if not token:
        print("[FAIL] 认证失败")
        return
    print("[OK] 飞书认证成功")

    # 获取表格ID
    table_id = get_table_id(token)
    if not table_id:
        print("[FAIL] 获取表格失败")
        return
    print(f"[OK] 表格ID: {table_id}")

    # 获取字段映射
    field_map = get_fields(token, table_id)
    print(f"[OK] 获取到 {len(field_map)} 个字段")
    print(f"字段: {list(field_map.keys())}")

    # 获取记录
    records = get_records(token, table_id)
    print(f"[OK] 获取到 {len(records)} 条记录")

    # 查找"春节练习感悟"选题
    target_record = None
    for record in records:
        fields = record.get("fields", {})
        # 获取选题字段的值
        topic_field_id = field_map.get("选题")
        if topic_field_id and topic_field_id in fields:
            topic_value = fields[topic_field_id]
            # 处理文本类型字段
            if isinstance(topic_value, list) and len(topic_value) > 0:
                topic_text = topic_value[0].get("text", "") if isinstance(topic_value[0], dict) else str(topic_value[0])
            else:
                topic_text = str(topic_value)

            if "春节" in topic_text or "练习感悟" in topic_text:
                target_record = record
                print(f"\n[OK] 找到选题: {topic_text[:50]}...")
                break

    if not target_record:
        print("[WARN] 未找到'春节练习感悟'选题")
        print("可用选题:")
        for record in records:
            fields = record.get("fields", {})
            topic_field_id = field_map.get("选题")
            if topic_field_id and topic_field_id in fields:
                topic_value = fields[topic_field_id]
                if isinstance(topic_value, list) and len(topic_value) > 0:
                    topic_text = topic_value[0].get("text", "")[:50] if isinstance(topic_value[0], dict) else str(topic_value[0])[:50]
                else:
                    topic_text = str(topic_value)[:50]
                print(f"  - {topic_text}")
        return

    # 更新状态
    record_id = target_record["record_id"]
    update_fields = {
        "状态": "🟠待审核",
        "文案角度": "3个角度已生成"
    }

    print(f"\n正在更新记录 {record_id}...")
    if update_record(token, table_id, record_id, field_map, update_fields):
        print("[OK] 状态更新成功")
        print(f"  状态: 🟠待审核")
        print(f"  文案角度: 3个角度已生成")
    else:
        print("[FAIL] 状态更新失败")

    print("\n" + "="*60)
    print("完成!")
    print("="*60)

if __name__ == "__main__":
    main()
