#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
小红书200条笔记数据清洗脚本 v2
功能: 修复编码,提取核心字段,生成可读格式
"""

import pandas as pd
import json
import os
from datetime import datetime

# 文件路径配置
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FILE = os.path.join(BASE_DIR, "小红书点赞前200条笔记.csv")

# 输出目录
OUTPUT_DIR = os.path.join(BASE_DIR, "已清洗")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def clean_data():
    """数据清洗主函数"""
    print("=" * 60)
    print("开始清洗小红书200条笔记数据")
    print("=" * 60)

    # 尝试多种编码读取CSV
    encodings = ['gbk', 'gb18030', 'utf-8', 'gb2312']
    df = None
    used_encoding = None

    for encoding in encodings:
        try:
            print(f"\n尝试编码: {encoding}")
            df = pd.read_csv(CSV_FILE, encoding=encoding)
            used_encoding = encoding
            print(f"[OK] 成功读取! 使用编码: {encoding}")
            print(f"[数据] 数据行数: {len(df)}")
            break
        except Exception as e:
            print(f"[FAIL] 失败: {str(e)[:50]}")
            continue

    if df is None:
        print("\n[INFO] 所有编码尝试失败,尝试使用错误处理...")
        df = pd.read_csv(CSV_FILE, encoding='gb18030', errors='ignore')
        used_encoding = 'gb18030 (ignore errors)'

    # 显示实际列名
    print(f"\n[INFO] 实际列名: {list(df.columns)}")

    # 创建列名映射(根据实际列名)
    column_mapping = {
        # 如果列名是中文,直接映射
        '点赞数': '点赞数',
        '收藏数': '收藏数',
        '评论数': '评论数',
        '笔记标题': '标题',
        '笔记标签': '标签',
        '笔记描述': '描述',
        '笔记链接': '链接',
        '笔记ID': '笔记ID',
        '笔记类型': '类型',
        '发布时间': '发布时间',
        '用户昵称': '用户昵称',
        # 根据CSV读取的实际列名调整
    }

    # 提取核心字段
    print("\n[INFO] 开始提取核心字段...")

    core_data = []
    for idx, row in df.iterrows():
        try:
            # 获取数据(尝试可能的列名)
            note = {
                '序号': idx + 1,
                '笔记ID': str(row.iloc[0]) if len(row) > 0 else '',
                '链接': str(row.iloc[1]) if len(row) > 1 else '',
                '类型': str(row.iloc[2]) if len(row) > 2 else '',
                '标题': str(row.iloc[3]).strip() if len(row) > 3 else '',
                '标签': str(row.iloc[4]) if len(row) > 4 else '',
                '描述': str(row.iloc[5]).strip() if len(row) > 5 else '',
                '点赞数': safe_int(row.iloc[6]) if len(row) > 6 else 0,
                '收藏数': safe_int(row.iloc[7]) if len(row) > 7 else 0,
                '评论数': safe_int(row.iloc[8]) if len(row) > 8 else 0,
                '发布时间': str(row.iloc[9]) if len(row) > 9 else '',
                '用户昵称': str(row.iloc[15]) if len(row) > 15 else '',
            }

            # 计算收藏率
            if note['点赞数'] > 0:
                note['收藏率'] = round(note['收藏数'] / note['点赞数'] * 100, 2)
            else:
                note['收藏率'] = 0

            core_data.append(note)

        except Exception as e:
            print(f"[WARN] 第{idx+1}行数据处理失败: {str(e)[:100]}")
            continue

    print(f"\n[OK] 成功提取 {len(core_data)} 条笔记数据")

    # 生成JSON文件
    json_file = os.path.join(OUTPUT_DIR, "200条笔记_数据.json")
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(core_data, f, ensure_ascii=False, indent=2)
    print(f"[OK] JSON文件已保存: {json_file}")

    # 生成Markdown文件
    md_file = os.path.join(OUTPUT_DIR, "200条笔记_已清洗.md")
    generate_markdown(core_data, md_file)
    print(f"[OK] Markdown文件已保存: {md_file}")

    # 生成统计报告
    stats = analyze_data(core_data)
    stats_file = os.path.join(OUTPUT_DIR, "数据统计报告.md")
    generate_stats_report(stats, stats_file)
    print(f"[OK] 统计报告已保存: {stats_file}")

    print("\n" + "=" * 60)
    print("[SUCCESS] 数据清洗完成!")
    print("=" * 60)

    return core_data

def safe_int(value):
    """安全转换为整数"""
    try:
        return int(float(str(value).replace(',', '')))
    except:
        return 0

def generate_markdown(data, output_file):
    """生成可读的Markdown文件"""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# 小红书200条笔记数据（已清洗）\n\n")
        f.write(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("---\n\n")

        for note in data:
            f.write(f"## {note['序号']}. {note['标题']}\n\n")
            f.write(f"**数据表现**: 点赞 {note['点赞数']} | 收藏 {note['收藏数']} | 评论 {note['评论数']}\n\n")
            f.write(f"**收藏率**: {note['收藏率']}%\n\n")
            f.write(f"**标签**: {note['标签']}\n\n")

            # 如果有描述内容
            if note['描述'] and note['描述'] != 'nan':
                f.write(f"**描述**:\n{note['描述']}\n\n")

            f.write(f"**链接**: {note['链接']}\n\n")
            f.write(f"**发布时间**: {note['发布时间']}\n\n")
            if note['用户昵称']:
                f.write(f"**用户**: {note['用户昵称']}\n\n")
            f.write("---\n\n")

def analyze_data(data):
    """数据分析"""
    stats = {
        '总数': len(data),
        '平均点赞': sum(n['点赞数'] for n in data) // len(data) if data else 0,
        '平均收藏': sum(n['收藏数'] for n in data) // len(data) if data else 0,
        '平均评论': sum(n['评论数'] for n in data) // len(data) if data else 0,
        '平均收藏率': round(sum(n['收藏率'] for n in data) / len(data), 2) if data else 0,
        '高赞笔记': [n for n in data if n['点赞数'] > 500],
        '高收藏率笔记': [n for n in data if n['收藏率'] > 15],
        '高互动笔记': [n for n in data if n['评论数'] > 10],
    }
    return stats

def generate_stats_report(stats, output_file):
    """生成统计报告"""
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# 数据统计报告\n\n")
        f.write(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("---\n\n")

        f.write("## 整体数据\n\n")
        f.write(f"- **总笔记数**: {stats['总数']}\n")
        f.write(f"- **平均点赞**: {stats['平均点赞']}\n")
        f.write(f"- **平均收藏**: {stats['平均收藏']}\n")
        f.write(f"- **平均评论**: {stats['平均评论']}\n")
        f.write(f"- **平均收藏率**: {stats['平均收藏率']}%\n\n")

        f.write("## 筛选标准\n\n")
        f.write("### 高赞笔记 (点赞>500)\n\n")
        f.write(f"数量: **{len(stats['高赞笔记'])}** 条\n\n")
        for note in stats['高赞笔记'][:10]:
            f.write(f"- {note['标题']} (点赞{note['点赞数']})\n")
        if len(stats['高赞笔记']) > 10:
            f.write(f"- ...还有 {len(stats['高赞笔记'])-10} 条\n")

        f.write("\n### 高收藏率笔记 (收藏率>15%)\n\n")
        f.write(f"数量: **{len(stats['高收藏率笔记'])}** 条\n\n")
        for note in stats['高收藏率笔记'][:10]:
            f.write(f"- {note['标题']} (收藏率{note['收藏率']}%)\n")
        if len(stats['高收藏率笔记']) > 10:
            f.write(f"- ...还有 {len(stats['高收藏率笔记'])-10} 条\n")

        f.write("\n### 高互动笔记 (评论>10)\n\n")
        f.write(f"数量: **{len(stats['高互动笔记'])}** 条\n\n")
        for note in stats['高互动笔记'][:10]:
            f.write(f"- {note['标题']} (评论{note['评论数']})\n")
        if len(stats['高互动笔记']) > 10:
            f.write(f"- ...还有 {len(stats['高互动笔记'])-10} 条\n")

if __name__ == "__main__":
    clean_data()
