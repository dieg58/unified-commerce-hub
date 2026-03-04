import { useState, useMemo } from "react";
import TopBar from "@/components/TopBar";
import { useAuth } from "@/hooks/useAuth";
import { useTenantContext } from "@/hooks/useTenantContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/mock-data";
import { StatCard } from "@/components/DashboardWidgets";
import { Loader2, ShoppingCart, TrendingUp, Package, Wallet, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, subDays, subMonths, startOfMonth, endOfMonth, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { fr, enGB, nl } from "date-fns/locale";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { useTranslation } from "react-i18next";
import { useLocaleDate } from "@/hooks/useLocaleDate";

const CHART_COLORS = [
  "hsl(24, 10%, 10%)",
  "hsl(36, 45%, 60%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(220, 70%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(170, 60%, 45%)",
];

const dateFnsLocales: Record<string, any> = { fr, en: enGB, nl };

const TenantStats = () => {
  const { profile } = useAuth();
  const { tenantId: ctxTenantId } = useTenantContext();
  const tenantId = ctxTenantId || profile?.tenant_id;
  const { t, i18n } = useTranslation();
  const dfLocale = dateFnsLocales[i18n.language] || fr;

  const PERIOD_PRESETS = useMemo(() => [
    { label: t("stats.7days"), days: 7 },
    { label: t("stats.30days"), days: 30 },
    { label: t("stats.90days"), days: 90 },
    { label: t("stats.thisMonth"), key: "month" as const },
    { label: t("stats.lastMonth"), key: "last_month" as const },
  ], [t]);

  const now = new Date();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(now, 30),
    to: now,
  });
  const [compareRange, setCompareRange] = useState<{ from: Date; to: Date } | null>(null);

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["analytics-orders", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, entities(name), order_items(qty, unit_price, products(name))")
        .eq("tenant_id", tenantId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const { data: budgets } = useQuery({
    queryKey: ["analytics-budgets", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("*, entities(name)")
        .eq("tenant_id", tenantId!);
      if (error) throw error;
      return data;
    },
    enabled: !!tenantId,
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) =>
      isWithinInterval(new Date(o.created_at), {
        start: startOfDay(dateRange.from),
        end: endOfDay(dateRange.to),
      })
    );
  }, [orders, dateRange]);

  const comparedOrders = useMemo(() => {
    if (!orders || !compareRange) return null;
    return orders.filter((o) =>
      isWithinInterval(new Date(o.created_at), {
        start: startOfDay(compareRange.from),
        end: endOfDay(compareRange.to),
      })
    );
  }, [orders, compareRange]);

  const totalRevenue = filteredOrders.reduce((s, o) => s + Number(o.total), 0);
  const totalOrders = filteredOrders.length;
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const pendingCount = filteredOrders.filter((o) => o.status === "pending" || o.status === "pending_approval").length;

  const prevRevenue = comparedOrders?.reduce((s, o) => s + Number(o.total), 0);
  const revenueChange = prevRevenue != null && prevRevenue > 0
    ? `${((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(1)}%`
    : undefined;

  const salesEvolution = useMemo(() => {
    const byDay: Record<string, { date: string; revenue: number; orders: number; prevRevenue?: number }> = {};
    const rangeDays = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / 86400000) + 1;

    for (let i = 0; i < rangeDays; i++) {
      const d = new Date(dateRange.from);
      d.setDate(d.getDate() + i);
      const key = format(d, "yyyy-MM-dd");
      byDay[key] = { date: format(d, "dd/MM", { locale: dfLocale }), revenue: 0, orders: 0 };
    }

    filteredOrders.forEach((o) => {
      const key = format(new Date(o.created_at), "yyyy-MM-dd");
      if (byDay[key]) {
        byDay[key].revenue += Number(o.total);
        byDay[key].orders += 1;
      }
    });

    if (comparedOrders && compareRange) {
      const compDays = Math.ceil((compareRange.to.getTime() - compareRange.from.getTime()) / 86400000) + 1;
      const compByDay: Record<number, number> = {};
      comparedOrders.forEach((o) => {
        const dayIdx = Math.floor((new Date(o.created_at).getTime() - compareRange.from.getTime()) / 86400000);
        compByDay[dayIdx] = (compByDay[dayIdx] || 0) + Number(o.total);
      });

      const entries = Object.values(byDay);
      entries.forEach((entry, i) => {
        if (i < compDays) {
          (entry as any).prevRevenue = compByDay[i] || 0;
        }
      });
    }

    return Object.values(byDay);
  }, [filteredOrders, comparedOrders, dateRange, compareRange, dfLocale]);

  const topProducts = useMemo(() => {
    const productTotals: Record<string, { name: string; revenue: number; qty: number }> = {};
    filteredOrders.forEach((o) => {
      (o.order_items as any[])?.forEach((item) => {
        const prod = (item.products as any);
        const name = prod?.name || t("common.noData");
        if (!productTotals[name]) productTotals[name] = { name, revenue: 0, qty: 0 };
        productTotals[name].revenue += Number(item.unit_price) * item.qty;
        productTotals[name].qty += item.qty;
      });
    });
    return Object.values(productTotals).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [filteredOrders, t]);

  const entityDistribution = useMemo(() => {
    const byEntity: Record<string, { name: string; value: number }> = {};
    filteredOrders.forEach((o) => {
      const name = (o.entities as any)?.name || t("common.noData");
      if (!byEntity[name]) byEntity[name] = { name, value: 0 };
      byEntity[name].value += Number(o.total);
    });
    return Object.values(byEntity).sort((a, b) => b.value - a.value);
  }, [filteredOrders, t]);

  const budgetData = useMemo(() => {
    if (!budgets) return [];
    return budgets.map((b) => ({
      name: `${(b as any).entities?.name || "—"} (${b.store_type === "bulk" ? t("stats.int") : t("stats.emp")})`,
      budget: Number(b.amount),
      spent: Number(b.spent),
      pct: Number(b.amount) > 0 ? Math.round((Number(b.spent) / Number(b.amount)) * 100) : 0,
    }));
  }, [budgets, t]);

  const setPreset = (preset: typeof PERIOD_PRESETS[number]) => {
    if ("days" in preset) {
      setDateRange({ from: subDays(now, preset.days), to: now });
    } else if (preset.key === "month") {
      setDateRange({ from: startOfMonth(now), to: now });
    } else if (preset.key === "last_month") {
      const lm = subMonths(now, 1);
      setDateRange({ from: startOfMonth(lm), to: endOfMonth(lm) });
    }
  };

  const toggleCompare = () => {
    if (compareRange) {
      setCompareRange(null);
    } else {
      const diff = dateRange.to.getTime() - dateRange.from.getTime();
      setCompareRange({
        from: new Date(dateRange.from.getTime() - diff),
        to: new Date(dateRange.from.getTime() - 1),
      });
    }
  };

  if (ordersLoading) {
    return (
      <>
        <TopBar title={t("stats.title")} subtitle={t("stats.subtitle")} />
        <div className="flex-1 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </>
    );
  }

  return (
    <>
      <TopBar title={t("stats.title")} subtitle={t("stats.subtitle")} />
      <div className="p-6 space-y-6 overflow-auto">
        {/* Period selector */}
        <div className="flex flex-wrap items-center gap-2 animate-fade-in">
          {PERIOD_PRESETS.map((p) => (
            <Button key={p.label} variant="outline" size="sm" className="text-xs" onClick={() => setPreset(p)}>
              {p.label}
            </Button>
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs gap-1">
                <CalendarIcon className="w-3 h-3" />
                {format(dateRange.from, "dd/MM/yy")} — {format(dateRange.to, "dd/MM/yy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) setDateRange({ from: range.from, to: range.to });
                }}
                numberOfMonths={2}
                locale={dfLocale}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Button
            variant={compareRange ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={toggleCompare}
          >
            {compareRange ? `✕ ${t("stats.comparison")}` : t("stats.compare")}
          </Button>
          {compareRange && (
            <span className="text-xs text-muted-foreground">
              vs {format(compareRange.from, "dd/MM/yy")} — {format(compareRange.to, "dd/MM/yy")}
            </span>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label={t("stats.revenue")} value={formatCurrency(totalRevenue)} icon={<TrendingUp className="w-4 h-4 text-primary" />} change={revenueChange} delay={0} />
          <StatCard label={t("stats.orders")} value={totalOrders.toString()} icon={<ShoppingCart className="w-4 h-4 text-primary" />} delay={50} />
          <StatCard label={t("stats.avgOrder")} value={formatCurrency(avgOrder)} icon={<Wallet className="w-4 h-4 text-primary" />} delay={100} />
          <StatCard label={t("stats.pending")} value={pendingCount.toString()} icon={<Package className="w-4 h-4 text-primary" />} delay={150} />
        </div>

        {/* Sales evolution chart */}
        <div className="bg-card rounded-lg border border-border p-5 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <h3 className="text-sm font-semibold text-foreground mb-4">{t("stats.salesEvolution")}</h3>
          {salesEvolution.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("stats.noDataPeriod")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={salesEvolution}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(24, 10%, 10%)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="hsl(24, 10%, 10%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPrev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(36, 45%, 60%)" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="hsl(36, 45%, 60%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(36, 15%, 88%)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(24, 5%, 46%)" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(24, 5%, 46%)" tickFormatter={(v) => `${(v / 1).toFixed(0)} €`} />
                <Tooltip
                  contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(36, 15%, 88%)", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name === "revenue" ? t("stats.revenueLabel") : t("stats.previousPeriod")]}
                />
                <Area type="monotone" dataKey="revenue" name={t("stats.revenueLabel")} stroke="hsl(24, 10%, 10%)" fill="url(#colorRevenue)" strokeWidth={2} />
                {compareRange && (
                  <Area type="monotone" dataKey="prevRevenue" name={t("stats.previousPeriod")} stroke="hsl(36, 45%, 60%)" fill="url(#colorPrev)" strokeWidth={1.5} strokeDasharray="5 5" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top products */}
          <div className="bg-card rounded-lg border border-border p-5 animate-fade-in" style={{ animationDelay: "250ms" }}>
            <h3 className="text-sm font-semibold text-foreground mb-4">{t("stats.topProducts")}</h3>
            {topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("common.noData")}</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(36, 15%, 88%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(24, 5%, 46%)" tickFormatter={(v) => `${v} €`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} stroke="hsl(24, 5%, 46%)" />
                  <Tooltip
                    contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(36, 15%, 88%)", borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number, name: string) => [name === "revenue" ? formatCurrency(value) : value, name === "revenue" ? t("stats.revenueLabel") : t("stats.qty")]}
                  />
                  <Bar dataKey="revenue" name={t("stats.revenueLabel")} fill="hsl(24, 10%, 10%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Entity distribution */}
          <div className="bg-card rounded-lg border border-border p-5 animate-fade-in" style={{ animationDelay: "300ms" }}>
            <h3 className="text-sm font-semibold text-foreground mb-4">{t("stats.entityDistribution")}</h3>
            {entityDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">{t("common.noData")}</p>
            ) : (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="60%" height={280}>
                  <PieChart>
                    <Pie
                      data={entityDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {entityDistribution.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(36, 15%, 88%)", borderRadius: 8, fontSize: 12 }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {entityDistribution.map((e, i) => (
                    <div key={e.name} className="flex items-center gap-2 text-xs">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-foreground font-medium truncate flex-1">{e.name}</span>
                      <span className="text-muted-foreground">{formatCurrency(e.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Budget consumption */}
        <div className="bg-card rounded-lg border border-border p-5 animate-fade-in" style={{ animationDelay: "350ms" }}>
          <h3 className="text-sm font-semibold text-foreground mb-4">{t("stats.budgetConsumption")}</h3>
          {budgetData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("budgets.noBudget")}</p>
          ) : (
            <div className="space-y-4">
              {budgetData.map((b) => (
                <div key={b.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{b.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-xs">
                        {formatCurrency(b.spent)} / {formatCurrency(b.budget)}
                      </span>
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        b.pct > 90 ? "bg-destructive/10 text-destructive" :
                        b.pct > 70 ? "bg-warning/10 text-warning" :
                        "bg-success/10 text-success"
                      )}>
                        {b.pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        b.pct > 90 ? "bg-destructive" : b.pct > 70 ? "bg-warning" : "bg-primary"
                      )}
                      style={{ width: `${Math.min(b.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TenantStats;
