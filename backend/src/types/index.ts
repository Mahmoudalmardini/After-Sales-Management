import { Request } from 'express';

// Define enums as TypeScript types (since SQLite doesn't support enums)
export enum UserRole {
  COMPANY_MANAGER = 'COMPANY_MANAGER',
  DEPUTY_MANAGER = 'DEPUTY_MANAGER',
  DEPARTMENT_MANAGER = 'DEPARTMENT_MANAGER',
  SECTION_SUPERVISOR = 'SECTION_SUPERVISOR',
  TECHNICIAN = 'TECHNICIAN',
  WAREHOUSE_KEEPER = 'WAREHOUSE_KEEPER'
}

export enum RequestStatus {
  NEW = 'NEW',
  ASSIGNED = 'ASSIGNED',
  UNDER_INSPECTION = 'UNDER_INSPECTION',
  WAITING_PARTS = 'WAITING_PARTS',
  IN_REPAIR = 'IN_REPAIR',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED'
}

export enum RequestPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum WarrantyStatus {
  UNDER_WARRANTY = 'UNDER_WARRANTY',
  OUT_OF_WARRANTY = 'OUT_OF_WARRANTY'
}

export enum ExecutionMethod {
  ON_SITE = 'ON_SITE',
  WORKSHOP = 'WORKSHOP'
}

export enum CostType {
  PARTS = 'PARTS',
  LABOR = 'LABOR',
  TRANSPORTATION = 'TRANSPORTATION',
  OTHER = 'OTHER'
}

export enum ActivityType {
  STATUS_CHANGE = 'STATUS_CHANGE',
  ASSIGNMENT = 'ASSIGNMENT',
  COMMENT = 'COMMENT',
  COST_ADDED = 'COST_ADDED',
  CREATED = 'CREATED',
  UPDATED = 'UPDATED'
}

export enum NotificationType {
  ASSIGNMENT = 'ASSIGNMENT',
  OVERDUE = 'OVERDUE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  COMPLETION = 'COMPLETION',
  READ_RECEIPT = 'READ_RECEIPT',
  WAREHOUSE_UPDATE = 'WAREHOUSE_UPDATE',
  PRODUCT_ADDED = 'PRODUCT_ADDED',
  COST_ADDED = 'COST_ADDED'
}

// Extend Express Request type to include user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    role: UserRole;
    departmentId?: number;
  };
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

// Filter and pagination types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RequestFilters extends PaginationQuery {
  status?: string;
  priority?: string;
  departmentId?: number;
  assignedTechnicianId?: number;
  warrantyStatus?: string;
  isOverdue?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Dashboard statistics types
export interface DashboardStats {
  totalRequests: number;
  pendingRequests: number;
  overdueRequests: number;
  completedRequests: number;
  underWarranty: number;
  outOfWarranty: number;
  requestsByDepartment: Array<{
    departmentId: number;
    departmentName: string;
    count: number;
  }>;
  requestsByStatus: Array<{
    status: string;
    count: number;
  }>;
  averageResolutionTime: number;
  customerSatisfactionAverage: number;
}

// Report types
export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  departmentId?: number;
  technicianId?: number;
  status?: string;
  warrantyStatus?: string;
}

export interface PerformanceReport {
  technician: {
    id: number;
    name: string;
    department: string;
  };
  completedRequests: number;
  averageResolutionTime: number;
  customerSatisfactionAverage: number;
  overdueRequests: number;
}

// SLA types
export interface SLAConfig {
  underWarrantyHours: number;
  outOfWarrantyHours: number;
  onsiteBufferHours: number;
}

// Notification types
export interface NotificationData {
  userId: number;
  requestId?: number;
  title: string;
  message: string;
  type: NotificationType;
  createdById?: number;
}

// Error types
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

// JWT Payload type
export interface JWTPayload {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  departmentId?: number;
  iat?: number;
  exp?: number;
}
