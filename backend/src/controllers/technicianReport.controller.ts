import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest, CreateTechnicianReportForm, TechnicianReportFilters, ValidationError, NotFoundError, ForbiddenError, NotificationType } from '../types';
import { logActivity } from '../services/activity.service';
import { createNotification } from '../services/notification.service';

const prisma = new PrismaClient();

export const createTechnicianReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId, reportContent, currentStatus, partsUsed, sendToSupervisor, sendToAdmin }: CreateTechnicianReportForm = req.body;
    const technicianId = req.user?.id;

    if (!technicianId) {
      throw new ForbiddenError('User not authenticated');
    }

    // Validate required fields
    if (!reportContent?.trim()) {
      throw new ValidationError('Report content is required');
    }

    // Check if request exists and technician has access
    const request = await prisma.request.findFirst({
      where: {
        id: requestId,
        OR: [
          { assignedTechnicianId: technicianId }
        ]
      },
      include: {
        customer: true
      }
    });

    if (!request) {
      throw new NotFoundError('Request not found or you do not have access to it');
    }

    // Create the report
    const report = await prisma.technicianReport.create({
      data: {
        requestId,
        technicianId,
        reportContent: reportContent.trim(),
        currentStatus,
        partsUsed,
        sendToSupervisor: sendToSupervisor || false,
        sendToAdmin: sendToAdmin || false,
      },
      include: {
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
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        }
      }
    });

    // Log activity
    await logActivity(
      requestId,
      technicianId,
      'CREATE_TECHNICIAN_REPORT' as any,
      `Created report for request ${request.requestNumber}`
    );

    // Send notifications if requested
    if (sendToSupervisor || sendToAdmin) {
      // Get supervisors and admins
      const recipients = await prisma.user.findMany({
        where: {
          OR: [
            ...(sendToSupervisor ? [{ role: 'SECTION_SUPERVISOR' }] : []),
            ...(sendToAdmin ? [
              { role: 'COMPANY_MANAGER' },
              { role: 'DEPUTY_MANAGER' },
              { role: 'DEPARTMENT_MANAGER' }
            ] : [])
          ]
        }
      });

      // Create notifications
      for (const recipient of recipients) {
        await createNotification({
          userId: recipient.id,
          type: NotificationType.TECHNICIAN_REPORT,
          title: 'New Technician Report',
          message: `Technician ${report.technician.firstName} ${report.technician.lastName} submitted a report for request ${request.requestNumber}`,
        });
      }
    }

    res.status(201).json({
      success: true,
      data: report,
      message: 'Technician report created successfully'
    });
  } catch (error: any) {
    console.error('Error creating technician report:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to create technician report'
    });
  }
};

export const getTechnicianReports = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId) {
      throw new ForbiddenError('User not authenticated');
    }

    const {
      status,
      technicianId,
      requestId,
      isApproved,
      limit = 50,
      offset = 0
    }: TechnicianReportFilters = req.query;

    // Build where clause based on user role
    let whereClause: any = {};

    if (userRole === 'TECHNICIAN') {
      // Technicians can only see their own reports
      whereClause.technicianId = userId;
    } else if (['COMPANY_MANAGER', 'DEPUTY_MANAGER', 'DEPARTMENT_MANAGER', 'SECTION_SUPERVISOR'].includes(userRole || '')) {
      // Managers and supervisors can see all reports
      if (technicianId) {
        whereClause.technicianId = technicianId;
      }
    } else {
      throw new ForbiddenError('Insufficient permissions to view technician reports');
    }

    if (requestId) {
      whereClause.requestId = requestId;
    }

    if (isApproved !== undefined) {
      whereClause.isApproved = isApproved;
    }

    const reports = await prisma.technicianReport.findMany({
      where: whereClause,
      include: {
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
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: Number(limit),
      skip: Number(offset)
    });

    const total = await prisma.technicianReport.count({
      where: whereClause
    });

    res.json({
      success: true,
      data: reports,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total
      }
    });
  } catch (error: any) {
    console.error('Error fetching technician reports:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to fetch technician reports'
    });
  }
};

export const approveTechnicianReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    const { approvalComment } = req.body;
    const approverId = req.user?.id;

    if (!approverId) {
      throw new ForbiddenError('User not authenticated');
    }

    // Check if report exists
    const report = await prisma.technicianReport.findUnique({
      where: { id: Number(reportId) },
      include: {
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
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        }
      }
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    // Update report
    const updatedReport = await prisma.technicianReport.update({
      where: { id: Number(reportId) },
      data: {
        isApproved: true,
        approvedById: approverId,
        approvalComment: approvalComment?.trim()
      },
      include: {
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
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        }
      }
    });

    // Log activity
    await logActivity(
      report.requestId,
      approverId,
      'APPROVE_TECHNICIAN_REPORT' as any,
      `Approved technician report for request ${report.request.requestNumber}`
    );

    // Send notification to technician
    await createNotification({
      userId: report.technicianId,
      type: NotificationType.REPORT_APPROVED,
      title: 'Report Approved',
      message: `Your report for request ${report.request.requestNumber} has been approved`,
    });

    res.json({
      success: true,
      data: updatedReport,
      message: 'Report approved successfully'
    });
  } catch (error: any) {
    console.error('Error approving technician report:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to approve technician report'
    });
  }
};

export const rejectTechnicianReport = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { reportId } = req.params;
    const { approvalComment } = req.body;
    const approverId = req.user?.id;

    if (!approverId) {
      throw new ForbiddenError('User not authenticated');
    }

    if (!approvalComment?.trim()) {
      throw new ValidationError('Rejection reason is required');
    }

    // Check if report exists
    const report = await prisma.technicianReport.findUnique({
      where: { id: Number(reportId) },
      include: {
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
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        }
      }
    });

    if (!report) {
      throw new NotFoundError('Report not found');
    }

    // Update report
    const updatedReport = await prisma.technicianReport.update({
      where: { id: Number(reportId) },
      data: {
        isApproved: false,
        approvedById: approverId,
        approvalComment: approvalComment.trim()
      },
      include: {
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
        technician: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            username: true
          }
        }
      }
    });

    // Log activity
    await logActivity(
      report.requestId,
      approverId,
      'REJECT_TECHNICIAN_REPORT' as any,
      `Rejected technician report for request ${report.request.requestNumber}`
    );

    // Send notification to technician
    await createNotification({
      userId: report.technicianId,
      type: NotificationType.REPORT_REJECTED,
      title: 'Report Rejected',
      message: `Your report for request ${report.request.requestNumber} has been rejected. Reason: ${approvalComment}`,
    });

    res.json({
      success: true,
      data: updatedReport,
      message: 'Report rejected successfully'
    });
  } catch (error: any) {
    console.error('Error rejecting technician report:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Failed to reject technician report'
    });
  }
};
