import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SparePartLog {
  id: number;
  sparePartId: number;
  action: 'USED_IN_REQUEST' | 'UPDATED' | 'QUANTITY_ADJUSTED';
  message: string;
  performedBy: string;
  details?: string;
  createdAt: Date;
}

/**
 * Log when a spare part is used in a request
 */
export const logPartUsedInRequest = async (
  sparePartId: number,
  sparePartName: string,
  quantity: number,
  requestNumber: string,
  performedBy: string
): Promise<void> => {
  try {
    const message = `تم استخدام ${quantity} قطعة من "${sparePartName}" في الطلب ${requestNumber}`;
    
    await prisma.sparePartHistory.create({
      data: {
        sparePartId,
        changedById: 0, // System log
        changeType: 'USED_IN_REQUEST',
        description: message,
        fieldChanged: 'presentPieces',
        quantityChange: -quantity,
      },
    });
    
    console.log('✅ Spare part usage logged:', message);
  } catch (error) {
    console.error('❌ Error logging spare part usage:', error);
    // Don't throw - logging should not break the main operation
  }
};

/**
 * Log when a spare part is updated by warehouse keeper
 */
export const logPartUpdate = async (
  sparePartId: number,
  sparePartName: string,
  changes: string[],
  performedBy: string
): Promise<void> => {
  try {
    const message = `${performedBy} قام بتحديث "${sparePartName}" - التغييرات: ${changes.join(', ')}`;
    
    await prisma.sparePartHistory.create({
      data: {
        sparePartId,
        changedById: 0, // System log
        changeType: 'UPDATED',
        description: message,
      },
    });
    
    console.log('✅ Spare part update logged:', message);
  } catch (error) {
    console.error('❌ Error logging spare part update:', error);
    // Don't throw - logging should not break the main operation
  }
};

/**
 * Get spare part logs
 */
export const getSparePartLogs = async (
  sparePartId?: number,
  limit: number = 50
): Promise<any[]> => {
  try {
    const where = sparePartId 
      ? { sparePartId }
      : {};

    const logs = await prisma.sparePartHistory.findMany({
      where,
      include: {
        sparePart: {
          select: {
            id: true,
            name: true,
            partNumber: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs;
  } catch (error) {
    console.error('❌ Error fetching spare part logs:', error);
    return [];
  }
};

/**
 * Get all recent spare part logs (for سجل view)
 */
export const getAllRecentLogs = async (limit: number = 100): Promise<any[]> => {
  return getSparePartLogs(undefined, limit);
};
