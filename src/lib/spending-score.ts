/**
 * Spending Score — A credit-score-like system for Sailor.
 *
 * Three weighted pillars:
 *   1. Spend-to-Income Ratio  (40%)
 *   2. Qualitative Reviews    (20%)
 *   3. Balance-to-Spend Ratio (40%)
 *
 * Pure functions — no React, no store deps. All inputs passed as arguments.
 */

import type { Account, Transaction } from "@/data/transactions";

// ─── Types ─────────────────────────────────────────────────────

export type ScoreBand =
  | "thriving"
  | "building"
  | "awakening"
  | "stretching"
  | "surviving";

export interface PillarResult {
  readonly score: number; // 0-100
  readonly rawValue: number; // the ratio, weighted avg, or runway months
  readonly label: string; // human-readable explanation
}

export interface CompletenessResult {
  readonly hasBusinessAccount: boolean;
  readonly hasPersonalAccount: boolean;
  readonly hasIncome: boolean;
  readonly reviewPercentage: number; // 0-1
  readonly meetsMinimum: boolean;
}

export interface ScoredTransaction {
  readonly txn: Transaction;
  readonly qualityScore: number | null; // 0-100, null = unrated
  readonly dollarWeight: number; // abs(amount)
}

export interface PillarDetail {
  readonly totalIncome: number;
  readonly totalSpend: number;
  readonly liquidAssets: number;
  readonly runwayMonths: number;
  readonly reviewCoverage: number;
  readonly scoredTransactions: readonly ScoredTransaction[];
  readonly liquidAccounts: readonly Account[];
}

export interface SpendingScoreResult {
  readonly total: number; // 0-100 composite
  readonly band: ScoreBand;
  readonly bandLabel: string;
  readonly bandMessage: string;
  readonly pillars: {
    readonly spendToIncome: PillarResult;
    readonly qualitative: PillarResult;
    readonly balanceRatio: PillarResult;
  };
  readonly completeness: CompletenessResult;
  readonly detail: PillarDetail;
}

export interface SpendingScoreInput {
  readonly transactions: readonly Transaction[];
  readonly accounts: readonly Account[];
  readonly monthKey: string; // "2026-02"
}

// ─── Constants ─────────────────────────────────────────────────

const BAND_CONFIG: readonly {
  readonly min: number;
  readonly band: ScoreBand;
  readonly label: string;
  readonly message: string;
}[] = [
  {
    min: 85,
    band: "thriving",
    label: "Thriving",
    message: "Your money is working for you.",
  },
  {
    min: 70,
    band: "building",
    label: "Building",
    message: "Strong foundation. Small tweaks, big impact.",
  },
  {
    min: 50,
    band: "awakening",
    label: "Awakening",
    message: "You're paying attention. That's the first step.",
  },
  {
    min: 25,
    band: "stretching",
    label: "Stretching",
    message: "Your spending is outpacing your plan. Let's look together.",
  },
  {
    min: 0,
    band: "surviving",
    label: "Surviving",
    message: "No judgment. Let's find your starting line.",
  },
];

/** Categories excluded from "spend" in Pillar 1. */
const EXCLUDED_SPEND_CATEGORIES = new Set([
  "Estimated Taxes",
  "Debt Payment",
  "Owners Distribution",
]);

const LIQUID_ACCOUNT_CATEGORIES = new Set(["checking", "savings", "hysa"]);

// ─── Helpers ───────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getBand(score: number) {
  const rounded = Math.round(score);
  for (const config of BAND_CONFIG) {
    if (rounded >= config.min) return config;
  }
  return BAND_CONFIG[BAND_CONFIG.length - 1];
}

function formatSpendRatioLabel(ratio: number, totalSpend: number, totalIncome: number): string {
  if (totalIncome === 0) return "No income recorded this month.";

  const fmtSpend = `$${Math.round(totalSpend).toLocaleString()}`;
  const fmtIncome = `$${Math.round(totalIncome).toLocaleString()}`;

  if (ratio <= 0.5) {
    return `Spending ${fmtSpend} of ${fmtIncome} earned — less than half.`;
  }
  if (ratio <= 1.0) {
    const pct = Math.round(ratio * 100);
    return `Spending ${fmtSpend} of ${fmtIncome} earned (${pct}%).`;
  }
  // Over-spending: ratio > 1.0
  const overBy = Math.round(totalSpend - totalIncome);
  return `Spending ${fmtSpend} against ${fmtIncome} earned — $${overBy.toLocaleString()} over.`;
}

// ─── Pillar 1: Spend-to-Income Ratio ──────────────────────────

export function calcSpendToIncomeScore(spendRatio: number): number {
  if (!Number.isFinite(spendRatio) || spendRatio < 0) return 0;
  if (spendRatio <= 0.5) return 100;
  if (spendRatio <= 0.7) return lerp(100, 85, (spendRatio - 0.5) / 0.2);
  if (spendRatio <= 0.85) return lerp(85, 65, (spendRatio - 0.7) / 0.15);
  if (spendRatio <= 1.0) return lerp(65, 35, (spendRatio - 0.85) / 0.15);
  if (spendRatio <= 1.2) return lerp(35, 10, (spendRatio - 1.0) / 0.2);
  return Math.max(0, lerp(10, 0, (spendRatio - 1.2) / 0.3));
}

// ─── Pillar 2: Qualitative Transaction Reviews ────────────────

/**
 * Returns a quality score for a reviewed transaction, or null if the
 * transaction is bucketed but still needs a rating (e.g. "unsure" or
 * "meaningful" without a rating). Null means "exclude from average."
 */
export function txnQualityScore(txn: Transaction): number | null {
  // Business buckets
  if (txn.businessBucket === "high_roi") {
    return txn.roiRating != null ? txn.roiRating * 25 : null;
  }
  if (txn.businessBucket === "unsure") {
    return txn.roiRating != null ? txn.roiRating * 12.5 : null;
  }
  if (txn.businessBucket === "no_roi") {
    return 0;
  }
  // Personal buckets
  if (txn.personalBucket === "essential") {
    return 70;
  }
  if (txn.personalBucket === "meaningful") {
    return txn.meaningRating != null ? txn.meaningRating * 25 : null;
  }
  if (txn.personalBucket === "mismatch") {
    return 10;
  }
  // Reviewed but no bucket assigned — treat as neutral
  return 50;
}

export function calcQualitativeScore(
  reviewedExpenses: readonly Transaction[],
  reviewCoverage: number
): number {
  if (reviewedExpenses.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const txn of reviewedExpenses) {
    const score = txnQualityScore(txn);
    if (score == null) continue; // unrated — exclude from average
    const weight = Math.abs(txn.amount);
    weightedSum += weight * score;
    totalWeight += weight;
  }

  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Penalty for low review coverage (< 80%)
  const penalty = reviewCoverage < 0.8 ? reviewCoverage / 0.8 : 1.0;

  return clamp(rawScore * penalty, 0, 100);
}

// ─── Pillar 3: Balance-to-Spend Ratio ─────────────────────────

export function calcBalanceRatioScore(runwayMonths: number): number {
  if (!Number.isFinite(runwayMonths) || runwayMonths < 0) return 0;
  if (runwayMonths >= 6) return 100;
  if (runwayMonths >= 4) return lerp(80, 100, (runwayMonths - 4) / 2);
  if (runwayMonths >= 3) return lerp(65, 80, (runwayMonths - 3) / 1);
  if (runwayMonths >= 2) return lerp(45, 65, (runwayMonths - 2) / 1);
  if (runwayMonths >= 1) return lerp(20, 45, (runwayMonths - 1) / 1);
  if (runwayMonths >= 0.5) return lerp(5, 20, (runwayMonths - 0.5) / 0.5);
  return Math.max(0, runwayMonths * 10);
}

// ─── Completeness Check ───────────────────────────────────────

export function calcCompleteness(
  accounts: readonly Account[],
  transactions: readonly Transaction[],
  monthKey: string
): CompletenessResult {
  const hasBusinessAccount = accounts.some(
    (a) =>
      a.type === "business" &&
      LIQUID_ACCOUNT_CATEGORIES.has(a.category)
  );
  const hasPersonalAccount = accounts.some(
    (a) =>
      a.type === "personal" &&
      LIQUID_ACCOUNT_CATEGORIES.has(a.category)
  );

  const monthTxns = transactions.filter(
    (t) => t.date.startsWith(monthKey) && !t.isTransfer
  );
  const hasIncome = monthTxns.some((t) => t.amount < 0);

  const expenses = monthTxns.filter((t) => t.amount > 0);
  const reviewedExpenses = expenses.filter((t) => t.reviewed);
  const reviewPercentage =
    expenses.length > 0 ? reviewedExpenses.length / expenses.length : 0;

  return {
    hasBusinessAccount,
    hasPersonalAccount,
    hasIncome,
    reviewPercentage,
    meetsMinimum:
      hasBusinessAccount &&
      hasPersonalAccount &&
      hasIncome &&
      reviewPercentage >= 0.5,
  };
}

// ─── Orchestrator ─────────────────────────────────────────────

export function calcSpendingScore(
  input: SpendingScoreInput
): SpendingScoreResult {
  const { transactions, accounts, monthKey } = input;

  const completeness = calcCompleteness(accounts, transactions, monthKey);

  // Filter to this month, exclude transfers
  const monthTxns = transactions.filter(
    (t) => t.date.startsWith(monthKey) && !t.isTransfer
  );

  // --- Pillar 1: Spend-to-Income ---
  const totalIncome = Math.abs(
    monthTxns
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const totalSpend = monthTxns
    .filter(
      (t) => t.amount > 0 && !EXCLUDED_SPEND_CATEGORIES.has(t.category)
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const spendRatio = totalIncome > 0 ? totalSpend / totalIncome : Infinity;
  const spendToIncomeScore = calcSpendToIncomeScore(spendRatio);

  const spendToIncomePillar: PillarResult = {
    score: spendToIncomeScore,
    rawValue: spendRatio,
    label: formatSpendRatioLabel(spendRatio, totalSpend, totalIncome),
  };

  // --- Pillar 2: Qualitative Reviews ---
  const allExpenses = monthTxns.filter((t) => t.amount > 0);
  const reviewedExpenses = allExpenses.filter((t) => t.reviewed);
  const reviewCoverage =
    allExpenses.length > 0 ? reviewedExpenses.length / allExpenses.length : 0;

  const qualitativeScore = calcQualitativeScore(
    reviewedExpenses,
    reviewCoverage
  );

  // Calculate weighted average for the label (before penalty)
  let rawWeightedAvg = 0;
  if (reviewedExpenses.length > 0) {
    let wSum = 0;
    let wTotal = 0;
    for (const txn of reviewedExpenses) {
      const score = txnQualityScore(txn);
      if (score == null) continue;
      const w = Math.abs(txn.amount);
      wSum += w * score;
      wTotal += w;
    }
    rawWeightedAvg = wTotal > 0 ? wSum / wTotal / 10 : 0;
  }

  const qualitativePillar: PillarResult = {
    score: qualitativeScore,
    rawValue: rawWeightedAvg,
    label:
      reviewedExpenses.length > 0
        ? `Your reviewed spending averaged ${rawWeightedAvg.toFixed(1)}/10 for alignment.`
        : "Review your transactions to build this pillar.",
  };

  // --- Pillar 3: Balance Ratio ---
  const liquidAssets = accounts
    .filter(
      (a) => LIQUID_ACCOUNT_CATEGORIES.has(a.category) && a.balance > 0
    )
    .reduce((sum, a) => sum + a.balance, 0);

  const runwayMonths = totalSpend > 0 ? liquidAssets / totalSpend : Infinity;
  const balanceRatioScore = calcBalanceRatioScore(
    Number.isFinite(runwayMonths) ? runwayMonths : 100
  );

  const balanceRatioPillar: PillarResult = {
    score: balanceRatioScore,
    rawValue: Number.isFinite(runwayMonths) ? runwayMonths : 0,
    label:
      totalSpend > 0
        ? `You have ${runwayMonths.toFixed(1)} months of spending in your accounts.`
        : "No spending recorded this month.",
  };

  // --- Scored transactions for detail view ---
  const scoredTransactions: ScoredTransaction[] = allExpenses
    .filter((t) => t.reviewed)
    .map((txn) => ({
      txn,
      qualityScore: txnQualityScore(txn),
      dollarWeight: Math.abs(txn.amount),
    }));

  const liquidAccounts = accounts.filter(
    (a) => LIQUID_ACCOUNT_CATEGORIES.has(a.category) && a.balance > 0
  );

  // --- Composite ---
  const total = Math.round(
    spendToIncomeScore * 0.4 +
      qualitativeScore * 0.2 +
      balanceRatioScore * 0.4
  );

  const bandConfig = getBand(total);

  return {
    total: clamp(total, 0, 100),
    band: bandConfig.band,
    bandLabel: bandConfig.label,
    bandMessage: bandConfig.message,
    pillars: {
      spendToIncome: spendToIncomePillar,
      qualitative: qualitativePillar,
      balanceRatio: balanceRatioPillar,
    },
    completeness,
    detail: {
      totalIncome,
      totalSpend,
      liquidAssets,
      runwayMonths: Number.isFinite(runwayMonths) ? runwayMonths : 0,
      reviewCoverage,
      scoredTransactions,
      liquidAccounts,
    },
  };
}
