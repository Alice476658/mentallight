@echo off
chcp 65001 >nul
setlocal

REM =====================================================================
REM  用「本机代理」让 git push 只走 GitHub（Clash Verge / v2rayN 等）
REM  1) 先安装客户端，导入订阅，打开「系统代理」或至少让核心在跑
REM  2) 在客户端里看「端口」：本项目当前使用 Mixed/HTTP = 7897（按你 Clash 设置可再改）
REM  3) 若只用 SOCKS，把下面 PROXY 改成 socks5://127.0.0.1:对应端口
REM  4) 双击本脚本，或在终端执行：scripts\push-github-via-proxy.bat
REM =====================================================================

REM -------- 与 Clash Verge「端口设置」中的 Mixed/HTTP 一致 --------
set "PROXY=http://127.0.0.1:7897"
REM set "PROXY=socks5://127.0.0.1:7891"

echo.
echo 当前 GitHub 专用代理: %PROXY%
echo 若 push 仍失败，请确认 Clash 已启动且端口与上面一致。
echo.

git config --global http.https://github.com.proxy "%PROXY%"
git config --global https.https://github.com.proxy "%PROXY%"

cd /d "%~dp0.."
git push origin main
set ERR=%ERRORLEVEL%

echo.
if %ERR% neq 0 (
  echo push 失败。请检查：客户端是否运行、端口是否匹配、订阅是否有效。
) else (
  echo 推送成功。日常不需要代理时，可运行 scripts\clear-git-github-proxy.bat 清除配置。
)
echo.
pause
endlocal & exit /b %ERR%
