#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""显示NotebookLM生成的文案"""

import json

# 读取web_content_response.txt - 文件在claude code根目录
with open(r'D:\BaiduSyncdisk\work\cursor app\claude code\web_content_response.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# 提取JSON数据
text_content = None
for line in content.split('\n'):
    if line.startswith('data:'):
        try:
            data = json.loads(line[5:].strip())
            if data.get('result'):
                for item in data['result'].get('content', []):
                    if item.get('type') == 'text':
                        inner = json.loads(item.get('text', '{}'))
                        text_content = inner.get('textContent', '')
                        break
        except:
            pass

if text_content:
    # 找到生成的文案部分
    # 用户的输入和生成的回复在页面中
    parts = text_content.split('请用角度1-对话叙述型写一篇小红书文案')

    if len(parts) > 1:
        generated_section = parts[-1]

        # 通常有两个版本的生成结果
        # 找到第一个标题
        print("=" * 60)
        print("NotebookLM 生成的小红书文案")
        print("=" * 60)
        print()

        # 提取第一个生成的文案
        # 格式通常是: 标题: ... 今天...
        first_copy = generated_section.split('标题：')[1] if '标题：' in generated_section else generated_section

        # 找到两个生成版本的分隔点
        # 第二个版本通常是"标题：🟢马年第一练"
        if '标题：🟢' in first_copy:
            second_split = first_copy.split('标题：🟢')
            first_version = second_split[0]
            second_version = '标题：🟢' + second_split[1] if len(second_split) > 1 else ''

            print("【版本1】")
            print("-" * 40)
            print(first_version[:1500])
            print()

            if second_version:
                print("【版本2】(部分)")
                print("-" * 40)
                print(second_version[:800])
        else:
            print(first_copy[:2000])

        # 保存到文件
        with open('final_copy.txt', 'w', encoding='utf-8') as f:
            f.write("NotebookLM 生成的小红书文案\n")
            f.write("=" * 60 + "\n\n")
            f.write("选题:\n")
            f.write("马年的第一练，过年吃胖了几斤，有些体式就做不下去了。\n")
            f.write("龟式的时候，肚子感觉挤得慌。要接受这个胖乎乎的自己。\n")
            f.write("觉察思绪比之前快了一些，有很多碎片，抓到了就丢掉了。\n\n")
            f.write("生成的文案:\n")
            f.write("-" * 40 + "\n")
            f.write(generated_section)

        print()
        print("=" * 60)
        print("完整内容已保存到 final_copy.txt")
        print("=" * 60)
