@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed or not in PATH.& pause & exit /b 1)
where npm.cmd >nul 2>nul || (echo npm is not installed or not in PATH.& pause & exit /b 1)
if not exist "node_modules\typescript\bin\tsc" (
  echo First LAN start: installing public npm dependencies...
  call npm.cmd ci --ignore-scripts
  if errorlevel 1 goto :failed
)
if not exist "dist\Coopege_M8_LAN_Client.html" (
  echo LAN client build is missing. Rebuilding once...
  call npm.cmd run build
  if errorlevel 1 goto :failed
)
if not defined COOPEGE_LAN_OPEN set COOPEGE_LAN_OPEN=1
echo Starting Coopege LAN host. The first browser client will open automatically.
echo Share the printed LAN address with the second device.
call npm.cmd run lan:host
if errorlevel 1 goto :failed
exit /b 0

:failed
echo.
echo LAN start failed. Run COLLECT_DIAGNOSTICS.bat and share coopege-diagnostics.json.
pause
exit /b 1
