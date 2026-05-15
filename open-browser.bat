@echo off
setlocal
set "URL=http://127.0.0.1:8000/"

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process '%URL%'"

endlocal
