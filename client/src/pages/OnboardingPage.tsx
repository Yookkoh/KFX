import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Users, TrendingUp, ArrowRight, DollarSign } from 'lucide-react';
import { Button, Input, Label, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { useAuthStore } from '@/stores';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const onboardingSchema = z.object({
  workspaceName: z.string().min(2, 'Workspace name must be at least 2 characters'),
  workspaceType: z.enum(['SOLE_TRADER', 'PARTNERSHIP']),
  defaultUsdToMvrRate: z.number().positive('Rate must be positive'),
  defaultUsdtToMvrRate: z.number().positive('Rate must be positive'),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

export function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const { user, completeOnboarding } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      workspaceName: user?.name ? `${user.name}'s Workspace` : '',
      workspaceType: 'SOLE_TRADER',
      defaultUsdToMvrRate: 15.42,
      defaultUsdtToMvrRate: 15.50,
    },
  });

  const workspaceType = watch('workspaceType');

  const onSubmit = async (data: OnboardingFormData) => {
    setIsLoading(true);
    try {
      await completeOnboarding(data);
      toast.success('Welcome to KinkyForex!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Setup failed';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="w-14 h-14 gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Welcome to KinkyForex</CardTitle>
          <CardDescription>
            Let's set up your workspace in just a few steps
          </CardDescription>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {[1, 2].map((s) => (
              <div
                key={s}
                className={cn(
                  'w-20 h-1.5 rounded-full transition-colors',
                  s <= step ? 'bg-primary' : 'bg-muted'
                )}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            {step === 1 && (
              <div className="space-y-6 animate-fade-in">
                <div className="space-y-4">
                  <Label className="text-base">What type of account do you need?</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setValue('workspaceType', 'SOLE_TRADER')}
                      className={cn(
                        'p-6 rounded-xl border-2 text-left transition-all',
                        workspaceType === 'SOLE_TRADER'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      )}
                    >
                      <Building2 className={cn(
                        'w-8 h-8 mb-3',
                        workspaceType === 'SOLE_TRADER' ? 'text-primary' : 'text-muted-foreground'
                      )} />
                      <div className="font-semibold">Sole Trader</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Just me, tracking my own profits
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setValue('workspaceType', 'PARTNERSHIP')}
                      className={cn(
                        'p-6 rounded-xl border-2 text-left transition-all',
                        workspaceType === 'PARTNERSHIP'
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-muted-foreground/50'
                      )}
                    >
                      <Users className={cn(
                        'w-8 h-8 mb-3',
                        workspaceType === 'PARTNERSHIP' ? 'text-primary' : 'text-muted-foreground'
                      )} />
                      <div className="font-semibold">Partnership</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Working with partners, split profits
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workspaceName">Workspace Name</Label>
                  <Input
                    id="workspaceName"
                    placeholder="My Trading Business"
                    {...register('workspaceName')}
                  />
                  {errors.workspaceName && (
                    <p className="text-sm text-destructive">{errors.workspaceName.message}</p>
                  )}
                </div>

                <Button
                  type="button"
                  className="w-full gradient-primary"
                  onClick={() => setStep(2)}
                >
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-fade-in">
                <div>
                  <Label className="text-base mb-4 block">Set your default exchange rates</Label>
                  <p className="text-sm text-muted-foreground mb-4">
                    These rates will be used as defaults when creating new transactions. You can always change them later.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="defaultUsdToMvrRate">USD → MVR Rate (Buy Rate)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="defaultUsdToMvrRate"
                        type="number"
                        step="0.01"
                        className="pl-10"
                        {...register('defaultUsdToMvrRate', { valueAsNumber: true })}
                      />
                    </div>
                    {errors.defaultUsdToMvrRate && (
                      <p className="text-sm text-destructive">{errors.defaultUsdToMvrRate.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      How many MVR per 1 USD when buying from customers
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultUsdtToMvrRate">USDT → MVR Rate (Sell Rate)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="defaultUsdtToMvrRate"
                        type="number"
                        step="0.01"
                        className="pl-10"
                        {...register('defaultUsdtToMvrRate', { valueAsNumber: true })}
                      />
                    </div>
                    {errors.defaultUsdtToMvrRate && (
                      <p className="text-sm text-destructive">{errors.defaultUsdtToMvrRate.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      How many MVR per 1 USDT when selling to customers
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-xl">
                  <div className="text-sm font-medium mb-2">Profit Calculation Example</div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>If you use 100 USD to buy USDT:</p>
                    <p>• Cost = 100 × {watch('defaultUsdToMvrRate') || 15.42} = MVR {(100 * (watch('defaultUsdToMvrRate') || 15.42)).toFixed(2)}</p>
                    <p>• Sale (100 USDT) = 100 × {watch('defaultUsdtToMvrRate') || 15.50} = MVR {(100 * (watch('defaultUsdtToMvrRate') || 15.50)).toFixed(2)}</p>
                    <p className="text-emerald-600 dark:text-emerald-400 font-medium">
                      • Profit = MVR {((100 * (watch('defaultUsdtToMvrRate') || 15.50)) - (100 * (watch('defaultUsdToMvrRate') || 15.42))).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 gradient-primary"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Setting up...' : 'Complete Setup'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
