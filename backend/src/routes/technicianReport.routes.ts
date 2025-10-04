import express from 'express';
import { createTechnicianReport, getTechnicianReports, approveTechnicianReport, rejectTechnicianReport } from '../controllers/technicianReport.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRoles } from '../middleware/role.middleware';
import { UserRole } from '../types';

const router = express.Router();

// All routes require authentication
router.use(requireAuth);

/**
 * @route   POST /api/technician-reports
 * @desc    Create a new technician report
 * @access  Private (Technician)
 */
router.post('/', 
  requireRoles([UserRole.TECHNICIAN]),
  createTechnicianReport
);

/**
 * @route   GET /api/technician-reports
 * @desc    Get technician reports with optional filtering
 * @access  Private (Technician, Manager, Supervisor)
 */
router.get('/', 
  requireRoles([
    UserRole.TECHNICIAN,
    UserRole.COMPANY_MANAGER,
    UserRole.DEPUTY_MANAGER,
    UserRole.DEPARTMENT_MANAGER,
    UserRole.SECTION_SUPERVISOR
  ]),
  getTechnicianReports
);

/**
 * @route   PUT /api/technician-reports/:reportId/approve
 * @desc    Approve a technician report
 * @access  Private (Manager, Supervisor)
 */
router.put('/:reportId/approve',
  requireRoles([
    UserRole.COMPANY_MANAGER,
    UserRole.DEPUTY_MANAGER,
    UserRole.DEPARTMENT_MANAGER,
    UserRole.SECTION_SUPERVISOR
  ]),
  approveTechnicianReport
);

/**
 * @route   PUT /api/technician-reports/:reportId/reject
 * @desc    Reject a technician report
 * @access  Private (Manager, Supervisor)
 */
router.put('/:reportId/reject',
  requireRoles([
    UserRole.COMPANY_MANAGER,
    UserRole.DEPUTY_MANAGER,
    UserRole.DEPARTMENT_MANAGER,
    UserRole.SECTION_SUPERVISOR
  ]),
  rejectTechnicianReport
);

export default router;
