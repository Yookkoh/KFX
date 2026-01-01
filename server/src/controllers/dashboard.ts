import { Request, Response } from 'express';
import prisma from '../config/database.js';
import { getMonthRange, getYearRange, calculatePartnerShare, toNumber } from '../utils/calculations.js';

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const now = new Date();
    const { start: monthStart, end: monthEnd } = getMonthRange(now);
    const { start: yearStart, end: yearEnd } = getYearRange(now);

    // Get totals
    const [allTimeStats, monthlyStats, yearlyStats, members, cards] = await Promise.all([
      // All-time stats
      prisma.transaction.aggregate({
        where: {
          workspaceId: req.workspace.id,
          status: 'COMPLETED',
        },
        _sum: {
          cost: true,
          sale: true,
          profit: true,
        },
        _count: true,
      }),

      // Monthly stats
      prisma.transaction.aggregate({
        where: {
          workspaceId: req.workspace.id,
          status: 'COMPLETED',
          transactionDate: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _sum: {
          cost: true,
          sale: true,
          profit: true,
        },
        _count: true,
      }),

      // Yearly stats
      prisma.transaction.aggregate({
        where: {
          workspaceId: req.workspace.id,
          status: 'COMPLETED',
          transactionDate: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
        _sum: {
          cost: true,
          sale: true,
          profit: true,
        },
        _count: true,
      }),

      // Get workspace members with profit splits
      prisma.workspaceMember.findMany({
        where: { workspaceId: req.workspace.id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      }),

      // Get cards with monthly usage
      prisma.card.findMany({
        where: {
          workspaceId: req.workspace.id,
          isActive: true,
        },
        include: {
          transactions: {
            where: {
              transactionDate: {
                gte: monthStart,
                lte: monthEnd,
              },
              status: 'COMPLETED',
            },
            select: {
              usdUsed: true,
            },
          },
        },
      }),
    ]);

    // Calculate partner profits
    const totalProfit = toNumber(allTimeStats._sum.profit || 0);
    const monthlyProfit = toNumber(monthlyStats._sum.profit || 0);

    const partnerProfits = members.map((member) => ({
      memberId: member.id,
      userId: member.user.id,
      userName: member.user.name || member.user.email,
      avatar: member.user.avatar,
      profitSplit: toNumber(member.profitSplit),
      totalProfit: calculatePartnerShare(totalProfit, toNumber(member.profitSplit)),
      monthlyProfit: calculatePartnerShare(monthlyProfit, toNumber(member.profitSplit)),
    }));

    // Calculate card utilization
    const cardUtilization = cards.map((card) => {
      const usedThisMonth = card.transactions.reduce(
        (sum, t) => sum + toNumber(t.usdUsed),
        0
      );
      const usdLimit = toNumber(card.usdLimit);

      return {
        cardId: card.id,
        cardName: card.name,
        cardColor: card.color,
        usdLimit,
        usedThisMonth,
        remaining: Math.max(0, usdLimit - usedThisMonth),
        utilizationPercent: usdLimit > 0 ? Math.min(100, (usedThisMonth / usdLimit) * 100) : 0,
        isUtilizedThisMonth: usedThisMonth > 0,
      };
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalProfit,
          totalCost: toNumber(allTimeStats._sum.cost || 0),
          totalSale: toNumber(allTimeStats._sum.sale || 0),
          totalTransactions: allTimeStats._count,
        },
        monthly: {
          profit: monthlyProfit,
          cost: toNumber(monthlyStats._sum.cost || 0),
          sale: toNumber(monthlyStats._sum.sale || 0),
          transactions: monthlyStats._count,
        },
        yearly: {
          profit: toNumber(yearlyStats._sum.profit || 0),
          cost: toNumber(yearlyStats._sum.cost || 0),
          sale: toNumber(yearlyStats._sum.sale || 0),
          transactions: yearlyStats._count,
        },
        partnerProfits,
        cardUtilization,
      },
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get dashboard stats' });
  }
}

/**
 * Get monthly profit breakdown for chart
 */
export async function getMonthlyBreakdown(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const { months = '12' } = req.query;
    const numMonths = Math.min(parseInt(months as string, 10), 24);

    // Get date range for the specified number of months
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - numMonths + 1);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

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
    const monthlyData: Map<string, {
      month: string;
      year: number;
      cost: number;
      sale: number;
      profit: number;
      transactions: number;
    }> = new Map();

    // Initialize all months
    for (let i = 0; i < numMonths; i++) {
      const date = new Date(startDate);
      date.setMonth(startDate.getMonth() + i);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData.set(key, {
        month: key,
        year: date.getFullYear(),
        cost: 0,
        sale: 0,
        profit: 0,
        transactions: 0,
      });
    }

    // Aggregate transactions
    transactions.forEach((t) => {
      const key = `${t.transactionDate.getFullYear()}-${String(t.transactionDate.getMonth() + 1).padStart(2, '0')}`;
      const data = monthlyData.get(key);
      if (data) {
        data.cost += toNumber(t.cost);
        data.sale += toNumber(t.sale);
        data.profit += toNumber(t.profit);
        data.transactions += 1;
      }
    });

    const result = Array.from(monthlyData.values());

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get monthly breakdown error:', error);
    res.status(500).json({ success: false, error: 'Failed to get monthly breakdown' });
  }
}

/**
 * Get recent activity
 */
export async function getRecentActivity(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const { limit = '10' } = req.query;

    const transactions = await prisma.transaction.findMany({
      where: {
        workspaceId: req.workspace.id,
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
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string, 10),
    });

    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ success: false, error: 'Failed to get recent activity' });
  }
}

/**
 * Get top performing cards
 */
export async function getTopCards(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const cards = await prisma.card.findMany({
      where: {
        workspaceId: req.workspace.id,
      },
      include: {
        transactions: {
          where: {
            status: 'COMPLETED',
          },
          select: {
            profit: true,
            usdUsed: true,
          },
        },
      },
    });

    const cardStats = cards.map((card) => {
      const totalProfit = card.transactions.reduce(
        (sum, t) => sum + toNumber(t.profit),
        0
      );
      const totalVolume = card.transactions.reduce(
        (sum, t) => sum + toNumber(t.usdUsed),
        0
      );

      return {
        cardId: card.id,
        cardName: card.name,
        cardColor: card.color,
        totalProfit,
        totalVolume,
        transactionCount: card.transactions.length,
      };
    });

    // Sort by profit descending
    cardStats.sort((a, b) => b.totalProfit - a.totalProfit);

    res.json({ success: true, data: cardStats.slice(0, 5) });
  } catch (error) {
    console.error('Get top cards error:', error);
    res.status(500).json({ success: false, error: 'Failed to get top cards' });
  }
}
