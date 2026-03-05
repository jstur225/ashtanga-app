#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
飞书多维表格读取工具
支持从 URL 提取表格标识，获取所有记录数据
"""

import argparse
import hashlib
import json
import os
import re
import sys
import time
from typing import Optional, List, Dict, Any

import requests

# 设置 stdout 编码
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
else:
    sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)


class CacheManager:
    """简单缓存管理器"""

    def __init__(self, cache_dir: Optional[str] = None, ttl: int = 300):
        """
        初始化缓存管理器

        Args:
            cache_dir: 缓存目录，默认为技能目录下的 .cache
            ttl: 缓存有效期（秒），默认 5 分钟
        """
        if cache_dir is None:
            skill_dir = os.path.dirname(os.path.abspath(__file__))
            cache_dir = os.path.join(skill_dir, ".cache")

        self.cache_dir = cache_dir
        self.ttl = ttl

        # 确保缓存目录存在
        os.makedirs(self.cache_dir, exist_ok=True)

    def _get_cache_key(self, url: str) -> str:
        """根据 URL 生成缓存 key"""
        return hashlib.md5(url.encode()).hexdigest()

    def _get_cache_path(self, cache_key: str) -> str:
        """获取缓存文件路径"""
        return os.path.join(self.cache_dir, f"{cache_key}.json")

    def get(self, url: str) -> Optional[Dict[str, Any]]:
        """
        获取缓存数据

        Args:
            url: 飞书表格 URL

        Returns:
            缓存数据（如果有效），否则 None
        """
        cache_key = self._get_cache_key(url)
        cache_path = self._get_cache_path(cache_key)

        if not os.path.exists(cache_path):
            return None

        try:
            with open(cache_path, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)

            # 检查缓存是否过期
            cached_time = cache_data.get("_cached_at", 0)
            current_time = time.time()

            if current_time - cached_time > self.ttl:
                # 缓存已过期，删除旧缓存
                os.remove(cache_path)
                return None

            # 返回缓存的实际数据（去掉内部字段）
            data = cache_data.get("data")
            if data:
                print(f"[INFO] 使用缓存数据（{int(current_time - cached_time)} 秒前缓存）", file=sys.stderr)
            return data

        except Exception as e:
            print(f"[WARN] 读取缓存失败: {e}", file=sys.stderr)
            return None

    def set(self, url: str, data: Dict[str, Any]) -> bool:
        """
        设置缓存数据

        Args:
            url: 飞书表格 URL
            data: 要缓存的数据

        Returns:
            是否成功
        """
        cache_key = self._get_cache_key(url)
        cache_path = self._get_cache_path(cache_key)

        try:
            cache_data = {
                "_cached_at": time.time(),
                "_url": url,
                "data": data
            }

            with open(cache_path, 'w', encoding='utf-8') as f:
                json.dump(cache_data, f, ensure_ascii=False, indent=2)

            return True
        except Exception as e:
            print(f"[WARN] 写入缓存失败: {e}", file=sys.stderr)
            return False

    def clear(self, url: Optional[str] = None) -> bool:
        """
        清除缓存

        Args:
            url: 指定 URL 的缓存，如果为 None 则清除所有缓存

        Returns:
            是否成功
        """
        try:
            if url:
                # 清除指定 URL 的缓存
                cache_key = self._get_cache_key(url)
                cache_path = self._get_cache_path(cache_key)
                if os.path.exists(cache_path):
                    os.remove(cache_path)
                    print(f"[INFO] 已清除缓存: {url}", file=sys.stderr)
            else:
                # 清除所有缓存
                for filename in os.listdir(self.cache_dir):
                    if filename.endswith('.json'):
                        os.remove(os.path.join(self.cache_dir, filename))
                print(f"[INFO] 已清除所有缓存", file=sys.stderr)

            return True
        except Exception as e:
            print(f"[WARN] 清除缓存失败: {e}", file=sys.stderr)
            return False


class FeishuBitableReader:
    """飞书多维表格读取器"""

    def __init__(self, app_id: str, app_secret: str, use_cache: bool = True, cache_ttl: int = 300):
        self.app_id = app_id
        self.app_secret = app_secret
        self.token: Optional[str] = None
        self.use_cache = use_cache
        self.cache = CacheManager(ttl=cache_ttl) if use_cache else None

    def get_tenant_token(self) -> Optional[str]:
        """获取 tenant_access_token"""
        url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
        payload = {
            "app_id": self.app_id,
            "app_secret": self.app_secret
        }

        try:
            resp = requests.post(url, json=payload, timeout=30)
            result = resp.json()

            if result.get("code") == 0:
                self.token = result["tenant_access_token"]
                return self.token
            else:
                print(f"[ERROR] 认证失败: {result}", file=sys.stderr)
                return None
        except Exception as e:
            print(f"[ERROR] 获取 token 失败: {e}", file=sys.stderr)
            return None

    @staticmethod
    def parse_url(url: str) -> tuple:
        """
        从飞书多维表格链接提取 app_token 和 table_id

        URL 格式示例：
        - https://xxx.feishu.cn/base/{app_token}?table={table_id}
        - https://xxx.feishu.cn/base/{app_token}
        """
        # 提取 app_token (base/ 后面的部分)
        app_token_match = re.search(r'/base/([a-zA-Z0-9]+)', url)
        if not app_token_match:
            raise ValueError(f"无法从 URL 提取 app_token: {url}")

        app_token = app_token_match.group(1)

        # 提取 table_id (table= 后面的部分)
        table_id_match = re.search(r'[?&]table=([a-zA-Z0-9]+)', url)
        table_id = table_id_match.group(1) if table_id_match else None

        return app_token, table_id

    def get_tables(self, app_token: str) -> List[Dict[str, Any]]:
        """获取多维表格中的所有数据表"""
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables"
        headers = {"Authorization": f"Bearer {self.token}"}

        try:
            resp = requests.get(url, headers=headers, timeout=30)
            result = resp.json()

            if result.get("code") == 0:
                return result["data"].get("items", [])
            else:
                print(f"[ERROR] 获取数据表列表失败: {result}", file=sys.stderr)
                return []
        except Exception as e:
            print(f"[ERROR] 获取数据表列表失败: {e}", file=sys.stderr)
            return []

    def get_fields(self, app_token: str, table_id: str) -> List[Dict[str, Any]]:
        """获取数据表的所有字段"""
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/fields"
        headers = {"Authorization": f"Bearer {self.token}"}

        fields = []
        page_token = None

        try:
            while True:
                params = {"page_size": 100}
                if page_token:
                    params["page_token"] = page_token

                resp = requests.get(url, headers=headers, params=params, timeout=30)
                result = resp.json()

                if result.get("code") == 0:
                    data = result.get("data") or {}
                    items = data.get("items", []) if data else []
                    if items:
                        fields.extend(items)

                    # 检查是否有更多分页
                    page_token = data.get("page_token") if data else None
                    if not page_token or not items:
                        break
                else:
                    print(f"[WARN] 获取字段失败: {result}", file=sys.stderr)
                    break

            return fields
        except Exception as e:
            print(f"[WARN] 获取字段失败: {e}", file=sys.stderr)
            return []

    def get_all_records(self, app_token: str, table_id: str) -> List[Dict[str, Any]]:
        """获取数据表的所有记录（自动处理分页）"""
        url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records"
        headers = {"Authorization": f"Bearer {self.token}"}

        all_records = []
        page_token = None

        try:
            while True:
                params = {"page_size": 500}
                if page_token:
                    params["page_token"] = page_token

                resp = requests.get(url, headers=headers, params=params, timeout=30)
                result = resp.json()

                if result.get("code") == 0:
                    items = result["data"].get("items", [])
                    all_records.extend(items)

                    # 检查是否有更多分页
                    page_token = result["data"].get("page_token")
                    has_more = result["data"].get("has_more", False)

                    if not has_more or not page_token:
                        break
                else:
                    print(f"[ERROR] 获取记录失败: {result}", file=sys.stderr)
                    break

            return all_records
        except Exception as e:
            print(f"[ERROR] 获取记录失败: {e}", file=sys.stderr)
            return []

    def read_bitable(self, url: str, force_refresh: bool = False) -> Dict[str, Any]:
        """
        读取飞书多维表格的完整数据

        Args:
            url: 飞书多维表格链接
            force_refresh: 是否强制刷新缓存

        Returns:
            {
                "app_token": str,
                "table_id": str,
                "table_name": str,
                "fields": List[Dict],
                "records": List[Dict],
                "total": int
            }
        """
        # 1. 检查缓存（如果启用且不是强制刷新）
        if self.use_cache and not force_refresh and self.cache:
            cached_data = self.cache.get(url)
            if cached_data:
                return cached_data

        # 2. 解析 URL
        app_token, table_id = self.parse_url(url)

        # 3. 获取 token
        if not self.get_tenant_token():
            raise RuntimeError("无法获取飞书访问令牌")

        # 4. 如果没有提供 table_id，获取第一个数据表
        if not table_id:
            tables = self.get_tables(app_token)
            if not tables:
                raise RuntimeError("未找到任何数据表")
            table_id = tables[0]["table_id"]
            table_name = tables[0]["name"]
        else:
            # 获取表名
            tables = self.get_tables(app_token)
            table_name = next((t["name"] for t in tables if t["table_id"] == table_id), "未知")

        # 5. 获取字段信息
        fields = self.get_fields(app_token, table_id)

        # 6. 获取所有记录
        records = self.get_all_records(app_token, table_id)

        # 7. 构建结果
        result = {
            "app_token": app_token,
            "table_id": table_id,
            "table_name": table_name,
            "fields": fields,
            "records": records,
            "total": len(records)
        }

        # 8. 写入缓存
        if self.use_cache and self.cache:
            self.cache.set(url, result)
            print(f"[INFO] 数据已缓存（有效期 5 分钟）", file=sys.stderr)

        return result


def load_config() -> Dict[str, Any]:
    """加载技能配置文件"""
    skill_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(skill_dir, "config.json")

    # 默认配置
    config = {
        "app_id": "",
        "app_secret": "",
        "default_table": "",
        "tables": {}
    }

    # 从配置文件加载
    if os.path.exists(config_path):
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                file_config = json.load(f)
                if file_config:
                    config.update(file_config)
        except Exception as e:
            print(f"[WARN] 读取配置文件失败: {e}", file=sys.stderr)

    # 从环境变量加载（优先级更高）
    if os.environ.get("FEISHU_APP_ID"):
        config["app_id"] = os.environ.get("FEISHU_APP_ID")
    if os.environ.get("FEISHU_APP_SECRET"):
        config["app_secret"] = os.environ.get("FEISHU_APP_SECRET")

    return config


def get_table_url(config: Dict[str, Any], table_key: Optional[str] = None) -> Optional[str]:
    """
    获取表格 URL

    Args:
        config: 配置字典
        table_key: 表格 key，如果为 None 则使用默认表格

    Returns:
        表格 URL，如果没有找到则返回 None
    """
    tables = config.get("tables", {})

    # 如果没有指定 key，使用默认表格
    if table_key is None:
        table_key = config.get("default_table")

    if table_key and table_key in tables:
        return tables[table_key].get("url")

    return None


def list_tables(config: Dict[str, Any]) -> str:
    """列出所有配置的表格"""
    lines = []
    lines.append("=" * 60)
    lines.append("📋 【飞书表格目录】")
    lines.append("=" * 60)

    tables = config.get("tables", {})
    default_table = config.get("default_table")

    if not tables:
        lines.append("暂无配置的表格")
        return '\n'.join(lines)

    for key, info in tables.items():
        is_default = " ⭐ 默认" if key == default_table else ""
        lines.append(f"\n【{key}】{is_default}")
        lines.append(f"  名称: {info.get('name', 'N/A')}")
        lines.append(f"  描述: {info.get('description', 'N/A')}")
        lines.append(f"  链接: {info.get('url', 'N/A')}")

    lines.append("\n" + "=" * 60)
    lines.append("使用方式:")
    lines.append("  - 直接运行: 使用默认表格")
    lines.append("  - 指定表格: 使用表格 key（如 orders）")
    lines.append("  - 指定链接: 使用完整飞书 URL")
    lines.append("=" * 60)

    return '\n'.join(lines)


def format_output(data: Dict[str, Any]) -> str:
    """格式化输出表格数据"""
    lines = []

    # 表格信息
    lines.append(f"表格名称: {data['table_name']}")
    lines.append(f"记录总数: {data['total']}")
    lines.append(f"字段数量: {len(data['fields'])}")
    lines.append("")

    # 字段信息
    lines.append("=== 字段列表 ===")
    field_map = {}
    for field in data['fields']:
        field_name = field.get('field_name', '未知')
        field_id = field.get('field_id', '')
        field_type = field.get('type', '未知')
        field_map[field_id] = field_name
        lines.append(f"  - {field_name} ({field_type})")
    lines.append("")

    # 记录数据
    lines.append("=== 记录数据 ===")
    for i, record in enumerate(data['records'], 1):
        lines.append(f"\n[记录 {i}] ID: {record.get('record_id', 'N/A')}")
        fields_data = record.get('fields', {})

        # 将 field_id 转换为字段名
        for field_id, value in fields_data.items():
            field_name = field_map.get(field_id, field_id)
            # 处理不同类型的值
            if isinstance(value, list):
                # 多选、人员等类型
                value_str = ', '.join(str(v.get('text', v)) if isinstance(v, dict) else str(v) for v in value)
            elif isinstance(value, dict):
                # 链接、查找等类型
                value_str = str(value.get('text', value))
            else:
                value_str = str(value)

            lines.append(f"  {field_name}: {value_str}")

    return '\n'.join(lines)


def format_pending_shipping(data: Dict[str, Any]) -> str:
    """格式化输出待发货订单清单"""
    from collections import Counter

    lines = []
    field_map = {f['field_id']: f['field_name'] for f in data['fields']}

    # 筛选待发货订单（待发货 + 无退款 + 快递）
    pending_orders = []
    for record in data['records']:
        fields = record.get('fields', {})
        field_dict = {field_map.get(fid, fid): val for fid, val in fields.items()}

        status = field_dict.get('订单状态', '')
        refund = field_dict.get('订单退款状态', '')
        ship_method = field_dict.get('订单配送方式', '')

        if status == '待发货' and refund == '👌无退款' and ship_method == '快递':
            pending_orders.append(field_dict)

    if not pending_orders:
        return "✅ 当前没有待发货的订单"

    lines.append("=" * 60)
    lines.append(f"📦 【待发货订单】- 共 {len(pending_orders)} 单")
    lines.append("=" * 60)

    # 显示订单详情
    for i, order in enumerate(pending_orders, 1):
        lines.append(f"\n【订单 {i}】")
        lines.append(f"  订单号: {order.get('订单号', 'N/A')}")
        lines.append(f"  商品: {order.get('全部商品名称', 'N/A')}")
        lines.append(f"  收货人: {order.get('收货人/提货人', 'N/A')}")

    # 统计商品种类
    product_counter = Counter()
    for order in pending_orders:
        products = order.get('全部商品名称', '')
        if products:
            for p in str(products).split(';'):
                p = p.strip()
                if p:
                    if '(' in p and ')' in p:
                        name = p[:p.rfind('(')]
                        qty = p[p.rfind('(')+1:p.rfind(')')]
                        try:
                            qty_num = int(qty.replace('件', ''))
                            product_counter[name] += qty_num
                        except:
                            product_counter[p] += 1
                    else:
                        product_counter[p] += 1

    lines.append("\n" + "=" * 60)
    lines.append("📋 【订货清单】")
    lines.append("=" * 60)

    for product, count in product_counter.most_common():
        lines.append(f"  {product}: {count} 件")

    lines.append(f"\n总计: {sum(product_counter.values())} 件")
    lines.append("=" * 60)

    return '\n'.join(lines)


def resolve_url(config: Dict[str, Any], url_or_key: Optional[str]) -> Optional[str]:
    """
    解析 URL 或表格 key

    Args:
        config: 配置字典
        url_or_key: URL 或表格 key

    Returns:
        完整的飞书表格 URL
    """
    if url_or_key is None:
        # 使用默认表格
        return get_table_url(config, None)

    # 如果是完整 URL（包含 feishu.cn）
    if 'feishu.cn' in url_or_key:
        return url_or_key

    # 否则当作表格 key 处理
    return get_table_url(config, url_or_key)


def main():
    parser = argparse.ArgumentParser(description='读取飞书多维表格')
    parser.add_argument('url_or_key', nargs='?', help='飞书多维表格链接或表格 key（默认使用配置的默认表格）')
    parser.add_argument('--format', choices=['json', 'text'], default='text',
                        help='输出格式 (默认: text)')
    parser.add_argument('--no-cache', action='store_true',
                        help='禁用缓存，强制从 API 读取')
    parser.add_argument('--clear-cache', action='store_true',
                        help='清除缓存后读取')
    parser.add_argument('--cache-ttl', type=int, default=300,
                        help='缓存有效期（秒），默认 300 秒（5 分钟）')
    parser.add_argument('--pending-shipping', action='store_true',
                        help='只显示待发货订单清单')
    parser.add_argument('--list-tables', action='store_true',
                        help='列出所有配置的表格')
    args = parser.parse_args()

    # 加载配置
    config = load_config()

    if not config.get("app_id") or not config.get("app_secret"):
        print("[ERROR] 未配置飞书应用凭证", file=sys.stderr)
        print("请设置 config.json 中的 app_id 和 app_secret", file=sys.stderr)
        print("或通过环境变量 FEISHU_APP_ID 和 FEISHU_APP_SECRET 设置", file=sys.stderr)
        sys.exit(1)

    # 列出表格目录
    if args.list_tables:
        print(list_tables(config))
        return

    # 解析 URL
    table_url = resolve_url(config, args.url_or_key)

    if not table_url:
        print("[ERROR] 无法获取表格 URL", file=sys.stderr)
        print("请提供有效的表格链接或表格 key", file=sys.stderr)
        print("或使用 --list-tables 查看可用表格", file=sys.stderr)
        sys.exit(1)

    # 处理清除缓存请求
    if args.clear_cache:
        cache = CacheManager()
        cache.clear(table_url)

    # 创建读取器
    reader = FeishuBitableReader(
        app_id=config["app_id"],
        app_secret=config["app_secret"],
        use_cache=not args.no_cache,
        cache_ttl=args.cache_ttl
    )

    try:
        # 读取表格数据
        data = reader.read_bitable(table_url, force_refresh=args.clear_cache)

        # 输出结果
        if args.pending_shipping:
            print(format_pending_shipping(data))
        elif args.format == 'json':
            print(json.dumps(data, ensure_ascii=False, indent=2))
        else:
            print(format_output(data))

    except ValueError as e:
        print(f"[ERROR] URL 解析错误: {e}", file=sys.stderr)
        sys.exit(1)
    except RuntimeError as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] 未知错误: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
