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
  dynamicRulesBoost: number; // Net effect vs Bengen after fees & clamping (recommended − bengen)
  rawDynamicRulesBoost: number; // GK rules premium before fee deduction / clamping
  feeDeduction: number; // Fee drag deducted from the SWR (%)
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
    essentialFloorRatio: number;
  };
}

/**
 * Calculates William Bengen's static SAFEMAX benchmark (no dynamic adjustments).
 */
export function getBengenBaselineSwr(horizonYears: number, equityPct = 65): number {
  const h = Number.isFinite(horizonYears) ? Math.max(10, Math.min(60, horizonYears)) : 30;
  // At 30 years with 65% equity, benchmark is ~4.05%
  let rate = 4.05;
  if (h > 30) {
    rate -= (h - 30) * 0.038;
  } else {
    rate += (30 - h) * 0.075;
  }

  // Asset allocation adjustment (historical Bengen sweet spot is 50-75% equities;
  // above 75%, static withdrawals suffer from volatility drag without dynamic cuts)
  const eq = Number.isFinite(equityPct) ? Math.max(0, Math.min(100, equityPct)) : 65;
  if (eq > 75) {
    rate += 0.10 - (eq - 75) * 0.012;
  } else if (eq > 65) {
    rate += (eq - 65) * 0.01;
  } else {
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
  essentialFloorRatio = 0.65,
  prosperityTriggerPct = 20,
  prosperityIncreasePct = 10
): number {
  const h = Number.isFinite(horizonYears) ? Math.max(10, Math.min(60, horizonYears)) : 30;
  const eq = Number.isFinite(equityPct) ? Math.max(0, Math.min(100, equityPct)) : 65;
  const safeCut = Number.isFinite(cutPct) ? Math.max(0, Math.min(50, cutPct)) : 10;
  const safeTrigger = Number.isFinite(triggerPct) ? Math.max(1, Math.min(100, triggerPct)) : 20;
  const safeFloorRatio = Number.isFinite(essentialFloorRatio) ? Math.max(0.0, Math.min(1.0, essentialFloorRatio)) : 0.65;
  const safeProspTrig = Number.isFinite(prosperityTriggerPct) ? Math.max(1, Math.min(99, prosperityTriggerPct)) : 20;
  const safeProspInc = Number.isFinite(prosperityIncreasePct) ? Math.max(0, Math.min(50, prosperityIncreasePct)) : 10;

  // Base dynamic boost is composed of two primary Guyton-Klinger rules:
  // 1. Inflation Rule: skipping annual inflation adjustment on negative return years (~+0.35%)
  // 2. Capital Preservation Rule: cutting spending when withdrawal rate surges (~+0.90% under standard 10% cut)
  const inflationPremium = skipInflation ? 0.35 : 0.0;

  // If cut size is 0% or essential floor is 100% of target (no discretionary headroom),
  // the capital preservation rule cannot operate and provides no boost.
  const floorHeadroom = safeFloorRatio >= 1.0 ? 0.0 : Math.max(0.0, Math.min(1.0, (1.0 - safeFloorRatio) / 0.35));
  let preservationPremium = 0.90;
  if (safeCut < 10) {
    preservationPremium = 0.90 * (safeCut / 10);
  } else if (safeCut > 10) {
    preservationPremium = 0.90 + (safeCut - 10) * 0.025;
  }
  preservationPremium *= floorHeadroom;

  const baseRulePremium = inflationPremium + preservationPremium;
  if (baseRulePremium <= 0) {
    return 0.0;
  }

  let boost = baseRulePremium;

  // Horizon adjustment: longer retirements have lower absolute percentage boosts
  if (h > 30) {
    boost -= (h - 30) * 0.012;
  } else {
    boost += (30 - h) * 0.02;
  }

  // Equity exposure effect: higher equity allocations capture higher upside under dynamic guardrails
  if (eq >= 65) {
    boost += (Math.min(85, eq) - 65) * 0.012;
  } else {
    boost -= (65 - eq) * 0.015;
  }

  // Sensitivity to Capital Preservation trigger threshold (only active when preservation cuts can occur)
  if (preservationPremium > 0) {
    const threshDiff = 20 - safeTrigger;
    boost += threshDiff * 0.015 * (preservationPremium / 0.90);
  }

  // Sensitivity to Prosperity Rule parameters:
  // More aggressive prosperity raises (+% over 10%) draw down more capital during bull runs,
  // which slightly dampens the initial safe starting rate headroom.
  const prospIncDiff = safeProspInc - 10;
  boost -= prospIncDiff * 0.015;
  if (safeProspInc > 0) {
    const prospThreshDiff = 20 - safeProspTrig;
    boost -= prospThreshDiff * 0.01 * (safeProspInc / 10);
  }

  return Math.max(0.0, Math.min(2.5, Math.round(boost * 100) / 100));
}

/**
 * Computes the recommended Guyton-Klinger Safe Starting Withdrawal Rate and full guardrail corridor.
 */
export function calculateGuytonKlingerRecommendedSwr(inputs: GuytonKlingerSwrInputs): GuytonKlingerSwrResult {
  const horizonYears = Number.isFinite(inputs.horizonYears)
    ? Math.max(10, Math.min(60, inputs.horizonYears))
    : 30;
  const equityPct = inputs.equityPercentage !== undefined && Number.isFinite(inputs.equityPercentage)
    ? Math.max(0, Math.min(100, inputs.equityPercentage))
    : 65;
  const feeDrag = inputs.feeDragPercent !== undefined && Number.isFinite(inputs.feeDragPercent)
    ? Math.max(0, inputs.feeDragPercent)
    : 0;

  const clampPct = (v: number | undefined, def: number, min: number, max: number) =>
    v !== undefined && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : def;
  const cutPct = clampPct(inputs.capitalPreservationCutPercent, 10, 0, 50);
  const presThreshPct = clampPct(inputs.capitalPreservationThresholdPercent, 20, 1, 100);
  const prospThreshPct = clampPct(inputs.prosperityThresholdPercent, 20, 1, 99);
  const prospIncPct = clampPct(inputs.prosperityIncreasePercent, 10, 0, 50);
  const skipInflation = inputs.skipInflationOnNegativeReturn ?? true;
  const floorRatio = clampPct(inputs.essentialFloorRatio, 0.65, 0.0, 1.0);

  const bengenStatic = getBengenBaselineSwr(horizonYears, equityPct);
  const dynamicBoost = getGuytonKlingerDynamicBoost(
    horizonYears,
    equityPct,
    cutPct,
    presThreshPct,
    skipInflation,
    floorRatio,
    prospThreshPct,
    prospIncPct
  );

  // Fees reduce the sustainable withdrawal rate roughly 1:1
  const feeDeduction = feeDrag;
  const recommendedSwr = Math.max(2.5, Math.min(8.0, Math.round((bengenStatic + dynamicBoost - feeDeduction) * 100) / 100));

  const startingWealth = inputs.startingWealth !== undefined && Number.isFinite(inputs.startingWealth)
    ? Math.max(0, inputs.startingWealth)
    : 0;
  const desiredSpend = inputs.desiredAnnualSpend !== undefined && Number.isFinite(inputs.desiredAnnualSpend)
    ? Math.max(0, inputs.desiredAnnualSpend)
    : 0;

  const initialAnnualSpend = startingWealth > 0
    ? Math.round(startingWealth * (recommendedSwr / 100))
    : desiredSpend;

  // 0 when no spending requirement is supplied (nothing to solve for)
  const requiredStartingWealth = recommendedSwr > 0 && desiredSpend > 0
    ? Math.round(desiredSpend / (recommendedSwr / 100))
    : 0;

  const upperGuardrailRate = Math.round(recommendedSwr * (1 + presThreshPct / 100) * 100) / 100;
  const lowerGuardrailRate = Math.round(recommendedSwr * (1 - prospThreshPct / 100) * 100) / 100;

  const effectiveSpendForTriggers = initialAnnualSpend;
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
    rawDynamicRulesBoost: dynamicBoost,
    feeDeduction: Math.round(feeDeduction * 100) / 100,
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
      essentialFloorRatio: floorRatio,
    },
  };
}
