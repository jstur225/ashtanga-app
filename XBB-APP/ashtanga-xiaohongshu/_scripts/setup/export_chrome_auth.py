#!/usr/bin/env python3
"""
从已登录的 Chrome 导出 NotebookLM 认证状态
"""

import asyncio
import os
from pathlib import Path

os.environ['HTTP_PROXY'] = 'http://127.0.0.1:7897'
os.environ['HTTPS_PROXY'] = 'http://127.0.0.1:7897'

from playwright.async_api import async_playwright

# 你的 Chrome 用户数据目录
CHROME_USER_DATA = Path.home() / "AppData/Local/Google/Chrome/User Data"

def find_chrome_exe():
    """查找 Chrome 可执行文件"""
    possible_paths = [
        Path("C:/Program Files/Google/Chrome/Application/chrome.exe"),
        Path("C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"),
        Path.home() / "AppData/Local/Google/Chrome/Application/chrome.exe",
    ]
    for path in possible_paths:
        if path.exists():
            return str(path)
    return None

async def export_auth():
    storage_file = Path.home() / ".notebooklm" / "storage_state.json"

    chrome_exe = find_chrome_exe()
    if not chrome_exe:
        print("[FAIL] 未找到 Chrome")
        return

    print("=" * 60)
    print("导出 Chrome 认证状态")
    print("=" * 60)
    print(f"\nChrome: {chrome_exe}")
    print(f"用户数据: {CHROME_USER_DATA}")
    print(f"保存到: {storage_file}")
    print("\n说明:")
    print("1. 会打开你现有的 Chrome（带所有已登录账号）")
    print("2. 自动访问 NotebookLM 并保存认证状态")
    print("3. 完成后会自动关闭")
    print("=" * 60)

    async with async_playwright() as p:
        # 连接到你现有的 Chrome 配置
        print("\n[1/3] 启动 Chrome（使用你的用户配置）...")
        context = await p.chromium.launch_persistent_context(
            user_data_dir=str(CHROME_USER_DATA),
            executable_path=chrome_exe,
            headless=False,
            proxy={"server": "http://127.0.0.1:7897"},
            viewport={'width': 1280, 'height': 800},
        )

        page = context.pages[0] if context.pages else await context.new_page()

        print("[2/3] 访问 NotebookLM...")
        await page.goto("https://notebooklm.google.com/notebook/80059318-e0e8-4971-95cc-fde4b231d3a0", timeout=60000)

        # 等待页面加载
        await asyncio.sleep(3)

        current_url = page.url
        if "signin" in current_url or "accounts.google" in current_url:
            print("[WARN] 检测到需要登录，请在浏览器中完成登录")
            print("登录完成后，按回车键继续...")
            input()
        else:
            print("[OK] 已检测到登录状态")
            await asyncio.sleep(2)

        print("[3/3] 保存认证状态...")
        await context.storage_state(path=str(storage_file))

        print(f"\n[OK] 认证已保存: {storage_file}")
        print("现在可以关闭浏览器了")

        await asyncio.sleep(2)
        await context.close()

if __name__ == "__main__":
    asyncio.run(export_auth())
