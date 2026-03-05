#!/usr/bin/env python3
"""
NotebookLM 登录脚本（使用用户已有的 Chrome 配置）
"""

import asyncio
import os
from pathlib import Path

# 设置代理
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

async def login():
    storage_dir = Path.home() / ".notebooklm"
    storage_dir.mkdir(exist_ok=True)
    storage_file = storage_dir / "storage_state.json"

    chrome_exe = find_chrome_exe()
    if not chrome_exe:
        print("[FAIL] 未找到 Chrome，请确保已安装 Chrome 浏览器")
        return

    print("=" * 60)
    print("NotebookLM 登录（使用现有 Chrome）")
    print("=" * 60)
    print(f"\nChrome: {chrome_exe}")
    print(f"用户数据: {CHROME_USER_DATA}")
    print(f"保存路径: {storage_file}")
    print("\n说明:")
    print("1. 会使用你现有的 Chrome 配置（包括已登录的 Google 账号）")
    print("2. 如果 Chrome 已登录 Google，会自动进入 NotebookLM")
    print("3. 如果没有登录，请在打开的浏览器中登录")
    print("4. 完成后关闭浏览器即可")
    print("=" * 60)

    async with async_playwright() as p:
        # 使用用户现有的 Chrome 配置（通过 launch_persistent_context）
        context = await p.chromium.launch_persistent_context(
            user_data_dir=str(CHROME_USER_DATA),
            executable_path=chrome_exe,
            headless=False,
            proxy={"server": "http://127.0.0.1:7897"},
            viewport={'width': 1280, 'height': 800},
            args=[
                '--disable-blink-features=AutomationControlled',  # 隐藏自动化标记
            ]
        )
        page = context.pages[0] if context.pages else await context.new_page()

        print("\n[1/2] 正在打开 NotebookLM...")

        try:
            await page.goto("https://notebooklm.google.com/", timeout=60000)
            current_url = page.url

            if "signin" in current_url or "accounts.google" in current_url:
                print("[2/2] 需要登录 Google 账号")
                print("请在浏览器中完成登录")
            else:
                print("[2/2] 已检测到登录状态")
                print("如果看到 NotebookLM 首页，请关闭浏览器")

            # 等待浏览器关闭
            while True:
                await asyncio.sleep(2)
                try:
                    _ = page.url
                except:
                    break

        except Exception as e:
            print(f"错误: {e}")
        finally:
            print("\n正在保存登录状态...")
            await context.storage_state(path=str(storage_file))
            try:
                await context.close()
            except:
                pass
            print(f"[OK] 登录状态已保存: {storage_file}")

if __name__ == "__main__":
    asyncio.run(login())
