/**
 * Sample personas for validating the Spending Score algorithm.
 *
 * Personas A (Jordan Rivera) lives in the seed data (transactions.ts).
 * Personas B-D are synthetic edge cases.
 * Personas E-G are derived from real Gina Knox client P&Ls (anonymized).
 */

import type { Account, Transaction } from "@/data/transactions";

export interface ScoreSample {
  readonly name: string;
  readonly description: string;
  readonly source: "synthetic" | "real_pnl";
  readonly expectedBand: string;
  readonly expectedScore: number; // approximate
  readonly accounts: readonly Account[];
  readonly transactions: readonly Transaction[];
  readonly monthKey: string;
}

// ─── Helpers ───────────────────────────────────────────────────

let sampleIdCounter = 0;
function sampleId(): string {
  return `sample_txn_${++sampleIdCounter}`;
}

function income(
  amount: number,
  accountId: string,
  category: string,
  date: string,
  merchant?: string
): Transaction {
  return {
    id: sampleId(),
    date,
    merchantName: merchant ?? "Stripe",
    merchantLogo: "💳",
    rawDescription: `${(merchant ?? "STRIPE").toUpperCase()} - ${category}`,
    amount: -amount,
    accountId,
    category,
    isRecurring: false,
    reviewed: true,
    isTransfer: false,
  };
}

function expense(
  amount: number,
  accountId: string,
  category: string,
  date: string,
  review: {
    reviewed: boolean;
    businessBucket?: "high_roi" | "no_roi" | "unsure";
    roiRating?: number;
    roiType?: "time" | "money" | "emotional" | "overhead";
    personalBucket?: "essential" | "meaningful" | "mismatch";
    meaningRating?: number;
  },
  opts?: { merchant?: string; isRecurring?: boolean }
): Transaction {
  return {
    id: sampleId(),
    date,
    merchantName: opts?.merchant ?? category,
    merchantLogo: "📦",
    rawDescription: (opts?.merchant ?? category).toUpperCase(),
    amount,
    accountId,
    category,
    isRecurring: opts?.isRecurring ?? false,
    reviewed: review.reviewed,
    reviewedAt: review.reviewed ? date : undefined,
    businessBucket: review.businessBucket ?? null,
    roiRating: review.roiRating,
    roiType: review.roiType ?? null,
    personalBucket: review.personalBucket ?? null,
    meaningRating: review.meaningRating,
    isTransfer: false,
  };
}

// ═══════════════════════════════════════════════════════════════
// SYNTHETIC PERSONAS (edge cases for algorithm validation)
// ═══════════════════════════════════════════════════════════════

// ─── B: "The Overspender" ──────────────────────────────────────
// Spend > income, tiny cushion, lots of no_roi + mismatch

const overspenderAccounts: readonly Account[] = [
  {
    id: "os_biz_checking",
    name: "Mercury Checking",
    institution: "Mercury",
    type: "business",
    category: "checking",
    lastFour: "1111",
    balance: 1_800,
  },
  {
    id: "os_personal_checking",
    name: "Chase Checking",
    institution: "Chase",
    type: "personal",
    category: "checking",
    lastFour: "2222",
    balance: 1_400,
  },
];

const overspenderTransactions: readonly Transaction[] = [
  income(5_000, "os_biz_checking", "Coaching Revenue", "2026-02-05"),
  income(3_000, "os_biz_checking", "Group Program Revenue", "2026-02-15"),
  expense(2_500, "os_biz_checking", "Marketing", "2026-02-03", {
    reviewed: true, businessBucket: "no_roi", roiRating: 1,
  }),
  expense(800, "os_biz_checking", "Software", "2026-02-05", {
    reviewed: true, businessBucket: "unsure", roiRating: 2,
  }),
  expense(1_200, "os_biz_checking", "Networking & Events", "2026-02-10", {
    reviewed: true, businessBucket: "no_roi", roiRating: 1,
  }),
  expense(600, "os_biz_checking", "Office & Space", "2026-02-12", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3,
  }),
  expense(1_100, "os_biz_checking", "Contract Labor", "2026-02-18", {
    reviewed: true, businessBucket: "unsure", roiRating: 1,
  }),
  expense(900, "os_personal_checking", "Shopping", "2026-02-04", {
    reviewed: true, personalBucket: "mismatch", meaningRating: 1,
  }),
  expense(600, "os_personal_checking", "Eating Out", "2026-02-08", {
    reviewed: true, personalBucket: "mismatch", meaningRating: 1,
  }),
  expense(400, "os_personal_checking", "Subscriptions", "2026-02-10", {
    reviewed: true, personalBucket: "essential",
  }),
  expense(800, "os_personal_checking", "Groceries", "2026-02-15", {
    reviewed: true, personalBucket: "essential",
  }),
  expense(600, "os_personal_checking", "Travel & Vacation", "2026-02-20", {
    reviewed: true, personalBucket: "meaningful", meaningRating: 2,
  }),
];

// ─── C: "Under-Reviewed" ──────────────────────────────────────
// Great fundamentals, but only ~55% reviewed

const underReviewedAccounts: readonly Account[] = [
  {
    id: "ur_biz_checking",
    name: "Mercury Checking",
    institution: "Mercury",
    type: "business",
    category: "checking",
    lastFour: "5555",
    balance: 22_000,
  },
  {
    id: "ur_biz_savings",
    name: "Mercury Savings",
    institution: "Mercury",
    type: "business",
    category: "savings",
    lastFour: "5556",
    balance: 8_000,
  },
  {
    id: "ur_personal_checking",
    name: "Chase Checking",
    institution: "Chase",
    type: "personal",
    category: "checking",
    lastFour: "6666",
    balance: 5_000,
  },
];

const underReviewedTransactions: readonly Transaction[] = [
  income(8_000, "ur_biz_checking", "Coaching Revenue", "2026-02-05"),
  income(4_000, "ur_biz_checking", "Group Program Revenue", "2026-02-18"),
  // Reviewed (good quality)
  expense(149, "ur_biz_checking", "Software", "2026-02-03", {
    reviewed: true, businessBucket: "high_roi", roiRating: 4,
  }),
  expense(1_200, "ur_biz_checking", "Contract Labor", "2026-02-05", {
    reviewed: true, businessBucket: "high_roi", roiRating: 4,
  }),
  expense(800, "ur_biz_checking", "Marketing", "2026-02-08", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3,
  }),
  expense(600, "ur_personal_checking", "Groceries", "2026-02-04", {
    reviewed: true, personalBucket: "essential",
  }),
  expense(200, "ur_personal_checking", "Health & Fitness", "2026-02-09", {
    reviewed: true, personalBucket: "meaningful", meaningRating: 4,
  }),
  expense(350, "ur_personal_checking", "Auto & Gas", "2026-02-12", {
    reviewed: true, personalBucket: "essential",
  }),
  // Unreviewed
  expense(500, "ur_biz_checking", "Meals & Entertainment", "2026-02-10", { reviewed: false }),
  expense(1_800, "ur_biz_checking", "Coaching & Training", "2026-02-14", { reviewed: false }),
  expense(400, "ur_personal_checking", "Shopping", "2026-02-16", { reviewed: false }),
  expense(300, "ur_personal_checking", "Eating Out", "2026-02-20", { reviewed: false }),
  expense(700, "ur_biz_checking", "Networking & Events", "2026-02-22", { reviewed: false }),
];

// ─── D: "The Saver Who Doesn't Invest" ────────────────────────
// Huge cushion, lean spend, but qualitative pillar is weak

const saverAccounts: readonly Account[] = [
  {
    id: "sv_biz_checking",
    name: "Mercury Checking",
    institution: "Mercury",
    type: "business",
    category: "checking",
    lastFour: "7777",
    balance: 35_000,
  },
  {
    id: "sv_biz_savings",
    name: "Mercury Savings",
    institution: "Mercury",
    type: "business",
    category: "savings",
    lastFour: "7778",
    balance: 15_000,
  },
  {
    id: "sv_personal_checking",
    name: "Chase Checking",
    institution: "Chase",
    type: "personal",
    category: "checking",
    lastFour: "8888",
    balance: 8_000,
  },
  {
    id: "sv_personal_hysa",
    name: "Ally HYSA",
    institution: "Ally",
    type: "personal",
    category: "hysa",
    lastFour: "8889",
    balance: 4_000,
  },
];

const saverTransactions: readonly Transaction[] = [
  income(10_000, "sv_biz_checking", "Coaching Revenue", "2026-02-05"),
  income(5_000, "sv_biz_checking", "Course Revenue", "2026-02-18"),
  expense(149, "sv_biz_checking", "Software", "2026-02-03", {
    reviewed: true, businessBucket: "unsure", roiRating: 2, roiType: "overhead",
  }),
  expense(59, "sv_biz_checking", "Software", "2026-02-03", {
    reviewed: true, businessBucket: "unsure", roiRating: 1, roiType: "overhead",
  }),
  expense(800, "sv_biz_checking", "Contract Labor", "2026-02-10", {
    reviewed: true, businessBucket: "unsure", roiRating: 2, roiType: "time",
  }),
  expense(500, "sv_biz_checking", "Insurance", "2026-02-14", {
    reviewed: true, businessBucket: "high_roi", roiRating: 2, roiType: "overhead",
  }),
  expense(200, "sv_biz_checking", "Bookkeeping & Accounting", "2026-02-20", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3, roiType: "time",
  }),
  expense(400, "sv_biz_checking", "Stripe & Bank Fees", "2026-02-28", {
    reviewed: true, businessBucket: "high_roi", roiRating: 2, roiType: "overhead",
  }),
  expense(391, "sv_biz_checking", "Office & Space", "2026-02-15", {
    reviewed: true, businessBucket: "unsure", roiRating: 1, roiType: "overhead",
  }),
  expense(800, "sv_personal_checking", "Groceries", "2026-02-07", {
    reviewed: true, personalBucket: "essential",
  }),
  expense(400, "sv_personal_checking", "Auto & Gas", "2026-02-10", {
    reviewed: true, personalBucket: "essential",
  }),
  expense(300, "sv_personal_checking", "Subscriptions", "2026-02-12", {
    reviewed: true, personalBucket: "essential",
  }),
  expense(500, "sv_personal_checking", "Health", "2026-02-20", {
    reviewed: true, personalBucket: "essential",
  }),
];

// ═══════════════════════════════════════════════════════════════
// REAL P&L PERSONAS (anonymized from Gina's SBMS client data)
// ═══════════════════════════════════════════════════════════════

// ─── E: Real Estate Agent — Feb (zero-income month) ───────────
// Source: "Simple Real Estate Example 2025 Business P&L"
// Classic feast-or-famine realtor. Commission-based, lumpy income.
// Feb was a $0 income month with $5.5K in expenses + $1.7K non-deductible.
// Annual: $163K revenue, but 4 months with $0-$1.4K income.
// Has aircraft expenses (hobby?), credit card debt ($4.7K interest/yr).
// Buffer target: $14K. Avg monthly cash out: $16.5K.

const realEstateAccounts: readonly Account[] = [
  {
    id: "re_biz_checking",
    name: "Business Checking",
    institution: "Chase",
    type: "business",
    category: "checking",
    lastFour: "3301",
    balance: 3_200, // tight — covering expenses during dry month
  },
  {
    id: "re_personal_checking",
    name: "Personal Checking",
    institution: "Wells Fargo",
    type: "personal",
    category: "checking",
    lastFour: "3302",
    balance: 2_100,
  },
  {
    id: "re_personal_savings",
    name: "Personal Savings",
    institution: "Ally",
    type: "personal",
    category: "savings",
    lastFour: "3303",
    balance: 14_000, // buffer per P&L
  },
];

const realEstateTransactions: readonly Transaction[] = [
  // ZERO income in Feb — commission-based, nothing closed this month
  // (This is the critical test case: what does the score do with $0 income?)

  // Business expenses from actual Feb P&L line items
  expense(984.67, "re_biz_checking", "Marketing", "2025-02-03", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3, roiType: "money",
  }, { merchant: "Zillow / Panorama / Best Agents / Homebot" }),
  expense(1_397.36, "re_biz_checking", "Travel", "2025-02-05", {
    reviewed: true, businessBucket: "unsure", roiRating: 2, roiType: "emotional",
  }, { merchant: "Aviation — Pottstown / Sky Manor / VT Flying" }),
  expense(487.06, "re_biz_checking", "Software", "2025-02-08", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3, roiType: "time",
  }, { merchant: "Google / YouTube / Intuit QB / Experian" }),
  expense(567.50, "re_biz_checking", "Meals & Entertainment", "2025-02-10", {
    reviewed: true, businessBucket: "unsure", roiRating: 1, roiType: "emotional",
  }, { merchant: "Philadelphia 7 / misc" }),
  expense(217.98, "re_biz_checking", "Office & Space", "2025-02-12", {
    reviewed: true, businessBucket: "unsure", roiRating: 2, roiType: "overhead",
  }, { merchant: "Amazon Marketplace" }),
  expense(1_200.00, "re_biz_checking", "Insurance", "2025-02-14", {
    reviewed: true, businessBucket: "high_roi", roiRating: 2, roiType: "overhead",
  }, { merchant: "IBX Blue Cross" }),
  expense(79.00, "re_biz_checking", "Stripe & Bank Fees", "2025-02-15", {
    reviewed: true, businessBucket: "high_roi", roiRating: 1, roiType: "overhead",
  }, { merchant: "Bank fees + late fee" }),
  expense(53.49, "re_biz_checking", "Office & Space", "2025-02-18", {
    reviewed: true, businessBucket: "high_roi", roiRating: 2, roiType: "overhead",
  }, { merchant: "AT&T" }),
  expense(238.23, "re_biz_checking", "Stripe & Bank Fees", "2025-02-20", {
    reviewed: true, businessBucket: "no_roi", roiRating: 1,
  }, { merchant: "Credit card interest" }),
  expense(300.00, "re_biz_checking", "Auto & Gas", "2025-02-22", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3, roiType: "time",
  }, { merchant: "Car payment — client showings" }),

  // Non-deductible (still real spend that hits the score)
  expense(1_000.00, "re_personal_checking", "Shopping", "2025-02-25", {
    reviewed: true, personalBucket: "essential",
  }, { merchant: "Owner's distribution" }),
  expense(749.36, "re_personal_checking", "Shopping", "2025-02-26", {
    reviewed: false,
  }, { merchant: "Minimum debt payments" }),
];

// ─── F: German Productivity Coach — Feb ───────────────────────
// Source: "Heavy Customization 2025 Business P&L"
// Solo productivity coach in Germany. ~$33K/yr revenue.
// Feb: $1,191 income, $926 biz expenses, $1,470 owner's pay.
// Very lean operation — software-heavy, no employees.
// Working capital target: $4K. Buffer: $2K.
// VAT-aware (19%), but we model pre-tax for scoring.

const germanCoachAccounts: readonly Account[] = [
  {
    id: "gc_biz_checking",
    name: "N26 Business",
    institution: "N26",
    type: "business",
    category: "checking",
    lastFour: "4401",
    balance: 4_000, // working capital target from P&L
  },
  {
    id: "gc_personal_checking",
    name: "DKB Checking",
    institution: "DKB",
    type: "personal",
    category: "checking",
    lastFour: "4402",
    balance: 1_800,
  },
];

const germanCoachTransactions: readonly Transaction[] = [
  // Feb income: $1,190.89 from actual P&L (5 clients)
  income(150.00, "gc_biz_checking", "Coaching Revenue", "2025-02-05", "PJ — Career Coaching"),
  income(138.39, "gc_biz_checking", "Coaching Revenue", "2025-02-12", "Coach.me — Productivity"),
  income(150.00, "gc_biz_checking", "Coaching Revenue", "2025-02-15", "FR — Productivity Coaching"),
  income(202.50, "gc_biz_checking", "Coaching Revenue", "2025-02-16", "NanS — Counseling"),
  income(550.00, "gc_biz_checking", "Coaching Revenue", "2025-02-28", "SG — Productivity Coaching"),

  // Feb biz expenses: $926.08 from actual line items
  expense(10.62, "gc_biz_checking", "Software", "2025-02-03", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3, roiType: "time",
  }, { merchant: "Basecamp", isRecurring: true }),
  expense(149.90, "gc_biz_checking", "Software", "2025-02-09", {
    reviewed: true, businessBucket: "high_roi", roiRating: 4, roiType: "money",
  }, { merchant: "Zoom (yearly)" }),
  expense(1.99, "gc_biz_checking", "Software", "2025-02-10", {
    reviewed: true, businessBucket: "unsure", roiRating: 1, roiType: "overhead",
  }, { merchant: "Google One" }),
  expense(227.53, "gc_biz_checking", "Software", "2025-02-10", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3, roiType: "time",
  }, { merchant: "Zapier" }),
  expense(11.00, "gc_biz_checking", "Software", "2025-02-14", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3, roiType: "time",
  }, { merchant: "Hey Email", isRecurring: true }),
  expense(5.47, "gc_biz_checking", "Software", "2025-02-21", {
    reviewed: true, businessBucket: "unsure", roiRating: 2, roiType: "overhead",
  }, { merchant: "Microsoft" }),
  expense(91.78, "gc_biz_checking", "Software", "2025-02-23", {
    reviewed: true, businessBucket: "high_roi", roiRating: 4, roiType: "time",
  }, { merchant: "Readwise (yearly)" }),
  expense(19.14, "gc_biz_checking", "Software", "2025-02-25", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3, roiType: "time",
  }, { merchant: "ChatGPT", isRecurring: true }),
  expense(28.96, "gc_biz_checking", "Stripe & Bank Fees", "2025-02-28", {
    reviewed: true, businessBucket: "high_roi", roiRating: 1, roiType: "overhead",
  }, { merchant: "Stripe fees" }),
  expense(9.68, "gc_biz_checking", "Office & Space", "2025-02-09", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3, roiType: "emotional",
  }, { merchant: "Focusmate", isRecurring: true }),
  expense(46.90, "gc_biz_checking", "Networking & Events", "2025-02-23", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3, roiType: "emotional",
  }, { merchant: "Ness Labs Community (yearly)" }),
  expense(9.99, "gc_biz_checking", "Office & Space", "2025-02-17", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3, roiType: "overhead",
  }, { merchant: "Klarmobil (phone)", isRecurring: true }),
  expense(313.12, "gc_biz_checking", "Stripe & Bank Fees", "2025-02-10", {
    reviewed: true, businessBucket: "high_roi", roiRating: 1, roiType: "overhead",
  }, { merchant: "VAT payment (Jan)" }),

  // Owner's distributions (non-deductible personal expenses)
  expense(700.00, "gc_personal_checking", "Shopping", "2025-02-01", {
    reviewed: true, personalBucket: "essential",
  }, { merchant: "Owner's pay" }),
  expense(270.00, "gc_personal_checking", "Shopping", "2025-02-05", {
    reviewed: true, personalBucket: "essential",
  }, { merchant: "Owner's pay" }),
  expense(500.00, "gc_personal_checking", "Shopping", "2025-02-11", {
    reviewed: true, personalBucket: "essential",
  }, { merchant: "Owner's pay" }),
  expense(51.25, "gc_personal_checking", "Shopping", "2025-02-11", {
    reviewed: true, personalBucket: "mismatch", meaningRating: 1,
  }, { merchant: "Personal purchase on biz card" }),
];

// ─── G: Real Estate Agent — Oct (big-commission month) ────────
// Same agent as Persona E, but October: $41,875 income month.
// Shows the feast side of feast-or-famine.
// $15.5K deductible + $7.9K non-deductible = $23.4K cash out.

const realEstateOctAccounts: readonly Account[] = [
  {
    id: "reo_biz_checking",
    name: "Business Checking",
    institution: "Chase",
    type: "business",
    category: "checking",
    lastFour: "3301",
    balance: 18_500, // flush after big commission month
  },
  {
    id: "reo_personal_checking",
    name: "Personal Checking",
    institution: "Wells Fargo",
    type: "personal",
    category: "checking",
    lastFour: "3302",
    balance: 4_200,
  },
  {
    id: "reo_personal_savings",
    name: "Personal Savings",
    institution: "Ally",
    type: "personal",
    category: "savings",
    lastFour: "3303",
    balance: 14_000,
  },
];

const realEstateOctTransactions: readonly Transaction[] = [
  // Oct income: $41,875 (2 big deals closed)
  income(36_625, "reo_biz_checking", "Coaching Revenue", "2025-10-08", "Seller-side commission"),
  income(5_250, "reo_biz_checking", "Coaching Revenue", "2025-10-22", "Buy-side commission"),

  // Deductible expenses: $15,534
  expense(1_396.35, "reo_biz_checking", "Marketing", "2025-10-03", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3, roiType: "money",
  }, { merchant: "Zillow / Panorama / Best Agents" }),
  expense(1_375.13, "reo_biz_checking", "Travel", "2025-10-05", {
    reviewed: true, businessBucket: "unsure", roiRating: 2, roiType: "emotional",
  }, { merchant: "Aviation expenses" }),
  expense(245.72, "reo_biz_checking", "Software", "2025-10-08", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3, roiType: "time",
  }, { merchant: "Google / Intuit / Experian" }),
  expense(489.59, "reo_biz_checking", "Meals & Entertainment", "2025-10-10", {
    reviewed: true, businessBucket: "unsure", roiRating: 2, roiType: "emotional",
  }, { merchant: "Client meals" }),
  expense(1_094.56, "reo_biz_checking", "Insurance", "2025-10-12", {
    reviewed: true, businessBucket: "high_roi", roiRating: 2, roiType: "overhead",
  }, { merchant: "IBX Blue Cross" }),
  expense(39.09, "reo_biz_checking", "Stripe & Bank Fees", "2025-10-15", {
    reviewed: true, businessBucket: "high_roi", roiRating: 1, roiType: "overhead",
  }),
  expense(596.02, "reo_biz_checking", "Stripe & Bank Fees", "2025-10-17", {
    reviewed: true, businessBucket: "no_roi", roiRating: 1,
  }, { merchant: "Credit card interest" }),
  expense(6_282.73, "reo_biz_checking", "Contract Labor", "2025-10-18", {
    reviewed: true, businessBucket: "high_roi", roiRating: 4, roiType: "money",
  }, { merchant: "Payroll" }),
  expense(1_977.02, "reo_biz_checking", "Contract Labor", "2025-10-20", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3, roiType: "overhead",
  }, { merchant: "Payroll taxes" }),
  expense(750.00, "reo_biz_checking", "Coaching & Training", "2025-10-22", {
    reviewed: true, businessBucket: "high_roi", roiRating: 4, roiType: "emotional",
  }, { merchant: "Business coaching" }),
  expense(340.83, "reo_biz_checking", "Auto & Gas", "2025-10-24", {
    reviewed: true, businessBucket: "high_roi", roiRating: 3, roiType: "time",
  }),
  expense(58.49, "reo_biz_checking", "Office & Space", "2025-10-26", {
    reviewed: true, businessBucket: "high_roi", roiRating: 2, roiType: "overhead",
  }, { merchant: "AT&T" }),
  expense(13.43, "reo_biz_checking", "Office & Space", "2025-10-28", {
    reviewed: true, businessBucket: "unsure", roiRating: 1, roiType: "overhead",
  }, { merchant: "Office supplies" }),
  expense(125.00, "reo_biz_checking", "Contract Labor", "2025-10-30", {
    reviewed: false,
  }, { merchant: "Contractor" }),

  // Non-deductible
  expense(2_300.00, "reo_personal_checking", "Shopping", "2025-10-15", {
    reviewed: true, personalBucket: "essential",
  }, { merchant: "Owner's distribution" }),
  expense(1_825.83, "reo_personal_checking", "Shopping", "2025-10-20", {
    reviewed: false,
  }, { merchant: "Debt payments" }),
  expense(3_792.00, "reo_personal_checking", "Shopping", "2025-10-25", {
    reviewed: false,
  }, { merchant: "Extra debt payment" }),
];

// ═══════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════

export const scoreSamples: readonly ScoreSample[] = [
  // Synthetic edge cases
  {
    name: "The Overspender",
    description:
      "Spends more than they earn, tiny cash cushion, lots of no-ROI and mismatch spending.",
    source: "synthetic",
    expectedBand: "Surviving",
    expectedScore: 10,
    accounts: overspenderAccounts,
    transactions: overspenderTransactions,
    monthKey: "2026-02",
  },
  {
    name: "Under-Reviewed",
    description:
      "Great fundamentals, but only ~55% of transactions reviewed — score penalized.",
    source: "synthetic",
    expectedBand: "Building",
    expectedScore: 84,
    accounts: underReviewedAccounts,
    transactions: underReviewedTransactions,
    monthKey: "2026-02",
  },
  {
    name: "The Saver Who Doesn't Invest",
    description:
      "Low spend, huge cushion, but spending lacks intentional ROI — qualitative pillar reveals under-investment.",
    source: "synthetic",
    expectedBand: "Thriving",
    expectedScore: 90,
    accounts: saverAccounts,
    transactions: saverTransactions,
    monthKey: "2026-02",
  },

  // Real P&L personas
  {
    name: "Real Estate Agent — Dry Month",
    description:
      "Commission-based realtor, Feb: $0 income but $7.3K expenses. " +
      "Has aircraft hobby, CC debt, feast-or-famine pattern. Annual revenue $163K. " +
      "Savings buffer prevents bottoming out — that's the point of a buffer.",
    source: "real_pnl",
    expectedBand: "Stretching",
    expectedScore: 32,
    accounts: realEstateAccounts,
    transactions: realEstateTransactions,
    monthKey: "2025-02",
  },
  {
    name: "Real Estate Agent — Commission Month",
    description:
      "Same realtor, Oct: $41.9K from 2 closed deals, $23.4K cash out. " +
      "Feast month with aggressive debt paydown. CC interest + unreviewed txns drag score.",
    source: "real_pnl",
    expectedBand: "Awakening",
    expectedScore: 66,
    accounts: realEstateOctAccounts,
    transactions: realEstateOctTransactions,
    monthKey: "2025-10",
  },
  {
    name: "German Productivity Coach",
    description:
      "Solo coach in Germany, ~$33K/yr. Feb: $1.2K income, $926 biz expenses, " +
      "$1.5K owner pay. Total cash out > income, but $5.8K liquid cushion helps.",
    source: "real_pnl",
    expectedBand: "Stretching",
    expectedScore: 33,
    accounts: germanCoachAccounts,
    transactions: germanCoachTransactions,
    monthKey: "2025-02",
  },
];
