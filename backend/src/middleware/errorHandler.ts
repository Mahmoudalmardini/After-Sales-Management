import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError, ApiResponse } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config/config';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors: Record<string, string[]> = {};

  // Log error details
  logger.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Handle different types of errors
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle Prisma errors
    // Log prisma code and meta for diagnostics
    logger.error('PrismaClientKnownRequestError', {
      code: (error as any).code,
      meta: (error as any).meta,
    });
    switch (error.code) {
      case 'P2002':
        statusCode = 409;
        message = 'Duplicate entry found';
        if (error.meta?.target) {
          const field = Array.isArray(error.meta.target) 
            ? error.meta.target[0] 
            : error.meta.target;
          errors[field as string] = [`${field} already exists`];
        }
        break;
      case 'P2025':
        statusCode = 404;
        message = 'Resource not found';
        break;
      case 'P2003':
        statusCode = 400;
        message = 'Foreign key constraint failed';
        break;
      case 'P2014':
        statusCode = 400;
        message = 'Invalid ID provided';
        break;
      default:
        statusCode = 400;
        message = 'Database operation failed';
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    message = 'Invalid data provided';
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    // Parse validation errors if available
    if (error.message.includes('validation failed')) {
      errors.validation = [error.message];
    }
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if (error.name === 'MulterError') {
    statusCode = 400;
    switch (error.message) {
      case 'File too large':
        message = 'File size too large';
        break;
      case 'Too many files':
        message = 'Too many files uploaded';
        break;
      default:
        message = 'File upload error';
    }
  }

  // Prepare response
  const response: ApiResponse = {
    success: false,
    message,
  };

  // Add errors if any
  if (Object.keys(errors).length > 0) {
    response.errors = errors;
  }

  // Add stack trace in development
  if (config.isDevelopment && error.stack) {
    response.data = { stack: error.stack };
  }

  // Send error response with optional diagnostics header (non-sensitive)
  if ((error as any).code && typeof (error as any).code === 'string') {
    res.setHeader('X-Error-Code', (error as any).code);
  }
  res.status(statusCode).json(response);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
