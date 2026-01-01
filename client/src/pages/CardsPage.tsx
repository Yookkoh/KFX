import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Edit2, Trash2, CreditCard, MoreVertical } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Skeleton,
  Badge,
} from '@/components/ui';
import { useCardsWithUtilization, useCreateCard, useUpdateCard, useDeleteCard } from '@/hooks/useQueries';
import { formatCurrency, formatPercentage, getUtilizationBarColor, CARD_COLORS, cn } from '@/lib/utils';
import type { Card as CardType, CardFormData } from '@/types';

const cardSchema = z.object({
  name: z.string().min(1, 'Card name is required'),
  usdLimit: z.number().positive('USD limit must be positive'),
  color: z.string(),
  isActive: z.boolean().optional(),
});

export function CardsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<CardType | null>(null);
  const [deletingCard, setDeletingCard] = useState<CardType | null>(null);

  const { data: cards, isLoading } = useCardsWithUtilization();
  const createMutation = useCreateCard();
  const updateMutation = useUpdateCard();
  const deleteMutation = useDeleteCard();

  const handleCreate = async (data: CardFormData) => {
    await createMutation.mutateAsync(data);
    setIsCreateOpen(false);
  };

  const handleUpdate = async (data: CardFormData) => {
    if (editingCard) {
      await updateMutation.mutateAsync({ id: editingCard.id, data });
      setEditingCard(null);
    }
  };

  const handleDelete = async () => {
    if (deletingCard) {
      await deleteMutation.mutateAsync(deletingCard.id);
      setDeletingCard(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Cards</h1>
          <p className="text-muted-foreground mt-1">
            Manage your trading cards and track utilization
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Card
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Card</DialogTitle>
              <DialogDescription>
                Create a new card to track your transactions
              </DialogDescription>
            </DialogHeader>
            <CardForm
              onSubmit={handleCreate}
              isLoading={createMutation.isPending}
              onCancel={() => setIsCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : cards && cards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Card key={card.id} className="card-shine overflow-hidden">
              <div
                className="h-2"
                style={{ backgroundColor: card.color }}
              />
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${card.color}20` }}
                    >
                      <CreditCard className="w-5 h-5" style={{ color: card.color }} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{card.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Limit: {formatCurrency(parseFloat(card.usdLimit), 'USD')}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingCard(card)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeletingCard(card)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Utilization */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Monthly Usage</span>
                    <span className="font-medium">
                      {formatPercentage(card.utilizationPercentage)}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full transition-all', getUtilizationBarColor(card.utilizationPercentage))}
                      style={{ width: `${Math.min(card.utilizationPercentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(card.currentMonthUsage, 'USD')} used</span>
                    <span>{formatCurrency(parseFloat(card.usdLimit) - card.currentMonthUsage, 'USD')} remaining</span>
                  </div>
                </div>

                {/* Status */}
                <div className="mt-4 flex items-center justify-between">
                  <Badge variant={card.isActive ? 'default' : 'secondary'}>
                    {card.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  {card.usedThisMonth && (
                    <span className="text-xs text-muted-foreground">Used this month</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No cards yet</h3>
            <p className="text-muted-foreground mb-4">
              Get started by adding your first card to track transactions
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Card
            </Button>
          </div>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingCard} onOpenChange={() => setEditingCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Card</DialogTitle>
            <DialogDescription>
              Update your card details
            </DialogDescription>
          </DialogHeader>
          {editingCard && (
            <CardForm
              defaultValues={{
                name: editingCard.name,
                usdLimit: parseFloat(editingCard.usdLimit),
                color: editingCard.color,
                isActive: editingCard.isActive,
              }}
              onSubmit={handleUpdate}
              isLoading={updateMutation.isPending}
              onCancel={() => setEditingCard(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingCard} onOpenChange={() => setDeletingCard(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Card</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingCard?.name}"? This action cannot be undone.
              All transactions associated with this card will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeletingCard(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Card'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Card Form Component
function CardForm({
  defaultValues,
  onSubmit,
  isLoading,
  onCancel,
}: {
  defaultValues?: Partial<CardFormData>;
  onSubmit: (data: CardFormData) => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: '',
      usdLimit: 1000,
      color: CARD_COLORS[0],
      isActive: true,
      ...defaultValues,
    },
  });

  const selectedColor = watch('color');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Card Name</Label>
        <Input
          id="name"
          placeholder="e.g., BML Visa Card"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="usdLimit">Monthly USD Limit</Label>
        <Input
          id="usdLimit"
          type="number"
          step="0.01"
          placeholder="1000"
          {...register('usdLimit', { valueAsNumber: true })}
        />
        {errors.usdLimit && (
          <p className="text-sm text-destructive">{errors.usdLimit.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Card Color</Label>
        <div className="flex flex-wrap gap-2">
          {CARD_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setValue('color', color)}
              className={cn(
                'w-8 h-8 rounded-full transition-transform',
                selectedColor === color && 'ring-2 ring-offset-2 ring-primary scale-110'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {defaultValues && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            {...register('isActive')}
            className="w-4 h-4 rounded border-input"
          />
          <Label htmlFor="isActive" className="cursor-pointer">
            Card is active
          </Label>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="gradient-primary" disabled={isLoading}>
          {isLoading ? 'Saving...' : defaultValues ? 'Update Card' : 'Create Card'}
        </Button>
      </div>
    </form>
  );
}
