#!/usr/bin/env python3
import requests
import json
import time

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
        'clientInfo': {'name': 'find-all', 'version': '1.0'}
    }
})

session_id = resp.headers.get('mcp-session-id')
time.sleep(1)
headers['mcp-session-id'] = session_id

js_code = '''
const links = document.querySelectorAll('a[href*="notebook"]');
let result = '';
for (let link of links) {
    result += link.textContent.trim().substring(0, 40) + ' | ' + link.href + '\\n';
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
                print('Notebooks found:')
                print(result['result'])
        except Exception as e:
            print(f'Error: {e}')
        break
