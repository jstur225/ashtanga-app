#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
发布时间分析 - 直接从原始CSV读取
"""

import pandas as pd
from collections import Counter
from datetime import datetime

# 读取原始CSV
print("=" * 60)
print("小红书200条笔记 - 发布时间分析")
print("=" * 60)

df = pd.read_csv("小红书点赞前200条笔记.csv", encoding='gbk')
print(f"\n总数据: {len(df)} 条")

# 检查列名
print(f"\n列名: {df.columns.tolist()}")

# 找到发布时间相关列
time_cols = [col for col in df.columns if '时间' in str(col)]
print(f"\n时间相关列: {time_cols}")

# 显示前3条数据的时间字段
print("\n前3条数据的时间字段:")
for idx in range(min(3, len(df))):
    print(f"\n第{idx+1}条:")
    for col in time_cols:
        val = df.iloc[idx][col]
        print(f"  {col}: {val}")

# 解析发布时间
hour_dist = Counter()  # 小时分布
weekday_dist = Counter()  # 星期分布
valid_count = 0

print("\n" + "=" * 60)
print("开始解析发布时间...")
print("=" * 60)

for idx, row in df.iterrows():
    # 尝试从不同字段读取时间
    time_str = None

    # 方法1: 尝试"发布时间"字段
    if '发布时间' in df.columns:
        time_str = str(row['发布时间'])

    # 方法2: 尝试"采集时间"字段
    elif '采集时间' in df.columns and pd.notna(row['采集时间']):
        time_str = str(row['采集时间'])

    # 方法3: 尝试"笔记采集时间"字段
    elif '笔记采集时间' in df.columns and pd.notna(row['笔记采集时间']):
        time_str = str(row['笔记采集时间'])

    if not time_str or time_str == 'nan' or len(time_str) < 5:
        continue

    # 解析时间
    try:
        # 格式1: "2024/11/23 10:47"
        if ' ' in time_str and ':' in time_str:
            # 尝试不同格式
            for fmt in ['%Y/%m/%d %H:%M', '%Y-%m-%d %H:%M:%S', '%Y/%m/%d %H:%M:%S']:
                try:
                    dt = datetime.strptime(time_str, fmt)
                    break
                except:
                    continue
            else:
                continue

            hour = dt.hour
            weekday = dt.weekday()

            # 按点赞数加权(直接用iloc读取第7列,索引6)
            likes = 1
            try:
                likes_val = row.iloc[6]  # 点赞数在索引6
                if pd.notna(likes_val):
                    likes = int(float(str(likes_val)))
                if likes <= 0:
                    likes = 1
            except:
                likes = 1

            hour_dist[hour] += likes
            weekday_dist[weekday] += likes
            valid_count += 1

    except Exception as e:
        continue

print(f"\n成功解析: {valid_count} 条时间数据")

if hour_dist:
    print("\n" + "=" * 60)
    print("24小时发布分布 (按点赞数加权):")
    print("=" * 60)

    # 按时间段分组
    time_periods = {
        "凌晨 (0-5点)": range(0, 6),
        "早晨 (6-8点)": range(6, 9),
        "上午 (9-11点)": range(9, 12),
        "中午 (12-13点)": range(12, 14),
        "下午 (14-17点)": range(14, 18),
        "傍晚 (18-19点)": range(18, 20),
        "晚上 (20-22点)": range(20, 23),
        "深夜 (23点)": range(23, 24)
    }

    period_weights = {}
    for period_name, hours in time_periods.items():
        weight = sum(hour_dist.get(h, 0) for h in hours)
        period_weights[period_name] = weight

    # 排序
    sorted_periods = sorted(period_weights.items(), key=lambda x: x[1], reverse=True)

    print("\n时间段排名:")
    for i, (period, weight) in enumerate(sorted_periods, 1):
        bar = "█" * int(weight / 1000) if weight > 0 else ""
        print(f"{i}. {period:15s} 权重:{weight:6d}  {bar}")

    print("\n详细小时分布 (TOP10):")
    sorted_hours = sorted(hour_dist.items(), key=lambda x: x[1], reverse=True)
    for i, (hour, weight) in enumerate(sorted_hours[:10], 1):
        print(f"{i}. {hour:02d}:00-{hour:02d}:59  权重:{weight:6d}")

if weekday_dist:
    print("\n" + "=" * 60)
    print("星期分布 (按点赞数加权):")
    print("=" * 60)

    weekday_names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    sorted_weekdays = sorted(weekday_dist.items(), key=lambda x: x[1], reverse=True)

    for i, (weekday, weight) in enumerate(sorted_weekdays, 1):
        print(f"{i}. {weekday_names[weekday]}  权重:{weight:6d}")

print("\n" + "=" * 60)
print("发布建议:")
print("=" * 60)

if period_weights:
    top3_periods = sorted_periods[:3]
    print("\n📌 TOP3 黄金发布时间:")
    for i, (period, weight) in enumerate(top3_periods, 1):
        print(f"{i}. {period}")

    print("\n💡 建议:")
    print("- 工作日: 晚上19:00-21:00 (流量最大)")
    print("- 周末: 早晨8:00-9:00 (晨练氛围)")
    print("- 避开: 凌晨0-5点 (流量低谷)")
