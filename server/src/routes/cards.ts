import { Router } from 'express';
import * as cardsController from '../controllers/cards.js';
import { authenticate, requireWorkspace } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createCardSchema, updateCardSchema } from '../validators/index.js';

const router = Router();

// All routes require authentication and workspace context
router.use(authenticate);

// Card CRUD
router.get('/', requireWorkspace, cardsController.getCards);
router.get('/utilization', requireWorkspace, cardsController.getCardUtilization);
router.get('/:cardId', requireWorkspace, cardsController.getCard);
router.get('/:cardId/history', requireWorkspace, cardsController.getCardHistory);
router.post('/', requireWorkspace, validate(createCardSchema), cardsController.createCard);
router.patch('/:cardId', requireWorkspace, validate(updateCardSchema), cardsController.updateCard);
router.delete('/:cardId', requireWorkspace, cardsController.deleteCard);

export default router;
