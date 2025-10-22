import { Router } from 'express';
import { UserRole, ApiResponse, AuthenticatedRequest } from '../types';
import { requireRoles } from '../middleware/auth';
import { prisma } from '../index';
import bcrypt from 'bcryptjs';

const router = Router();

/**
 * @route   GET /api/users
 * @desc    Get users with optional filters (role, departmentId, isActive)
 * @access  Private (managers and supervisors only)
 */
router.get(
  '/',
  requireRoles([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR]),
  async (req: AuthenticatedRequest, res) => {
    const { role, departmentId, isActive = true, page = 1, limit = 50 } = req.query as any;
    const user = req.user!;

    const where: any = {};
    if (role) where.role = String(role);
    if (departmentId) where.departmentId = Number(departmentId);
    if (isActive !== undefined) where.isActive = String(isActive) !== 'false';

    // Department-based access control for supervisors
    if (user.role === UserRole.SECTION_SUPERVISOR || user.role === UserRole.DEPARTMENT_MANAGER) {
      // Supervisors and department managers can only see users from their department
      where.departmentId = user.departmentId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { firstName: 'asc' },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          department: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const response: ApiResponse = {
      success: true,
      data: { users },
      meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    };

    res.status(200).json(response);
  }
);

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private (managers only)
 */
router.post(
  '/',
  requireRoles([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { username, email, password, firstName, lastName, phone, role, departmentId } = req.body;
      const currentUser = req.user!;

      // Validation
      if (!username || !email || !password || !firstName || !lastName || !role) {
        return res.status(400).json({
          success: false,
          message: 'جميع الحقول المطلوبة يجب ملؤها',
        });
      }

      // Check if username or email already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { username },
            { email }
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'اسم المستخدم أو البريد الإلكتروني مستخدم بالفعل',
        });
      }

      // Only company and deputy managers can create users

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      // Create user
      const newUser = await prisma.user.create({
        data: {
          username,
          email,
          passwordHash,
          firstName,
          lastName,
          phone: phone || null,
          role,
          departmentId: departmentId ? Number(departmentId) : null,
          isActive: true,
        },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          department: { select: { id: true, name: true } },
        },
      });

      const response: ApiResponse = {
        success: true,
        message: 'تم إنشاء المستخدم بنجاح',
        data: { user: newUser },
      };

      return res.status(201).json(response);
    } catch (error: any) {
      console.error('Error creating user:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ في إنشاء المستخدم',
        data: { error: error.message },
      });
    }
  }
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private (managers only)
 */
router.put(
  '/:id',
  requireRoles([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { firstName, lastName, phone, role, departmentId, isActive } = req.body;
      const currentUser = req.user!;

      const userId = Number(id);
      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'معرف المستخدم غير صحيح',
        });
      }

      // Get existing user
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { department: true },
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'المستخدم غير موجود',
        });
      }

      // Only company and deputy managers can update users

      // Update user
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName: firstName || existingUser.firstName,
          lastName: lastName || existingUser.lastName,
          phone: phone !== undefined ? phone : existingUser.phone,
          role: role || existingUser.role,
          departmentId: departmentId !== undefined ? (departmentId ? Number(departmentId) : null) : existingUser.departmentId,
          isActive: isActive !== undefined ? isActive : existingUser.isActive,
        },
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          department: { select: { id: true, name: true } },
        },
      });

      const response: ApiResponse = {
        success: true,
        message: 'تم تحديث المستخدم بنجاح',
        data: { user: updatedUser },
      };

      return res.status(200).json(response);
    } catch (error: any) {
      console.error('Error updating user:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ في تحديث المستخدم',
        data: { error: error.message },
      });
    }
  }
);

/**
 * @route   PUT /api/users/:id/password
 * @desc    Change user password (admin only)
 * @access  Private (company and deputy managers only)
 */
router.put(
  '/:id/password',
  requireRoles([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      const currentUser = req.user!;

      const userId = Number(id);
      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'معرف المستخدم غير صحيح',
        });
      }

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل',
        });
      }

      // Get existing user
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { department: true },
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'المستخدم غير موجود',
        });
      }

      // Role-based restrictions
      if (currentUser.role === UserRole.DEPUTY_MANAGER) {
        // Deputy managers can only change passwords for users in their department
        if (existingUser.departmentId !== currentUser.departmentId) {
          return res.status(403).json({
            success: false,
            message: 'لا يمكنك تغيير كلمة مرور مستخدمين من أقسام أخرى',
          });
        }
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, 12);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          updatedAt: new Date(),
        },
      });

      const response: ApiResponse = {
        success: true,
        message: 'تم تغيير كلمة المرور بنجاح',
      };

      return res.status(200).json(response);
    } catch (error: any) {
      console.error('Error changing user password:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ في تغيير كلمة المرور',
        data: { error: error.message },
      });
    }
  }
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user (soft delete - set isActive to false)
 * @access  Private (company and deputy managers only)
 */
router.delete(
  '/:id',
  requireRoles([UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER]),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;
      const currentUser = req.user!;

      const userId = Number(id);
      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          message: 'معرف المستخدم غير صحيح',
        });
      }

      // Prevent deleting yourself
      if (userId === currentUser.id) {
        return res.status(400).json({
          success: false,
          message: 'لا يمكنك حذف حسابك الخاص',
        });
      }

      // Get existing user
      const existingUser = await prisma.user.findUnique({
        where: { id: userId },
        include: { department: true },
      });

      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'المستخدم غير موجود',
        });
      }

      // Prevent deleting other company managers (only deputy managers can do this)
      if (existingUser.role === UserRole.COMPANY_MANAGER && currentUser.role !== UserRole.COMPANY_MANAGER) {
        return res.status(403).json({
          success: false,
          message: 'لا يمكنك حذف مدير الشركة',
        });
      }

      // Soft delete - set isActive to false instead of actually deleting
      const deletedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          username: `deleted_${existingUser.username}_${Date.now()}`, // Make username unique
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          department: { select: { id: true, name: true } },
        },
      });

      const response: ApiResponse = {
        success: true,
        message: 'تم حذف المستخدم بنجاح',
        data: { user: deletedUser },
      };

      return res.status(200).json(response);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      return res.status(500).json({
        success: false,
        message: 'حدث خطأ في حذف المستخدم',
        data: { error: error.message },
      });
    }
  }
);

export default router;
