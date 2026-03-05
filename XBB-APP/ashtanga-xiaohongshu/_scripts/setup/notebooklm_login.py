#!/usr/bin/env python3
"""
NotebookLM 登录脚本（带代理）
"""

import asyncio
import os
from pathlib import Path

# 设置代理
os.environ['HTTP_PROXY'] = 'http://127.0.0.1:7897'
os.environ['HTTPS_PROXY'] = 'http://127.0.0.1:7897'

from playwright.async_api import async_playwright

async def login():
    """手动登录并保存状态"""

    storage_dir = Path.home() / ".notebooklm"
    storage_dir.mkdir(exist_ok=True)
    storage_file = storage_dir / "storage_state.json"

    print("=" * 50)
    print("NotebookLM 登录")
    print("=" * 50)
    print(f"\n代理: http://127.0.0.1:7897")
    print(f"保存路径: {storage_file}")
    print("\n说明:")
    print("1. 会打开浏览器")
    print("2. 请登录 Google 账号")
    print("3. 看到 NotebookLM 首页后，关闭浏览器")
    print("4. 认证信息会自动保存")
    print("=" * 50)

    async with async_playwright() as p:
        # 启动浏览器（带代理）
        browser = await p.chromium.launch(
            headless=False,
            proxy={"server": "http://127.0.0.1:7897"}
        )

        context = await browser.new_context()
        page = await context.new_page()

        print("\n正在打开 NotebookLM...")

        try:
            await page.goto("https://notebooklm.google.com/", timeout=60000)
            print("页面加载完成，请登录 Google 账号")
            print("（如果已经登录，会直接看到 NotebookLM 首页）")

            # 等待用户关闭浏览器
            print("\n登录完成后，请关闭浏览器窗口...")

            # 监控页面，如果看到 notebooklm 页面就保存状态
            while True:
                await asyncio.sleep(2)
                url = page.url
                if "notebooklm" in url and "google" in url:
                    # 检查是否已经登录（有特定的页面元素）
                    try:
                        # 等待用户手动关闭
                        if not await page.evaluate("() => document.visibilityState === 'visible'"):
                            break
                    except:
                        break

        except Exception as e:
            print(f"错误: {e}")
        finally:
            # 保存状态
            print("\n正在保存登录状态...")
            await context.storage_state(path=str(storage_file))
            await browser.close()
            print(f"✅ 登录状态已保存: {storage_file}")
            print("\n现在可以使用 notebooklm 命令了！")

if __name__ == "__main__":
    asyncio.run(login())
