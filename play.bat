@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
set "PORT=8000"
set "URL=http://127.0.0.1:%PORT%/"

echo 放課後フラッグパニックを起動します。
echo ブラウザが開かない場合は %URL% を開いてください。
echo 終了するときは、このウィンドウを閉じるか Ctrl+C を押してください。
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\windows-launcher.ps1" -Port %PORT%
if errorlevel 1 (
  echo.
  echo 起動に失敗しました。PowerShell が利用できるWindows環境で再実行してください。
  echo それでも開けない場合は、コマンドプロンプトで npm run dev を実行してください。
  pause
)

endlocal
