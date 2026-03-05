#!/usr/bin/env python3
"""
用 MCP 控制 NotebookLM - 简化版
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

请用角度1-对话叙述型写一篇小红书文案，要求口语化、真诚、有画面感。"""

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

def main():
    print("=" * 60)
    print("MCP + NotebookLM 自动化")
    print("=" * 60)

    # 1. 初始化
    print("\n[1/4] 初始化 MCP...")
    mcp_call("initialize", {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "notebooklm-auto", "version": "1.0"}
    }, req_id=1)
    print(f"[OK] Session: {SESSION_ID[:20]}...")

    # 2. 导航到 NotebookLM
    print("\n[2/4] 导航到 NotebookLM...")
    mcp_call("tools/call", {
        "name": "chrome_navigate",
        "arguments": {"url": f"https://notebooklm.google.com/notebook/{NOTEBOOK_ID}"}
    }, req_id=2)
    print("[OK] 导航完成")
    time.sleep(4)

    # 3. 截图查看当前页面
    print("\n[3/4] 截图...")
    mcp_call("tools/call", {
        "name": "chrome_screenshot",
        "arguments": {"savePng": True, "name": "notebooklm_before"}
    }, req_id=3)
    print("[OK] 截图保存到 notebooklm_before.png")

    # 4. 输入选题并发送
    print("\n[4/4] 输入选题并发送...")

    # 查找输入框并输入
    js_input = """
    // 查找页面底部中间的输入框
    const inputs = [
        ...document.querySelectorAll('textarea'),
        ...document.querySelectorAll('[contenteditable="true"]'),
        ...document.querySelectorAll('div[role="textbox"]')
    ];

    if (inputs.length === 0) {
        return '未找到输入框';
    }

    // 按位置排序，找最靠下的
    inputs.sort((a, b) => {
        const rA = a.getBoundingClientRect();
        const rB = b.getBoundingClientRect();
        return rB.top - rA.top;
    });

    const input = inputs[0];
    const rect = input.getBoundingClientRect();

    // 输入内容
    const topic = `马年的第一练，过年吃胖了几斤，有些体式就做不下去了。龟式的时候，肚子感觉挤得慌。要接受这个胖乎乎的自己。觉察思绪比之前快了一些，有很多碎片，抓到了就丢掉了。请用角度1-对话叙述型写一篇小红书文案，要求口语化、真诚、有画面感。`;

    input.focus();
    input.click();

    if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
        input.value = topic;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
        input.textContent = topic;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    return '已输入: ' + topic.substring(0, 30) + '... 位置: ' + rect.top + ',' + rect.left;
    """

    result = mcp_call("tools/call", {
        "name": "chrome_javascript",
        "arguments": {"code": js_input}
    }, req_id=4)

    print("[OK] 已尝试输入选题")
    time.sleep(2)

    # 发送
    js_send = """
    // 按回车发送
    const inputs = document.querySelectorAll('textarea, [contenteditable="true"]');
    inputs.forEach(input => {
        const event = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            bubbles: true
        });
        input.dispatchEvent(event);
    });
    return '已发送';
    """

    mcp_call("tools/call", {
        "name": "chrome_javascript",
        "arguments": {"code": js_send}
    }, req_id=5)

    print("[OK] 已发送请求")

    # 等待生成
    print("\n等待 NotebookLM 生成文案 (约 45 秒)...")
    time.sleep(45)

    # 截图结果
    print("\n截图查看结果...")
    mcp_call("tools/call", {
        "name": "chrome_screenshot",
        "arguments": {"savePng": True, "name": "notebooklm_after"}
    }, req_id=6)
    print("[OK] 截图保存到 notebooklm_after.png")

    # 获取文本
    print("\n获取生成的文本...")
    js_get = """
    const msgs = document.querySelectorAll('.message, .chat-message, .response, article');
    if (msgs.length > 0) {
        const last = msgs[msgs.length - 1];
        return last.textContent;
    }
    return document.body.textContent.substring(0, 2000);
    """

    result = mcp_call("tools/call", {
        "name": "chrome_javascript",
        "arguments": {"code": js_get}
    }, req_id=7)

    # 解析并保存
    try:
        for line in result.split('\n'):
            if line.startswith('data:'):
                data = json.loads(line[5:].strip())
                if data.get('result'):
                    for item in data['result'].get('content', []):
                        if item.get('type') == 'text':
                            text = item.get('text', '')
                            print("\n生成的内容:")
                            print(text[:800])

                            with open('generated_result.txt', 'w', encoding='utf-8') as f:
                                f.write(text)
                            print("\n[OK] 完整内容保存到 generated_result.txt")
                            break
    except Exception as e:
        print(f"解析结果时出错: {e}")

    print("\n" + "=" * 60)
    print("完成!")
    print("=" * 60)

if __name__ == "__main__":
    main()
