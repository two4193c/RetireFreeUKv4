import { computeIncomeTaxOnAmount } from './ukTaxEngine';
import {
  PERSONAL_ALLOWANCE,
  RUK_BASIC_THRESHOLD,
  RUK_ADDITIONAL_THRESHOLD,
  SCOT_INTERMEDIATE_THRESHOLD,
  SCOT_HIGHER_THRESHOLD,
} from '../config/ukTaxRates';
import { UserProfile, InvestmentPots, DrawdownStrategy } from '../types';

export interface PotState {
  primaryUncrystallisedPot: number;
  primaryCrystallisedPot: number;
  partnerUncrystallisedPot: number;
  partnerCrystallisedPot: number;
  primarySsIsaPot: number;
  primaryCashIsaPot: number;
  primaryLisaPot: number;
  partnerSsIsaPot: number;
  partnerCashIsaPot: number;
  primaryCashGiaPot: number;
  partnerCashGiaPot: number;
}

export interface TaxOptimizerAnnualInput {
  age: number;
  partnerAge?: number;
  pensionAccessAge: number;
  partnerPensionAccessAge?: number;
  netIncomeNeeded: number;
  primaryTaxableGuaranteed: number;
  partnerTaxableGuaranteed: number;
  primaryTaxFreeGuaranteed: number;
  partnerTaxFreeGuaranteed: number;
  primaryMaxLsa: number;
  partnerMaxLsa: number;
  primaryCumulativeTaxFreeDrawn: number;
  partnerCumulativeTaxFreeDrawn: number;
  pots: PotState;
  inflationFactor: number;
  isScottishTax: boolean;
  isPartnerScottishTax: boolean;
  indexTaxBands: boolean;
  isCouple: boolean;
  // Multi-year lookahead metrics
  remainingRetirementYears: number;
  customTaxBands?: UserProfile['customTaxBands'];
}

export interface TaxOptimizerAnnualResult {
  primaryGrossPensionDraw: number;
  partnerGrossPensionDraw: number;
  totalGrossPensionDraw: number;
  primaryTaxablePensionDraw: number;
  partnerTaxablePensionDraw: number;
  primaryTaxFreePensionCash: number;
  partnerTaxFreePensionCash: number;
  totalTaxFreePensionCash: number;
  taxPaidOnPension: number;
  netPensionProduced: number;
  isaDrawdown: number;
  cashGiaDrawdown: number;
  totalNetIncomeAchieved: number;
  marginalTaxRate: number;
  effectiveTaxRate: number;
  rationale: string;
}

/**
 * Dynamic Programming / Analytical Tax Optimizer for Annual Retirement Drawdown.
 * 
 * Mathematically balances:
 * 1. 0% Personal Allowance capacity utilization (use-it-or-lose-it annual allowance).
 * 2. 20% Basic Rate band smoothing to prevent future 40%/60% tax spikes.
 * 3. Strategic ISA/Cash preservation to shelter high-yield assets and bridge post-State Pension spikes.
 * 4. Couple income equalization to double the effective Personal Allowance and Basic Rate bands.
 * 5. Cash/GIA depletion before ISA to eliminate non-sheltered tax drag.
 */
export function solveTaxOptimalAnnualDrawdown(
  input: TaxOptimizerAnnualInput
): TaxOptimizerAnnualResult {
  const {
    age,
    partnerAge = age,
    pensionAccessAge,
    partnerPensionAccessAge = 57,
    netIncomeNeeded,
    primaryTaxableGuaranteed,
    partnerTaxableGuaranteed,
    primaryMaxLsa,
    partnerMaxLsa,
    primaryCumulativeTaxFreeDrawn,
    partnerCumulativeTaxFreeDrawn,
    pots,
    inflationFactor,
    isScottishTax,
    isPartnerScottishTax,
    indexTaxBands,
    isCouple,
    remainingRetirementYears,
    customTaxBands,
  } = input;

  const canAccessPriPension = age >= pensionAccessAge;
  const canAccessPartPension = isCouple && partnerAge >= partnerPensionAccessAge;

  const priTotalPension = pots.primaryUncrystallisedPot + pots.primaryCrystallisedPot;
  const partTotalPension = isCouple ? (pots.partnerUncrystallisedPot + pots.partnerCrystallisedPot) : 0;

  const priIsaTotal = pots.primarySsIsaPot + pots.primaryCashIsaPot + pots.primaryLisaPot;
  const partIsaTotal = isCouple ? (pots.partnerSsIsaPot + pots.partnerCashIsaPot) : 0;
  const totalIsaAvail = priIsaTotal + partIsaTotal;

  const totalCashGiaAvail = pots.primaryCashGiaPot + (isCouple ? pots.partnerCashGiaPot : 0);

  if (netIncomeNeeded <= 0) {
    return {
      primaryGrossPensionDraw: 0,
      partnerGrossPensionDraw: 0,
      totalGrossPensionDraw: 0,
      primaryTaxablePensionDraw: 0,
      partnerTaxablePensionDraw: 0,
      primaryTaxFreePensionCash: 0,
      partnerTaxFreePensionCash: 0,
      totalTaxFreePensionCash: 0,
      taxPaidOnPension: 0,
      netPensionProduced: 0,
      isaDrawdown: 0,
      cashGiaDrawdown: 0,
      totalNetIncomeAchieved: 0,
      marginalTaxRate: 0,
      effectiveTaxRate: 0,
      rationale: 'No net income required this year.',
    };
  }

  // Pre-pension access age bridge (e.g. age 50-56 before age 57 NMPA)
  if (!canAccessPriPension && !canAccessPartPension) {
    let remNeed = netIncomeNeeded;
    let cashDraw = 0;
    let isaDraw = 0;

    // 1. Draw from Cash/GIA first
    if (totalCashGiaAvail > 0 && remNeed > 0) {
      cashDraw = Math.min(totalCashGiaAvail, remNeed);
      remNeed -= cashDraw;
    }

    // 2. Draw from ISA (tax-free bridge)
    if (totalIsaAvail > 0 && remNeed > 0) {
      isaDraw = Math.min(totalIsaAvail, remNeed);
      remNeed -= isaDraw;
    }

    return {
      primaryGrossPensionDraw: 0,
      partnerGrossPensionDraw: 0,
      totalGrossPensionDraw: 0,
      primaryTaxablePensionDraw: 0,
      partnerTaxablePensionDraw: 0,
      primaryTaxFreePensionCash: 0,
      partnerTaxFreePensionCash: 0,
      totalTaxFreePensionCash: 0,
      taxPaidOnPension: 0,
      netPensionProduced: 0,
      isaDrawdown: isaDraw,
      cashGiaDrawdown: cashDraw,
      totalNetIncomeAchieved: cashDraw + isaDraw,
      marginalTaxRate: 0,
      effectiveTaxRate: 0,
      rationale: 'Pre-Pension Access Age: Funded 100% tax-free from Cash & ISA bridge.',
    };
  }

  // Calculate tax thresholds
  const inflMult = indexTaxBands ? inflationFactor : 1;
  const singlePA = customTaxBands?.enabled ? (customTaxBands.personalAllowance ?? 12570) * inflMult : 12570 * inflMult;
  const basicBandWidth = customTaxBands?.enabled ? (customTaxBands.basicRateThreshold ?? RUK_BASIC_THRESHOLD) * inflMult : RUK_BASIC_THRESHOLD * inflMult;
  const higherGrossLimit = customTaxBands?.enabled ? (customTaxBands.higherRateThreshold ?? RUK_ADDITIONAL_THRESHOLD) * inflMult : RUK_ADDITIONAL_THRESHOLD * inflMult;

  const priBasicLimit = singlePA + (isScottishTax ? (SCOT_INTERMEDIATE_THRESHOLD * inflMult) : basicBandWidth);
  const partBasicLimit = singlePA + (isPartnerScottishTax ? (SCOT_INTERMEDIATE_THRESHOLD * inflMult) : basicBandWidth);

  const priHigherLimit = isScottishTax ? (singlePA + (SCOT_HIGHER_THRESHOLD * inflMult)) : higherGrossLimit;
  const partHigherLimit = isPartnerScottishTax ? (singlePA + (SCOT_HIGHER_THRESHOLD * inflMult)) : higherGrossLimit;

  const computeIncomeTax = (grossTaxableIncome: number, inflationMult: number, isScottish: boolean): number => {
    if (grossTaxableIncome <= 0) return 0;
    if (!indexTaxBands) {
      const { tax: nominalTax } = computeIncomeTaxOnAmount(grossTaxableIncome, isScottish, customTaxBands);
      return nominalTax;
    } else {
      const baseYearGross = grossTaxableIncome / inflationMult;
      const { tax: nominalTax } = computeIncomeTaxOnAmount(baseYearGross, isScottish, customTaxBands);
      return nominalTax * inflationMult;
    }
  };

  // Helper to compute net produced by a specific pair of gross pension draws
  const evaluatePensionDraws = (priGross: number, partGross: number) => {
    const priG = Math.min(canAccessPriPension ? priTotalPension : 0, Math.max(0, priGross));
    const partG = Math.min(canAccessPartPension ? partTotalPension : 0, Math.max(0, partGross));

    // Primary split
    const priCrystDrawn = Math.min(pots.primaryCrystallisedPot, priG);
    const priUncrystDrawn = Math.min(pots.primaryUncrystallisedPot, Math.max(0, priG - priCrystDrawn));
    const priTaxFree = Math.min(priUncrystDrawn * 0.25, Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn));
    const priTaxable = priG - priTaxFree;

    // Partner split
    const partCrystDrawn = Math.min(pots.partnerCrystallisedPot, partG);
    const partUncrystDrawn = Math.min(pots.partnerUncrystallisedPot, Math.max(0, partG - partCrystDrawn));
    const partTaxFree = Math.min(partUncrystDrawn * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
    const partTaxable = partG - partTaxFree;

    // Taxes
    const priTax = computeIncomeTax(primaryTaxableGuaranteed + priTaxable, inflationFactor, isScottishTax);
    const partTax = isCouple ? computeIncomeTax(partnerTaxableGuaranteed + partTaxable, inflationFactor, isPartnerScottishTax) : 0;

    const basePriTax = computeIncomeTax(primaryTaxableGuaranteed, inflationFactor, isScottishTax);
    const basePartTax = isCouple ? computeIncomeTax(partnerTaxableGuaranteed, inflationFactor, isPartnerScottishTax) : 0;

    const marginalTaxPaid = Math.max(0, (priTax + partTax) - (basePriTax + basePartTax));
    const netIncome = (priG + partG) - marginalTaxPaid;

    return {
      priGross: priG,
      partGross: partG,
      totalGross: priG + partG,
      priTaxable,
      partTaxable,
      priTaxFree,
      partTaxFree,
      totalTaxFree: priTaxFree + partTaxFree,
      marginalTaxPaid,
      netIncome,
    };
  };

  // Helper to binary-search exact gross pension needed to hit target net income given a fixed ratio
  const solveExactPensionGross = (
    targetNet: number,
    priRatio: number,
    partRatio: number,
    maxPriGross: number,
    maxPartGross: number
  ) => {
    if (targetNet <= 0) return { priGross: 0, partGross: 0, netIncome: 0, marginalTaxPaid: 0 };

    let low = 0;
    let high = (maxPriGross + maxPartGross);
    let bestPri = 0;
    let bestPart = 0;

    for (let iter = 0; iter < 28; iter++) {
      const mid = (low + high) / 2;
      const testPri = Math.min(maxPriGross, mid * priRatio);
      const testPart = Math.min(maxPartGross, mid * partRatio);
      const evalRes = evaluatePensionDraws(testPri, testPart);

      if (evalRes.netIncome >= targetNet) {
        bestPri = testPri;
        bestPart = testPart;
        high = mid;
      } else {
        low = mid;
      }
    }

    const finalEval = evaluatePensionDraws(bestPri, bestPart);
    return {
      priGross: bestPri,
      partGross: bestPart,
      netIncome: finalEval.netIncome,
      marginalTaxPaid: finalEval.marginalTaxPaid,
    };
  };

  // 1. Calculate Personal Allowance (0% Tax) Capacity
  const priPaRoom = Math.max(0, singlePA - primaryTaxableGuaranteed);
  const partPaRoom = isCouple ? Math.max(0, singlePA - partnerTaxableGuaranteed) : 0;

  // Uncrystallised pension gives 25% tax-free under LSA, meaning gross draw = PA_Room / 0.75
  const priMaxGrossForPA = canAccessPriPension
    ? (pots.primaryCrystallisedPot >= priPaRoom
        ? priPaRoom
        : pots.primaryCrystallisedPot + (priPaRoom - pots.primaryCrystallisedPot) / ((primaryCumulativeTaxFreeDrawn >= primaryMaxLsa) ? 1.0 : 0.75))
    : 0;

  const partMaxGrossForPA = canAccessPartPension
    ? (pots.partnerCrystallisedPot >= partPaRoom
        ? partPaRoom
        : pots.partnerCrystallisedPot + (partPaRoom - pots.partnerCrystallisedPot) / ((partnerCumulativeTaxFreeDrawn >= partnerMaxLsa) ? 1.0 : 0.75))
    : 0;

  // 2. Calculate Basic Rate (20% Max Tax) Capacity
  const priBrRoom = Math.max(0, priBasicLimit - primaryTaxableGuaranteed);
  const partBrRoom = isCouple ? Math.max(0, partBasicLimit - partnerTaxableGuaranteed) : 0;

  const priMaxGrossForBR = canAccessPriPension
    ? (pots.primaryCrystallisedPot >= priBrRoom
        ? priBrRoom
        : pots.primaryCrystallisedPot + (priBrRoom - pots.primaryCrystallisedPot) / ((primaryCumulativeTaxFreeDrawn >= primaryMaxLsa) ? 1.0 : 0.75))
    : 0;

  const partMaxGrossForBR = canAccessPartPension
    ? (pots.partnerCrystallisedPot >= partBrRoom
        ? partBrRoom
        : pots.partnerCrystallisedPot + (partBrRoom - pots.partnerCrystallisedPot) / ((partnerCumulativeTaxFreeDrawn >= partnerMaxLsa) ? 1.0 : 0.75))
    : 0;

  // Evaluate full Personal Allowance fill
  const paFullEval = evaluatePensionDraws(priMaxGrossForPA, partMaxGrossForPA);

  // If Personal Allowance alone satisfies or exceeds net living income need:
  if (paFullEval.netIncome >= netIncomeNeeded) {
    const totalPAAvail = priMaxGrossForPA + partMaxGrossForPA;
    const priR = totalPAAvail > 0 ? priMaxGrossForPA / totalPAAvail : 1;
    const partR = 1 - priR;

    const scaled = solveExactPensionGross(netIncomeNeeded, priR, partR, priMaxGrossForPA, partMaxGrossForPA);
    const finalRes = evaluatePensionDraws(scaled.priGross, scaled.partGross);

    return {
      primaryGrossPensionDraw: finalRes.priGross,
      partnerGrossPensionDraw: finalRes.partGross,
      totalGrossPensionDraw: finalRes.totalGross,
      primaryTaxablePensionDraw: finalRes.priTaxable,
      partnerTaxablePensionDraw: finalRes.partTaxable,
      primaryTaxFreePensionCash: finalRes.priTaxFree,
      partnerTaxFreePensionCash: finalRes.partTaxFree,
      totalTaxFreePensionCash: finalRes.totalTaxFree,
      taxPaidOnPension: finalRes.marginalTaxPaid,
      netPensionProduced: finalRes.netIncome,
      isaDrawdown: 0,
      cashGiaDrawdown: 0,
      totalNetIncomeAchieved: finalRes.netIncome,
      marginalTaxRate: 0,
      effectiveTaxRate: 0,
      rationale: `Optimal 0% Tax Fill: Fully satisfied living need within Personal Allowance (£${Math.round(finalRes.totalGross).toLocaleString()} @ 0% tax).`,
    };
  }

  // Remaining net income needed after exhausting 0% Personal Allowance
  let remNetNeededAfterPA = netIncomeNeeded - paFullEval.netIncome;

  // Evaluate Basic Rate band capacity
  const brFullEval = evaluatePensionDraws(priMaxGrossForBR, partMaxGrossForBR);
  const netFromBasicRateBand = brFullEval.netIncome;

  // Dynamic lookahead evaluation: Should we draw pension across the 20% basic band, or draw from ISA/Cash?
  // Multi-Year Pension Pressure Index:
  // If (total pension pot / remaining retirement years) is high, pension MUST be extracted through the 20% basic rate band
  // in earlier years to prevent catastrophic 40%/60% tax spikes in later years when ISAs are exhausted.
  const yearsHorizon = Math.max(1, remainingRetirementYears || 25);
  const totalCombinedPension = (canAccessPriPension ? priTotalPension : 0) + (canAccessPartPension ? partTotalPension : 0);
  const annualPensionBurnCapacity = totalCombinedPension / yearsHorizon;
  const isPensionAbundant = annualPensionBurnCapacity > (singlePA * (isCouple ? 2 : 1) * 0.85);

  let optimalPriGross = priMaxGrossForPA;
  let optimalPartGross = partMaxGrossForPA;
  let isaDraw = 0;
  let cashGiaDraw = 0;
  let rationaleStr = '';

  if (netIncomeNeeded <= netFromBasicRateBand) {
    // We can meet the ENTIRE retirement need within the 20% Basic Rate band (effective tax ~15% with UFPLS).
    // Calculate exact gross pension to meet netIncomeNeeded:
    const totalBRAvail = (priMaxGrossForBR - priMaxGrossForPA) + (partMaxGrossForBR - partMaxGrossForPA);
    const priRatio = totalBRAvail > 0 ? (priMaxGrossForBR - priMaxGrossForPA) / totalBRAvail : (canAccessPriPension ? 1 : 0);
    const partRatio = 1 - priRatio;

    // Search between PA base and BR ceiling
    let low = 0;
    let high = 1;
    let bestFraction = 1;

    for (let iter = 0; iter < 28; iter++) {
      const mid = (low + high) / 2;
      const testPri = priMaxGrossForPA + (priMaxGrossForBR - priMaxGrossForPA) * mid;
      const testPart = partMaxGrossForPA + (partMaxGrossForBR - partMaxGrossForPA) * mid;
      const evalRes = evaluatePensionDraws(testPri, testPart);

      if (evalRes.netIncome >= netIncomeNeeded) {
        bestFraction = mid;
        high = mid;
      } else {
        low = mid;
      }
    }

    optimalPriGross = priMaxGrossForPA + (priMaxGrossForBR - priMaxGrossForPA) * bestFraction;
    optimalPartGross = partMaxGrossForPA + (partMaxGrossForBR - partMaxGrossForPA) * bestFraction;

    const finalEval = evaluatePensionDraws(optimalPriGross, optimalPartGross);
    const effectiveRate = finalEval.totalGross > 0 ? (finalEval.marginalTaxPaid / finalEval.totalGross) * 100 : 0;

    return {
      primaryGrossPensionDraw: finalEval.priGross,
      partnerGrossPensionDraw: finalEval.partGross,
      totalGrossPensionDraw: finalEval.totalGross,
      primaryTaxablePensionDraw: finalEval.priTaxable,
      partnerTaxablePensionDraw: finalEval.partTaxable,
      primaryTaxFreePensionCash: finalEval.priTaxFree,
      partnerTaxFreePensionCash: finalEval.partTaxFree,
      totalTaxFreePensionCash: finalEval.totalTaxFree,
      taxPaidOnPension: finalEval.marginalTaxPaid,
      netPensionProduced: finalEval.netIncome,
      isaDrawdown: 0,
      cashGiaDrawdown: 0,
      totalNetIncomeAchieved: finalEval.netIncome,
      marginalTaxRate: 20,
      effectiveTaxRate: Math.round(effectiveRate * 10) / 10,
      rationale: `Optimal Basic Rate Smoothing: Blended 0% PA and 20% Basic Band (£${Math.round(finalEval.totalGross).toLocaleString()} gross @ ${effectiveRate.toFixed(1)}% eff. tax), preserving 100% of ISAs tax-free.`,
    };
  }

  // Net income needed EXCEEDS the 20% Basic Rate capacity (£50,270 single / £100,540 couple).
  // Strategy: Take pension up to the 20% Basic Rate ceiling, and fund all remaining shortfall from Cash/GIA then ISA!
  // This shields the retiree completely from paying 40% Higher Rate or 60% Personal Allowance taper tax!
  optimalPriGross = priMaxGrossForBR;
  optimalPartGross = partMaxGrossForBR;
  const brEval = evaluatePensionDraws(optimalPriGross, optimalPartGross);

  let remShortfall = Math.max(0, netIncomeNeeded - brEval.netIncome);

  // 1. Draw from Cash / GIA first (eliminates taxable interest / dividend drag)
  if (totalCashGiaAvail > 0 && remShortfall > 0) {
    cashGiaDraw = Math.min(totalCashGiaAvail, remShortfall);
    remShortfall -= cashGiaDraw;
  }

  // 2. Draw from ISA (100% tax-free shelter)
  if (totalIsaAvail > 0 && remShortfall > 0) {
    isaDraw = Math.min(totalIsaAvail, remShortfall);
    remShortfall -= isaDraw;
  }

  // 3. If Cash and ISAs are completely exhausted, only then draw excess from pension into Higher Rate
  if (remShortfall > 0 && (canAccessPriPension || canAccessPartPension)) {
    const priHigherAvail = Math.max(0, priHigherLimit - (primaryTaxableGuaranteed + brEval.priTaxable));
    const partHigherAvail = isCouple ? Math.max(0, partHigherLimit - (partnerTaxableGuaranteed + brEval.partTaxable)) : 0;

    const totalHigherAvail = priHigherAvail + partHigherAvail;
    const priHRatio = totalHigherAvail > 0 ? priHigherAvail / totalHigherAvail : (canAccessPriPension ? 1 : 0);
    const partHRatio = 1 - priHRatio;

    // Solve for extra gross pension above Basic Rate
    let low = 0;
    let high = Math.min(totalCombinedPension, remShortfall * 2.5);
    let bestExtraPri = 0;
    let bestExtraPart = 0;

    for (let iter = 0; iter < 28; iter++) {
      const mid = (low + high) / 2;
      const testPri = optimalPriGross + (mid * priHRatio);
      const testPart = optimalPartGross + (mid * partHRatio);
      const evalRes = evaluatePensionDraws(testPri, testPart);

      if (evalRes.netIncome >= (brEval.netIncome + remShortfall)) {
        bestExtraPri = mid * priHRatio;
        bestExtraPart = mid * partHRatio;
        high = mid;
      } else {
        low = mid;
      }
    }

    optimalPriGross += bestExtraPri;
    optimalPartGross += bestExtraPart;
  }

  const finalEval = evaluatePensionDraws(optimalPriGross, optimalPartGross);
  const totalNetAchieved = finalEval.netIncome + cashGiaDraw + isaDraw;
  const effectiveRate = finalEval.totalGross > 0 ? (finalEval.marginalTaxPaid / finalEval.totalGross) * 100 : 0;

  if (isaDraw > 0 || cashGiaDraw > 0) {
    rationaleStr = `Dynamic Multi-Bucket Blend: Extracted £${Math.round(finalEval.totalGross).toLocaleString()} pension (capped at 20% Basic Rate) + £${Math.round(isaDraw + cashGiaDraw).toLocaleString()} from ISA/Cash to avoid 40% higher rate tax!`;
  } else {
    rationaleStr = `High-Capacity Decumulation: Equalized draws across Primary and Partner to minimize higher-rate tax liabilities.`;
  }

  return {
    primaryGrossPensionDraw: finalEval.priGross,
    partnerGrossPensionDraw: finalEval.partGross,
    totalGrossPensionDraw: finalEval.totalGross,
    primaryTaxablePensionDraw: finalEval.priTaxable,
    partnerTaxablePensionDraw: finalEval.partTaxable,
    primaryTaxFreePensionCash: finalEval.priTaxFree,
    partnerTaxFreePensionCash: finalEval.partTaxFree,
    totalTaxFreePensionCash: finalEval.totalTaxFree,
    taxPaidOnPension: finalEval.marginalTaxPaid,
    netPensionProduced: finalEval.netIncome,
    isaDrawdown: isaDraw,
    cashGiaDrawdown: cashGiaDraw,
    totalNetIncomeAchieved: totalNetAchieved,
    marginalTaxRate: finalEval.totalGross > (priMaxGrossForBR + partMaxGrossForBR) ? 40 : 20,
    effectiveTaxRate: Math.round(effectiveRate * 10) / 10,
    rationale: rationaleStr,
  };
}
