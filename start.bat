@echo off
chcp 65001 >nul
title Claude Code - Ashtanga App

echo.
echo ============================================================
echo  Claude Code 快速启动
echo  项目目录: %cd%
echo ============================================================
echo.

REM 切换到当前目录
cd /d "%~dp0"

REM 启动 Claude Code
echo 正在启动 Claude Code...
echo.
claude

pause
