"use client";

import { TabBar } from "@/components/dashboard/TabBar";
import { ReviewCTA } from "@/components/dashboard/ReviewCTA";
import { HalfPieGauge } from "@/components/dashboard/HalfPieGauge";
import { DonutChart, assignGrayscaleColors } from "@/components/dashboard/DonutChart";
import { MonthPicker, getAvailableMonths, filterByMonth } from "@/components/dashboard/MonthPicker";
import { useMemo, useState, useEffect } from "react";
import {
  useTransactionStore,
  selectUnreviewedByType,
} from "@/stores/transactions";
import { useAccountStore } from "@/stores/accounts";
import { formatCurrency } from "@/lib/format";
import {
  calcJoySpendScore,
  calcRoiOptimizationScore,
  groupByMeaningCategory,
  groupByRoiType,
} from "@/lib/scores";

// ─── Stat Card ──────────────────────────────────────────────

function StatCard({
  label,
  value,
  mono = true,
}: {
  readonly label: string;
  readonly value: string;
  readonly mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-border-secondary bg-bg-primary px-4 py-3 shadow-sm">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
        {label}
      </p>
      <p
        className={`text-xl font-bold tracking-tighter text-text-primary ${mono ? "tabular-nums" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

// ─── Personal Tab ───────────────────────────────────────────

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
    () =>
      transactions.filter((t) => personalAccountIds.includes(t.accountId)),
    [transactions, personalAccountIds]
  );

  const unreviewedCount = useMemo(
    () =>
      selectUnreviewedByType(
        { transactions, notes },
        "personal",
        personalAccountIds
      ).length,
    [transactions, notes, personalAccountIds]
  );

  // Joy Spend Score
  const { score: joyScore, joyPercentage } = useMemo(
    () => calcJoySpendScore(personalTransactions),
    [personalTransactions]
  );

  // Joy Maximizers donut
  const meaningSegments = useMemo(() => {
    const raw = groupByMeaningCategory(personalTransactions);
    return assignGrayscaleColors(raw);
  }, [personalTransactions]);

  // Money In
  const income = useMemo(() => {
    return Math.abs(
      personalTransactions
        .filter((t) => t.amount < 0 && !t.isTransfer)
        .reduce((sum, t) => sum + t.amount, 0)
    );
  }, [personalTransactions]);

  // Money Out
  const expenses = useMemo(() => {
    return personalTransactions
      .filter((t) => t.amount > 0 && !t.isTransfer)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [personalTransactions]);

  // Cash on Hand
  const cashOnHand = useMemo(() => {
    return accounts
      .filter(
        (a) =>
          a.type === "personal" &&
          a.category !== "loan" &&
          a.category !== "line_of_credit"
      )
      .reduce((sum, a) => sum + Math.max(0, a.balance), 0);
  }, [accounts]);

  return (
    <div className="flex flex-col gap-5">
      <ReviewCTA
        unreviewedCount={unreviewedCount}
        estimatedMinutes={Math.max(1, Math.round(unreviewedCount * 0.3))}
        type="personal"
      />

      {/* Joy Spend Score */}
      <section className="flex flex-col items-center gap-1 rounded-xl border border-border-secondary bg-bg-primary py-4 shadow-sm">
        <p className="section-label">Joy Spend Score</p>
        <HalfPieGauge
          score={joyScore}
          size={140}
          subtitle={`${joyPercentage}% towards meaningful spend`}
        />
      </section>

      {/* Joy Maximizers */}
      {meaningSegments.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="section-label px-1">Joy Maximizers</p>
          <div className="rounded-xl border border-border-secondary bg-bg-primary p-5 shadow-sm">
            <DonutChart segments={meaningSegments} size={160} />
          </div>
        </section>
      )}

      {/* Money In / Money Out / Cash on Hand */}
      <div className="flex flex-col gap-2">
        <StatCard label="Money In" value={formatCurrency(income)} />
        <StatCard label="Money Out" value={formatCurrency(expenses)} />
        <StatCard label="Cash on Hand" value={formatCurrency(cashOnHand)} />
      </div>
    </div>
  );
}

// ─── Business Tab ───────────────────────────────────────────

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
    () =>
      transactions.filter((t) => businessAccountIds.includes(t.accountId)),
    [transactions, businessAccountIds]
  );

  const unreviewedCount = useMemo(
    () =>
      selectUnreviewedByType(
        { transactions, notes },
        "business",
        businessAccountIds
      ).length,
    [transactions, notes, businessAccountIds]
  );

  // ROI Optimization Score
  const { score: roiScore, roiPercentage } = useMemo(
    () => calcRoiOptimizationScore(businessTransactions),
    [businessTransactions]
  );

  // Growth Drivers donut
  const roiSegments = useMemo(() => {
    const raw = groupByRoiType(businessTransactions);
    return assignGrayscaleColors(raw);
  }, [businessTransactions]);

  // Money In (revenue)
  const revenue = useMemo(() => {
    return Math.abs(
      businessTransactions
        .filter((t) => t.amount < 0 && !t.isTransfer)
        .reduce((sum, t) => sum + t.amount, 0)
    );
  }, [businessTransactions]);

  // Money Out (expenses)
  const expenses = useMemo(() => {
    return businessTransactions
      .filter((t) => t.amount > 0 && !t.isTransfer)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [businessTransactions]);

  // Cash on Hand
  const cashOnHand = useMemo(() => {
    return accounts
      .filter(
        (a) =>
          a.type === "business" &&
          a.category !== "loan" &&
          a.category !== "line_of_credit"
      )
      .reduce((sum, a) => sum + Math.max(0, a.balance), 0);
  }, [accounts]);

  return (
    <div className="flex flex-col gap-5">
      <ReviewCTA
        unreviewedCount={unreviewedCount}
        estimatedMinutes={Math.max(1, Math.round(unreviewedCount * 0.3))}
        type="business"
      />

      {/* ROI Optimization Score */}
      <section className="flex flex-col items-center gap-1 rounded-xl border border-border-secondary bg-bg-primary py-4 shadow-sm">
        <p className="section-label">ROI Optimization Score</p>
        <HalfPieGauge
          score={roiScore}
          size={140}
          subtitle={`${roiPercentage}% towards high-ROI spend`}
        />
      </section>

      {/* Growth Drivers */}
      {roiSegments.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="section-label px-1">Growth Drivers</p>
          <div className="rounded-xl border border-border-secondary bg-bg-primary p-5 shadow-sm">
            <DonutChart segments={roiSegments} size={160} />
          </div>
        </section>
      )}

      {/* Money In / Money Out / Cash on Hand */}
      <div className="flex flex-col gap-2">
        <StatCard label="Money In" value={formatCurrency(revenue)} />
        <StatCard label="Money Out" value={formatCurrency(expenses)} />
        <StatCard label="Cash on Hand" value={formatCurrency(cashOnHand)} />
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────

export default function DashboardPage() {
  const allTransactions = useTransactionStore((s) => s.transactions);

  const months = useMemo(
    () => getAvailableMonths(allTransactions),
    [allTransactions]
  );
  const latestMonth = months.length > 0 ? months[months.length - 1].key : "";
  const [selectedMonth, setSelectedMonth] = useState(latestMonth);

  // Keep selected month in sync if new data arrives
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
          defaultTab="Personal"
          children={{
            Personal: <PersonalContent monthKey={selectedMonth} />,
            Business: <BusinessContent monthKey={selectedMonth} />,
          }}
        />
      </div>

      <div className="h-8 safe-bottom" />
    </div>
  );
}
