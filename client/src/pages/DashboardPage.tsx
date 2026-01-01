import { TrendingUp, TrendingDown, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui';
import { useDashboardStats, useMonthlyBreakdown, useCardsWithUtilization } from '@/hooks/useQueries';
import { useAuthStore } from '@/stores';
import { formatCurrency, formatNumber, formatPercentage, getUtilizationBarColor, getProfitColor, getMonthName, formatRelativeTime } from '@/lib/utils';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { cn } from '@/lib/utils';

export function DashboardPage() {
  const { workspace } = useAuthStore();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: monthlyData, isLoading: monthlyLoading } = useMonthlyBreakdown();
  const { data: cards, isLoading: cardsLoading } = useCardsWithUtilization();

  // Format monthly data for chart
  const chartData = monthlyData?.map((m) => ({
    name: getMonthName(parseInt(m.month)).slice(0, 3),
    profit: m.totalProfit,
    transactions: m.totalTransactions,
  })) || [];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here's your trading overview.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatsCard
          title="Total Profit (All Time)"
          value={stats?.allTime.totalProfit || 0}
          loading={statsLoading}
          icon={TrendingUp}
          trend={stats?.allTime.totalProfit && stats.allTime.totalProfit > 0 ? 'up' : 'down'}
          isCurrency
        />
        <StatsCard
          title="This Month's Profit"
          value={stats?.thisMonth.totalProfit || 0}
          loading={statsLoading}
          icon={DollarSign}
          trend={stats?.thisMonth.totalProfit && stats.thisMonth.totalProfit > 0 ? 'up' : 'down'}
          isCurrency
        />
        <StatsCard
          title="Total Transactions"
          value={stats?.allTime.totalTransactions || 0}
          loading={statsLoading}
          icon={Activity}
          subtitle={`${stats?.thisMonth.totalTransactions || 0} this month`}
        />
        <StatsCard
          title="Active Cards"
          value={cards?.filter(c => c.isActive).length || 0}
          loading={cardsLoading}
          icon={CreditCard}
          subtitle={`${cards?.length || 0} total cards`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profit Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Monthly Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <Skeleton className="h-[300px] w-full rounded-lg" />
            ) : chartData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      tickFormatter={(value) => formatNumber(value, 0)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Profit']}
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#profitGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No data available yet. Start adding transactions!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Partner Profits */}
        {workspace?.type === 'PARTNERSHIP' && stats?.partnerProfits && stats.partnerProfits.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Partner Profits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.partnerProfits.map((partner) => (
                <div key={partner.memberId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{partner.userName}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatPercentage(partner.profitSplitPercentage)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">This month</span>
                    <span className={getProfitColor(partner.thisMonthProfit)}>
                      {formatCurrency(partner.thisMonthProfit)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">All time</span>
                    <span className={getProfitColor(partner.allTimeProfit)}>
                      {formatCurrency(partner.allTimeProfit)}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Card Utilization (if not partnership or as additional widget) */}
        {(workspace?.type !== 'PARTNERSHIP' || !stats?.partnerProfits?.length) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Card Utilization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cardsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))
              ) : cards && cards.length > 0 ? (
                cards.slice(0, 5).map((card) => (
                  <div key={card.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: card.color }}
                        />
                        <span className="font-medium text-sm">{card.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
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
                      <span>{formatCurrency(card.currentMonthUsage, 'USD')}</span>
                      <span>{formatCurrency(parseFloat(card.usdLimit), 'USD')}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  No cards yet. Add your first card!
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Transaction Volume</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <Skeleton className="h-[200px] w-full rounded-lg" />
            ) : chartData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis 
                      dataKey="name" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [value, 'Transactions']}
                    />
                    <Bar 
                      dataKey="transactions" 
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No transaction data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="text-sm text-muted-foreground">Total USD Used</div>
                <div className="text-xl font-bold mt-1">
                  {statsLoading ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    formatCurrency(stats?.allTime.totalUsdUsed || 0, 'USD')
                  )}
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="text-sm text-muted-foreground">Total USDT Received</div>
                <div className="text-xl font-bold mt-1">
                  {statsLoading ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    formatNumber(stats?.allTime.totalUsdtReceived || 0) + ' USDT'
                  )}
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="text-sm text-muted-foreground">Total Cost</div>
                <div className="text-xl font-bold mt-1">
                  {statsLoading ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    formatCurrency(stats?.allTime.totalCost || 0)
                  )}
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="text-sm text-muted-foreground">Total Sale</div>
                <div className="text-xl font-bold mt-1">
                  {statsLoading ? (
                    <Skeleton className="h-6 w-20" />
                  ) : (
                    formatCurrency(stats?.allTime.totalSale || 0)
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  loading,
  icon: Icon,
  trend,
  isCurrency,
  subtitle,
}: {
  title: string;
  value: number;
  loading: boolean;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down';
  isCurrency?: boolean;
  subtitle?: string;
}) {
  return (
    <Card className="card-shine">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className={cn(
                'text-2xl font-bold',
                isCurrency && getProfitColor(value)
              )}>
                {isCurrency ? formatCurrency(value) : formatNumber(value, 0)}
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            trend === 'up' ? 'bg-emerald-100 dark:bg-emerald-900/30' :
            trend === 'down' ? 'bg-rose-100 dark:bg-rose-900/30' :
            'bg-primary/10'
          )}>
            <Icon className={cn(
              'w-5 h-5',
              trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
              trend === 'down' ? 'text-rose-600 dark:text-rose-400' :
              'text-primary'
            )} />
          </div>
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 mt-2 text-xs',
            trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
          )}>
            {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            <span>{trend === 'up' ? 'Profit' : 'Loss'}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
