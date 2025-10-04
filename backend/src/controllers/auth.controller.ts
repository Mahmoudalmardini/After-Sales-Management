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

  // Log successful login
  logger.info(`User ${user.username} logged in successfully`);

  // Note: updatedAt is managed by Prisma (@updatedAt). Avoid setting it manually.
  // If you want to track last login, add a dedicated lastLogin field in the schema.

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

// Logout (if implementing token blacklisting)
export const logout = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // For now, we'll just send a success response
  // In a production environment, you might want to implement token blacklisting
  
  if (req.user) {
    logger.info(`User ${req.user.username} logged out`);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Logged out successfully',
  };

  res.status(200).json(response);
});
