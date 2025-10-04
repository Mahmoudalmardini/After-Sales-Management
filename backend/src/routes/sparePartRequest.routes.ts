import { Router } from 'express';
import { authenticateToken, requireRoles, requireRequestAccess } from '../middleware/auth';
import * as sparePartRequestController from '../controllers/sparePartRequest.controller';
import { UserRole } from '../types';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/spare-part-requests
 * @desc    Create new spare part request
 * @access  Private (Technician only)
 */
router.post('/', 
  requireRoles([UserRole.TECHNICIAN]),
  sparePartRequestController.createSparePartRequest
);

/**
 * @route   GET /api/spare-part-requests
 * @desc    Get spare part requests
 * @access  Private (All roles with filtering)
 */
router.get('/', sparePartRequestController.getSparePartRequests);

/**
 * @route   PUT /api/spare-part-requests/:id/approve
 * @desc    Approve spare part request
 * @access  Private (Admin and Supervisor only)
 */
router.put('/:id/approve',
  requireRoles([
    UserRole.COMPANY_MANAGER,
    UserRole.DEPUTY_MANAGER,
    UserRole.DEPARTMENT_MANAGER,
    UserRole.SECTION_SUPERVISOR
  ]),
  sparePartRequestController.approveSparePartRequest
);

/**
 * @route   PUT /api/spare-part-requests/:id/reject
 * @desc    Reject spare part request
 * @access  Private (Admin and Supervisor only)
 */
router.put('/:id/reject',
  requireRoles([
    UserRole.COMPANY_MANAGER,
    UserRole.DEPUTY_MANAGER,
    UserRole.DEPARTMENT_MANAGER,
    UserRole.SECTION_SUPERVISOR
  ]),
  sparePartRequestController.rejectSparePartRequest
);

/**
 * @route   PUT /api/spare-part-requests/:id/fulfill
 * @desc    Mark spare part request as fulfilled
 * @access  Private (Warehouse Keeper only)
 */
router.put('/:id/fulfill',
  requireRoles([UserRole.WAREHOUSE_KEEPER]),
  sparePartRequestController.fulfillSparePartRequest
);

export default router;
