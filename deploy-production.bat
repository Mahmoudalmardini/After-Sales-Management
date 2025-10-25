@echo off
REM Production Deployment Script for After-Sales Management System
REM This script ensures the admin user exists in production

echo 🚀 Starting After-Sales Management System Deployment...

REM Set production environment
set NODE_ENV=production

REM Build the backend
echo 📦 Building backend...
cd backend
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Backend build failed!
    exit /b 1
)

echo ✅ Backend built successfully

REM Build the frontend
echo 📦 Building frontend...
cd ..\frontend
call npm run build

if %errorlevel% neq 0 (
    echo ❌ Frontend build failed!
    exit /b 1
)

echo ✅ Frontend built successfully

REM Copy frontend build to backend public directory
echo 📁 Copying frontend build to backend...
xcopy /E /I /Y build ..\backend\dist\public\

echo ✅ Frontend copied to backend

REM Start the server
echo 🚀 Starting server...
cd ..\backend

REM The server will automatically ensure admin user exists on startup
call npm start

echo ✅ Server started successfully
echo 🔑 Admin credentials:
echo    Username: admin
echo    Password: admin123
echo    Role: Company Manager (Full Access)
