@echo off
setlocal

set "ROOT=%~dp0"
set "PORT=%PORT%"
if "%PORT%"=="" set "PORT=8000"

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo PowerShell is required to start the local server.
  echo If Python is installed, run: python -m http.server %PORT%
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%tools\windows-static-server.ps1" -Root "%ROOT%" -Port %PORT% -OpenBrowser
exit /b %ERRORLEVEL%
