#!/usr/bin/env python3
"""
MCP 客户端 - 正确实现
"""

import json
import requests
import uuid

MCP_URL = "http://127.0.0.1:12306/mcp"
SESSION_ID = None

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

    print(f"Initialize response: {response.status_code}")
    print(f"Response headers: {dict(response.headers)}")
    print(f"Response text: {response.text[:500]}")

    if response.status_code == 200:
        # 从 header 获取 session ID
        SESSION_ID = response.headers.get('mcp-session-id')
        if not SESSION_ID:
            # 尝试从响应体解析
            try:
                data = response.json()
                print(f"Response JSON: {data}")
            except:
                pass
        print(f"Session ID: {SESSION_ID}")
        return True
    return False

def mcp_list_tools():
    """获取可用工具列表"""
    global SESSION_ID

    if not SESSION_ID:
        print("[ERROR] 没有 session ID")
        return None

    response = requests.post(
        MCP_URL,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "mcp-session-id": SESSION_ID
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
        try:
            return response.json()
        except:
            return response.text
    return None

def mcp_call_tool(tool_name, params):
    """调用 MCP 工具"""
    global SESSION_ID

    if not SESSION_ID:
        print("[ERROR] 没有 session ID")
        return None

    response = requests.post(
        MCP_URL,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "mcp-session-id": SESSION_ID
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

    if response.status_code == 200:
        try:
            result = response.json()
            print(f"Result: {json.dumps(result, indent=2)[:500]}")
            return result
        except Exception as e:
            # 保存到文件避免编码问题
            with open('mcp_response.json', 'w', encoding='utf-8') as f:
                f.write(response.text)
            print(f"Response saved to mcp_response.json")
            return response.text
    return None

def main():
    print("=" * 60)
    print("MCP 客户端")
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
        print(f"[OK] 获取工具列表成功")
        if isinstance(tools, dict) and 'result' in tools:
            tools_list = tools['result'].get('tools', [])
            print(f"\n可用工具 ({len(tools_list)}):")
            for tool in tools_list:
                print(f"  - {tool.get('name')}")
    else:
        print("[WARN] 获取工具列表失败或为空")

    # 3. 获取窗口信息
    print("\n[3/4] 获取窗口信息...")
    result = mcp_call_tool("get_windows_and_tabs", {})
    if result:
        print(f"[OK] 获取成功")
    else:
        print("[WARN] 获取失败")

    # 4. 截图查看当前页面
    print("\n[4/4] 截图当前页面...")
    result = mcp_call_tool("chrome_screenshot", {})
    if result:
        print(f"[OK] 截图成功")
    else:
        print("[WARN] 截图失败")

    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
