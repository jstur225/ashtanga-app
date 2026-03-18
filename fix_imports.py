#!/usr/bin/env python3
# -*- coding: utf-8 -*-

with open("app/practice/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# 在 DataConflictModal import 之后添加缺失的 imports
insert_pos = 1  # 第1行之后
imports_to_add = [
    "import { DebugLogModal } from '@/components/DebugLogModal'\n",
    "import { toast } from 'sonner'\n",
]

lines = lines[:insert_pos] + imports_to_add + lines[insert_pos:]

with open("app/practice/page.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("添加了缺失的 imports")
