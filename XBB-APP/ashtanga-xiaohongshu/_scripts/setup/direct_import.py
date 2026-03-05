#!/usr/bin/env python3
"""
直接导入素材到旧Notebook
绕过命令行代理问题
"""

import subprocess
import sys
import os

# 强制设置环境
os.environ['PYTHONIOENCODING'] = 'utf-8'
os.environ['HTTP_PROXY'] = 'http://127.0.0.1:7890'
os.environ['HTTPS_PROXY'] = 'http://127.0.0.1:7890'

# Notebook ID
OLD_NOTEBOOK = "80059318-e0e8-4971-95cc-fde4b231d3a0"

# 素材文件
FILES = [
    "内容素材库/核心概念库/觉察记录.md",
    "内容素材库/金句库/练习感悟金句.md",
    "内容素材库/金句库/温暖邀请金句.md",
    "内容素材库/金句库/真诚对话金句.md",
    "ashtanga-xiaohongshu.md",
]

def run_cmd(cmd, cwd=None):
    """运行命令"""
    env = os.environ.copy()
    env['HTTP_PROXY'] = 'http://127.0.0.1:7890'
    env['HTTPS_PROXY'] = 'http://127.0.0.1:7890'

    result = subprocess.run(
        cmd,
        shell=True,
        capture_output=True,
        text=True,
        encoding='utf-8',
        env=env,
        cwd=cwd
    )
    return result.returncode, result.stdout, result.stderr

# 切换到旧Notebook
print("[1/6] 切换到旧Notebook...")
code, out, err = run_cmd(f'notebooklm use "{OLD_NOTEBOOK}"')
if code != 0:
    print(f"失败: {err}")
    sys.exit(1)
print("成功\n")

# 导入素材
base_dir = "D:/BaiduSyncdisk/work/cursor app/claude code/XBB-APP/ashtanga-xiaohongshu"

for i, file in enumerate(FILES, 2):
    print(f"[{i}/6] 导入 {file}...", end=" ")
    code, out, err = run_cmd(f'notebooklm source add "{file}"', cwd=base_dir)
    if code == 0:
        print("OK")
    else:
        print(f"失败: {err[:100]}")

print("\n完成!")
