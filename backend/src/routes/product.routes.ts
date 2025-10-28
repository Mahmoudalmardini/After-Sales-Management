import { Router, Response } from 'express';
import { prisma } from '../index';
import { ApiResponse, ValidationError, AuthenticatedRequest, UserRole, NotificationType } from '../types';
import { authenticateToken } from '../middleware/auth';
import { createNotification } from '../services/notification.service';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

/**
 * @route   GET /api/products
 * @desc    Get all products with optional search and pagination
 * @access  Private
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { page = 1, limit = 20, search, departmentId } = req.query as any;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { model: { contains: String(search), mode: 'insensitive' } },
      { category: { contains: String(search), mode: 'insensitive' } },
      { serialNumber: { contains: String(search), mode: 'insensitive' } },
    ];
  }
  if (departmentId) where.departmentId = Number(departmentId);

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: { department: true },
    }),
    prisma.product.count({ where }),
  ]);

  const response: ApiResponse = {
    success: true,
    data: { products },
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
  };

  res.status(200).json(response);
});

/**
 * @route   POST /api/products
 * @desc    Create new product
 * @access  Private (Admin, Supervisor)
 */
router.post('/', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new ValidationError('Authentication required');
  }

  // Check if user has permission to create products
  const canCreateProduct = [
    UserRole.COMPANY_MANAGER,
    UserRole.DEPUTY_MANAGER,
    UserRole.DEPARTMENT_MANAGER,
    UserRole.SECTION_SUPERVISOR
  ].includes(req.user.role as UserRole);

  if (!canCreateProduct) {
    throw new ValidationError('Insufficient permissions to create products');
  }

  const { name, model, serialNumber, category, departmentId } = req.body;

  if (!name || !model || !category || !departmentId) {
    throw new ValidationError('name, model, category, departmentId are required');
  }

  // Ensure department exists
  const department = await prisma.department.findUnique({ where: { id: Number(departmentId) } });
  if (!department) {
    throw new ValidationError('Department not found');
  }

  const product = await prisma.product.create({
    data: {
      name,
      model,
      serialNumber: serialNumber || null,
      category,
      departmentId: Number(departmentId),
    },
    include: { department: true },
  });

  // Send notifications to relevant users
  const creatorName = `${req.user.firstName} ${req.user.lastName}`;
  const isAdmin = req.user.role === UserRole.COMPANY_MANAGER || req.user.role === UserRole.DEPUTY_MANAGER;
  const isSupervisor = req.user.role === UserRole.DEPARTMENT_MANAGER || req.user.role === UserRole.SECTION_SUPERVISOR;

  // Get users to notify based on creator role
  let targetRoles: UserRole[] = [];
  if (isAdmin) {
    // Admin created product - notify supervisors, technicians, warehouse keepers
    targetRoles = [UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR, UserRole.TECHNICIAN, UserRole.WAREHOUSE_KEEPER];
  } else if (isSupervisor) {
    // Supervisor created product - notify admin, technicians, warehouse keepers
    targetRoles = [UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.TECHNICIAN, UserRole.WAREHOUSE_KEEPER];
  }

  if (targetRoles.length > 0) {
    const targetUsers = await prisma.user.findMany({
      where: {
        role: { in: targetRoles },
        isActive: true
      },
      select: { id: true }
    });

    // Create notifications for each target user
    const notificationPromises = targetUsers.map(user => 
      createNotification({
        userId: user.id,
        title: 'New Product Added',
        message: `${creatorName} added new product: ${name}`,
        type: NotificationType.PRODUCT_ADDED
      })
    );

    await Promise.all(notificationPromises);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Product created successfully',
    data: { product },
  };

  res.status(201).json(response);
}));

export default router;
