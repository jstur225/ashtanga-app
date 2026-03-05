#!/usr/bin/env python3
"""获取NotebookLM生成的结果"""

import json
import requests

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

# 初始化
mcp_call("initialize", {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "get-result", "version": "1.0"}
}, req_id=1)

# 获取页面内容
js_get = """
// 获取NotebookLM的回复
const messages = document.querySelectorAll('.chat-message, .message, .chat-bubble, [data-testid="chat-message"]');

if (messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    return JSON.stringify({
        found: true,
        count: messages.length,
        text: lastMessage.textContent
    });
}

// 备选：获取页面中所有可能的回复内容
const allText = document.body.innerText;
const lines = allText.split('\\n').filter(l => l.trim().length > 20);

return JSON.stringify({
    found: false,
    pageText: lines.slice(-10).join('\\n')  // 最后10行
});
"""

result = mcp_call("tools/call", {
    "name": "chrome_javascript",
    "arguments": {"code": js_get}
}, req_id=2)

# 解析并保存
for line in result.split('\n'):
    if line.startswith('data:'):
        try:
            data = json.loads(line[5:].strip())
            if data.get('result'):
                for item in data['result'].get('content', []):
                    if item.get('type') == 'text':
                        text = item.get('text', '')
                        # 尝试解析内层JSON
                        try:
                            inner = json.loads(text)
                            if inner.get('found'):
                                print("=" * 60)
                                print("NotebookLM 生成的文案:")
                                print("=" * 60)
                                print(inner['text'])
                                print("\n" + "=" * 60)

                                with open('final_result.txt', 'w', encoding='utf-8') as f:
                                    f.write(inner['text'])
                                print("已保存到 final_result.txt")
                            else:
                                print("页面文本预览:")
                                print(inner.get('pageText', '')[:1000])
                        except:
                            print(text[:2000])
                        break
        except:
            pass
        break
