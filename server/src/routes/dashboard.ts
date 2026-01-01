import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.js';
import { authenticate, requireWorkspace } from '../middleware/auth.js';

const router = Router();

// All routes require authentication and workspace context
router.use(authenticate);

router.get('/stats', requireWorkspace, dashboardController.getDashboardStats);
router.get('/monthly-breakdown', requireWorkspace, dashboardController.getMonthlyBreakdown);
router.get('/recent-activity', requireWorkspace, dashboardController.getRecentActivity);
router.get('/top-cards', requireWorkspace, dashboardController.getTopCards);

export default router;
