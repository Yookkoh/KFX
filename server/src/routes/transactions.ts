import { Router } from 'express';
import * as transactionsController from '../controllers/transactions.js';
import { authenticate, requireWorkspace } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createTransactionSchema, updateTransactionSchema } from '../validators/index.js';

const router = Router();

// All routes require authentication and workspace context
router.use(authenticate);

// Transaction CRUD
router.get('/', requireWorkspace, transactionsController.getTransactions);
router.get('/export', requireWorkspace, transactionsController.exportTransactions);
router.get('/monthly', requireWorkspace, transactionsController.getTransactionsByMonth);
router.get('/:transactionId', requireWorkspace, transactionsController.getTransaction);
router.post('/', requireWorkspace, validate(createTransactionSchema), transactionsController.createTransaction);
router.patch('/:transactionId', requireWorkspace, validate(updateTransactionSchema), transactionsController.updateTransaction);
router.delete('/:transactionId', requireWorkspace, transactionsController.deleteTransaction);

export default router;
