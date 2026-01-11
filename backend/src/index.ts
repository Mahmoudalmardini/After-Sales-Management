import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { config } from './config/config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import departmentRoutes from './routes/department.routes';
import customerRoutes from './routes/customer.routes';
import productRoutes from './routes/product.routes';
import requestRoutes from './routes/request.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportRoutes from './routes/report.routes';
import { exportRoutes } from './routes/export.routes';
import storageRoutes from './routes/storage.routes';
import requestPartsRoutes from './routes/request-parts.routes';
import statusRoutes from './routes/status.routes';
import sparePartRequestRoutes from './routes/sparePartRequest.routes';
import technicianReportRoutes from './routes/technicianReport.routes';

// Initialize Prisma Client
export const prisma = new PrismaClient();

// Function to ensure admin user exists
async function ensureAdminUser() {
  try {
    const adminUsername = 'admin';
    const adminPassword = 'admin123';

    // Check if admin user exists
    const existingAdmin = await prisma.user.findUnique({
      where: { username: adminUsername }
    });

    if (existingAdmin) {
      logger.info(`Admin user '${adminUsername}' already exists`);
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash(adminPassword, 12);

    const adminUser = await prisma.user.create({
      data: {
        username: adminUsername,
        email: 'admin@company.com',
        passwordHash: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        phone: '+963911234567',
        role: 'COMPANY_MANAGER',
        isActive: true,
        preferredCurrency: 'SYP'
      }
    });

    logger.info(`✅ Admin user '${adminUsername}' created successfully with password '${adminPassword}'`);
    logger.info(`Admin user ID: ${adminUser.id}, Role: ${adminUser.role}`);

  } catch (error) {
    logger.error('Failed to ensure admin user exists:', error);
    // Don't throw error to prevent server startup failure
  }
}

const app = express();

// Security middleware
app.use(helmet());

// Trust proxy to avoid express-rate-limit X-Forwarded-For errors behind dev proxy
app.set('trust proxy', 1);
const corsWhitelist = [
  ...(config.corsOrigin?.split(',').map(o => o.trim()) || []),
  'http://127.0.0.1:3000',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    try {
      // Allow server-to-server or same-origin requests (no Origin header)
      if (!origin) return callback(null, true);

      // Explicit whitelist match
      if (corsWhitelist.includes(origin)) return callback(null, true);

      // Allow Railway app subdomains automatically in production
      const hostname = new URL(origin).hostname;
      if (hostname.endsWith('.up.railway.app')) return callback(null, true);

      return callback(new Error('Not allowed by CORS'));
    } catch {
      // If parsing origin fails, deny
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Try to check database connection, but don't fail if it's not available
    let dbConnected = false;
    let userCount = 0;
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 3000))
      ]);
      userCount = await prisma.user.count().catch(() => 0);
      dbConnected = true;
    } catch (dbError) {
      // Database not available - return health check anyway
      dbConnected = false;
    }

    const statusCode = dbConnected ? 200 : 503; // Service Unavailable if DB not connected
    res.status(statusCode).json({
      status: dbConnected ? 'OK' : 'DEGRADED',
      message: 'After-Sales Service API is running',
      timestamp: new Date().toISOString(),
      db: { connected: dbConnected, userCount },
    });
  } catch (e) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);

// Protected routes (authentication required)
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/departments', authenticateToken, departmentRoutes);
app.use('/api/customers', authenticateToken, customerRoutes);
app.use('/api/products', authenticateToken, productRoutes);
app.use('/api/requests', authenticateToken, requestRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);
app.use('/api/export', authenticateToken, exportRoutes);
app.use('/api/reports', authenticateToken, reportRoutes);
app.use('/api/storage', authenticateToken, storageRoutes);
app.use('/api/request-parts', authenticateToken, requestPartsRoutes);
app.use('/api/statuses', authenticateToken, statusRoutes);
app.use('/api/spare-part-requests', sparePartRequestRoutes);
app.use('/api/technician-reports', technicianReportRoutes);

// Serve static files from React build (for production)
if (config.nodeEnv === 'production') {
  const buildPath = path.join(__dirname, 'public');
  app.use(express.static(buildPath));

  // Catch all handler: send back React's index.html file for any non-API routes
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    return res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested endpoint ${req.originalUrl} does not exist.`,
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = config.port || 3001;

async function startServer() {
  try {
    // Test database connection with retry logic
    let dbConnected = false;
    const maxDbRetries = 5;
    const dbRetryDelay = 3000; // 3 seconds

    for (let attempt = 1; attempt <= maxDbRetries; attempt++) {
      try {
        await Promise.race([
          prisma.$connect(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timeout')), 5000)
          )
        ]);
        logger.info('Connected to database successfully');
        dbConnected = true;
        break;
      } catch (dbError) {
        if (attempt === maxDbRetries) {
          logger.warn(`Failed to connect to database after ${maxDbRetries} attempts:`, dbError);
          logger.warn('Server will start anyway - database operations will fail until connection is established');
          logger.warn('Make sure DATABASE_URL is correct and PostgreSQL service is running');
        } else {
          logger.warn(`Database connection attempt ${attempt}/${maxDbRetries} failed, retrying in ${dbRetryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, dbRetryDelay));
        }
      }
    }

    // Ensure admin user exists (only if database is connected)
    if (dbConnected) {
      try {
        await ensureAdminUser();
      } catch (adminError) {
        logger.warn('Failed to ensure admin user:', adminError);
        // Continue anyway - admin user setup can be retried later
      }
    }

    // Start server even if database isn't connected
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📱 Environment: ${config.nodeEnv}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
      if (!dbConnected) {
        logger.warn('⚠️  Database not connected - some features may not work');
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
