import { Router } from 'express';
import * as workspaceController from '../controllers/workspace.js';
import { authenticate, requireWorkspace, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  onboardingSchema,
  invitePartnerSchema,
  updateProfitSplitSchema,
  acceptInvitationSchema,
} from '../validators/index.js';

const router = Router();

// Onboarding
router.post(
  '/onboarding',
  authenticate,
  validate(onboardingSchema),
  workspaceController.completeOnboarding
);

// Accept invitation (before workspace context)
router.post(
  '/invitations/accept',
  authenticate,
  validate(acceptInvitationSchema),
  workspaceController.acceptInvitation
);

// Workspace routes (require workspace context)
router.get(
  '/:workspaceId',
  authenticate,
  requireWorkspace,
  workspaceController.getWorkspace
);

router.patch(
  '/:workspaceId',
  authenticate,
  requireWorkspace,
  requireRole('OWNER', 'ADMIN'),
  workspaceController.updateWorkspace
);

// Members
router.get(
  '/:workspaceId/members',
  authenticate,
  requireWorkspace,
  workspaceController.getMembers
);

router.post(
  '/:workspaceId/members/invite',
  authenticate,
  requireWorkspace,
  requireRole('OWNER', 'ADMIN'),
  validate(invitePartnerSchema),
  workspaceController.invitePartner
);

router.patch(
  '/:workspaceId/members/profit-split',
  authenticate,
  requireWorkspace,
  requireRole('OWNER'),
  validate(updateProfitSplitSchema),
  workspaceController.updateProfitSplit
);

router.delete(
  '/:workspaceId/members/:memberId',
  authenticate,
  requireWorkspace,
  requireRole('OWNER'),
  workspaceController.removeMember
);

// Invitations
router.get(
  '/:workspaceId/invitations',
  authenticate,
  requireWorkspace,
  workspaceController.getInvitations
);

router.delete(
  '/:workspaceId/invitations/:invitationId',
  authenticate,
  requireWorkspace,
  requireRole('OWNER', 'ADMIN'),
  workspaceController.cancelInvitation
);

export default router;
