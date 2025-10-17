import { Router } from 'express';
import { prisma } from '../index';
import { ApiResponse, UserRole, BadRequestError, NotFoundError } from '../types';
import { authenticateToken, requireRoles } from '../middleware/auth';

const router = Router();

// All department routes require authentication
router.use(authenticateToken);

/**
 * @route   GET /api/departments
 * @desc    Get all departments
 * @access  Private
 */
router.get('/', async (req, res) => {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: {
      manager: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  const response: ApiResponse = {
    success: true,
    data: { departments },
  };

  res.status(200).json(response);
});

/**
 * @route   POST /api/departments
 * @desc    Create a new department
 * @access  Admin/Supervisor only
 */
router.post(
  '/',
  requireRoles([
    UserRole.COMPANY_MANAGER,
    UserRole.DEPUTY_MANAGER,
    UserRole.DEPARTMENT_MANAGER,
    UserRole.SECTION_SUPERVISOR,
  ]),
  async (req, res, next) => {
    try {
      const { name, description } = req.body;

      // Validate required fields
      if (!name || !name.trim()) {
        throw new BadRequestError('Department name is required');
      }

      // Check if department with this name already exists
      const existingDepartment = await prisma.department.findUnique({
        where: { name: name.trim() },
      });

      if (existingDepartment) {
        throw new BadRequestError('A department with this name already exists');
      }

      // Create the department
      const department = await prisma.department.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
        },
        include: {
          manager: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      const response: ApiResponse = {
        success: true,
        message: 'Department created successfully',
        data: { department },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   PUT /api/departments/:id
 * @desc    Update an existing department
 * @access  Admin/Supervisor only
 */
router.put(
  '/:id',
  requireRoles([
    UserRole.COMPANY_MANAGER,
    UserRole.DEPUTY_MANAGER,
    UserRole.DEPARTMENT_MANAGER,
    UserRole.SECTION_SUPERVISOR,
  ]),
  async (req, res, next) => {
    try {
      const departmentId = parseInt(req.params.id);
      const { name, description } = req.body;

      if (isNaN(departmentId)) {
        throw new BadRequestError('Invalid department ID');
      }

      // Validate required fields
      if (!name || !name.trim()) {
        throw new BadRequestError('Department name is required');
      }

      // Check if department exists
      const existingDepartment = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!existingDepartment) {
        throw new NotFoundError('Department not found');
      }

      // Check if another department has the same name (excluding current department)
      const duplicateName = await prisma.department.findFirst({
        where: {
          name: name.trim(),
          NOT: { id: departmentId },
        },
      });

      if (duplicateName) {
        throw new BadRequestError('A department with this name already exists');
      }

      // Update the department
      const department = await prisma.department.update({
        where: { id: departmentId },
        data: {
          name: name.trim(),
          description: description?.trim() || null,
        },
        include: {
          manager: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      const response: ApiResponse = {
        success: true,
        message: 'Department updated successfully',
        data: { department },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   DELETE /api/departments/:id
 * @desc    Delete a department
 * @access  Admin/Supervisor only
 */
router.delete(
  '/:id',
  requireRoles([
    UserRole.COMPANY_MANAGER,
    UserRole.DEPUTY_MANAGER,
    UserRole.DEPARTMENT_MANAGER,
    UserRole.SECTION_SUPERVISOR,
  ]),
  async (req, res, next) => {
    try {
      const departmentId = parseInt(req.params.id);

      if (isNaN(departmentId)) {
        throw new BadRequestError('Invalid department ID');
      }

      // Check if department exists
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
        include: {
          _count: {
            select: {
              users: true,
              products: true,
              spareParts: true,
              requests: true,
            },
          },
        },
      });

      if (!department) {
        throw new NotFoundError('Department not found');
      }

      // Check if department is in use
      const totalUsage =
        department._count.users +
        department._count.products +
        department._count.spareParts +
        department._count.requests;

      if (totalUsage > 0) {
        const usageDetails = [];
        if (department._count.users > 0) usageDetails.push(`${department._count.users} user(s)`);
        if (department._count.products > 0) usageDetails.push(`${department._count.products} product(s)`);
        if (department._count.spareParts > 0) usageDetails.push(`${department._count.spareParts} spare part(s)`);
        if (department._count.requests > 0) usageDetails.push(`${department._count.requests} request(s)`);

        throw new BadRequestError(
          `Cannot delete department. It is currently used by: ${usageDetails.join(', ')}`
        );
      }

      // Delete the department
      await prisma.department.delete({
        where: { id: departmentId },
      });

      const response: ApiResponse = {
        success: true,
        message: 'Department deleted successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
