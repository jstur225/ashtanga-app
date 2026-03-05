#!/usr/bin/env python3
import requests
import json
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

MCP_URL = 'http://127.0.0.1:12306/mcp'

headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream'
}

resp = requests.post(MCP_URL, headers=headers, json={
    'jsonrpc': '2.0',
    'id': 1,
    'method': 'initialize',
    'params': {
        'protocolVersion': '2024-11-05',
        'capabilities': {},
        'clientInfo': {'name': 'find-chat', 'version': '1.0'}
    }
})

session_id = resp.headers.get('mcp-session-id')
time.sleep(1)
headers['mcp-session-id'] = session_id

# Find chat messages with generated content
js_code = '''
const messages = document.querySelectorAll('[role="listitem"], .chat-message, [class*="message"], [class*="bubble"]');
let result = '';
for (let msg of messages) {
    const text = msg.innerText;
    if (text && (text.includes('角度') || text.includes('2026') || text.includes('标题'))) {
        result += '=== MESSAGE ===\n' + text + '\n\n';
    }
}
if (!result) {
    // Try to get all text from the page
    result = document.body.innerText;
}
return result;
'''

resp2 = requests.post(f'{MCP_URL}?session_id={session_id}', headers=headers, json={
    'jsonrpc': '2.0',
    'id': 2,
    'method': 'tools/call',
    'params': {
        'name': 'chrome_javascript',
        'arguments': {'code': js_code}
    }
})

for line in resp2.text.split('\n'):
    if line.startswith('data:'):
        try:
            data = json.loads(line[5:].strip())
            if data.get('result'):
                result = json.loads(data['result']['content'][0]['text'])
                text = result['result']

                # Save to file
                with open('final.txt', 'w', encoding='utf-8') as f:
                    f.write(text)

                print(f'Content saved! Length: {len(text)} chars')
                print('\n=== Preview (first 800 chars) ===')
                print(text[:800])
        except Exception as e:
            print(f'Error: {e}')
        break
