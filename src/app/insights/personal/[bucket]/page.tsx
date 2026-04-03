"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Star,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import {
  useTransactionStore,
  selectByPersonalBucket,
} from "@/stores/transactions";
import { useAccountStore } from "@/stores/accounts";
import { formatCurrency } from "@/lib/format";
import { getCategoryIcon } from "@/lib/icons";
import { TransactionDetail } from "@/components/transactions/TransactionDetail";
import type { Transaction } from "@/data/transactions";

const bucketMeta: Record<
  string,
  { label: string; icon: LucideIcon; dbKey: "essential" | "meaningful" | "mismatch" }
> = {
  essential: { label: "Essential", icon: Sparkles, dbKey: "essential" },
  meaningful: { label: "Meaningful", icon: Star, dbKey: "meaningful" },
  mismatch: { label: "Mismatch", icon: AlertTriangle, dbKey: "mismatch" },
};

export default function PersonalBucketDetailPage() {
  const params = useParams();
  const bucketSlug = params.bucket as string;
  const meta = bucketMeta[bucketSlug];
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const transactions = useTransactionStore((s) => s.transactions);
  const notes = useTransactionStore((s) => s.notes);
  const accounts = useAccountStore((s) => s.accounts);

  const personalAccountIds = useMemo(
    () => accounts.filter((a) => a.type === "personal").map((a) => a.id),
    [accounts]
  );

  const bucketTransactions = useMemo(() => {
    if (!meta) return [];
    return selectByPersonalBucket(
      { transactions, notes },
      meta.dbKey,
      personalAccountIds
    ).filter((t) => t.amount > 0);
  }, [transactions, notes, personalAccountIds, meta]);

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

  // Meaningful-specific stats
  const avgMeaningRating =
    meta.dbKey === "meaningful" && bucketTransactions.length > 0
      ? (
          bucketTransactions.reduce((sum, t) => sum + (t.meaningRating ?? 0), 0) /
          bucketTransactions.length
        ).toFixed(1)
      : null;

  // Meaning category breakdown
  const meaningCategoryBreakdown = useMemo(() => {
    if (meta.dbKey !== "meaningful") return [];
    const cats: Record<string, number> = {};
    for (const t of bucketTransactions) {
      const cat = t.meaningCategory ?? "Unspecified";
      cats[cat] = (cats[cat] ?? 0) + 1;
    }
    return Object.entries(cats)
      .sort(([, a], [, b]) => b - a)
      .map(([label, count]) => ({ label, count }));
  }, [bucketTransactions, meta.dbKey]);

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

        {/* Stats row */}
        <div className="flex gap-2">
          <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border-secondary bg-bg-primary p-3 shadow-sm flex-1">
            <p className="text-lg font-bold tracking-tight text-text-primary tabular-nums">
              {bucketTransactions.length}
            </p>
            <p className="text-[10px] text-text-tertiary">Transactions</p>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border-secondary bg-bg-primary p-3 shadow-sm flex-1">
            <p className="text-lg font-bold tracking-tight text-text-primary tabular-nums">
              {formatCurrency(total)}
            </p>
            <p className="text-[10px] text-text-tertiary">Total</p>
          </div>
          {avgMeaningRating && (
            <div className="flex flex-col items-center gap-0.5 rounded-xl border border-border-secondary bg-bg-primary p-3 shadow-sm flex-1">
              <p className="text-lg font-bold tracking-tight text-text-primary tabular-nums">
                {avgMeaningRating}/10
              </p>
              <p className="text-[10px] text-text-tertiary">Avg Rating</p>
            </div>
          )}
        </div>

        {/* Meaning category breakdown */}
        {meaningCategoryBreakdown.length > 0 && (
          <section className="flex flex-col gap-2">
            <p className="section-label">By Category</p>
            <div className="rounded-xl border border-border-secondary bg-bg-primary p-4 shadow-sm flex flex-col gap-2">
              {meaningCategoryBreakdown.map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-[11px] text-text-secondary capitalize">{item.label}</span>
                  <span className="text-[11px] font-semibold text-text-primary tabular-nums">{item.count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Mismatch reflection prompt */}
        {meta.dbKey === "mismatch" && bucketTransactions.length > 0 && (
          <div className="rounded-xl border border-border-secondary bg-bg-primary p-4 shadow-sm">
            <p className="text-[13px] font-semibold text-text-primary mb-2">
              A moment to reflect
            </p>
            <p className="text-[11px] text-text-tertiary leading-relaxed">
              Not every spend hits the mark, and that&apos;s okay. Look at the list below
              and ask: is there a pattern? Are these impulse buys, comfort spending,
              or identity purchases? Naming the pattern is the first step to changing it.
            </p>
          </div>
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
                      {meta.dbKey === "meaningful" && txn.meaningRating
                        ? ` \u00B7 ${txn.meaningRating}/4`
                        : ""}
                      {meta.dbKey === "meaningful" && txn.meaningCategory
                        ? ` \u00B7 ${txn.meaningCategory}`
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
                href="/review/personal"
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
