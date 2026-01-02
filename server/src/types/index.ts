import { Workspace, WorkspaceMember, Card, Transaction, WorkspaceSettings } from '@prisma/client';
import { User as PrismaUser } from '@prisma/client';

// Auth Types
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

// Augment Express namespace - must use module augmentation
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
    workspace?: Workspace;
    workspaceMember?: WorkspaceMember;
  }
}

export interface JwtPayload {
  userId: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Onboarding Types
export interface OnboardingData {
  workspaceName: string;
  accountType: 'SOLE_TRADER' | 'PARTNERSHIP';
  defaultBuyRate: number;
  defaultSellRate: number;
}

// Dashboard Types
export interface DashboardStats {
  totalProfit: number;
  monthlyProfit: number;
  yearlyProfit: number;
  totalTransactions: number;
  monthlyTransactions: number;
  partnerProfits: PartnerProfit[];
  cardUtilization: CardUtilization[];
  monthlyBreakdown: MonthlyBreakdown[];
}

export interface PartnerProfit {
  userId: string;
  userName: string;
  profitSplit: number;
  totalProfit: number;
  monthlyProfit: number;
}

export interface CardUtilization {
  cardId: string;
  cardName: string;
  cardColor: string;
  usdLimit: number;
  usedThisMonth: number;
  utilizationPercent: number;
  isUtilizedThisMonth: boolean;
}

export interface MonthlyBreakdown {
  month: string;
  year: number;
  totalCost: number;
  totalSale: number;
  totalProfit: number;
  transactionCount: number;
}

// Transaction Types
export interface CreateTransactionInput {
  cardId: string;
  usdUsed: number;
  usdtReceived: number;
  buyRate: number;
  sellRate: number;
  site?: string;
  notes?: string;
  transactionDate?: string;
}

export interface TransactionWithCard extends Transaction {
  card: Card;
}

// Card Types
export interface CreateCardInput {
  name: string;
  usdLimit: number;
  color?: string;
}

export interface UpdateCardInput {
  name?: string;
  usdLimit?: number;
  color?: string;
  isActive?: boolean;
}

// Settings Types
export interface UpdateSettingsInput {
  defaultBuyRate?: number;
  defaultSellRate?: number;
  theme?: 'LIGHT' | 'DARK' | 'SYSTEM';
  currency?: string;
}

// Partner Types
export interface UpdateProfitSplitInput {
  memberId: string;
  profitSplit: number;
}

// Export Types
export interface ExportFilters {
  startDate?: string;
  endDate?: string;
  cardId?: string;
  status?: string;
}

export type {
  PrismaUser as User,
  Workspace,
  WorkspaceMember,
  Card,
  Transaction,
  WorkspaceSettings,
};
