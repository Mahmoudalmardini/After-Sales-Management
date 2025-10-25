@echo off
REM Production Admin User Setup Script
REM This script ensures the admin user exists in production

echo 🔧 Setting up admin user in production...

REM Production URL
set PROD_URL=https://after-sales-management-production.up.railway.app

echo 📡 Testing production API connectivity...
curl -s -f "%PROD_URL%/api/health" >nul
if %errorlevel% equ 0 (
    echo ✅ Production API is accessible
) else (
    echo ❌ Production API is not accessible
    exit /b 1
)

echo 🔑 Restoring admin user in production...
curl -s -X POST "%PROD_URL%/api/auth/restore-admin" > temp_response.json

findstr /C:"success.*true" temp_response.json >nul
if %errorlevel% equ 0 (
    echo ✅ Admin user restored successfully
    echo 📋 Admin credentials:
    echo    Username: admin
    echo    Password: admin123
    echo    Role: COMPANY_MANAGER
) else (
    echo ❌ Failed to restore admin user
    type temp_response.json
    del temp_response.json
    exit /b 1
)

echo 🧪 Testing admin login...
curl -s -X POST "%PROD_URL%/api/auth/login" -H "Content-Type: application/json" -d "{\"username\":\"admin\",\"password\":\"admin123\"}" > temp_login.json

findstr /C:"success.*true" temp_login.json >nul
if %errorlevel% equ 0 (
    echo ✅ Admin login test successful
    echo 🎉 Production admin user is ready!
) else (
    echo ❌ Admin login test failed
    type temp_login.json
    del temp_response.json
    del temp_login.json
    exit /b 1
)

del temp_response.json
del temp_login.json

echo 🚀 Production setup complete!
echo 🌐 You can now login at: %PROD_URL%/login
