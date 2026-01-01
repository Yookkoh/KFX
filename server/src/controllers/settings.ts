import { Request, Response } from 'express';
import prisma from '../config/database.js';
import type { UpdateSettingsInput } from '../validators/index.js';

/**
 * Get workspace settings
 */
export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    let settings = await prisma.workspaceSettings.findUnique({
      where: { workspaceId: req.workspace.id },
    });

    // Create default settings if not exists
    if (!settings) {
      settings = await prisma.workspaceSettings.create({
        data: {
          workspaceId: req.workspace.id,
        },
      });
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to get settings' });
  }
}

/**
 * Update workspace settings
 */
export async function updateSettings(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const updates = req.body as UpdateSettingsInput;

    const settings = await prisma.workspaceSettings.upsert({
      where: { workspaceId: req.workspace.id },
      update: updates,
      create: {
        workspaceId: req.workspace.id,
        ...updates,
      },
    });

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, error: 'Failed to update settings' });
  }
}

/**
 * Get default rates
 */
export async function getDefaultRates(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const settings = await prisma.workspaceSettings.findUnique({
      where: { workspaceId: req.workspace.id },
      select: {
        defaultBuyRate: true,
        defaultSellRate: true,
      },
    });

    res.json({
      success: true,
      data: {
        buyRate: settings?.defaultBuyRate || 15.42,
        sellRate: settings?.defaultSellRate || 15.50,
      },
    });
  } catch (error) {
    console.error('Get default rates error:', error);
    res.status(500).json({ success: false, error: 'Failed to get rates' });
  }
}

/**
 * Update default rates
 */
export async function updateDefaultRates(req: Request, res: Response): Promise<void> {
  try {
    if (!req.workspace) {
      res.status(404).json({ success: false, error: 'Workspace not found' });
      return;
    }

    const { buyRate, sellRate } = req.body;

    if (buyRate !== undefined && (typeof buyRate !== 'number' || buyRate <= 0)) {
      res.status(400).json({ success: false, error: 'Invalid buy rate' });
      return;
    }

    if (sellRate !== undefined && (typeof sellRate !== 'number' || sellRate <= 0)) {
      res.status(400).json({ success: false, error: 'Invalid sell rate' });
      return;
    }

    const settings = await prisma.workspaceSettings.upsert({
      where: { workspaceId: req.workspace.id },
      update: {
        ...(buyRate !== undefined && { defaultBuyRate: buyRate }),
        ...(sellRate !== undefined && { defaultSellRate: sellRate }),
      },
      create: {
        workspaceId: req.workspace.id,
        ...(buyRate !== undefined && { defaultBuyRate: buyRate }),
        ...(sellRate !== undefined && { defaultSellRate: sellRate }),
      },
    });

    res.json({
      success: true,
      data: {
        buyRate: settings.defaultBuyRate,
        sellRate: settings.defaultSellRate,
      },
    });
  } catch (error) {
    console.error('Update default rates error:', error);
    res.status(500).json({ success: false, error: 'Failed to update rates' });
  }
}
