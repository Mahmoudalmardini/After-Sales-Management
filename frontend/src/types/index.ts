// User types
export enum UserRole {
  COMPANY_MANAGER = 'COMPANY_MANAGER',
  DEPUTY_MANAGER = 'DEPUTY_MANAGER',
  DEPARTMENT_MANAGER = 'DEPARTMENT_MANAGER',
  SECTION_SUPERVISOR = 'SECTION_SUPERVISOR',
  TECHNICIAN = 'TECHNICIAN',
  WAREHOUSE_KEEPER = 'WAREHOUSE_KEEPER'
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  department?: {
    id: number;
    name: string;
    description?: string;
  };
  isActive: boolean;
  preferredCurrency?: string;
  createdAt: string;
}

// Department types
export interface Department {
  id: number;
  name: string;
  description?: string;
  managerId?: number;
  manager?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

// Customer types
export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address: string;
  city?: string;
  createdAt: string;
  updatedAt: string;
}

// Product types
export interface Product {
  id: number;
  name: string;
  model: string;
  serialNumber?: string;
  category: string;
  departmentId: number;
  department?: Department;
  warrantyMonths: number;
  createdAt: string;
}

// Request types
export type RequestStatus = 'NEW' | 'ASSIGNED' | 'UNDER_INSPECTION' | 'WAITING_PARTS' | 'IN_REPAIR' | 'COMPLETED' | 'CLOSED';
export type RequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface CustomRequestStatus {
  id: number;
  name: string;
  displayName: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
}
export type WarrantyStatus = 'UNDER_WARRANTY' | 'OUT_OF_WARRANTY';
export type ExecutionMethod = 'ON_SITE' | 'WORKSHOP';

export interface Request {
  id: number;
  requestNumber: string;
  customerId: number;
  customer: Customer;
  productId?: number;
  product?: Product;
  departmentId: number;
  department: Department;
  assignedTechnicianId?: number;
  assignedTechnician?: {
    id: number;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
  receivedById: number;
  receivedBy: {
    id: number;
    firstName: string;
    lastName: string;
  };
  issueDescription: string;
  executionMethod: ExecutionMethod;
  warrantyStatus: WarrantyStatus;
  purchaseDate?: string;
  status: RequestStatus;
  priority: RequestPriority;
  createdAt: string;
  assignedAt?: string;
  startedAt?: string;
  completedAt?: string;
  closedAt?: string;
  slaDueDate?: string;
  isOverdue: boolean;
  finalNotes?: string;
  customerSatisfaction?: number;
  updatedAt: string;
  activities?: RequestActivity[];
  costs?: RequestCost[];
  requestParts?: RequestPart[];
  technicianReports?: TechnicianReport[];
}

// Activity types
export type ActivityType = 'STATUS_CHANGE' | 'ASSIGNMENT' | 'COMMENT' | 'COST_ADDED' | 'CREATED' | 'UPDATED';

export interface RequestActivity {
  id: number;
  requestId: number;
  userId: number;
  user: {
    id: number;
    firstName: string;
    lastName: string;
    role: UserRole;
  };
  activityType: ActivityType;
  description: string;
  oldValue?: string;
  newValue?: string;
  createdAt: string;
}

// Cost types
export type CostType = 'PARTS' | 'LABOR' | 'TRANSPORTATION' | 'OTHER';

export interface RequestCost {
  id: number;
  requestId: number;
  description: string;
  amount: number;
  costType: CostType;
  currency: string;
  addedById: number;
  addedBy: {
    id: number;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

// Notification types
export type NotificationType = 'ASSIGNMENT' | 'OVERDUE' | 'STATUS_CHANGE' | 'COMPLETION' | 'WAREHOUSE_UPDATE';

export interface Notification {
  id: number;
  userId: number;
  requestId?: number;
  request?: {
    id: number;
    requestNumber: string;
    status: RequestStatus;
  };
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
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
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface RequestFilters extends PaginationParams {
  status?: RequestStatus;
  priority?: RequestPriority;
  departmentId?: number;
  assignedTechnicianId?: number;
  warrantyStatus?: WarrantyStatus;
  isOverdue?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

// Dashboard types
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
    status: RequestStatus;
    count: number;
  }>;
  averageResolutionTime: number;
  customerSatisfactionAverage: number;
}

// Auth response types
export interface LoginResponse {
  user: User;
  token: string;
}

// Form types
export interface LoginForm {
  username: string;
  password: string;
}

export interface CreateRequestForm {
  customerId: number | string;
  productId: number | string;
  issueDescription: string;
  executionMethod: ExecutionMethod;
  warrantyStatus: WarrantyStatus;
  requestDate: string;
  priority: RequestPriority;
}

export interface CreateCustomerForm {
  name: string;
  phone: string;
  phoneType?: 'mobile' | 'home';
  email?: string;
  address: string;
  city?: string;
}

export interface CreateProductForm {
  name: string;
  model: string;
  serialNumber?: string;
  category: string;
  departmentId: number;
  warrantyMonths: number;
}

export interface CreateDepartmentForm {
  name: string;
  description?: string;
}

export interface UpdateDepartmentForm extends CreateDepartmentForm {
  id: number;
}

export interface UpdateProfileForm {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export interface ChangePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AddCostForm {
  description: string;
  amount: number;
  costType: CostType;
  currency?: string;
}

export interface CloseRequestForm {
  finalNotes?: string;
  customerSatisfaction?: number;
}

// Auth context types
export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  canAccessDepartment: (departmentId: number) => boolean;
  updateUser: (userData: User) => void;
  clearStorage?: () => void; // Optional function for debugging
}

// Utility types
export type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
export type RequiredField<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Status mapping for display
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  'NEW': 'New',
  'ASSIGNED': 'Assigned',
  'UNDER_INSPECTION': 'Under Inspection',
  'WAITING_PARTS': 'Waiting for Parts',
  'IN_REPAIR': 'In Repair',
  'COMPLETED': 'Completed',
  'CLOSED': 'Closed',
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  'LOW': 'Low',
  'NORMAL': 'Normal',
  'HIGH': 'High',
  'URGENT': 'Urgent',
};

export const WARRANTY_STATUS_LABELS: Record<WarrantyStatus, string> = {
  'UNDER_WARRANTY': 'Under Warranty',
  'OUT_OF_WARRANTY': 'Out of Warranty',
};

export const EXECUTION_METHOD_LABELS: Record<ExecutionMethod, string> = {
  'ON_SITE': 'On-site Visit',
  'WORKSHOP': 'Bring to Workshop',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  'COMPANY_MANAGER': 'Company Manager',
  'DEPUTY_MANAGER': 'Deputy Manager',
  'DEPARTMENT_MANAGER': 'Department Manager',
  'SECTION_SUPERVISOR': 'Section Supervisor',
  'TECHNICIAN': 'Technician',
  'WAREHOUSE_KEEPER': 'Warehouse Keeper',
};

// Storage types
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type Currency = 'SYP' | 'USD' | 'EUR';

export interface SparePart {
  id: number;
  name: string;
  partNumber: string; // Alphanumeric identifier (e.g., "EAU20204EX88")
  presentPieces: number; // Number of present pieces (numeric)
  unitPrice: number;
  quantity: number;
  currency: string;
  description?: string;
  departmentId?: number;
  department?: Department;
  createdAt: string;
  updatedAt: string;
  requestParts?: RequestPart[];
}

export interface RequestPart {
  id: number;
  requestId: number;
  sparePartId: number;
  sparePart: SparePart;
  quantityUsed: number;
  unitPrice: number;
  totalCost: number;
  addedById: number;
  addedBy: {
    id: number;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

// Storage form types
export interface CreateSparePartForm {
  name: string;
  partNumber: string; // Alphanumeric identifier
  presentPieces: number; // Number of present pieces
  unitPrice: number;
  quantity: number;
  currency: string;
  description?: string;
  departmentId?: number;
}

export interface UpdateSparePartForm extends CreateSparePartForm {
  id: number;
}

export interface AddPartToRequestForm {
  requestId: number;
  sparePartId: number;
  quantityUsed: number;
  addedById: number;
}

export interface UpdateRequestPartForm {
  id: number;
  quantityUsed: number;
}

// Storage filter types
export interface StorageFilters extends PaginationParams {
  search?: string;
  category?: string;
  lowStock?: boolean;
  supplier?: string;
  location?: string;
}

// Storage status labels
export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  'IN_STOCK': 'In Stock',
  'LOW_STOCK': 'Low Stock',
  'OUT_OF_STOCK': 'Out of Stock',
};

// Spare Part Request types
export interface SparePartRequest {
  id: number;
  requestId: number;
  technicianId: number;
  partName: string;
  partNumber?: string;
  description: string;
  quantity: number;
  urgency: 'LOW' | 'NORMAL' | 'URGENT';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED';
  rejectionReason?: string;
  approvedById?: number;
  fulfilledById?: number;
  createdAt: string;
  updatedAt: string;
  technician: {
    id: number;
    firstName: string;
    lastName: string;
  };
  request: {
    id: number;
    requestNumber: string;
    customer?: {
      name: string;
    };
  };
  approvedBy?: {
    id: number;
    firstName: string;
    lastName: string;
  };
  fulfilledBy?: {
    id: number;
    firstName: string;
    lastName: string;
  };
}

export interface CreateSparePartRequestForm {
  requestId: number;
  partName: string;
  partNumber?: string;
  description: string;
  quantity: number;
  urgency: 'LOW' | 'NORMAL' | 'URGENT';
}

export interface SparePartRequestFilters extends PaginationParams {
  status?: string;
  requestId?: number;
  technicianId?: number;
}

// Spare Part Request status labels
export const SPARE_PART_REQUEST_STATUS_LABELS: Record<string, string> = {
  'PENDING': 'Pending',
  'APPROVED': 'Approved',
  'REJECTED': 'Rejected',
  'FULFILLED': 'Fulfilled',
};

// Spare Part Request urgency labels
export const SPARE_PART_REQUEST_URGENCY_LABELS: Record<string, string> = {
  'LOW': 'Low',
  'NORMAL': 'Normal',
  'URGENT': 'Urgent',
};

// Technician Report types
export interface CreateTechnicianReportForm {
  requestId: number;
  reportContent: string;
  currentStatus?: string;
  partsUsed?: string;
  sendToSupervisor?: boolean;
  sendToAdmin?: boolean;
}

export interface TechnicianReportFilters {
  status?: string;
  technicianId?: number;
  requestId?: number;
  isApproved?: boolean;
  limit?: number;
  offset?: number;
}

export interface TechnicianReport {
  id: number;
  requestId: number;
  technicianId: number;
  reportContent: string;
  currentStatus?: string;
  partsUsed?: string;
  sendToSupervisor: boolean;
  sendToAdmin: boolean;
  isApproved?: boolean;
  approvedById?: number;
  approvalComment?: string;
  createdAt: string;
  updatedAt: string;
  request?: {
    id: number;
    requestNumber: string;
    customerName: string;
  };
  technician?: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
  approvedBy?: {
    id: number;
    firstName: string;
    lastName: string;
    username: string;
  };
}