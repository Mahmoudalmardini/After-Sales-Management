import { Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { prisma } from '../index';
import { AuthenticatedRequest, JWTPayload, UnauthorizedError, ForbiddenError, UserRole } from '../types';

// Middleware to authenticate JWT token
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    
    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        departmentId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    req.user = {
      ...user,
      role: user.role as UserRole,
      departmentId: user.departmentId ?? undefined,
    };
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
};

// Middleware to check if user has required roles
export const requireRoles = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

// Middleware to check if user can access department-specific resources
export const requireDepartmentAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  const { role, departmentId } = req.user;
  
  // Company and deputy managers can access all departments
  if (role === UserRole.COMPANY_MANAGER || role === UserRole.DEPUTY_MANAGER) {
    return next();
  }

  // Department-specific roles need to match department
  const requestedDepartmentId = parseInt(req.params.departmentId || req.body.departmentId || '0');
  
  if (requestedDepartmentId && departmentId !== requestedDepartmentId) {
    return next(new ForbiddenError('Cannot access resources from other departments'));
  }

  next();
};

// Middleware to check if user can modify specific requests
export const requireRequestAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const requestId = parseInt(req.params.requestId || req.params.id || '0');
    if (!requestId) {
      return next(new ForbiddenError('Request ID required'));
    }

    const request = await prisma.request.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        departmentId: true,
        assignedTechnicianId: true,
        receivedById: true,
      },
    });

    if (!request) {
      return next(new ForbiddenError('Request not found'));
    }

    const { role, departmentId, id: userId } = req.user;

    // Company, deputy managers, and section supervisors can access all requests
    if (role === UserRole.COMPANY_MANAGER || role === UserRole.DEPUTY_MANAGER || role === UserRole.SECTION_SUPERVISOR) {
      return next();
    }

    // Department managers can access requests in their department
    if (role === UserRole.DEPARTMENT_MANAGER && departmentId === request.departmentId) {
      return next();
    }

    // Technicians can only access their assigned requests or those they received
    if (role === UserRole.TECHNICIAN) {
      if (request.assignedTechnicianId === userId || request.receivedById === userId) {
        return next();
      }
    }

    return next(new ForbiddenError('Cannot access this request'));
  } catch (error) {
    next(error);
  }
};

// Helper function to check if user is manager level or above
export const isManagerLevel = (role: UserRole): boolean => {
  return ([
    UserRole.COMPANY_MANAGER,
    UserRole.DEPUTY_MANAGER,
    UserRole.DEPARTMENT_MANAGER,
    UserRole.SECTION_SUPERVISOR,
  ] as UserRole[]).includes(role);
};

// Helper function to check if user can assign technicians
export const canAssignTechnicians = (role: UserRole): boolean => {
  return ([
    UserRole.COMPANY_MANAGER,
    UserRole.DEPUTY_MANAGER,
    UserRole.DEPARTMENT_MANAGER,
    UserRole.SECTION_SUPERVISOR,
  ] as UserRole[]).includes(role);
};
