@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ========================================================
echo   SKCT 온라인 실전 문제풀이 및 자동 채점 웹앱 실행기
echo ========================================================
echo.
echo 웹 서버를 구동 중입니다... (http://localhost:8085)
start http://localhost:8085
python -m http.server 8085 --bind 127.0.0.1
pause
