#!/usr/bin/env python3
"""
用 MCP 控制 NotebookLM - 最终版
输入框在中间下面
"""

import json
import requests
import sys
import time
import re

sys.stdout.reconfigure(encoding='utf-8')

MCP_URL = "http://127.0.0.1:12306/mcp"
SESSION_ID = None
NOTEBOOK_ID = "80059318-e0e8-4971-95cc-fde4b231d3a0"

# 选题
TOPIC = """马年的第一练，过年吃胖了几斤，有些体式就做不下去了。
龟式的时候，肚子感觉挤得慌。要接受这个胖乎乎的自己。
觉察思绪比之前快了一些，有很多碎片，抓到了就丢掉了。

请用角度1-对话叙述型写一篇小红书文案，要求口语化、真诚、有画面感。"""

def mcp_call(method, params=None, req_id=1):
    """调用 MCP"""
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

def parse_sse(text):
    """解析 SSE 响应"""
    for line in text.strip().split('\n'):
        if line.startswith('data:'):
            try:
                return json.loads(line[5:].strip())
            except:
                continue
    return None

def main():
    print("=" * 60)
    print("MCP + NotebookLM 自动化")
    print("=" * 60)

    # 1. 初始化 MCP
    print("\n[1/5] 初始化 MCP...")
    result = mcp_call("initialize", {
        "protocolVersion": "2024-11-05",
        "capabilities": {},
        "clientInfo": {"name": "notebooklm-auto", "version": "1.0"}
    }, req_id=1)
    print(f"[OK] Session: {SESSION_ID[:20]}...")

    # 2. 导航到 NotebookLM
    print("\n[2/5] 导航到 NotebookLM...")
    mcp_call("tools/call", {
        "name": "chrome_navigate",
        "arguments": {"url": f"https://notebooklm.google.com/notebook/{NOTEBOOK_ID}",
                      "background": True}
    }, req_id=2)
    time.sleep(4)
    print("[OK] 页面已加载")

    # 3. 截图查看当前状态
    print("\n[3/5] 截图...")
    mcp_call("tools/call", {
        "name": "chrome_screenshot",
        "arguments": {"savePng": True, "name": "notebooklm_before", "background": True}
    }, req_id=3)
    print("[OK] 已截图保存到 notebooklm_before.png")

    # 4. 使用 JavaScript 查找并填充输入框（在中间下面）
    print("\n[4/5] 查找并填充输入框...")

    js_code = """
    // 查找页面底部的输入框
    function findInputBox() {
        // 方法1: 查找所有 textarea 和 contenteditable 元素
        const textareas = document.querySelectorAll('textarea');
        const editables = document.querySelectorAll('[contenteditable="true"]');
        const textboxes = document.querySelectorAll('div[role="textbox"]');

        console.log('找到 textarea:', textareas.length);
        console.log('找到 contenteditable:', editables.length);
        console.log('找到 textbox:', textboxes.length);

        // 返回所有可能的输入元素信息
        const results = {
            textareas: Array.from(textareas).map(el => ({
                tag: el.tagName,
                class: el.className,
                placeholder: el.placeholder,
                rect: el.getBoundingClientRect().toJSON()
            })),
            editables: Array.from(editables).map(el => ({
                tag: el.tagName,
                class: el.className,
                rect: el.getBoundingClientRect().toJSON()
            })),
            textboxes: Array.from(textboxes).map(el => ({
                tag: el.tagName,
                class: el.className,
                rect: el.getBoundingClientRect().toJSON()
            }))
        };

        // 尝试找到最可能是输入框的元素（通常在页面底部）
        let inputElement = null;

        // 按位置排序，找最靠下的
        const allInputs = [...textareas, ...editables, ...textboxes];
        if (allInputs.length > 0) {
            const sorted = allInputs.sort((a, b) => {
                const rectA = a.getBoundingClientRect();
                const rectB = b.getBoundingClientRect();
                return rectB.top - rectA.top;  // 从下到上排序
            });
            inputElement = sorted[0];  // 最靠下的元素
        }

        return {
            foundElements: results,
            inputElement: inputElement ? {
                tag: inputElement.tagName,
                class: inputElement.className,
                placeholder: inputElement.placeholder || 'N/A',
                rect: inputElement.getBoundingClientRect().toJSON()
            } : null
        };
    }

    return findInputBox();
    """

    result = mcp_call("tools/call", {
        "name": "chrome_javascript",
        "arguments": {"code": js_code, "background": True}
    }, req_id=4)

    data = parse_sse(result)
    if data and data.get('result'):
        content = data['result'].get('content', [])
        for item in content:
            if item.get('type') == 'text':
                try:
                    result_obj = json.loads(item.get('text', '{}'))
                    print(f"[INFO] 找到 {Object.keys(result_obj.foundElements).length} 类输入元素")
                    if result_obj.inputElement:
                        print(f"[OK] 最可能的输入框: {result_obj.inputElement.tag}")
                        print(f"      位置: {JSON.stringify(result_obj.inputElement.rect)}")
                    }
                } catch(e) {
                    console.log('解析错误:', e);
                }
                break

    # 5. 输入选题
    print("\n[5/5] 输入选题...")

    input_js = f"""
    // 输入选题
    const topic = `{TOPIC}`;

    // 重新查找最靠下的输入元素
    const allInputs = [
        ...document.querySelectorAll('textarea'),
        ...document.querySelectorAll('[contenteditable="true"]'),
        ...document.querySelectorAll('div[role="textbox"]')
    ];

    if (allInputs.length === 0) {{
        return {{ success: false, error: '未找到输入框' }};
    }}

    // 找最靠下的
    const sorted = allInputs.sort((a, b) => {{
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        return rectB.top - rectA.top;
    }});

    const inputEl = sorted[0];

    // 聚焦并输入
    inputEl.focus();
    inputEl.click();

    // 根据元素类型输入
    if (inputEl.tagName === 'TEXTAREA' || inputEl.tagName === 'INPUT') {{
        inputEl.value = topic;
        inputEl.dispatchEvent(new Event('input', {{ bubbles: true }}));
        inputEl.dispatchEvent(new Event('change', {{ bubbles: true }}));
    }} else {{
        inputEl.textContent = topic;
        inputEl.dispatchEvent(new Event('input', {{ bubbles: true }}));
    }}

    // 触发键盘事件
    inputEl.dispatchEvent(new KeyboardEvent('keydown', {{
        key: 'a',
        bubbles: true
    }}));

    return {{
        success: true,
        element: inputEl.tagName,
        className: inputEl.className,
        textSet: topic.substring(0, 30) + '...'
    }};
    """

    result = mcp_call("tools/call", {
        "name": "chrome_javascript",
        "arguments": {"code": input_js, "background": True}
    }, req_id=5)

    data = parse_sse(result)
    if data and data.get('result'):
        content = data['result'].get('content', [])
        for item in content:
            if item.get('type') == 'text':
                try:
                    result_obj = json.loads(item.get('text', '{}'))
                    if result_obj.success:
                        print(f"[OK] 已输入到 {result_obj.element}")
                    else:
                        print(f"[FAIL] {result_obj.error}")
                except:
                    print(f"响应: {item.get('text', '')[:200]}")
                break

    # 等待一下
    time.sleep(2)

    # 6. 查找发送按钮并点击
    print("\n[6/6] 点击发送...")

    send_js = """
    // 查找发送按钮
    const sendButtons = [
        ...document.querySelectorAll('button[type="submit"]'),
        ...document.querySelectorAll('button:has(svg)'),
        ...document.querySelectorAll('button'),
        ...document.querySelectorAll('[aria-label*="发送"]'),
        ...document.querySelectorAll('[aria-label*="Send"]')
    ];

    // 找最靠下的按钮
    const sorted = sendButtons.sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        return rectB.top - rectA.top;
    });

    // 尝试点击最靠下的几个按钮之一
    for (let btn of sorted.slice(0, 3)) {
        const rect = btn.getBoundingClientRect();
        // 只点击在页面底部区域的按钮
        if (rect.top > window.innerHeight * 0.7) {
            btn.click();
            return {
                success: true,
                buttonText: btn.textContent || btn.innerText || 'icon button',
                position: { top: rect.top, left: rect.left }
            };
        }
    }

    // 如果没找到，尝试按回车
    const inputs = document.querySelectorAll('textarea, [contenteditable="true"]');
    for (let input of inputs) {
        const event = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
        });
        input.dispatchEvent(event);
    }

    return { success: true, method: 'Enter key' };
    """

    result = mcp_call("tools/call", {
        "name": "chrome_javascript",
        "arguments": {"code": send_js, "background": True}
    }, req_id=6)

    print("[OK] 已发送")

    # 等待生成
    print("\n等待 NotebookLM 生成文案...")
    print("(约需 30-60 秒)")
    time.sleep(45)

    # 截图查看结果
    print("\n截图查看结果...")
    mcp_call("tools/call", {
        "name": "chrome_screenshot",
        "arguments": {"savePng": True, "name": "notebooklm_result", "background": True}
    }, req_id=7)
    print("[OK] 结果已保存到 notebooklm_result.png")

    # 获取生成的文本
    print("\n获取生成的文本...")
    get_text_js = """
    // 获取NotebookLM生成的回复
    const messages = document.querySelectorAll('.chat-message, .message, .response, article, [data-testid="message"]');
    const lastMessage = messages[messages.length - 1];

    if (lastMessage) {
        return {
            success: true,
            text: lastMessage.textContent,
            html: lastMessage.innerHTML.substring(0, 500)
        };
    }

    // 备用：获取页面主要文本内容
    return {
        success: false,
        pageText: document.body.textContent.substring(0, 1000)
    };
    """

    result = mcp_call("tools/call", {
        "name": "chrome_javascript",
        "arguments": {"code": get_text_js, "background": True}
    }, req_id=8)

    data = parse_sse(result)
    if data and data.get('result'):
        content = data['result'].get('content', [])
        for item in content:
            if item.get('type') == 'text':
                try:
                    result_obj = json.loads(item.get('text', '{}'))
                    if result_obj.success:
                        text = result_obj.text
                        print(f"\n[OK] 获取到生成内容:")
                        print(text[:500])

                        # 保存到文件
                        with open('generated_topic_result.txt', 'w', encoding='utf-8') as f:
                            f.write(text)
                        print("\n[OK] 完整内容已保存到 generated_topic_result.txt")
                    else:
                        print("[WARN] 未能获取到生成的文本")
                except:
                    pass
                break

    print("\n" + "=" * 60)
    print("完成!")
    print("=" * 60)

if __name__ == "__main__":
    main()
