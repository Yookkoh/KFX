import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { calculateTransaction, toNumber } from '../utils/calculations.js';
import type { CreateTransactionInput, UpdateTransactionInput } from '../validators/index.js';

/**
 * Get all transactions for workspace with filters
 */
export async function getTransactions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const {
      cardId,
      status,
      startDate,
      endDate,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const where = {
      workspaceId: req.workspace.id,
      ...(cardId && { cardId: cardId as string }),
      ...(status && { status: status as 'PENDING' | 'COMPLETED' | 'CANCELLED' }),
      ...(startDate || endDate
        ? {
            transactionDate: {
              ...(startDate && { gte: new Date(startDate as string) }),
              ...(endDate && { lte: new Date(endDate as string) }),
            },
          }
        : {}),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          card: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
        orderBy: { transactionDate: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.transaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get transactions' });
  }
}

/**
 * Get transaction by ID
 */
export async function getTransaction(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const { transactionId } = req.params;

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        workspaceId: req.workspace.id,
      },
      include: {
        card: true,
      },
    });

    if (!transaction) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }

    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ success: false, error: 'Failed to get transaction' });
  }
}

/**
 * Create new transaction (sale)
 * All calculations done server-side
 */
export async function createTransaction(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const input = req.body as CreateTransactionInput;

    // Verify card belongs to workspace and is active
    const card = await prisma.card.findFirst({
      where: {
        id: input.cardId,
        workspaceId: req.workspace.id,
        isActive: true,
      },
    });

    if (!card) {
      res.status(400).json({ success: false, error: 'Invalid or inactive card' });
      return;
    }

    // Server-side calculation
    const { cost, sale, profit } = calculateTransaction({
      usdUsed: input.usdUsed,
      usdtReceived: input.usdtReceived,
      buyRate: input.buyRate,
      sellRate: input.sellRate,
    });

    const transaction = await prisma.transaction.create({
      data: {
        workspaceId: req.workspace.id,
        cardId: input.cardId,
        usdUsed: input.usdUsed,
        usdtReceived: input.usdtReceived,
        buyRate: input.buyRate,
        sellRate: input.sellRate,
        site: input.site,
        notes: input.notes,
        transactionDate: input.transactionDate ? new Date(input.transactionDate) : new Date(),
        // Computed values (server-side)
        cost,
        sale,
        profit,
        status: 'COMPLETED',
      },
      include: {
        card: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ success: false, error: 'Failed to create transaction' });
  }
}

/**
 * Update transaction
 * Recalculates if rates or amounts change
 */
export async function updateTransaction(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const { transactionId } = req.params;
    const updates = req.body as UpdateTransactionInput;

    // Get existing transaction
    const existing = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        workspaceId: req.workspace.id,
      },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }

    // If card is being changed, verify it belongs to workspace
    if (updates.cardId && updates.cardId !== existing.cardId) {
      const card = await prisma.card.findFirst({
        where: {
          id: updates.cardId,
          workspaceId: req.workspace.id,
          isActive: true,
        },
      });

      if (!card) {
        res.status(400).json({ success: false, error: 'Invalid or inactive card' });
        return;
      }
    }

    // Recalculate if amounts or rates changed
    const needsRecalculation =
      updates.usdUsed !== undefined ||
      updates.usdtReceived !== undefined ||
      updates.buyRate !== undefined ||
      updates.sellRate !== undefined;

    let calculatedFields = {};
    if (needsRecalculation) {
      const { cost, sale, profit } = calculateTransaction({
        usdUsed: updates.usdUsed ?? toNumber(existing.usdUsed),
        usdtReceived: updates.usdtReceived ?? toNumber(existing.usdtReceived),
        buyRate: updates.buyRate ?? toNumber(existing.buyRate),
        sellRate: updates.sellRate ?? toNumber(existing.sellRate),
      });
      calculatedFields = { cost, sale, profit };
    }

    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        ...updates,
        ...(updates.transactionDate && {
          transactionDate: new Date(updates.transactionDate),
        }),
        ...calculatedFields,
      },
      include: {
        card: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ success: false, error: 'Failed to update transaction' });
  }
}

/**
 * Delete transaction
 */
export async function deleteTransaction(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const { transactionId } = req.params;

    // Verify transaction belongs to workspace
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        workspaceId: req.workspace.id,
      },
    });

    if (!transaction) {
      res.status(404).json({ success: false, error: 'Transaction not found' });
      return;
    }

    await prisma.transaction.delete({
      where: { id: transactionId },
    });

    res.json({ success: true, message: 'Transaction deleted' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete transaction' });
  }
}

/**
 * Export transactions as CSV
 */
export async function exportTransactions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const { cardId, status, startDate, endDate } = req.query;

    const where = {
      workspaceId: req.workspace.id,
      ...(cardId && { cardId: cardId as string }),
      ...(status && { status: status as 'PENDING' | 'COMPLETED' | 'CANCELLED' }),
      ...(startDate || endDate
        ? {
            transactionDate: {
              ...(startDate && { gte: new Date(startDate as string) }),
              ...(endDate && { lte: new Date(endDate as string) }),
            },
          }
        : {}),
    };

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        card: {
          select: { name: true },
        },
      },
      orderBy: { transactionDate: 'desc' },
    });

    // Generate CSV
    const headers = [
      'Date',
      'Card',
      'USD Used',
      'USDT Received',
      'Buy Rate',
      'Sell Rate',
      'Cost (MVR)',
      'Sale (MVR)',
      'Profit (MVR)',
      'Site',
      'Status',
      'Notes',
    ].join(',');

    const rows = transactions.map((t) =>
      [
        t.transactionDate.toISOString().split('T')[0],
        `"${t.card.name}"`,
        toNumber(t.usdUsed),
        toNumber(t.usdtReceived),
        toNumber(t.buyRate),
        toNumber(t.sellRate),
        toNumber(t.cost),
        toNumber(t.sale),
        toNumber(t.profit),
        `"${t.site || ''}"`,
        t.status,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ].join(',')
    );

    const csv = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Export transactions error:', error);
    res.status(500).json({ success: false, error: 'Failed to export transactions' });
  }
}

/**
 * Get transactions grouped by month
 */
export async function getTransactionsByMonth(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const { year } = req.query;
    const targetYear = year ? parseInt(year as string, 10) : new Date().getFullYear();

    const startDate = new Date(targetYear, 0, 1);
    const endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    const transactions = await prisma.transaction.findMany({
      where: {
        workspaceId: req.workspace.id,
        status: 'COMPLETED',
        transactionDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        transactionDate: true,
        cost: true,
        sale: true,
        profit: true,
      },
    });

    // Group by month
    const monthlyData: Record<string, { cost: number; sale: number; profit: number; count: number }> = {};

    for (let i = 0; i < 12; i++) {
      const key = `${targetYear}-${String(i + 1).padStart(2, '0')}`;
      monthlyData[key] = { cost: 0, sale: 0, profit: 0, count: 0 };
    }

    transactions.forEach((t) => {
      const month = t.transactionDate.getMonth();
      const key = `${targetYear}-${String(month + 1).padStart(2, '0')}`;
      monthlyData[key].cost += toNumber(t.cost);
      monthlyData[key].sale += toNumber(t.sale);
      monthlyData[key].profit += toNumber(t.profit);
      monthlyData[key].count += 1;
    });

    const result = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      ...data,
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get transactions by month error:', error);
    res.status(500).json({ success: false, error: 'Failed to get monthly data' });
  }
}
