import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { config } from '../config/index.js';
import type { OnboardingInput, InvitePartnerInput, UpdateProfitSplitInput } from '../validators/index.js';

/**
 * Complete onboarding - create workspace
 */
export async function completeOnboarding(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { workspaceName, accountType, defaultBuyRate, defaultSellRate } = req.body as OnboardingInput;

    // Check if user already has a workspace
    const existingMember = await prisma.workspaceMember.findFirst({
      where: { userId: req.user.id },
    });

    if (existingMember) {
      res.status(400).json({ success: false, error: 'Workspace already exists' });
      return;
    }

    // Create workspace with settings in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          type: accountType,
          members: {
            create: {
              userId: req.user!.id,
              role: 'OWNER',
              isOwner: true,
              profitSplit: 100, // Owner gets 100% initially
            },
          },
          settings: {
            create: {
              defaultBuyRate,
              defaultSellRate,
            },
          },
        },
        include: {
          members: true,
          settings: true,
        },
      });

      return workspace;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Onboarding error:', error);
    res.status(500).json({ success: false, error: 'Failed to complete onboarding' });
  }
}

/**
 * Get workspace details
 */
export async function getWorkspace(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: req.workspace.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
        settings: true,
        _count: {
          select: {
            cards: true,
            transactions: true,
          },
        },
      },
    });

    res.json({ success: true, data: workspace });
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ success: false, error: 'Failed to get workspace' });
  }
}

/**
 * Update workspace
 */
export async function updateWorkspace(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace || !req.workspaceMember) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    // Only owner/admin can update
    if (!['OWNER', 'ADMIN'].includes(req.workspaceMember.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    const { name, type } = req.body;

    const workspace = await prisma.workspace.update({
      where: { id: req.workspace.id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
      },
      include: {
        settings: true,
      },
    });

    res.json({ success: true, data: workspace });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ success: false, error: 'Failed to update workspace' });
  }
}

/**
 * Get workspace members
 */
export async function getMembers(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: req.workspace.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    res.json({ success: true, data: members });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ success: false, error: 'Failed to get members' });
  }
}

/**
 * Invite partner
 */
export async function invitePartner(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace || !req.workspaceMember) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    // Only owner/admin can invite
    if (!['OWNER', 'ADMIN'].includes(req.workspaceMember.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    const { email, profitSplit } = req.body as InvitePartnerInput;

    // Check if user is already a member
    const existingInvitee = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingInvitee) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          userId_workspaceId: {
            userId: existingInvitee.id,
            workspaceId: req.workspace.id,
          },
        },
      });

      if (existingMember) {
        res.status(400).json({ success: false, error: 'User is already a member' });
        return;
      }
    }

    // Check for pending invitation
    const pendingInvite = await prisma.invitation.findFirst({
      where: {
        workspaceId: req.workspace.id,
        email: email.toLowerCase(),
        status: 'PENDING',
      },
    });

    if (pendingInvite) {
      res.status(400).json({ success: false, error: 'Invitation already pending' });
      return;
    }

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        workspaceId: req.workspace.id,
        email: email.toLowerCase(),
        invitedById: req.user!.id,
        invitedUserId: existingInvitee?.id,
        profitSplit,
        expiresAt: new Date(Date.now() + config.invitationExpiryDays * 24 * 60 * 60 * 1000),
      },
      include: {
        workspace: { select: { name: true } },
        invitedBy: { select: { name: true, email: true } },
      },
    });

    // In production, send email with invitation link
    // For now, return the invitation token
    res.status(201).json({
      success: true,
      data: {
        invitation,
        inviteLink: `${config.clientUrl}/invite/${invitation.token}`,
      },
    });
  } catch (error) {
    console.error('Invite partner error:', error);
    res.status(500).json({ success: false, error: 'Failed to send invitation' });
  }
}

/**
 * Accept invitation
 */
export async function acceptInvitation(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const { token } = req.body;

    // Find invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: { workspace: true },
    });

    if (!invitation) {
      res.status(404).json({ success: false, error: 'Invitation not found' });
      return;
    }

    if (invitation.status !== 'PENDING') {
      res.status(400).json({ success: false, error: 'Invitation is no longer valid' });
      return;
    }

    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      res.status(400).json({ success: false, error: 'Invitation has expired' });
      return;
    }

    // Verify email matches
    if (invitation.email.toLowerCase() !== req.user.email.toLowerCase()) {
      res.status(403).json({ success: false, error: 'This invitation is for a different email address' });
      return;
    }

    // Accept invitation in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update invitation
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          invitedUserId: req.user!.id,
        },
      });

      // Add user to workspace
      const member = await tx.workspaceMember.create({
        data: {
          userId: req.user!.id,
          workspaceId: invitation.workspaceId,
          role: 'MEMBER',
          profitSplit: invitation.profitSplit,
        },
        include: {
          workspace: true,
        },
      });

      // Update workspace type to PARTNERSHIP if not already
      if (invitation.workspace.type === 'SOLE_TRADER') {
        await tx.workspace.update({
          where: { id: invitation.workspaceId },
          data: { type: 'PARTNERSHIP' },
        });
      }

      return member;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Accept invitation error:', error);
    res.status(500).json({ success: false, error: 'Failed to accept invitation' });
  }
}

/**
 * Update profit split
 */
export async function updateProfitSplit(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace || !req.workspaceMember) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    // Only owner can update profit splits
    if (req.workspaceMember.role !== 'OWNER') {
      res.status(403).json({ success: false, error: 'Only owner can update profit splits' });
      return;
    }

    const { memberId, profitSplit } = req.body as UpdateProfitSplitInput;

    // Verify member exists in workspace
    const member = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId: req.workspace.id,
      },
    });

    if (!member) {
      res.status(404).json({ success: false, error: 'Member not found' });
      return;
    }

    // Update profit split
    const updated = await prisma.workspaceMember.update({
      where: { id: memberId },
      data: { profitSplit },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update profit split error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profit split' });
  }
}

/**
 * Remove member from workspace
 */
export async function removeMember(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace || !req.workspaceMember) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    // Only owner can remove members
    if (req.workspaceMember.role !== 'OWNER') {
      res.status(403).json({ success: false, error: 'Only owner can remove members' });
      return;
    }

    const { memberId } = req.params;

    // Find member
    const member = await prisma.workspaceMember.findFirst({
      where: {
        id: memberId,
        workspaceId: req.workspace.id,
      },
    });

    if (!member) {
      res.status(404).json({ success: false, error: 'Member not found' });
      return;
    }

    // Cannot remove owner
    if (member.isOwner) {
      res.status(400).json({ success: false, error: 'Cannot remove workspace owner' });
      return;
    }

    // Remove member
    await prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    res.json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ success: false, error: 'Failed to remove member' });
  }
}

/**
 * Get pending invitations for workspace
 */
export async function getInvitations(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const invitations = await prisma.invitation.findMany({
      where: {
        workspaceId: req.workspace.id,
        status: 'PENDING',
      },
      include: {
        invitedBy: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: invitations });
  } catch (error) {
    console.error('Get invitations error:', error);
    res.status(500).json({ success: false, error: 'Failed to get invitations' });
  }
}

/**
 * Cancel invitation
 */
export async function cancelInvitation(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace || !req.workspaceMember) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    if (!['OWNER', 'ADMIN'].includes(req.workspaceMember.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' });
      return;
    }

    const { invitationId } = req.params;

    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        workspaceId: req.workspace.id,
        status: 'PENDING',
      },
    });

    if (!invitation) {
      res.status(404).json({ success: false, error: 'Invitation not found' });
      return;
    }

    await prisma.invitation.delete({
      where: { id: invitationId },
    });

    res.json({ success: true, message: 'Invitation cancelled' });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel invitation' });
  }
}
