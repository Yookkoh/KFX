import { Router } from 'express';
import * as settingsController from '../controllers/settings.js';
import { authenticate, requireWorkspace, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { updateSettingsSchema } from '../validators/index.js';

const router = Router();

// All routes require authentication and workspace context
router.use(authenticate);

router.get('/', requireWorkspace, settingsController.getSettings);
router.patch('/', requireWorkspace, requireRole('OWNER', 'ADMIN'), validate(updateSettingsSchema), settingsController.updateSettings);
router.get('/rates', requireWorkspace, settingsController.getDefaultRates);
router.patch('/rates', requireWorkspace, requireRole('OWNER', 'ADMIN'), settingsController.updateDefaultRates);

export default router;
