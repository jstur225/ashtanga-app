#!/usr/bin/env python3
"""
整合NotebookLM素材库
"""

import asyncio
import os
import sys

# 设置代理
os.environ['HTTP_PROXY'] = 'http://127.0.0.1:7890'
os.environ['HTTPS_PROXY'] = 'http://127.0.0.1:7890'

# 添加notebooklm到路径
sys.path.insert(0, 'C:/Users/BIN/AppData/Roaming/Python/Python314/site-packages')

from notebooklm import NotebookLMClient

async def list_and_merge():
    """列出所有Notebook并整合"""

    async with await NotebookLMClient.from_storage() as client:
        print("=" * 60)
        print("NotebookLM 素材库整合工具")
        print("=" * 60)

        # 获取所有Notebook
        notebooks = await client.notebooks.list()

        print(f"\n找到 {len(notebooks)} 个 Notebook:\n")

        for i, nb in enumerate(notebooks, 1):
            print(f"{i}. ID: {nb.id}")
            print(f"   标题: {nb.title}")
            print(f"   创建时间: {nb.created_at}")
            print()

        # 查找包含"阿斯汤加"或"开发者"的Notebook
        target_notebooks = []
        for nb in notebooks:
            title_lower = nb.title.lower()
            if any(keyword in title_lower for keyword in ['阿', '开发', '汤', 'ashtanga']):
                target_notebooks.append(nb)

        if target_notebooks:
            print(f"\n找到 {len(target_notebooks)} 个相关 Notebook:")
            for nb in target_notebooks:
                print(f"  - {nb.title} ({nb.id})")

        print("\n" + "=" * 60)
        print("整合建议:")
        print("=" * 60)
        print("""
选项1: 使用现有的"阿斯汤加与开发者"Notebook作为主力素材库
  - 保留现有的Notebook
  - 把新素材（8角度模板、金句库）导入进去
  - 删除刚创建的"阿斯汤加素材库"避免重复

选项2: 合并两个Notebook
  - 从旧Notebook导出所有Sources
  - 导入到新创建的"阿斯汤加素材库"
  - 统一使用新的Notebook

选项3: 保持分开
  - 旧Notebook: 用于深度研究、长文案创作
  - 新Notebook: 专门用于小红书文案生成（轻量、快速）
        """)

        return notebooks, target_notebooks

if __name__ == "__main__":
    notebooks, targets = asyncio.run(list_and_merge())
