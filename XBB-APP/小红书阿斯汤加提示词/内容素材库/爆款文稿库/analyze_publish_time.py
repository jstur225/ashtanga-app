#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
分析高赞笔记的发布时间规律
"""

import json
from collections import Counter
from datetime import datetime

# 读取数据
JSON_FILE = "已清洗/200条笔记_数据.json"
with open(JSON_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

print("=" * 60)
print("发布时间分析")
print("=" * 60)

# 尝试解析发布时间
valid_times = []
hour_distribution = Counter()

for note in data:
    time_str = note.get('发布时间', '')
    if not time_str or time_str == 'nan':
        continue

    # 尝试解析不同格式
    try:
        # 格式1: "2024-11-23 10:47:26"
        if ' ' in time_str and ':' in time_str:
            dt = datetime.strptime(time_str, '%Y-%m-%d %H:%M:%S')
            hour_distribution[dt.hour] += note['点赞数']  # 按点赞数加权
            valid_times.append({
                '时间': dt,
                '小时': dt.hour,
                '点赞': note['点赞数']
            })
        # 格式2: "2024-11-23"
        elif '-' in time_str and ':' not in time_str:
            dt = datetime.strptime(time_str, '%Y-%m-%d')
            valid_times.append({
                '时间': dt,
                '小时': None,
                '点赞': note['点赞数']
            })
    except:
        continue

print(f"\n有效时间数据: {len(valid_times)} 条")

# 按小时分布
if hour_distribution:
    print("\n高赞笔记发布时间段分布 (按点赞数加权):")
    print("-" * 60)

    # 排序
    sorted_hours = sorted(hour_distribution.items(), key=lambda x: x[1], reverse=True)

    for hour, weight in sorted_hours[:10]:
        print(f"{hour:02d}:00-{hour:02d}:59 - 权重值: {weight}")

    # 找出TOP3时间段
    print("\n" + "=" * 60)
    print("TOP3 发布时间段:")
    print("=" * 60)

    top3_ranges = [
        ("早晨", 6, 9),
        ("上午", 9, 12),
        ("下午", 14, 18),
        ("晚上", 18, 22),
        ("深夜", 22, 24),
    ]

    range_weights = {}
    for range_name, start, end in top3_ranges:
        weight = sum(weight for hour, weight in hour_distribution.items() if start <= hour < end)
        range_weights[range_name] = weight

    sorted_ranges = sorted(range_weights.items(), key=lambda x: x[1], reverse=True)
    for i, (range_name, weight) in enumerate(sorted_ranges, 1):
        print(f"{i}. {range_name} ({weight})")

else:
    print("\n无法解析具体小时数,可能数据格式不完整")

# 分析星期几
if valid_times:
    print("\n" + "=" * 60)
    print("星期几分布:")
    print("=" * 60)

    weekday_dist = Counter()
    weekday_names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

    for item in valid_times:
        if item['时间']:
            weekday = item['时间'].weekday()
            weekday_dist[weekday] += item['点赞数']

    for weekday, weight in sorted(weekday_dist.items(), key=lambda x: x[1], reverse=True):
        print(f"{weekday_names[weekday]} - 权重值: {weight}")
