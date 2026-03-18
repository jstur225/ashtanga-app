#!/usr/bin/env python3
# -*- coding: utf-8 -*-

with open("app/practice/page.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

# 1. 删除 handleShareCardEdit 函数（第2848-2856行，索引2847-2855）
#    lines = lines[:2847] + lines[2856:]  # 9行（函数体+空行）

# 2. 在最后一条import后添加 APP_VERSION（第33行）
last_import_idx = None
for i, line in enumerate(lines):
    if line.strip().startswith('import ') and 'audioCache' in line:
        last_import_idx = i
        break

if last_import_idx:
    lines.insert(last_import_idx + 1, '\n')
    lines.insert(last_import_idx + 2, '// 应用版本号\n')
    lines.insert(last_import_idx + 3, "const APP_VERSION = '1.0.2'  // 每次修改后递增\n")
    lines.insert(last_import_idx + 4, '\n')

# 3. 添加调试信息到 ShareCardModal（在 cardRef 之后）
for i, line in enumerate(lines):
    if 'const cardRef = useRef<HTMLDivElement>(null)' in line:
        lines.insert(i + 1, '\n')
        lines.insert(i + 2, '  // 调试信息\n')
        lines.insert(i + 3, '  useEffect(() => {\n')
        lines.insert(i + 4, '    console.log(`[ShareCardModal] v${APP_VERSION} 初始化`, {\n')
        lines.insert(i + 5, '      hasRecord: !!record,\n')
        lines.insert(i + 6, '      recordId: record?.id,\n')
        lines.insert(i + 7, '      isOpen\n')
        lines.insert(i + 8, '    })\n')
        lines.insert(i + 9, '  }, [record, isOpen])\n')
        lines.insert(i + 10, '\n')
        break

# 4. 更新 appVersion
for i, line in enumerate(lines):
    if "appVersion: '1.0.1'" in line:
        lines[i] = line.replace("appVersion: '1.0.1'", "appVersion: APP_VERSION")
        break

with open("app/practice/page.tsx", "w", encoding="utf-8") as f:
    f.writelines(lines)

print("完成所有修改")
print(f"总行数: {len(lines)}")
