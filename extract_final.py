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
        'clientInfo': {'name': 'extract', 'version': '1.0'}
    }
})

session_id = resp.headers.get('mcp-session-id')
time.sleep(1)
headers['mcp-session-id'] = session_id

js_code = r'''
const messages = document.querySelectorAll('[role="listitem"]');
let result = '';
for (let msg of messages) {
    const text = msg.innerText;
    if (text && (text.includes('角度') || text.includes('2026') || text.includes('标题'))) {
        result += '=== MESSAGE ===\n' + text + '\n\n';
    }
}
if (!result) {
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
        data = json.loads(line[5:].strip())
        if data.get('result'):
            content = data['result'].get('content', [])
            if content:
                inner = json.loads(content[0]['text'])
                if 'result' in inner:
                    page_text = inner['result']
                else:
                    page_text = str(inner)

                with open('final.txt', 'w', encoding='utf-8') as f:
                    f.write(page_text)

                print(f'Saved! Length: {len(page_text)} chars')
                print('\n=== Preview ===')
                print(page_text[:1000])
        break
