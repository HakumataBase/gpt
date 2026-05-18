@echo off
setlocal
cd /d "%~dp0"

if not defined PORT set "PORT=8000"
set "URL=http://127.0.0.1:%PORT%/"
set "PS_EXE=powershell.exe"

title After School Flag Panic Launcher
echo ================================================
echo Starting After School Flag Panic.
echo URL: %URL%
echo Press Ctrl+C in this window to stop the server.
echo ================================================
echo.

where "%PS_EXE%" >nul 2>nul
if errorlevel 1 (
  if exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" (
    set "PS_EXE=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"
  ) else (
    echo PowerShell was not found.
    echo Run on Windows 10/11 with Windows PowerShell available.
    echo You can also start a static server manually in this folder.
    echo.
    pause
    exit /b 1
  )
)

"%PS_EXE%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\windows-launcher.ps1" -Port %PORT%
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" (
  echo Launch failed. Error code: %EXIT_CODE%
  echo Check the error message above.
) else (
  echo Launcher stopped.
)
echo.
pause
exit /b %EXIT_CODE%
