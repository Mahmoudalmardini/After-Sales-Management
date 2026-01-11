# After-Sales Service Management System - Technical Documentation

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [API Architecture](#api-architecture)
5. [Authentication & Authorization](#authentication--authorization)
6. [Deployment Architecture](#deployment-architecture)
7. [Configuration Management](#configuration-management)
8. [Database Management](#database-management)
9. [Troubleshooting](#troubleshooting)

---

## System Architecture

### Overview
The After-Sales Service Management System is a full-stack web application designed to automate and manage after-sales service requests from registration to closure. The system follows a three-tier architecture:

```
┌─────────────────┐
│   Frontend      │  React SPA (Port 3000/80)
│   (React)       │
└────────┬────────┘
         │ HTTP/REST API
┌────────▼────────┐
│   Backend API   │  Node.js/Express (Port 3001)
│   (Express)     │
└────────┬────────┘
         │ Prisma ORM
┌────────▼────────┐
│   Database      │  PostgreSQL 15
│   (PostgreSQL)  │
└─────────────────┘
```

### Components

#### 1. Frontend Application
- **Location**: `/frontend`
- **Framework**: React 18 with TypeScript
- **Build Tool**: Create React App (react-scripts)
- **State Management**: React Context API + React Query
- **Routing**: React Router v6
- **Styling**: TailwindCSS
- **Port**: 3000 (development), 80 (production via Nginx)

#### 2. Backend API Server
- **Location**: `/backend`
- **Framework**: Express.js with TypeScript
- **ORM**: Prisma Client
- **Port**: 3001
- **Entry Point**: `backend/src/index.ts`

#### 3. Database
- **Type**: PostgreSQL 15
- **ORM**: Prisma ORM
- **Schema Location**: `backend/prisma/schema.prisma`
- **Migrations**: `backend/prisma/migrations/`

---

## Technology Stack

### Backend Technologies

#### Core
- **Node.js**: Runtime environment
- **TypeScript**: Type-safe programming
- **Express.js**: Web framework
- **Prisma**: Modern ORM for database access
- **PostgreSQL**: Relational database

#### Security & Authentication
- **JWT (jsonwebtoken)**: Token-based authentication
- **bcryptjs**: Password hashing (12 salt rounds)
- **helmet**: HTTP security headers
- **express-rate-limit**: Rate limiting (1000 req/15min)

#### Validation & Error Handling
- **Joi**: Input validation
- **Winston**: Logging system
- **Custom error handlers**: Standardized error responses

#### Utilities
- **dotenv**: Environment variable management
- **morgan**: HTTP request logging
- **multer**: File upload handling
- **exceljs**: Excel file generation/parsing
- **nodemailer**: Email notifications (optional)

### Frontend Technologies

#### Core
- **React 18**: UI framework
- **TypeScript**: Type safety
- **React Router v6**: Client-side routing

#### State & Data
- **React Context API**: Global state (Auth, i18n)
- **React Query (@tanstack/react-query)**: Server state management
- **React Hook Form**: Form handling

#### UI Components
- **TailwindCSS**: Utility-first CSS framework
- **Headless UI**: Accessible component primitives
- **Heroicons**: Icon library

#### Utilities
- **axios**: HTTP client
- **date-fns**: Date manipulation
- **recharts**: Data visualization
- **react-toastify**: Toast notifications

---

## Database Schema

### Overview
The database uses PostgreSQL 15 with Prisma ORM. The schema defines 16 main tables with proper relationships, indexes, and constraints.

### Key Tables

#### Core Entities

1. **users** (`users`)
   - User accounts and authentication
   - Fields: id, username (unique), email (unique), passwordHash, firstName, lastName, role, departmentId, isActive
   - Roles: COMPANY_MANAGER, DEPUTY_MANAGER, DEPARTMENT_MANAGER, SECTION_SUPERVISOR, TECHNICIAN

2. **departments** (`departments`)
   - Organizational departments
   - Fields: id, name (unique), description, managerId
   - Default: LG Maintenance, Solar Energy, TP-Link, Epson

3. **customers** (`customers`)
   - Customer information
   - Fields: id, name, phone, email, address, city

4. **products** (`products`)
   - Product catalog
   - Fields: id, name, model, serialNumber (unique), category, departmentId

#### Request Management

5. **requests** (`requests`)
   - Service requests (main entity)
   - Fields: requestNumber (unique), customerId, productId, departmentId, status, warrantyStatus, executionMethod, SLA tracking fields
   - Statuses: NEW, ASSIGNED, UNDER_INSPECTION, IN_REPAIR, COMPLETED, CLOSED
   - Relationships: customer, product, department, assignedTechnician, receivedBy

6. **request_activities** (`request_activities`)
   - Audit trail for requests
   - Fields: requestId, userId, activityType, description, oldValue, newValue
   - Cascade delete on request deletion

7. **request_costs** (`request_costs`)
   - Cost tracking for requests
   - Fields: requestId, description, amount, costType, currency, addedById

#### Inventory Management

8. **spare_parts** (`spare_parts`)
   - Spare parts inventory
   - Fields: id, name, partNumber (unique), presentPieces, quantity, minQuantity, unitPrice, currency, departmentId

9. **request_parts** (`request_parts`)
   - Spare parts used in requests
   - Fields: requestId, sparePartId, quantityUsed, unitPrice, totalCost

10. **spare_part_history** (`spare_part_history`)
    - Inventory change history
    - Fields: sparePartId, changedById, changeType, quantityChange, oldValue, newValue

#### Additional Tables

11. **notifications** (`notifications`)
    - User notifications
    - Fields: userId, requestId, title, message, type, isRead

12. **custom_request_statuses** (`custom_request_statuses`)
    - Custom status definitions
    - Fields: name (unique), displayName, description, isActive, sortOrder

13. **technician_reports** (`technician_reports`)
    - Technician progress reports
    - Fields: requestId, technicianId, reportContent, currentStatus, isApproved

14. **spare_part_requests** (`spare_part_requests`)
    - Spare part requests from technicians
    - Fields: requestId, technicianId, partName, quantity, status (PENDING/APPROVED/REJECTED/FULFILLED)

### Database Relationships

- **User ↔ Department**: Many-to-One (users.departmentId → departments.id)
- **Department ↔ Manager**: One-to-One (departments.managerId → users.id)
- **Request ↔ Customer**: Many-to-One (requests.customerId → customers.id)
- **Request ↔ Product**: Many-to-One (requests.productId → products.id)
- **Request ↔ Department**: Many-to-One (requests.departmentId → departments.id)
- **Request ↔ Technician**: Many-to-One (requests.assignedTechnicianId → users.id)
- **Activity ↔ Request**: Many-to-One with CASCADE DELETE
- **SparePart ↔ RequestPart**: One-to-Many
- **RequestPart ↔ Request**: Many-to-One with CASCADE DELETE

### Indexes
The database includes indexes on:
- Foreign keys (for join performance)
- Status fields (for filtering)
- Timestamps (for sorting)
- Unique constraints (username, email, requestNumber, partNumber)

---

## API Architecture

### Base URL
- Development: `http://localhost:3001/api`
- Production: `https://your-domain.com/api`

### Authentication
All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### API Endpoints

#### Authentication (`/api/auth`)
- `POST /api/auth/login` - User login (public)
- `GET /api/auth/profile` - Get current user profile (protected)
- `PUT /api/auth/profile` - Update user profile (protected)
- `PUT /api/auth/change-password` - Change password (protected)
- `GET /api/auth/verify` - Verify token validity (protected)
- `POST /api/auth/logout` - Logout (protected)
- `GET /api/auth/notifications` - Get user notifications (protected)

#### Users (`/api/users`)
- `GET /api/users` - List all users (COMPANY_MANAGER only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user (COMPANY_MANAGER only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (COMPANY_MANAGER only)

#### Requests (`/api/requests`)
- `GET /api/requests` - List requests (with filters)
- `GET /api/requests/:id` - Get request details
- `POST /api/requests` - Create new request
- `PUT /api/requests/:id` - Update request
- `PUT /api/requests/:id/assign` - Assign technician
- `PUT /api/requests/:id/status` - Update request status
- `DELETE /api/requests/:id` - Delete request (COMPANY_MANAGER only)

#### Dashboard (`/api/dashboard`)
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/requests` - Request summaries
- `GET /api/dashboard/overdue` - Overdue requests

### Response Format

#### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": {
    "field": ["Error message"]
  }
}
```

### Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (duplicate)
- `500` - Internal Server Error
- `503` - Service Unavailable (database connection issues)

---

## Authentication & Authorization

### JWT Token Structure
```typescript
{
  id: number,           // User ID
  username: string,     // Username
  email: string,        // Email
  role: UserRole,       // User role
  departmentId?: number // Department ID (optional)
}
```

### Token Configuration
- **Secret**: Set via `JWT_SECRET` environment variable
- **Expiration**: 7 days (configurable via `JWT_EXPIRES_IN`)
- **Algorithm**: HS256

### User Roles & Permissions

1. **COMPANY_MANAGER**
   - Full system access
   - User management
   - System configuration
   - All department access

2. **DEPUTY_MANAGER**
   - Full access except some admin functions
   - User management (limited)
   - All department access

3. **DEPARTMENT_MANAGER**
   - Department-specific access
   - Manage department requests
   - Assign technicians
   - View department reports

4. **SECTION_SUPERVISOR**
   - Assign technicians
   - Manage assigned requests
   - Update request status
   - View department requests

5. **TECHNICIAN**
   - Update assigned requests
   - Add progress notes
   - Submit technician reports
   - Request spare parts

### Password Security
- Hashing: bcrypt with 12 salt rounds
- Minimum length: 6 characters (configurable)
- Storage: Hashed passwords only (never plain text)

### Default Admin User
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: COMPANY_MANAGER
- **Auto-creation**: Created automatically on server startup if not exists

---

## Deployment Architecture

### Development Setup
```
┌─────────────────────────────────────┐
│  Development Environment            │
│                                     │
│  Frontend: localhost:3000          │
│  Backend:  localhost:3001          │
│  Database: PostgreSQL (localhost)  │
└─────────────────────────────────────┘
```

### Production Setup (Linux VM)

#### Option 1: Docker Compose (Recommended)
```
┌─────────────────────────────────────┐
│  Docker Compose                     │
│                                     │
│  ┌──────────┐  ┌──────────┐       │
│  │ Frontend │  │ Backend  │       │
│  │ (Nginx)  │─▶│ (Node.js)│       │
│  │ Port 80  │  │ Port 3001│       │
│  └──────────┘  └────┬─────┘       │
│                     │              │
│                  ┌──▼──────┐       │
│                  │PostgreSQL│      │
│                  │ Port 5432│      │
│                  └─────────┘       │
└─────────────────────────────────────┘
```

#### Option 2: Standalone Services
- **Frontend**: Built static files served by Nginx
- **Backend**: Node.js process (PM2/systemd)
- **Database**: PostgreSQL service

### Deployment Files

#### Docker Configuration
- `docker-compose.yml` - Development Docker setup
- `docker-compose.prod.yml` - Production Docker setup
- `backend/Dockerfile` - Backend container
- `frontend/Dockerfile` - Frontend container
- `frontend/nginx.conf` - Nginx configuration

#### Deployment Scripts
- `deploy-production.sh` / `deploy-production.bat` - Full deployment
- `backend/deploy.sh` - Backend deployment
- `backend/scripts/start-production.js` - Production startup script

---

## Configuration Management

### Environment Variables

#### Required Variables
```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database?schema=public

# JWT
JWT_SECRET=your-secret-key-min-32-characters
JWT_EXPIRES_IN=7d

# Server
NODE_ENV=production
PORT=3001

# CORS
CORS_ORIGIN=https://your-frontend-domain.com
```

#### Optional Variables
```env
# Logging
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# SLA Configuration (hours)
SLA_UNDER_WARRANTY=168
SLA_OUT_OF_WARRANTY=240
SLA_ONSITE_BUFFER=48

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Configuration Files
- `backend/env.example` - Development template
- `backend/env.production.example` - Production template
- `backend/src/config/config.ts` - Configuration loader

### Database Connection String Format
```
postgresql://[user]:[password]@[host]:[port]/[database]?schema=public
```

Examples:
- Local: `postgresql://postgres:password@localhost:5432/after_sales_db`
- Docker: `postgresql://user:pass@postgres:5432/after_sales_db`
- Cloud: `postgresql://user:pass@host.com:5432/db?sslmode=require`

---

## Database Management

### Schema Management

#### Prisma Commands
```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (development)
npx prisma db push

# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset
```

### Database Seeding

#### Seed Script
Location: `backend/prisma/seed.ts`

The seed script creates:
- 4 Departments (LG Maintenance, Solar Energy, TP-Link, Epson)
- 9 Users (1 admin, 1 deputy, 2 managers, 2 supervisors, 4 technicians)
- 5 Sample Customers
- 6 Sample Products
- 15 Sample Requests

#### Run Seeding
```bash
# Development
npx prisma db seed

# Or directly
npx ts-node backend/prisma/seed.ts
```

**⚠️ Warning**: Seeding will fail if data already exists (unique constraints).

### Database Initialization Scripts

1. **Setup Production DB** (`backend/scripts/setup-production-db.js`)
   - Creates admin user if not exists
   - Creates default department

2. **Empty Database** (`backend/scripts/empty-database.js`)
   - Removes all data but keeps schema
   - Useful for clearing dummy/test data

### Backup & Restore

#### Backup Script
```bash
bash backend/scripts/backup-database.sh
```

#### Restore Script
```bash
bash backend/scripts/restore-database.sh <backup_file>
```

### Database Maintenance

#### Clear All Data (Empty Database)
See `backend/scripts/empty-database.js` for script to remove all data while preserving schema structure.

#### Reset Database (Development Only)
```bash
npx prisma migrate reset --force
```

---

## Troubleshooting

### Common Issues

#### 1. Login Internal Error on Linux VM

**Symptoms**: Login returns 500 Internal Server Error

**Possible Causes**:
1. Database connection failure
2. Missing environment variables
3. JWT_SECRET not set
4. CORS configuration issue
5. Database schema not initialized

**Solutions**:
1. **Check Database Connection**:
   ```bash
   # Test database connection
   psql $DATABASE_URL
   
   # Or check environment variable
   echo $DATABASE_URL
   ```

2. **Verify Environment Variables**:
   ```bash
   # Check all required variables are set
   env | grep -E "DATABASE_URL|JWT_SECRET|NODE_ENV|PORT"
   ```

3. **Check Server Logs**:
   ```bash
   # View application logs
   tail -f backend/logs/*.log
   
   # Or if using PM2
   pm2 logs
   
   # Or if using systemd
   journalctl -u your-service-name -f
   ```

4. **Verify Database Schema**:
   ```bash
   cd backend
   npx prisma db push
   npx prisma generate
   ```

5. **Ensure Admin User Exists**:
   ```bash
   # The server automatically creates admin user on startup
   # Or manually run:
   node backend/scripts/setup-production-db.js
   ```

#### 2. Database Connection Errors

**Error**: `Can't reach database server`

**Solutions**:
- Verify `DATABASE_URL` is correct
- Check PostgreSQL service is running: `systemctl status postgresql`
- Verify network connectivity and firewall rules
- Check PostgreSQL is listening: `netstat -tlnp | grep 5432`
- Verify credentials in connection string

#### 3. CORS Errors

**Error**: `Not allowed by CORS`

**Solutions**:
- Set `CORS_ORIGIN` to match your frontend URL
- For multiple origins, update CORS whitelist in `backend/src/index.ts`
- Ensure protocol matches (http vs https)

#### 4. JWT Token Errors

**Error**: `Invalid token` or `Unauthorized`

**Solutions**:
- Verify `JWT_SECRET` is set and consistent
- Check token expiration (default: 7 days)
- Ensure token is sent in Authorization header: `Bearer <token>`

#### 5. Seed Data Issues

**Error**: Seed script fails with unique constraint errors

**Solution**: Database already has data. Use empty-database script first:
```bash
node backend/scripts/empty-database.js
npx prisma db seed
```

### Debugging Commands

#### Check Application Status
```bash
# Check if backend is running
curl http://localhost:3001/health

# Check database connection
cd backend
npx prisma db execute --stdin <<< "SELECT 1"
```

#### View Database Contents
```bash
# Connect to database
psql $DATABASE_URL

# List tables
\dt

# Check users
SELECT id, username, email, role FROM users;

# Check if admin exists
SELECT * FROM users WHERE username = 'admin';
```

#### Check Environment
```bash
# Print all environment variables (be careful with secrets)
env

# Check Node.js version
node --version

# Check npm version
npm --version

# Check PostgreSQL version
psql --version
```

---

## Security Considerations

### Production Checklist

- [ ] Change default `JWT_SECRET` to a strong random string (min 32 characters)
- [ ] Change default admin password after first login
- [ ] Use HTTPS in production
- [ ] Set proper CORS origins (no wildcards)
- [ ] Enable rate limiting (default: 1000 req/15min)
- [ ] Use strong database passwords
- [ ] Keep dependencies updated
- [ ] Enable database SSL if using cloud database
- [ ] Configure firewall rules
- [ ] Set up log monitoring
- [ ] Use environment variables (never commit secrets)
- [ ] Regular database backups

### Security Features

- Password hashing with bcrypt (12 rounds)
- JWT token-based authentication
- Role-based access control (RBAC)
- Input validation with Joi
- SQL injection prevention (Prisma ORM)
- XSS protection (helmet.js)
- Rate limiting
- CORS configuration

---

## Performance Considerations

### Database Optimization
- Indexes on foreign keys and frequently queried fields
- Connection pooling (Prisma handles this)
- Query optimization through Prisma queries

### API Optimization
- Rate limiting to prevent abuse
- Response caching (consider adding Redis for production)
- Pagination on list endpoints

### Frontend Optimization
- Code splitting (React lazy loading)
- Production build optimization
- Static asset caching via Nginx

---

## Development Workflow

### Local Development Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd After_Saels_System
   ```

2. **Install Dependencies**
   ```bash
   # Backend
   cd backend
   npm install
   
   # Frontend
   cd ../frontend
   npm install
   ```

3. **Setup Database**
   ```bash
   # Start PostgreSQL (Docker)
   docker-compose up -d postgres
   
   # Or use existing PostgreSQL
   # Set DATABASE_URL in .env file
   
   # Initialize database
   cd backend
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm run dev
   
   # Terminal 2: Frontend
   cd frontend
   npm start
   ```

5. **Access Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api
   - Health Check: http://localhost:3001/health

### Production Deployment (Linux VM)

1. **Prerequisites**
   - Node.js 18+ installed
   - PostgreSQL 15+ installed and running
   - Nginx installed (for frontend)

2. **Setup Environment**
   ```bash
   # Copy environment template
   cp backend/env.production.example backend/.env
   
   # Edit .env with production values
   nano backend/.env
   ```

3. **Build Application**
   ```bash
   # Build backend
   cd backend
   npm install
   npm run build
   
   # Build frontend
   cd ../frontend
   npm install
   npm run build
   ```

4. **Setup Database**
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate deploy
   # Don't run seed in production (only for fresh install)
   ```

5. **Start Application**
   ```bash
   # Using PM2 (recommended)
   pm2 start backend/dist/index.js --name after-sales-api
   
   # Or using systemd
   # Create service file and enable it
   ```

6. **Configure Nginx**
   - Serve frontend build files
   - Proxy API requests to backend (port 3001)

---

## File Structure

```
After_Saels_System/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # Route definitions
│   │   ├── services/        # Business logic
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utilities
│   │   └── index.ts         # Application entry point
│   ├── prisma/
│   │   ├── migrations/      # Database migrations
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Seed data script
│   ├── scripts/             # Utility scripts
│   ├── logs/                # Application logs
│   ├── uploads/             # Uploaded files
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── types/           # TypeScript types
│   │   └── utils/           # Utilities
│   ├── public/              # Static files
│   └── package.json
├── database/
│   ├── init.sql             # Database initialization SQL
│   └── schema.sql           # Schema documentation
└── docker-compose.yml       # Docker configuration
```

---

## Additional Resources

- **Prisma Docs**: https://www.prisma.io/docs
- **Express.js Docs**: https://expressjs.com
- **React Docs**: https://react.dev
- **PostgreSQL Docs**: https://www.postgresql.org/docs

---

**Last Updated**: 2024
**Version**: 1.0.0

