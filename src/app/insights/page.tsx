"use client";

import { useMemo, useState, useEffect } from "react";
import { useTransactionStore } from "@/stores/transactions";
import { useAccountStore } from "@/stores/accounts";
import { useBucketStore, selectBucketsByType } from "@/stores/buckets";
import { useTasksStore } from "@/stores/tasks";
import { MonthPicker, getAvailableMonths, filterByMonth } from "@/components/dashboard/MonthPicker";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DollarSign,
  Building2,
  RefreshCw,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Wallet,
  CreditCard,
  ArrowRight,
  HelpCircle,
  Sparkles,
  Star,
  AlertTriangle,
  ChevronRight,
  ListPlus,
  Check,
  FolderKanban,
  type LucideIcon,
} from "lucide-react";

// ─── Donut Chart ────────────────────────────────────────────

function DonutChart({
  segments,
  size = 140,
  centerLabel,
}: {
  readonly segments: readonly { readonly label: string; readonly value: number; readonly color: string }[];
  readonly size?: number;
  readonly centerLabel?: string;
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const r = (size - 16) / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          className="stroke-bg-secondary"
          strokeWidth={14}
        />
        {segments.map((seg) => {
          const pct = total > 0 ? seg.value / total : 0;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const dashOffset = -offset;
          offset += dash;
          return (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={14}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
            />
          );
        })}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-text-primary text-lg font-bold rotate-90"
          style={{ transformOrigin: `${size / 2}px ${size / 2}px` }}
        >
          {centerLabel ?? formatCurrency(total)}
        </text>
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <div className="size-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-[10px] text-text-tertiary">{seg.label}</span>
            <span className="text-[10px] font-semibold text-text-primary tabular-nums">{formatCurrency(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Insight Card ────────────────────────────────────────────

function InsightCard({
  icon: Icon,
  title,
  description,
  severity = "info",
}: {
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly severity?: "info" | "warning" | "success";
}) {
  const borderColor =
    severity === "warning"
      ? "border-amber-300"
      : severity === "success"
        ? "border-emerald-300"
        : "border-border-secondary";

  return (
    <div className={`flex gap-3 rounded-xl border ${borderColor} bg-bg-primary p-4 shadow-sm`}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-bg-secondary">
        <Icon className="size-4 text-text-secondary" />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-[13px] font-semibold text-text-primary">{title}</p>
        <p className="text-[11px] text-text-tertiary leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// ─── Waterfall Meter ─────────────────────────────────────────

function WaterfallMeter({
  label,
  icon: Icon,
  current,
  target,
  description,
  subtitle,
}: {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly current: number;
  readonly target: number;
  readonly description: string;
  readonly subtitle?: string;
}) {
  const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
  const isFull = pct >= 100;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border-secondary bg-bg-primary p-4 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-bg-secondary">
          <Icon className="size-4 text-text-secondary" />
        </div>
        <div className="flex flex-1 items-center justify-between">
          <div className="flex flex-col">
            <p className="text-[13px] font-semibold text-text-primary">{label}</p>
            {subtitle && (
              <p className="text-[9px] text-text-quaternary">{subtitle}</p>
            )}
          </div>
          <p className="text-[13px] font-bold tabular-nums text-text-primary">
            {formatCurrency(current)}
            <span className="text-text-tertiary font-normal"> / {formatCurrency(target)}</span>
          </p>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isFull ? "bg-emerald-500" : "bg-fg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-text-tertiary">{description}</p>
        <p className={`text-[10px] font-semibold tabular-nums ${isFull ? "text-emerald-600" : "text-text-secondary"}`}>
          {pct}%
        </p>
      </div>
    </div>
  );
}

// ─── Review Summary Card ─────────────────────────────────────

function ReviewBucketRow({
  icon: Icon,
  label,
  count,
  amount,
  href,
}: {
  readonly icon: LucideIcon;
  readonly label: string;
  readonly count: number;
  readonly amount: number;
  readonly href: string;
}) {
  if (count === 0) return null;
  return (
    <Link href={href} className="flex items-center justify-between py-2 group/row hover:bg-bg-secondary/30 -mx-1 px-1 rounded-lg transition-colors">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-text-secondary" />
        <span className="text-[12px] text-text-primary">{label}</span>
        <span className="text-[10px] text-text-tertiary">({count})</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[12px] font-bold tabular-nums text-text-primary">{formatCurrency(amount)}</span>
        <ChevronRight className="size-3 text-text-quaternary group-hover/row:text-text-primary transition-colors" />
      </div>
    </Link>
  );
}

// ─── Recurring Row with Cancel Action ────────────────────────

function RecurringRow({
  name,
  frequency,
  amount,
  onAddTask,
}: {
  readonly name: string;
  readonly frequency: string;
  readonly amount: number;
  readonly onAddTask: (title: string) => void;
}) {
  const [added, setAdded] = useState(false);

  function handleCancel() {
    onAddTask(`Cancel ${name} — ${formatCurrency(amount)}/mo`);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-bg-secondary">
          <RefreshCw className="size-4 text-text-secondary" />
        </div>
        <div className="flex flex-col gap-0">
          <p className="text-[13px] font-semibold text-text-primary">{name}</p>
          <p className="text-[10px] text-text-tertiary">{frequency}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-end gap-0">
          <p className="text-[13px] font-bold text-text-primary tabular-nums">
            {formatCurrency(amount)}
          </p>
          <p className="text-[10px] text-text-tertiary tabular-nums">
            {formatCurrency(amount * 12)}/yr
          </p>
        </div>
        <button
          onClick={handleCancel}
          className={`flex size-7 items-center justify-center rounded-lg transition-colors ${
            added
              ? "bg-emerald-100 text-emerald-600"
              : "bg-bg-secondary text-text-tertiary hover:text-text-primary hover:bg-bg-secondary-hover"
          }`}
          title="Add cancel task"
        >
          {added ? <Check className="size-3.5" /> : <ListPlus className="size-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default function InsightsPage() {
  const allTransactions = useTransactionStore((s) => s.transactions);
  const accounts = useAccountStore((s) => s.accounts);
  const buckets = useBucketStore((s) => s.buckets);
  const addManualTask = useTasksStore((s) => s.addManualTask);

  // ─── Month Picker ──────────────────────────────────────────
  const months = useMemo(() => getAvailableMonths(allTransactions), [allTransactions]);
  const latestMonth = months.length > 0 ? months[months.length - 1].key : "";
  const [selectedMonth, setSelectedMonth] = useState(latestMonth);

  useEffect(() => {
    if (months.length > 0 && !months.some((m) => m.key === selectedMonth)) {
      setSelectedMonth(months[months.length - 1].key);
    }
  }, [months, selectedMonth]);

  const transactions = useMemo(
    () => filterByMonth(allTransactions, selectedMonth),
    [allTransactions, selectedMonth]
  );

  // ─── Cashflow Waterfall Health ───────────────────────────
  const waterfallHealth = useMemo(() => {
    const bizAccounts = accounts.filter((a) => a.type === "business");
    const bizExpenses = transactions.filter((t) => {
      const isBiz = bizAccounts.some((a) => a.id === t.accountId);
      return isBiz && t.amount > 0 && !t.isTransfer;
    });
    const monthlyExpenses = bizExpenses.reduce((sum, t) => sum + t.amount, 0);

    const bizChecking = bizAccounts.filter((a) => a.category === "checking" || a.category === "hysa");
    const checkingBalance = bizChecking.reduce((sum, a) => sum + Math.max(a.balance, 0), 0);
    const bufferTarget = monthlyExpenses;

    const wcTarget = monthlyExpenses * 2;
    const bizSavings = bizAccounts.filter((a) => a.category === "savings" || a.category === "hysa");
    const wcCurrent = bizSavings.reduce((sum, a) => sum + Math.max(a.balance, 0), 0);

    const taxBuckets = buckets.filter(
      (b) => b.isActive && b.name.toLowerCase().includes("tax")
    );
    const taxSaved = taxBuckets.reduce((sum, b) => sum + b.current, 0);
    const taxTarget = taxBuckets.reduce((sum, b) => sum + (b.target ?? 0), 0);

    return {
      checkingBalance,
      bufferTarget,
      wcCurrent,
      wcTarget,
      taxSaved,
      taxTarget: taxTarget > 0 ? taxTarget : monthlyExpenses * 0.25,
      monthlyExpenses,
    };
  }, [transactions, accounts, buckets]);

  // ─── Review Summary ──────────────────────────────────────
  const reviewSummary = useMemo(() => {
    const reviewed = transactions.filter((t) => t.reviewed && !t.isTransfer);
    const unreviewed = transactions.filter((t) => !t.reviewed && !t.isTransfer && t.amount > 0);

    const biz = reviewed.filter((t) => {
      const acct = accounts.find((a) => a.id === t.accountId);
      return acct?.type === "business" && t.amount > 0;
    });
    const personal = reviewed.filter((t) => {
      const acct = accounts.find((a) => a.id === t.accountId);
      return acct?.type === "personal" && t.amount > 0;
    });

    const highRoi = biz.filter((t) => t.businessBucket === "high_roi");
    const noRoi = biz.filter((t) => t.businessBucket === "no_roi");
    const unsure = biz.filter((t) => t.businessBucket === "unsure");

    const essential = personal.filter((t) => t.personalBucket === "essential");
    const meaningful = personal.filter((t) => t.personalBucket === "meaningful");
    const mismatch = personal.filter((t) => t.personalBucket === "mismatch");

    const sum = (txns: typeof biz) => txns.reduce((s, t) => s + t.amount, 0);

    return {
      unreviewedCount: unreviewed.length,
      business: {
        highRoi: { count: highRoi.length, amount: sum(highRoi) },
        noRoi: { count: noRoi.length, amount: sum(noRoi) },
        unsure: { count: unsure.length, amount: sum(unsure) },
        total: biz.length,
      },
      personal: {
        essential: { count: essential.length, amount: sum(essential) },
        meaningful: { count: meaningful.length, amount: sum(meaningful) },
        mismatch: { count: mismatch.length, amount: sum(mismatch) },
        total: personal.length,
      },
    };
  }, [transactions, accounts]);

  // ─── Category Breakdown ──────────────────────────────────
  const categoryBreakdown = useMemo(() => {
    const expenses = transactions.filter((t) => t.amount > 0 && !t.isTransfer);
    const total = expenses.reduce((sum, t) => sum + t.amount, 0);
    const grouped = expenses.reduce<Record<string, number>>((acc, t) => {
      return { ...acc, [t.category]: (acc[t.category] ?? 0) + t.amount };
    }, {});
    return Object.entries(grouped)
      .map(([category, amount]) => ({ category, amount, pct: total > 0 ? Math.round((amount / total) * 100) : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  const COLORS = ["var(--color-fg-primary)", "var(--color-text-secondary)", "var(--color-text-tertiary)", "var(--color-text-quaternary)", "var(--color-border-secondary)", "var(--color-bg-secondary)"];
  const donutSegments = useMemo(() => {
    const top5 = categoryBreakdown.slice(0, 5);
    const rest = categoryBreakdown.slice(5);
    const segments = top5.map((item, i) => ({
      label: item.category,
      value: Math.round(item.amount),
      color: COLORS[i] ?? COLORS[COLORS.length - 1],
    }));
    if (rest.length > 0) {
      segments.push({
        label: "Other",
        value: Math.round(rest.reduce((sum, r) => sum + r.amount, 0)),
        color: COLORS[5] ?? "var(--color-bg-secondary)",
      });
    }
    return segments;
  }, [categoryBreakdown]);

  // ─── Money Flow ──────────────────────────────────────────
  const moneyFlow = useMemo(() => {
    const nonTransfer = transactions.filter((t) => !t.isTransfer);
    const moneyIn = Math.abs(nonTransfer.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0));
    const moneyOut = nonTransfer.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
    return { moneyIn, moneyOut, leftOver: moneyIn - moneyOut };
  }, [transactions]);

  // ─── Debt (loans only) ────────────────────────────────────
  const debtAccounts = useMemo(
    () =>
      accounts
        .filter(
          (a) =>
            a.category === "loan" ||
            a.category === "line_of_credit"
        )
        .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)),
    [accounts]
  );
  const totalDebt = debtAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);
  const estimatedMonthlyInterest = Math.round(totalDebt * 0.22 / 12);

  // ─── Recurring ───────────────────────────────────────────
  const recurringData = useMemo(() => {
    const recurring = transactions.filter(
      (t) => t.isRecurring && t.amount > 0 && !t.isTransfer
    );

    const byMerchant = new Map<string, { name: string; amount: number; category: string; frequency: string; dates: number[] }>();
    for (const t of recurring) {
      const key = t.merchantName;
      const existing = byMerchant.get(key);
      if (existing) {
        existing.amount = Math.max(existing.amount, t.amount);
        const day = new Date(t.date + "T12:00:00").getDate();
        if (!existing.dates.includes(day)) existing.dates.push(day);
      } else {
        byMerchant.set(key, {
          name: t.merchantName,
          amount: t.amount,
          category: t.category,
          frequency: t.recurringFrequency ?? "monthly",
          dates: [new Date(t.date + "T12:00:00").getDate()],
        });
      }
    }

    const merchants = [...byMerchant.values()].sort((a, b) => b.amount - a.amount);
    const monthlyTotal = merchants.reduce((sum, m) => sum + m.amount, 0);
    const annualTotal = monthlyTotal * 12;

    const byCategory = new Map<string, typeof merchants>();
    for (const m of merchants) {
      const cat = m.category;
      const existing = byCategory.get(cat) ?? [];
      existing.push(m);
      byCategory.set(cat, existing);
    }

    const recurringDays = new Set<number>();
    for (const m of merchants) {
      for (const d of m.dates) recurringDays.add(d);
    }

    return { merchants, monthlyTotal, annualTotal, byCategory: [...byCategory.entries()], recurringDays };
  }, [transactions]);

  // ─── Smart Alerts ────────────────────────────────────────
  const alerts = useMemo(() => {
    const result: Array<{ icon: LucideIcon; title: string; description: string; severity: "info" | "warning" | "success" }> = [];

    if (waterfallHealth.bufferTarget > 0 && waterfallHealth.checkingBalance < waterfallHealth.bufferTarget * 0.5) {
      result.push({
        icon: AlertCircle,
        title: `Checking is ${formatCurrency(waterfallHealth.checkingBalance)} — below your buffer`,
        description: `Your buffer target is ${formatCurrency(waterfallHealth.bufferTarget)} (1 month of expenses). You're at ${Math.round((waterfallHealth.checkingBalance / waterfallHealth.bufferTarget) * 100)}%. Focus on building this before paying down debt.`,
        severity: "warning",
      });
    }

    if (estimatedMonthlyInterest > 0) {
      result.push({
        icon: CreditCard,
        title: `~${formatCurrency(estimatedMonthlyInterest)}/mo in estimated interest`,
        description: `You're carrying ${formatCurrency(totalDebt)} in debt. At ~22% APR, that's roughly ${formatCurrency(estimatedMonthlyInterest * 12)}/yr. Pay down the highest-rate balance first.`,
        severity: "warning",
      });
    }

    const bizAccountIds = accounts.filter((a) => a.type === "business").map((a) => a.id);
    const personalOnBiz = transactions.filter(
      (t) => bizAccountIds.includes(t.accountId) && t.personalBucket && !t.isTransfer
    );
    if (personalOnBiz.length > 0) {
      result.push({
        icon: Building2,
        title: `${personalOnBiz.length} personal expenses on business accounts`,
        description: "Move personal charges off business accounts to keep your P&L clean. Your bookkeeper will thank you.",
        severity: "warning",
      });
    }

    if (reviewSummary.personal.total > 0) {
      const mismatchPct = Math.round((reviewSummary.personal.mismatch.count / reviewSummary.personal.total) * 100);
      if (mismatchPct > 25) {
        result.push({
          icon: AlertTriangle,
          title: `${mismatchPct}% of personal spending is mismatch`,
          description: `${formatCurrency(reviewSummary.personal.mismatch.amount)} didn't align with your values. That's okay — awareness is the first step. What pattern do you notice?`,
          severity: "info",
        });
      }
    }

    if (reviewSummary.business.total > 0) {
      const noRoiPct = Math.round((reviewSummary.business.noRoi.count / reviewSummary.business.total) * 100);
      if (noRoiPct > 20) {
        result.push({
          icon: TrendingDown,
          title: `${formatCurrency(reviewSummary.business.noRoi.amount)} in No-ROI business spend`,
          description: `${noRoiPct}% of reviewed business expenses aren't driving returns. Can you cut or renegotiate any of these?`,
          severity: "info",
        });
      }
    }

    if (reviewSummary.unreviewedCount > 5) {
      result.push({
        icon: ArrowRight,
        title: `${reviewSummary.unreviewedCount} transactions waiting for review`,
        description: "Your weekly review keeps you in touch with your money story. It only takes a few minutes.",
        severity: "info",
      });
    }

    if (waterfallHealth.bufferTarget > 0 && waterfallHealth.checkingBalance > waterfallHealth.bufferTarget * 1.2) {
      const overflow = waterfallHealth.checkingBalance - waterfallHealth.bufferTarget;
      result.push({
        icon: ShieldCheck,
        title: `${formatCurrency(overflow)} above your buffer — time to waterfall`,
        description: "Move the excess to working capital, tax savings, or make a debt payment. Don't let it sit in checking.",
        severity: "success",
      });
    }

    return result;
  }, [waterfallHealth, estimatedMonthlyInterest, totalDebt, accounts, transactions, reviewSummary]);

  // ─── Projects ────────────────────────────────────────────
  const projectBuckets = useMemo(
    () => selectBucketsByType({ buckets }, "project").filter((b) => b.isActive),
    [buckets]
  );

  const projectInsights = useMemo(() => {
    return projectBuckets.map((project) => {
      const linkedTxns = project.transactionIds
        .map((tid) => transactions.find((t) => t.id === tid))
        .filter((t): t is NonNullable<typeof t> => t !== undefined);
      const totalSpent = linkedTxns.reduce((sum, t) => sum + t.amount, 0);
      const highRoi = linkedTxns.filter((t) => t.businessBucket === "high_roi").length;
      const noRoi = linkedTxns.filter((t) => t.businessBucket === "no_roi").length;
      const unsure = linkedTxns.filter((t) => t.businessBucket === "unsure").length;
      return {
        ...project,
        linkedTxns,
        totalSpent,
        highRoi,
        noRoi,
        unsure,
        txnCount: linkedTxns.length,
      };
    });
  }, [projectBuckets, transactions]);

  return (
    <div className="flex flex-col pb-4 safe-top">
      <div className="h-[60px]" />
      <div className="flex flex-col gap-4 px-4">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Your Money Story
          </h1>
          <p className="text-sm text-text-tertiary">
            Here&apos;s what we&apos;d tell you if we weren&apos;t afraid to hurt your feelings.
          </p>
        </div>

        {/* Month Picker */}
        <MonthPicker months={months} selected={selectedMonth} onSelect={setSelectedMonth} />

        {/* ── Tabbed Layout ── */}
        <Tabs defaultValue="overview">
          <TabsList variant="line" className="w-full justify-center gap-0">
            {["overview", "business", "personal", "recurring"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="flex-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-tertiary data-active:text-text-primary"
              >
                {tab === "recurring" ? "Recurring & Debt" : tab}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ═══════════════════════════════════════════════════════
              TAB 1: Overview
          ═══════════════════════════════════════════════════════ */}
          <TabsContent value="overview" className="pt-4">
            <div className="flex flex-col gap-6">
              {/* Smart Alerts */}
              {alerts.length > 0 && (
                <section className="flex flex-col gap-2">
                  <p className="section-label">Smart Alerts</p>
                  {alerts.map((alert, i) => (
                    <InsightCard
                      key={i}
                      icon={alert.icon}
                      title={alert.title}
                      description={alert.description}
                      severity={alert.severity}
                    />
                  ))}
                </section>
              )}

              {/* Money Flow */}
              <section className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="section-label">Money Flow</p>
                  <Link href="/insights/cashflow-review" className="flex items-center gap-1 text-[10px] text-text-tertiary hover:text-text-primary transition-colors">
                    Review <ChevronRight className="size-3" />
                  </Link>
                </div>
                <Link href="/insights/cashflow-review" className="block">
                  <div className="rounded-xl border border-border-secondary bg-bg-primary p-4 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-text-tertiary">Money in</span>
                      <span className="text-[13px] font-bold text-text-primary tabular-nums">+{formatCurrency(moneyFlow.moneyIn)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-text-tertiary">Money out</span>
                      <span className="text-[13px] font-bold text-text-primary tabular-nums">-{formatCurrency(moneyFlow.moneyOut)}</span>
                    </div>
                    <div className="border-t border-border-secondary pt-2 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-text-primary">Left over</span>
                      <span className="text-[13px] font-bold tabular-nums text-text-primary">
                        {moneyFlow.leftOver >= 0 ? "+" : "-"}{formatCurrency(moneyFlow.leftOver)}
                      </span>
                    </div>
                  </div>
                </Link>
              </section>

              {/* CTA */}
              {reviewSummary.unreviewedCount > 0 && (
                <Link
                  href="/review/business"
                  className="flex items-center justify-center gap-2 rounded-xl bg-text-primary text-bg-primary py-3 text-[12px] font-semibold transition-colors hover:opacity-90"
                >
                  Review {reviewSummary.unreviewedCount} unreviewed transactions
                  <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
              TAB 2: Business
          ═══════════════════════════════════════════════════════ */}
          <TabsContent value="business" className="pt-4">
            <div className="flex flex-col gap-6">
              {/* Business Review Summary */}
              {reviewSummary.business.total > 0 && (
                <section className="flex flex-col gap-2">
                  <p className="section-label">Review Summary</p>
                  <div className="rounded-xl border border-border-secondary bg-bg-primary p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">
                      Business ({reviewSummary.business.total} reviewed)
                    </p>
                    <div className="flex flex-col divide-y divide-border-secondary">
                      <ReviewBucketRow
                        icon={TrendingUp}
                        label="High ROI"
                        count={reviewSummary.business.highRoi.count}
                        amount={reviewSummary.business.highRoi.amount}
                        href="/insights/business/high-roi"
                      />
                      <ReviewBucketRow
                        icon={TrendingDown}
                        label="No ROI"
                        count={reviewSummary.business.noRoi.count}
                        amount={reviewSummary.business.noRoi.amount}
                        href="/insights/business/no-roi"
                      />
                      <ReviewBucketRow
                        icon={HelpCircle}
                        label="Unsure"
                        count={reviewSummary.business.unsure.count}
                        amount={reviewSummary.business.unsure.amount}
                        href="/insights/unsure-review"
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Projects */}
              {projectInsights.length > 0 && (
                <section className="flex flex-col gap-2">
                  <p className="section-label">Projects</p>
                  <div className="flex flex-col gap-2">
                    {projectInsights.map((project) => (
                      <Link
                        key={project.id}
                        href={`/insights/projects/${project.id}`}
                        className="rounded-xl border border-border-secondary bg-bg-primary p-4 shadow-sm hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex size-10 items-center justify-center rounded-xl bg-bg-secondary">
                            <span className="text-lg">{project.emoji}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px] font-semibold text-text-primary">{project.name}</p>
                            <p className="text-[10px] text-text-tertiary">
                              {project.txnCount} transactions · {formatCurrency(project.totalSpent)} spent
                            </p>
                          </div>
                          <ChevronRight className="size-4 text-text-quaternary" />
                        </div>
                        {project.txnCount > 0 && (
                          <div className="flex gap-3">
                            {project.highRoi > 0 && (
                              <div className="flex items-center gap-1">
                                <TrendingUp className="size-3 text-emerald-500" />
                                <span className="text-[10px] text-text-secondary">{project.highRoi} High ROI</span>
                              </div>
                            )}
                            {project.noRoi > 0 && (
                              <div className="flex items-center gap-1">
                                <TrendingDown className="size-3 text-red-400" />
                                <span className="text-[10px] text-text-secondary">{project.noRoi} No ROI</span>
                              </div>
                            )}
                            {project.unsure > 0 && (
                              <div className="flex items-center gap-1">
                                <HelpCircle className="size-3 text-amber-400" />
                                <span className="text-[10px] text-text-secondary">{project.unsure} Unsure</span>
                              </div>
                            )}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Business Expense Audit */}
              <section className="flex flex-col gap-2">
                <p className="section-label">Business Expense Audit</p>
                <div className="rounded-xl border border-border-secondary bg-bg-primary p-4 shadow-sm flex flex-col gap-2.5">
                  <p className="text-[11px] text-text-tertiary leading-relaxed">
                    Ask yourself about each business expense:
                  </p>
                  {[
                    "Can I do this with existing team or by myself?",
                    "Am I getting a 5x ROI on this expense?",
                    "Can I do this cheaper?",
                    "Do I fundamentally need this?",
                    "Did I already solve this problem but I'm still paying for the solution?",
                    "Is this just me people-pleasing with spending?",
                  ].map((q) => (
                    <div key={q} className="flex items-start gap-2">
                      <AlertCircle className="size-3 text-text-quaternary mt-0.5 shrink-0" />
                      <p className="text-[11px] text-text-secondary">{q}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* CTA */}
              {reviewSummary.business.unsure.count > 0 && (
                <Link
                  href="/insights/unsure-review"
                  className="flex items-center justify-center gap-2 rounded-xl bg-text-primary text-bg-primary py-3 text-[12px] font-semibold transition-colors hover:opacity-90"
                >
                  Re-audit {reviewSummary.business.unsure.count} unsure expenses
                  <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
              TAB 3: Personal
          ═══════════════════════════════════════════════════════ */}
          <TabsContent value="personal" className="pt-4">
            <div className="flex flex-col gap-6">
              {/* Personal Review Summary */}
              {reviewSummary.personal.total > 0 && (
                <section className="flex flex-col gap-2">
                  <p className="section-label">Review Summary</p>
                  <div className="rounded-xl border border-border-secondary bg-bg-primary p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">
                      Personal ({reviewSummary.personal.total} reviewed)
                    </p>
                    <div className="flex flex-col divide-y divide-border-secondary">
                      <ReviewBucketRow
                        icon={Sparkles}
                        label="Essential"
                        count={reviewSummary.personal.essential.count}
                        amount={reviewSummary.personal.essential.amount}
                        href="/insights/personal/essential"
                      />
                      <ReviewBucketRow
                        icon={Star}
                        label="Meaningful"
                        count={reviewSummary.personal.meaningful.count}
                        amount={reviewSummary.personal.meaningful.amount}
                        href="/insights/personal/meaningful"
                      />
                      <ReviewBucketRow
                        icon={AlertTriangle}
                        label="Mismatch"
                        count={reviewSummary.personal.mismatch.count}
                        amount={reviewSummary.personal.mismatch.amount}
                        href="/insights/personal/mismatch"
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Spending Breakdown (Donut) */}
              <section className="flex flex-col gap-3">
                <p className="section-label">Spending by Category</p>
                <div className="rounded-xl border border-border-secondary bg-bg-primary p-5 shadow-sm">
                  <DonutChart segments={donutSegments} size={160} />
                </div>
              </section>

              {/* Personal Expense Audit */}
              <section className="flex flex-col gap-2">
                <p className="section-label">Personal Expense Audit</p>
                <div className="rounded-xl border border-border-secondary bg-bg-primary p-4 shadow-sm flex flex-col gap-2.5">
                  <p className="text-[11px] text-text-tertiary leading-relaxed">
                    Ask yourself about each personal expense:
                  </p>
                  {[
                    "Can I maintain this if my income doesn't increase?",
                    "Do I like how frequently I'm using this?",
                    "Did the quality match the price?",
                    "Would I do this again?",
                    "Am I just bored?",
                    "Is this me trying to buy myself an identity?",
                  ].map((q) => (
                    <div key={q} className="flex items-start gap-2">
                      <AlertCircle className="size-3 text-text-quaternary mt-0.5 shrink-0" />
                      <p className="text-[11px] text-text-secondary">{q}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* CTA */}
              {reviewSummary.personal.mismatch.count > 0 && (
                <Link
                  href="/insights/personal/mismatch"
                  className="flex items-center justify-center gap-2 rounded-xl bg-text-primary text-bg-primary py-3 text-[12px] font-semibold transition-colors hover:opacity-90"
                >
                  Review {reviewSummary.personal.mismatch.count} mismatch subscriptions
                  <ArrowRight className="size-3.5" />
                </Link>
              )}
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════
              TAB 4: Recurring & Debt
          ═══════════════════════════════════════════════════════ */}
          <TabsContent value="recurring" className="pt-4">
            <div className="flex flex-col gap-6">
              {/* Recurring Expenses */}
              {recurringData.merchants.length > 0 && (
                <section className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="section-label">Recurring Expenses</p>
                    <p className="text-[10px] text-text-tertiary tabular-nums">
                      {formatCurrency(recurringData.monthlyTotal)}/mo · {formatCurrency(recurringData.annualTotal)}/yr
                    </p>
                  </div>

                  {/* Mini Calendar */}
                  <div className="rounded-xl border border-border-secondary bg-bg-primary p-4 shadow-sm">
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                        <p key={`${d}-${i}`} className="text-[9px] font-mono font-semibold text-text-quaternary uppercase pb-1">
                          {d}
                        </p>
                      ))}
                      {Array.from({ length: 31 }, (_, i) => {
                        const day = i + 1;
                        const hasRecurring = recurringData.recurringDays.has(day);
                        return (
                          <div
                            key={day}
                            className={`flex items-center justify-center rounded-md py-1 ${
                              hasRecurring
                                ? "bg-text-primary text-bg-primary"
                                : "text-text-tertiary"
                            }`}
                          >
                            <span className="text-[10px] font-mono tabular-nums font-medium">
                              {day}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Grouped by category with cancel buttons */}
                  {recurringData.byCategory.map(([category, items]) => (
                    <div key={category} className="flex flex-col gap-1">
                      <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-quaternary px-1">
                        {category}
                      </p>
                      <div className="rounded-xl border border-border-secondary bg-bg-primary shadow-sm divide-y divide-border-secondary">
                        {items.map((item) => (
                          <RecurringRow
                            key={item.name}
                            name={item.name}
                            frequency={item.frequency}
                            amount={item.amount}
                            onAddTask={addManualTask}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              )}

              {/* Debt Stack */}
              {debtAccounts.length > 0 && (
                <section className="flex flex-col gap-2">
                  <p className="section-label">Debt Stack</p>
                  <p className="text-[11px] text-text-tertiary -mt-1 mb-1">
                    Pay highest-rate first. Total: {formatCurrency(totalDebt)}
                    {estimatedMonthlyInterest > 0 && ` · ~${formatCurrency(estimatedMonthlyInterest)}/mo interest`}
                  </p>
                  <div className="rounded-xl border border-border-secondary bg-bg-primary shadow-sm divide-y divide-border-secondary">
                    {debtAccounts.map((acct) => (
                      <div key={acct.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-bg-secondary">
                            <CreditCard className="size-4 text-text-secondary" />
                          </div>
                          <div className="flex flex-col gap-0">
                            <p className="text-[13px] font-semibold text-text-primary">{acct.name}</p>
                            <p className="text-[10px] text-text-tertiary">{acct.institution} ****{acct.lastFour}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-0">
                          <p className="text-[13px] font-bold text-text-primary tabular-nums">{formatCurrency(Math.abs(acct.balance))}</p>
                          <p className="text-[10px] text-text-tertiary tabular-nums">~${Math.round(Math.abs(acct.balance) * 0.22 / 12)}/mo</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="h-8 safe-bottom" />
    </div>
  );
}
