@echo off
setlocal
set "URL=http://127.0.0.1:8000/"

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo PowerShell が見つかりません。ブラウザで %URL% を開いてください。
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Command "Start-Process '%URL%'"
if errorlevel 1 (
  echo ブラウザを自動で開けませんでした。手動で %URL% を開いてください。
  pause
)

endlocal
