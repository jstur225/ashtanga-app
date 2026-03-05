#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NotebookLM 认证脚本 - 绕过预检查直接登录
"""

import os
import sys

# 设置代理
os.environ['HTTP_PROXY'] = 'http://127.0.0.1:7897'
os.environ['HTTPS_PROXY'] = 'http://127.0.0.1:7897'
os.environ['PYTHONUTF8'] = '1'

# 设置 playwright 路径
sys.path.insert(0, 'C:/Users/BIN/AppData/Roaming/Python/Python314/site-packages')

from pathlib import Path
from playwright.sync_api import sync_playwright

# 路径配置
NOTEBOOKLM_HOME = Path.home() / ".notebooklm"
STORAGE_PATH = NOTEBOOKLM_HOME / "storage_state.json"
BROWSER_PROFILE = NOTEBOOKLM_HOME / "browser_profile"

def main():
    # 创建目录
    NOTEBOOKLM_HOME.mkdir(parents=True, exist_ok=True)
    BROWSER_PROFILE.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("NotebookLM 认证")
    print("=" * 60)
    print(f"浏览器配置: {BROWSER_PROFILE}")
    print(f"存储路径: {STORAGE_PATH}")
    print("-" * 60)

    with sync_playwright() as p:
        # 启动持久化浏览器上下文
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(BROWSER_PROFILE),
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--password-store=basic",
            ],
            ignore_default_args=["--enable-automation"],
        )

        page = context.pages[0] if context.pages else context.new_page()
        print("正在打开 NotebookLM...")
        page.goto("https://notebooklm.google.com/")

        print("\n" + "=" * 60)
        print("操作说明:")
        print("=" * 60)
        print("1. 在浏览器窗口中完成 Google 登录")
        print("2. 等待看到 NotebookLM 首页")
        print("3. 按 ENTER 键保存认证信息")
        print("=" * 60)

        input("\n[完成后按 ENTER 键] ")

        current_url = page.url
        if "notebooklm.google.com" not in current_url:
            print(f"警告: 当前 URL 是 {current_url}")
            confirm = input("是否仍然保存认证? (y/n): ")
            if confirm.lower() != 'y':
                context.close()
                print("已取消")
                return

        # 保存存储状态
        context.storage_state(path=str(STORAGE_PATH))
        STORAGE_PATH.chmod(0o600)
        context.close()

        print(f"\n[OK] 认证已保存到: {STORAGE_PATH}")
        print("现在可以使用 notebooklm 命令了")

if __name__ == "__main__":
    main()
