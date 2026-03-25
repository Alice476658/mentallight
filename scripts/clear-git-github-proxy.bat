@echo off
chcp 65001 >nul

REM 清除「仅 GitHub 走代理」的 git 配置（不影响 Ghelper 浏览器扩展）

git config --global --unset http.https://github.com.proxy 2>nul
git config --global --unset https.https://github.com.proxy 2>nul

echo 已尝试清除 GitHub 专用代理。若从未设置过，忽略上方提示即可。
pause
