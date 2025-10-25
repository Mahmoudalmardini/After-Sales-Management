# Production Deployment Guide

## Admin User Setup

The system now automatically ensures that an admin user exists on every server startup. This guarantees that you can always log in to the system in production.

### Admin Credentials
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Company Manager (Full Access)

### How It Works

1. **Automatic Creation**: When the server starts, it automatically checks if an admin user exists
2. **Smart Detection**: If the admin user already exists, it logs a confirmation message
3. **Auto-Creation**: If no admin user exists, it creates one with the default credentials
4. **Production Ready**: This works in both development and production environments

## Deployment Steps

### Option 1: Using the Deployment Script (Recommended)

#### For Linux/Mac:
```bash
chmod +x deploy-production.sh
./deploy-production.sh
```

#### For Windows:
```cmd
deploy-production.bat
```

### Option 2: Manual Deployment

1. **Build Backend**:
   ```bash
   cd backend
   npm run build
   ```

2. **Build Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

3. **Copy Frontend to Backend**:
   ```bash
   cp -r frontend/build/* backend/dist/public/
   ```

4. **Start Server**:
   ```bash
   cd backend
   NODE_ENV=production npm start
   ```

## Production Environment Variables

Make sure these environment variables are set in production:

```env
NODE_ENV=production
DATABASE_URL=your_production_database_url
JWT_SECRET=your_secure_jwt_secret
PORT=3001
```

## Verification

After deployment, you can verify the admin user exists by:

1. **Login Test**: Try logging in with `admin` / `admin123`
2. **API Test**: Call the restore-admin endpoint if needed:
   ```bash
   curl -X POST https://your-domain.com/api/auth/restore-admin
   ```

## Security Notes

- The admin user is created with a secure password hash
- The password `admin123` is hashed using bcrypt with 12 salt rounds
- The admin user has full system access (COMPANY_MANAGER role)
- Consider changing the password after first login in production

## Troubleshooting

If you still can't log in:

1. **Check Server Logs**: Look for admin user creation messages
2. **Database Connection**: Ensure the database is accessible
3. **Environment Variables**: Verify all required environment variables are set
4. **Manual Restore**: Use the restore-admin endpoint as a fallback

## Support

The system is now production-ready with automatic admin user management. The admin user will always be available for system access.
