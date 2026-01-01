import { Router } from 'express';
import authRoutes from './auth.js';
import workspaceRoutes from './workspace.js';
import cardsRoutes from './cards.js';
import transactionsRoutes from './transactions.js';
import dashboardRoutes from './dashboard.js';
import settingsRoutes from './settings.js';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/cards', cardsRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/settings', settingsRoutes);

export default router;
