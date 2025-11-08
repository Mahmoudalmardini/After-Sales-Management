import { Router } from 'express';
import { prisma } from '../index';
import { ApiResponse, ValidationError, AuthenticatedRequest, UserRole } from '../types';
import { authenticateToken, requireRoles } from '../middleware/auth';

const router = Router();

/**
 * @route   GET /api/customers
 * @desc    Get all customers with optional search and pagination
 * @access  Private
 */
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { page = 1, limit = 20, search } = req.query as any;
  const user = req.user!;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: String(search), mode: 'insensitive' } },
      { phone: { contains: String(search), mode: 'insensitive' } },
      { email: { contains: String(search), mode: 'insensitive' } },
      { address: { contains: String(search), mode: 'insensitive' } },
    ];
  }

  // If user is a technician, only show customers who have requests assigned to this technician
  if (user.role === 'TECHNICIAN') {
    where.requests = {
      some: {
        assignedTechnicianId: user.id
      }
    };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ 
      where, 
      skip, 
      take: Number(limit), 
      orderBy: { createdAt: 'desc' },
      include: {
        requests: {
          where: user.role === 'TECHNICIAN' ? { assignedTechnicianId: user.id } : undefined,
          select: {
            id: true,
            requestNumber: true,
            status: true,
            createdAt: true
          }
        }
      }
    }),
    prisma.customer.count({ where }),
  ]);

  const response: ApiResponse = {
    success: true,
    data: { customers },
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
  };

  res.status(200).json(response);
});

/**
 * @route   POST /api/customers
 * @desc    Create new customer
 * @access  Private (Managers and Supervisors only)
 */
router.post('/', authenticateToken, requireRoles([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR]), async (req: AuthenticatedRequest, res) => {
  const { name, phone, phoneType, email, address, city } = req.body;

  if (!name || !phone || !address) {
    const error = new ValidationError('Name, phone, and address are required');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  // Validate email format if provided
  if (email && !email.includes('@')) {
    const error = new ValidationError('Email must contain @ symbol');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  const customer = await prisma.customer.create({
    data: { name, phone, email, address, city },
  });

  const response: ApiResponse = {
    success: true,
    message: 'Customer created successfully',
    data: { customer },
  };

  res.status(201).json(response);
});

export default router;
