#!/usr/bin/env python3
"""
有赞消息订阅 Webhook 接收服务
实现订单事件的实时同步到飞书多维表格
"""

import os
import sys
import json
import hmac
import hashlib
import logging
import threading
from datetime import datetime
from flask import Flask, request, jsonify

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('webhook.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# 有赞配置（从环境变量读取）
YOUZAN_CLIENT_ID = os.environ.get('YOUZAN_CLIENT_ID', '')
YOUZAN_CLIENT_SECRET = os.environ.get('YOUZAN_CLIENT_SECRET', '')

# 飞书配置
FEISHU_APP_ID = os.environ.get('FEISHU_APP_ID', '')
FEISHU_APP_SECRET = os.environ.get('FEISHU_APP_SECRET', '')
FEISHU_TABLE_TOKEN = os.environ.get('FEISHU_TABLE_TOKEN', '')
FEISHU_TABLE_ID = os.environ.get('FEISHU_TABLE_ID', '')


def verify_sign(client_id: str, body: str, client_secret: str, sign: str) -> bool:
    """
    验证有赞消息签名
    sign = MD5(client_id + request_body + client_secret)
    """
    expected_sign = hashlib.md5(
        f"{client_id}{body}{client_secret}".encode('utf-8')
    ).hexdigest()
    return hmac.compare_digest(expected_sign.lower(), sign.lower())


def get_youzan_token() -> str:
    """获取有赞API访问令牌"""
    import requests

    url = "https://open.youzan.com/oauth/token"
    data = {
        'client_id': YOUZAN_CLIENT_ID,
        'client_secret': YOUZAN_CLIENT_SECRET,
        'grant_type': 'silent',
        'kdt_id': os.environ.get('YOUZAN_KDT_ID', '')
    }

    try:
        response = requests.post(url, data=data, timeout=10)
        result = response.json()
        return result.get('access_token', '')
    except Exception as e:
        logger.error(f"获取有赞token失败: {e}")
        return ''


def get_order_detail(tid: str) -> dict:
    """获取订单详情"""
    import requests

    token = get_youzan_token()
    if not token:
        return {}

    url = "https://open.youzan.com/api/oauthentry/youzan.trade.get/3.0.0/get"
    params = {
        'access_token': token,
        'tid': tid
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        result = response.json()
        return result.get('response', {}).get('trade', {})
    except Exception as e:
        logger.error(f"获取订单详情失败: {e}")
        return {}


def get_feishu_token() -> str:
    """获取飞书访问令牌"""
    import requests

    url = "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal"
    headers = {
        'Content-Type': 'application/json'
    }
    data = {
        'app_id': FEISHU_APP_ID,
        'app_secret': FEISHU_APP_SECRET
    }

    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        result = response.json()
        return result.get('tenant_access_token', '')
    except Exception as e:
        logger.error(f"获取飞书token失败: {e}")
        return ''


def search_feishu_record(order_no: str) -> str:
    """
    在飞书表格中搜索订单记录
    返回记录ID，如果不存在返回空字符串
    """
    import requests

    token = get_feishu_token()
    if not token:
        return ''

    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{FEISHU_TABLE_TOKEN}/tables/{FEISHU_TABLE_ID}/records/search"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    # 假设订单号字段名为"订单号"
    data = {
        'filter': {
            'conjunction': 'and',
            'conditions': [
                {
                    'field_name': '订单号',
                    'operator': 'is',
                    'value': [order_no]
                }
            ]
        }
    }

    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        result = response.json()
        items = result.get('data', {}).get('items', [])
        if items:
            return items[0].get('record_id', '')
        return ''
    except Exception as e:
        logger.error(f"搜索飞书记录失败: {e}")
        return ''


def create_feishu_record(order_data: dict) -> bool:
    """在飞书表格中创建订单记录"""
    import requests

    token = get_feishu_token()
    if not token:
        return False

    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{FEISHU_TABLE_TOKEN}/tables/{FEISHU_TABLE_ID}/records"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    # 构建飞书表格字段数据
    fields = build_feishu_fields(order_data)

    data = {
        'fields': fields
    }

    try:
        response = requests.post(url, headers=headers, json=data, timeout=10)
        result = response.json()
        if result.get('code') == 0:
            logger.info(f"创建飞书记录成功: {order_data.get('tid', '')}")
            return True
        else:
            logger.error(f"创建飞书记录失败: {result}")
            return False
    except Exception as e:
        logger.error(f"创建飞书记录异常: {e}")
        return False


def update_feishu_record(record_id: str, order_data: dict) -> bool:
    """更新飞书表格中的订单记录"""
    import requests

    token = get_feishu_token()
    if not token:
        return False

    url = f"https://open.feishu.cn/open-apis/bitable/v1/apps/{FEISHU_TABLE_TOKEN}/tables/{FEISHU_TABLE_ID}/records/{record_id}"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }

    # 构建飞书表格字段数据
    fields = build_feishu_fields(order_data)

    data = {
        'fields': fields
    }

    try:
        response = requests.put(url, headers=headers, json=data, timeout=10)
        result = response.json()
        if result.get('code') == 0:
            logger.info(f"更新飞书记录成功: {order_data.get('tid', '')}")
            return True
        else:
            logger.error(f"更新飞书记录失败: {result}")
            return False
    except Exception as e:
        logger.error(f"更新飞书记录异常: {e}")
        return False


def build_feishu_fields(order_data: dict) -> dict:
    """
    构建飞书表格字段数据
    根据实际表格字段调整
    """
    trade = order_data

    # 提取订单信息
    tid = trade.get('tid', '')
    status = trade.get('status', '')
    status_str = get_status_display(status)
    total_fee = trade.get('total_fee', '0')
    created_time = trade.get('created', '')
    pay_time = trade.get('pay_time', '')
    receiver_name = trade.get('receiver_name', '')
    receiver_tel = trade.get('receiver_tel', '')
    receiver_address = trade.get('receiver_address', '')

    # 提取商品信息
    orders = trade.get('orders', [])
    items = []
    for order in orders:
        title = order.get('title', '')
        num = order.get('num', 0)
        items.append(f"{title} x{num}")
    items_str = '; '.join(items)

    # 构建字段（根据实际表格结构调整字段名）
    fields = {
        '订单号': tid,
        '订单状态': status_str,
        '订单金额': float(total_fee) / 100 if total_fee else 0,  # 分转元
        '商品信息': items_str,
        '收货人': receiver_name,
        '联系电话': receiver_tel,
        '收货地址': receiver_address,
        '创建时间': format_time(created_time),
        '支付时间': format_time(pay_time) if pay_time else '',
        '同步时间': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }

    return fields


def get_status_display(status: str) -> str:
    """获取订单状态显示文本"""
    status_map = {
        'WAIT_BUYER_PAY': '待付款',
        'WAIT_SELLER_SEND_GOODS': '待发货',
        'WAIT_BUYER_CONFIRM_GOODS': '待收货',
        'TRADE_BUYER_SIGNED': '已签收',
        'TRADE_CLOSED': '已关闭',
        'TRADE_CLOSED_BY_USER': '用户关闭',
        'ALL_WAIT_PAY': '待付款',
        'ALL_CLOSED': '已关闭'
    }
    return status_map.get(status, status)


def format_time(timestamp: str) -> str:
    """格式化时间戳"""
    if not timestamp:
        return ''
    try:
        # 有赞时间格式: 2024-01-15 10:30:00
        return timestamp
    except:
        return timestamp


def process_order_async(tid: str, event_type: str):
    """异步处理订单"""
    try:
        logger.info(f"开始处理订单: {tid}, 事件类型: {event_type}")

        # 获取订单详情
        order_data = get_order_detail(tid)
        if not order_data:
            logger.error(f"获取订单详情失败: {tid}")
            return

        # 检查飞书是否已有该订单
        record_id = search_feishu_record(tid)

        if record_id:
            # 更新现有记录
            update_feishu_record(record_id, order_data)
        else:
            # 创建新记录
            create_feishu_record(order_data)

        logger.info(f"订单处理完成: {tid}")

    except Exception as e:
        logger.error(f"处理订单异常: {e}", exc_info=True)


@app.route('/webhook/youzan', methods=['POST'])
def handle_youzan_webhook():
    """
    处理有赞消息推送
    """
    try:
        # 获取请求体
        body = request.get_data(as_text=True)
        logger.info(f"收到有赞推送: {body[:500]}")

        # 获取签名
        sign = request.headers.get('Event-Sign', '')
        event_type = request.headers.get('Event-Type', '')

        if not sign:
            logger.warning("缺少Event-Sign头")
            return jsonify({'code': -1, 'msg': 'missing sign'}), 400

        # 验证签名
        if not verify_sign(YOUZAN_CLIENT_ID, body, YOUZAN_CLIENT_SECRET, sign):
            logger.warning("签名验证失败")
            return jsonify({'code': -1, 'msg': 'invalid sign'}), 403

        # 解析消息
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            logger.error("JSON解析失败")
            return jsonify({'code': -1, 'msg': 'invalid json'}), 400

        # 处理不同类型的事件
        msg_type = data.get('type', '')
        tid = ''

        if msg_type == 'trade_TradeCreate':
            # 订单创建
            tid = data.get('tid', '')
            logger.info(f"订单创建事件: {tid}")

        elif msg_type == 'TRADE_ORDER_STATE':
            # 订单状态变更
            tid = data.get('tid', '')
            status = data.get('status', '')
            logger.info(f"订单状态变更: {tid}, 状态: {status}")

        elif msg_type == 'TRADE_ORDER_REFUND':
            # 退款事件
            tid = data.get('tid', '')
            refund_status = data.get('refund_state', '')
            logger.info(f"退款事件: {tid}, 退款状态: {refund_status}")

        else:
            logger.info(f"未处理的事件类型: {msg_type}")
            return jsonify({'code': 0, 'msg': 'success'})

        # 异步处理订单（避免超时）
        if tid:
            thread = threading.Thread(
                target=process_order_async,
                args=(tid, msg_type)
            )
            thread.daemon = True
            thread.start()

        # 立即返回成功响应
        return jsonify({'code': 0, 'msg': 'success'})

    except Exception as e:
        logger.error(f"处理webhook异常: {e}", exc_info=True)
        return jsonify({'code': -1, 'msg': 'internal error'}), 500


@app.route('/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0'
    })


@app.route('/', methods=['GET'])
def index():
    """首页"""
    return jsonify({
        'service': '有赞Webhook接收服务',
        'version': '1.0.0',
        'endpoints': {
            'webhook': '/webhook/youzan (POST)',
            'health': '/health (GET)'
        }
    })


def init_config():
    """初始化配置检查"""
    required_vars = [
        'YOUZAN_CLIENT_ID',
        'YOUZAN_CLIENT_SECRET',
        'FEISHU_APP_ID',
        'FEISHU_APP_SECRET',
        'FEISHU_TABLE_TOKEN',
        'FEISHU_TABLE_ID'
    ]

    missing = []
    for var in required_vars:
        if not os.environ.get(var):
            missing.append(var)

    if missing:
        logger.warning(f"缺少环境变量: {', '.join(missing)}")
        logger.warning("请设置环境变量后再启动服务")
        return False

    return True


if __name__ == '__main__':
    # 检查配置
    if not init_config():
        print("配置检查失败，请检查环境变量")
        sys.exit(1)

    # 启动Flask服务
    port = int(os.environ.get('PORT', 8000))
    debug = os.environ.get('DEBUG', 'false').lower() == 'true'

    logger.info(f"启动Webhook服务，端口: {port}")
    app.run(host='0.0.0.0', port=port, debug=debug)
