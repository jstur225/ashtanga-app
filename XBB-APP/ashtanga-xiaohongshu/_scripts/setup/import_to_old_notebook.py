#!/usr/bin/env python3
"""
导入素材到旧Notebook（解决编码问题）
"""

import asyncio
import os
import sys

# 强制编码
os.environ['PYTHONIOENCODING'] = 'utf-8'
sys.stdout.reconfigure(encoding='utf-8')

# 代理设置
os.environ['HTTP_PROXY'] = 'http://127.0.0.1:7890'
os.environ['HTTPS_PROXY'] = 'http://127.0.0.1:7890'

# 添加notebooklm路径
sys.path.insert(0, 'C:/Users/BIN/AppData/Roaming/Python/Python314/site-packages')

from notebooklm import NotebookLMClient

async def import_sources():
    """导入素材到旧Notebook"""

    # 旧Notebook ID
    OLD_NOTEBOOK_ID = "80059318-e0e8-4971-95cc-fde4b231d3a0"

    # 要导入的文件
    files_to_import = [
        "XBB-APP/ashtanga-xiaohongshu/内容素材库/核心概念库/觉察记录.md",
        "XBB-APP/ashtanga-xiaohongshu/内容素材库/金句库/练习感悟金句.md",
        "XBB-APP/ashtanga-xiaohongshu/内容素材库/金句库/温暖邀请金句.md",
        "XBB-APP/ashtanga-xiaohongshu/内容素材库/金句库/真诚对话金句.md",
        "XBB-APP/ashtanga-xiaohongshu/ashtanga-xiaohongshu.md",
    ]

    print("=" * 60)
    print("导入素材到旧Notebook")
    print("=" * 60)
    print(f"\n目标Notebook: {OLD_NOTEBOOK_ID}")
    print(f"需要导入: {len(files_to_import)} 个文件\n")

    async with await NotebookLMClient.from_storage() as client:
        # 切换到旧Notebook
        client._current_notebook_id = OLD_NOTEBOOK_ID
        print("[OK] 已切换到旧Notebook\n")

        # 逐个导入
        success_count = 0
        for file_path in files_to_import:
            file_name = os.path.basename(file_path)
            print(f"导入: {file_name}...", end=" ")

            try:
                # 检查文件是否存在
                if not os.path.exists(file_path):
                    print(f"[跳过] 文件不存在")
                    continue

                # 读取文件内容
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()

                # 导入到Notebook（使用add_text方式）
                result = await client.sources.add_text(
                    notebook_id=OLD_NOTEBOOK_ID,
                    content=content,
                    title=file_name
                )

                print(f"[OK]")
                success_count += 1

            except Exception as e:
                print(f"[失败] {str(e)[:50]}")

        print(f"\n{ '=' * 60}")
        print(f"导入完成: {success_count}/{len(files_to_import)}")
        print("=" * 60)

        # 删除新Notebook
        NEW_NOTEBOOK_ID = "bea0913b-b902-462f-91d1-5c6332c045ae"
        print(f"\n删除新Notebook: {NEW_NOTEBOOK_ID}...", end=" ")

        try:
            # 这里需要根据实际API调用来删除
            print("[需要手动在Web界面删除]")
            print(f"\n请访问: https://notebooklm.google.com/notebook/{NEW_NOTEBOOK_ID}")
            print("点击右上角菜单 -> 删除")

        except Exception as e:
            print(f"[失败] {e}")

if __name__ == "__main__":
    asyncio.run(import_sources())
