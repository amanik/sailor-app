"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { X, TrendingUp, TrendingDown, HelpCircle, Undo2 } from "lucide-react";
import { useTransactions, useTransactionDispatch, selectUnreviewedByType } from "@/stores/transactions";
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

type Bucket = "high_roi" | "no_roi" | "unsure";
type Direction = "left" | "right" | "up" | null;
type FlowState = "classify" | "rate" | "clarify" | "done";

const bucketConfig: Record<Bucket, { label: string; icon: typeof TrendingUp }> = {
  high_roi: { label: "High ROI", icon: TrendingUp },
  no_roi: { label: "No ROI", icon: TrendingDown },
  unsure: { label: "Unsure", icon: HelpCircle },
};

const noRoiReasons = [
  "No longer needed",
  "Better alternative exists",
  "Poor results",
  "Too expensive",
  "Was a one-time mistake",
] as const;

export default function BusinessReviewPage() {
  const state = useTransactions();
  const dispatch = useTransactionDispatch();
  const allTransactions = selectUnreviewedByType(state, "business");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>(null);
  const [flowState, setFlowState] = useState<FlowState>("classify");
  const [currentBucket, setCurrentBucket] = useState<Bucket | null>(null);
  const [roiRating, setRoiRating] = useState<number | null>(null);
  const [reviewedLocal, setReviewedLocal] = useState<Array<{ txn: Transaction; bucket: Bucket; roi?: number }>>([]);

  const [txnSnapshot] = useState(() => [...allTransactions]);
  const current = txnSnapshot[currentIndex] as Transaction | undefined;
  const total = txnSnapshot.length;

  // Step 1: Classify — swipe or tap a bucket
  function handleBucket(bucket: Bucket) {
    setCurrentBucket(bucket);
    if (bucket === "high_roi") setDirection("right");
    else if (bucket === "no_roi") setDirection("left");
    else setDirection("up");
    // Open bottom sheet for rating
    setTimeout(() => setFlowState("rate"), 300);
  }

  // Step 2: Rate — tap stars in bottom sheet
  function handleRate(val: number) {
    setRoiRating(val);
    // If bucket needs clarification, go to step 3. Otherwise advance.
    if (currentBucket === "high_roi" || currentBucket === "no_roi") {
      setFlowState("clarify");
    } else {
      // unsure — no clarification needed, advance
      advanceToNext(currentBucket ?? "unsure", val);
    }
  }

  // Step 3: Clarify — pick ROI type or no-ROI reason
  function handleClarify(roiType?: string, noRoiReason?: string) {
    advanceToNext(currentBucket!, roiRating ?? undefined, roiType, noRoiReason);
  }

  function advanceToNext(bucket: Bucket, roi?: number, roiType?: string, noRoiReason?: string) {
    if (current) {
      setReviewedLocal((prev) => [...prev, { txn: current, bucket, roi }]);
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
    setFlowState("classify");
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
    dispatch({ type: "UN_REVIEW_TRANSACTION", id: last.txn.id });
    setReviewedLocal((prev) => prev.slice(0, -1));
    setCurrentIndex((i) => Math.max(0, i - 1));
    setFlowState("classify");
    setCurrentBucket(null);
    setRoiRating(null);
    setDirection(null);
  }

  function handleSwipe(swipeDirection: "left" | "right" | "up") {
    if (swipeDirection === "right") handleBucket("high_roi");
    else if (swipeDirection === "left") handleBucket("no_roi");
    else handleBucket("unsure");
  }

  function handleDismissSheet() {
    setFlowState("classify");
    setDirection(null);
    setCurrentBucket(null);
    setRoiRating(null);
  }

  if (total === 0 || flowState === "done") {
    const highRoiCount = reviewedLocal.filter((r) => r.bucket === "high_roi").length;
    const noRoiCount = reviewedLocal.filter((r) => r.bucket === "no_roi").length;
    const unsureCount = reviewedLocal.filter((r) => r.bucket === "unsure").length;

    return (
      <div className="flex flex-col pb-4 safe-top">
        <div className="h-[60px]" />
        <div className="flex flex-col gap-6 px-4 items-center text-center pt-12">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-bg-secondary">
            <TrendingUp className="size-8 text-text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Review Complete</h1>
          <p className="text-sm text-text-tertiary">
            {total > 0
              ? `You reviewed ${total} business transactions`
              : "All business transactions are reviewed!"}
          </p>
          {total > 0 && (
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
              <div className="card p-3 flex flex-col items-center gap-1">
                <HelpCircle className="size-5 text-text-secondary" />
                <span className="text-lg font-bold text-text-primary">{unsureCount}</span>
                <span className="text-[9px] text-text-tertiary">Unsure</span>
              </div>
            </div>
          )}
          <div className="flex flex-col gap-3 mt-6 w-full max-w-[280px]">
            <Link href="/review/personal" className="bg-text-primary text-bg-primary px-6 py-3 rounded-xl text-sm font-bold text-center">
              Review Personal Next
            </Link>
            <Link href="/insights" className="bg-bg-secondary text-text-primary px-6 py-3 rounded-xl text-sm font-bold text-center">
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

  const sheetOpen = flowState === "rate" || flowState === "clarify";

  return (
    <div className="flex flex-col pb-4 safe-top">
      <div className="h-[60px]" />
      <div className="flex flex-col gap-4 px-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="text-text-tertiary text-sm">
            {"\u2190"} Back
          </Link>
          <p className="section-label">Business Review</p>
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
              onSwipe={flowState === "classify" ? handleSwipe : undefined}
              rightLabel="High ROI"
              leftLabel="No ROI"
              upLabel="Unsure"
            />
          </AnimatePresence>
        </div>

        {/* Bucket buttons — always visible on classify step */}
        {flowState === "classify" && (
          <div className="flex gap-2">
            {(["high_roi", "no_roi", "unsure"] as const).map((bucket) => {
              const config = bucketConfig[bucket];
              const Icon = config.icon;
              return (
                <button
                  key={bucket}
                  onClick={() => handleBucket(bucket)}
                  className="flex-1 card p-3 flex flex-col items-center gap-1.5 hover:bg-bg-secondary transition-colors active:scale-95"
                >
                  <Icon className="size-5 text-text-secondary" />
                  <span className="text-[10px] font-bold text-text-primary">
                    {config.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Bottom Sheet: Rate → Clarify ── */}
      <AnimatePresence>
        {sheetOpen && current && (
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
                  <p className="section-label">
                    {flowState === "rate" ? "Rate this expense" : currentBucket === "high_roi" ? "What kind of ROI?" : "Why no ROI?"}
                  </p>
                  <button
                    onClick={handleDismissSheet}
                    className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-bg-secondary"
                  >
                    <X className="size-4 text-text-tertiary" />
                  </button>
                </div>

                {/* Step 2: Star rating */}
                {flowState === "rate" && (
                  <RatingGauge
                    value={roiRating}
                    onChange={handleRate}
                    min={1}
                    max={4}
                    messages={roiMessages}
                    lowLabel="Low ROI"
                    highLabel="High ROI"
                  />
                )}

                {/* Step 3: Clarify — ROI type */}
                {flowState === "clarify" && currentBucket === "high_roi" && (
                  <div className="flex flex-col gap-2">
                    {(["time", "money", "emotional", "overhead"] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => handleClarify(type)}
                        className="card p-3 text-left text-sm font-semibold text-text-primary capitalize hover:bg-bg-secondary transition-colors active:scale-[0.98]"
                      >
                        {type === "time" ? "Time Multiplier" : type === "money" ? "Money Multiplier" : type === "emotional" ? "Emotional ROI" : "Overhead"}
                      </button>
                    ))}
                  </div>
                )}

                {/* Step 3: Clarify — No ROI reason */}
                {flowState === "clarify" && currentBucket === "no_roi" && (
                  <div className="flex flex-col gap-2">
                    {noRoiReasons.map((reason) => (
                      <button
                        key={reason}
                        onClick={() => handleClarify(undefined, reason)}
                        className="card p-3 text-left text-sm font-semibold text-text-primary hover:bg-bg-secondary transition-colors active:scale-[0.98]"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
