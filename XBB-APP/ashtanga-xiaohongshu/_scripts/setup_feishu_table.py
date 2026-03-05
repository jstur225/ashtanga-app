#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
设置飞书多维表格字段结构
"""

import requests
import json
import sys

# 飞书API配置
APP_ID = "cli_a91435e1d6f81cc2"
APP_SECRET = "HTPH9VIZvfZm7b9rKNPdKhwnhLIHKBG0"
APP_TOKEN = "ORVubUAk3ajAg2s9O0bcIuVbn2b"  # 从URL提取

# 设置stdout编码
sys.stdout.reconfigure(encoding='utf-8')

def get_tenant_token():
    """获取tenant_access_token"""
    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    payload = {
        "app_id": APP_ID,
        "app_secret": APP_SECRET
    }
    resp = requests.post(url, json=payload)
    result = resp.json()
    if result.get("code") == 0:
        return result["tenant_access_token"]
    else:
        print(f"[FAIL] 认证失败: {result}")
        return None

def get_tables(token, app_token):
    """获取所有表格"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables"
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(url, headers=headers)
    return resp.json()

def create_field(token, app_token, table_id, field_name, field_type, options=None):
    """创建字段"""
    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/fields"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # 字段类型映射
    type_map = {
        "text": 1,           # 文本
        "number": 2,         # 数字
        "single_select": 3,  # 单选
        "multi_select": 4,   # 多选
        "date": 5,           # 日期
        "checkbox": 7,       # 复选框
        "url": 15,           # 超链接
    }

    payload = {
        "field_name": field_name,
        "type": type_map.get(field_type, 1)
    }

    # 单选/多选需要添加选项
    if field_type in ["single_select", "multi_select"] and options:
        payload["property"] = {
            "options": [{"name": opt} for opt in options]
        }

    resp = requests.post(url, headers=headers, json=payload)
    return resp.json()

def main():
    token = get_tenant_token()
    if not token:
        return

    print("[OK] 认证成功")

    # 获取现有表格
    tables_result = get_tables(token, APP_TOKEN)
    if tables_result.get("code") != 0:
        print(f"[FAIL] 获取表格失败: {tables_result}")
        return

    tables = tables_result["data"]["items"]
    if not tables:
        print("[FAIL] 没有找到表格")
        return

    table_id = tables[0]["table_id"]
    print(f"[OK] 找到表格: {tables[0]['name']} (ID: {table_id})")

    # 定义需要的字段
    fields = [
        {"name": "选题", "type": "text"},
        {"name": "状态", "type": "single_select", "options": ["🟡待生成", "🟠待审核", "🔵已发布", "⏸️暂停"]},
        {"name": "排期日期", "type": "date"},
        {"name": "文案角度", "type": "single_select", "options": [
            "角度1-对话叙述型",
            "角度2-第二人称提问型",
            "角度3-清单对比型",
            "角度4-数据展示型",
            "角度5-疑问回答型",
            "角度6-场景代入型",
            "角度7-单刀直入型",
            "角度8-对比反问型"
        ]},
        {"name": "选题类型", "type": "single_select", "options": [
            "产品推广",
            "练习感悟",
            "知识科普",
            "用户故事",
            "节日热点"
        ]},
        {"name": "知识库链接", "type": "url"},
        {"name": "小红书链接", "type": "url"},
        {"name": "发布日期", "type": "date"},
        {"name": "备注", "type": "text"},
        # 小红书后台数据字段
        {"name": "曝光", "type": "number"},
        {"name": "观看", "type": "number"},
        {"name": "封面点击率", "type": "number"},
        {"name": "点赞", "type": "number"},
        {"name": "评论", "type": "number"},
        {"name": "收藏", "type": "number"},
        {"name": "涨粉", "type": "number"},
        {"name": "分享", "type": "number"},
        {"name": "人均观看时长", "type": "text"},
        {"name": "弹幕", "type": "number"},
    ]

    print("\n开始创建字段...")
    for field in fields:
        result = create_field(
            token, APP_TOKEN, table_id,
            field["name"], field["type"], field.get("options")
        )
        if result.get("code") == 0:
            print(f"  [OK] 创建字段: {field['name']}")
        elif result.get("code") == 1250041:
            print(f"  [SKIP] 字段已存在: {field['name']}")
        else:
            print(f"  [FAIL] 创建失败 {field['name']}: {result}")

    print("\n[OK] 字段设置完成!")

if __name__ == "__main__":
    main()
