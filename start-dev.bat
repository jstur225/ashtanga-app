@echo off
chcp 65001 >nul
title 阿斯汤加打卡app - 开发服务器

echo.
echo ============================================================
echo  阿斯汤加打卡app - 开发服务器启动
echo ============================================================
echo.

REM 切换到项目目录
cd /d "%~dp0"

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [检测] 首次运行，正在安装依赖...
    echo.
    call npm install
    echo.
    echo [完成] 依赖安装完成！
    echo.
)

REM 检查 .env.local 是否存在
if not exist ".env.local" (
    echo [警告] 未找到 .env.local 环境变量文件
    echo [提示] 请复制 .env.example 为 .env.local 并配置环境变量
    echo.
    if exist ".env.example" (
        set /p continue="是否现在创建 .env.local? (Y/N): "
        if /i "%continue%"=="Y" (
            copy .env.example .env.local
            echo [完成] 已创建 .env.local，请编辑后重新运行
            pause
            exit
        )
    )
    echo.
)

echo [启动] 正在启动开发服务器...
echo.
echo ============================================================
echo  开发服务器地址: http://localhost:3000
echo  按 Ctrl+C 停止服务器
echo ============================================================
echo.

REM 启动开发服务器
npm run dev

pause
