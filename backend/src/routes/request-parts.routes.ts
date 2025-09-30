import { Router } from 'express';
import { prisma } from '../index';
import { ApiResponse, ValidationError, UserRole, NotificationType } from '../types';
import { createNotification } from '../services/notification.service';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Apply authentication to all request-parts routes
router.use(authenticateToken);

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
  await prisma.sparePartHistory.create({
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
};

/**
 * @route   GET /api/request-parts/:requestId
 * @desc    Get all parts for a specific request
 * @access  Private
 */
router.get('/:requestId', async (req, res) => {
  const { requestId } = req.params;

  const requestParts = await prisma.requestPart.findMany({
    where: { requestId: Number(requestId) },
    include: {
      sparePart: true,
      addedBy: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const response: ApiResponse = {
    success: true,
    data: { requestParts },
  };

  res.status(200).json(response);
});

/**
 * @route   POST /api/request-parts
 * @desc    Add spare part to request
 * @access  Private
 */
router.post('/', async (req, res) => {
  const { requestId, sparePartId, quantityUsed, addedById } = req.body;

  if (!requestId || !sparePartId || !quantityUsed || !addedById) {
    const error = new ValidationError('requestId, sparePartId, quantityUsed, and addedById are required');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  // Check if request exists
  const request = await prisma.request.findUnique({
    where: { id: Number(requestId) },
  });

  if (!request) {
    const error = new ValidationError('Request not found');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  // Check if spare part exists
  const sparePart = await prisma.sparePart.findUnique({
    where: { id: Number(sparePartId) },
  });

  if (!sparePart) {
    const error = new ValidationError('Spare part not found');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  // Check if enough quantity is available
  if (sparePart.presentPieces < Number(quantityUsed)) {
    const error = new ValidationError('Insufficient quantity in stock');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  const totalCost = Number(quantityUsed) * sparePart.unitPrice;

  // Create request part and update spare part quantity in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create request part
    const requestPart = await tx.requestPart.create({
      data: {
        requestId: Number(requestId),
        sparePartId: Number(sparePartId),
        quantityUsed: Number(quantityUsed),
        unitPrice: sparePart.unitPrice,
        totalCost,
        addedById: Number(addedById),
      },
      include: {
        sparePart: true,
        addedBy: { select: { firstName: true, lastName: true } },
        request: {
          include: {
            receivedBy: { select: { id: true, firstName: true, lastName: true } },
            assignedTechnician: { select: { id: true, firstName: true, lastName: true } },
            department: { select: { id: true, name: true } }
          }
        }
      },
    });

    // Update spare part quantity
    const updatedSparePart = await tx.sparePart.update({
      where: { id: Number(sparePartId) },
      data: {
        presentPieces: sparePart.presentPieces - Number(quantityUsed),
      },
    });

    return { requestPart, updatedSparePart };
  });

  // Send notifications and log history after inventory update
  const { requestPart, updatedSparePart } = result;
  const addedByName = `${requestPart.addedBy.firstName} ${requestPart.addedBy.lastName}`;
  
  // Log history with proper error handling and detailed information
  try {
    const historyDescription = `${addedByName} قام بإضافة ${quantityUsed} قطعة من "${sparePart.name}" للطلب ${requestPart.request.requestNumber} - الكمية المتبقية: ${updatedSparePart.presentPieces} (تم التقليل بمقدار ${quantityUsed})`;
    
    await logSparePartHistory(
      Number(sparePartId),
      Number(addedById),
      'USED_IN_REQUEST',
      historyDescription,
      'presentPieces',
      String(sparePart.presentPieces),
      String(updatedSparePart.presentPieces),
      -Number(quantityUsed),
      Number(requestId)
    );
    
    console.log(`✅ Spare part history logged: ${sparePart.name} used in request ${requestPart.request.requestNumber}`);
  } catch (error) {
    console.error('❌ Error logging spare part history:', error);
    // Don't throw error - we still want the operation to succeed even if logging fails
  }
  
  // Notify warehouse keeper about inventory decrease
  const warehouseKeepers = await prisma.user.findMany({
    where: {
      role: UserRole.WAREHOUSE_KEEPER,
      isActive: true,
    },
    select: { id: true }
  });

  for (const warehouseKeeper of warehouseKeepers) {
    await createNotification({
      userId: warehouseKeeper.id,
      requestId: Number(requestId),
      title: 'تم استخدام قطعة غيار',
      message: `${addedByName} استخدم ${quantityUsed} من ${requestPart.sparePart.name} للطلب ${requestPart.request.requestNumber}. الكمية المتبقية: ${updatedSparePart.presentPieces}`,
      type: NotificationType.WAREHOUSE_UPDATE,
      createdById: Number(addedById),
    });
  }

  // Notify admins and supervisors about inventory usage
  const managersAndSupervisors = await prisma.user.findMany({
    where: {
      OR: [
        { role: { in: [UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER] } },
        {
          departmentId: requestPart.request.department.id,
          role: { in: [UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR] },
        }
      ],
      isActive: true,
    },
    select: { id: true }
  });

  for (const manager of managersAndSupervisors) {
    await createNotification({
      userId: manager.id,
      requestId: Number(requestId),
      title: 'استخدام قطع الغيار',
      message: `تم استخدام ${quantityUsed} من ${requestPart.sparePart.name} في الطلب ${requestPart.request.requestNumber}`,
      type: NotificationType.WAREHOUSE_UPDATE,
      createdById: Number(addedById),
    });
  }

  const response: ApiResponse = {
    success: true,
    message: 'Spare part added to request successfully',
    data: { requestPart: result.requestPart },
  };

  res.status(201).json(response);
});

/**
 * @route   DELETE /api/request-parts/:id
 * @desc    Remove spare part from request
 * @access  Private
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  // Get request part with spare part info and user info
  const requestPart = await prisma.requestPart.findUnique({
    where: { id: Number(id) },
    include: { 
      sparePart: true,
      addedBy: { select: { firstName: true, lastName: true } },
      request: { select: { requestNumber: true } }
    },
  });

  if (!requestPart) {
    const error = new ValidationError('Request part not found');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  // Remove request part and restore quantity in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Delete request part
    await tx.requestPart.delete({
      where: { id: Number(id) },
    });

    // Restore presentPieces to spare part
    const updatedPart = await tx.sparePart.update({
      where: { id: requestPart.sparePartId },
      data: {
        presentPieces: requestPart.sparePart.presentPieces + requestPart.quantityUsed,
      },
    });
    
    return updatedPart;
  });

  // Log the removal in spare part history
  try {
    const userFullName = `${requestPart.addedBy.firstName} ${requestPart.addedBy.lastName}`;
    const historyDescription = `${userFullName} قام بإزالة ${requestPart.quantityUsed} قطعة من الطلب ${requestPart.request.requestNumber} - تمت إعادة القطع للمخزن (الكمية الجديدة: ${result.presentPieces})`;
    
    await logSparePartHistory(
      requestPart.sparePartId,
      requestPart.addedById,
      'QUANTITY_CHANGED',
      historyDescription,
      'presentPieces',
      String(requestPart.sparePart.presentPieces),
      String(result.presentPieces),
      requestPart.quantityUsed
    );
  } catch (error) {
    console.error('Error logging spare part removal:', error);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Spare part removed from request successfully',
  };

  res.status(200).json(response);
});

/**
 * @route   PUT /api/request-parts/:id
 * @desc    Update quantity of spare part in request
 * @access  Private
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { quantityUsed } = req.body;

  if (!quantityUsed || quantityUsed <= 0) {
    const error = new ValidationError('quantityUsed is required and must be greater than 0');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  // Get request part with spare part info and request details
  const requestPart = await prisma.requestPart.findUnique({
    where: { id: Number(id) },
    include: { 
      sparePart: true,
      addedBy: { select: { firstName: true, lastName: true } },
      request: { select: { requestNumber: true } }
    },
  });

  if (!requestPart) {
    const error = new ValidationError('Request part not found');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  const quantityDifference = Number(quantityUsed) - requestPart.quantityUsed;
  const newSparePartQuantity = requestPart.sparePart.presentPieces - quantityDifference;

  if (newSparePartQuantity < 0) {
    const error = new ValidationError('Insufficient quantity in stock');
    res.status(error.statusCode).json({ success: false, message: error.message });
    return;
  }

  const totalCost = Number(quantityUsed) * requestPart.sparePart.unitPrice;
  const oldQuantityUsed = requestPart.quantityUsed;

  // Update request part and spare part quantity in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update request part
    const updatedRequestPart = await tx.requestPart.update({
      where: { id: Number(id) },
      data: {
        quantityUsed: Number(quantityUsed),
        totalCost,
      },
      include: {
        sparePart: true,
        addedBy: { select: { firstName: true, lastName: true } },
      },
    });

    // Update spare part presentPieces
    const updatedSparePart = await tx.sparePart.update({
      where: { id: requestPart.sparePartId },
      data: {
        presentPieces: newSparePartQuantity,
      },
    });

    return { updatedRequestPart, updatedSparePart };
  });

  // Log the update in spare part history
  try {
    const userFullName = `${requestPart.addedBy.firstName} ${requestPart.addedBy.lastName}`;
    const changeText = quantityDifference > 0 
      ? `زيادة الكمية المستخدمة من ${oldQuantityUsed} إلى ${quantityUsed} (${quantityDifference}+ قطعة إضافية)`
      : `تقليل الكمية المستخدمة من ${oldQuantityUsed} إلى ${quantityUsed} (${Math.abs(quantityDifference)}- قطعة)`;
    
    const historyDescription = `${userFullName} قام بتعديل الكمية المستخدمة في الطلب ${requestPart.request.requestNumber} - ${changeText} - الكمية المتبقية في المخزن: ${result.updatedSparePart.presentPieces}`;
    
    await logSparePartHistory(
      requestPart.sparePartId,
      requestPart.addedById,
      'QUANTITY_CHANGED',
      historyDescription,
      'presentPieces',
      String(requestPart.sparePart.presentPieces),
      String(result.updatedSparePart.presentPieces),
      -quantityDifference
    );
  } catch (error) {
    console.error('Error logging spare part update:', error);
  }

  const response: ApiResponse = {
    success: true,
    message: 'Request part updated successfully',
    data: { requestPart: result.updatedRequestPart },
  };

  res.status(200).json(response);
});

export default router;
