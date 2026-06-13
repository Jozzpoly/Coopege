@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed or not in PATH.& pause & exit /b 1)
if not exist "dist\Coopege_v0.01.html" (
  echo The ready game build is missing. Run REBUILD_AND_PLAY.bat.
  pause
  exit /b 1
)
echo Starting Coopege M7 Final Playtest Candidate...
node tools\dev-server.mjs --open=runtime
if errorlevel 1 (
  echo.
  echo Start failed. Run COLLECT_DIAGNOSTICS.bat and share coopege-diagnostics.json.
  pause
  exit /b 1
)
