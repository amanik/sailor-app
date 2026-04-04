"use client";

import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { X, TrendingUp, TrendingDown, HelpCircle, Undo2 } from "lucide-react";
import {
  useTransactionStore,
  useTransactionDispatch,
  selectByBusinessBucket,
} from "@/stores/transactions";
import { useAccountStore } from "@/stores/accounts";
import type { Transaction } from "@/data/transactions";
import { ExpenseCard } from "@/components/review/ExpenseCard";
import { ProgressBar } from "@/components/review/ProgressBar";
import { RatingGauge } from "@/components/review/RatingGauge";

const roiMessages: Record<number, string> = {
  1: "Not worth it",
  2: "Marginal return",
  3: "Solid investment",
  4: "Game-changer",
};

type Bucket = "high_roi" | "no_roi";
type Direction = "left" | "right" | null;
type FlowState = "rate" | "classify" | "roi_type" | "no_roi_reason" | "done";

const noRoiReasons = [
  "No longer needed",
  "Better alternative exists",
  "Poor results",
  "Too expensive",
  "Was a one-time mistake",
] as const;

export default function UnsureReviewPage() {
  const transactions = useTransactionStore((s) => s.transactions);
  const notes = useTransactionStore((s) => s.notes);
  const dispatch = useTransactionDispatch();
  const accounts = useAccountStore((s) => s.accounts);

  const businessAccountIds = useMemo(
    () => accounts.filter((a) => a.type === "business").map((a) => a.id),
    [accounts]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>(null);
  const [flowState, setFlowState] = useState<FlowState>("rate");
  const [currentBucket, setCurrentBucket] = useState<Bucket | null>(null);
  const [roiRating, setRoiRating] = useState<number | null>(null);
  const [reviewedLocal, setReviewedLocal] = useState<Array<{ txn: Transaction; bucket: Bucket }>>([]);

  const [txnSnapshot] = useState(() => [
    ...selectByBusinessBucket(
      { transactions, notes },
      "unsure",
      businessAccountIds
    ),
  ]);
  const current = txnSnapshot[currentIndex] as Transaction | undefined;
  const total = txnSnapshot.length;

  function handleRate(val: number) {
    setRoiRating(val);
    setFlowState("classify");
  }

  function handleBucket(bucket: Bucket) {
    setCurrentBucket(bucket);
    if (bucket === "high_roi") {
      setDirection("right");
      setTimeout(() => setFlowState("roi_type"), 300);
    } else {
      setDirection("left");
      setTimeout(() => setFlowState("no_roi_reason"), 300);
    }
  }

  function advanceToNext(bucket: Bucket, roi?: number, roiType?: string, noRoiReason?: string) {
    if (current) {
      setReviewedLocal((prev) => [...prev, { txn: current, bucket }]);
      dispatch({
        type: "REVIEW_TRANSACTION",
        id: current.id,
        bucket,
        roi,
        roiType,
        noRoiReason,
      });
    }
    setDirection(null);
    setFlowState("rate");
    setCurrentBucket(null);
    setRoiRating(null);
    if (currentIndex + 1 >= total) {
      setFlowState("done");
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  function handleUndo() {
    if (reviewedLocal.length === 0) return;
    const last = reviewedLocal[reviewedLocal.length - 1];
    // Re-set to unsure
    dispatch({
      type: "REVIEW_TRANSACTION",
      id: last.txn.id,
      bucket: "unsure",
    });
    setReviewedLocal((prev) => prev.slice(0, -1));
    setCurrentIndex((i) => Math.max(0, i - 1));
    setFlowState("rate");
    setRoiRating(null);
    setDirection(null);
  }

  function handleSwipe(swipeDirection: "left" | "right" | "up") {
    if (flowState !== "classify") return;
    if (swipeDirection === "right") {
      handleBucket("high_roi");
    } else if (swipeDirection === "left") {
      handleBucket("no_roi");
    }
    if (swipeDirection === "up") {
      if (currentIndex + 1 >= total) {
        setFlowState("done");
      } else {
        setCurrentIndex((i) => i + 1);
        setFlowState("rate");
        setRoiRating(null);
      }
    }
  }

  function handleDismissSheet() {
    setFlowState("classify");
    setDirection(null);
    setCurrentBucket(null);
  }

  const isClassifying = flowState !== "rate";

  if (total === 0 || flowState === "done") {
    const highRoiCount = reviewedLocal.filter((r) => r.bucket === "high_roi").length;
    const noRoiCount = reviewedLocal.filter((r) => r.bucket === "no_roi").length;

    return (
      <div className="flex flex-col pb-4 safe-top">
        <div className="h-[60px]" />
        <div className="flex flex-col gap-6 px-4 items-center text-center pt-12">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-bg-secondary">
            <HelpCircle className="size-8 text-text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Unsure Review Complete
          </h1>
          <p className="text-sm text-text-tertiary">
            {total > 0
              ? `You resolved ${reviewedLocal.length} of ${total} unsure transactions`
              : "No unsure transactions to review!"}
          </p>
          {reviewedLocal.length > 0 && (
            <div className="flex gap-4 mt-4">
              <div className="card p-3 flex flex-col items-center gap-1">
                <TrendingUp className="size-5 text-text-secondary" />
                <span className="text-lg font-bold text-text-primary">{highRoiCount}</span>
                <span className="text-[9px] text-text-tertiary">High ROI</span>
              </div>
              <div className="card p-3 flex flex-col items-center gap-1">
                <TrendingDown className="size-5 text-text-secondary" />
                <span className="text-lg font-bold text-text-primary">{noRoiCount}</span>
                <span className="text-[9px] text-text-tertiary">No ROI</span>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3 mt-6 w-full max-w-[280px]">
            <Link href="/insights" className="bg-text-primary text-bg-primary px-6 py-3 rounded-xl text-sm font-bold text-center">
              View Insights
            </Link>
            <Link href="/" className="text-text-tertiary text-sm text-center mt-2">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div className="flex flex-col pb-4 safe-top">
      <div className="h-[60px]" />
      <div className="flex flex-col gap-4 px-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-text-tertiary text-sm">
            {"\u2190"} Back
          </Link>
          <p className="section-label">Unsure Micro-Audit</p>
          {reviewedLocal.length > 0 && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1 text-text-tertiary text-sm hover:text-text-primary transition-colors"
            >
              <Undo2 className="size-3.5" />
              Undo
            </button>
          )}
        </div>

        <ProgressBar current={currentIndex + 1} total={total} />

        {/* Card */}
        <div className="relative min-h-[320px]">
          <AnimatePresence mode="wait">
            <ExpenseCard
              key={current.id}
              transaction={current}
              direction={direction}
              onSwipe={isClassifying ? handleSwipe : undefined}
              rightLabel="High ROI"
              leftLabel="No ROI"
              upLabel="Skip"
            />
          </AnimatePresence>
        </div>

        {/* Step 1: Rate */}
        {!isClassifying && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <p className="section-label text-center mb-3">Rate this expense</p>
            <RatingGauge
              value={roiRating}
              onChange={handleRate}
              min={1}
              max={4}
              messages={roiMessages}
              lowLabel="Low ROI"
              highLabel="High ROI"
            />
          </motion.div>
        )}

        {/* Step 2: Classify */}
        {isClassifying && flowState === "classify" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col gap-2"
          >
            <p className="section-label text-center">Now classify it</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleBucket("high_roi")}
                className="flex-1 card p-3 flex flex-col items-center gap-1.5 hover:bg-bg-secondary transition-colors active:scale-95"
              >
                <TrendingUp className="size-5 text-text-secondary" />
                <span className="text-[10px] font-bold text-text-primary">High ROI</span>
              </button>
              <button
                onClick={() => handleBucket("no_roi")}
                className="flex-1 card p-3 flex flex-col items-center gap-1.5 hover:bg-bg-secondary transition-colors active:scale-95"
              >
                <TrendingDown className="size-5 text-text-secondary" />
                <span className="text-[10px] font-bold text-text-primary">No ROI</span>
              </button>
              <button
                onClick={() => handleSwipe("up")}
                className="flex-1 card p-3 flex flex-col items-center gap-1.5 hover:bg-bg-secondary transition-colors active:scale-95"
              >
                <HelpCircle className="size-5 text-text-secondary" />
                <span className="text-[10px] font-bold text-text-primary">Skip</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Bottom Sheet: ROI Type ── */}
      <AnimatePresence>
        {flowState === "roi_type" && current && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/40"
              onClick={handleDismissSheet}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg"
            >
              <div className="rounded-t-2xl bg-bg-primary px-4 pb-8 pt-4">
                <div className="mb-4 flex justify-center">
                  <div className="h-1 w-10 rounded-full bg-border-secondary" />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <p className="section-label">What kind of ROI?</p>
                  <button
                    onClick={handleDismissSheet}
                    className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-bg-secondary"
                  >
                    <X className="size-4 text-text-tertiary" />
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {(["time", "money", "emotional", "overhead"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => advanceToNext("high_roi", roiRating ?? undefined, type)}
                      className="card p-3 text-left text-sm font-semibold text-text-primary capitalize hover:bg-bg-secondary transition-colors active:scale-[0.98]"
                    >
                      {type === "time" ? "Time Multiplier" : type === "money" ? "Money Multiplier" : type === "emotional" ? "Emotional ROI" : "Overhead"}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Bottom Sheet: No ROI Reason ── */}
      <AnimatePresence>
        {flowState === "no_roi_reason" && current && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/40"
              onClick={handleDismissSheet}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg"
            >
              <div className="rounded-t-2xl bg-bg-primary px-4 pb-8 pt-4">
                <div className="mb-4 flex justify-center">
                  <div className="h-1 w-10 rounded-full bg-border-secondary" />
                </div>
                <div className="flex items-center justify-between mb-4">
                  <p className="section-label">No ROI</p>
                  <button
                    onClick={handleDismissSheet}
                    className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-bg-secondary"
                  >
                    <X className="size-4 text-text-tertiary" />
                  </button>
                </div>
                <h2 className="text-lg font-bold tracking-tight text-text-primary text-center mb-2">
                  Why no ROI?
                </h2>
                <p className="text-sm text-text-tertiary text-center mb-5">
                  Understanding helps make better decisions
                </p>
                <div className="flex flex-col gap-2">
                  {noRoiReasons.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => advanceToNext("no_roi", undefined, undefined, reason)}
                      className="card p-3 text-left text-sm font-semibold text-text-primary hover:bg-bg-secondary transition-colors active:scale-[0.98]"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
