#!/usr/bin/env python3
"""
用 MCP 操作 NotebookLM 生成文案
"""

import json
import requests
import sys

sys.stdout.reconfigure(encoding='utf-8')

MCP_URL = "http://127.0.0.1:12306/mcp"
SESSION_ID = None

# 选题内容
TOPIC = """马年的第一练，过年吃胖了几斤，有些体式就做不下去了。
龟式的时候,肚子感觉挤得慌。要接受这个胖乎乎的自己。
觉察思绪比之前快了一些，有很多碎片，抓到了就丢掉了。"""

def mcp_initialize():
    """初始化 MCP 连接"""
    global SESSION_ID

    response = requests.post(
        MCP_URL,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
        },
        json={
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {"name": "claude", "version": "1.0"}
            }
        }
    )

    if response.status_code == 200:
        SESSION_ID = response.headers.get('mcp-session-id')
        print(f"[OK] MCP 初始化成功, Session: {SESSION_ID}")
        return True
    return False

def mcp_call_tool(tool_name, params):
    """调用 MCP 工具"""
    response = requests.post(
        f"{MCP_URL}?session_id={SESSION_ID}",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "mcp-session-id": SESSION_ID
        },
        json={
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": params
            }
        }
    )

    if response.status_code == 200:
        return response.text
    return None

def main():
    print("=" * 60)
    print("MCP + NotebookLM 测试")
    print("=" * 60)

    # 1. 初始化
    if not mcp_initialize():
        print("[FAIL] MCP 初始化失败")
        return

    # 2. 获取窗口信息
    print("\n[1/3] 获取浏览器窗口...")
    result = mcp_call_tool("get_windows_and_tabs", {})
    if result:
        print("[OK] 获取窗口成功")
        # 查找 NotebookLM 标签页
        if "notebooklm.google.com" in result:
            print("[OK] 找到 NotebookLM 标签页")
        else:
            print("[WARN] 未找到 NotebookLM 标签页")

    # 3. 截图查看当前状态
    print("\n[2/3] 截图当前页面...")
    result = mcp_call_tool("chrome_screenshot", {"fullPage": True})
    if result:
        print("[OK] 截图成功")
        # 保存截图信息
        with open('screenshot_result.txt', 'w', encoding='utf-8') as f:
            f.write(result[:2000])
        print("  截图结果已保存到 screenshot_result.txt")

    # 4. 尝试读取页面内容
    print("\n[3/3] 读取页面内容...")
    result = mcp_call_tool("chrome_read_page", {"filter": "interactive"})
    if result:
        print("[OK] 读取页面成功")
        with open('page_content.txt', 'w', encoding='utf-8') as f:
            f.write(result[:3000])
        print("  页面内容已保存到 page_content.txt")

    print("\n" + "=" * 60)
    print("测试完成!")
    print("=" * 60)

if __name__ == "__main__":
    main()
