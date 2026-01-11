-- After-Sales Management System Database Initialization Script
-- PostgreSQL 15 Compatible
-- This script creates all tables, indexes, and constraints for the system
-- Column names match Prisma schema (camelCase)

-- ============================================
-- Create Tables
-- ============================================

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    "managerId" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT departments_managerId_fkey FOREIGN KEY ("managerId") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "firstName" VARCHAR(255) NOT NULL,
    "lastName" VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL,
    "departmentId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "preferredCurrency" VARCHAR(10) NOT NULL DEFAULT 'SYP',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_departmentId_fkey FOREIGN KEY ("departmentId") REFERENCES departments(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    address TEXT NOT NULL,
    city VARCHAR(100),
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    "serialNumber" VARCHAR(255) UNIQUE,
    category VARCHAR(100) NOT NULL,
    "departmentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT products_departmentId_fkey FOREIGN KEY ("departmentId") REFERENCES departments(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Requests Table
CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,
    "requestNumber" VARCHAR(255) NOT NULL UNIQUE,
    "customerId" INTEGER NOT NULL,
    "productId" INTEGER,
    "departmentId" INTEGER NOT NULL,
    "assignedTechnicianId" INTEGER,
    "receivedById" INTEGER NOT NULL,
    "issueDescription" TEXT NOT NULL,
    "executionMethod" VARCHAR(50) NOT NULL,
    "warrantyStatus" VARCHAR(50) NOT NULL,
    "purchaseDate" TIMESTAMP,
    "serialNumber" VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'NEW',
    priority VARCHAR(50) NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" TIMESTAMP,
    "startedAt" TIMESTAMP,
    "completedAt" TIMESTAMP,
    "closedAt" TIMESTAMP,
    "slaDueDate" TIMESTAMP,
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "finalNotes" TEXT,
    "customerSatisfaction" INTEGER,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT requests_customerId_fkey FOREIGN KEY ("customerId") REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT requests_productId_fkey FOREIGN KEY ("productId") REFERENCES products(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT requests_departmentId_fkey FOREIGN KEY ("departmentId") REFERENCES departments(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT requests_assignedTechnicianId_fkey FOREIGN KEY ("assignedTechnicianId") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT requests_receivedById_fkey FOREIGN KEY ("receivedById") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Request Activities Table
CREATE TABLE IF NOT EXISTS request_activities (
    id SERIAL PRIMARY KEY,
    "requestId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "activityType" VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT request_activities_requestId_fkey FOREIGN KEY ("requestId") REFERENCES requests(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT request_activities_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Request Costs Table
CREATE TABLE IF NOT EXISTS request_costs (
    id SERIAL PRIMARY KEY,
    "requestId" INTEGER NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    "costType" VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'SYP',
    "addedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestPartId" INTEGER,
    CONSTRAINT request_costs_requestId_fkey FOREIGN KEY ("requestId") REFERENCES requests(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT request_costs_addedById_fkey FOREIGN KEY ("addedById") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "requestId" INTEGER,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER,
    CONSTRAINT notifications_userId_fkey FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT notifications_requestId_fkey FOREIGN KEY ("requestId") REFERENCES requests(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT notifications_createdById_fkey FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Spare Parts Table
CREATE TABLE IF NOT EXISTS spare_parts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    "partNumber" VARCHAR(255) NOT NULL UNIQUE,
    "presentPieces" INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 5,
    "unitPrice" DECIMAL(10, 2) NOT NULL DEFAULT 0.0,
    currency VARCHAR(10) NOT NULL DEFAULT 'SYP',
    supplier VARCHAR(255),
    location VARCHAR(255),
    description TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "departmentId" INTEGER,
    CONSTRAINT spare_parts_departmentId_fkey FOREIGN KEY ("departmentId") REFERENCES departments(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Request Parts Table
CREATE TABLE IF NOT EXISTS request_parts (
    id SERIAL PRIMARY KEY,
    "requestId" INTEGER NOT NULL,
    "sparePartId" INTEGER NOT NULL,
    "quantityUsed" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10, 2) NOT NULL,
    "totalCost" DECIMAL(10, 2) NOT NULL,
    "addedById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT request_parts_requestId_fkey FOREIGN KEY ("requestId") REFERENCES requests(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT request_parts_sparePartId_fkey FOREIGN KEY ("sparePartId") REFERENCES spare_parts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT request_parts_addedById_fkey FOREIGN KEY ("addedById") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Custom Request Statuses Table
CREATE TABLE IF NOT EXISTS custom_request_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    "displayName" VARCHAR(255) NOT NULL,
    description TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT custom_request_statuses_createdById_fkey FOREIGN KEY ("createdById") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Spare Part History Table
CREATE TABLE IF NOT EXISTS spare_part_history (
    id SERIAL PRIMARY KEY,
    "sparePartId" INTEGER NOT NULL,
    "changedById" INTEGER NOT NULL,
    "changeType" VARCHAR(50) NOT NULL,
    "fieldChanged" VARCHAR(100),
    "oldValue" TEXT,
    "newValue" TEXT,
    "quantityChange" INTEGER,
    description TEXT,
    "requestId" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT spare_part_history_sparePartId_fkey FOREIGN KEY ("sparePartId") REFERENCES spare_parts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT spare_part_history_changedById_fkey FOREIGN KEY ("changedById") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Technician Reports Table
CREATE TABLE IF NOT EXISTS technician_reports (
    id SERIAL PRIMARY KEY,
    "requestId" INTEGER NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "reportContent" TEXT NOT NULL,
    "currentStatus" VARCHAR(50),
    "partsUsed" TEXT,
    "sendToSupervisor" BOOLEAN NOT NULL DEFAULT false,
    "sendToAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN,
    "approvedById" INTEGER,
    "approvalComment" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT technician_reports_requestId_fkey FOREIGN KEY ("requestId") REFERENCES requests(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT technician_reports_technicianId_fkey FOREIGN KEY ("technicianId") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT technician_reports_approvedById_fkey FOREIGN KEY ("approvedById") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Spare Part Requests Table
CREATE TABLE IF NOT EXISTS spare_part_requests (
    id SERIAL PRIMARY KEY,
    "requestId" INTEGER NOT NULL,
    "technicianId" INTEGER NOT NULL,
    "partName" VARCHAR(255) NOT NULL,
    "partNumber" VARCHAR(255),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    urgency VARCHAR(50) NOT NULL DEFAULT 'NORMAL',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "approvedById" INTEGER,
    "fulfilledById" INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT spare_part_requests_requestId_fkey FOREIGN KEY ("requestId") REFERENCES requests(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT spare_part_requests_technicianId_fkey FOREIGN KEY ("technicianId") REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT spare_part_requests_approvedById_fkey FOREIGN KEY ("approvedById") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT spare_part_requests_fulfilledById_fkey FOREIGN KEY ("fulfilledById") REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- ============================================
-- Create Indexes for Performance
-- ============================================

-- Indexes on foreign keys for faster joins
CREATE INDEX IF NOT EXISTS idx_users_departmentId ON users("departmentId");
CREATE INDEX IF NOT EXISTS idx_products_departmentId ON products("departmentId");
CREATE INDEX IF NOT EXISTS idx_requests_customerId ON requests("customerId");
CREATE INDEX IF NOT EXISTS idx_requests_productId ON requests("productId");
CREATE INDEX IF NOT EXISTS idx_requests_departmentId ON requests("departmentId");
CREATE INDEX IF NOT EXISTS idx_requests_assignedTechnicianId ON requests("assignedTechnicianId");
CREATE INDEX IF NOT EXISTS idx_requests_receivedById ON requests("receivedById");
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_createdAt ON requests("createdAt");
CREATE INDEX IF NOT EXISTS idx_request_activities_requestId ON request_activities("requestId");
CREATE INDEX IF NOT EXISTS idx_request_activities_userId ON request_activities("userId");
CREATE INDEX IF NOT EXISTS idx_request_costs_requestId ON request_costs("requestId");
CREATE INDEX IF NOT EXISTS idx_notifications_userId ON notifications("userId");
CREATE INDEX IF NOT EXISTS idx_notifications_requestId ON notifications("requestId");
CREATE INDEX IF NOT EXISTS idx_notifications_isRead ON notifications("isRead");
CREATE INDEX IF NOT EXISTS idx_spare_parts_departmentId ON spare_parts("departmentId");
CREATE INDEX IF NOT EXISTS idx_request_parts_requestId ON request_parts("requestId");
CREATE INDEX IF NOT EXISTS idx_request_parts_sparePartId ON request_parts("sparePartId");
CREATE INDEX IF NOT EXISTS idx_spare_part_history_sparePartId ON spare_part_history("sparePartId");
CREATE INDEX IF NOT EXISTS idx_technician_reports_requestId ON technician_reports("requestId");
CREATE INDEX IF NOT EXISTS idx_technician_reports_technicianId ON technician_reports("technicianId");
CREATE INDEX IF NOT EXISTS idx_spare_part_requests_requestId ON spare_part_requests("requestId");
CREATE INDEX IF NOT EXISTS idx_spare_part_requests_technicianId ON spare_part_requests("technicianId");
CREATE INDEX IF NOT EXISTS idx_spare_part_requests_status ON spare_part_requests(status);

-- ============================================
-- Create Function for Auto-updating updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating updatedAt
CREATE TRIGGER update_users_updatedAt BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updatedAt BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spare_parts_updatedAt BEFORE UPDATE ON spare_parts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_custom_request_statuses_updatedAt BEFORE UPDATE ON custom_request_statuses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_technician_reports_updatedAt BEFORE UPDATE ON technician_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spare_part_requests_updatedAt BEFORE UPDATE ON spare_part_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updatedAt BEFORE UPDATE ON requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Initial Setup Complete
-- ============================================

-- Note: This script creates the database structure.
-- To seed initial data (admin user, departments, etc.), run:
-- npx prisma db seed
-- or use the setup scripts in backend/scripts/
