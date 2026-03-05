#!/usr/bin/env python3
"""输入选题并发送到NotebookLM"""

import json
import requests
import time

MCP_URL = 'http://127.0.0.1:12306/mcp'
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

# 选题 - NotebookLM已内置提示词，只需发送主题和简单指令
TOPIC_CORE = """2026要频繁大量记录自己的练习"""

# 正确的输入格式：NotebookLM已内置提示词
USER_INPUT = f'''以"{TOPIC_CORE}"为主题，帮我写2个不同角度的小红书文案'''

# 1. 初始化
print("[1/3] 初始化 MCP...")
mcp_call("initialize", {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "input-topic", "version": "1.0"}
}, req_id=1)
print(f"[OK] Session: {SESSION_ID[:20]}...")

# 2. 输入选题
print("\n[2/3] 输入选题...")

js_code = f"""
const topic = `{USER_INPUT}`;

const textareas = document.querySelectorAll('textarea');
let chatInput = null;

for (let ta of textareas) {{
    if (ta.placeholder && ta.placeholder.includes('开始输入')) {{
        chatInput = ta;
        break;
    }}
}}

if (!chatInput && textareas.length >= 3) {{
    chatInput = textareas[2];
}}

if (chatInput) {{
    chatInput.focus();
    chatInput.click();
    chatInput.value = topic;
    chatInput.dispatchEvent(new Event('input', {{ bubbles: true }}));
    chatInput.dispatchEvent(new Event('change', {{ bubbles: true }}));
    return '已输入: ' + topic.substring(0, 40) + '...';
}} else {{
    return '未找到输入框，找到 ' + textareas.length + ' 个 textarea';
}}
"""

result = mcp_call("tools/call", {
    "name": "chrome_javascript",
    "arguments": {"code": js_code}
}, req_id=2)

# 解析结果
for line in result.split('\n'):
    if line.startswith('data:'):
        try:
            data = json.loads(line[5:].strip())
            if data.get('result'):
                for item in data['result'].get('content', []):
                    if item.get('type') == 'text':
                        print(f"[OK] {item.get('text', '')[:100]}")
        except:
            pass
        break

# 3. 发送
print("\n[3/3] 发送...")
time.sleep(1)

js_send = """
const textareas = document.querySelectorAll('textarea');
let chatInput = null;

for (let ta of textareas) {
    if (ta.placeholder && ta.placeholder.includes('开始输入')) {
        chatInput = ta;
        break;
    }
}

if (!chatInput && textareas.length >= 3) {
    chatInput = textareas[2];
}

if (chatInput) {
    const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
    });
    chatInput.dispatchEvent(event);
    return '已发送';
} else {
    return '未找到输入框';
}
"""

result = mcp_call("tools/call", {
    "name": "chrome_javascript",
    "arguments": {"code": js_send}
}, req_id=3)

for line in result.split('\n'):
    if line.startswith('data:'):
        try:
            data = json.loads(line[5:].strip())
            if data.get('result'):
                for item in data['result'].get('content', []):
                    if item.get('type') == 'text':
                        print(f"[OK] {item.get('text', '')}")
        except:
            pass
        break

print("\n" + "=" * 60)
print("主题已发送到 NotebookLM")
print("输入内容：以\"[主题内容]\"为主题，帮我写2个不同角度的小红书文案")
print("请等待 30-60 秒后查看结果")
print("=" * 60)
