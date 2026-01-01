import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Download, Edit2, Trash2, Filter, ArrowUpDown, Search, MoreVertical, Calendar } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Skeleton,
  Badge,
} from '@/components/ui';
import {
  useTransactions,
  useCards,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  useExportTransactions,
  useSettings,
} from '@/hooks/useQueries';
import { formatCurrency, formatDate, formatNumber, getProfitColor, getStatusColor, cn } from '@/lib/utils';
import type { Transaction, TransactionFormData, TransactionFilters, TransactionStatus } from '@/types';

const transactionSchema = z.object({
  cardId: z.string().min(1, 'Card is required'),
  usdUsed: z.number().positive('USD amount must be positive'),
  usdtReceived: z.number().positive('USDT amount must be positive'),
  buyRate: z.number().positive('Buy rate must be positive'),
  sellRate: z.number().positive('Sell rate must be positive'),
  site: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
  transactionDate: z.string().optional(),
});

export function TransactionsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [searchQuery, setSearchQuery] = useState('');

  const { data: transactions, isLoading } = useTransactions(filters);
  const { data: cards } = useCards();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();
  const exportMutation = useExportTransactions();

  // Filter transactions by search query
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (!searchQuery) return transactions;
    
    const query = searchQuery.toLowerCase();
    return transactions.filter((t) =>
      t.card?.name.toLowerCase().includes(query) ||
      t.site?.toLowerCase().includes(query) ||
      t.notes?.toLowerCase().includes(query)
    );
  }, [transactions, searchQuery]);

  const handleCreate = async (data: TransactionFormData) => {
    await createMutation.mutateAsync(data);
    setIsCreateOpen(false);
  };

  const handleUpdate = async (data: TransactionFormData) => {
    if (editingTransaction) {
      await updateMutation.mutateAsync({ id: editingTransaction.id, data });
      setEditingTransaction(null);
    }
  };

  const handleDelete = async () => {
    if (deletingTransaction) {
      await deleteMutation.mutateAsync(deletingTransaction.id);
      setDeletingTransaction(null);
    }
  };

  const handleExport = () => {
    exportMutation.mutate(filters);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage all your USDT transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exportMutation.isPending}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                New Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>New Transaction</DialogTitle>
                <DialogDescription>
                  Record a new USDT trading transaction
                </DialogDescription>
              </DialogHeader>
              <TransactionForm
                cards={cards || []}
                onSubmit={handleCreate}
                isLoading={createMutation.isPending}
                onCancel={() => setIsCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={filters.cardId || 'all'}
              onValueChange={(value) => setFilters((f) => ({ ...f, cardId: value === 'all' ? undefined : value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Cards" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Cards</SelectItem>
                {cards?.map((card) => (
                  <SelectItem key={card.id} value={card.id}>
                    {card.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => setFilters((f) => ({ ...f, status: value === 'all' ? undefined : value as TransactionStatus }))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Card</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">USD</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">USDT</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Cost</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Sale</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Profit</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((transaction) => (
                    <tr key={transaction.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm">{formatDate(transaction.transactionDate)}</div>
                        {transaction.site && (
                          <div className="text-xs text-muted-foreground">{transaction.site}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: transaction.card?.color }}
                          />
                          <span className="text-sm">{transaction.card?.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {formatNumber(parseFloat(transaction.usdUsed))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {formatNumber(parseFloat(transaction.usdtReceived))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {formatCurrency(parseFloat(transaction.cost))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {formatCurrency(parseFloat(transaction.sale))}
                      </td>
                      <td className={cn('px-4 py-3 text-right font-mono text-sm font-medium', getProfitColor(transaction.profit))}>
                        {formatCurrency(parseFloat(transaction.profit))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary" className={getStatusColor(transaction.status)}>
                          {transaction.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingTransaction(transaction)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeletingTransaction(transaction)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowUpDown className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
              <p className="text-muted-foreground mb-4">
                Start tracking your profits by adding your first transaction
              </p>
              <Button onClick={() => setIsCreateOpen(true)} className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add First Transaction
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingTransaction} onOpenChange={() => setEditingTransaction(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
            <DialogDescription>
              Update transaction details
            </DialogDescription>
          </DialogHeader>
          {editingTransaction && (
            <TransactionForm
              cards={cards || []}
              defaultValues={{
                cardId: editingTransaction.cardId,
                usdUsed: parseFloat(editingTransaction.usdUsed),
                usdtReceived: parseFloat(editingTransaction.usdtReceived),
                buyRate: parseFloat(editingTransaction.buyRate),
                sellRate: parseFloat(editingTransaction.sellRate),
                site: editingTransaction.site || undefined,
                notes: editingTransaction.notes || undefined,
                status: editingTransaction.status,
                transactionDate: editingTransaction.transactionDate.split('T')[0],
              }}
              onSubmit={handleUpdate}
              isLoading={updateMutation.isPending}
              onCancel={() => setEditingTransaction(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTransaction} onOpenChange={() => setDeletingTransaction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeletingTransaction(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Transaction Form Component
function TransactionForm({
  cards,
  defaultValues,
  onSubmit,
  isLoading,
  onCancel,
}: {
  cards: { id: string; name: string; color: string }[];
  defaultValues?: Partial<TransactionFormData>;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
}) {
  const { data: settings } = useSettings();
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      cardId: '',
      usdUsed: 0,
      usdtReceived: 0,
      buyRate: settings?.defaultUsdToMvrRate ? parseFloat(settings.defaultUsdToMvrRate) : 15.42,
      sellRate: settings?.defaultUsdtToMvrRate ? parseFloat(settings.defaultUsdtToMvrRate) : 15.50,
      status: 'COMPLETED',
      transactionDate: new Date().toISOString().split('T')[0],
      ...defaultValues,
    },
  });

  const usdUsed = watch('usdUsed') || 0;
  const usdtReceived = watch('usdtReceived') || 0;
  const buyRate = watch('buyRate') || 0;
  const sellRate = watch('sellRate') || 0;

  // Calculate profit preview
  const cost = usdUsed * buyRate;
  const sale = usdtReceived * sellRate;
  const profit = sale - cost;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-2">
          <Label>Card</Label>
          <Select
            value={watch('cardId')}
            onValueChange={(value) => setValue('cardId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a card" />
            </SelectTrigger>
            <SelectContent>
              {cards.map((card) => (
                <SelectItem key={card.id} value={card.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.color }} />
                    {card.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.cardId && (
            <p className="text-sm text-destructive">{errors.cardId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="usdUsed">USD Used</Label>
          <Input
            id="usdUsed"
            type="number"
            step="0.01"
            {...register('usdUsed', { valueAsNumber: true })}
          />
          {errors.usdUsed && (
            <p className="text-sm text-destructive">{errors.usdUsed.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="usdtReceived">USDT Received</Label>
          <Input
            id="usdtReceived"
            type="number"
            step="0.01"
            {...register('usdtReceived', { valueAsNumber: true })}
          />
          {errors.usdtReceived && (
            <p className="text-sm text-destructive">{errors.usdtReceived.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="buyRate">Buy Rate (USD→MVR)</Label>
          <Input
            id="buyRate"
            type="number"
            step="0.01"
            {...register('buyRate', { valueAsNumber: true })}
          />
          {errors.buyRate && (
            <p className="text-sm text-destructive">{errors.buyRate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="sellRate">Sell Rate (USDT→MVR)</Label>
          <Input
            id="sellRate"
            type="number"
            step="0.01"
            {...register('sellRate', { valueAsNumber: true })}
          />
          {errors.sellRate && (
            <p className="text-sm text-destructive">{errors.sellRate.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="site">Site/Platform</Label>
          <Input
            id="site"
            placeholder="e.g., Binance"
            {...register('site')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={watch('status')}
            onValueChange={(value) => setValue('status', value as TransactionStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="transactionDate">Transaction Date</Label>
          <Input
            id="transactionDate"
            type="date"
            {...register('transactionDate')}
          />
        </div>

        <div className="col-span-2 space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            placeholder="Optional notes..."
            {...register('notes')}
          />
        </div>
      </div>

      {/* Profit Preview */}
      <div className="p-4 bg-muted/50 rounded-xl space-y-2">
        <div className="text-sm font-medium">Calculation Preview</div>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Cost</span>
            <div className="font-mono">{formatCurrency(cost)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Sale</span>
            <div className="font-mono">{formatCurrency(sale)}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Profit</span>
            <div className={cn('font-mono font-medium', getProfitColor(profit))}>
              {formatCurrency(profit)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="gradient-primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : defaultValues ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
