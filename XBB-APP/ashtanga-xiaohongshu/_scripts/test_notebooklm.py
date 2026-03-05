#!/usr/bin/env python3
"""
测试 NotebookLM 生成文案
"""

import asyncio
import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')
os.environ['HTTP_PROXY'] = 'http://127.0.0.1:7897'
os.environ['HTTPS_PROXY'] = 'http://127.0.0.1:7897'

sys.path.insert(0, 'C:/Users/BIN/AppData/Roaming/Python/Python314/site-packages')

from notebooklm import NotebookLMClient

NOTEBOOK_ID = "80059318-e0e8-4971-95cc-fde4b231d3a0"

# 选题内容
TOPIC = """马年的第一练，过年吃胖了几斤，有些体式就做不下去了。
龟式的时候,肚子感觉挤得慌。要接受这个胖乎乎的自己。
觉察思绪比之前快了一些，有很多碎片，抓到了就丢掉了。"""

async def generate_content():
    """生成文案"""
    print("=" * 60)
    print("NotebookLM 文案生成测试")
    print("=" * 60)
    print(f"\n选题: {TOPIC[:50]}...")

    try:
        async with await NotebookLMClient.from_storage() as client:
            print("\n[OK] NotebookLM 认证成功")

            # 切换到指定 notebook
            client._current_notebook_id = NOTEBOOK_ID
            print(f"[OK] 切换到 Notebook: {NOTEBOOK_ID}")

            # 构建 prompt
            prompt = f"""基于素材库中的"ashtanga-xiaohongshu.md"的8个角度模板，为以下选题写一篇小红书文案：

选题内容：
{TOPIC}

请使用"角度1-对话叙述型"的角度来写。要求：
1. 口语化、真诚、有画面感
2. 符合小红书平台调性
3. 字数在300-500字之间
4. 结尾有互动引导

请直接给出文案内容。"""

            print("\n[1/2] 正在生成文案...")
            print("(这可能需要几秒钟)")

            response = await client.chat.ask(
                notebook_id=NOTEBOOK_ID,
                question=prompt
            )

            print("\n[OK] 文案生成成功!")
            print("\n" + "=" * 60)
            print("生成的文案:")
            print("=" * 60)
            print(response.content)
            print("=" * 60)

            # 保存结果
            output = {
                "topic": TOPIC,
                "angle": "角度1-对话叙述型",
                "content": response.content,
                "notebook_id": NOTEBOOK_ID
            }

            with open('generated_content.json', 'w', encoding='utf-8') as f:
                json.dump(output, f, ensure_ascii=False, indent=2)

            print("\n[OK] 结果已保存到 generated_content.json")

            return response.content

    except Exception as e:
        print(f"\n[FAIL] 错误: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    result = asyncio.run(generate_content())

    if result:
        print("\n✅ 测试成功!")
    else:
        print("\n❌ 测试失败")
        sys.exit(1)
