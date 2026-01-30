#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
图片批量压缩工具
将指定目录下所有大于3MB的图片压缩到3MB以下
"""

import os
import sys
from pathlib import Path
from PIL import Image

# 配置参数
TARGET_DIR = r"D:\BaiduSyncdisk\work\星图\水晶上架 - 副本"
TARGET_SIZE_MB = 3
TARGET_SIZE_BYTES = TARGET_SIZE_MB * 1024 * 1024
SUPPORTED_FORMATS = ['.jpg', '.jpeg', '.png']

# 统计信息
stats = {
    'total': 0,
    'compressed': 0,
    'skipped': 0,
    'failed': 0
}


def get_file_size(file_path):
    """获取文件大小（字节）"""
    return os.path.getsize(file_path)


def format_size(size_bytes):
    """格式化文件大小显示"""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"


def compress_image(file_path):
    """
    压缩图片到目标大小以下
    返回：是否成功, 原始大小, 压缩后大小, 最终质量
    """
    try:
        # 读取图片
        img = Image.open(file_path)
        original_size = get_file_size(file_path)

        # 如果是 RGBA 模式的 PNG，需要转换为 RGB
        if img.mode == 'RGBA':
            # 创建白色背景
            background = Image.new('RGB', img.size, (255, 255, 255))
            # 粘贴图片（使用 alpha 通道作为掩码）
            background.paste(img, mask=img.split()[3])
            img = background
        elif img.mode not in ('RGB', 'L'):
            img = img.convert('RGB')

        # 临时文件路径
        temp_path = file_path + '.temp'

        # 逐步降低质量，从95开始，每次递减5，最低到60
        quality = 95
        min_quality = 60

        while quality >= min_quality:
            # 保存为 JPEG 格式
            img.save(temp_path, 'JPEG', quality=quality, optimize=True)

            # 检查文件大小
            compressed_size = get_file_size(temp_path)

            if compressed_size <= TARGET_SIZE_BYTES:
                # 压缩成功，替换原文件
                os.remove(file_path)
                os.rename(temp_path, file_path)

                # 保持原来的扩展名
                final_path = Path(file_path)
                if final_path.suffix.lower() in ['.png']:
                    # 如果原文件是 PNG，改名为 .jpg
                    new_path = str(final_path.with_suffix('.jpg'))
                    os.rename(file_path, new_path)
                    file_path = new_path

                return True, original_size, compressed_size, quality

            # 质量太高，继续降低
            quality -= 5

        # 如果质量降到最低仍无法满足要求，使用最低质量
        img.save(temp_path, 'JPEG', quality=min_quality, optimize=True)
        compressed_size = get_file_size(temp_path)

        if compressed_size <= TARGET_SIZE_BYTES:
            os.remove(file_path)
            os.rename(temp_path, file_path)

            # 保持原来的扩展名
            final_path = Path(file_path)
            if final_path.suffix.lower() in ['.png']:
                new_path = str(final_path.with_suffix('.jpg'))
                os.rename(file_path, new_path)
                file_path = new_path

            return True, original_size, compressed_size, min_quality
        else:
            # 即使降到最低质量也无法满足要求，仍然替换（这是我们能做的最好结果）
            os.remove(file_path)
            os.rename(temp_path, file_path)

            final_path = Path(file_path)
            if final_path.suffix.lower() in ['.png']:
                new_path = str(final_path.with_suffix('.jpg'))
                os.rename(file_path, new_path)
                file_path = new_path

            return True, original_size, compressed_size, min_quality

    except Exception as e:
        print(f"  ❌ 错误: {e}")
        # 清理临时文件
        if os.path.exists(temp_path):
            os.remove(temp_path)
        return False, 0, 0, 0


def scan_directory(directory):
    """递归扫描目录，处理所有图片"""
    print(f"\n扫描目录: {directory}")
    print("=" * 80)

    for root, dirs, files in os.walk(directory):
        for file in files:
            file_path = os.path.join(root, file)
            file_ext = os.path.splitext(file)[1].lower()

            # 只处理支持的图片格式
            if file_ext in SUPPORTED_FORMATS:
                stats['total'] += 1
                file_size = get_file_size(file_path)

                # 显示文件信息
                print(f"\n[{stats['total']}] {file}")
                print(f"  大小: {format_size(file_size)}")

                # 检查是否需要压缩
                if file_size > TARGET_SIZE_BYTES:
                    print(f"  [!] 超过 {TARGET_SIZE_MB}MB，开始压缩...")

                    success, original_size, compressed_size, quality = compress_image(file_path)

                    if success:
                        stats['compressed'] += 1
                        print(f"  [OK] 压缩成功: {format_size(original_size)} -> {format_size(compressed_size)} (质量: {quality})")
                    else:
                        stats['failed'] += 1
                        print(f"  [FAIL] 压缩失败")
                else:
                    print(f"  [OK] 无需压缩（已小于 {TARGET_SIZE_MB}MB）")
                    stats['skipped'] += 1


def main():
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

    print("\n" + "=" * 80)
    print("图片批量压缩工具")
    print("=" * 80)
    print(f"\n配置信息:")
    print(f"  - 目标目录: {TARGET_DIR}")
    print(f"  - 大小限制: {TARGET_SIZE_MB}MB")
    print(f"  - 支持格式: {', '.join(SUPPORTED_FORMATS)}")

    # 检查目录是否存在
    if not os.path.exists(TARGET_DIR):
        print(f"\n[错误] 目录不存在 - {TARGET_DIR}")
        sys.exit(1)

    # 询问是否继续
    print(f"\n[警告] 压缩会覆盖原文件，建议先备份整个文件夹！")
    response = input("\n是否继续？(输入 yes 继续): ")

    if response.lower() != 'yes':
        print("\n已取消操作")
        sys.exit(0)

    # 开始扫描和压缩
    scan_directory(TARGET_DIR)

    # 显示统计信息
    print("\n" + "=" * 80)
    print("压缩完成统计")
    print("=" * 80)
    print(f"  总文件数: {stats['total']}")
    print(f"  已压缩: {stats['compressed']}")
    print(f"  无需压缩: {stats['skipped']}")
    print(f"  压缩失败: {stats['failed']}")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    main()
