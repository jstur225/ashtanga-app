#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成所有选题的文案（默认全部重新生成）
"""
import asyncio
import sys
import io
from notebooklm import NotebookLMClient

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

NOTEBOOK_ID = '80059318-e0e8-4971-95cc-fde4b231d3a0'

# 全部6个选题
TOPICS = [
    {
        "record_id": "recvcjjeXuVyID",
        "topic": "马年第一练，她笑着说肚子挤得慌",
        "filename": "generated_horse_year.md"
    },
    {
        "record_id": "recvcjpP3h88O6",
        "topic": "简单介绍一下当前app的开发状态和进度",
        "filename": "generated_app_status.md"
    },
    {
        "record_id": "recvcjOGrai8cR",
        "topic": "2026要频繁大量记录自己的练习",
        "filename": "generated_record_2026.md"
    },
    {
        "record_id": "recvckK3jhhLd2",
        "topic": "在 AI 越来越发达的今天，我们疯狂地用 AI 去节省时间。但节省下来的时间，还是在用 AI 处理各种事情，节省各种各样角落的时间。问题本身成了命题。我们还是要回到生活，爱具体的人，做具体的事情。",
        "filename": "generated_ai_time.md"
    },
    {
        "record_id": "recvckPLY0Fmn7",
        "topic": "阿斯汤加Mysore练习：如何在家建立自律的晨练习惯，线上练习是一个很好的选择，单靠自己是会缺一点感觉的，哪怕是线上再有一定练习经验之后，可以找线上的老师，然后与同学一起练，哪怕是线上，感觉起程还是不一样的。其他的再补充几个建议",
        "filename": "generated_mysore_home.md"
    },
    {
        "record_id": "recvckPU8K02Ik",
        "topic": "阿斯汤加与能量提升：为什么这套古老序列能改变你的气场",
        "filename": "generated_energy.md"
    }
]

async def generate_copy(topic_info, index, total):
    print(f"\n{'='*60}")
    print(f"[{index}/{total}] 正在生成: {topic_info['topic'][:40]}...")
    print(f"{'='*60}")

    question = f'以"{topic_info["topic"]}"为主题，帮我写2个不同角度的小红书文案'

    async with await NotebookLMClient.from_storage() as client:
        result = await client.chat.ask(
            notebook_id=NOTEBOOK_ID,
            question=question
        )

        output_path = f"_scripts/{topic_info['filename']}"
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(result.answer)

        print(f"✅ 已保存: {output_path}")
        return output_path

async def main():
    print("开始生成全部选题文案...")
    print(f"共 {len(TOPICS)} 个选题")

    results = []
    for i, topic in enumerate(TOPICS, 1):
        try:
            path = await generate_copy(topic, i, len(TOPICS))
            results.append({"topic": topic["topic"][:30], "path": path, "status": "成功"})
        except Exception as e:
            print(f"❌ 生成失败: {e}")
            results.append({"topic": topic["topic"][:30], "path": "-", "status": f"失败: {e}"})

    print(f"\n{'='*60}")
    print("生成完成汇总")
    print(f"{'='*60}")
    for r in results:
        print(f"- {r['topic']}... | {r['status']}")

if __name__ == '__main__':
    asyncio.run(main())
