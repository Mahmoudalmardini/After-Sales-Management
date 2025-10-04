import { Response } from 'express';
import { prisma } from '../index';
import { AuthenticatedRequest, ApiResponse, ValidationError, NotFoundError, ForbiddenError, SparePartRequestStatus, SparePartRequestUrgency, UserRole, NotificationType } from '../types';
import { createNotification } from '../services/notification.service';
import { logActivity } from '../services/activity.service';
import { ActivityType } from '../types';

// Create spare part request
export const createSparePartRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId, partName, partNumber, description, quantity, urgency } = req.body;

    if (!requestId || !partName || !description || !quantity) {
      throw new ValidationError('requestId, partName, description, and quantity are required');
    }

    if (!req.user) {
      throw new ValidationError('Authentication required');
    }

    // Check if user is a technician
    if (req.user.role !== UserRole.TECHNICIAN) {
      throw new ForbiddenError('Only technicians can create spare part requests');
    }

    // Check if request exists and technician has access
    const request = await prisma.request.findUnique({
      where: { id: Number(requestId) },
      select: {
        id: true,
        requestNumber: true,
        assignedTechnicianId: true,
        receivedById: true,
        departmentId: true
      }
    });

    if (!request) {
      throw new NotFoundError('Request not found');
    }

    // Check if technician has access to this request
    if (request.assignedTechnicianId !== req.user.id && request.receivedById !== req.user.id) {
      throw new ForbiddenError('You can only request spare parts for your assigned requests');
    }

    // Create the spare part request
    const sparePartRequest = await prisma.sparePartRequest.create({
      data: {
        requestId: Number(requestId),
        technicianId: req.user.id,
        partName: String(partName),
        partNumber: partNumber ? String(partNumber) : null,
        description: String(description),
        quantity: Number(quantity),
        urgency: urgency || SparePartRequestUrgency.NORMAL,
        status: SparePartRequestStatus.PENDING
      },
      include: {
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        request: {
          select: {
            id: true,
            requestNumber: true
          }
        }
      }
    });

    // Log activity
    await logActivity(
      Number(requestId),
      req.user.id,
      ActivityType.CREATED,
      `Spare part request created: ${partName} (Qty: ${quantity})`
    );

    // Create notification for admins and supervisors
    const adminsAndSupervisors = await prisma.user.findMany({
      where: {
        role: {
          in: [UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR]
        }
      },
      select: { id: true }
    });

    for (const admin of adminsAndSupervisors) {
      await createNotification({
        userId: admin.id,
        type: NotificationType.SPARE_PART_REQUEST,
        title: 'New Spare Part Request',
        message: `${req.user.firstName} ${req.user.lastName} requested spare part: ${partName} for request #${request.requestNumber}`,
        requestId: Number(requestId)
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Spare part request created successfully',
      data: { sparePartRequest }
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Error creating spare part request:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create spare part request'
    });
  }
};

// Get spare part requests
export const getSparePartRequests = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, requestId, technicianId } = req.query;

    if (!req.user) {
      throw new ValidationError('Authentication required');
    }

    const where: any = {};

    // Filter by status if provided
    if (status) {
      where.status = status;
    }

    // Filter by request ID if provided
    if (requestId) {
      where.requestId = Number(requestId);
    }

    // Filter by technician ID if provided
    if (technicianId) {
      where.technicianId = Number(technicianId);
    }

    // Role-based filtering
    if (req.user.role === UserRole.TECHNICIAN) {
      // Technicians can only see their own requests
      where.technicianId = req.user.id;
    } else if (req.user.role === UserRole.DEPARTMENT_MANAGER || req.user.role === UserRole.SECTION_SUPERVISOR) {
      // Department managers and supervisors can see requests from their department
      const userDepartment = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { departmentId: true }
      });

      if (userDepartment?.departmentId) {
        where.request = {
          departmentId: userDepartment.departmentId
        };
      }
    }
    // Company managers and deputy managers can see all requests

    const sparePartRequests = await prisma.sparePartRequest.findMany({
      where,
      include: {
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        request: {
          select: {
            id: true,
            requestNumber: true,
            customer: {
              select: {
                name: true
              }
            }
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        fulfilledBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const response: ApiResponse = {
      success: true,
      data: { sparePartRequests }
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error fetching spare part requests:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch spare part requests'
    });
  }
};

// Approve spare part request
export const approveSparePartRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      throw new ValidationError('Authentication required');
    }

    // Check if user can approve (admin or supervisor)
    if (![UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR].includes(req.user.role)) {
      throw new ForbiddenError('Only admins and supervisors can approve spare part requests');
    }

    const sparePartRequest = await prisma.sparePartRequest.findUnique({
      where: { id: Number(id) },
      include: {
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        request: {
          select: {
            id: true,
            requestNumber: true
          }
        }
      }
    });

    if (!sparePartRequest) {
      throw new NotFoundError('Spare part request not found');
    }

    if (sparePartRequest.status !== SparePartRequestStatus.PENDING) {
      throw new ValidationError('Only pending requests can be approved');
    }

    // Update the request status
    const updatedRequest = await prisma.sparePartRequest.update({
      where: { id: Number(id) },
      data: {
        status: SparePartRequestStatus.APPROVED,
        approvedById: req.user.id
      },
      include: {
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        request: {
          select: {
            id: true,
            requestNumber: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Log activity
    await logActivity(
      sparePartRequest.requestId,
      req.user.id,
      ActivityType.CREATED,
      `Spare part request approved: ${sparePartRequest.partName} (Qty: ${sparePartRequest.quantity})`
    );

    // Notify technician
    await createNotification({
      userId: sparePartRequest.technicianId,
      type: NotificationType.SPARE_PART_APPROVED,
      title: 'Spare Part Request Approved',
      message: `Your request for ${sparePartRequest.partName} has been approved by ${req.user.firstName} ${req.user.lastName}`,
      requestId: sparePartRequest.requestId
    });

    // Notify warehouse keepers
    const warehouseKeepers = await prisma.user.findMany({
      where: { role: UserRole.WAREHOUSE_KEEPER },
      select: { id: true }
    });

    for (const keeper of warehouseKeepers) {
      await createNotification({
        userId: keeper.id,
        type: NotificationType.SPARE_PART_REQUEST,
        title: 'Spare Part Request Approved - Action Required',
        message: `Please add spare part: ${sparePartRequest.partName} (Qty: ${sparePartRequest.quantity}) to inventory`,
        requestId: sparePartRequest.requestId
      });
    }

    const response: ApiResponse = {
      success: true,
      message: 'Spare part request approved successfully',
      data: { sparePartRequest: updatedRequest }
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error approving spare part request:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to approve spare part request'
    });
  }
};

// Reject spare part request
export const rejectSparePartRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim() === '') {
      throw new ValidationError('Rejection reason is required');
    }

    if (!req.user) {
      throw new ValidationError('Authentication required');
    }

    // Check if user can reject (admin or supervisor)
    if (![UserRole.COMPANY_MANAGER, UserRole.DEPUTY_MANAGER, UserRole.DEPARTMENT_MANAGER, UserRole.SECTION_SUPERVISOR].includes(req.user.role)) {
      throw new ForbiddenError('Only admins and supervisors can reject spare part requests');
    }

    const sparePartRequest = await prisma.sparePartRequest.findUnique({
      where: { id: Number(id) },
      include: {
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        request: {
          select: {
            id: true,
            requestNumber: true
          }
        }
      }
    });

    if (!sparePartRequest) {
      throw new NotFoundError('Spare part request not found');
    }

    if (sparePartRequest.status !== SparePartRequestStatus.PENDING) {
      throw new ValidationError('Only pending requests can be rejected');
    }

    // Update the request status
    const updatedRequest = await prisma.sparePartRequest.update({
      where: { id: Number(id) },
      data: {
        status: SparePartRequestStatus.REJECTED,
        approvedById: req.user.id,
        rejectionReason: String(rejectionReason)
      },
      include: {
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        request: {
          select: {
            id: true,
            requestNumber: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Log activity
    await logActivity(
      sparePartRequest.requestId,
      req.user.id,
      ActivityType.CREATED,
      `Spare part request rejected: ${sparePartRequest.partName} - Reason: ${rejectionReason}`
    );

    // Notify technician
    await createNotification({
      userId: sparePartRequest.technicianId,
      type: NotificationType.SPARE_PART_REJECTED,
      title: 'Spare Part Request Rejected',
      message: `Your request for ${sparePartRequest.partName} has been rejected. Reason: ${rejectionReason}`,
      requestId: sparePartRequest.requestId
    });

    const response: ApiResponse = {
      success: true,
      message: 'Spare part request rejected successfully',
      data: { sparePartRequest: updatedRequest }
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error rejecting spare part request:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to reject spare part request'
    });
  }
};

// Mark spare part request as fulfilled (by warehouse keeper)
export const fulfillSparePartRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      throw new ValidationError('Authentication required');
    }

    // Check if user is a warehouse keeper
    if (req.user.role !== UserRole.WAREHOUSE_KEEPER) {
      throw new ForbiddenError('Only warehouse keepers can fulfill spare part requests');
    }

    const sparePartRequest = await prisma.sparePartRequest.findUnique({
      where: { id: Number(id) },
      include: {
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        request: {
          select: {
            id: true,
            requestNumber: true
          }
        }
      }
    });

    if (!sparePartRequest) {
      throw new NotFoundError('Spare part request not found');
    }

    if (sparePartRequest.status !== SparePartRequestStatus.APPROVED) {
      throw new ValidationError('Only approved requests can be fulfilled');
    }

    // Update the request status
    const updatedRequest = await prisma.sparePartRequest.update({
      where: { id: Number(id) },
      data: {
        status: SparePartRequestStatus.FULFILLED,
        fulfilledById: req.user.id
      },
      include: {
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        request: {
          select: {
            id: true,
            requestNumber: true
          }
        },
        fulfilledBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Log activity
    await logActivity(
      sparePartRequest.requestId,
      req.user.id,
      ActivityType.CREATED,
      `Spare part request fulfilled: ${sparePartRequest.partName} (Qty: ${sparePartRequest.quantity})`
    );

    // Notify technician
    await createNotification({
      userId: sparePartRequest.technicianId,
      type: NotificationType.SPARE_PART_APPROVED,
      title: 'Spare Part Request Fulfilled',
      message: `Your request for ${sparePartRequest.partName} has been fulfilled and is ready for use`,
      requestId: sparePartRequest.requestId
    });

    const response: ApiResponse = {
      success: true,
      message: 'Spare part request fulfilled successfully',
      data: { sparePartRequest: updatedRequest }
    };

    res.status(200).json(response);
  } catch (error: any) {
    console.error('Error fulfilling spare part request:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fulfill spare part request'
    });
  }
};
