@echo off
setlocal
set "URL=http://127.0.0.1:8000/"

timeout /t 2 /nobreak >nul
start "" "%URL%"

endlocal
