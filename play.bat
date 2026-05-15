@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "PORT=8000"
set "URL=http://127.0.0.1:%PORT%/"

title 放課後フラッグパニック Launcher
echo ================================================
echo 放課後フラッグパニックを起動します。
echo URL: %URL%
echo 終了するときは、このウィンドウで Ctrl+C を押してください。
echo ================================================
echo.

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo PowerShell が見つかりません。
  echo Windows 10/11 標準の PowerShell が利用できる環境で実行してください。
  echo 手動起動する場合は、このフォルダで npm run dev を実行してください。
  echo.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\windows-launcher.ps1" -Port %PORT%
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" (
  echo 起動に失敗しました。エラーコード: %EXIT_CODE%
  echo 画面に表示されたエラーを確認してください。
) else (
  echo ランチャーが終了しました。
)
echo.
pause
exit /b %EXIT_CODE%
