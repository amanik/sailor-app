"use client";

import { TabBar } from "@/components/dashboard/TabBar";
import { ReviewCTA } from "@/components/dashboard/ReviewCTA";
import { HalfPieGauge } from "@/components/dashboard/HalfPieGauge";
import { MonthPicker, getAvailableMonths, filterByMonth } from "@/components/dashboard/MonthPicker";
import { useMemo, useState, useEffect } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Zap,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Star,
  Heart,
  Brain,
  Gamepad2,
  Activity,
  Users,
  Scissors,
} from "lucide-react";
import {
  useTransactionStore,
  selectUnreviewedByType,
} from "@/stores/transactions";
import { useAccountStore } from "@/stores/accounts";
import { formatCurrency } from "@/lib/format";
import {
  calcOverallScore,
  calcJoySpendScore,
  calcRoiOptimizationScore,
  groupByMeaningCategory,
  groupByPersonalBucket,
  groupByBusinessBucket,
} from "@/lib/scores";

// ─── Shared Components ──────────────────────────────────

function Section({
  label,
  children,
}: {
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <p className="section-label px-1">{label}</p>
      {children}
    </section>
  );
}

function StatsRow({
  stats,
}: {
  readonly stats: readonly { readonly label: string; readonly value: string }[];
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-1">
      {stats.map((stat, i) => (
        <div key={stat.label} className={`flex flex-col gap-0.5 ${i === 0 ? "" : "text-center"} ${i === stats.length - 1 ? "text-right" : ""}`}>
          <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-text-tertiary">
            {stat.label}
          </p>
          <p className="text-sm font-bold tracking-tight text-text-primary tabular-nums">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function RatioRow({
  label,
  value,
  status,
}: {
  readonly label: string;
  readonly value: string;
  readonly status: "healthy" | "attention" | "neutral";
}) {
  const badgeClass =
    status === "healthy"
      ? "bg-bg-secondary text-text-primary"
      : status === "attention"
        ? "bg-fg-primary text-white"
        : "bg-bg-secondary text-text-secondary";

  const badgeLabel =
    status === "healthy" ? "HEALTHY" : status === "attention" ? "NEEDS ATTENTION" : "—";

  return (
    <div className="flex items-center justify-between rounded-xl border border-border-secondary bg-bg-primary px-4 py-3.5">
      <p className="text-[13px] font-medium text-text-secondary">{label}</p>
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider ${badgeClass}`}
        >
          {badgeLabel}
        </span>
        <p className="text-2xl font-bold tracking-tighter text-text-primary tabular-nums min-w-[40px] text-right">
          {value}
        </p>
      </div>
    </div>
  );
}

function InsightRow({
  icon: Icon,
  title,
  subtitle,
  value,
  subvalue,
  href,
}: {
  readonly icon: typeof TrendingUp;
  readonly title: string;
  readonly subtitle: string;
  readonly value?: string;
  readonly subvalue?: string;
  readonly href?: string;
}) {
  const content = (
    <div className="flex items-center gap-3 rounded-xl border border-border-secondary bg-bg-primary px-4 py-3.5 transition-colors hover:bg-bg-secondary">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-bg-secondary">
        <Icon className="size-4 text-text-secondary" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-text-primary truncate">{title}</p>
        <p className="text-[11px] text-text-tertiary truncate">{subtitle}</p>
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        {value && (
          <p className="text-[15px] font-bold tracking-tight text-text-primary tabular-nums">
            {value}
          </p>
        )}
        {subvalue && (
          <p className="font-mono text-[9px] text-text-tertiary">{subvalue}</p>
        )}
      </div>
      {href && <ChevronRight className="size-4 text-text-quaternary shrink-0" />}
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function ActionItemCard({
  title,
  subtitle,
  count,
  minutes,
  href,
}: {
  readonly title: string;
  readonly subtitle?: string;
  readonly count: number;
  readonly minutes: number;
  readonly href: string;
}) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 rounded-xl bg-fg-primary px-4 py-4 transition-transform active:scale-[0.98]">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
          <Zap className="size-4 text-white" />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <p className="text-[13px] font-bold text-white">{title}</p>
          {subtitle && (
            <p className="text-[11px] text-white/60">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-white/70">
            {count} items
          </span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-white/70">
            ~{minutes} min
          </span>
          <ChevronRight className="size-4 text-white/40" />
        </div>
      </div>
    </Link>
  );
}

function QuickWinRow({
  merchantName,
  saveAmount,
  isRecurring,
  frequency,
}: {
  readonly merchantName: string;
  readonly saveAmount: string;
  readonly isRecurring: boolean;
  readonly frequency?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-secondary bg-bg-primary px-4 py-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-bg-secondary">
        <Scissors className="size-4 text-text-secondary" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-text-primary truncate">
          {isRecurring ? "Cancel" : "Cut"} {merchantName}
        </p>
        <p className="text-[11px] text-text-tertiary">
          {isRecurring && frequency === "monthly"
            ? `Save ${saveAmount}/mo`
            : `Save ${saveAmount}`}
        </p>
      </div>
      <ChevronRight className="size-4 text-text-quaternary shrink-0" />
    </div>
  );
}

function SpendingIntentRow({
  icon: Icon,
  label,
  value,
  rating,
}: {
  readonly icon: typeof Heart;
  readonly label: string;
  readonly value: string;
  readonly rating?: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border-secondary bg-bg-primary px-4 py-3.5">
      <Icon className="size-4 text-text-secondary shrink-0" />
      <span className="text-[13px] font-medium text-text-primary flex-1">{label}</span>
      <div className="flex items-center gap-3 shrink-0">
        {rating != null && (
          <div className="flex items-center gap-1">
            <Star className="size-3 text-text-tertiary fill-text-tertiary" />
            <span className="font-mono text-[10px] font-semibold text-text-tertiary tabular-nums">
              {rating}/4
            </span>
          </div>
        )}
        <p className="text-[15px] font-bold tracking-tight text-text-primary tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────

function OverviewContent({ monthKey }: { readonly monthKey: string }) {
  const allTransactions = useTransactionStore((s) => s.transactions);
  const notes = useTransactionStore((s) => s.notes);
  const accounts = useAccountStore((s) => s.accounts);

  const transactions = useMemo(
    () => filterByMonth(allTransactions, monthKey),
    [allTransactions, monthKey]
  );

  const personalAccountIds = useMemo(
    () => accounts.filter((a) => a.type === "personal").map((a) => a.id),
    [accounts]
  );
  const businessAccountIds = useMemo(
    () => accounts.filter((a) => a.type === "business").map((a) => a.id),
    [accounts]
  );

  const totalIncome = useMemo(
    () =>
      Math.abs(
        transactions
          .filter((t) => t.amount < 0 && !t.isTransfer)
          .reduce((sum, t) => sum + t.amount, 0)
      ),
    [transactions]
  );

  const totalExpenses = useMemo(
    () =>
      transactions
        .filter((t) => t.amount > 0 && !t.isTransfer)
        .reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const cashOnHand = useMemo(
    () =>
      accounts
        .filter((a) => a.category !== "loan" && a.category !== "line_of_credit")
        .reduce((sum, a) => sum + Math.max(0, a.balance), 0),
    [accounts]
  );

  const savingsBalance = useMemo(
    () =>
      accounts
        .filter((a) => a.category === "savings" || a.category === "hysa" || a.category === "investment")
        .reduce((sum, a) => sum + Math.max(0, a.balance), 0),
    [accounts]
  );

  const spendScore = useMemo(
    () =>
      calcOverallScore(totalIncome, totalExpenses, transactions, cashOnHand, totalExpenses),
    [totalIncome, totalExpenses, transactions, cashOnHand]
  );

  const incomeToSpend = totalExpenses > 0 ? totalIncome / totalExpenses : 0;
  const savingsToSpend = totalExpenses > 0 ? savingsBalance / totalExpenses : 0;
  const incomeStatus: "healthy" | "attention" | "neutral" =
    incomeToSpend >= 1.5 ? "healthy" : incomeToSpend > 0 ? "attention" : "neutral";
  const savingsStatus: "healthy" | "attention" | "neutral" =
    savingsToSpend >= 3 ? "healthy" : savingsToSpend > 0 ? "attention" : "neutral";

  const bizUnreviewed = useMemo(
    () => selectUnreviewedByType({ transactions, notes }, "business", businessAccountIds).length,
    [transactions, notes, businessAccountIds]
  );
  const personalUnreviewed = useMemo(
    () => selectUnreviewedByType({ transactions, notes }, "personal", personalAccountIds).length,
    [transactions, notes, personalAccountIds]
  );

  const businessBuckets = useMemo(() => groupByBusinessBucket(transactions), [transactions]);
  const personalBuckets = useMemo(() => groupByPersonalBucket(transactions), [transactions]);

  const highRoiBucket = businessBuckets.find((b) => b.label === "High ROI");
  const noRoiBucket = businessBuckets.find((b) => b.label === "No ROI");
  const mismatchBucket = personalBuckets.find((b) => b.label === "Mismatch");

  const hasInsights = highRoiBucket || noRoiBucket || mismatchBucket;
  const hasActions = bizUnreviewed > 0 || personalUnreviewed > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Spend Score — hero */}
      <section className="flex flex-col items-center gap-2 py-2">
        <p className="section-label">Spend Score</p>
        <HalfPieGauge
          score={spendScore}
          size={200}
          label="OVERALL"
          showDot
        />
      </section>

      {/* Stats Row — inline text */}
      <StatsRow
        stats={[
          { label: "Money In", value: formatCurrency(totalIncome) },
          { label: "Money Out", value: formatCurrency(totalExpenses) },
          { label: "Cash On-Hand", value: formatCurrency(cashOnHand) },
        ]}
      />

      {/* Financial Ratios — full-width rows */}
      <Section label="Financial Health">
        <div className="flex flex-col gap-2">
          <RatioRow
            label="Income to Spend"
            value={incomeToSpend.toFixed(1)}
            status={incomeStatus}
          />
          <RatioRow
            label="Savings to Spend"
            value={savingsToSpend.toFixed(1)}
            status={savingsStatus}
          />
        </div>
      </Section>

      {/* Key Insights — full-width stacked rows */}
      {hasInsights ? (
        <Section label="Key Insights">
          <div className="flex flex-col gap-2">
            {highRoiBucket && highRoiBucket.count > 0 && (
              <InsightRow
                icon={TrendingUp}
                title="High ROI Spend"
                subtitle={`${highRoiBucket.count} transactions driving growth`}
                value={formatCurrency(highRoiBucket.value)}
                href="/insights/business/high-roi"
              />
            )}
            {noRoiBucket && noRoiBucket.count > 0 && (
              <InsightRow
                icon={TrendingDown}
                title="Potential Savings"
                subtitle={`${noRoiBucket.count} low-return expenses`}
                value={formatCurrency(noRoiBucket.value)}
                href="/insights/business/no-roi"
              />
            )}
            {mismatchBucket && mismatchBucket.count > 0 && (
              <InsightRow
                icon={AlertTriangle}
                title="Spending Mismatches"
                subtitle={`${mismatchBucket.count} impulse or misaligned buys`}
                value={formatCurrency(mismatchBucket.value)}
                href="/insights/personal/mismatch"
              />
            )}
          </div>
        </Section>
      ) : (
        <Section label="Key Insights">
          <div className="rounded-xl border border-border-secondary bg-bg-primary px-4 py-6 text-center">
            <p className="text-[11px] text-text-tertiary">
              Review your transactions to unlock insights
            </p>
          </div>
        </Section>
      )}

      {/* Action Items — full-width dark cards */}
      {hasActions ? (
        <Section label="Action Items">
          <div className="flex flex-col gap-2">
            {bizUnreviewed > 0 && (
              <ActionItemCard
                title="Review Business Expenses"
                subtitle="Swipe to categorize ROI"
                count={bizUnreviewed}
                minutes={Math.max(1, Math.round(bizUnreviewed * 0.3))}
                href="/review/business"
              />
            )}
            {personalUnreviewed > 0 && (
              <ActionItemCard
                title="Review Personal Expenses"
                subtitle="Swipe to categorize spending"
                count={personalUnreviewed}
                minutes={Math.max(1, Math.round(personalUnreviewed * 0.3))}
                href="/review/personal"
              />
            )}
          </div>
        </Section>
      ) : (
        <Section label="Action Items">
          <div className="rounded-xl border border-border-secondary bg-bg-primary px-4 py-5 text-center">
            <p className="text-sm font-bold text-text-primary">All caught up</p>
            <p className="mt-1 text-[10px] text-text-tertiary">No pending reviews</p>
          </div>
        </Section>
      )}
    </div>
  );
}

// ─── Spending Intent Icons ────────────────────────────────

const intentIcons: Record<string, typeof Heart> = {
  "Vitality & Health": Activity,
  "Growth & Learning": Brain,
  "Connection": Users,
  "Joy & Play": Gamepad2,
};

// ─── Personal Tab ────────────────────────────────────────

function PersonalContent({ monthKey }: { readonly monthKey: string }) {
  const allTransactions = useTransactionStore((s) => s.transactions);
  const notes = useTransactionStore((s) => s.notes);
  const accounts = useAccountStore((s) => s.accounts);

  const transactions = useMemo(
    () => filterByMonth(allTransactions, monthKey),
    [allTransactions, monthKey]
  );

  const personalAccountIds = useMemo(
    () => accounts.filter((a) => a.type === "personal").map((a) => a.id),
    [accounts]
  );

  const personalTransactions = useMemo(
    () => transactions.filter((t) => personalAccountIds.includes(t.accountId)),
    [transactions, personalAccountIds]
  );

  const unreviewedCount = useMemo(
    () =>
      selectUnreviewedByType({ transactions, notes }, "personal", personalAccountIds).length,
    [transactions, notes, personalAccountIds]
  );

  const income = useMemo(
    () =>
      Math.abs(
        personalTransactions
          .filter((t) => t.amount < 0 && !t.isTransfer)
          .reduce((sum, t) => sum + t.amount, 0)
      ),
    [personalTransactions]
  );

  const personalBuckets = useMemo(
    () => groupByPersonalBucket(personalTransactions),
    [personalTransactions]
  );

  const essentialTotal = personalBuckets.find((b) => b.label === "Essential")?.value ?? 0;
  const meaningfulTotal = personalBuckets.find((b) => b.label === "Meaningful")?.value ?? 0;
  const mismatchTotal = personalBuckets.find((b) => b.label === "Mismatch")?.value ?? 0;
  const flexSpending = meaningfulTotal + mismatchTotal;

  const { reviewedExpenseCount, totalExpenseCount, hasMinimumReviews } = useMemo(() => {
    const reviewed = personalTransactions.filter((t) => t.reviewed && t.amount > 0 && !t.isTransfer).length;
    const total = personalTransactions.filter((t) => t.amount > 0 && !t.isTransfer).length;
    return {
      reviewedExpenseCount: reviewed,
      totalExpenseCount: total,
      hasMinimumReviews: reviewed >= 5 || (total > 0 && reviewed / total >= 0.5),
    };
  }, [personalTransactions]);

  const { score: joyScore, joyPercentage } = useMemo(
    () => calcJoySpendScore(personalTransactions),
    [personalTransactions]
  );

  const meaningCategories = useMemo(
    () => groupByMeaningCategory(personalTransactions),
    [personalTransactions]
  );

  const categoryRatings = useMemo(() => {
    const reviewed = personalTransactions.filter(
      (t) => t.reviewed && t.meaningCategory && t.meaningRating
    );
    const grouped = reviewed.reduce<Record<string, { sum: number; count: number }>>((acc, t) => {
      const cat = t.meaningCategory!;
      const prev = acc[cat] ?? { sum: 0, count: 0 };
      return { ...acc, [cat]: { sum: prev.sum + (t.meaningRating ?? 0), count: prev.count + 1 } };
    }, {});
    return Object.entries(grouped).reduce<Record<string, number>>((acc, [cat, data]) => {
      return { ...acc, [cat]: Math.round((data.sum / data.count) * 10) / 10 };
    }, {});
  }, [personalTransactions]);

  const mismatchTxns = useMemo(
    () =>
      personalTransactions
        .filter((t) => t.reviewed && t.personalBucket === "mismatch" && t.amount > 0)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5),
    [personalTransactions]
  );

  const savingsBalance = useMemo(
    () =>
      accounts
        .filter(
          (a) =>
            a.type === "personal" &&
            (a.category === "savings" || a.category === "hysa" || a.category === "investment")
        )
        .reduce((sum, a) => sum + Math.max(0, a.balance), 0),
    [accounts]
  );

  const totalExpenses = useMemo(
    () => personalTransactions.filter((t) => t.amount > 0 && !t.isTransfer).reduce((sum, t) => sum + t.amount, 0),
    [personalTransactions]
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Review CTA */}
      <ReviewCTA
        unreviewedCount={unreviewedCount}
        estimatedMinutes={Math.max(1, Math.round(unreviewedCount * 0.3))}
        type="personal"
      />

      {/* Stats Row */}
      <StatsRow
        stats={[
          { label: "Take Home", value: formatCurrency(income) },
          { label: "Essentials", value: formatCurrency(essentialTotal) },
          { label: "Flex Spend", value: formatCurrency(flexSpending) },
        ]}
      />

      {/* Joy Spend Score — hero */}
      <section className="flex flex-col items-center gap-2 py-2">
        <p className="section-label">Joy Spend Score</p>
        {hasMinimumReviews ? (
          <HalfPieGauge
            score={joyScore}
            size={160}
            subtitle={`${joyPercentage}% towards meaningful spend`}
            showDot
          />
        ) : (
          <div className="flex flex-col items-center gap-1 py-4">
            <p className="text-2xl font-bold tracking-tighter text-text-quaternary">—</p>
            <p className="text-[11px] text-text-tertiary text-center max-w-[200px]">
              Review at least 5 transactions to unlock your score
            </p>
          </div>
        )}
      </section>

      {/* Spending Intent — full-width rows */}
      {meaningCategories.length > 0 && (
        <Section label="Spending Intent">
          <div className="flex flex-col gap-2">
            {meaningCategories.map((cat) => {
              const Icon = intentIcons[cat.label] ?? Heart;
              const avgRating = categoryRatings[cat.label];
              return (
                <SpendingIntentRow
                  key={cat.label}
                  icon={Icon}
                  label={cat.label}
                  value={formatCurrency(cat.value)}
                  rating={avgRating}
                />
              );
            })}
          </div>
        </Section>
      )}

      {/* Key Insights — full-width rows */}
      {personalBuckets.length > 0 && (
        <Section label="Key Insights">
          <div className="flex flex-col gap-2">
            {personalBuckets.map((bucket) => {
              const icon =
                bucket.label === "Essential"
                  ? Sparkles
                  : bucket.label === "Meaningful"
                    ? Star
                    : AlertTriangle;
              return (
                <InsightRow
                  key={bucket.label}
                  icon={icon}
                  title={`${bucket.label} Spending`}
                  subtitle={`${bucket.count} transactions`}
                  value={formatCurrency(bucket.value)}
                />
              );
            })}
          </div>
        </Section>
      )}

      {/* Quick Wins — full-width rows */}
      {mismatchTxns.length > 0 && (
        <Section label="Quick Wins">
          <div className="flex flex-col gap-2">
            {mismatchTxns.map((txn) => (
              <QuickWinRow
                key={txn.id}
                merchantName={txn.merchantName}
                saveAmount={formatCurrency(txn.amount)}
                isRecurring={txn.isRecurring}
                frequency={txn.recurringFrequency}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Action Items */}
      {unreviewedCount > 0 && (
        <Section label="Action Items">
          <ActionItemCard
            title="Review Personal Expenses"
            subtitle="Swipe to categorize spending"
            count={unreviewedCount}
            minutes={Math.max(1, Math.round(unreviewedCount * 0.3))}
            href="/review/personal"
          />
        </Section>
      )}
    </div>
  );
}

// ─── Business Tab ────────────────────────────────────────

function BusinessContent({ monthKey }: { readonly monthKey: string }) {
  const allTransactions = useTransactionStore((s) => s.transactions);
  const notes = useTransactionStore((s) => s.notes);
  const accounts = useAccountStore((s) => s.accounts);

  const transactions = useMemo(
    () => filterByMonth(allTransactions, monthKey),
    [allTransactions, monthKey]
  );

  const businessAccountIds = useMemo(
    () => accounts.filter((a) => a.type === "business").map((a) => a.id),
    [accounts]
  );

  const businessTransactions = useMemo(
    () => transactions.filter((t) => businessAccountIds.includes(t.accountId)),
    [transactions, businessAccountIds]
  );

  const unreviewedCount = useMemo(
    () =>
      selectUnreviewedByType({ transactions, notes }, "business", businessAccountIds).length,
    [transactions, notes, businessAccountIds]
  );

  const revenue = useMemo(
    () =>
      Math.abs(
        businessTransactions
          .filter((t) => t.amount < 0 && !t.isTransfer)
          .reduce((sum, t) => sum + t.amount, 0)
      ),
    [businessTransactions]
  );

  const expenses = useMemo(
    () =>
      businessTransactions
        .filter((t) => t.amount > 0 && !t.isTransfer)
        .reduce((sum, t) => sum + t.amount, 0),
    [businessTransactions]
  );

  const cashOnHand = useMemo(
    () =>
      accounts
        .filter(
          (a) =>
            a.type === "business" &&
            a.category !== "loan" &&
            a.category !== "line_of_credit"
        )
        .reduce((sum, a) => sum + Math.max(0, a.balance), 0),
    [accounts]
  );

  const bizHasMinimumReviews = useMemo(() => {
    const reviewed = businessTransactions.filter((t) => t.reviewed && t.amount > 0 && !t.isTransfer).length;
    const total = businessTransactions.filter((t) => t.amount > 0 && !t.isTransfer).length;
    return reviewed >= 5 || (total > 0 && reviewed / total >= 0.5);
  }, [businessTransactions]);

  const { score: roiScore, roiPercentage } = useMemo(
    () => calcRoiOptimizationScore(businessTransactions),
    [businessTransactions]
  );

  const businessBuckets = useMemo(
    () => groupByBusinessBucket(businessTransactions),
    [businessTransactions]
  );

  const unsureBucket = businessBuckets.find((b) => b.label === "Unsure");
  const profit = revenue - expenses;

  return (
    <div className="flex flex-col gap-6">
      {/* Review CTA */}
      <ReviewCTA
        unreviewedCount={unreviewedCount}
        estimatedMinutes={Math.max(1, Math.round(unreviewedCount * 0.3))}
        type="business"
      />

      {/* Stats Row */}
      <StatsRow
        stats={[
          { label: "Revenue", value: formatCurrency(revenue) },
          { label: "Expenses", value: formatCurrency(expenses) },
          { label: "Profit", value: formatCurrency(profit) },
        ]}
      />

      {/* ROI Score — hero */}
      <section className="flex flex-col items-center gap-2 py-2">
        <p className="section-label">ROI Optimization Score</p>
        {bizHasMinimumReviews ? (
          <HalfPieGauge
            score={roiScore}
            size={160}
            subtitle={`${roiPercentage}% towards high-ROI spend`}
            showDot
          />
        ) : (
          <div className="flex flex-col items-center gap-1 py-4">
            <p className="text-2xl font-bold tracking-tighter text-text-quaternary">—</p>
            <p className="text-[11px] text-text-tertiary text-center max-w-[200px]">
              Review at least 5 transactions to unlock your score
            </p>
          </div>
        )}
      </section>

      {/* Spend Breakdown — full-width rows */}
      {businessBuckets.length > 0 ? (
        <Section label="Spend Breakdown">
          <div className="flex flex-col gap-2">
            {businessBuckets.map((bucket) => {
              const icon =
                bucket.label === "High ROI"
                  ? TrendingUp
                  : bucket.label === "No ROI"
                    ? TrendingDown
                    : AlertTriangle;
              const pct =
                expenses > 0 ? Math.round((bucket.value / expenses) * 100) : 0;
              return (
                <InsightRow
                  key={bucket.label}
                  icon={icon}
                  title={bucket.label}
                  subtitle={`${bucket.count} transactions`}
                  value={formatCurrency(bucket.value)}
                  subvalue={`${pct}%`}
                />
              );
            })}
          </div>
        </Section>
      ) : (
        <Section label="Spend Breakdown">
          <div className="rounded-xl border border-border-secondary bg-bg-primary px-4 py-6 text-center">
            <p className="text-[11px] text-text-tertiary">
              Review transactions to see breakdown
            </p>
          </div>
        </Section>
      )}

      {/* Cash Position */}
      <StatsRow
        stats={[
          { label: "Money In", value: formatCurrency(revenue) },
          { label: "Money Out", value: formatCurrency(expenses) },
          { label: "Cash On-Hand", value: formatCurrency(cashOnHand) },
        ]}
      />

      {/* Action Items — full-width dark cards */}
      <Section label="Action Items">
        <div className="flex flex-col gap-2">
          {unreviewedCount > 0 && (
            <ActionItemCard
              title="Review Business Expenses"
              subtitle="Swipe to categorize ROI"
              count={unreviewedCount}
              minutes={Math.max(1, Math.round(unreviewedCount * 0.3))}
              href="/review/business"
            />
          )}
          {unsureBucket && unsureBucket.count > 0 && (
            <ActionItemCard
              title="Resolve Unsure Transactions"
              subtitle="Re-review unsure expenses"
              count={unsureBucket.count}
              minutes={Math.max(1, Math.round(unsureBucket.count * 0.2))}
              href="/insights/unsure-review"
            />
          )}
          {unreviewedCount === 0 && (!unsureBucket || unsureBucket.count === 0) && (
            <div className="rounded-xl border border-border-secondary bg-bg-primary px-4 py-5 text-center">
              <p className="text-sm font-bold text-text-primary">All caught up</p>
              <p className="mt-1 text-[10px] text-text-tertiary">No pending reviews</p>
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────

export default function DashboardPage() {
  const allTransactions = useTransactionStore((s) => s.transactions);

  const months = useMemo(
    () => getAvailableMonths(allTransactions),
    [allTransactions]
  );
  const latestMonth = months.length > 0 ? months[months.length - 1].key : "";
  const [selectedMonth, setSelectedMonth] = useState(latestMonth);

  useEffect(() => {
    if (months.length > 0 && !months.some((m) => m.key === selectedMonth)) {
      setSelectedMonth(months[months.length - 1].key);
    }
  }, [months, selectedMonth]);

  const monthLabel = useMemo(() => {
    const found = months.find((m) => m.key === selectedMonth);
    return found?.label ?? "Dashboard";
  }, [months, selectedMonth]);

  return (
    <div className="flex flex-col pb-4 safe-top">
      <div className="h-[60px]" />

      <div className="flex flex-col gap-4 px-3">
        <div className="flex flex-col gap-2.5 px-1">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <p className="font-mono text-[9px] font-semibold uppercase tracking-widest text-text-quaternary">
                Sailor
              </p>
              <h1 className="text-lg font-bold tracking-tight text-text-primary">
                {monthLabel}
              </h1>
            </div>
          </div>
          <MonthPicker
            months={months}
            selected={selectedMonth}
            onSelect={setSelectedMonth}
          />
        </div>

        <TabBar
          defaultTab="Overview"
          children={{
            Overview: <OverviewContent monthKey={selectedMonth} />,
            Personal: <PersonalContent monthKey={selectedMonth} />,
            Business: <BusinessContent monthKey={selectedMonth} />,
          }}
        />
      </div>

      <div className="h-8 safe-bottom" />
    </div>
  );
}
