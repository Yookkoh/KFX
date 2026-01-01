import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────
// AUTH VALIDATORS
// ─────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ─────────────────────────────────────────────────────────────────
// ONBOARDING VALIDATORS
// ─────────────────────────────────────────────────────────────────

export const onboardingSchema = z.object({
  workspaceName: z.string().min(1, 'Workspace name is required').max(100),
  accountType: z.enum(['SOLE_TRADER', 'PARTNERSHIP']),
  defaultBuyRate: z.number().positive('Buy rate must be positive'),
  defaultSellRate: z.number().positive('Sell rate must be positive'),
});

// ─────────────────────────────────────────────────────────────────
// CARD VALIDATORS
// ─────────────────────────────────────────────────────────────────

export const createCardSchema = z.object({
  name: z.string().min(1, 'Card name is required').max(100),
  usdLimit: z.number().positive('USD limit must be positive'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
});

export const updateCardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  usdLimit: z.number().positive().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isActive: z.boolean().optional(),
});

// ─────────────────────────────────────────────────────────────────
// TRANSACTION VALIDATORS
// ─────────────────────────────────────────────────────────────────

export const createTransactionSchema = z.object({
  cardId: z.string().uuid('Invalid card ID'),
  usdUsed: z.number().positive('USD used must be positive'),
  usdtReceived: z.number().positive('USDT received must be positive'),
  buyRate: z.number().positive('Buy rate must be positive'),
  sellRate: z.number().positive('Sell rate must be positive'),
  site: z.string().max(200).optional(),
  notes: z.string().max(500).optional(),
  transactionDate: z.string().datetime().optional(),
});

export const updateTransactionSchema = z.object({
  cardId: z.string().uuid().optional(),
  usdUsed: z.number().positive().optional(),
  usdtReceived: z.number().positive().optional(),
  buyRate: z.number().positive().optional(),
  sellRate: z.number().positive().optional(),
  site: z.string().max(200).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  transactionDate: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
});

// ─────────────────────────────────────────────────────────────────
// SETTINGS VALIDATORS
// ─────────────────────────────────────────────────────────────────

export const updateSettingsSchema = z.object({
  defaultBuyRate: z.number().positive().optional(),
  defaultSellRate: z.number().positive().optional(),
  theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
  currency: z.string().min(1).max(10).optional(),
});

// ─────────────────────────────────────────────────────────────────
// PARTNER VALIDATORS
// ─────────────────────────────────────────────────────────────────

export const invitePartnerSchema = z.object({
  email: z.string().email('Invalid email address'),
  profitSplit: z.number().min(0).max(100, 'Profit split must be between 0 and 100'),
});

export const updateProfitSplitSchema = z.object({
  memberId: z.string().uuid('Invalid member ID'),
  profitSplit: z.number().min(0).max(100, 'Profit split must be between 0 and 100'),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Invitation token is required'),
});

// ─────────────────────────────────────────────────────────────────
// QUERY VALIDATORS
// ─────────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
});

export const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const transactionFiltersSchema = z.object({
  cardId: z.string().uuid().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type InvitePartnerInput = z.infer<typeof invitePartnerSchema>;
export type UpdateProfitSplitInput = z.infer<typeof updateProfitSplitSchema>;
