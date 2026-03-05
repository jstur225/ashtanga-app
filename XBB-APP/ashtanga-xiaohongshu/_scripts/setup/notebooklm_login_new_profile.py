#!/usr/bin/env python3
"""
NotebookLM 登录脚本（新建专用 Chrome 配置）
"""

import asyncio
import os
import shutil
from pathlib import Path

# 设置代理
os.environ['HTTP_PROXY'] = 'http://127.0.0.1:7897'
os.environ['HTTPS_PROXY'] = 'http://127.0.0.1:7897'

from playwright.async_api import async_playwright

# 专用的 NotebookLM 用户数据目录
NOTEBOOKLM_PROFILE = Path.home() / ".notebooklm" / "chrome_profile"

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

    # 清理旧的 profile（如果有）
    if NOTEBOOKLM_PROFILE.exists():
        shutil.rmtree(NOTEBOOKLM_PROFILE)
    NOTEBOOKLM_PROFILE.mkdir(parents=True, exist_ok=True)

    chrome_exe = find_chrome_exe()
    if not chrome_exe:
        print("[FAIL] 未找到 Chrome，请确保已安装 Chrome 浏览器")
        return

    print("=" * 60)
    print("NotebookLM 登录")
    print("=" * 60)
    print(f"\nChrome: {chrome_exe}")
    print(f"专用配置: {NOTEBOOKLM_PROFILE}")
    print(f"保存路径: {storage_file}")
    print("\n说明:")
    print("1. 会打开一个全新的 Chrome 窗口")
    print("2. 请在浏览器中登录你的 Google 账号")
    print("3. 登录成功后，访问 https://notebooklm.google.com/")
    print("4. 看到 NotebookLM 首页后，关闭浏览器")
    print("=" * 60)

    async with async_playwright() as p:
        # 使用全新的用户配置启动 Chrome
        context = await p.chromium.launch_persistent_context(
            user_data_dir=str(NOTEBOOKLM_PROFILE),
            executable_path=chrome_exe,
            headless=False,
            proxy={"server": "http://127.0.0.1:7897"},
            viewport={'width': 1280, 'height': 800},
            bypass_csp=True,
        )
        page = context.pages[0] if context.pages else await context.new_page()

        # 直接打开 Google 登录页面
        print("\n[1/2] 正在打开 Google 登录页面...")
        await page.goto("https://accounts.google.com/signin", timeout=60000)

        print("[2/2] 请完成以下步骤：")
        print("  1. 在浏览器中登录 Google 账号")
        print("  2. 登录成功后，访问 https://notebooklm.google.com/")
        print("  3. 看到 NotebookLM 首页后，关闭浏览器")
        print("\n等待中...")

        # 等待浏览器关闭
        while True:
            await asyncio.sleep(2)
            try:
                _ = page.url
            except:
                break

        print("\n正在保存登录状态...")
        await context.storage_state(path=str(storage_file))
        try:
            await context.close()
        except:
            pass
        print(f"[OK] 登录状态已保存: {storage_file}")
        print("\n现在可以使用 generate_content.py 了！")

if __name__ == "__main__":
    asyncio.run(login())
