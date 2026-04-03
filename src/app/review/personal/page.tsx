"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { X, Sparkles, Star, AlertTriangle, Undo2 } from "lucide-react";
import { useTransactions, useTransactionDispatch, selectUnreviewedByType } from "@/stores/transactions";
import type { Transaction } from "@/data/transactions";
import { ExpenseCard } from "@/components/review/ExpenseCard";
import { ProgressBar } from "@/components/review/ProgressBar";
import { RatingGauge } from "@/components/review/RatingGauge";

const meaningMessages: Record<number, string> = {
  1: "Didn\u2019t bring me joy",
  2: "Worth it in the moment",
  3: "Genuinely meaningful",
  4: "Peak joy",
};

type Bucket = "essential" | "meaningful" | "mismatch";
type Direction = "left" | "right" | "up" | null;
type FlowState = "review" | "meaningful-rating" | "pivot" | "done";

const bucketConfig: Record<Bucket, { label: string; icon: typeof Sparkles }> = {
  essential: { label: "Essential", icon: Sparkles },
  meaningful: { label: "Meaningful", icon: Star },
  mismatch: { label: "Mismatch", icon: AlertTriangle },
};

const meaningCategories = [
  "Vitality & Health",
  "Growth & Learning",
  "Connection",
  "Joy & Play",
];

export default function PersonalReviewPage() {
  const state = useTransactions();
  const dispatch = useTransactionDispatch();
  const allTransactions = selectUnreviewedByType(state, "personal");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>(null);
  const [flowState, setFlowState] = useState<FlowState>("review");
  const [rating, setRating] = useState(2);
  const [reviewedLocal, setReviewedLocal] = useState<Array<{ txn: Transaction; bucket: Bucket }>>([]);

  const [txnSnapshot] = useState(() => [...allTransactions]);
  const current = txnSnapshot[currentIndex] as Transaction | undefined;
  const total = txnSnapshot.length;

  function handleBucket(bucket: Bucket) {
    if (bucket === "meaningful") {
      setDirection("right");
      setTimeout(() => setFlowState("meaningful-rating"), 300);
    } else if (bucket === "mismatch") {
      setDirection("left");
      setTimeout(() => setFlowState("pivot"), 300);
    } else {
      setDirection("up");
      setTimeout(() => advanceToNext(bucket), 300);
    }
  }

  function advanceToNext(bucket: Bucket, meaningRating?: number, meaningCategory?: string) {
    if (current) {
      setReviewedLocal((prev) => [...prev, { txn: current, bucket }]);
      dispatch({
        type: "REVIEW_TRANSACTION",
        id: current.id,
        bucket,
        meaningRating,
        meaningCategory,
      });
    }
    setDirection(null);
    setFlowState("review");
    setRating(2);
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
    setFlowState("review");
    setDirection(null);
  }

  function handleSwipe(swipeDirection: "left" | "right" | "up") {
    if (swipeDirection === "right") {
      handleBucket("meaningful");
    } else if (swipeDirection === "left") {
      handleBucket("mismatch");
    } else {
      handleBucket("essential");
    }
  }

  function handleDismissSheet() {
    setFlowState("review");
    setDirection(null);
    setRating(2);
  }

  if (total === 0 || flowState === "done") {
    const essentialCount = reviewedLocal.filter((r) => r.bucket === "essential").length;
    const meaningfulCount = reviewedLocal.filter((r) => r.bucket === "meaningful").length;
    const mismatchCount = reviewedLocal.filter((r) => r.bucket === "mismatch").length;

    return (
      <div className="flex flex-col pb-4 safe-top">
        <div className="h-[60px]" />
        <div className="flex flex-col gap-6 px-4 items-center text-center pt-12">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-bg-secondary">
            <Star className="size-8 text-text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Review Complete</h1>
          <p className="text-sm text-text-tertiary">
            {total > 0
              ? `You reviewed ${total} personal transactions`
              : "All personal transactions are reviewed!"}
          </p>
          {total > 0 && (
            <div className="flex gap-4 mt-4">
              <div className="card p-3 flex flex-col items-center gap-1">
                <Sparkles className="size-5 text-text-secondary" />
                <span className="text-lg font-bold text-text-primary">{essentialCount}</span>
                <span className="text-[9px] text-text-tertiary">Essential</span>
              </div>
              <div className="card p-3 flex flex-col items-center gap-1">
                <Star className="size-5 text-text-secondary" />
                <span className="text-lg font-bold text-text-primary">{meaningfulCount}</span>
                <span className="text-[9px] text-text-tertiary">Meaningful</span>
              </div>
              <div className="card p-3 flex flex-col items-center gap-1">
                <AlertTriangle className="size-5 text-text-secondary" />
                <span className="text-lg font-bold text-text-primary">{mismatchCount}</span>
                <span className="text-[9px] text-text-tertiary">Mismatch</span>
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
        <div className="flex items-center justify-between">
          <Link href="/" className="text-text-tertiary text-sm">
            {"\u2190"} Back
          </Link>
          <p className="section-label">Personal Review</p>
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

        <div className="relative min-h-[320px]">
          <AnimatePresence mode="wait">
            <ExpenseCard
              key={current.id}
              transaction={current}
              direction={direction}
              onSwipe={handleSwipe}
              rightLabel="Meaningful"
              leftLabel="Mismatch"
              upLabel="Essential"
            />
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            {(["essential", "meaningful", "mismatch"] as const).map((bucket) => {
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
        </div>
      </div>

      {/* ── Bottom Sheet: Meaningful Rating ── */}
      <AnimatePresence>
        {flowState === "meaningful-rating" && current && (
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
                  <p className="section-label">Measure the magic</p>
                  <button
                    onClick={handleDismissSheet}
                    className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-bg-secondary"
                  >
                    <X className="size-4 text-text-tertiary" />
                  </button>
                </div>

                <h2 className="text-lg font-bold tracking-tight text-text-primary text-center mb-4">
                  How meaningful was this?
                </h2>

                <div className="mb-5">
                  <RatingGauge
                    value={rating}
                    onChange={setRating}
                    min={1}
                    max={4}
                    messages={meaningMessages}
                    lowLabel="Meh"
                    highLabel="Amazing"
                  />
                </div>

                <p className="section-label text-center mb-2">Where did this land?</p>
                <div className="flex flex-col gap-2">
                  {meaningCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => advanceToNext("meaningful", rating, cat)}
                      className="card p-3 text-left text-sm font-semibold text-text-primary hover:bg-bg-secondary transition-colors active:scale-[0.98]"
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Bottom Sheet: Mismatch Pivot ── */}
      <AnimatePresence>
        {flowState === "pivot" && current && (
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

                <div className="flex items-center justify-end mb-2">
                  <button
                    onClick={handleDismissSheet}
                    className="flex size-8 items-center justify-center rounded-lg transition-colors hover:bg-bg-secondary"
                  >
                    <X className="size-4 text-text-tertiary" />
                  </button>
                </div>

                <div className="flex flex-col gap-4 pt-2 pb-4">
                  <h2 className="text-lg font-bold tracking-tight text-text-primary text-center">
                    What happened here?
                  </h2>
                  <p className="text-sm text-text-tertiary text-center max-w-[280px] mx-auto">
                    Not every spend hits the mark. Understanding why helps you pivot.
                  </p>
                  <div className="flex flex-col gap-2">
                    {[
                      "Impulse purchase",
                      "Identity spending",
                      "Boredom buy",
                      "Forgot to cancel",
                      "Quality didn\u2019t match price",
                    ].map((reason) => (
                      <button
                        key={reason}
                        onClick={() => advanceToNext("mismatch")}
                        className="card p-3 text-left text-sm font-semibold text-text-primary hover:bg-bg-secondary transition-colors active:scale-[0.98]"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
