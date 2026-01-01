import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings, DollarSign, Palette, Building2, Save, Moon, Sun, Monitor } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Skeleton,
} from '@/components/ui';
import { useSettings, useUpdateSettings, useUpdateRates } from '@/hooks/useQueries';
import { useAuthStore, useThemeStore } from '@/stores';
import { cn } from '@/lib/utils';

const ratesSchema = z.object({
  defaultUsdToMvrRate: z.number().positive('Rate must be positive'),
  defaultUsdtToMvrRate: z.number().positive('Rate must be positive'),
});

export function SettingsPage() {
  const { workspace, workspaceMember } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { data: settings, isLoading } = useSettings();
  const updateRatesMutation = useUpdateRates();

  const isOwner = workspaceMember?.role === 'OWNER';

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm({
    resolver: zodResolver(ratesSchema),
    values: {
      defaultUsdToMvrRate: settings?.defaultUsdToMvrRate ? parseFloat(settings.defaultUsdToMvrRate) : 15.42,
      defaultUsdtToMvrRate: settings?.defaultUsdtToMvrRate ? parseFloat(settings.defaultUsdtToMvrRate) : 15.50,
    },
  });

  const handleRatesSubmit = async (data: { defaultUsdToMvrRate: number; defaultUsdtToMvrRate: number }) => {
    await updateRatesMutation.mutateAsync(data);
    reset(data);
  };

  const themes = [
    { value: 'light' as const, label: 'Light', icon: Sun },
    { value: 'dark' as const, label: 'Dark', icon: Moon },
    { value: 'system' as const, label: 'System', icon: Monitor },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your workspace settings and preferences
        </p>
      </div>

      {/* Workspace Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Workspace Information
          </CardTitle>
          <CardDescription>
            Basic information about your workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-1/2" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Workspace Name</Label>
                  <Input value={workspace?.name || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Workspace Type</Label>
                  <Input
                    value={workspace?.type === 'PARTNERSHIP' ? 'Partnership' : 'Sole Trader'}
                    disabled
                  />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Contact support to change workspace name or type.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Default Rates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Default Exchange Rates
          </CardTitle>
          <CardDescription>
            These rates will be used as defaults when creating new transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <form onSubmit={handleSubmit(handleRatesSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="defaultUsdToMvrRate">USD → MVR Rate (Buy Rate)</Label>
                  <Input
                    id="defaultUsdToMvrRate"
                    type="number"
                    step="0.01"
                    disabled={!isOwner}
                    {...register('defaultUsdToMvrRate', { valueAsNumber: true })}
                  />
                  {errors.defaultUsdToMvrRate && (
                    <p className="text-sm text-destructive">{errors.defaultUsdToMvrRate.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    How many MVR per 1 USD when buying from customers
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultUsdtToMvrRate">USDT → MVR Rate (Sell Rate)</Label>
                  <Input
                    id="defaultUsdtToMvrRate"
                    type="number"
                    step="0.01"
                    disabled={!isOwner}
                    {...register('defaultUsdtToMvrRate', { valueAsNumber: true })}
                  />
                  {errors.defaultUsdtToMvrRate && (
                    <p className="text-sm text-destructive">{errors.defaultUsdtToMvrRate.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    How many MVR per 1 USDT when selling to customers
                  </p>
                </div>
              </div>
              {isOwner && (
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="gradient-primary"
                    disabled={!isDirty || updateRatesMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateRatesMutation.isPending ? 'Saving...' : 'Save Rates'}
                  </Button>
                </div>
              )}
              {!isOwner && (
                <p className="text-sm text-muted-foreground">
                  Only workspace owners can modify default rates.
                </p>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      {/* Theme Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how KinkyForex looks on your device
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="flex gap-2">
                {themes.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTheme(t.value)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all',
                      theme === t.value
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/50'
                    )}
                  >
                    <t.icon className={cn(
                      'w-4 h-4',
                      theme === t.value ? 'text-primary' : 'text-muted-foreground'
                    )} />
                    <span className={cn(
                      'text-sm font-medium',
                      theme === t.value ? 'text-primary' : 'text-muted-foreground'
                    )}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Account
          </CardTitle>
          <CardDescription>
            Your account information and role
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-xl">
              <div className="text-sm text-muted-foreground">Your Role</div>
              <div className="text-lg font-semibold mt-1">
                {workspaceMember?.role || 'Unknown'}
              </div>
            </div>
            <div className="p-4 bg-muted/50 rounded-xl">
              <div className="text-sm text-muted-foreground">Profit Split</div>
              <div className="text-lg font-semibold mt-1">
                {workspaceMember?.profitSplitPercentage || '0'}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isOwner && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-destructive/5 rounded-xl">
              <div>
                <div className="font-medium">Delete Workspace</div>
                <div className="text-sm text-muted-foreground">
                  Permanently delete this workspace and all its data
                </div>
              </div>
              <Button variant="destructive" disabled>
                Delete Workspace
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Workspace deletion is disabled. Contact support if you need to delete your workspace.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
