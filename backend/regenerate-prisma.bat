@echo off
echo ========================================
echo Regenerating Prisma Client
echo ========================================
echo.

echo Stopping all Node processes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 3 /nobreak >nul

echo.
echo Cleaning old Prisma client...
if exist "node_modules\.prisma" (
    rmdir /s /q "node_modules\.prisma" 2>nul
)
timeout /t 2 /nobreak >nul

echo.
echo Generating new Prisma client...
call npx prisma generate

echo.
echo ========================================
echo Done! You can now restart your server.
echo ========================================
echo.
echo Press any key to exit...
pause >nul
