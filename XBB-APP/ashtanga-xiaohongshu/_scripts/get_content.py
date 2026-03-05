#!/usr/bin/env python3
"""获取NotebookLM生成的内容"""

import json
import requests

MCP_URL = "http://127.0.0.1:12306/mcp"
SESSION_ID = None

def mcp_call(method, params=None, req_id=1):
    global SESSION_ID
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
    }

    if method == "initialize":
        resp = requests.post(MCP_URL, headers=headers,
            json={"jsonrpc": "2.0", "id": req_id, "method": method, "params": params or {}})
        SESSION_ID = resp.headers.get('mcp-session-id')
        return resp.text
    else:
        headers["mcp-session-id"] = SESSION_ID
        resp = requests.post(f"{MCP_URL}?session_id={SESSION_ID}", headers=headers,
            json={"jsonrpc": "2.0", "id": req_id, "method": method, "params": params or {}})
        return resp.text

# 初始化
mcp_call("initialize", {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "get-content", "version": "1.0"}
}, req_id=1)

# 使用 chrome_get_web_content 获取页面文本
result = mcp_call("tools/call", {
    "name": "chrome_get_web_content",
    "arguments": {"textContent": True, "htmlContent": False}
}, req_id=2)

# 解析并保存
for line in result.split('\n'):
    if line.startswith('data:'):
        try:
            data = json.loads(line[5:].strip())
            if data.get('result'):
                content = data['result'].get('content', [])
                for item in content:
                    if item.get('type') == 'text':
                        text = item.get('text', '')
                        # 尝试解析JSON结果
                        try:
                            inner = json.loads(text)
                            if inner.get('textContent'):
                                print("页面内容:\n")
                                print(inner['textContent'][:2000])

                                with open('notebooklm_content.txt', 'w', encoding='utf-8') as f:
                                    f.write(inner['textContent'])
                                print("\n\n已保存到 notebooklm_content.txt")
                        except:
                            print(text[:2000])
                        break
        except:
            pass
