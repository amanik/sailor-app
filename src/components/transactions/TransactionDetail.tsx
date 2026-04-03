"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Transaction } from "@/data/transactions";
import { useAccountStore } from "@/stores/accounts";
import { useTransactionDispatch } from "@/stores/transactions";
import { bucketOptions } from "@/lib/constants";
import { formatCurrencyPrecise } from "@/lib/format";

interface TransactionDetailProps {
  readonly transaction: Transaction | null;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

function DetailRow({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between py-2">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
        {label}
      </span>
      <span className="text-[13px] font-medium text-text-primary">{value}</span>
    </div>
  );
}

export function TransactionDetail({
  transaction,
  open,
  onOpenChange,
}: TransactionDetailProps) {
  const [notes, setNotes] = useState("");
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dispatch = useTransactionDispatch();
  const accounts = useAccountStore((s) => s.accounts);

  if (!transaction) return null;

  const account = accounts.find((a) => a.id === transaction.accountId);
  const isIncome = transaction.amount < 0;
  const isBusinessAccount = account?.type === "business";
  const buckets = isBusinessAccount ? bucketOptions.business : bucketOptions.personal;
  const currentBucket =
    selectedBucket ??
    transaction.businessBucket ??
    transaction.personalBucket ??
    null;

  const displayAmount = isIncome
    ? `+${formatCurrencyPrecise(transaction.amount)}`
    : formatCurrencyPrecise(transaction.amount);

  const formattedDate = new Date(transaction.date + "T12:00:00").toLocaleDateString(
    "en-US",
    { weekday: "short", month: "short", day: "numeric", year: "numeric" }
  );

  function handleSave() {
    if (saving || !transaction) return;
    setSaving(true);

    const updates: Record<string, unknown> = {};

    if (isBusinessAccount && selectedBucket) {
      updates.businessBucket = selectedBucket;
    } else if (!isBusinessAccount && selectedBucket) {
      updates.personalBucket = selectedBucket;
    }

    if (!transaction.reviewed && selectedBucket) {
      updates.reviewed = true;
      updates.reviewedAt = new Date().toISOString().split("T")[0];
    }

    dispatch({
      type: "UPDATE_TRANSACTION",
      id: transaction.id,
      updates,
      notes: notes || undefined,
    });

    setSaving(false);
    setSaved(true);
    setTimeout(() => {
      onOpenChange(false);
      setSaved(false);
      setSelectedBucket(null);
      setNotes("");
    }, 600);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="items-center text-center pb-2">
          {/* Drag handle */}
          <div className="mx-auto mb-2 h-1 w-8 rounded-full bg-border-secondary" />
          <div className="flex size-14 items-center justify-center rounded-2xl bg-bg-secondary text-2xl mx-auto">
            {transaction.merchantLogo}
          </div>
          <SheetTitle className="text-lg font-bold text-text-primary">
            {transaction.merchantName}
          </SheetTitle>
          <SheetDescription className="text-[11px] text-text-tertiary">
            {transaction.rawDescription}
          </SheetDescription>
          <p className="text-2xl font-bold tracking-tighter text-text-primary mt-1">
            {displayAmount}
          </p>
        </SheetHeader>

        <div className="px-4">
          <Separator />

          {/* Details */}
          <div className="flex flex-col">
            <DetailRow label="Date" value={formattedDate} />
            <DetailRow label="Category" value={transaction.category} />
            <DetailRow label="Account" value={account?.name} />
            <DetailRow
              label="Recurring"
              value={
                transaction.isRecurring
                  ? transaction.recurringFrequency ?? "Yes"
                  : "No"
              }
            />
            {transaction.annualProjection !== undefined && (
              <DetailRow
                label="Annual Est."
                value={`$${transaction.annualProjection.toLocaleString()}`}
              />
            )}
            {transaction.roiRating !== undefined && (
              <DetailRow label="ROI Rating" value={`${transaction.roiRating}/4`} />
            )}
            <DetailRow label="ROI Type" value={transaction.roiType ?? undefined} />
            <DetailRow
              label="Status"
              value={transaction.reviewed ? "Reviewed" : "Pending"}
            />
          </div>

          <Separator />

          {/* Bucket Assignment */}
          <div className="py-3">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">
              Bucket
            </p>
            <div className="flex flex-wrap gap-2">
              {buckets.map((bucket) => (
                <button
                  key={bucket.value}
                  onClick={() => setSelectedBucket(bucket.value)}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all duration-150 ${
                    currentBucket === bucket.value
                      ? "bg-text-primary text-white shadow-sm"
                      : "bg-bg-secondary text-text-secondary hover:bg-bg-secondary-hover"
                  }`}
                >
                  {bucket.label}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div className="py-3">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">
              Notes
            </p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add a note..."
              className="w-full resize-none rounded-lg border border-border-secondary bg-bg-primary px-3 py-2 text-[13px] text-text-primary placeholder:text-text-quaternary focus:border-text-tertiary focus:outline-none"
              rows={2}
            />
          </div>
        </div>

        <SheetFooter>
          <Button
            onClick={handleSave}
            disabled={saving || saved}
            className={`w-full font-semibold ${
              saved
                ? "bg-utility-green-600 text-white"
                : "bg-text-primary text-white hover:bg-fg-primary"
            }`}
            size="lg"
          >
            {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
