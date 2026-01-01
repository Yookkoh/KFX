import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { getMonthRange, toNumber } from '../utils/calculations.js';
import type { CreateCardInput, UpdateCardInput } from '../validators/index.js';

/**
 * Get all cards for workspace
 */
export async function getCards(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const { includeInactive } = req.query;

    const cards = await prisma.card.findMany({
      where: {
        workspaceId: req.workspace.id,
        ...(includeInactive !== 'true' && { isActive: true }),
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: cards });
  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({ success: false, error: 'Failed to get cards' });
  }
}

/**
 * Get card by ID
 */
export async function getCard(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const { cardId } = req.params;

    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        workspaceId: req.workspace.id,
      },
    });

    if (!card) {
      res.status(404).json({ success: false, error: 'Card not found' });
      return;
    }

    res.json({ success: true, data: card });
  } catch (error) {
    console.error('Get card error:', error);
    res.status(500).json({ success: false, error: 'Failed to get card' });
  }
}

/**
 * Create new card
 */
export async function createCard(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const { name, usdLimit, color } = req.body as CreateCardInput;

    const card = await prisma.card.create({
      data: {
        workspaceId: req.workspace.id,
        name,
        usdLimit,
        color: color || '#3B82F6',
      },
    });

    res.status(201).json({ success: true, data: card });
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ success: false, error: 'Failed to create card' });
  }
}

/**
 * Update card
 */
export async function updateCard(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const { cardId } = req.params;
    const updates = req.body as UpdateCardInput;

    // Verify card belongs to workspace
    const existingCard = await prisma.card.findFirst({
      where: {
        id: cardId,
        workspaceId: req.workspace.id,
      },
    });

    if (!existingCard) {
      res.status(404).json({ success: false, error: 'Card not found' });
      return;
    }

    const card = await prisma.card.update({
      where: { id: cardId },
      data: updates,
    });

    res.json({ success: true, data: card });
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ success: false, error: 'Failed to update card' });
  }
}

/**
 * Delete card (soft delete by setting inactive)
 */
export async function deleteCard(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const { cardId } = req.params;

    // Verify card belongs to workspace
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        workspaceId: req.workspace.id,
      },
    });

    if (!card) {
      res.status(404).json({ success: false, error: 'Card not found' });
      return;
    }

    // Check if card has transactions
    const transactionCount = await prisma.transaction.count({
      where: { cardId },
    });

    if (transactionCount > 0) {
      // Soft delete - just deactivate
      await prisma.card.update({
        where: { id: cardId },
        data: { isActive: false },
      });
      res.json({ success: true, message: 'Card deactivated (has transactions)' });
    } else {
      // Hard delete if no transactions
      await prisma.card.delete({
        where: { id: cardId },
      });
      res.json({ success: true, message: 'Card deleted' });
    }
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete card' });
  }
}

/**
 * Get card utilization for current month
 */
export async function getCardUtilization(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const { start, end } = getMonthRange(new Date());

    // Get all active cards with their monthly usage
    const cards = await prisma.card.findMany({
      where: {
        workspaceId: req.workspace.id,
        isActive: true,
      },
      include: {
        transactions: {
          where: {
            transactionDate: {
              gte: start,
              lte: end,
            },
            status: 'COMPLETED',
          },
          select: {
            usdUsed: true,
          },
        },
      },
    });

    const utilization = cards.map((card) => {
      const usedThisMonth = card.transactions.reduce(
        (sum, t) => sum + toNumber(t.usdUsed),
        0
      );
      const usdLimit = toNumber(card.usdLimit);
      const utilizationPercent = usdLimit > 0 ? (usedThisMonth / usdLimit) * 100 : 0;

      return {
        cardId: card.id,
        cardName: card.name,
        cardColor: card.color,
        usdLimit,
        usedThisMonth,
        remaining: Math.max(0, usdLimit - usedThisMonth),
        utilizationPercent: Math.min(100, utilizationPercent),
        isUtilizedThisMonth: usedThisMonth > 0,
      };
    });

    res.json({ success: true, data: utilization });
  } catch (error) {
    console.error('Get card utilization error:', error);
    res.status(500).json({ success: false, error: 'Failed to get utilization' });
  }
}

/**
 * Get card history with monthly breakdown
 */
export async function getCardHistory(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const { cardId } = req.params;

    // Verify card belongs to workspace
    const card = await prisma.card.findFirst({
      where: {
        id: cardId,
        workspaceId: req.workspace.id,
      },
    });

    if (!card) {
      res.status(404).json({ success: false, error: 'Card not found' });
      return;
    }

    // Get monthly aggregations
    const transactions = await prisma.transaction.groupBy({
      by: ['cardId'],
      where: {
        cardId,
        status: 'COMPLETED',
      },
      _sum: {
        usdUsed: true,
        usdtReceived: true,
        cost: true,
        sale: true,
        profit: true,
      },
      _count: true,
    });

    // Get recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: {
        cardId,
      },
      orderBy: { transactionDate: 'desc' },
      take: 10,
    });

    res.json({
      success: true,
      data: {
        card,
        totals: transactions[0] || null,
        recentTransactions,
      },
    });
  } catch (error) {
    console.error('Get card history error:', error);
    res.status(500).json({ success: false, error: 'Failed to get card history' });
  }
}
