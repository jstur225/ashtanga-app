#!/usr/bin/env python3
"""
从 Chrome 提取 NotebookLM 的 cookies 并转换为 Playwright storage_state.json
"""

import json
import os
from pathlib import Path

# 你的 Chrome 用户数据目录
CHROME_USER_DATA = Path.home() / "AppData/Local/Google/Chrome/User Data"

def export_cookies():
    storage_dir = Path.home() / ".notebooklm"
    storage_dir.mkdir(exist_ok=True)
    storage_file = storage_dir / "storage_state.json"

    print("=" * 60)
    print("提取 Chrome Cookies")
    print("=" * 60)

    try:
        import browser_cookie3

        # 从 Chrome 提取 cookies
        print("\n[1/2] 正在从 Chrome 提取 cookies...")

        # 获取 notebooklm.google.com 的 cookies
        cj = browser_cookie3.chrome(
            domain_name="notebooklm.google.com"
        )

        cookies_list = []
        for cookie in cj:
            cookies_list.append({
                "name": cookie.name,
                "value": cookie.value,
                "domain": cookie.domain,
                "path": cookie.path,
                "expires": cookie.expires if cookie.expires else -1,
                "httpOnly": cookie.has_nonstandard_attr('HttpOnly'),
                "secure": cookie.secure,
                "sameSite": "Lax"
            })

        print(f"  找到 {len(cookies_list)} 个 cookies")

        # 也获取 google.com 的 cookies（用于认证）
        print("[2/2] 提取 Google 认证 cookies...")
        cj_google = browser_cookie3.chrome(
            domain_name=".google.com"
        )

        for cookie in cj_google:
            # 只保留关键的认证 cookies
            if cookie.name in ['SID', 'HSID', 'SSID', 'APISID', 'SAPISID', 'OGPC', '1P_JAR', 'NID']:
                cookies_list.append({
                    "name": cookie.name,
                    "value": cookie.value,
                    "domain": cookie.domain,
                    "path": cookie.path,
                    "expires": cookie.expires if cookie.expires else -1,
                    "httpOnly": cookie.has_nonstandard_attr('HttpOnly'),
                    "secure": cookie.secure,
                    "sameSite": "Lax"
                })

        # 构建 storage_state.json 格式
        storage_state = {
            "cookies": cookies_list,
            "origins": []
        }

        # 保存
        with open(storage_file, 'w', encoding='utf-8') as f:
            json.dump(storage_state, f, indent=2)

        print(f"\n[OK] Cookies 已保存: {storage_file}")
        print(f"  总共 {len(cookies_list)} 个 cookies")

        # 检查关键 cookies
        critical_cookies = ['SID', 'HSID', 'SSID']
        found = [c['name'] for c in cookies_list if c['name'] in critical_cookies]
        print(f"\n关键认证 cookies: {', '.join(found) if found else '未找到'}")

        if not found:
            print("\n[WARN] 未找到 Google 认证 cookies")
            print("请确保:")
            print("  1. Chrome 已完全关闭（检查任务管理器）")
            print("  2. 你已登录 Google 账号")
            print("  3. 已访问过 notebooklm.google.com")

    except Exception as e:
        print(f"[FAIL] 错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    export_cookies()
