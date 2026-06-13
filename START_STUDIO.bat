@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed or not in PATH.& pause & exit /b 1)
if not exist "dist\Coopege_Studio_v0.1.html" (
  echo The ready Studio build is missing. Run REBUILD_AND_PLAY.bat first.
  pause
  exit /b 1
)
echo Starting Coopege Studio...
node tools\dev-server.mjs --open=studio
if errorlevel 1 (
  echo.
  echo Studio start failed. Run COLLECT_DIAGNOSTICS.bat.
  pause
  exit /b 1
)
