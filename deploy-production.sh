#!/bin/bash

# Production Deployment Script for After-Sales Management System
# This script ensures the admin user exists in production

echo "🚀 Starting After-Sales Management System Deployment..."

# Set production environment
export NODE_ENV=production

# Build the backend
echo "📦 Building backend..."
cd backend
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Backend build failed!"
    exit 1
fi

echo "✅ Backend built successfully"

# Build the frontend
echo "📦 Building frontend..."
cd ../frontend
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

echo "✅ Frontend built successfully"

# Copy frontend build to backend public directory
echo "📁 Copying frontend build to backend..."
cp -r build/* ../backend/dist/public/

echo "✅ Frontend copied to backend"

# Start the server
echo "🚀 Starting server..."
cd ../backend

# The server will automatically ensure admin user exists on startup
npm start

echo "✅ Server started successfully"
echo "🔑 Admin credentials:"
echo "   Username: admin"
echo "   Password: admin123"
echo "   Role: Company Manager (Full Access)"
