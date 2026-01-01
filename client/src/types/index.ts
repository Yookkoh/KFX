// User types
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Workspace types
export type WorkspaceType = 'SOLE_TRADER' | 'PARTNERSHIP';
export type MemberRole = 'OWNER' | 'ADMIN' | 'MEMBER';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED';
export type TransactionStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

export interface Workspace {
  id: string;
  name: string;
  type: WorkspaceType;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: MemberRole;
  profitSplitPercentage: string;
  joinedAt: string;
  user: User;
}

export interface WorkspaceSettings {
  id: string;
  workspaceId: string;
  defaultUsdToMvrRate: string;
  defaultUsdtToMvrRate: string;
  theme: 'light' | 'dark' | 'system';
  currency: string;
}

export interface Invitation {
  id: string;
  workspaceId: string;
  email: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

// Card types
export interface Card {
  id: string;
  workspaceId: string;
  name: string;
  usdLimit: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CardWithUtilization extends Card {
  currentMonthUsage: number;
  utilizationPercentage: number;
  usedThisMonth: boolean;
}

// Transaction types
export interface Transaction {
  id: string;
  workspaceId: string;
  cardId: string;
  usdUsed: string;
  usdtReceived: string;
  buyRate: string;
  sellRate: string;
  cost: string;
  sale: string;
  profit: string;
  site: string | null;
  notes: string | null;
  status: TransactionStatus;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  card?: Card;
  createdBy?: User;
}

// Dashboard types
export interface DashboardStats {
  allTime: {
    totalTransactions: number;
    totalUsdUsed: number;
    totalUsdtReceived: number;
    totalCost: number;
    totalSale: number;
    totalProfit: number;
  };
  thisMonth: {
    totalTransactions: number;
    totalUsdUsed: number;
    totalUsdtReceived: number;
    totalCost: number;
    totalSale: number;
    totalProfit: number;
  };
  thisYear: {
    totalTransactions: number;
    totalUsdUsed: number;
    totalUsdtReceived: number;
    totalCost: number;
    totalSale: number;
    totalProfit: number;
  };
  partnerProfits: Array<{
    memberId: string;
    userId: string;
    userName: string;
    profitSplitPercentage: number;
    allTimeProfit: number;
    thisMonthProfit: number;
    thisYearProfit: number;
  }>;
  cardUtilization: Array<{
    cardId: string;
    cardName: string;
    cardColor: string;
    usdLimit: number;
    currentMonthUsage: number;
    utilizationPercentage: number;
    usedThisMonth: boolean;
  }>;
}

export interface MonthlyBreakdown {
  month: string;
  year: number;
  totalTransactions: number;
  totalUsdUsed: number;
  totalUsdtReceived: number;
  totalCost: number;
  totalSale: number;
  totalProfit: number;
}

export interface RecentActivity {
  id: string;
  type: 'transaction' | 'card' | 'member';
  description: string;
  amount?: number;
  timestamp: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth types
export interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  workspaceMember: WorkspaceMember | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsOnboarding: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface OnboardingData {
  workspaceName: string;
  workspaceType: WorkspaceType;
  defaultUsdToMvrRate: number;
  defaultUsdtToMvrRate: number;
  partnerEmails?: string[];
}

// Form types
export interface CardFormData {
  name: string;
  usdLimit: number;
  color: string;
  isActive?: boolean;
}

export interface TransactionFormData {
  cardId: string;
  usdUsed: number;
  usdtReceived: number;
  buyRate: number;
  sellRate: number;
  site?: string;
  notes?: string;
  status?: TransactionStatus;
  transactionDate?: string;
}

export interface SettingsFormData {
  defaultUsdToMvrRate: number;
  defaultUsdtToMvrRate: number;
  theme: 'light' | 'dark' | 'system';
  currency: string;
}

export interface InviteFormData {
  email: string;
}

export interface ProfitSplitFormData {
  memberId: string;
  profitSplitPercentage: number;
}

// Filter types
export interface TransactionFilters {
  cardId?: string;
  status?: TransactionStatus;
  startDate?: string;
  endDate?: string;
  month?: number;
  year?: number;
}
