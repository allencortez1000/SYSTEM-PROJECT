@echo off
echo ========================================
echo  HR System - Fix Loading Issues
echo ========================================
echo.

echo [1/4] Stopping all Node processes...
taskkill /F /IM node.exe >nul 2>&1
ping -n 3 127.0.0.1 >nul

echo [2/4] Clearing frontend cache...
cd /d "%~dp0frontend"
rmdir /s /q .next 2>nul
rmdir /s /q node_modules\.cache 2>nul
del /q tsconfig.tsbuildinfo 2>nul

echo [3/4] Cache cleared successfully!
echo.
echo [4/4] Starting servers...
echo.

cd /d "%~dp0"
start "HR-BACKEND :4000" cmd /k "cd /d ""%~dp0backend"" && npm run dev"
ping -n 5 127.0.0.1 >nul

start "HR-FRONTEND :3000" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo ========================================
echo  Servers Starting!
echo ========================================
echo  Backend  : http://localhost:4000
echo  Frontend : http://localhost:3000
echo.
echo  Wait 15 seconds, then:
echo  1. Hard refresh browser (Ctrl+Shift+R)
echo  2. Or open incognito window
echo  3. If still loading, clear localStorage
echo ========================================
pause
