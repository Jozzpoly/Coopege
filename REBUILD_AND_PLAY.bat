@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed or not in PATH.& pause & exit /b 1)
where npm >nul 2>nul || (echo npm is not installed or not in PATH.& pause & exit /b 1)
if not exist "node_modules\typescript\bin\tsc" (
  echo Installing locked project dependencies...
  call npm ci --ignore-scripts || (echo npm ci failed.& pause & exit /b 1)
)
echo Verifying environment and rebuilding Coopege...
call npm run doctor || (echo Environment check failed.& pause & exit /b 1)
call npm run build || (echo Build failed. The last ready dist was preserved.& pause & exit /b 1)
node tools\dev-server.mjs --open=runtime
if errorlevel 1 (pause & exit /b 1)
