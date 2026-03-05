#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Read the file
with open('generated.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# The content appears to be UTF-8 bytes displayed as latin-1 or similar
# Let's try to re-encode and decode properly
try:
    # If the text was read incorrectly, try to fix it
    content_bytes = content.encode('latin-1', errors='ignore')
    fixed_content = content_bytes.decode('utf-8', errors='ignore')
except:
    fixed_content = content

# Clean up UI elements
skip_keywords = [
    'keep_pin', 'copy_all', 'thumb_up', 'thumb_down', 'arrow_forward',
    'Studio', 'dock_to', 'audio_magic', 'subscriptions', 'flowchart',
    'edit', 'quiz', 'stacked_bar_chart', 'tablet', 'sticky_note_2',
    'NotebookLM', '来源', 'more_vert', 'play_arrow', '选择所有来源',
    '视频概览', '思维导图', '报告', '闪卡', '测验', '信息图',
    '演示文稿', '数据表格', '音频概览', '添加笔记', '深入探究'
]

lines = fixed_content.split('\n')
clean_lines = []
for line in lines:
    should_skip = False
    for keyword in skip_keywords:
        if keyword in line:
            should_skip = True
            break
    # Skip lines that are just UI elements (short lines with specific patterns)
    if len(line.strip()) < 30 and any(x in line for x in ['add', 'share', 'settings', 'PRO', 'search', 'language', 'Web', 'Fast Research']):
        should_skip = True
    if not should_skip and line.strip():
        clean_lines.append(line)

# Join clean content
clean_text = '\n'.join(clean_lines)

# Save with proper UTF-8 encoding
output_file = 'generated_2026频繁记录.md'
with open(output_file, 'w', encoding='utf-8') as f:
    f.write('# 2026要频繁大量记录自己的练习\n\n')
    f.write(clean_text)

print(f'Saved to {output_file}')
print(f'Length: {len(clean_text)} characters')
print()
print('=== Content Preview ===')
print(clean_text[:1500])
