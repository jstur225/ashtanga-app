#!/usr/bin/env python3
"""
用 MCP + JavaScript 自动操作 NotebookLM
"""

import json
import requests
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

MCP_URL = "http://127.0.0.1:12306/mcp"
SESSION_ID = None
NOTEBOOK_ID = "80059318-e0e8-4971-95cc-fde4b231d3a0"

TOPIC = """马年的第一练，过年吃胖了几斤，有些体式就做不下去了。
龟式的时候，肚子感觉挤得慌。要接受这个胖乎乎的自己。
觉察思绪比之前快了一些，有很多碎片，抓到了就丢掉了。

请用角度1-对话叙述型写一篇小红书文案。"""

def mcp_call(method, params=None, req_id=1):
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
    for line in text.split('\n'):
        if line.startswith('data:'):
            try:
                return json.loads(line[5:].strip())
            except:
                return None
    return None

def main():
    print("=" * 60)
    print("MCP + JavaScript 自动操作 NotebookLM")
    print("=" * 60)

    # 1. 初始化
    print("\n[1/4] 初始化 MCP...")
    mcp_call("initialize", {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "claude", "version": "1.0"}
    })
    print(f"[OK] Session: {SESSION_ID}")

    # 2. 导航到 NotebookLM
    print("\n[2/4] 导航到 NotebookLM...")
    mcp_call("tools/call", {
        "name": "chrome_navigate",
        "arguments": {"url": f"https://notebooklm.google.com/notebook/{NOTEBOOK_ID}"}
    }, req_id=2)
    print("[OK] 导航完成")
    time.sleep(5)  # 等待页面加载

    # 3. 使用 JavaScript 查找输入框并输入内容
    print("\n[3/4] 尝试自动输入选题...")

    js_code = f"""
    // 查找 NotebookLM 的输入框
    // 通常是一个 textarea 或 contenteditable div
    const selectors = [
        'textarea',
        '[contenteditable="true"]',
        'div[role="textbox"]',
        '.query-input',
        'input[type="text"]'
    ];

    let inputElement = null;
    for (const selector of selectors) {{
        const el = document.querySelector(selector);
        if (el) {{
            inputElement = el;
            break;
        }}
    }}

    if (inputElement) {{
        // 输入选题
        const topic = `{TOPIC}`;
        inputElement.focus();
        inputElement.value = topic;
        inputElement.textContent = topic;

        // 触发输入事件
        inputElement.dispatchEvent(new Event('input', {{ bubbles: true }}));
        inputElement.dispatchEvent(new Event('change', {{ bubbles: true }}));

        return {{
            success: true,
            element: inputElement.tagName,
            className: inputElement.className,
            valueSet: topic.substring(0, 50) + '...'
        }};
    }} else {{
        // 返回页面中所有可能的输入元素
        const allInputs = document.querySelectorAll('textarea, [contenteditable], input');
        return {{
            success: false,
            foundInputs: allInputs.length,
            inputTypes: Array.from(allInputs).slice(0, 5).map(el => ({{
                tag: el.tagName,
                class: el.className,
                placeholder: el.placeholder || 'N/A'
            }}))
        }};
    }}
    """

    result = mcp_call("tools/call", {
        "name": "chrome_javascript",
        "arguments": {"code": js_code}
    }, req_id=3)

    data = parse_result(result)
    if data and 'result' in data:
        content = data['result'].get('content', [])
        for item in content:
            if item.get('type') == 'text':
                try:
                    result_obj = json.loads(item.get('text', '{}'))
                    print(f"[OK] JavaScript 执行结果:")
                    print(f"  成功: {result_obj.get('success')}")
                    if result_obj.get('success'):
                        print(f"  元素: {result_obj.get('element')}")
                        print(f"  内容: {result_obj.get('valueSet')}")
                    else:
                        print(f"  找到 {result_obj.get('foundInputs')} 个输入元素")
                        for inp in result_obj.get('inputTypes', []):
                            print(f"    - {inp.get('tag')}: {inp.get('class')[:50]}")
                except json.JSONDecodeError:
                    print(f"原始响应: {item.get('text', '')[:500]}")
                break

    # 4. 截图查看结果
    print("\n[4/4] 截图...")
    mcp_call("tools/call", {
        "name": "chrome_screenshot",
        "arguments": {"storeBase64": True}
    }, req_id=4)
    print("[OK] 截图完成")

    print("\n" + "=" * 60)
    print("测试完成!")
    print("=" * 60)

if __name__ == "__main__":
    main()
