import { Response } from 'express';
import { 
  RequestStatus, 
  WarrantyStatus, 
  ExecutionMethod, 
  UserRole, 
  ActivityType,
  RequestPriority,
  NotificationType 
} from '../types';
import { prisma } from '../index';
import { 
  AuthenticatedRequest, 
  ApiResponse, 
  RequestFilters,
  ValidationError,
  NotFoundError,
  ForbiddenError
} from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { isManagerLevel, canAssignTechnicians } from '../middleware/auth';
import { calculateSLADueDate, checkSLAOverdue } from '../services/sla.service';
import { createNotification } from '../services/notification.service';
import { logActivity } from '../services/activity.service';

// Generate unique request number
const generateRequestNumber = async (): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  
  const prefix = `REQ${year}${month}${day}`;
  
  // Get the count of requests created today
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  const todayCount = await prisma.request.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lt: endOfDay,
      },
    },
  });
  
  const sequence = (todayCount + 1).toString().padStart(3, '0');
  return `${prefix}-${sequence}`;
};

// Create new request
export const createRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const {
    customerId,
    productId,
    issueDescription,
    executionMethod,
    warrantyStatus,
    purchaseDate,
    priority = RequestPriority.NORMAL,
    serialNumber,
  } = req.body;

  if (!req.user) {
    throw new ValidationError('Authentication required');
  }

  // Validate required fields (purchaseDate is optional)
  if (!customerId || !issueDescription || !executionMethod || !warrantyStatus || !serialNumber || !serialNumber.trim()) {
    throw new ValidationError('Missing required fields');
  }

  // Validate customer exists
  const customer = await prisma.customer.findUnique({
    where: { id: parseInt(customerId) },
  });

  if (!customer) {
    throw new ValidationError('Customer not found');
  }

  // Validate product if provided
  let product = null;
  let departmentId = null;

  if (productId) {
    product = await prisma.product.findUnique({
      where: { id: parseInt(productId) },
      include: { department: true },
    });

    if (!product) {
      throw new ValidationError('Product not found');
    }

    departmentId = product.departmentId;
  }

  // If no product provided, try to auto-assign department based on issue description
  if (!departmentId) {
    // Simple keyword matching for department assignment
    const description = issueDescription.toLowerCase();
    
    if (description.includes('tv') || description.includes('refrigerator') || 
        description.includes('washing') || description.includes('dishwasher') || 
        description.includes('air condition') || description.includes('lg')) {
      const lgDept = await prisma.department.findFirst({ where: { name: 'LG Maintenance' } });
      departmentId = lgDept?.id || 1;
    } else if (description.includes('solar') || description.includes('panel')) {
      const solarDept = await prisma.department.findFirst({ where: { name: 'Solar Energy' } });
      departmentId = solarDept?.id || 2;
    } else if (description.includes('tp-link') || description.includes('router') || description.includes('wifi')) {
      const tplinkDept = await prisma.department.findFirst({ where: { name: 'TP-Link' } });
      departmentId = tplinkDept?.id || 3;
    } else if (description.includes('printer') || description.includes('epson')) {
      const epsonDept = await prisma.department.findFirst({ where: { name: 'Epson' } });
      departmentId = epsonDept?.id || 4;
    } else {
      // Default to LG Maintenance if no match
      const lgDept = await prisma.department.findFirst({ where: { name: 'LG Maintenance' } });
      departmentId = lgDept?.id || 1;
    }
  }

  // Generate request number
  const requestNumber = await generateRequestNumber();

  // Calculate SLA due date
  const slaDueDate = calculateSLADueDate(
    warrantyStatus as WarrantyStatus,
    executionMethod as ExecutionMethod
  );

  // Create the request
  const newRequest = await prisma.request.create({
    data: {
      requestNumber,
      customerId: parseInt(customerId),
      productId: productId ? parseInt(productId) : null,
      departmentId,
      receivedById: req.user.id,
      issueDescription,
      executionMethod: executionMethod as ExecutionMethod,
      warrantyStatus: warrantyStatus as WarrantyStatus,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
      priority: priority as RequestPriority,
      slaDueDate,
      status: RequestStatus.NEW,
      serialNumber: serialNumber && serialNumber.trim() ? serialNumber.trim() : null,
    },
    include: {
      customer: true,
      product: true,
      department: true,
      receivedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Log activity
  await logActivity(newRequest.id, req.user.id, ActivityType.CREATED, 'Request created');

  // Notify department manager/supervisor
  const departmentUsers = await prisma.user.findMany({
    where: {
      departmentId,
      role: { in: [UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR] },
      isActive: true,
    },
  });

  for (const user of departmentUsers) {
    await createNotification({
      userId: user.id,
      requestId: newRequest.id,
      title: 'New Request Assigned',
      message: `New request ${requestNumber} has been assigned to your department`,
      type: NotificationType.ASSIGNMENT,
      createdById: req.user.id,
    });
  }

  logger.info(`Request ${requestNumber} created by user ${req.user.username}`);

  const response: ApiResponse = {
    success: true,
    message: 'Request created successfully',
    data: { request: newRequest },
  };

  res.status(201).json(response);
});

// Get all requests with filters and pagination
export const getRequests = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new ValidationError('Authentication required');
  }

  const {
    page = 1,
    limit = 20,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    status,
    priority,
    departmentId,
    assignedTechnicianId,
    warrantyStatus,
    isOverdue,
    dateFrom,
    dateTo,
    search,
  } = req.query as RequestFilters;

  // Build where clause based on user role and filters
  let whereClause: any = {};

  // Role-based access control
  if (req.user.role === UserRole.TECHNICIAN) {
    // Technicians can only see their assigned requests or ones they received
    whereClause.OR = [
      { assignedTechnicianId: req.user.id },
      { receivedById: req.user.id },
    ];
  } else if (req.user.role === UserRole.SECTION_SUPERVISOR || req.user.role === UserRole.DEPARTMENT_MANAGER) {
    // Department-level access
    whereClause.departmentId = req.user.departmentId;
  }
  // Company and deputy managers can see all requests (no additional filter)

  // Apply filters
  if (status) whereClause.status = status;
  if (priority) whereClause.priority = priority;
  if (departmentId) whereClause.departmentId = parseInt(departmentId.toString());
  if (assignedTechnicianId) whereClause.assignedTechnicianId = parseInt(assignedTechnicianId.toString());
  if (warrantyStatus) whereClause.warrantyStatus = warrantyStatus;
  if (isOverdue !== undefined) whereClause.isOverdue = String(isOverdue) === 'true';

  // Date range filter
  if (dateFrom || dateTo) {
    whereClause.createdAt = {};
    if (dateFrom) whereClause.createdAt.gte = new Date(dateFrom.toString());
    if (dateTo) whereClause.createdAt.lte = new Date(dateTo.toString());
  }

  // Search functionality
  if (search) {
    const searchTerm = search.toString().trim();
    if (searchTerm.length > 0) {
      const searchConditions = [
        { requestNumber: { contains: searchTerm, mode: 'insensitive' } },
        { issueDescription: { contains: searchTerm, mode: 'insensitive' } },
        { customer: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { customer: { phone: { contains: searchTerm, mode: 'insensitive' } } },
        { product: { name: { contains: searchTerm, mode: 'insensitive' } } },
      ];

      if (whereClause.AND) {
        whereClause.AND.push({ OR: searchConditions });
      } else {
        whereClause.AND = [{ OR: searchConditions }];
      }
    }
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);

  // Get total count
  const total = await prisma.request.count({ where: whereClause });

  // Get requests
  const requests = await prisma.request.findMany({
    where: whereClause,
    skip,
    take: Number(limit),
    orderBy: { [sortBy.toString()]: sortOrder },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          model: true,
          category: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
        },
      },
      assignedTechnician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      receivedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Check for overdue requests and update if necessary
  const overdueRequestIds = await checkSLAOverdue();
  if (overdueRequestIds.length > 0) {
    // Update the overdue status in our results if any match
    requests.forEach(request => {
      if (overdueRequestIds.includes(request.id)) {
        request.isOverdue = true;
      }
    });
  }

  const response: ApiResponse = {
    success: true,
    data: { requests },
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  };

  res.status(200).json(response);
});

// Get single request by ID
export const getRequestById = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requestId = parseInt(req.params.id);

  if (!requestId) {
    throw new ValidationError('Invalid request ID');
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      customer: true,
      product: true,
      department: true,
      assignedTechnician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
        },
      },
      receivedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      activities: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      costs: {
        include: {
          addedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      requestParts: {
        include: {
          sparePart: true,
          addedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      technicianReports: {
        include: {
          technician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!request) {
    throw new NotFoundError('Request not found');
  }

  const response: ApiResponse = {
    success: true,
    data: { request },
  };

  res.status(200).json(response);
});

// Update request status
export const updateRequestStatus = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requestId = parseInt(req.params.id);
  const { status, comment } = req.body;

  if (!requestId || !status) {
    throw new ValidationError('Request ID and status are required');
  }

  if (!req.user) {
    throw new ValidationError('Authentication required');
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      requestNumber: true,
      status: true,
      warrantyStatus: true,
      departmentId: true,
      receivedById: true,
      assignedTechnicianId: true,
      startedAt: true,
      completedAt: true,
      closedAt: true,
    },
  });

  if (!request) {
    throw new NotFoundError('Request not found');
  }

  // Check if user can update this request
  const canUpdate = 
    req.user.role === UserRole.COMPANY_MANAGER ||
    req.user.role === UserRole.DEPUTY_MANAGER ||
    req.user.role === UserRole.SECTION_SUPERVISOR ||
    (req.user.role === UserRole.DEPARTMENT_MANAGER && req.user.departmentId === request.departmentId) ||
    (req.user.role === UserRole.TECHNICIAN && (request.assignedTechnicianId === req.user.id || request.receivedById === req.user.id));

  if (!canUpdate) {
    throw new ForbiddenError('Cannot update this request');
  }

  // Check if trying to reopen a closed request
  const isReopeningClosedRequest = request.status === RequestStatus.CLOSED && status !== RequestStatus.CLOSED;
  
  // Only admins can reopen closed requests
  if (isReopeningClosedRequest) {
    const canReopenClosed = 
      req.user.role === UserRole.COMPANY_MANAGER ||
      req.user.role === UserRole.DEPUTY_MANAGER;
    
    if (!canReopenClosed) {
      throw new ForbiddenError('Only administrators can reopen closed requests');
    }
  }

  // Determine if technician is allowed to change this status
  const technicianCanChangeStatus =
    req.user.role === UserRole.TECHNICIAN &&
    (request.assignedTechnicianId === req.user.id || request.receivedById === req.user.id) &&
    (
      // Confirming receipt: NEW -> ASSIGNED
      (request.status === RequestStatus.NEW && status === RequestStatus.ASSIGNED) ||
      // Starting work / updating progress once assigned
      (request.status === RequestStatus.ASSIGNED && [
        RequestStatus.UNDER_INSPECTION,
        RequestStatus.WAITING_PARTS,
        RequestStatus.IN_REPAIR,
      ].includes(status as RequestStatus)) ||
      // Completing work: IN_REPAIR -> COMPLETED
      (request.status === RequestStatus.IN_REPAIR && status === RequestStatus.COMPLETED)
    );

  // Check if user can change status
  const canChangeStatus = 
    req.user.role === UserRole.COMPANY_MANAGER ||
    req.user.role === UserRole.DEPUTY_MANAGER ||
    req.user.role === UserRole.DEPARTMENT_MANAGER ||
    req.user.role === UserRole.SECTION_SUPERVISOR ||
    technicianCanChangeStatus;

  if (!canChangeStatus) {
    throw new ForbiddenError('No permissions. Please consult your administrator.');
  }

  const oldStatus = request.status;
  const updateData: any = { status };

  // Set timestamps based on status
  if (status === RequestStatus.UNDER_INSPECTION && !request.startedAt) {
    updateData.startedAt = new Date();
  }
  if (status === RequestStatus.COMPLETED && !request.completedAt) {
    updateData.completedAt = new Date();
  }
  if (status === RequestStatus.CLOSED && !request.closedAt) {
    updateData.closedAt = new Date();
  }

  const updatedRequest = await prisma.request.update({
    where: { id: requestId },
    data: updateData,
    include: {
      customer: true,
      assignedTechnician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Log activity
  let activityDescription = '';
  if (isReopeningClosedRequest) {
    activityDescription = comment 
      ? `Request reopened from CLOSED to ${status}. Comment: ${comment}`
      : `Request reopened from CLOSED to ${status}`;
  } else {
    activityDescription = comment 
      ? `Status changed from ${oldStatus} to ${status}. Comment: ${comment}`
      : `Status changed from ${oldStatus} to ${status}`;
  }
  
  await logActivity(requestId, req.user.id, ActivityType.STATUS_CHANGE, activityDescription, oldStatus, status);

  // Create notification for assigned technician (only if someone else updated the status)
  if (updatedRequest.assignedTechnician && updatedRequest.assignedTechnicianId !== req.user.id) {
    const statusLabels = {
      'NEW': 'جديد',
      'ASSIGNED': 'مُعين',
      'UNDER_INSPECTION': 'تحت الفحص',
      'WAITING_PARTS': 'في انتظار القطع',
      'IN_REPAIR': 'قيد الإصلاح',
      'COMPLETED': 'مكتمل',
      'CLOSED': 'مغلق'
    };
    
    const oldStatusLabel = statusLabels[oldStatus as keyof typeof statusLabels] || oldStatus;
    const newStatusLabel = statusLabels[status as keyof typeof statusLabels] || status;
    
    await createNotification({
      userId: updatedRequest.assignedTechnician.id,
      requestId: requestId,
      title: 'تم تحديث حالة الطلب',
      message: `تم تغيير حالة الطلب ${updatedRequest.requestNumber} من "${oldStatusLabel}" إلى "${newStatusLabel}"`,
      type: NotificationType.STATUS_CHANGE,
      createdById: req.user.id,
    });
  }

  // If technician changed the status (allowed transitions), notify managers and supervisors
  if (req.user.role === UserRole.TECHNICIAN && technicianCanChangeStatus) {
    const technicianName = `${req.user.firstName || 'Unknown'} ${req.user.lastName || 'Technician'}`;
    const statusLabels: Record<string, string> = {
      NEW: 'جديد',
      ASSIGNED: 'مُعين',
      UNDER_INSPECTION: 'تحت الفحص',
      WAITING_PARTS: 'في انتظار القطع',
      IN_REPAIR: 'قيد الإصلاح',
      COMPLETED: 'مكتمل',
      CLOSED: 'مغلق',
    };

    const managersAndSupervisors = await prisma.user.findMany({
      where: {
        OR: [
          { role: { in: [UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER] } },
          {
            departmentId: request.departmentId,
            role: { in: [UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR] },
          }
        ],
        isActive: true,
      },
      select: { id: true },
    });

    let title = 'تحديث حالة الطلب من قبل الفني';
    let message = `الفني ${technicianName} قام بتحديث حالة الطلب ${updatedRequest.requestNumber}`;

    if (oldStatus === RequestStatus.NEW && status === RequestStatus.ASSIGNED) {
      title = 'تم تأكيد استلام الطلب';
      message = `الفني ${technicianName} أكد استلامه للطلب ${updatedRequest.requestNumber}`;
    } else if (statusLabels[oldStatus] || statusLabels[status as keyof typeof statusLabels]) {
      const fromLabel = statusLabels[oldStatus] || oldStatus;
      const toLabel = statusLabels[status as keyof typeof statusLabels] || status;
      message = `الفني ${technicianName} غيّر حالة الطلب ${updatedRequest.requestNumber} من "${fromLabel}" إلى "${toLabel}"`;
    }

    for (const manager of managersAndSupervisors) {
      await createNotification({
        userId: manager.id,
        requestId: requestId,
        title,
        message,
        type: NotificationType.STATUS_CHANGE,
        createdById: req.user.id,
      });
    }
  }

  // If manager or supervisor modified the status, notify the assigned technician
  if (req.user.role === UserRole.COMPANY_MANAGER || req.user.role === UserRole.DEPUTY_MANAGER || 
      req.user.role === UserRole.DEPARTMENT_MANAGER || req.user.role === UserRole.SECTION_SUPERVISOR) {
    
    const statusLabels = {
      'NEW': 'جديد',
      'ASSIGNED': 'مُعين',
      'UNDER_INSPECTION': 'تحت الفحص',
      'WAITING_PARTS': 'في انتظار القطع',
      'IN_REPAIR': 'قيد الإصلاح',
      'COMPLETED': 'مكتمل',
      'CLOSED': 'مغلق'
    };
    
    const oldStatusLabel = statusLabels[oldStatus as keyof typeof statusLabels] || oldStatus;
    const newStatusLabel = statusLabels[status as keyof typeof statusLabels] || status;
    
    const userRole = req.user.role === UserRole.COMPANY_MANAGER ? 'مدير الشركة' :
                    req.user.role === UserRole.DEPUTY_MANAGER ? 'نائب المدير' :
                    req.user.role === UserRole.DEPARTMENT_MANAGER ? 'مدير القسم' :
                    'مشرف القسم';
    
    const userName = `${req.user.firstName || 'Unknown'} ${req.user.lastName || 'User'}`;
    
    // Notify assigned technician if exists
    if (updatedRequest.assignedTechnician) {
      await createNotification({
        userId: updatedRequest.assignedTechnician.id,
        requestId: requestId,
        title: 'تم تعديل الطلب من قبل الإدارة',
        message: `${userRole} ${userName} قام بتعديل حالة الطلب من "${oldStatusLabel}" إلى "${newStatusLabel}"`,
        type: NotificationType.STATUS_CHANGE,
        createdById: req.user.id,
      });
    }
  }

  logger.info(`Request ${updatedRequest.requestNumber} status updated to ${status} by user ${req.user.username}`);

  const response: ApiResponse = {
    success: true,
    message: 'Request status updated successfully',
    data: { request: updatedRequest },
  };

  res.status(200).json(response);
});

// Assign technician to request
export const assignTechnician = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requestId = parseInt(req.params.id);
  const { technicianId } = req.body;

  if (!requestId || !technicianId) {
    throw new ValidationError('Request ID and technician ID are required');
  }

  if (!req.user) {
    throw new ValidationError('Authentication required');
  }

  if (!canAssignTechnicians(req.user.role)) {
    throw new ForbiddenError('Insufficient permissions to assign technicians');
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      assignedTechnician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!request) {
    throw new NotFoundError('Request not found');
  }

  // If the request is CLOSED, only company or deputy managers can assign
  if (
    request.status === RequestStatus.CLOSED &&
    !(req.user.role === UserRole.COMPANY_MANAGER || req.user.role === UserRole.DEPUTY_MANAGER)
  ) {
    throw new ForbiddenError('Only administrators can assign technicians to closed requests');
  }

  // Store old technician info for notification
  const oldTechnician = request.assignedTechnician;
  const oldTechnicianId = request.assignedTechnicianId;

  // Check if technician exists and is active
  const technician = await prisma.user.findUnique({
    where: { 
      id: parseInt(technicianId),
      role: UserRole.TECHNICIAN,
      isActive: true,
    },
  });

  if (!technician) {
    throw new ValidationError('Valid technician not found');
  }

  // Check if technician is from the same department (except for company/deputy managers)
  if (!isManagerLevel(req.user.role) && technician.departmentId !== req.user.departmentId) {
    throw new ForbiddenError('Cannot assign technician from different department');
  }

  // Prepare update data - reopen if closed
  const updateData: any = {
    assignedTechnicianId: parseInt(technicianId),
    assignedAt: new Date(),
  };
  
  // If request is CLOSED, reopen it to NEW status
  if (request.status === RequestStatus.CLOSED) {
    updateData.status = RequestStatus.NEW;
  } 
  // If request is COMPLETED, keep it COMPLETED
  else if (request.status === RequestStatus.COMPLETED) {
    // Keep status as COMPLETED
  }
  // Otherwise change to ASSIGNED
  else {
    updateData.status = RequestStatus.ASSIGNED;
  }

  const updatedRequest = await prisma.request.update({
    where: { id: requestId },
    data: updateData,
    include: {
      assignedTechnician: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Log activity with appropriate message based on request status
  let activityMessage = `تم تعيين فني: ${technician.firstName} ${technician.lastName}`;
  
  if (request.status === RequestStatus.CLOSED) {
    activityMessage += ` (تم إعادة فتح الطلب المغلق)`;
  } else if (request.status === RequestStatus.COMPLETED) {
    activityMessage += ` (الطلب مكتمل - لم يتم تغيير الحالة)`;
  }
  
  await logActivity(
    requestId, 
    req.user.id, 
    ActivityType.ASSIGNMENT, 
    activityMessage,
    request.assignedTechnicianId?.toString(),
    technicianId.toString()
  );

  // Notify technician
  const assignerName = `${req.user.firstName || 'Unknown'} ${req.user.lastName || 'User'}`;
  const assignerRole = req.user.role === 'COMPANY_MANAGER' ? 'مدير الشركة' :
                      req.user.role === 'DEPUTY_MANAGER' ? 'نائب المدير' :
                      req.user.role === 'DEPARTMENT_MANAGER' ? 'مدير القسم' :
                      req.user.role === 'SECTION_SUPERVISOR' ? 'مشرف القسم' : 'المشرف';
  
  await createNotification({
    userId: parseInt(technicianId),
    requestId: requestId,
    title: 'تم تعيين طلب جديد لك',
    message: `${assignerRole} ${assignerName} عينك لطلب ${updatedRequest.requestNumber}`,
    type: NotificationType.ASSIGNMENT,
  });

  // Notify old technician if they were reassigned
  if (oldTechnician && oldTechnicianId && oldTechnicianId !== parseInt(technicianId)) {
    await createNotification({
      userId: oldTechnicianId,
      requestId: undefined, // No requestId since technician can't access it anymore
      title: 'تم إلغاء تعيينك من الطلب',
      message: `لم تعد مسؤولاً عن الطلب ${updatedRequest.requestNumber}. تم تعيينه لفني آخر.`,
      type: NotificationType.ASSIGNMENT,
      createdById: req.user.id,
    });
  }

  logger.info(`Request ${updatedRequest.requestNumber} assigned to technician ${technician.firstName} ${technician.lastName} by user ${req.user.username}`);

  const response: ApiResponse = {
    success: true,
    message: 'Technician assigned successfully',
    data: { request: updatedRequest },
  };

  res.status(200).json(response);
});

// Add cost to request
export const addCost = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requestId = parseInt(req.params.id);
  const { description, amount, costType, currency = 'SYP', sparePartId, quantity } = req.body;

  if (!requestId || !description || !amount || !costType) {
    throw new ValidationError('All cost fields are required');
  }

  if (sparePartId) {
    if (!quantity || Number(quantity) <= 0) {
      throw new ValidationError('Quantity must be provided and greater than zero when using a spare part');
    }
  }

  if (!req.user) {
    throw new ValidationError('Authentication required');
  }

  if (amount <= 0) {
    throw new ValidationError('Cost amount must be greater than zero');
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      requestNumber: true,
      warrantyStatus: true,
      departmentId: true,
      receivedById: true,
      assignedTechnicianId: true,
    },
  });

  if (!request) {
    throw new NotFoundError('Request not found');
  }

  // Only allow adding costs to out-of-warranty requests or by managers
  if (request.warrantyStatus === WarrantyStatus.UNDER_WARRANTY && !isManagerLevel(req.user.role)) {
    throw new ForbiddenError('Cannot add costs to under-warranty requests');
  }

  let sparePartUsage: { requestPart: any; remaining: number } | null = null;

  if (sparePartId) {
    const sparePart = await prisma.sparePart.findUnique({
      where: { id: parseInt(sparePartId) },
      select: { id: true, name: true, presentPieces: true, unitPrice: true } as any,
    }) as any;

    if (!sparePart) {
      throw new ValidationError('Selected spare part not found');
    }

    if (sparePart.presentPieces < Number(quantity)) {
      throw new ValidationError('Insufficient spare part quantity in stock');
    }

    const unitPrice = sparePart.unitPrice || parseFloat(amount) / Number(quantity);

    // Reserve the parts for this request
    const requestPart = await prisma.requestPart.create({
      data: {
        requestId,
        sparePartId: sparePart.id,
        quantityUsed: Number(quantity),
        unitPrice,
        totalCost: unitPrice * Number(quantity),
        addedById: req.user.id,
      },
      include: {
        sparePart: true,
      },
    });

    // Decrease stock after creating request part
    const updatedPart = await prisma.sparePart.update({
      where: { id: sparePart.id },
      data: { presentPieces: sparePart.presentPieces - Number(quantity) } as any,
      select: { presentPieces: true } as any,
    }) as any;

    sparePartUsage = { requestPart, remaining: updatedPart.presentPieces };
  }

  const cost = await prisma.requestCost.create({
    data: {
      requestId,
      description,
      amount: parseFloat(amount),
      costType,
      currency,
      addedById: req.user.id,
    },
    include: {
      addedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Log activity
  const activityDetails = sparePartUsage
    ? `Spare part used: ${sparePartUsage.requestPart.sparePart.name} x${sparePartUsage.requestPart.quantityUsed}`
    : `Cost added: ${description} - $${amount}`;

  await logActivity(
    requestId,
    req.user.id,
    ActivityType.COST_ADDED,
    activityDetails,
    null,
    `${description}: $${amount}`
  );

  // If manager or supervisor added cost, notify the assigned technician
  if (req.user.role === UserRole.COMPANY_MANAGER || req.user.role === UserRole.DEPUTY_MANAGER || 
      req.user.role === UserRole.DEPARTMENT_MANAGER || req.user.role === UserRole.SECTION_SUPERVISOR) {
    
    const userRole = req.user.role === UserRole.COMPANY_MANAGER ? 'مدير الشركة' :
                    req.user.role === UserRole.DEPUTY_MANAGER ? 'نائب المدير' :
                    req.user.role === UserRole.DEPARTMENT_MANAGER ? 'مدير القسم' :
                    'مشرف القسم';
    
    const userName = `${req.user.firstName || 'Unknown'} ${req.user.lastName || 'User'}`;
    
    // Get the request with assigned technician
    const requestWithTechnician = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        assignedTechnician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    
    // Notify assigned technician if exists
    if (requestWithTechnician?.assignedTechnician) {
      await createNotification({
        userId: requestWithTechnician.assignedTechnician.id,
        requestId: requestId,
        title: 'تم إضافة تكلفة للطلب',
        message: `${userRole} ${userName} قام بإضافة تكلفة للطلب: ${description} - ${amount} ${currency}`,
        type: NotificationType.STATUS_CHANGE,
        createdById: req.user.id,
      });
    }
  }

  // Notify managers/supervisors about cost/spare part usage
  if (request.departmentId) {
    const managers = await prisma.user.findMany({
      where: {
        departmentId: request.departmentId,
        role: { in: [UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR] },
        isActive: true,
      },
      select: { id: true },
    });

    for (const manager of managers) {
      await createNotification({
        userId: manager.id,
        requestId,
        title: sparePartUsage ? 'تم استخدام قطعة غيار في الطلب' : 'تمت إضافة تكلفة جديدة للطلب',
        message: sparePartUsage
          ? `تم استخدام ${sparePartUsage.requestPart.quantityUsed} من قطعة الغيار "${sparePartUsage.requestPart.sparePart.name}" في الطلب ${request.requestNumber}.`
          : `قام ${req.user.firstName || 'المستخدم'} بإضافة تكلفة بقيمة ${amount} ${currency} للطلب ${request.requestNumber}.`,
        type: NotificationType.COST_ADDED,
        createdById: req.user.id,
      });
    }
  }

  // Notify warehouse keeper if spare part used
  if (sparePartUsage) {
    // TODO: Link cost to spare part when schema is properly migrated
    // await prisma.requestCost.update({
    //   where: { id: cost.id },
    //   data: { requestPartId: sparePartUsage.requestPart.id },
    // });

    const warehouseKeepers = await prisma.user.findMany({
      where: {
        role: UserRole.WAREHOUSE_KEEPER,
        isActive: true,
      },
      select: { id: true },
    });

    for (const keeper of warehouseKeepers) {
      await createNotification({
        userId: keeper.id,
        requestId,
        title: 'تحديث مخزون قطع الغيار',
        message: `تم استخدام ${sparePartUsage.requestPart.quantityUsed} من "${sparePartUsage.requestPart.sparePart.name}". الكمية المتبقية: ${sparePartUsage.remaining}.`,
        type: NotificationType.WAREHOUSE_UPDATE,
        createdById: req.user.id,
      });
    }
  }

  // Notify request owner/technician if different from current user
  const notifyUsers = new Set<number>();
  if (request.receivedById) notifyUsers.add(request.receivedById);
  if (request.assignedTechnicianId) notifyUsers.add(request.assignedTechnicianId);
  notifyUsers.delete(req.user.id);

  for (const userId of notifyUsers) {
    await createNotification({
      userId,
      requestId,
      title: 'تم تحديث تكاليف الطلب',
      message: sparePartUsage
        ? `تم استخدام قطعة الغيار "${sparePartUsage.requestPart.sparePart.name}" (عدد ${sparePartUsage.requestPart.quantityUsed}) في طلبك.`
        : `تم إضافة تكلفة جديدة بقيمة ${amount} ${currency} في طلبك.`,
      type: NotificationType.COST_ADDED,
      createdById: req.user.id,
    });
  }

  logger.info(`Cost added to request ${request.requestNumber} by user ${req.user.username}: ${description} - $${amount}`);

  const response: ApiResponse = {
    success: true,
    message: 'Cost added successfully',
    data: { cost, sparePart: sparePartUsage?.requestPart },
  };

  res.status(201).json(response);
});

// Close request
export const closeRequest = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const requestId = parseInt(req.params.id);
  const { finalNotes, customerSatisfaction } = req.body;

  if (!requestId) {
    throw new ValidationError('Request ID is required');
  }

  if (!req.user) {
    throw new ValidationError('Authentication required');
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new NotFoundError('Request not found');
  }

  if (request.status !== RequestStatus.COMPLETED) {
    throw new ValidationError('Request must be completed before closing');
  }

  // Check permissions
  const canClose = isManagerLevel(req.user.role);

  if (!canClose) {
    throw new ForbiddenError('Insufficient permissions to close request');
  }

  const updatedRequest = await prisma.request.update({
    where: { id: requestId },
    data: {
      status: RequestStatus.CLOSED,
      closedAt: new Date(),
      finalNotes,
      customerSatisfaction: customerSatisfaction ? parseInt(customerSatisfaction) : null,
    },
  });

  // Log activity
  await logActivity(
    requestId,
    req.user.id,
    ActivityType.STATUS_CHANGE,
    'Request closed',
    RequestStatus.COMPLETED,
    RequestStatus.CLOSED
  );

  // If manager or supervisor closed the request, notify the assigned technician
  if (req.user.role === UserRole.COMPANY_MANAGER || req.user.role === UserRole.DEPUTY_MANAGER || 
      req.user.role === UserRole.DEPARTMENT_MANAGER || req.user.role === UserRole.SECTION_SUPERVISOR) {
    
    const userRole = req.user.role === UserRole.COMPANY_MANAGER ? 'مدير الشركة' :
                    req.user.role === UserRole.DEPUTY_MANAGER ? 'نائب المدير' :
                    req.user.role === UserRole.DEPARTMENT_MANAGER ? 'مدير القسم' :
                    'مشرف القسم';
    
    const userName = `${req.user.firstName || 'Unknown'} ${req.user.lastName || 'User'}`;
    
    // Get the request with assigned technician
    const requestWithTechnician = await prisma.request.findUnique({
      where: { id: requestId },
      include: {
        assignedTechnician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
    
    // Notify assigned technician if exists
    if (requestWithTechnician?.assignedTechnician) {
      await createNotification({
        userId: requestWithTechnician.assignedTechnician.id,
        requestId: requestId,
        title: 'تم إغلاق الطلب',
        message: `${userRole} ${userName} قام بإغلاق الطلب نهائياً`,
        type: NotificationType.STATUS_CHANGE,
        createdById: req.user.id,
      });
    }
  }

  logger.info(`Request ${request.requestNumber} closed by user ${req.user.username}`);

  const response: ApiResponse = {
    success: true,
    message: 'Request closed successfully',
    data: { request: updatedRequest },
  };

  res.status(200).json(response);
});
