@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto nonode
echo.
echo 今のデータ(アカウント・ポスト・画像)を、常時公開用のデータベース(Turso)へ引っ越します。
echo 元のデータは消えません。
echo.
node --no-warnings scripts\migrate-to-turso.js
echo.
pause
exit /b 0
:nonode
echo Node.js が入っていません。https://nodejs.org から LTS をインストールしてから、もう一度ダブルクリックしてください。
pause
exit /b 1
