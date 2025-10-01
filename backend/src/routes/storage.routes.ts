import { Router } from 'express';
import { prisma } from '../index';
import { ApiResponse, ValidationError, UserRole } from '../types';
import { authenticateToken, requireRoles, isManagerLevel } from '../middleware/auth';
import * as notificationService from '../services/notification.service';
import { logPartUpdate, getAllRecentLogs } from '../services/sparePart.service';

const router = Router();

// Generate unique part number
const generatePartNumber = async (): Promise<string> => {
  const today = new Date();
  const year = today.getFullYear().toString().slice(-2);
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  
  const prefix = `PART${year}${month}${day}`;
  
  // Get the count of parts created today
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  const todayCount = await prisma.sparePart.count({
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

// Log spare part history
const logSparePartHistory = async (
  sparePartId: number,
  changedById: number,
  changeType: string,
  description: string,
  fieldChanged?: string,
  oldValue?: string,
  newValue?: string,
  quantityChange?: number,
  requestId?: number
) => {
  try {
    const history = await prisma.sparePartHistory.create({
      data: {
        sparePartId,
        changedById,
        changeType,
        fieldChanged,
        oldValue,
        newValue,
        quantityChange,
        description,
        requestId,
      },
    });
    console.log('✅ Spare part history created:', history);
    return history;
  } catch (error) {
    console.error('❌ Error creating spare part history:', error);
    throw error;
  }
};

// Apply authentication and manager-only access to all storage routes
router.use(authenticateToken);
// Allow managers and warehouse keepers; managers view-only enforced per route
router.use(requireRoles([
  UserRole.COMPANY_MANAGER,
  UserRole.DEPUTY_MANAGER,
  UserRole.DEPARTMENT_MANAGER,
  UserRole.SECTION_SUPERVISOR,
  UserRole.WAREHOUSE_KEEPER,
]));

/**
 * @route   GET /api/storage
 * @desc    Get all spare parts with optional search and pagination
 * @access  Private (Manager only)
 */
router.get('/', async (req, res) => {
  const { page = 1, limit = 20, search, category, lowStock } = req.query as any;

  const where: any = {};
  if (search) {
    // SQLite doesn't support mode: 'insensitive', so we use contains without mode
    where.OR = [
      { name: { contains: String(search) } },
      { partNumber: { contains: String(search) } }, // Alphanumeric search
    ];
  }
  if (category) where.category = String(category);
  if (lowStock === 'true') {
    where.presentPieces = { lte: prisma.sparePart.fields.minQuantity };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [spareParts, total] = await Promise.all([
    prisma.sparePart.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        department: { select: { id: true, name: true } },
      },
    }),
    prisma.sparePart.count({ where }),
  ]);

  const response: ApiResponse = {
    success: true,
    data: { spareParts },
    meta: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
  };

  res.status(200).json(response);
});

/**
 * @route   GET /api/storage/categories
 * @desc    Get all spare part categories
 * @access  Private
 */
router.get('/categories', async (req, res) => {
  const categories = await prisma.sparePart.findMany({
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  const response: ApiResponse = {
    success: true,
    data: { categories: categories.map(c => c.category) },
  };

  res.status(200).json(response);
});

/**
 * @route   GET /api/storage/logs
 * @desc    Get spare parts logs (سجل)
 * @access  Private
 */
router.get('/logs', async (req, res) => {
  const { limit = 100 } = req.query;
  
  console.log('📋 Fetching spare parts logs...');
  
  try {
    const logs = await getAllRecentLogs(Number(limit));
    
    console.log(`📊 Found ${logs.length} logs`);
    
    const response: ApiResponse = {
      success: true,
      data: { logs },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Error fetching spare parts logs:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to fetch logs',
    };
    res.status(500).json(response);
  }
});

/**
 * @route   GET /api/storage/:id/history
 * @desc    Get spare part history
 * @access  Private (Admin, Warehouse Keeper)
 */
router.get('/:id/history', async (req, res) => {
  const { id } = req.params;
  
  console.log('📋 Fetching history for spare part ID:', id);
  
  try {
    const history = await prisma.sparePartHistory.findMany({
      where: { sparePartId: Number(id) },
      include: {
        changedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
        sparePart: {
          select: {
            id: true,
            name: true,
            partNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`📊 Found ${history.length} history records for spare part ${id}`);
    
    const response: ApiResponse = {
      success: true,
      data: { history },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('❌ Error fetching spare part history:', error);
    const response: ApiResponse = {
      success: false,
      message: 'Failed to fetch history',
    };
    res.status(500).json(response);
  }
});

/**
 * @route   GET /api/storage/:id
 * @desc    Get spare part by ID
 * @access  Private
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const numId = Number(id);
  if (!Number.isInteger(numId)) {
    const error = new ValidationError('Invalid spare part id');
    res.status(400).json({ success: false, message: error.message });
    return;
  }

  const sparePart = await prisma.sparePart.findUnique({
    where: { id: numId },
    include: {
      requestParts: {
        include: {
          request: true,
          addedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!sparePart) {
    const error = new ValidationError('Spare part not found');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  const response: ApiResponse = {
    success: true,
    data: { sparePart },
  };

  res.status(200).json(response);
});

/**
 * @route   POST /api/storage
 * @desc    Create new spare part
 * @access  Private
 */
router.post('/', async (req: any, res) => {
  // Only warehouse keeper can create
  if (req.user?.role !== UserRole.WAREHOUSE_KEEPER) {
    const error = new ValidationError('Only warehouse keeper can create spare parts');
    res.status(403).json({ success: false, message: error.message });
    return;
  }
  const { 
    name, 
    unitPrice = 0, 
    quantity = 0, 
    description,
    departmentId,
  } = req.body;

  if (!name) {
    const error = new ValidationError('name is required');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  // Auto-generate part number
  const partNumber = await generatePartNumber();

  const { presentPieces = 0 } = req.body;

  const sparePart = await prisma.sparePart.create({
    data: {
      name: String(name),
      partNumber, // Auto-generated alphanumeric identifier
      presentPieces: Number(presentPieces) || 0, // Number of present pieces
      category: 'GENERAL', // Default category
      quantity: typeof quantity === 'number' ? quantity : 0,
      minQuantity: 5, // Default min quantity
      unitPrice: Number(unitPrice) || 0,
      currency: 'SYP', // Default currency
      supplier: null,
      location: null,
      description: description ? String(description) : null,
      departmentId: departmentId ? Number(departmentId) : null,
    },
  });

  // Activity logging removed to prevent issues
  // const userFullName = `${req.user!.firstName || 'Unknown'} ${req.user!.lastName || 'User'}`;
  // await logSparePartHistory(...)

  // Send notification to managers and supervisors
  const firstName = req.user!.firstName || 'Unknown';
  const lastName = req.user!.lastName || 'User';
  const warehouseKeeperName = `${firstName} ${lastName}`;
  await notificationService.createWarehouseNotification(
    'ADDED',
    sparePart.name,
    warehouseKeeperName,
    req.user!.departmentId
  );

  const response: ApiResponse = {
    success: true,
    message: 'Spare part created successfully',
    data: { sparePart },
  };

  res.status(201).json(response);
});

/**
 * @route   PUT /api/storage/:id
 * @desc    Update spare part
 * @access  Private
 */
router.put('/:id', async (req: any, res) => {
  // Only warehouse keeper can update
  if (req.user?.role !== UserRole.WAREHOUSE_KEEPER) {
    const error = new ValidationError('Only warehouse keeper can update spare parts');
    res.status(403).json({ success: false, message: error.message });
    return;
  }
  const { id } = req.params;
  const { 
    name, 
    partNumber, 
    unitPrice, 
    quantity, 
    description,
    departmentId,
    changeReason,
  } = req.body;

  if (!name || !partNumber) {
    const error = new ValidationError('name and partNumber are required');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  // Require change reason for updates
  if (!changeReason || changeReason.trim() === '') {
    const error = new ValidationError('سبب التعديل مطلوب');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  // Check if spare part exists
  const existingPart = await prisma.sparePart.findUnique({
    where: { id: Number(id) },
    include: { department: true },
  });

  if (!existingPart) {
    const error = new ValidationError('Spare part not found');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  // Check if part number already exists (excluding current part)
  if (partNumber !== existingPart.partNumber) {
    const duplicatePart = await prisma.sparePart.findUnique({
      where: { partNumber: String(partNumber) },
    });

    if (duplicatePart) {
      const error = new ValidationError('Part number already exists');
      res.status(error.statusCode).json({ success: false, message: error.message });
      return;
    }
  }

  const { presentPieces } = req.body;

  const sparePart = await prisma.sparePart.update({
    where: { id: Number(id) },
    data: {
      name: String(name),
      partNumber: String(partNumber), // Alphanumeric identifier
      presentPieces: presentPieces !== undefined ? Number(presentPieces) : undefined,
      quantity: Number(quantity),
      unitPrice: Number(unitPrice),
      currency: req.body.currency || existingPart.currency,
      description: description ? String(description) : null,
      departmentId: departmentId ? Number(departmentId) : null,
    },
  });

  // Track changes for logging with detailed before/after values
  const changes: string[] = [];
  const detailedChanges: Array<{
    field: string;
    fieldAr: string;
    oldValue: string;
    newValue: string;
  }> = [];

  const firstName = req.user!.firstName || 'Unknown';
  const lastName = req.user!.lastName || 'User';
  const warehouseKeeperName = `${firstName} ${lastName}`;

  // Track each field change with before/after values
  if (existingPart.name !== sparePart.name) {
    changes.push('الاسم');
    detailedChanges.push({
      field: 'name',
      fieldAr: 'الاسم',
      oldValue: existingPart.name,
      newValue: sparePart.name,
    });
  }
  if (existingPart.presentPieces !== sparePart.presentPieces) {
    changes.push('عدد القطع');
    detailedChanges.push({
      field: 'presentPieces',
      fieldAr: 'عدد القطع',
      oldValue: String(existingPart.presentPieces),
      newValue: String(sparePart.presentPieces),
    });
  }
  if (existingPart.unitPrice !== sparePart.unitPrice) {
    changes.push('السعر');
    detailedChanges.push({
      field: 'unitPrice',
      fieldAr: 'السعر',
      oldValue: `${existingPart.unitPrice} ${existingPart.currency}`,
      newValue: `${sparePart.unitPrice} ${sparePart.currency}`,
    });
  }
  if (existingPart.currency !== sparePart.currency) {
    changes.push('العملة');
    detailedChanges.push({
      field: 'currency',
      fieldAr: 'العملة',
      oldValue: existingPart.currency,
      newValue: sparePart.currency,
    });
  }
  if (existingPart.description !== sparePart.description) {
    changes.push('الوصف');
    detailedChanges.push({
      field: 'description',
      fieldAr: 'الوصف',
      oldValue: existingPart.description || 'غير محدد',
      newValue: sparePart.description || 'غير محدد',
    });
  }
  if (existingPart.quantity !== sparePart.quantity) {
    changes.push('الكمية');
    detailedChanges.push({
      field: 'quantity',
      fieldAr: 'الكمية',
      oldValue: String(existingPart.quantity),
      newValue: String(sparePart.quantity),
    });
  }
  if (existingPart.departmentId !== sparePart.departmentId) {
    changes.push('القسم');
    detailedChanges.push({
      field: 'departmentId',
      fieldAr: 'القسم',
      oldValue: existingPart.department?.name || 'غير محدد',
      newValue: sparePart.departmentId ? 
        (await prisma.department.findUnique({ where: { id: sparePart.departmentId } }))?.name || 'غير محدد' 
        : 'غير محدد',
    });
  }

  // Log each change with detailed information
  if (detailedChanges.length > 0) {
    const userId = req.user!.id;
    
    // Create detailed history entries for each changed field
    for (const change of detailedChanges) {
      await logSparePartHistory(
        sparePart.id,
        userId,
        'UPDATED',
        `${warehouseKeeperName} قام بتحديث ${change.fieldAr} - السبب: ${changeReason}`,
        change.field,
        change.oldValue,
        change.newValue
      );
    }

    // Also create a summary log entry with all changes
    const changesSummary = detailedChanges.map(c => 
      `${c.fieldAr}: من "${c.oldValue}" إلى "${c.newValue}"`
    ).join(' | ');
    
    await logSparePartHistory(
      sparePart.id,
      userId,
      'UPDATED',
      `${warehouseKeeperName} قام بتحديث "${sparePart.name}" - التغييرات: ${changesSummary} - السبب: ${changeReason}`
    );

    // Emit real-time notification with detailed changes
    await logPartUpdate(
      sparePart.id, 
      sparePart.name, 
      changes, 
      warehouseKeeperName, 
      sparePart.partNumber,
      changeReason,
      detailedChanges
    );
  }
  
  // Send notification to managers with details
  const changeDetails = changes.length > 0 ? ` - التغييرات: ${changes.join(', ')}` : '';
  await notificationService.createWarehouseNotification(
    'MODIFIED',
    sparePart.name + changeDetails + ` - السبب: ${changeReason}`,
    warehouseKeeperName,
    req.user!.departmentId
  );

  const response: ApiResponse = {
    success: true,
    message: 'Spare part updated successfully',
    data: { sparePart },
  };

  res.status(200).json(response);
});

/**
 * @route   DELETE /api/storage/:id
 * @desc    Delete spare part
 * @access  Private
 */
router.delete('/:id', async (req: any, res) => {
  console.log('🗑️  DELETE request for spare part ID:', req.params.id);
  
  // Only warehouse keeper can delete
  if (req.user?.role !== UserRole.WAREHOUSE_KEEPER) {
    const error = new ValidationError('Only warehouse keeper can delete spare parts');
    res.status(403).json({ success: false, message: error.message });
    return;
  }
  const { id } = req.params;

  // Check if spare part exists
  console.log('🔍 Looking for spare part with ID:', Number(id));
  const existingPart = await prisma.sparePart.findUnique({
    where: { id: Number(id) },
    include: { requestParts: true },
  });

  if (!existingPart) {
    console.log('❌ Spare part not found with ID:', id);
    const error = new ValidationError('Spare part not found');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }
  
  console.log('✅ Found spare part:', existingPart.name, 'with', existingPart.requestParts.length, 'request parts');

  // Check if spare part is used in any requests
  if (existingPart.requestParts.length > 0) {
    const error = new ValidationError('Cannot delete spare part that is used in requests');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  // Get user's full name for logging
  const userFullName = `${req.user!.firstName || 'Unknown'} ${req.user!.lastName || 'User'}`;
  
  // Activity logging removed to prevent issues
  console.log('📝 Skipping deletion logging...');

  console.log('🗑️  Deleting spare part from database...');
  await prisma.sparePart.delete({
    where: { id: Number(id) },
  });
  console.log('✅ Spare part deleted successfully');

  // Send notification to managers and supervisors
  console.log('📢 Sending deletion notification...');
  const warehouseKeeperName = userFullName;
  try {
    await notificationService.createWarehouseNotification(
      'DELETED',
      existingPart.name,
      warehouseKeeperName,
      req.user!.departmentId
    );
    console.log('✅ Notification sent successfully');
  } catch (notificationError) {
    console.error('❌ Failed to send deletion notification:', notificationError);
    console.error('Notification error details:', notificationError instanceof Error ? notificationError.message : String(notificationError));
    // Continue even if notification fails
  }

  const response: ApiResponse = {
    success: true,
    message: 'Spare part deleted successfully',
  };

  res.status(200).json(response);
});


/**
 * @route   POST /api/storage/:id/adjust-quantity
 * @desc    Adjust spare part quantity
 * @access  Private
 */
router.post('/:id/adjust-quantity', async (req: any, res) => {
  // Only warehouse keeper can adjust quantity
  if (req.user?.role !== UserRole.WAREHOUSE_KEEPER) {
    const error = new ValidationError('Only warehouse keeper can adjust quantities');
    res.status(403).json({ success: false, message: error.message });
    return;
  }
  const { id } = req.params;
  const { adjustment, reason } = req.body;

  if (!adjustment || typeof adjustment !== 'number') {
    const error = new ValidationError('adjustment is required and must be a number');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  const sparePart = await prisma.sparePart.findUnique({
    where: { id: Number(id) },
  });

  if (!sparePart) {
    const error = new ValidationError('Spare part not found');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  const newQuantity = sparePart.quantity + adjustment;
  if (newQuantity < 0) {
    const error = new ValidationError('Quantity cannot be negative');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  const updatedPart = await prisma.sparePart.update({
    where: { id: Number(id) },
    data: { quantity: newQuantity },
  });

  const response: ApiResponse = {
    success: true,
    message: 'Quantity adjusted successfully',
    data: { sparePart: updatedPart },
  };

  res.status(200).json(response);
});

export default router;
