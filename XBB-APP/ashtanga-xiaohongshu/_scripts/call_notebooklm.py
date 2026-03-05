#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
调用 NotebookLM API 生成文案
使用正确端口 7897
"""

import asyncio
import os
import sys

# 设置 stdout 编码
sys.stdout.reconfigure(encoding='utf-8')

# 必须在导入 notebooklm 之前设置代理
os.environ['HTTP_PROXY'] = 'http://127.0.0.1:7897'
os.environ['HTTPS_PROXY'] = 'http://127.0.0.1:7897'

# 添加 notebooklm 路径
sys.path.insert(0, 'C:/Users/BIN/AppData/Roaming/Python/Python314/site-packages')

from notebooklm import NotebookLMClient

# 旧的 Notebook ID（已包含所有素材）
NOTEBOOK_ID = "80059318-e0e8-4971-95cc-fde4b231d3a0"

async def generate_content(topic: str, angle: str = "角度2-第二人称提问型"):
    """
    调用 NotebookLM 生成文案

    参数:
        topic: 选题主题
        angle: 文案角度
    """

    print(f"正在调用 NotebookLM...")
    print(f"选题: {topic}")
    print(f"角度: {angle}")
    print(f"代理: {os.environ.get('HTTP_PROXY')}")
    print("-" * 60)

    try:
        # 创建 client（会自动读取存储的认证）
        async with await NotebookLMClient.from_storage() as client:
            print("[OK] 认证成功")

            # 调用 chat.ask 生成文案
            prompt = f"""基于素材库中的"ashtanga-xiaohongshu.md"的8个角度模板，为选题"{topic}"写一篇小红书文案。

要求：
1. 使用 {angle}
2. 引用金句库中的相关金句
3. 符合小红书风格（200-300字，真诚温暖）
4. 包含标题选项和正文

请直接输出完整的文案内容。"""

            print("[OK] 正在生成文案...")
            result = await client.chat.ask(
                notebook_id=NOTEBOOK_ID,
                question=prompt
            )

            print("\n" + "=" * 60)
            print("NotebookLM 生成的文案：")
            print("=" * 60)
            print(result.answer)
            print("=" * 60)

            return result.answer

    except Exception as e:
        print(f"[FAIL] 错误: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    # 从命令行参数获取选题
    if len(sys.argv) > 1:
        topic = sys.argv[1]
        angle = sys.argv[2] if len(sys.argv) > 2 else "角度2-第二人称提问型"
    else:
        topic = "为什么记录觉察很重要"
        angle = "角度2-第二人称提问型"

    result = asyncio.run(generate_content(topic, angle))

    if result:
        # 保存到文件
        output_file = f"generated_{topic.replace(' ', '_')[:20]}.md"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(result)
        print(f"\n[OK] 已保存到: {output_file}")
    else:
        print("\n[FAIL] 生成失败")
        sys.exit(1)
