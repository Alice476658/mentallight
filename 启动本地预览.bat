@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo 正在本文件夹启动临时网页服务……
echo 浏览器中打开： http://localhost:8080
echo 线上部署步骤见：部署说明.md（Vercel / Netlify / GitHub Pages）
echo 关掉本窗口即停止服务。
echo.
py -m http.server 8080 2>nul
if errorlevel 1 python -m http.server 8080 2>nul
if errorlevel 1 (
    echo 未找到 Python。请安装 Python，或使用 VS Code 的 Live Server 扩展。
    pause
)
