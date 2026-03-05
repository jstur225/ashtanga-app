#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成小红书文案 - 使用 NotebookLM API
"""
import asyncio
import sys
import io
from notebooklm import NotebookLMClient

# 设置输出编码
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# 选题内容
TOPIC = "在 AI 越来越发达的今天，我们疯狂地用 AI 去节省时间。但节省下来的时间，还是在用 AI 处理各种事情，节省各种各样角落的时间。问题本身成了命题。我们还是要回到生活，爱具体的人，做具体的事情。"

# 笔记本ID
NOTEBOOK_ID = '80059318-e0e8-4971-95cc-fde4b231d3a0'

# 问题格式（根据 OPERATIONS.md 规范）
QUESTION = f'以"{TOPIC}"为主题，帮我写2个不同角度的小红书文案'

async def generate():
    print(f"正在发送主题到 NotebookLM...")
    print(f"主题: {TOPIC[:50]}...")
    print()

    async with await NotebookLMClient.from_storage() as client:
        result = await client.chat.ask(
            notebook_id=NOTEBOOK_ID,
            question=QUESTION
        )

        # 保存结果
        output_file = 'generated_ai_time.md'
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(result.answer)

        print(f"✅ 文案生成完成！")
        print(f"📄 已保存到: {output_file}")
        print()
        print("=" * 60)
        print("文案预览（前500字）:")
        print("=" * 60)
        print(result.answer[:500])
        print("...")

if __name__ == '__main__':
    asyncio.run(generate())
