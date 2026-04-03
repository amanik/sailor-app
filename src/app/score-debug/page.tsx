"use client";

import { useState } from "react";
import {
  calcSpendingScore,
  type SpendingScoreResult,
  type ScoredTransaction,
} from "@/lib/spending-score";
import { scoreSamples, type ScoreSample } from "@/data/spending-score-samples";
import {
  transactions as seedTransactions,
  accounts as seedAccounts,
  type Account,
} from "@/data/transactions";

// ─── Currency formatter ────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

// ─── Color helpers (inline styles — Tailwind can't detect dynamic classes) ──

const BAND_COLORS: Record<string, { border: string; text: string; bg: string }> = {
  Thriving:   { border: "#10b981", text: "#34d399", bg: "rgba(16,185,129,0.10)" },
  Building:   { border: "#0ea5e9", text: "#38bdf8", bg: "rgba(14,165,233,0.10)" },
  Awakening:  { border: "#f59e0b", text: "#fbbf24", bg: "rgba(245,158,11,0.10)" },
  Stretching: { border: "#f97316", text: "#fb923c", bg: "rgba(249,115,22,0.10)" },
  Surviving:  { border: "#ef4444", text: "#f87171", bg: "rgba(239,68,68,0.10)" },
};
const DEFAULT_BAND = { border: "#71717a", text: "#a1a1aa", bg: "rgba(113,113,122,0.10)" };

function bandStyles(band: string) {
  return BAND_COLORS[band] ?? DEFAULT_BAND;
}

function scoreHex(score: number): string {
  if (score >= 80) return "#34d399"; // emerald-400
  if (score >= 60) return "#38bdf8"; // sky-400
  if (score >= 40) return "#fbbf24"; // amber-400
  if (score >= 20) return "#fb923c"; // orange-400
  return "#f87171"; // red-400
}

function barHex(score: number): string {
  if (score >= 80) return "#10b981";
  if (score >= 60) return "#0ea5e9";
  if (score >= 40) return "#f59e0b";
  if (score >= 20) return "#f97316";
  return "#ef4444";
}

const BUCKET_COLORS: Record<string, { bg: string; text: string }> = {
  high_roi:    { bg: "rgba(16,185,129,0.15)", text: "#34d399" },
  essential:   { bg: "rgba(14,165,233,0.15)", text: "#38bdf8" },
  meaningful:  { bg: "rgba(139,92,246,0.15)", text: "#a78bfa" },
  unsure:      { bg: "rgba(245,158,11,0.15)", text: "#fbbf24" },
  no_roi:      { bg: "rgba(239,68,68,0.15)",  text: "#f87171" },
  mismatch:    { bg: "rgba(249,115,22,0.15)", text: "#fb923c" },
};

// ─── Expandable Score Card ─────────────────────────────────────

function ScoreCard({
  title,
  description,
  result,
  expectedScore,
  source,
}: {
  title: string;
  description: string;
  result: SpendingScoreResult;
  expectedScore?: number;
  source?: "synthetic" | "real_pnl";
}) {
  const [expanded, setExpanded] = useState(false);
  const { total, bandLabel, bandMessage, pillars, completeness, detail } =
    result;
  const bs = bandStyles(bandLabel);

  return (
    <div
      className="border border-border-primary rounded-lg overflow-hidden"
      style={{ borderLeftWidth: 4, borderLeftColor: bs.border }}
    >
      {/* Header — always visible, clickable */}
      <button
        type="button"
        className="w-full p-4 text-left space-y-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-baseline justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm">{title}</h3>
            {source === "real_pnl" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-border-primary text-text-tertiary">
                real data
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl tabular-nums" style={{ color: bs.text }}>{total}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: bs.bg, color: bs.text }}
            >
              {bandLabel}
            </span>
            <span className="text-xs text-text-tertiary">
              {expanded ? "▲" : "▼"}
            </span>
          </div>
        </div>

        <p className="text-xs text-text-secondary">{description}</p>
        <p className="text-xs italic text-text-tertiary">{bandMessage}</p>

        {expectedScore !== undefined && (
          <p className="text-xs text-text-secondary">
            Expected: ~{expectedScore} | Delta: {total - expectedScore}
          </p>
        )}

        {/* Pillar summary */}
        <div className="space-y-1.5 pt-2 border-t border-border-primary">
          <PillarRow
            name="Spend / Income"
            weight="40%"
            score={pillars.spendToIncome.score}
            label={pillars.spendToIncome.label}
          />
          <PillarRow
            name="Review Quality"
            weight="20%"
            score={pillars.qualitative.score}
            label={pillars.qualitative.label}
          />
          <PillarRow
            name="Balance / Spend"
            weight="40%"
            score={pillars.balanceRatio.score}
            label={pillars.balanceRatio.label}
          />
        </div>

        {/* Completeness warnings */}
        {!completeness.meetsMinimum && (
          <div className="pt-2 border-t border-border-primary text-xs text-text-secondary space-y-0.5">
            <p className="font-medium">Incomplete:</p>
            {!completeness.hasBusinessAccount && (
              <p>- Missing business account</p>
            )}
            {!completeness.hasPersonalAccount && (
              <p>- Missing personal account</p>
            )}
            {!completeness.hasIncome && <p>- No income this month</p>}
            {completeness.reviewPercentage < 0.5 && (
              <p>
                - Only {Math.round(completeness.reviewPercentage * 100)}%
                reviewed (need 50%)
              </p>
            )}
          </div>
        )}

        {completeness.reviewPercentage < 0.8 &&
          completeness.reviewPercentage >= 0.5 && (
            <p className="text-xs text-text-secondary pt-1">
              Based on {Math.round(completeness.reviewPercentage * 100)}% of
              transactions reviewed.
            </p>
          )}
      </button>

      {/* Expanded detail — tables */}
      {expanded && (
        <div className="border-t border-border-primary bg-bg-secondary p-4 space-y-5">
          {/* Score formula */}
          <FormulaBreakdown pillars={pillars} total={total} />

          {/* Pillar 1 detail */}
          <Pillar1Detail detail={detail} />

          {/* Pillar 2 detail — transaction table */}
          <Pillar2Detail
            scoredTxns={detail.scoredTransactions}
            reviewCoverage={detail.reviewCoverage}
            pillarScore={pillars.qualitative.score}
          />

          {/* Pillar 3 detail — account balances */}
          <Pillar3Detail
            liquidAccounts={detail.liquidAccounts}
            liquidAssets={detail.liquidAssets}
            totalSpend={detail.totalSpend}
            runwayMonths={detail.runwayMonths}
          />
        </div>
      )}
    </div>
  );
}

// ─── Pillar summary row ────────────────────────────────────────

function PillarRow({
  name,
  weight,
  score,
  label,
}: {
  name: string;
  weight: string;
  score: number;
  label: string;
}) {
  const rounded = Math.round(score);
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1 shrink-0 w-32">
        <span className="text-text-secondary">{name}</span>
        <span className="text-text-tertiary">({weight})</span>
      </div>
      <span
        className="font-mono tabular-nums shrink-0 w-8 text-right font-medium"
        style={{ color: scoreHex(rounded) }}
      >
        {rounded}
      </span>
      {/* Mini bar */}
      <div className="w-16 h-1.5 rounded-full shrink-0 overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.05)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(rounded, 100)}%`, backgroundColor: barHex(rounded) }}
        />
      </div>
      <span className="text-text-tertiary text-[11px] leading-tight">{label}</span>
    </div>
  );
}

// ─── Formula breakdown ─────────────────────────────────────────

function FormulaBreakdown({
  pillars,
  total,
}: {
  pillars: SpendingScoreResult["pillars"];
  total: number;
}) {
  const p1 = Math.round(pillars.spendToIncome.score);
  const p2 = Math.round(pillars.qualitative.score);
  const p3 = Math.round(pillars.balanceRatio.score);

  return (
    <div>
      <h4 className="text-xs font-medium text-text-secondary mb-1">
        Score Formula
      </h4>
      <p className="font-mono text-xs text-text-tertiary">
        ({p1} × 0.4) + ({p2} × 0.2) + ({p3} × 0.4) ={" "}
        <span className="text-text-primary font-medium">{total}</span>
      </p>
    </div>
  );
}

// ─── Pillar 1: Spend vs Income detail ──────────────────────────

function Pillar1Detail({ detail }: { detail: SpendingScoreResult["detail"] }) {
  const { totalIncome, totalSpend } = detail;
  const ratio = totalIncome > 0 ? totalSpend / totalIncome : 0;

  return (
    <div>
      <h4 className="text-xs font-medium text-text-secondary mb-2">
        Pillar 1: Spend vs Income
      </h4>
      <table className="w-full text-xs">
        <tbody className="divide-y divide-border-primary">
          <tr>
            <td className="py-1 text-text-secondary">Total Income</td>
            <td className="py-1 font-mono tabular-nums text-right">
              {fmt(totalIncome)}
            </td>
          </tr>
          <tr>
            <td className="py-1 text-text-secondary">
              Total Spend{" "}
              <span className="text-text-tertiary">
                (excl. taxes, debt, distributions)
              </span>
            </td>
            <td className="py-1 font-mono tabular-nums text-right">
              {fmt(totalSpend)}
            </td>
          </tr>
          <tr>
            <td className="py-1 text-text-secondary">Spend Ratio</td>
            <td className="py-1 font-mono tabular-nums text-right">
              {totalIncome > 0 ? `${Math.round(ratio * 100)}%` : "N/A"}
            </td>
          </tr>
          {totalSpend > totalIncome && totalIncome > 0 && (
            <tr>
              <td className="py-1 text-text-secondary">Overspend</td>
              <td className="py-1 font-mono tabular-nums text-right text-red-400">
                {fmt(totalSpend - totalIncome)}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pillar 2: Transaction quality table ───────────────────────

function Pillar2Detail({
  scoredTxns,
  reviewCoverage,
  pillarScore,
}: {
  scoredTxns: readonly ScoredTransaction[];
  reviewCoverage: number;
  pillarScore: number;
}) {
  // Sort by dollar weight descending
  const sorted = [...scoredTxns].sort((a, b) => b.dollarWeight - a.dollarWeight);
  const rated = sorted.filter((t) => t.qualityScore != null);
  const unrated = sorted.filter((t) => t.qualityScore == null);
  const ratedWeight = rated.reduce((s, t) => s + t.dollarWeight, 0);

  // Raw weighted avg (before penalty) — only rated transactions
  const rawAvg =
    ratedWeight > 0
      ? rated.reduce((s, t) => s + (t.qualityScore ?? 0) * t.dollarWeight, 0) /
        ratedWeight
      : 0;
  const penalty = reviewCoverage < 0.8 ? reviewCoverage / 0.8 : 1.0;

  return (
    <div>
      <h4 className="text-xs font-medium text-text-secondary mb-2">
        Pillar 2: Review Quality{" "}
        <span className="font-normal text-text-tertiary">
          ({sorted.length} reviewed, {Math.round(reviewCoverage * 100)}%
          coverage)
        </span>
      </h4>

      {/* How it works explanation */}
      <div className="text-xs text-text-tertiary bg-bg-primary border border-border-primary rounded p-3 space-y-2 mb-3">
        <p className="font-medium text-text-secondary">How the weighted average works</p>
        <p>
          Each transaction gets a <span className="font-mono">quality score</span> (0–100)
          based on its bucket and rating. Bigger expenses count more — a $3,000 rent
          payment has 10× the influence of a $300 subscription.
        </p>
        <p>
          <span className="font-medium text-text-secondary">Formula:</span>{" "}
          <span className="font-mono">Σ (quality × amount) / Σ (amount)</span>
        </p>
        <p>
          Each row's <span className="font-mono">Weight</span> column shows what % of total
          spending that transaction represents. <span className="font-mono">Contrib.</span>{" "}
          shows how many points it adds to the weighted average
          (quality × weight%).
        </p>
        <div className="border-t border-border-primary pt-2 mt-1 space-y-1">
          <p className="font-medium text-text-secondary">Quality score rules:</p>
          <p>• <span className="font-mono">high_roi</span> → rating × 25 (e.g. 4/4 = 100)</p>
          <p>• <span className="font-mono">unsure</span> → rating × 12.5 (e.g. 2/4 = 25)</p>
          <p>• <span className="font-mono">no_roi</span> → 0 (always)</p>
          <p>• <span className="font-mono">essential</span> → 70 (fixed)</p>
          <p>• <span className="font-mono">meaningful</span> → rating × 25</p>
          <p>• <span className="font-mono">mismatch</span> → 10 (fixed)</p>
          <p className="pt-1">Buckets that need a rating (high_roi, unsure, meaningful) are <span className="font-medium text-text-secondary">excluded from the average</span> until rated — they don't help or hurt.</p>
        </div>
        {reviewCoverage < 0.8 && (
          <div className="border-t border-border-primary pt-2 mt-1">
            <p className="font-medium text-text-secondary">Review coverage penalty:</p>
            <p>
              When less than 80% of transactions are reviewed, the score is reduced
              proportionally: <span className="font-mono">score × (coverage / 0.8)</span>.
              At {Math.round(reviewCoverage * 100)}% coverage, penalty
              = <span className="font-mono">×{penalty.toFixed(2)}</span>.
            </p>
          </div>
        )}
      </div>

      {sorted.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-tertiary text-left">
                  <th className="py-1 pr-2 font-normal">Transaction</th>
                  <th className="py-1 pr-2 font-normal">Bucket</th>
                  <th className="py-1 pr-2 font-normal text-right">Amount</th>
                  <th className="py-1 font-normal text-right">Quality</th>
                  <th className="py-1 font-normal text-right">Weight</th>
                  <th className="py-1 font-normal text-right">Contrib.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-primary">
                {sorted.map((st) => {
                  const bucket =
                    st.txn.businessBucket ?? st.txn.personalBucket ?? "—";
                  const rating =
                    st.txn.roiRating ?? st.txn.meaningRating ?? null;
                  const isRated = st.qualityScore != null;
                  const weightPct =
                    isRated && ratedWeight > 0
                      ? (st.dollarWeight / ratedWeight) * 100
                      : 0;
                  const contribution =
                    isRated && ratedWeight > 0
                      ? ((st.qualityScore ?? 0) * st.dollarWeight) / ratedWeight
                      : 0;

                  // Build a human-readable quality explanation
                  const qualityExplain = (() => {
                    if (st.txn.businessBucket === "high_roi")
                      return rating != null ? `${rating}/4 × 25` : "needs rating";
                    if (st.txn.businessBucket === "unsure")
                      return rating != null ? `${rating}/4 × 12.5` : "needs rating";
                    if (st.txn.businessBucket === "no_roi") return "fixed 0";
                    if (st.txn.personalBucket === "essential")
                      return "fixed 70";
                    if (st.txn.personalBucket === "meaningful")
                      return rating != null ? `${rating}/4 × 25` : "needs rating";
                    if (st.txn.personalBucket === "mismatch")
                      return "fixed 10";
                    return "neutral";
                  })();

                  return (
                    <tr key={st.txn.id}>
                      <td className="py-1 pr-2 text-text-secondary max-w-[140px] truncate">
                        {st.txn.merchantName}
                      </td>
                      <td className="py-1 pr-2">
                        {BUCKET_COLORS[bucket] ? (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: BUCKET_COLORS[bucket].bg,
                              color: BUCKET_COLORS[bucket].text,
                            }}
                          >
                            {bucket}
                          </span>
                        ) : (
                          <span className="text-[10px] text-text-tertiary">{bucket}</span>
                        )}
                      </td>
                      <td className="py-1 pr-2 font-mono tabular-nums text-right">
                        {fmt(st.dollarWeight)}
                      </td>
                      <td className="py-1 font-mono tabular-nums text-right">
                        {isRated ? (
                          <>
                            <span style={{ color: scoreHex(Math.round(st.qualityScore ?? 0)) }}>{Math.round(st.qualityScore ?? 0)}</span>
                            <span className="text-text-tertiary ml-1 text-[10px]">
                              ({qualityExplain})
                            </span>
                          </>
                        ) : (
                          <span className="text-text-tertiary italic text-[10px]">
                            {qualityExplain}
                          </span>
                        )}
                      </td>
                      <td className="py-1 font-mono tabular-nums text-right text-text-tertiary">
                        {isRated ? `${weightPct.toFixed(0)}%` : "—"}
                      </td>
                      <td className="py-1 font-mono tabular-nums text-right text-text-tertiary">
                        {isRated ? contribution.toFixed(1) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Step-by-step math */}
          <div className="mt-2 pt-2 border-t border-border-primary text-xs space-y-1.5">
            <p className="font-medium text-text-secondary">Calculation steps:</p>
            {unrated.length > 0 && (
              <p className="text-text-tertiary italic">
                {unrated.length} transaction{unrated.length > 1 ? "s" : ""} excluded
                (bucketed but not yet rated)
              </p>
            )}
            <p className="text-text-secondary">
              1. Sum of (quality × amount):{" "}
              <span className="font-mono">
                {Math.round(
                  rated.reduce(
                    (s, t) => s + (t.qualityScore ?? 0) * t.dollarWeight,
                    0
                  )
                ).toLocaleString()}
              </span>
            </p>
            <p className="text-text-secondary">
              2. Sum of rated amounts:{" "}
              <span className="font-mono">
                {fmt(ratedWeight)}
              </span>
            </p>
            <p className="text-text-secondary">
              3. Weighted average:{" "}
              <span className="font-mono">
                {Math.round(
                  rated.reduce(
                    (s, t) => s + (t.qualityScore ?? 0) * t.dollarWeight,
                    0
                  )
                ).toLocaleString()}{" "}
                / {fmt(ratedWeight)} ={" "}
                {rawAvg.toFixed(1)}
              </span>
              /100
            </p>
            {penalty < 1 ? (
              <p className="text-text-secondary">
                4. Review penalty:{" "}
                <span className="font-mono">
                  {rawAvg.toFixed(1)} × {penalty.toFixed(2)}
                </span>{" "}
                <span className="text-text-tertiary">
                  ({Math.round(reviewCoverage * 100)}% coverage / 80% threshold)
                </span>
                {" "}={" "}
                <span className="font-mono font-medium">
                  {Math.round(pillarScore)}
                </span>
              </p>
            ) : (
              <p className="text-text-secondary">
                4. No penalty (coverage ≥ 80%)
              </p>
            )}
            <p className="text-text-secondary font-medium pt-1 border-t border-border-primary">
              Pillar 2 score:{" "}
              <span className="font-mono text-text-primary">
                {Math.round(pillarScore)}
              </span>
              /100
            </p>
          </div>
        </>
      ) : (
        <p className="text-xs text-text-tertiary italic">
          No reviewed transactions.
        </p>
      )}
    </div>
  );
}

// ─── Pillar 3: Account balances ────────────────────────────────

function Pillar3Detail({
  liquidAccounts,
  liquidAssets,
  totalSpend,
  runwayMonths,
}: {
  liquidAccounts: readonly Account[];
  liquidAssets: number;
  totalSpend: number;
  runwayMonths: number;
}) {
  return (
    <div>
      <h4 className="text-xs font-medium text-text-secondary mb-2">
        Pillar 3: Financial Cushion
      </h4>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-text-tertiary text-left">
            <th className="py-1 pr-2 font-normal">Account</th>
            <th className="py-1 pr-2 font-normal">Type</th>
            <th className="py-1 font-normal text-right">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-primary">
          {liquidAccounts.map((a) => (
            <tr key={a.id}>
              <td className="py-1 pr-2 text-text-secondary">{a.name}</td>
              <td className="py-1 pr-2 text-text-tertiary">
                {a.type} / {a.category}
              </td>
              <td className="py-1 font-mono tabular-nums text-right">
                {fmt(a.balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-2 pt-2 border-t border-border-primary text-xs space-y-1">
        <p className="text-text-secondary">
          Liquid assets: <span className="font-mono">{fmt(liquidAssets)}</span>
        </p>
        <p className="text-text-secondary">
          Monthly spend: <span className="font-mono">{fmt(totalSpend)}</span>
        </p>
        <p className="text-text-secondary">
          Runway:{" "}
          <span className="font-mono font-medium">
            {runwayMonths.toFixed(1)} months
          </span>
        </p>
      </div>
    </div>
  );
}

// ─── CSV Export ─────────────────────────────────────────────────

interface PersonaRow {
  readonly name: string;
  readonly source: string;
  readonly result: SpendingScoreResult;
}

function escapeCsv(val: string | number): string {
  const s = String(val);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function buildCsv(personas: readonly PersonaRow[]): string {
  const header = [
    // Persona-level
    "Persona",
    "Source",
    "Overall Score",
    "Band",
    "P1 Spend/Income",
    "P1 Spend Ratio",
    "P1 Income",
    "P1 Spend",
    "P2 Quality",
    "P2 Review Coverage",
    "P3 Balance",
    "P3 Liquid Assets",
    "P3 Runway Months",
    // Transaction-level
    "Transaction",
    "Category",
    "Bucket",
    "Amount",
    "ROI Rating",
    "Meaning Rating",
    "Quality Score",
    "How Scored",
    "Dollar Weight %",
    "Contribution",
    "Rated?",
  ];

  const rows: string[][] = [];

  for (const p of personas) {
    const { result: r } = p;
    const rated = r.detail.scoredTransactions.filter(
      (t) => t.qualityScore != null
    );
    const ratedWeight = rated.reduce((s, t) => s + t.dollarWeight, 0);
    const spendRatio =
      r.detail.totalIncome > 0
        ? (r.detail.totalSpend / r.detail.totalIncome).toFixed(2)
        : "N/A";

    const personaCols = [
      p.name,
      p.source,
      r.total,
      r.bandLabel,
      Math.round(r.pillars.spendToIncome.score),
      spendRatio,
      Math.round(r.detail.totalIncome),
      Math.round(r.detail.totalSpend),
      Math.round(r.pillars.qualitative.score),
      `${Math.round(r.detail.reviewCoverage * 100)}%`,
      Math.round(r.pillars.balanceRatio.score),
      Math.round(r.detail.liquidAssets),
      r.detail.runwayMonths.toFixed(1),
    ];

    if (r.detail.scoredTransactions.length === 0) {
      // Persona with no transactions — one row, empty txn columns
      rows.push(
        [...personaCols, "", "", "", "", "", "", "", "", "", "", ""].map(
          escapeCsv
        )
      );
      continue;
    }

    for (const st of [...r.detail.scoredTransactions].sort(
      (a, b) => b.dollarWeight - a.dollarWeight
    )) {
      const bucket =
        st.txn.businessBucket ?? st.txn.personalBucket ?? "";
      const isRated = st.qualityScore != null;
      const weightPct =
        isRated && ratedWeight > 0
          ? ((st.dollarWeight / ratedWeight) * 100).toFixed(1) + "%"
          : "";
      const contrib =
        isRated && ratedWeight > 0
          ? (
              ((st.qualityScore ?? 0) * st.dollarWeight) /
              ratedWeight
            ).toFixed(1)
          : "";

      const explain = (() => {
        if (st.txn.businessBucket === "high_roi")
          return st.txn.roiRating != null
            ? `${st.txn.roiRating}/4 × 25`
            : "needs rating";
        if (st.txn.businessBucket === "unsure")
          return st.txn.roiRating != null
            ? `${st.txn.roiRating}/4 × 12.5`
            : "needs rating";
        if (st.txn.businessBucket === "no_roi") return "fixed 0";
        if (st.txn.personalBucket === "essential") return "fixed 70";
        if (st.txn.personalBucket === "meaningful")
          return st.txn.meaningRating != null
            ? `${st.txn.meaningRating}/4 × 25`
            : "needs rating";
        if (st.txn.personalBucket === "mismatch") return "fixed 10";
        return "neutral";
      })();

      rows.push(
        [
          ...personaCols,
          st.txn.merchantName,
          st.txn.category,
          bucket,
          Math.round(st.dollarWeight),
          st.txn.roiRating ?? "",
          st.txn.meaningRating ?? "",
          isRated ? Math.round(st.qualityScore ?? 0) : "",
          explain,
          weightPct,
          contrib,
          isRated ? "yes" : "no",
        ].map(escapeCsv)
      );
    }
  }

  return [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ──────────────────────────────────────────────────────

export default function ScoreDebugPage() {
  const jordanResult = calcSpendingScore({
    transactions: seedTransactions,
    accounts: seedAccounts,
    monthKey: "2026-02",
  });

  const syntheticSamples = scoreSamples.filter((s) => s.source === "synthetic");
  const realSamples = scoreSamples.filter((s) => s.source === "real_pnl");

  const renderSamples = (samples: readonly ScoreSample[]) =>
    samples.map((sample) => {
      const result = calcSpendingScore({
        transactions: sample.transactions,
        accounts: sample.accounts,
        monthKey: sample.monthKey,
      });
      return (
        <ScoreCard
          key={sample.name}
          title={sample.name}
          description={sample.description}
          result={result}
          expectedScore={sample.expectedScore}
          source={sample.source}
        />
      );
    });

  // Build persona list for CSV export
  const allPersonas: PersonaRow[] = [
    { name: "Jordan Rivera", source: "seed", result: jordanResult },
    ...scoreSamples.map((s) => ({
      name: s.name,
      source: s.source,
      result: calcSpendingScore({
        transactions: s.transactions,
        accounts: s.accounts,
        monthKey: s.monthKey,
      }),
    })),
  ];

  const handleDownload = () =>
    downloadCsv(buildCsv(allPersonas), "spending-score-debug.csv");

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-lg font-medium">Spending Score — Debug</h1>
          <p className="text-xs text-text-secondary mt-1">
            Tap any card to see full data breakdown.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="text-[11px] px-2.5 py-1.5 rounded border border-border-primary text-text-secondary hover:text-text-primary hover:border-text-tertiary transition-colors shrink-0"
        >
          Export CSV
        </button>
      </div>

      {/* Jordan Rivera */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary mb-2">
          Live: Jordan Rivera (seed data)
        </h2>
        <ScoreCard
          title="Jordan Rivera"
          description="Business coach, ~$10K/mo revenue, Feb 2026 seed data"
          result={jordanResult}
          expectedScore={89}
        />
      </div>

      {/* Real P&L personas */}
      {realSamples.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-text-secondary mb-2">
            Real Client P&Ls (anonymized from SBMS)
          </h2>
          <div className="space-y-3">{renderSamples(realSamples)}</div>
        </div>
      )}

      {/* Synthetic edge cases */}
      <div>
        <h2 className="text-sm font-medium text-text-secondary mb-2">
          Synthetic Edge Cases
        </h2>
        <div className="space-y-3">{renderSamples(syntheticSamples)}</div>
      </div>
    </div>
  );
}
