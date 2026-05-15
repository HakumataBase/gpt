@echo off
setlocal
cd /d "%~dp0"
set PORT=8000
set URL=http://localhost:%PORT%

echo 放課後フラッグパニックを起動します。
echo ブラウザが開かない場合は %URL% を開いてください。
echo 終了するときは、このウィンドウを閉じるか Ctrl+C を押してください。

start "" powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 1; Start-Process '%URL%'"

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 -m http.server %PORT%
  goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server %PORT%
  goto :end
)

echo Python が見つかりません。Python 3 をインストールしてから再実行してください。
pause

:end
endlocal
