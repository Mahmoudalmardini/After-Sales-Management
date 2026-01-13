import { Response } from 'express';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { config } from '../config/config';
import { AuthenticatedRequest, ApiResponse, UnauthorizedError, ValidationError, ForbiddenError, JWTPayload, UserRole } from '../types';
import { asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

// Generate JWT token
const generateToken = (payload: JWTPayload): string => {
  const jwtPayload = {
    id: payload.id,
    username: payload.username,
    email: payload.email,
    role: payload.role,
    departmentId: payload.departmentId,
  };
  
  const secret = config.jwtSecret;
  const options: jwt.SignOptions = {
    expiresIn: '7d', // Set explicit expiration
  };
  
  return jwt.sign(jwtPayload, secret, options);
};

// Login user
export const login = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    throw new ValidationError('Username and password are required');
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate token
  const tokenPayload: JWTPayload = {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role as UserRole,
    departmentId: user.departmentId || undefined,
  };

  const token = generateToken(tokenPayload);

  // Try to manage sessions (gracefully handle if table doesn't exist yet)
  const ipAddress = req.ip || req.connection.remoteAddress || '';
  const userAgent = req.headers['user-agent'] || '';
  
  try {
    // Invalidate all previous sessions for this user
    await prisma.userSession.updateMany({
      where: { 
        userId: user.id,
        isActive: true
      },
      data: { isActive: false }
    });

    // Create new session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.userSession.create({
      data: {
        userId: user.id,
        token,
        ipAddress,
        userAgent,
        isActive: true,
        expiresAt
      }
    });
  } catch (sessionError: any) {
    // If UserSession table doesn't exist yet, just log and continue
    if (sessionError.code === 'P2021' || sessionError.message?.includes('does not exist')) {
      logger.warn('UserSession table not found - session management disabled until migration runs');
    } else {
      throw sessionError;
    }
  }

  // Log successful login
  logger.info(`User ${user.username} logged in successfully from ${ipAddress}`);

  const response: ApiResponse = {
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
      },
    },
  };

  res.status(200).json(response);
});

// Get current user profile
export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      department: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  const response: ApiResponse = {
    success: true,
    data: { user },
  };

  res.status(200).json(response);
});

// Update user profile
export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { firstName, lastName, email, phone } = req.body;

  // Validate email format if provided
  if (email && !email.includes('@')) {
    throw new ValidationError('Email must contain @ symbol');
  }

  // Check if user is trying to update firstName or lastName
  // Only COMPANY_MANAGER can update these fields
  if ((firstName !== undefined || lastName !== undefined) && req.user.role !== UserRole.COMPANY_MANAGER) {
    throw new ForbiddenError('Only administrators can update first name and last name');
  }

  const updateData: any = {
    email,
    phone,
    updatedAt: new Date(),
  };

  // Only include firstName and lastName if user is COMPANY_MANAGER
  if (req.user.role === UserRole.COMPANY_MANAGER) {
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: updateData,
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  logger.info(`User ${req.user.username} updated profile`);

  const response: ApiResponse = {
    success: true,
    message: 'Profile updated successfully',
    data: { user: updatedUser },
  };

  res.status(200).json(response);
});

// Change password
export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ValidationError('Current password and new password are required');
  }

  if (newPassword.length < 6) {
    throw new ValidationError('New password must be at least 6 characters long');
  }

  // Get current user with password
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      username: true,
      passwordHash: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  // Verify current password
  const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValidPassword) {
    throw new UnauthorizedError('Current password is incorrect');
  }

  // Hash new password
  const saltRounds = 12;
  const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

  // Update password
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      passwordHash: newPasswordHash,
      updatedAt: new Date(),
    },
  });

  logger.info(`User ${user.username} changed password`);

  const response: ApiResponse = {
    success: true,
    message: 'Password changed successfully',
  };

  res.status(200).json(response);
});

// Verify token (for frontend to check if token is still valid)
export const verifyToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // If we reach here, the token is valid (middleware already verified it)
  const response: ApiResponse = {
    success: true,
    message: 'Token is valid',
    data: {
      user: req.user,
    },
  };

  res.status(200).json(response);
});

// Logout
export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  if (req.user) {
    // Get token from header
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      try {
        // Invalidate the current session
        await prisma.userSession.updateMany({
          where: {
            userId: req.user.id,
            token,
            isActive: true
          },
          data: { isActive: false }
        });
      } catch (sessionError: any) {
        // If UserSession table doesn't exist yet, just log and continue
        if (sessionError.code === 'P2021' || sessionError.message?.includes('does not exist')) {
          logger.warn('UserSession table not found - logout still successful');
        } else {
          throw sessionError;
        }
      }
    }
    
    logger.info(`User ${req.user.username} logged out`);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Logged out successfully',
  };

  res.status(200).json(response);
});
