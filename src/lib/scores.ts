import type { Transaction } from "@/data/transactions";

// ─── Score Calculation Functions ─────────────────────────────
// Pure functions — no store dependencies.

/**
 * Spend vs Income ratio (40% weight in overall score).
 * If income > spend, ratio is good. Score = min(income/spend, 2) * 50 capped at 100.
 * If spend is 0, perfect score.
 */
export function calcSpendIncomeScore(income: number, expenses: number): number {
  if (expenses <= 0) return 100;
  if (income <= 0) return 0;
  const ratio = income / expenses;
  return Math.min(Math.round(ratio * 50), 100);
}

/**
 * Review quality (20% weight in overall score).
 * Average of all review ratings normalized to 0-100.
 * For business: uses roiRating (1-4 scale).
 * For personal: uses meaningRating (1-4 scale).
 * Returns 50 if no reviewed transactions (neutral).
 */
export function calcReviewQualityScore(
  transactions: readonly Transaction[],
  type: "business" | "personal"
): number {
  const ratings = transactions
    .filter((t) => t.reviewed && t.amount > 0 && !t.isTransfer)
    .map((t) => (type === "business" ? t.roiRating : t.meaningRating))
    .filter((r): r is number => r != null && r > 0);

  if (ratings.length === 0) return 50;
  const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  // Normalize 1-4 scale to 0-100
  return Math.round(((avg - 1) / 3) * 100);
}

/**
 * Runway score (40% weight in overall score).
 * cashOnHand / monthlySpend. 6+ months = 100, 0 months = 0.
 * Linear scale between 0 and 6 months.
 */
export function calcRunwayScore(
  cashOnHand: number,
  monthlySpend: number
): number {
  if (monthlySpend <= 0) return 100;
  const months = Math.max(0, cashOnHand) / monthlySpend;
  return Math.min(Math.round((months / 6) * 100), 100);
}

/**
 * Overall Spending Score (0-100).
 * 40% spend-vs-income + 20% review quality + 40% runway.
 */
export function calcOverallScore(
  income: number,
  expenses: number,
  transactions: readonly Transaction[],
  cashOnHand: number,
  monthlySpend: number
): number {
  const spendIncome = calcSpendIncomeScore(income, expenses);
  // Combined review quality: average of business and personal
  const bizQuality = calcReviewQualityScore(transactions, "business");
  const personalQuality = calcReviewQualityScore(transactions, "personal");
  const reviewQuality = Math.round((bizQuality + personalQuality) / 2);
  const runway = calcRunwayScore(cashOnHand, monthlySpend);

  return Math.round(spendIncome * 0.4 + reviewQuality * 0.2 + runway * 0.4);
}

/**
 * Joy Spend Score for personal tab.
 * Based on personal review ratings (meaningRating).
 * Returns percentage of spend that went to meaningful categories.
 */
export function calcJoySpendScore(
  transactions: readonly Transaction[]
): { score: number; joyPercentage: number } {
  const reviewed = transactions.filter(
    (t) => t.reviewed && t.amount > 0 && !t.isTransfer
  );
  if (reviewed.length === 0) return { score: 50, joyPercentage: 0 };

  const totalSpend = reviewed.reduce((sum, t) => sum + t.amount, 0);
  const joyfulSpend = reviewed
    .filter(
      (t) =>
        t.personalBucket === "meaningful" || t.personalBucket === "essential"
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const joyPercentage = totalSpend > 0 ? Math.round((joyfulSpend / totalSpend) * 100) : 0;
  const score = calcReviewQualityScore(transactions, "personal");
  return { score: Math.max(score, joyPercentage), joyPercentage };
}

/**
 * ROI Optimization Score for business tab.
 * Based on business review ratings (roiRating).
 * Returns percentage of spend that went to high-ROI.
 */
export function calcRoiOptimizationScore(
  transactions: readonly Transaction[]
): { score: number; roiPercentage: number } {
  const reviewed = transactions.filter(
    (t) => t.reviewed && t.amount > 0 && !t.isTransfer
  );
  if (reviewed.length === 0) return { score: 50, roiPercentage: 0 };

  const totalSpend = reviewed.reduce((sum, t) => sum + t.amount, 0);
  const highRoiSpend = reviewed
    .filter((t) => t.businessBucket === "high_roi")
    .reduce((sum, t) => sum + t.amount, 0);

  const roiPercentage = totalSpend > 0 ? Math.round((highRoiSpend / totalSpend) * 100) : 0;
  const score = calcReviewQualityScore(transactions, "business");
  return { score: Math.max(score, roiPercentage), roiPercentage };
}

/**
 * Group transactions by meaningCategory for personal donut chart.
 */
export function groupByMeaningCategory(
  transactions: readonly Transaction[]
): readonly { readonly label: string; readonly value: number }[] {
  const reviewed = transactions.filter(
    (t) => t.reviewed && t.amount > 0 && !t.isTransfer && t.meaningCategory
  );

  const grouped = reviewed.reduce<Record<string, number>>((acc, t) => {
    const cat = t.meaningCategory ?? "Uncategorized";
    return { ...acc, [cat]: (acc[cat] ?? 0) + t.amount };
  }, {});

  return Object.entries(grouped)
    .map(([label, value]) => ({ label, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Group transactions by roiType for business donut chart.
 */
export function groupByRoiType(
  transactions: readonly Transaction[]
): readonly { readonly label: string; readonly value: number }[] {
  const reviewed = transactions.filter(
    (t) => t.reviewed && t.amount > 0 && !t.isTransfer && t.roiType
  );

  const typeLabels: Record<string, string> = {
    time: "Time Savings",
    money: "Revenue Growth",
    emotional: "Well-being",
    overhead: "Operations",
  };

  const grouped = reviewed.reduce<Record<string, number>>((acc, t) => {
    const label = typeLabels[t.roiType ?? ""] ?? "Other";
    return { ...acc, [label]: (acc[label] ?? 0) + t.amount };
  }, {});

  return Object.entries(grouped)
    .map(([label, value]) => ({ label, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);
}
