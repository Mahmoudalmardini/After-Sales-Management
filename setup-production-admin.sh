#!/bin/bash

# Production Admin User Setup Script
# This script ensures the admin user exists in production

echo "🔧 Setting up admin user in production..."

# Production URL
PROD_URL="https://after-sales-management-production.up.railway.app"

echo "📡 Testing production API connectivity..."
if curl -s -f "$PROD_URL/api/health" > /dev/null; then
    echo "✅ Production API is accessible"
else
    echo "❌ Production API is not accessible"
    exit 1
fi

echo "🔑 Restoring admin user in production..."
RESTORE_RESPONSE=$(curl -s -X POST "$PROD_URL/api/auth/restore-admin")

if echo "$RESTORE_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Admin user restored successfully"
    echo "📋 Admin credentials:"
    echo "   Username: admin"
    echo "   Password: admin123"
    echo "   Role: COMPANY_MANAGER"
else
    echo "❌ Failed to restore admin user"
    echo "Response: $RESTORE_RESPONSE"
    exit 1
fi

echo "🧪 Testing admin login..."
LOGIN_RESPONSE=$(curl -s -X POST "$PROD_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q "success.*true"; then
    echo "✅ Admin login test successful"
    echo "🎉 Production admin user is ready!"
else
    echo "❌ Admin login test failed"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "🚀 Production setup complete!"
echo "🌐 You can now login at: $PROD_URL/login"
