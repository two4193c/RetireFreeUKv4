/**
 * Guyton-Klinger Dynamic Spending Rules & Initial Safe Withdrawal Rate (SWR) Engine
 *
 * Implements the empirical Maximum Safe Initial Withdrawal Rate (MSR) formulas and
 * guardrail trigger corridor boundaries from Guyton & Klinger (Journal of Financial Planning, 2004, 2006).
 */

export interface GuytonKlingerSwrInputs {
  horizonYears: number; // Retirement decumulation span in years (e.g. 30, 40)
  equityPercentage?: number; // % of portfolio in equities (default 65%)
  feeDragPercent?: number; // Total annual investment fee / platform drag (default 0%)
  capitalPreservationCutPercent?: number; // Capital preservation cut (default 10%)
  capitalPreservationThresholdPercent?: number; // Upper guardrail trigger threshold (default 20%)
  prosperityThresholdPercent?: number; // Lower guardrail trigger threshold (default 20%)
  prosperityIncreasePercent?: number; // Prosperity raise (default 10%)
  skipInflationOnNegativeReturn?: boolean; // Inflation rule toggle (default true)
  essentialFloorRatio?: number; // Essential spending floor / target spending (default 0.65)
  startingWealth?: number; // Starting portfolio pot balance (£)
  desiredAnnualSpend?: number; // Target retirement spending requirement (£/yr)
}

export interface GuytonKlingerSwrResult {
  recommendedInitialSwr: number; // e.g. 5.20 (%)
  bengenStaticSwr: number; // e.g. 4.05 (%)
  dynamicRulesBoost: number; // e.g. +1.15 (%)
  horizonYears: number;
  equityPercentage: number;
  feeDragPercent: number;
  startingWealth: number;
  initialAnnualSpend: number; // Starting wealth * recommended SWR
  requiredStartingWealth: number; // Desired spend / recommended SWR
  upperGuardrailRate: number; // e.g. 6.24% (> SWR * (1 + presThresh))
  lowerGuardrailRate: number; // e.g. 4.16% (< SWR * (1 - prospThresh))
  upperTriggerPortfolio: number; // Portfolio pot level that triggers Capital Preservation cut
  lowerTriggerPortfolio: number; // Portfolio pot level that triggers Prosperity raise
  parametersUsed: {
    capitalPreservationCut: number;
    capitalPreservationThreshold: number;
    prosperityThreshold: number;
    prosperityIncrease: number;
    skipInflation: boolean;
  };
}

/**
 * Calculates William Bengen's static SAFEMAX benchmark (no dynamic adjustments).
 */
export function getBengenBaselineSwr(horizonYears: number, equityPct = 65): number {
  const h = Math.max(10, Math.min(60, horizonYears));
  // At 30 years with 65% equity, benchmark is ~4.05%
  let rate = 4.05;
  if (h > 30) {
    rate -= (h - 30) * 0.038;
  } else {
    rate += (30 - h) * 0.075;
  }

  // Asset allocation adjustment (60-80% equity is sweet spot)
  const eq = Math.max(0, Math.min(100, equityPct));
  if (eq > 65) {
    rate += Math.min(0.25, (eq - 65) * 0.01);
  } else if (eq < 65) {
    rate -= (65 - eq) * 0.012;
  }

  return Math.max(2.5, Math.min(7.5, Math.round(rate * 100) / 100));
}

/**
 * Calculates the Guyton-Klinger dynamic decision rules premium (MSR boost) over static SWR.
 */
export function getGuytonKlingerDynamicBoost(
  horizonYears: number,
  equityPct = 65,
  cutPct = 10,
  triggerPct = 20,
  skipInflation = true,
  essentialFloorRatio = 0.65
): number {
  const h = Math.max(10, Math.min(60, horizonYears));
  // Base boost is +1.25% for 30 years with 65% equities under standard 10% cut / 20% trigger rules
  let boost = 1.25;
  if (h > 30) {
    boost -= (h - 30) * 0.012;
  } else {
    boost += (30 - h) * 0.02;
  }

  // Equity exposure effect: higher equity allocations capture higher upside under dynamic guardrails
  const eq = Math.max(0, Math.min(100, equityPct));
  if (eq >= 65) {
    boost += (Math.min(85, eq) - 65) * 0.012;
  } else {
    boost -= (65 - eq) * 0.015;
  }

  // Sensitivity to Capital Preservation cut size (10% standard)
  const cutDiff = cutPct - 10;
  boost += cutDiff * 0.025;

  // Sensitivity to trigger threshold (20% standard; tighter 15% catches drawdowns earlier)
  const threshDiff = 20 - triggerPct;
  boost += threshDiff * 0.015;

  // Inflation rule: skipping annual inflation in down years contributes ~+0.35%
  if (!skipInflation) {
    boost -= 0.35;
  }

  // Headroom: if essential floor is very high (> 75% of target), spending cannot flex as freely
  if (essentialFloorRatio > 0.75) {
    boost -= Math.min(0.5, (essentialFloorRatio - 0.75) * 0.8);
  }

  return Math.max(0.4, Math.min(2.5, Math.round(boost * 100) / 100));
}

/**
 * Computes the recommended Guyton-Klinger Safe Starting Withdrawal Rate and full guardrail corridor.
 */
export function calculateGuytonKlingerRecommendedSwr(inputs: GuytonKlingerSwrInputs): GuytonKlingerSwrResult {
  const horizonYears = Math.max(10, Math.min(60, inputs.horizonYears || 30));
  const equityPct = inputs.equityPercentage !== undefined ? Math.max(0, Math.min(100, inputs.equityPercentage)) : 65;
  const feeDrag = Math.max(0, inputs.feeDragPercent || 0);

  const cutPct = inputs.capitalPreservationCutPercent ?? 10;
  const presThreshPct = inputs.capitalPreservationThresholdPercent ?? 20;
  const prospThreshPct = inputs.prosperityThresholdPercent ?? 20;
  const prospIncPct = inputs.prosperityIncreasePercent ?? 10;
  const skipInflation = inputs.skipInflationOnNegativeReturn ?? true;
  const floorRatio = Math.max(0.2, Math.min(1.0, inputs.essentialFloorRatio ?? 0.65));

  const bengenStatic = getBengenBaselineSwr(horizonYears, equityPct);
  const dynamicBoost = getGuytonKlingerDynamicBoost(
    horizonYears,
    equityPct,
    cutPct,
    presThreshPct,
    skipInflation,
    floorRatio
  );

  const feeDeduction = feeDrag * 0.75;
  const recommendedSwr = Math.max(2.5, Math.min(8.0, Math.round((bengenStatic + dynamicBoost - feeDeduction) * 100) / 100));

  const startingWealth = Math.max(0, inputs.startingWealth || 0);
  const desiredSpend = Math.max(0, inputs.desiredAnnualSpend || 0);

  const initialAnnualSpend = startingWealth > 0
    ? Math.round(startingWealth * (recommendedSwr / 100))
    : desiredSpend;

  const requiredStartingWealth = recommendedSwr > 0 && desiredSpend > 0
    ? Math.round(desiredSpend / (recommendedSwr / 100))
    : startingWealth;

  const upperGuardrailRate = Math.round(recommendedSwr * (1 + presThreshPct / 100) * 100) / 100;
  const lowerGuardrailRate = Math.round(recommendedSwr * (1 - prospThreshPct / 100) * 100) / 100;

  const effectiveSpendForTriggers = initialAnnualSpend > 0 ? initialAnnualSpend : desiredSpend;
  const upperTriggerPortfolio = upperGuardrailRate > 0 && effectiveSpendForTriggers > 0
    ? Math.round(effectiveSpendForTriggers / (upperGuardrailRate / 100))
    : 0;

  const lowerTriggerPortfolio = lowerGuardrailRate > 0 && effectiveSpendForTriggers > 0
    ? Math.round(effectiveSpendForTriggers / (lowerGuardrailRate / 100))
    : 0;

  return {
    recommendedInitialSwr: recommendedSwr,
    bengenStaticSwr: bengenStatic,
    dynamicRulesBoost: Math.round((recommendedSwr - bengenStatic) * 100) / 100,
    horizonYears,
    equityPercentage: equityPct,
    feeDragPercent: feeDrag,
    startingWealth,
    initialAnnualSpend,
    requiredStartingWealth,
    upperGuardrailRate,
    lowerGuardrailRate,
    upperTriggerPortfolio,
    lowerTriggerPortfolio,
    parametersUsed: {
      capitalPreservationCut: cutPct,
      capitalPreservationThreshold: presThreshPct,
      prosperityThreshold: prospThreshPct,
      prosperityIncrease: prospIncPct,
      skipInflation,
    },
  };
}
