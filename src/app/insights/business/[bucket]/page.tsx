"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";
import {
  useTransactionStore,
  selectByBusinessBucket,
} from "@/stores/transactions";
import { useAccountStore } from "@/stores/accounts";
import { formatCurrency } from "@/lib/format";
import { getCategoryIcon } from "@/lib/icons";
import { TransactionDetail } from "@/components/transactions/TransactionDetail";
import type { Transaction } from "@/data/transactions";

const bucketMeta: Record<
  string,
  { label: string; icon: LucideIcon; dbKey: "high_roi" | "no_roi" | "unsure" }
> = {
  "high-roi": { label: "High ROI", icon: TrendingUp, dbKey: "high_roi" },
  "no-roi": { label: "No ROI", icon: TrendingDown, dbKey: "no_roi" },
  unsure: { label: "Unsure", icon: HelpCircle, dbKey: "unsure" },
};

function StatCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border-secondary bg-bg-primary p-3 shadow-sm flex-1">
      <p className="text-lg font-bold tracking-tight text-text-primary tabular-nums">
        {value}
      </p>
      <p className="text-[10px] text-text-tertiary">{label}</p>
    </div>
  );
}

function BreakdownBar({
  label,
  count,
  total,
  maxCount,
}: {
  readonly label: string;
  readonly count: number;
  readonly total: number;
  readonly maxCount: number;
}) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  const pctOfTotal = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-text-secondary">{label}</span>
        <span className="text-[11px] font-semibold text-text-primary tabular-nums">
          {count} ({pctOfTotal}%)
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-fg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BusinessBucketDetailPage() {
  const params = useParams();
  const bucketSlug = params.bucket as string;
  const meta = bucketMeta[bucketSlug];
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const transactions = useTransactionStore((s) => s.transactions);
  const notes = useTransactionStore((s) => s.notes);
  const accounts = useAccountStore((s) => s.accounts);

  const businessAccountIds = useMemo(
    () => accounts.filter((a) => a.type === "business").map((a) => a.id),
    [accounts]
  );

  const bucketTransactions = useMemo(() => {
    if (!meta) return [];
    return selectByBusinessBucket(
      { transactions, notes },
      meta.dbKey,
      businessAccountIds
    ).filter((t) => t.amount > 0);
  }, [transactions, notes, businessAccountIds, meta]);

  if (!meta) {
    return (
      <div className="flex flex-col items-center justify-center pt-24 gap-4">
        <p className="text-text-tertiary">Bucket not found</p>
        <Link href="/" className="text-sm text-text-secondary underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const Icon = meta.icon;
  const total = bucketTransactions.reduce((sum, t) => sum + t.amount, 0);

  // High ROI specific stats
  const avgRoiRating =
    meta.dbKey === "high_roi" && bucketTransactions.length > 0
      ? (
          bucketTransactions.reduce((sum, t) => sum + (t.roiRating ?? 0), 0) /
          bucketTransactions.length
        ).toFixed(1)
      : null;

  const highRatedPct =
    meta.dbKey === "high_roi" && bucketTransactions.length > 0
      ? Math.round(
          (bucketTransactions.filter((t) => (t.roiRating ?? 0) >= 7).length /
            bucketTransactions.length) *
            100
        )
      : null;

  // ROI type breakdown (high_roi)
  const roiTypeBreakdown = useMemo(() => {
    if (meta.dbKey !== "high_roi") return [];
    const types = ["time", "money", "emotional", "overhead"];
    const counts = types.map((type) => ({
      label: type === "time" ? "Time Multiplier" : type === "money" ? "Money Multiplier" : type === "emotional" ? "Emotional ROI" : "Overhead",
      count: bucketTransactions.filter((t) => t.roiType === type).length,
    }));
    const maxCount = Math.max(...counts.map((c) => c.count), 1);
    return counts
      .filter((c) => c.count > 0)
      .map((c) => ({ ...c, maxCount, total: bucketTransactions.length }));
  }, [bucketTransactions, meta.dbKey]);

  // No ROI reason breakdown
  const noRoiReasonBreakdown = useMemo(() => {
    if (meta.dbKey !== "no_roi") return [];
    const reasons: Record<string, number> = {};
    for (const t of bucketTransactions) {
      const reason = t.noRoiReason ?? "Unspecified";
      reasons[reason] = (reasons[reason] ?? 0) + 1;
    }
    const maxCount = Math.max(...Object.values(reasons), 1);
    return Object.entries(reasons)
      .sort(([, a], [, b]) => b - a)
      .map(([label, count]) => ({
        label,
        count,
        maxCount,
        total: bucketTransactions.length,
      }));
  }, [bucketTransactions, meta.dbKey]);

  // Annualized savings for no_roi
  const annualizedSavings =
    meta.dbKey === "no_roi" ? Math.round(total * 12) : null;

  return (
    <div className="flex flex-col pb-4 safe-top">
      <div className="h-[60px]" />
      <div className="flex flex-col gap-5 px-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex size-8 items-center justify-center rounded-lg hover:bg-bg-secondary transition-colors"
          >
            <ArrowLeft className="size-4 text-text-secondary" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-bg-secondary">
              <Icon className="size-4 text-text-secondary" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-text-primary">
              {meta.label}
            </h1>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-2">
          <StatCard label="Transactions" value={String(bucketTransactions.length)} />
          <StatCard label="Total" value={formatCurrency(total)} />
          {avgRoiRating && <StatCard label="Avg ROI" value={`${avgRoiRating}/10`} />}
          {highRatedPct !== null && <StatCard label="Rated 7+" value={`${highRatedPct}%`} />}
          {annualizedSavings !== null && (
            <StatCard label="Annual (est.)" value={formatCurrency(annualizedSavings)} />
          )}
        </div>

        {/* Breakdown bars */}
        {roiTypeBreakdown.length > 0 && (
          <section className="flex flex-col gap-2">
            <p className="section-label">ROI Type Breakdown</p>
            <div className="rounded-xl border border-border-secondary bg-bg-primary p-4 shadow-sm flex flex-col gap-3">
              {roiTypeBreakdown.map((item) => (
                <BreakdownBar
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  total={item.total}
                  maxCount={item.maxCount}
                />
              ))}
            </div>
          </section>
        )}

        {noRoiReasonBreakdown.length > 0 && (
          <section className="flex flex-col gap-2">
            <p className="section-label">Reason Breakdown</p>
            <div className="rounded-xl border border-border-secondary bg-bg-primary p-4 shadow-sm flex flex-col gap-3">
              {noRoiReasonBreakdown.map((item) => (
                <BreakdownBar
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  total={item.total}
                  maxCount={item.maxCount}
                />
              ))}
            </div>
          </section>
        )}

        {/* Transaction list */}
        <section className="flex flex-col gap-2">
          <p className="section-label">
            Transactions ({bucketTransactions.length})
          </p>
          <div className="rounded-xl border border-border-secondary bg-bg-primary shadow-sm divide-y divide-border-secondary">
            {bucketTransactions.map((txn) => {
              const CategoryIcon = getCategoryIcon(txn.category);
              return (
                <button
                  key={txn.id}
                  onClick={() => setSelectedTxn(txn as Transaction)}
                  className="flex items-center gap-3 px-4 py-3 w-full text-left hover:bg-bg-secondary/50 transition-colors"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-bg-secondary">
                    <CategoryIcon className="size-4 text-text-secondary" />
                  </div>
                  <div className="flex flex-1 min-w-0 flex-col gap-0">
                    <p className="text-[13px] font-semibold text-text-primary truncate">
                      {txn.merchantName}
                    </p>
                    <p className="text-[10px] text-text-tertiary">
                      {txn.category}
                      {meta.dbKey === "high_roi" && txn.roiRating
                        ? ` \u00B7 ROI: ${txn.roiRating}/4`
                        : ""}
                      {meta.dbKey === "no_roi" && txn.noRoiReason
                        ? ` \u00B7 ${txn.noRoiReason}`
                        : ""}
                    </p>
                  </div>
                  <p className="text-[13px] font-bold tracking-tight text-text-primary tabular-nums">
                    {formatCurrency(txn.amount)}
                  </p>
                </button>
              );
            })}
          </div>
          {bucketTransactions.length === 0 && (
            <div className="rounded-xl border border-border-secondary bg-bg-primary p-8 shadow-sm text-center">
              <p className="text-sm text-text-tertiary">
                No transactions in this bucket yet.
              </p>
              <Link
                href="/review/business"
                className="text-sm text-text-secondary underline mt-2 inline-block"
              >
                Start reviewing
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* Transaction Detail Sheet */}
      {selectedTxn && (
        <TransactionDetail
          transaction={selectedTxn}
          open={true}
          onOpenChange={(open) => { if (!open) setSelectedTxn(null); }}
        />
      )}

      <div className="h-8 safe-bottom" />
    </div>
  );
}
