#!/usr/bin/env python3
"""
批量给现有Markdown文件添加Obsidian Frontmatter
"""

import os
import re
from pathlib import Path

BASE_DIR = Path("XBB-APP/ashtanga-xiaohongshu/01-内容生产")

# 待深化文件：加 frontmatter，状态=待审核
def process_pending_files():
    pending_dir = BASE_DIR / "01-待深化的选题"
    files = list(pending_dir.glob("*.md"))

    print(f"发现 {len(files)} 个待深化文件")

    for file_path in files:
        content = file_path.read_text(encoding='utf-8')

        # 跳过已有 frontmatter 的文件
        if content.startswith('---'):
            print(f"  [SKIP] 跳过（已有frontmatter）: {file_path.name}")
            continue

        # 从文件名提取信息
        # 格式: 主题_版本_日期.md 或 主题_日期.md
        filename = file_path.stem
        parts = filename.split('_')

        # 提取日期
        date_match = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
        date = date_match.group(1) if date_match else ""

        # 提取主题（去掉日期和版本）
        topic = filename.replace(f'_{date}', '').replace('_', ' ')

        # 构建 frontmatter
        frontmatter = f"""---
选题主题: {topic}
状态: 🟠待审核
文案角度: ""
排期日期: {date}
发布日期:
小红书链接:
曝光:
观看:
点赞:
收藏:
评论:
涨粉:
分享:
互动率:
收藏率:
复盘标签: []
---

"""

        # 写入文件
        new_content = frontmatter + content
        file_path.write_text(new_content, encoding='utf-8')
        print(f"  [OK] 已添加: {file_path.name}")

# 从选题记录拆分出独立文件
def split_topic_records():
    records_file = BASE_DIR / "选题管理" / "00-选题记录.md"
    content = records_file.read_text(encoding='utf-8')

    # 解析选题条目
    pattern = r'### (.+?)\n- \*\*时间\*\*：(.+?)\n- \*\*类型\*\*：(.+?)\n- \*\*状态\*\*：(.+?)\n- \*\*备注\*\*：(.+?)(?=\n\n### |\n---|$)'
    matches = re.findall(pattern, content, re.DOTALL)

    print(f"\n从选题记录发现 {len(matches)} 个待生成选题")

    for title, date, topic_type, status, note in matches:
        # 清理标题中的特殊字符
        safe_title = re.sub(r'[\\/:*?"<>|]', '', title).strip()
        filename = f"{safe_title}_{date}.md"
        filepath = BASE_DIR / "01-待深化的选题" / filename

        # 如果文件已存在，跳过
        if filepath.exists():
            print(f"  [SKIP] 跳过（已存在）: {filename}")
            continue

        # 构建 frontmatter + 内容
        file_content = f"""---
选题主题: {title}
状态: 🟡待生成
文案角度: ""
排期日期: {date}
发布日期:
类型: {topic_type}
备注: {note.strip()}
小红书链接:
曝光:
观看:
点赞:
收藏:
评论:
涨粉:
分享:
互动率:
收藏率:
复盘标签: []
---

# {title}

> {note.strip()}

## 素材检索

- [ ] 检索核心概念库
- [ ] 检索金句库
- [ ] 选择文案角度

## 文案内容

（待生成）
"""

        filepath.write_text(file_content, encoding='utf-8')
        print(f"  [OK] 已创建: {filename}")

def main():
    print("=" * 50)
    print("批量添加 Obsidian Frontmatter")
    print("=" * 50)

    # 1. 处理已有文件
    print("\n【步骤1】处理待深化文件...")
    process_pending_files()

    # 2. 拆分选题记录
    print("\n【步骤2】拆分选题记录...")
    split_topic_records()

    print("\n" + "=" * 50)
    print("[DONE] 处理完成！")
    print("=" * 50)

if __name__ == "__main__":
    main()
