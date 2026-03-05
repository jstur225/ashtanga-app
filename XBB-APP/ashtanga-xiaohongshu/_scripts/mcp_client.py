#!/usr/bin/env python3
"""
MCP 客户端 - 测试连接
"""

import json
import requests
import uuid
import re

MCP_URL = "http://127.0.0.1:12306/mcp"
SESSION_ID = None

def parse_sse_response(text):
    """解析 SSE 响应"""
    lines = text.strip().split('\n')
    data = None
    for line in lines:
        if line.startswith('data:'):
            data = line[5:].strip()
            break
    if data:
        try:
            return json.loads(data)
        except:
            return None
    return None

def mcp_initialize():
    """初始化 MCP 连接"""
    global SESSION_ID

    # 生成唯一 session ID
    SESSION_ID = f"claude-session-{uuid.uuid4().hex[:8]}"

    response = requests.post(
        f"{MCP_URL}?session_id={SESSION_ID}",
        headers={
            "Content-Type": "application/json",
            "Accept": "text/event-stream, application/json"
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
    print(f"Initialize response: {response.status_code}")
    print(f"Session ID: {SESSION_ID}")
    print(f"Response text: {response.text[:500]}")

    result = parse_sse_response(response.text)
    return response.status_code == 200 and result is not None

def mcp_list_tools():
    """获取可用工具列表"""
    global SESSION_ID

    response = requests.post(
        f"{MCP_URL}?session_id={SESSION_ID}",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
        },
        json={
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/list"
        }
    )
    print(f"\nTools response: {response.status_code}")
    print(f"Response: {response.text[:1000]}")

    if response.status_code == 200:
        return parse_sse_response(response.text) or response.json()
    return None

def mcp_call_tool(tool_name, params):
    """调用 MCP 工具"""
    global SESSION_ID

    response = requests.post(
        f"{MCP_URL}?session_id={SESSION_ID}",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
        },
        json={
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": params
            }
        }
    )
    print(f"\nTool call response: {response.status_code}")
    print(f"Response: {response.text[:2000]}")

    if response.status_code == 200:
        return parse_sse_response(response.text) or response.json()
    return None

def main():
    print("=" * 60)
    print("MCP 客户端测试")
    print("=" * 60)

    # 1. 初始化
    print("\n[1/3] 初始化 MCP...")
    if mcp_initialize():
        print("[OK] 初始化成功")
    else:
        print("[FAIL] 初始化失败")
        return

    # 2. 获取工具列表
    print("\n[2/3] 获取工具列表...")
    tools = mcp_list_tools()
    if tools:
        print("[OK] 获取工具列表成功")
        if 'result' in tools and 'tools' in tools['result']:
            print(f"\n可用工具 ({len(tools['result']['tools'])}):")
            for tool in tools['result']['tools']:
                print(f"  - {tool.get('name')}: {tool.get('description', 'N/A')[:60]}...")
    else:
        print("[FAIL] 获取工具列表失败")

    # 3. 测试调用 chrome_get_windows_and_tabs
    print("\n[3/3] 测试调用 chrome_get_windows_and_tabs...")
    result = mcp_call_tool("chrome_get_windows_and_tabs", {})
    if result:
        print("[OK] 工具调用成功")
    else:
        print("[FAIL] 工具调用失败")

    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
