@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto nonode
node --no-warnings scripts\share.js
echo.
echo 終了しました。
pause
exit /b 0
:nonode
echo Node.js が入っていません。https://nodejs.org から LTS をインストールしてから、もう一度ダブルクリックしてください。
pause
exit /b 1
