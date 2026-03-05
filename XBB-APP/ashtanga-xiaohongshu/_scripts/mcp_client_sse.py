#!/usr/bin/env python3
"""
MCP 客户端 - 使用 SSE 流
"""

import json
import requests
import uuid
import threading
import queue
import time

MCP_URL = "http://127.0.0.1:12306/mcp"
SESSION_ID = f"claude-session-{uuid.uuid4().hex[:8]}"
message_queue = queue.Queue()

def sse_listener():
    """SSE 事件监听器（后台线程）"""
    print(f"[SSE] 启动监听器，Session: {SESSION_ID}")

    try:
        response = requests.get(
            f"{MCP_URL}?session_id={SESSION_ID}",
            headers={
                "Accept": "text/event-stream",
                "Cache-Control": "no-cache"
            },
            stream=True
        )

        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8')
                if line.startswith('data:'):
                    data = line[5:].strip()
                    print(f"[SSE] 收到: {data[:200]}")
                    message_queue.put(data)
    except Exception as e:
        print(f"[SSE] 错误: {e}")

def send_request(method, params=None, req_id=None):
    """发送 MCP 请求"""
    if req_id is None:
        req_id = int(time.time() * 1000)

    payload = {
        "jsonrpc": "2.0",
        "id": req_id,
        "method": method
    }
    if params is not None:
        payload["params"] = params

    print(f"[POST] {method}")
    response = requests.post(
        f"{MCP_URL}?session_id={SESSION_ID}",
        headers={"Content-Type": "application/json"},
        json=payload
    )
    print(f"[POST] 状态: {response.status_code}")

    # 等待 SSE 响应
    try:
        data = message_queue.get(timeout=5)
        return json.loads(data)
    except queue.Empty:
        print("[ERROR] 等待响应超时")
        return None
    except json.JSONDecodeError as e:
        print(f"[ERROR] JSON 解析错误: {e}")
        return None

def main():
    print("=" * 60)
    print("MCP 客户端 (SSE 模式)")
    print("=" * 60)
    print(f"Session ID: {SESSION_ID}")

    # 1. 启动 SSE 监听器
    print("\n[1/4] 启动 SSE 监听器...")
    sse_thread = threading.Thread(target=sse_listener, daemon=True)
    sse_thread.start()
    time.sleep(1)

    # 2. 初始化
    print("\n[2/4] 初始化 MCP...")
    result = send_request("initialize", {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "claude", "version": "1.0"}
    }, req_id=1)

    if result:
        print(f"[OK] 初始化成功: {result.get('result', {}).get('serverInfo', {})}")
    else:
        print("[FAIL] 初始化失败")
        return

    # 3. 获取工具列表
    print("\n[3/4] 获取工具列表...")
    result = send_request("tools/list", req_id=2)

    if result and 'result' in result:
        tools = result['result'].get('tools', [])
        print(f"[OK] 找到 {len(tools)} 个工具:")
        for tool in tools:
            print(f"  - {tool.get('name')}")
    else:
        print(f"[FAIL] 获取工具列表失败: {result}")

    # 4. 测试调用
    print("\n[4/4] 测试调用 chrome_get_windows_and_tabs...")
    result = send_request("tools/call", {
        "name": "chrome_get_windows_and_tabs",
        "arguments": {}
    }, req_id=3)

    if result:
        print(f"[OK] 调用成功: {result}")
    else:
        print("[FAIL] 调用失败")

    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
