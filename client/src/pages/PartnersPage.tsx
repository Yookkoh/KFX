import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, UserPlus, Mail, Trash2, Clock, CheckCircle, XCircle, Percent } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Skeleton,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui';
import {
  useMembers,
  useInvitations,
  useInviteMember,
  useCancelInvitation,
  useUpdateProfitSplit,
  useRemoveMember,
} from '@/hooks/useQueries';
import { useAuthStore } from '@/stores';
import { formatDate, formatPercentage, getInitials, getRoleColor, cn } from '@/lib/utils';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
});

const splitSchema = z.object({
  profitSplitPercentage: z.number().min(0).max(100),
});

export function PartnersPage() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [editingSplit, setEditingSplit] = useState<{ memberId: string; currentSplit: number } | null>(null);
  const [removingMember, setRemovingMember] = useState<{ id: string; name: string } | null>(null);

  const { workspace, workspaceMember } = useAuthStore();
  const { data: members, isLoading: membersLoading } = useMembers();
  const { data: invitations, isLoading: invitationsLoading } = useInvitations();
  const inviteMutation = useInviteMember();
  const cancelMutation = useCancelInvitation();
  const updateSplitMutation = useUpdateProfitSplit();
  const removeMutation = useRemoveMember();

  const isOwner = workspaceMember?.role === 'OWNER';
  const isPartnership = workspace?.type === 'PARTNERSHIP';

  const pendingInvitations = invitations?.filter((i) => i.status === 'PENDING') || [];

  const handleInvite = async (data: { email: string }) => {
    await inviteMutation.mutateAsync(data.email);
    setIsInviteOpen(false);
  };

  const handleCancelInvitation = async (invitationId: string) => {
    await cancelMutation.mutateAsync(invitationId);
  };

  const handleUpdateSplit = async (data: { profitSplitPercentage: number }) => {
    if (editingSplit) {
      await updateSplitMutation.mutateAsync({
        memberId: editingSplit.memberId,
        profitSplitPercentage: data.profitSplitPercentage,
      });
      setEditingSplit(null);
    }
  };

  const handleRemoveMember = async () => {
    if (removingMember) {
      await removeMutation.mutateAsync(removingMember.id);
      setRemovingMember(null);
    }
  };

  // Calculate total profit split
  const totalSplit = members?.reduce((sum, m) => sum + parseFloat(m.profitSplitPercentage), 0) || 0;

  if (!isPartnership) {
    return (
      <div className="p-6 lg:p-8">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Partners Not Available</h2>
            <p className="text-muted-foreground mb-4">
              Your workspace is set up as a Sole Trader account. Partners feature is only available for Partnership accounts.
            </p>
            <p className="text-sm text-muted-foreground">
              To use the Partners feature, you would need to create a new workspace with Partnership type.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold">Partners</h1>
          <p className="text-muted-foreground mt-1">
            Manage your business partners and profit splits
          </p>
        </div>
        {isOwner && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Partner
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Partner</DialogTitle>
                <DialogDescription>
                  Send an invitation to add a new partner to your workspace
                </DialogDescription>
              </DialogHeader>
              <InviteForm
                onSubmit={handleInvite}
                isLoading={inviteMutation.isPending}
                onCancel={() => setIsInviteOpen(false)}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Profit Split Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profit Split Summary</CardTitle>
          <CardDescription>
            Total profit split allocation across all partners
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden flex">
              {members?.map((member, index) => (
                <div
                  key={member.id}
                  className="h-full transition-all"
                  style={{
                    width: `${parseFloat(member.profitSplitPercentage)}%`,
                    backgroundColor: `hsl(${(index * 60) + 260}, 70%, 60%)`,
                  }}
                  title={`${member.user.name}: ${member.profitSplitPercentage}%`}
                />
              ))}
            </div>
            <span className={cn(
              'font-mono font-medium',
              totalSplit === 100 ? 'text-emerald-600' : 'text-amber-600'
            )}>
              {formatPercentage(totalSplit)}
            </span>
          </div>
          {totalSplit !== 100 && (
            <p className="text-sm text-amber-600 mt-2">
              Total split should equal 100%. Please adjust partner splits.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {membersLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))
            ) : members && members.length > 0 ? (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.user.avatarUrl || undefined} />
                      <AvatarFallback>
                        {getInitials(member.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{member.user.name}</div>
                      <div className="text-sm text-muted-foreground">{member.user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge variant="secondary" className={getRoleColor(member.role)}>
                        {member.role}
                      </Badge>
                      <div className="text-sm mt-1 font-mono">
                        {formatPercentage(parseFloat(member.profitSplitPercentage))}
                      </div>
                    </div>
                    {isOwner && member.role !== 'OWNER' && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingSplit({
                            memberId: member.id,
                            currentSplit: parseFloat(member.profitSplitPercentage),
                          })}
                        >
                          <Percent className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRemovingMember({
                            id: member.id,
                            name: member.user.name || 'this member',
                          })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-4">
                No team members yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invitations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {invitationsLoading ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))
            ) : pendingInvitations.length > 0 ? (
              pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <div className="font-medium">{invitation.email}</div>
                      <div className="text-sm text-muted-foreground">
                        Expires {formatDate(invitation.expiresAt)}
                      </div>
                    </div>
                  </div>
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleCancelInvitation(invitation.id)}
                      disabled={cancelMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                <Mail className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No pending invitations</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Split Dialog */}
      <Dialog open={!!editingSplit} onOpenChange={() => setEditingSplit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Profit Split</DialogTitle>
            <DialogDescription>
              Adjust the profit split percentage for this partner
            </DialogDescription>
          </DialogHeader>
          {editingSplit && (
            <SplitForm
              currentSplit={editingSplit.currentSplit}
              onSubmit={handleUpdateSplit}
              isLoading={updateSplitMutation.isPending}
              onCancel={() => setEditingSplit(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={!!removingMember} onOpenChange={() => setRemovingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Partner</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {removingMember?.name} from this workspace?
              They will lose access to all workspace data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setRemovingMember(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveMember}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? 'Removing...' : 'Remove Partner'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Invite Form Component
function InviteForm({
  onSubmit,
  isLoading,
  onCancel,
}: {
  onSubmit: (data: { email: string }) => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(inviteSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Partner's Email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="partner@example.com"
            className="pl-10"
            {...register('email')}
          />
        </div>
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message as string}</p>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        An invitation link will be sent to this email. The link expires in 7 days.
      </p>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="gradient-primary" disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send Invitation'}
        </Button>
      </div>
    </form>
  );
}

// Split Form Component
function SplitForm({
  currentSplit,
  onSubmit,
  isLoading,
  onCancel,
}: {
  currentSplit: number;
  onSubmit: (data: { profitSplitPercentage: number }) => Promise<void>;
  isLoading: boolean;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(splitSchema),
    defaultValues: {
      profitSplitPercentage: currentSplit,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="profitSplitPercentage">Profit Split Percentage</Label>
        <div className="relative">
          <Input
            id="profitSplitPercentage"
            type="number"
            step="0.01"
            min="0"
            max="100"
            {...register('profitSplitPercentage', { valueAsNumber: true })}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
        </div>
        {errors.profitSplitPercentage && (
          <p className="text-sm text-destructive">{errors.profitSplitPercentage.message as string}</p>
        )}
      </div>
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="gradient-primary" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update Split'}
        </Button>
      </div>
    </form>
  );
}
