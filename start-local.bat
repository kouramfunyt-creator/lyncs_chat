@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto nonode
if not exist data mkdir data
if exist data\owner.txt goto have
set /p OWNER_USERNAME=サイト主にするログインIDを入力して Enter を押してください: 
>data\owner.txt echo %OWNER_USERNAME%
goto run
:have
set /p OWNER_USERNAME=<data\owner.txt
:run
echo.
echo http://localhost:3000 をブラウザで開いてください。このウィンドウを閉じると止まります。
start "" http://localhost:3000
node --no-warnings server\index.js
pause
exit /b 0
:nonode
echo Node.js が入っていません。https://nodejs.org から LTS をインストールしてから、もう一度ダブルクリックしてください。
pause
exit /b 1
