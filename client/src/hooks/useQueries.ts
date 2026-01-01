import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cardsApi, transactionsApi, dashboardApi, settingsApi, workspaceApi } from '@/api/client';
import type { CardFormData, TransactionFormData, SettingsFormData, TransactionFilters } from '@/types';
import { toast } from 'sonner';

// Query keys
export const queryKeys = {
  cards: ['cards'] as const,
  cardsWithUtilization: ['cards', 'utilization'] as const,
  card: (id: string) => ['cards', id] as const,
  cardHistory: (id: string) => ['cards', id, 'history'] as const,
  cardMonthlyUsage: (id: string, month?: number, year?: number) => ['cards', id, 'monthly', month, year] as const,
  transactions: (filters?: TransactionFilters) => ['transactions', filters] as const,
  transaction: (id: string) => ['transactions', id] as const,
  dashboardStats: ['dashboard', 'stats'] as const,
  monthlyBreakdown: (year?: number) => ['dashboard', 'monthly', year] as const,
  recentActivity: (limit?: number) => ['dashboard', 'activity', limit] as const,
  topCards: (limit?: number) => ['dashboard', 'topCards', limit] as const,
  settings: ['settings'] as const,
  workspace: ['workspace'] as const,
  members: ['workspace', 'members'] as const,
  invitations: ['workspace', 'invitations'] as const,
};

// ============================================
// Cards Hooks
// ============================================

export function useCards() {
  return useQuery({
    queryKey: queryKeys.cards,
    queryFn: async () => {
      const response = await cardsApi.getAll();
      return response.data || [];
    },
  });
}

export function useCardsWithUtilization() {
  return useQuery({
    queryKey: queryKeys.cardsWithUtilization,
    queryFn: async () => {
      const response = await cardsApi.getAllWithUtilization();
      return response.data || [];
    },
  });
}

export function useCard(id: string) {
  return useQuery({
    queryKey: queryKeys.card(id),
    queryFn: async () => {
      const response = await cardsApi.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCardHistory(id: string) {
  return useQuery({
    queryKey: queryKeys.cardHistory(id),
    queryFn: async () => {
      const response = await cardsApi.getHistory(id);
      return response.data || [];
    },
    enabled: !!id,
  });
}

export function useCreateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CardFormData) => cardsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards });
      queryClient.invalidateQueries({ queryKey: queryKeys.cardsWithUtilization });
      toast.success('Card created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create card');
    },
  });
}

export function useUpdateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CardFormData> }) => cardsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards });
      queryClient.invalidateQueries({ queryKey: queryKeys.cardsWithUtilization });
      queryClient.invalidateQueries({ queryKey: queryKeys.card(id) });
      toast.success('Card updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update card');
    },
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cardsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards });
      queryClient.invalidateQueries({ queryKey: queryKeys.cardsWithUtilization });
      toast.success('Card deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete card');
    },
  });
}

// ============================================
// Transactions Hooks
// ============================================

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: queryKeys.transactions(filters),
    queryFn: async () => {
      const response = await transactionsApi.getAll(filters);
      return response.data || [];
    },
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: queryKeys.transaction(id),
    queryFn: async () => {
      const response = await transactionsApi.getById(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: TransactionFormData) => transactionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.cardsWithUtilization });
      toast.success('Transaction created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create transaction');
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TransactionFormData> }) => transactionsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.transaction(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.cardsWithUtilization });
      toast.success('Transaction updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update transaction');
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => transactionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.cardsWithUtilization });
      toast.success('Transaction deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete transaction');
    },
  });
}

export function useExportTransactions() {
  return useMutation({
    mutationFn: async (filters?: TransactionFilters) => {
      const blob = await transactionsApi.exportCsv(filters);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => {
      toast.success('Export started');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to export transactions');
    },
  });
}

// ============================================
// Dashboard Hooks
// ============================================

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: async () => {
      const response = await dashboardApi.getStats();
      return response.data;
    },
  });
}

export function useMonthlyBreakdown(year?: number) {
  return useQuery({
    queryKey: queryKeys.monthlyBreakdown(year),
    queryFn: async () => {
      const response = await dashboardApi.getMonthlyBreakdown(year);
      return response.data || [];
    },
  });
}

export function useRecentActivity(limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.recentActivity(limit),
    queryFn: async () => {
      const response = await dashboardApi.getRecentActivity(limit);
      return response.data || [];
    },
  });
}

export function useTopCards(limit: number = 5) {
  return useQuery({
    queryKey: queryKeys.topCards(limit),
    queryFn: async () => {
      const response = await dashboardApi.getTopCards(limit);
      return response.data || [];
    },
  });
}

// ============================================
// Settings Hooks
// ============================================

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: async () => {
      const response = await settingsApi.get();
      return response.data;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Partial<SettingsFormData>) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      toast.success('Settings updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update settings');
    },
  });
}

export function useUpdateRates() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { defaultUsdToMvrRate?: number; defaultUsdtToMvrRate?: number }) => settingsApi.updateRates(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings });
      toast.success('Rates updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update rates');
    },
  });
}

// ============================================
// Workspace Hooks
// ============================================

export function useWorkspace() {
  return useQuery({
    queryKey: queryKeys.workspace,
    queryFn: async () => {
      const response = await workspaceApi.getCurrent();
      return response.data;
    },
  });
}

export function useMembers() {
  return useQuery({
    queryKey: queryKeys.members,
    queryFn: async () => {
      const response = await workspaceApi.getMembers();
      return response.data || [];
    },
  });
}

export function useInvitations() {
  return useQuery({
    queryKey: queryKeys.invitations,
    queryFn: async () => {
      const response = await workspaceApi.getInvitations();
      return response.data || [];
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (email: string) => workspaceApi.inviteMember(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations });
      toast.success('Invitation sent successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send invitation');
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (invitationId: string) => workspaceApi.cancelInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invitations });
      toast.success('Invitation cancelled');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel invitation');
    },
  });
}

export function useUpdateProfitSplit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ memberId, profitSplitPercentage }: { memberId: string; profitSplitPercentage: number }) =>
      workspaceApi.updateProfitSplit(memberId, profitSplitPercentage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
      toast.success('Profit split updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update profit split');
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: string) => workspaceApi.removeMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
      toast.success('Member removed');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to remove member');
    },
  });
}
