#!/usr/bin/env python3
"""
用 Playwright 直接操作 NotebookLM
使用用户已登录的 Chrome 配置
"""

import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

# 代理设置
os.environ['HTTP_PROXY'] = 'http://127.0.0.1:7897'
os.environ['HTTPS_PROXY'] = 'http://127.0.0.1:7897'

# 你的 Chrome 配置
CHROME_USER_DATA = Path.home() / "AppData/Local/Google/Chrome/User Data"
NOTEBOOK_ID = "80059318-e0e8-4971-95cc-fde4b231d3a0"

# 选题
TOPIC = """马年的第一练，过年吃胖了几斤，有些体式就做不下去了。
龟式的时候，肚子感觉挤得慌。要接受这个胖乎乎的自己。
觉察思绪比之前快了一些，有很多碎片，抓到了就丢掉了。

请用角度1-对话叙述型写一篇小红书文案，要求口语化、真诚、有画面感。"""

async def generate_with_notebooklm():
    """用 Playwright 操作 NotebookLM"""
    print("=" * 60)
    print("Playwright + NotebookLM 自动化")
    print("=" * 60)

    async with async_playwright() as p:
        # 连接到你已有的 Chrome
        print("\n[1/4] 连接到 Chrome...")
        try:
            context = await p.chromium.launch_persistent_context(
                user_data_dir=str(CHROME_USER_DATA),
                headless=False,  # 显示浏览器界面
                proxy={"server": "http://127.0.0.1:7897"},
                viewport={'width': 1280, 'height': 800},
                args=['--disable-blink-features=AutomationControlled']
            )
            print("[OK] Chrome 已连接")
        except Exception as e:
            print(f"[FAIL] 连接失败: {e}")
            return None

        # 获取或创建页面
        pages = context.pages
        if pages:
            page = pages[0]
            print(f"[OK] 使用现有页面")
        else:
            page = await context.new_page()
            print(f"[OK] 创建新页面")

        # 导航到 NotebookLM
        print("\n[2/4] 导航到 NotebookLM...")
        await page.goto(f"https://notebooklm.google.com/notebook/{NOTEBOOK_ID}", timeout=60000)
        print(f"[OK] 页面加载完成: {page.url}")

        # 等待页面完全加载
        print("\n[3/4] 等待页面加载...")
        await page.wait_for_load_state('networkidle')
        await asyncio.sleep(3)
        print("[OK] 页面已稳定")

        # 查找输入框
        print("\n[4/4] 查找输入框...")

        # 尝试多种选择器
        selectors = [
            'textarea[placeholder*="询问"]',  # 中文placeholder
            'textarea[placeholder*="Ask"]',
            'textarea[placeholder*="提问"]',
            '[contenteditable="true"]',
            'div[role="textbox"]',
            'textarea',
            'input[type="text"]'
        ]

        input_box = None
        for selector in selectors:
            try:
                input_box = await page.wait_for_selector(selector, timeout=5000)
                if input_box:
                    print(f"[OK] 找到输入框: {selector}")
                    break
            except:
                continue

        if not input_box:
            print("[WARN] 未找到输入框，尝试通过页面文本查找...")
            # 截图查看
            await page.screenshot(path='notebooklm_screenshot.png', full_page=True)
            print("[OK] 已截图保存到 notebooklm_screenshot.png")

            # 获取页面HTML
            html = await page.content()
            with open('notebooklm_page.html', 'w', encoding='utf-8') as f:
                f.write(html)
            print("[OK] 已保存页面 HTML")

            await context.close()
            return None

        # 输入选题
        print("\n输入选题中...")
        await input_box.fill(TOPIC)
        print("[OK] 选题已输入")

        # 查找发送按钮
        send_button = None
        send_selectors = [
            'button[type="submit"]',
            'button:has-text("发送")',
            'button:has-text("Send")',
            'button[aria-label*="发送"]',
            'button svg',  # 可能有图标按钮
        ]

        for selector in send_selectors:
            try:
                send_button = await page.wait_for_selector(selector, timeout=3000)
                if send_button:
                    print(f"[OK] 找到发送按钮: {selector}")
                    break
            except:
                continue

        if send_button:
            await send_button.click()
            print("[OK] 已点击发送")
        else:
            # 尝试按回车键
            await input_box.press('Enter')
            print("[OK] 已按回车发送")

        # 等待生成结果
        print("\n等待 NotebookLM 生成文案...")
        print("(这可能需要 30-60 秒)")

        # 等待响应出现
        try:
            # 等待一段时间让内容生成
            await asyncio.sleep(30)

            # 截图查看结果
            await page.screenshot(path='notebooklm_result.png', full_page=True)
            print("[OK] 结果已截图保存到 notebooklm_result.png")

            # 获取生成的文本
            response_selectors = [
                '.response-content',
                '.chat-response',
                '[data-testid="response"]',
                'article',
                '.message-content'
            ]

            for selector in response_selectors:
                try:
                    response = await page.wait_for_selector(selector, timeout=5000)
                    if response:
                        text = await response.text_content()
                        print(f"\n[OK] 获取到生成内容:")
                        print(text[:500])

                        # 保存结果
                        with open('generated_by_notebooklm.txt', 'w', encoding='utf-8') as f:
                            f.write(text)
                        print("\n[OK] 完整内容已保存到 generated_by_notebooklm.txt")
                        break
                except:
                    continue

        except Exception as e:
            print(f"[WARN] 获取结果时出错: {e}")

        await context.close()
        print("\n" + "=" * 60)
        print("完成!")
        print("=" * 60)

        return True

if __name__ == "__main__":
    result = asyncio.run(generate_with_notebooklm())
    if result:
        print("\n✅ 自动化成功!")
    else:
        print("\n⚠️ 需要手动操作，请查看截图和HTML文件定位输入框")
