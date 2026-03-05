#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小红书200条笔记 - 数据分析和素材提取
功能: 筛选高质量笔记 + 提取标题库 + 提取金句 + 总结方法论
"""

import json
import os
from datetime import datetime
from collections import Counter
import re

# 文件路径配置
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_FILE = os.path.join(BASE_DIR, "已清洗", "200条笔记_数据.json")

# 输出目录
OUTPUT_DIR = os.path.join(BASE_DIR, "精选分析")
EXTRACT_DIR = os.path.join(BASE_DIR, "素材提取")
METHOD_DIR = os.path.join(BASE_DIR, "方法论更新")

for dir_path in [OUTPUT_DIR, EXTRACT_DIR, METHOD_DIR]:
    os.makedirs(dir_path, exist_ok=True)

def load_data():
    """加载清洗后的数据"""
    with open(JSON_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def step2_filter_and_classify(data):
    """第2步: 数据筛选和分类"""
    print("\n" + "=" * 60)
    print("第2步: 数据筛选和分类")
    print("=" * 60)

    # 筛选标准: 满足任一条件即可
    filtered = []
    for note in data:
        # 数据筛选
        if note['点赞数'] > 500 or note['收藏率'] > 15 or note['评论数'] > 10:
            # 内容筛选: 有描述内容,字数>50
            desc = note['描述'] or ''
            if len(desc) > 50:
                # 数据表现评级
                if note['点赞数'] > 1000 or note['收藏率'] > 30:
                    note['星级'] = '⭐⭐⭐ 优秀'
                elif note['点赞数'] > 500 or note['收藏率'] > 20:
                    note['星级'] = '⭐⭐ 良好'
                else:
                    note['星级'] = '⭐ 一般'

                # 内容类型分类(基于标题关键词)
                title = note['标题'].lower()
                if any(word in title for word in ['打卡', '坚持', '天', '记录']):
                    note['内容类型'] = '坚持记录型'
                elif any(word in title for word in ['怎么', '如何', '方法', '技巧']):
                    note['内容类型'] = '实用干货型'
                elif any(word in title for word in ['痛', '难', '怕', '烦恼']):
                    note['内容类型'] = '痛点解决型'
                else:
                    note['内容类型'] = '情感共鸣型'

                filtered.append(note)

    print(f"[OK] 筛选出 {len(filtered)} 条高质量笔记")

    # 按星级排序
    filtered.sort(key=lambda x: x['点赞数'], reverse=True)

    # 生成精选50条文档
    output_file = os.path.join(OUTPUT_DIR, "精选50条_高质量文案.md")
    generate_filtered_markdown(filtered[:50], output_file)
    print(f"[OK] 已生成: {output_file}")

    # 生成分类统计报告
    stats_file = os.path.join(OUTPUT_DIR, "分类统计报告.md")
    generate_classification_report(filtered, stats_file)
    print(f"[OK] 已生成: {stats_file}")

    return filtered

def generate_filtered_markdown(notes, output_file):
    """生成精选笔记Markdown"""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# 精选50条高质量文案\n\n")
        f.write(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("**筛选标准**:\n")
        f.write("- 点赞数 > 500 或 收藏率 > 15% 或 评论数 > 10\n")
        f.write("- 描述内容字数 > 50\n\n")
        f.write("---\n\n")

        for note in notes:
            f.write(f"## {note['序号']}. {note['标题']}\n\n")
            f.write(f"**星级**: {note['星级']}\n\n")
            f.write(f"**内容类型**: {note['内容类型']}\n\n")
            f.write(f"**数据表现**: 点赞 {note['点赞数']} | 收藏 {note['收藏数']} ({note['收藏率']}%) | 评论 {note['评论数']}\n\n")
            f.write(f"**描述**:\n{note['描述']}\n\n")
            f.write(f"**链接**: {note['链接']}\n\n")
            f.write("---\n\n")

def generate_classification_report(notes, output_file):
    """生成分类统计报告"""
    # 统计各类型数量
    type_count = Counter(n['内容类型'] for n in notes)
    star_count = Counter(n['星级'] for n in notes)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# 分类统计报告\n\n")
        f.write(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write(f"**总笔记数**: {len(notes)}\n\n")
        f.write("---\n\n")

        f.write("## 内容类型分布\n\n")
        for type_name, count in type_count.most_common():
            f.write(f"- **{type_name}**: {count} 条 ({count/len(notes)*100:.1f}%)\n")

        f.write("\n## 星级分布\n\n")
        for star, count in star_count.most_common():
            f.write(f"- **{star}**: {count} 条 ({count/len(notes)*100:.1f}%)\n")

        f.write("\n## 数据表现TOP10\n\n")
        top10 = sorted(notes, key=lambda x: x['点赞数'], reverse=True)[:10]
        for i, note in enumerate(top10, 1):
            f.write(f"{i}. **{note['标题']}**\n")
            f.write(f"   - 点赞: {note['点赞数']} | 收藏率: {note['收藏率']}% | 类型: {note['内容类型']}\n\n")

def step3_extract_titles_and_sentences(filtered_notes):
    """第3步: 标题库和金句提取"""
    print("\n" + "=" * 60)
    print("第3步: 标题库和金句提取")
    print("=" * 60)

    # 3.1 标题库
    titles_file = os.path.join(EXTRACT_DIR, "标题库_200条.md")
    generate_title_library(filtered_notes, titles_file)
    print(f"[OK] 已生成: {titles_file}")

    # 3.2 金句提取
    sentences_file = os.path.join(EXTRACT_DIR, "实战金句库_200条提取.md")
    extract_golden_sentences(filtered_notes, sentences_file)
    print(f"[OK] 已生成: {sentences_file}")

    # 3.3 文案结构库
    structure_file = os.path.join(EXTRACT_DIR, "爆款文案结构库.md")
    extract_content_structure(filtered_notes, structure_file)
    print(f"[OK] 已生成: {structure_file}")

def generate_title_library(notes, output_file):
    """生成标题库(按类型分类)"""
    # 按内容类型分组
    by_type = {}
    for note in notes:
        t = note['内容类型']
        if t not in by_type:
            by_type[t] = []
        by_type[t].append(note)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# 标题库_200条 (按类型分类)\n\n")
        f.write(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("---\n\n")

        for type_name, type_notes in by_type.items():
            f.write(f"## {type_name}\n\n")
            # 按点赞排序
            type_notes.sort(key=lambda x: x['点赞数'], reverse=True)

            for note in type_notes[:20]:  # 每类最多20个
                f.write(f"- {note['标题']}\n")
                f.write(f"  - 数据: 赞{note['点赞数']} 收{note['收藏率']}%\n")
                f.write(f"  - 长度: {len(note['标题'])}字\n\n")

def extract_golden_sentences(notes, output_file):
    """提取金句"""
    golden_sentences = {
        '场景描写类': [],
        '痛点描述类': [],
        '温暖邀请类': [],
        '真诚对话类': []
    }

    # 简单规则提取
    for note in notes:
        desc = note['描述']

        # 场景描写类(包含"凌晨"、"晚上"、"垫上"等)
        if any(word in desc for word in ['凌晨', '晚上', '垫上', '早上', '教室']):
            if len(desc) < 100:
                golden_sentences['场景描写类'].append({
                    '内容': desc[:100],
                    '来源': note['标题'],
                    '点赞': note['点赞数']
                })

        # 痛点描述类(包含"痛"、"难"、"怕"等)
        if any(word in desc for word in ['痛', '难', '怕', '焦虑', '困惑']):
            if len(desc) < 100:
                golden_sentences['痛点描述类'].append({
                    '内容': desc[:100],
                    '来源': note['标题'],
                    '点赞': note['点赞数']
                })

        # 温暖邀请类(包含"一起"、"打卡"等)
        if any(word in desc for word in ['一起', '打卡', '试试', '来']):
            if len(desc) < 100:
                golden_sentences['温暖邀请类'].append({
                    '内容': desc[:100],
                    '来源': note['标题'],
                    '点赞': note['点赞数']
                })

        # 真诚对话类(包含"我"、"觉得"、"发现"等)
        if any(word in desc for word in ['我觉得', '我发现', '其实']):
            if len(desc) < 100:
                golden_sentences['真诚对话类'].append({
                    '内容': desc[:100],
                    '来源': note['标题'],
                    '点赞': note['点赞数']
                })

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# 实战金句库_200条提取\n\n")
        f.write(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("---\n\n")

        for category, sentences in golden_sentences.items():
            f.write(f"## {category}\n\n")
            f.write(f"数量: {len(sentences)} 条\n\n")

            # 按点赞排序
            sentences.sort(key=lambda x: x['点赞'], reverse=True)

            for i, sent in enumerate(sentences[:15], 1):  # 每类最多15条
                f.write(f"### {i}. {sent['内容']}\n\n")
                f.write(f"**来源**: {sent['来源']} (赞{sent['点赞']})\n\n")

def extract_content_structure(notes, output_file):
    """提取文案结构"""
    structures = []

    for note in notes[:30]:  # 分析TOP30
        desc = note['描述']
        if not desc or len(desc) < 50:
            continue

        # 分析结构
        structure = {
            '标题': note['标题'],
            '点赞': note['点赞数'],
            '收藏率': note['收藏率'],
            '字数': len(desc),
            '结构分析': analyze_structure(desc)
        }
        structures.append(structure)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# 爆款文案结构库\n\n")
        f.write(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("---\n\n")

        for s in structures:
            f.write(f"## {s['标题']}\n\n")
            f.write(f"**数据**: 赞{s['点赞']} 收{s['收藏率']}%\n\n")
            f.write(f"**字数**: {s['字数']}\n\n")
            f.write(f"**结构**:\n{s['结构分析']}\n\n")
            f.write("---\n\n")

def analyze_structure(text):
    """分析文案结构"""
    if len(text) < 50:
        return "内容过短,无明显结构"

    # 段落分析
    paragraphs = text.split('\n')
    para_count = len([p for p in paragraphs if p.strip()])

    # 简单结构判断
    if para_count >= 3:
        return f"分段式({para_count}段): 多段落叙述,层次分明"
    elif '！' in text and '？' in text:
        return "对话式: 包含感叹和疑问,互动性强"
    elif '，' in text * 3:
        return "叙述式: 连贯描述,流畅自然"
    else:
        return "简洁式: 短小精悍,直击要点"

def step4_methodology_summary(notes):
    """第4步: 方法论沉淀"""
    print("\n" + "=" * 60)
    print("第4步: 数据驱动的方法论沉淀")
    print("=" * 60)

    # 标题方法论
    title_method = os.path.join(METHOD_DIR, "标题方法论_数据版.md")
    generate_title_methodology(notes, title_method)
    print(f"[OK] 已生成: {title_method}")

    # 选题逻辑
    topic_logic = os.path.join(METHOD_DIR, "选题逻辑_数据版.md")
    generate_topic_logic(notes, topic_logic)
    print(f"[OK] 已生成: {topic_logic}")

    # 内容表现报告
    content_report = os.path.join(METHOD_DIR, "内容表现数据报告.md")
    generate_content_report(notes, content_report)
    print(f"[OK] 已生成: {content_report}")

def generate_title_methodology(notes, output_file):
    """生成标题方法论"""
    # 分析标题特征
    high_rate_notes = [n for n in notes if n['收藏率'] > 30]
    high_like_notes = [n for n in notes if n['点赞数'] > 1000]

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# 标题方法论_数据版\n\n")
        f.write(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("**数据来源**: 200条点赞前列笔记\n\n")
        f.write("---\n\n")

        f.write("## 标题类型与数据表现\n\n")

        # 1. 打卡记录型
        f.write("### 1. 打卡记录型\n\n")
        checkin_notes = [n for n in notes if '打卡' in n['标题'] or '天' in n['标题']]
        if checkin_notes:
            avg_like = sum(n['点赞数'] for n in checkin_notes) // len(checkin_notes)
            avg_rate = sum(n['收藏率'] for n in checkin_notes) / len(checkin_notes)
            f.write(f"- **数量**: {len(checkin_notes)} 条\n")
            f.write(f"- **平均点赞**: {avg_like}\n")
            f.write(f"- **平均收藏率**: {avg_rate:.2f}%\n")
            f.write(f"- **案例**:\n")
            for n in checkin_notes[:3]:
                f.write(f"  - {n['标题']} (赞{n['点赞数']})\n")

        # 2. 提问型
        f.write("\n### 2. 提问型\n\n")
        question_notes = [n for n in notes if '？' in n['标题'] or '?' in n['标题']]
        if question_notes:
            avg_like = sum(n['点赞数'] for n in question_notes) // len(question_notes)
            avg_rate = sum(n['收藏率'] for n in question_notes) / len(question_notes)
            f.write(f"- **数量**: {len(question_notes)} 条\n")
            f.write(f"- **平均点赞**: {avg_like}\n")
            f.write(f"- **平均收藏率**: {avg_rate:.2f}%\n")
            f.write(f"- **案例**:\n")
            for n in question_notes[:3]:
                f.write(f"  - {n['标题']} (赞{n['点赞数']})\n")

        # 3. 数字型
        f.write("\n### 3. 数字型\n\n")
        number_notes = [n for n in notes if any(str(i) in n['标题'] for i in range(1, 100))]
        if number_notes:
            avg_like = sum(n['点赞数'] for n in number_notes) // len(number_notes)
            avg_rate = sum(n['收藏率'] for n in number_notes) / len(number_notes)
            f.write(f"- **数量**: {len(number_notes)} 条\n")
            f.write(f"- **平均点赞**: {avg_like}\n")
            f.write(f"- **平均收藏率**: {avg_rate:.2f}%\n")

        f.write("\n## 标题长度规律\n\n")
        lengths = [len(n['标题']) for n in notes]
        f.write(f"- **最短标题**: {min(lengths)} 字\n")
        f.write(f"- **最长标题**: {max(lengths)} 字\n")
        f.write(f"- **平均长度**: {sum(lengths)//len(lengths)} 字\n")

def generate_topic_logic(notes, output_file):
    """生成选题逻辑"""
    # 统计标签
    all_tags = []
    for note in notes:
        if note['标签']:
            tags = note['标签'].split()
            all_tags.extend(tags)

    tag_counter = Counter(all_tags)

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# 选题逻辑_数据版\n\n")
        f.write(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("---\n\n")

        f.write("## 高频话题标签 TOP20\n\n")
        for tag, count in tag_counter.most_common(20):
            f.write(f"{count}. {tag}\n")

        f.write("\n## 高表现选题特征\n\n")
        high_performers = [n for n in notes if n['点赞数'] > 1000 or n['收藏率'] > 50]

        f.write(f"**数量**: {len(high_performers)} 条\n\n")

        f.write("**TOP10**:\n\n")
        for note in high_performers[:10]:
            f.write(f"- {note['标题']}\n")
            f.write(f"  - 赞{note['点赞数']} 收{note['收藏率']}%\n")

def generate_content_report(notes, output_file):
    """生成内容表现报告"""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# 内容表现数据报告\n\n")
        f.write(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("---\n\n")

        f.write("## 整体数据分布\n\n")

        # 点赞分布
        like_ranges = {
            '0-500': 0,
            '500-1000': 0,
            '1000-5000': 0,
            '5000+': 0
        }

        for note in notes:
            likes = note['点赞数']
            if likes < 500:
                like_ranges['0-500'] += 1
            elif likes < 1000:
                like_ranges['500-1000'] += 1
            elif likes < 5000:
                like_ranges['1000-5000'] += 1
            else:
                like_ranges['5000+'] += 1

        f.write("### 点赞分布\n\n")
        for range_name, count in like_ranges.items():
            f.write(f"- **{range_name}**: {count} 条 ({count/len(notes)*100:.1f}%)\n")

        f.write("\n## 最佳实践案例\n\n")

        # 高收藏率案例
        f.write("### 高收藏率案例 (>50%)\n\n")
        high_rate = [n for n in notes if n['收藏率'] > 50][:5]
        for note in high_rate:
            f.write(f"- **{note['标题']}**\n")
            f.write(f"  - 收藏率: {note['收藏率']}% | 点赞: {note['点赞数']}\n")
            f.write(f"  - 类型: {note.get('内容类型', 'N/A')}\n\n")

def main():
    """主函数"""
    print("=" * 60)
    print("小红书200条笔记 - 数据分析和素材提取")
    print("=" * 60)

    # 加载数据
    print("\n[INFO] 加载数据...")
    data = load_data()
    print(f"[OK] 已加载 {len(data)} 条笔记")

    # 第2步: 筛选和分类
    filtered_notes = step2_filter_and_classify(data)

    # 第3步: 标题和金句提取
    step3_extract_titles_and_sentences(filtered_notes)

    # 第4步: 方法论沉淀
    step4_methodology_summary(filtered_notes)

    print("\n" + "=" * 60)
    print("[SUCCESS] 全部分析完成!")
    print("=" * 60)
    print("\n输出文件:")
    print(f"- 精选分析/: 精选50条_高质量文案.md")
    print(f"- 精选分析/: 分类统计报告.md")
    print(f"- 素材提取/: 标题库_200条.md")
    print(f"- 素材提取/: 实战金句库_200条提取.md")
    print(f"- 素材提取/: 爆款文案结构库.md")
    print(f"- 方法论更新/: 标题方法论_数据版.md")
    print(f"- 方法论更新/: 选题逻辑_数据版.md")
    print(f"- 方法论更新/: 内容表现数据报告.md")

if __name__ == "__main__":
    main()
