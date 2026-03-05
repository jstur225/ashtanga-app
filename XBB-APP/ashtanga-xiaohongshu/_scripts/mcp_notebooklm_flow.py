#!/usr/bin/env python3
"""
用 MCP 完整操作 NotebookLM 生成文案
"""

import json
import requests
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

MCP_URL = "http://127.0.0.1:12306/mcp"
SESSION_ID = None
NOTEBOOK_ID = "80059318-e0e8-4971-95cc-fde4b231d3a0"

# 选题
TOPIC = """马年的第一练，过年吃胖了几斤，有些体式就做不下去了。龟式的时候，肚子感觉挤得慌。要接受这个胖乎乎的自己。觉察思绪比之前快了一些，有很多碎片，抓到了就丢掉了。"""

def mcp_call(method, params=None, req_id=1):
    """调用 MCP"""
    global SESSION_ID

    if method == "initialize":
        resp = requests.post(
            MCP_URL,
            headers={"Content-Type": "application/json", "Accept": "application/json, text/event-stream"},
            json={"jsonrpc": "2.0", "id": req_id, "method": method, "params": params or {}}
        )
        SESSION_ID = resp.headers.get('mcp-session-id')
        return resp.text
    else:
        resp = requests.post(
            f"{MCP_URL}?session_id={SESSION_ID}",
            headers={"Content-Type": "application/json", "Accept": "application/json, text/event-stream", "mcp-session-id": SESSION_ID},
            json={"jsonrpc": "2.0", "id": req_id, "method": method, "params": params or {}}
        )
        return resp.text

def parse_result(text):
    """解析 MCP 响应"""
    for line in text.split('\n'):
        if line.startswith('data:'):
            try:
                return json.loads(line[5:].strip())
            except:
                return None
    return None

def main():
    print("=" * 60)
    print("MCP + NotebookLM 完整流程测试")
    print("=" * 60)

    # 1. 初始化
    print("\n[1/5] 初始化 MCP...")
    result = mcp_call("initialize", {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "claude", "version": "1.0"}
    })
    print(f"[OK] Session: {SESSION_ID}")

    # 2. 导航到 NotebookLM
    print("\n[2/5] 导航到 NotebookLM...")
    result = mcp_call("tools/call", {
        "name": "chrome_navigate",
        "arguments": {"url": f"https://notebooklm.google.com/notebook/{NOTEBOOK_ID}"}
    }, req_id=2)
    print(f"[OK] 导航完成")
    time.sleep(3)

    # 3. 读取页面
    print("\n[3/5] 读取页面内容...")
    result = mcp_call("tools/call", {
        "name": "chrome_read_page",
        "arguments": {"filter": "interactive"}
    }, req_id=3)

    data = parse_result(result)
    if data and 'result' in data:
        content = data['result'].get('content', [])
        for item in content:
            if item.get('type') == 'text':
                print(f"页面内容: {item.get('text', '')[:500]}")
                break

    # 4. 截图查看
    print("\n[4/5] 截图...")
    result = mcp_call("tools/call", {
        "name": "chrome_screenshot",
        "arguments": {"fullPage": True, "storeBase64": True}
    }, req_id=4)
    print(f"[OK] 截图完成")

    # 保存结果
    with open('notebooklm_test_result.json', 'w', encoding='utf-8') as f:
        json.dump({
            'timestamp': time.time(),
            'notebook_id': NOTEBOOK_ID,
            'topic': TOPIC,
            'responses': {
                'navigate': result[:500] if result else None
            }
        }, f, ensure_ascii=False, indent=2)

    print("\n[5/5] 结果已保存到 notebooklm_test_result.json")

    print("\n" + "=" * 60)
    print("流程测试完成!")
    print("=" * 60)
    print("\n注意: 由于 NotebookLM 页面结构复杂,")
    print("建议手动在页面中输入选题生成文案。")
    print("\n或者我们可以尝试用 JavaScript 注入方式自动输入。")

if __name__ == "__main__":
    main()
