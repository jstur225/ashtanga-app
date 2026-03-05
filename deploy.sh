#!/bin/bash
# 有赞Webhook服务部署脚本

set -e

echo "=========================================="
echo "有赞Webhook服务部署脚本"
echo "=========================================="

# 配置
APP_DIR="/opt/youzan-webhook"
LOG_DIR="/var/log/youzan-webhook"
SERVICE_NAME="webhook"

# 检查root权限
if [ "$EUID" -ne 0 ]; then
    echo "请使用sudo运行此脚本"
    exit 1
fi

echo ""
echo "步骤1: 创建应用目录..."
mkdir -p $APP_DIR
mkdir -p $LOG_DIR

echo ""
echo "步骤2: 安装系统依赖..."
apt-get update
apt-get install -y python3 python3-venv python3-pip nginx

echo ""
echo "步骤3: 创建Python虚拟环境..."
cd $APP_DIR
python3 -m venv venv
source venv/bin/activate

echo ""
echo "步骤4: 安装Python依赖..."
pip install --upgrade pip
pip install flask gunicorn requests

echo ""
echo "步骤5: 复制应用文件..."
# 假设当前目录是项目根目录
cp webhook_server.py $APP_DIR/
cp webhook.service /etc/systemd/system/

echo ""
echo "步骤6: 设置权限..."
chown -R www-data:www-data $APP_DIR
chown -R www-data:www-data $LOG_DIR
chmod +x $APP_DIR/webhook_server.py

echo ""
echo "步骤7: 重载systemd..."
systemctl daemon-reload

echo ""
echo "步骤8: 启动服务..."
systemctl enable webhook
systemctl start webhook

echo ""
echo "步骤9: 检查服务状态..."
sleep 2
systemctl status webhook --no-pager

echo ""
echo "=========================================="
echo "部署完成!"
echo "=========================================="
echo ""
echo "服务状态: systemctl status webhook"
echo "查看日志: journalctl -u webhook -f"
echo "访问日志: tail -f $LOG_DIR/access.log"
echo "错误日志: tail -f $LOG_DIR/error.log"
echo ""
echo "健康检查: curl http://localhost:8000/health"
echo ""
echo "重要提示:"
echo "1. 请编辑 /etc/systemd/system/webhook.service 设置正确的API凭证"
echo "2. 修改后运行: systemctl daemon-reload && systemctl restart webhook"
echo "3. 配置防火墙允许8000端口访问"
echo "4. 如需使用域名，请配置nginx反向代理"
echo ""
