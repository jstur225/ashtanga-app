#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
NotebookLM 认证设置脚本
解决 Windows 编码问题
"""
import sys
import os

# 设置编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# 添加脚本目录到路径
script_dir = os.path.join(os.path.dirname(__file__), 'scripts')
sys.path.insert(0, script_dir)

# 导入 auth_manager
from auth_manager import main

if __name__ == '__main__':
    # 传递 setup 参数
    sys.argv = ['auth_manager.py', 'setup']
    main()
