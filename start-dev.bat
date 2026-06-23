@echo off
echo Stopping existing Node processes...
taskkill /F /IM node.exe >nul 2>&1
ping -n 4 127.0.0.1 >nul

echo Starting Backend on port 4000...
start "HR-BACKEND :4000" cmd /k "cd /d ""%~dp0backend"" && npm run dev"

echo Waiting for backend to boot...
ping -n 7 127.0.0.1 >nul

echo Starting Frontend on port 3000...
start "HR-FRONTEND :3000" cmd /k "cd /d ""%~dp0frontend"" && npx next dev"

echo.
echo =============================================
echo  HR System is starting!
echo  Backend  ^> http://localhost:4000  (Supabase mode)
echo  Frontend ^> http://localhost:3000
echo =============================================
echo  Look for 2 new terminal windows on taskbar
echo  Wait 15 seconds then open localhost:3000
echo =============================================
