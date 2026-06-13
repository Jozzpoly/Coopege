@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed or not in PATH.& pause & exit /b 1)
node tools\diagnostics\collect-diagnostics.mjs
if errorlevel 1 (echo Diagnostics failed.) else (echo Share coopege-diagnostics.json with the project agent.)
pause
