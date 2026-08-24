import { UserProfile, InvestmentPots, YearProjection, TaxCalculationResult } from '../types';
import { DEFAULT_PARTNER_POTS, DEFAULT_POTS, sanitizePots } from './defaultData';
import { calculateGiltLadder } from './giltLadderEngine';
import { getEffectiveAccumulationReturn, getEffectiveDecumulationReturn, getTotalFeePercent, getPotFeePercent, calculateWeightedAssetReturn, getPotGrossReturn } from './assetAllocation';
import {
  getPensionAccessAge,
  getLumpSumTakeAge,
  calculateUKTax,
  calculatePartnerUKTax,
  getPartnerPensionAccessAge,
  getPartnerLumpSumTakeAge,
  getPartnerLsaLimit,
  getLsaLimit,
  computeIncomeTaxOnAmount,
  allocateLumpSumToPots,
  calculatePSAAndSavingsTax,
  calculateUKStampDuty,
} from './ukTaxEngine';
import {
  PERSONAL_ALLOWANCE,
  PENSION_ANNUAL_ALLOWANCE,
  ISA_ANNUAL_LIMIT,
  LISA_ANNUAL_LIMIT,
  LSA_STANDARD_LIMIT,
  RUK_BASIC_THRESHOLD,
  RUK_ADDITIONAL_THRESHOLD,
  SCOT_INTERMEDIATE_THRESHOLD,
  SCOT_HIGHER_THRESHOLD,
  PA_TAPER_THRESHOLD,
} from '../config/ukTaxRates';
import { solveTaxOptimalAnnualDrawdown } from './taxOptimizerSolver';

export { getPensionAccessAge, getLsaLimit };

export function getTargetIncomeForAge(profile: UserProfile, age: number): number {
  if (profile.maximizedSpendConfig?.enabled) {
    const maxConfig = profile.maximizedSpendConfig;
    if (maxConfig.spendingPhases?.enabled) {
      const phases = maxConfig.spendingPhases;
      if (phases.customRanges && phases.customRanges.length > 0) {
        const sorted = [...phases.customRanges].sort((a, b) => a.startAge - b.startAge);
        const match = sorted.find(
          (r) => age >= r.startAge && (r.endAge === undefined || r.endAge === null || r.endAge <= 0 || age <= r.endAge)
        );
        if (match) {
          return match.annualTargetIncome;
        }
        const lastRange = sorted[sorted.length - 1];
        if (lastRange && lastRange.endAge && age > lastRange.endAge) {
          return lastRange.annualTargetIncome;
        }
        if (sorted[0] && age < sorted[0].startAge) {
          return sorted[0].annualTargetIncome;
        }
      }
      if (phases.goGoEndAge !== undefined && phases.goGoIncomeAnnual !== undefined) {
        if (age <= phases.goGoEndAge) {
          return phases.goGoIncomeAnnual;
        } else if (phases.slowGoEndAge !== undefined && age <= phases.slowGoEndAge && phases.slowGoIncomeAnnual !== undefined) {
          return phases.slowGoIncomeAnnual;
        } else if (phases.noGoIncomeAnnual !== undefined) {
          return phases.noGoIncomeAnnual;
        }
      }
    }
    const maxTarget = maxConfig.targetAnnualIncome || profile.targetRetirementIncomeAnnual;
    if (maxTarget !== undefined && maxTarget > 0) {
      return maxTarget;
    }
  }

  if (profile.spendingPhases?.enabled) {
    const phases = profile.spendingPhases;

    // Check flexible custom age ranges first
    if (phases.customRanges && phases.customRanges.length > 0) {
      const sorted = [...phases.customRanges].sort((a, b) => a.startAge - b.startAge);
      const match = sorted.find(
        (r) => age >= r.startAge && (r.endAge === undefined || r.endAge === null || r.endAge <= 0 || age <= r.endAge)
      );
      if (match) {
        return match.annualTargetIncome;
      }
      // If age exceeds all specified endAges, pick last range target
      const lastRange = sorted[sorted.length - 1];
      if (lastRange && lastRange.endAge && age > lastRange.endAge) {
        return lastRange.annualTargetIncome;
      }
      // If age precedes first range startAge, pick first range target
      if (sorted[0] && age < sorted[0].startAge) {
        return sorted[0].annualTargetIncome;
      }
    }

    // Legacy 3-phase fallback
    if (phases.goGoEndAge !== undefined && phases.goGoIncomeAnnual !== undefined) {
      if (age <= phases.goGoEndAge) {
        return phases.goGoIncomeAnnual;
      } else if (phases.slowGoEndAge !== undefined && age <= phases.slowGoEndAge && phases.slowGoIncomeAnnual !== undefined) {
        return phases.slowGoIncomeAnnual;
      } else if (phases.noGoIncomeAnnual !== undefined) {
        return phases.noGoIncomeAnnual;
      }
    }
  }
  return profile.targetRetirementIncomeAnnual;
}

export function getActualSpendingTargetForAge(profile: UserProfile, age: number): number {
  const isReinvest = Boolean(
    profile.reinvestExcessDrawdown ||
    profile.maximizedSpendConfig?.reinvestExcessDrawdown
  );

  if (!isReinvest) {
    return getTargetIncomeForAge(profile, age);
  }

  const maxConfig = profile.maximizedSpendConfig;
  const baselinePhases = maxConfig?.baselineSpendingPhases || profile.spendingPhases;

  if (baselinePhases?.enabled) {
    if (baselinePhases.customRanges && baselinePhases.customRanges.length > 0) {
      const sorted = [...baselinePhases.customRanges].sort((a, b) => a.startAge - b.startAge);
      const match = sorted.find(
        (r) => age >= r.startAge && (r.endAge === undefined || r.endAge === null || r.endAge <= 0 || age <= r.endAge)
      );
      if (match) return match.annualTargetIncome;
      const lastRange = sorted[sorted.length - 1];
      if (lastRange && lastRange.endAge && age > lastRange.endAge) return lastRange.annualTargetIncome;
      if (sorted[0] && age < sorted[0].startAge) return sorted[0].annualTargetIncome;
    }
    if (baselinePhases.goGoEndAge !== undefined && baselinePhases.goGoIncomeAnnual !== undefined) {
      if (age <= baselinePhases.goGoEndAge) return baselinePhases.goGoIncomeAnnual;
      if (baselinePhases.slowGoEndAge !== undefined && age <= baselinePhases.slowGoEndAge && baselinePhases.slowGoIncomeAnnual !== undefined) {
        return baselinePhases.slowGoIncomeAnnual;
      }
      if (baselinePhases.noGoIncomeAnnual !== undefined) return baselinePhases.noGoIncomeAnnual;
    }
  }

  return (
    maxConfig?.actualSpendingTargetAnnual ??
    profile.actualSpendingTargetAnnual ??
    maxConfig?.baselineTargetAnnualIncome ??
    profile.targetRetirementIncomeAnnual ??
    30000
  );
}

export function generateProjections(
  profile: UserProfile,
  pots: InvestmentPots,
  taxResult?: TaxCalculationResult,
  maxAge = 100
): YearProjection[] {
  const projections: YearProjection[] = [];
  const safeCurrentAge = Math.max(18, Math.min(100, profile.currentAge || 30));
  const effectiveMaxAge = Math.max(safeCurrentAge + 1, maxAge || 100);

  const cleanPots = sanitizePots(pots, DEFAULT_POTS);
  const effectiveTaxResult = taxResult || calculateUKTax(profile, cleanPots);
  const partnerPots = sanitizePots(
    profile.partnerPots,
    {
      ...DEFAULT_PARTNER_POTS,
      workplacePensionBalance: profile.partnerWorkplacePensionBalance || DEFAULT_PARTNER_POTS.workplacePensionBalance,
      sippBalance: profile.partnerSippBalance || DEFAULT_PARTNER_POTS.sippBalance,
      stocksAndSharesIsaBalance: profile.partnerIsaBalance || DEFAULT_PARTNER_POTS.stocksAndSharesIsaBalance,
    }
  );

  let primaryPensionPot = cleanPots.workplacePensionBalance + cleanPots.sippBalance;
  let primarySsIsaPot = cleanPots.stocksAndSharesIsaBalance;
  let primaryCashIsaPot = cleanPots.cashIsaBalance;
  let primaryLisaPot = cleanPots.lisaBalance;
  let primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
  let primaryGiaPot = cleanPots.giaBalance;
  let primaryCashSavingsPot = cleanPots.cashSavingsBalance;
  let primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;

  let partnerPensionPot = profile.isCouplePlanning
    ? partnerPots.workplacePensionBalance + partnerPots.sippBalance
    : 0;
  let partnerSsIsaPot = profile.isCouplePlanning ? partnerPots.stocksAndSharesIsaBalance : 0;
  let partnerCashIsaPot = profile.isCouplePlanning ? partnerPots.cashIsaBalance : 0;
  let partnerLisaPot = profile.isCouplePlanning ? partnerPots.lisaBalance : 0;
  let partnerIsaPot = profile.isCouplePlanning
    ? partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot
    : 0;
  let partnerGiaPot = profile.isCouplePlanning
    ? partnerPots.giaBalance
    : 0;
  let partnerCashSavingsPot = profile.isCouplePlanning
    ? partnerPots.cashSavingsBalance
    : 0;
  let partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;

  let primaryUncrystallisedPot = primaryPensionPot;
  let primaryCrystallisedPot = 0;
  let partnerUncrystallisedPot = partnerPensionPot;
  let partnerCrystallisedPot = 0;

  let pensionPot = primaryPensionPot + partnerPensionPot;
  let isaPot = primaryIsaPot + partnerIsaPot;
  let giaPot = primaryGiaPot + partnerGiaPot;
  let cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
  let cashGiaPot = giaPot + cashSavingsPot;

  const inflation = (profile.expectedInflationRate ?? 2.5) / 100;
  const returnAccumulation = getEffectiveAccumulationReturn(profile.expectedInvestmentReturn ?? 6.5, profile.assetAllocationSplit, profile.investmentFees, profile.pots, profile.partnerPots) / 100;
  const returnDecumulation = getEffectiveDecumulationReturn(profile.postRetirementReturn ?? 4.5, profile.assetAllocationSplit, profile.investmentFees, profile.pots, profile.partnerPots) / 100;

  const pensionAccessAge = getPensionAccessAge(profile);
  const lumpSumTakeAge = getLumpSumTakeAge(profile);
  const primaryMaxLsa = getLsaLimit(profile);

  const partnerPensionAccessAge = profile.isCouplePlanning ? getPartnerPensionAccessAge(profile) : 57;
  const partnerLumpSumTakeAge = profile.isCouplePlanning ? getPartnerLumpSumTakeAge(profile) : 57;
  const partnerMaxLsa = profile.isCouplePlanning ? getPartnerLsaLimit(profile) : 268275;

  const partnerTaxResult = profile.isCouplePlanning ? calculatePartnerUKTax(profile, partnerPots) : null;
  let partnerDead = false;

  // Annual contribution totals (regular ongoing recurring contributions; one-offs are added separately by year)
  const annualPensionContribution = effectiveTaxResult.regularPensionContributionsAnnual ?? effectiveTaxResult.totalPensionContributionsAnnual;
  const annualIsaContribution = (effectiveTaxResult.regularIsaContributionsAnnual ?? effectiveTaxResult.totalIsaContributionsAnnual) + effectiveTaxResult.lisaGovernmentBonusAnnual;
  const annualGiaContribution = (cleanPots.giaMonthlyContribution || 0) * 12;
  const annualCashSavingsContribution = (cleanPots.cashSavingsMonthlyContribution || 0) * 12;
  const annualCashGiaContribution = annualGiaContribution + annualCashSavingsContribution;

  const partnerAnnualPensionContrib = partnerTaxResult
    ? (partnerTaxResult.regularPensionContributionsAnnual ?? partnerTaxResult.totalPensionContributionsAnnual)
    : 0;
  const partnerAnnualIsaContrib = partnerTaxResult
    ? ((partnerTaxResult.regularIsaContributionsAnnual ?? partnerTaxResult.totalIsaContributionsAnnual) + partnerTaxResult.lisaGovernmentBonusAnnual)
    : 0;
  const partnerAnnualGiaContrib = partnerTaxResult ? (partnerPots.giaMonthlyContribution || 0) * 12 : 0;
  const partnerAnnualCashSavingsContrib = partnerTaxResult ? (partnerPots.cashSavingsMonthlyContribution || 0) * 12 : 0;
  const partnerAnnualCashGiaContrib = partnerAnnualGiaContrib + partnerAnnualCashSavingsContrib;

  let depletionAge: number | undefined = undefined;

  // Track annuity, PCLS, and cumulative excess state across timeline
  let annuityPurchasedPrimary = false;
  let annuityPurchasedPartner = false;
  let pclsTaken = false;
  let partnerPclsTaken = false;
  let cumulativeExcessIncome = 0;

  // Dual individual LSA tracking for primary and partner
  let primaryCumulativeTaxFreeDrawn = 0;
  let partnerCumulativeTaxFreeDrawn = 0;

  // Property Downsizing Tracker
  let currentPropertyValue = profile.propertyDownsizePlan?.enabled ? profile.propertyDownsizePlan.currentPropertyValue : 0;
  let hasDownsized = false;

  // Gilt Ladder Setup & Tracking (Primary & Partner)
  const giltLadderConfig = profile.giltLadderConfig;
  const isGiltLadderEnabled = Boolean(giltLadderConfig && giltLadderConfig.enabled);
  const giltLadderSummary = isGiltLadderEnabled
    ? calculateGiltLadder({ ...giltLadderConfig!, owner: 'primary' }, profile, cleanPots)
    : null;
  let giltLadderPurchased = false;

  const partnerGiltLadderConfig = profile.isCouplePlanning ? profile.partnerGiltLadderConfig : undefined;
  const isPartnerGiltLadderEnabled = Boolean(profile.isCouplePlanning && partnerGiltLadderConfig && partnerGiltLadderConfig.enabled);
  const partnerGiltLadderSummary = isPartnerGiltLadderEnabled
    ? calculateGiltLadder({ ...partnerGiltLadderConfig!, owner: 'partner' }, profile, partnerPots)
    : null;
  let partnerGiltLadderPurchased = false;

  const isScottishTax = profile.taxRegion === 'scotland';
  const isPartnerScottishTax = (profile.partnerTaxRegion || profile.taxRegion) === 'scotland';
  const indexTaxBands = profile.indexTaxBands ?? true;

  const computeIncomeTax = (grossTaxableIncome: number, inflationMult: number, isScottish: boolean = isScottishTax): number => {
    if (grossTaxableIncome <= 0) return 0;

    if (!indexTaxBands) {
      // Frozen tax bands: grossTaxableIncome is in nominal £.
      const { tax: nominalTax } = computeIncomeTaxOnAmount(grossTaxableIncome, isScottish, profile.customTaxBands);
      return nominalTax;
    } else {
      // Indexed tax bands: scale back to base-year money, compute tax against base bands, scale forward.
      const baseYearGross = grossTaxableIncome / inflationMult;
      const { tax: nominalTax } = computeIncomeTaxOnAmount(baseYearGross, isScottish, profile.customTaxBands);
      return nominalTax * inflationMult;
    }
  };

function parseAnnuityTypeConfig(type?: string) {
  const str = type || '';
  const isInflationLinked = str.includes('inflation_linked');
  let fixedEscalationRate: number | undefined = undefined;
  if (str.includes('_3')) {
    fixedEscalationRate = 0.03;
  } else if (str.includes('_5')) {
    fixedEscalationRate = 0.05;
  }
  return { isInflationLinked, fixedEscalationRate };
}

  interface ActiveAnnuityStream {
    id: string;
    baseNominal: number;
    isInflationLinked: boolean;
    fixedEscalationRate?: number;
    durationOption: string;
    durationUntilAge?: number;
    owner: 'primary' | 'partner';
    purchaseInflationFactor: number;
    purchaseYearOffset: number;
  }

  const activeAnnuityStreams: ActiveAnnuityStream[] = [];

  for (let age = safeCurrentAge; age <= effectiveMaxAge; age++) {
    let propertyDownsizeEquityReleasedThisYear = 0;
    const yearOffset = age - profile.currentAge;
    const inflationFactor = Math.pow(1 + inflation, yearOffset);
    const calendarYear = new Date().getFullYear() + yearOffset;
    const isRetired = age >= profile.targetRetirementAge;
    const isPhasedPrimary = profile.crystallisationMode === 'phased_tranches';
    const isPhasedPartner = profile.partnerCrystallisationMode === 'phased_tranches';

    const canAccessPension = age >= pensionAccessAge || primaryCrystallisedPot > 0 || (isPhasedPrimary && (profile.crystallisationTranches || []).some((t) => t.enabled && t.age <= age && (t.owner || 'primary') !== 'partner'));

    const partnerAge = profile.isCouplePlanning
      ? age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge)
      : age;
    const partnerCanAccessPension = partnerAge >= partnerPensionAccessAge || partnerCrystallisedPot > 0 || (isPhasedPartner && (profile.partnerCrystallisationTranches || profile.crystallisationTranches || []).some((t) => t.enabled && t.age <= partnerAge && t.owner === 'partner'));

    // Property Downsizing Event
    if (profile.propertyDownsizePlan?.enabled && !hasDownsized && age >= profile.propertyDownsizePlan.downsizeAge) {
      const plan = profile.propertyDownsizePlan;
      
      // Calculate SDLT on the new property (inflated to today's nominal terms using general inflation)
      const targetNewPropertyCostNominal = plan.targetNewPropertyCostToday * inflationFactor;
      const stampDuty = calculateUKStampDuty(targetNewPropertyCostNominal, plan.stampDutySecondHomeSurcharge);
      
      // Calculate selling costs on the current property
      const sellingCosts = currentPropertyValue * (plan.sellingCostsPercent / 100);
      
      // Deduct any outstanding mortgage balance if the user opted to NOT pay it off at retirement, OR if downsize age is BEFORE retirement
      let outstandingMortgageToClear = 0;
      if (profile.mortgage?.enabled) {
        // Find remaining balance. The mortgage module is normally handled in insights or manually via spending,
        // but here we must capture the snapshot of remaining principal.
        // Assuming the user's spending target already accounts for mortgage payments, we just need to settle the principal.
        // Since we don't have a live mortgage tracker in the loop yet, we'll estimate the remaining balance linearly.
        const monthsPassed = (age - profile.currentAge) * 12;
        const totalTermMonths = (profile.mortgage.remainingTermYears * 12) + (profile.mortgage.remainingTermMonths || 0);
        if (monthsPassed < totalTermMonths && !(profile.mortgage.payoffAtRetirement && age >= profile.targetRetirementAge)) {
           // Basic linear approximation of remaining principal for the downsize snapshot
           const ratioRemaining = 1 - (monthsPassed / totalTermMonths);
           outstandingMortgageToClear = profile.mortgage.currentBalance * ratioRemaining;
        }
      }

      // Calculate Net Equity
      const netEquityReleased = currentPropertyValue - outstandingMortgageToClear - targetNewPropertyCostNominal - stampDuty - sellingCosts;

      // Inject Equity
      if (netEquityReleased > 0) {
        propertyDownsizeEquityReleasedThisYear = netEquityReleased;
        const splitRatio = profile.isCouplePlanning && !partnerDead ? 0.5 : 1;
        const primaryShare = netEquityReleased * splitRatio;
        const partnerShare = netEquityReleased - primaryShare;

        if (plan.destinationPot === 'isa') {
          // Add to S&S ISA specifically, as well as the aggregate ISA pot tracking variable
          primarySsIsaPot += primaryShare;
          primaryIsaPot += primaryShare;
          if (partnerShare > 0) {
            partnerSsIsaPot += partnerShare;
            partnerIsaPot += partnerShare;
          }
        } else if (plan.destinationPot === 'cash') {
          primaryCashSavingsPot += primaryShare;
          if (partnerShare > 0) partnerCashSavingsPot += partnerShare;
        } else if (plan.destinationPot === 'cash_isa') {
          primaryCashIsaPot += primaryShare;
          primaryIsaPot += primaryShare;
          if (partnerShare > 0) {
            partnerCashIsaPot += partnerShare;
            partnerIsaPot += partnerShare;
          }
        } else {
          primaryGiaPot += primaryShare;
          if (partnerShare > 0) partnerGiaPot += partnerShare;
        }
      }
      
      hasDownsized = true;
    }

    // Partner Mortality Inheritance
    if (profile.isCouplePlanning && !partnerDead && partnerAge >= (profile.partnerLifeExpectancyAge || 95)) {
      partnerDead = true;
      
      // Issue 4 Fix: Inherited pension must not generate further PCLS for the beneficiary.
      // By forcing all inherited pension into primaryCrystallisedPot, we prevent the primary from
      // extracting a further 25% tax-free lump sum from it.
      primaryPensionPot += partnerPensionPot;
      primaryCrystallisedPot += partnerPensionPot;
      
      partnerPensionPot = 0;
      partnerUncrystallisedPot = 0;
      partnerCrystallisedPot = 0;

      primaryIsaPot += partnerIsaPot;
      primarySsIsaPot += partnerSsIsaPot;
      partnerIsaPot = 0;
      partnerSsIsaPot = 0;

      primaryCashGiaPot += partnerCashGiaPot;
      primaryGiaPot += partnerGiaPot;
      primaryCashSavingsPot += partnerCashSavingsPot;
      partnerCashGiaPot = 0;
      partnerGiaPot = 0;
      partnerCashSavingsPot = 0;
    }

    const primaryPensionPotBeforePcls = Math.round(primaryPensionPot);
    const partnerPensionPotBeforePcls = Math.round(partnerPensionPot);

    let primaryCrystallisedThisYear = 0;
    let partnerCrystallisedThisYear = 0;
    let primaryPclsDrawnThisYear = 0;
    let partnerPclsDrawnThisYear = 0;
    let primaryPclsSpentOrDebt = 0;
    let partnerPclsSpentOrDebt = 0;

    const isUpfrontPrimary = (profile.crystallisationMode === 'upfront') || (!profile.crystallisationMode && profile.takeLumpSumAtStart);
    const isUpfrontPartner = (profile.partnerCrystallisationMode === 'upfront') || (!profile.partnerCrystallisationMode && (profile.partnerTakeLumpSumAtStart ?? profile.takeLumpSumAtStart));

    // 1. Phased Crystallisation Tranches - Primary
    const primaryActiveTranches = isPhasedPrimary
      ? (profile.crystallisationTranches || []).filter(
          (t) => t.enabled && t.age === age && t.owner !== 'partner'
        )
      : [];
    if (primaryUncrystallisedPot > 0 && primaryActiveTranches.length > 0) {
      for (const tranche of primaryActiveTranches) {
        if (primaryUncrystallisedPot <= 0) break;
        const requestedGross = tranche.amount;
        const pclsPct = Math.min(25, Math.max(0, tranche.pclsPercent ?? 25)) / 100;
        const remainingLsa = Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn);
        const grossCrystallised = Math.min(primaryUncrystallisedPot, requestedGross);
        if (grossCrystallised <= 0) continue;

        const pclsAmount = Math.min(grossCrystallised * pclsPct, remainingLsa);
        const crystallisedDrawdownRemaining = Math.max(0, grossCrystallised - pclsAmount);

        primaryCrystallisedPot += crystallisedDrawdownRemaining;
        primaryUncrystallisedPot -= grossCrystallised;
        primaryCumulativeTaxFreeDrawn += pclsAmount;
        primaryCrystallisedThisYear += grossCrystallised;
        primaryPclsDrawnThisYear += pclsAmount;

        primaryPensionPot = primaryUncrystallisedPot + primaryCrystallisedPot;

        // Route PCLS cash into chosen target pot / splits
        if (pclsAmount > 0) {
          const alloc = allocateLumpSumToPots(pclsAmount, tranche.targetPot || profile.lumpSumTargetPot, tranche.splits || profile.lumpSumSplits);
          if (!isRetired) {
            primaryIsaPot += alloc.toIsa;
            primarySsIsaPot += alloc.toSsIsa;
            primaryCashIsaPot += alloc.toCashIsa;
            primaryGiaPot += alloc.toGia;
            primaryCashSavingsPot += alloc.toCashSavings;
            primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;
          }
          primaryPclsSpentOrDebt += alloc.spentOrDebt;
        }
      }
      pensionPot = primaryPensionPot + partnerPensionPot;
      isaPot = primaryIsaPot + partnerIsaPot;
      giaPot = primaryGiaPot + partnerGiaPot;
      cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
      cashGiaPot = giaPot + cashSavingsPot;
    }

    // 2. Phased Crystallisation Tranches - Partner
    const partnerActiveTranches = isPhasedPartner
      ? (profile.partnerCrystallisationTranches || profile.crystallisationTranches || []).filter(
          (t) => t.enabled && t.age === partnerAge && t.owner === 'partner'
        )
      : [];
    if (profile.isCouplePlanning && !partnerDead && partnerUncrystallisedPot > 0 && partnerActiveTranches.length > 0) {
      for (const tranche of partnerActiveTranches) {
        if (partnerUncrystallisedPot <= 0) break;
        const requestedGross = tranche.amount;
        const pclsPct = Math.min(25, Math.max(0, tranche.pclsPercent ?? 25)) / 100;
        const remainingLsa = Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn);
        const grossCrystallised = Math.min(partnerUncrystallisedPot, requestedGross);
        if (grossCrystallised <= 0) continue;

        const pclsAmount = Math.min(grossCrystallised * pclsPct, remainingLsa);
        const crystallisedDrawdownRemaining = Math.max(0, grossCrystallised - pclsAmount);

        partnerCrystallisedPot += crystallisedDrawdownRemaining;
        partnerUncrystallisedPot -= grossCrystallised;
        partnerCumulativeTaxFreeDrawn += pclsAmount;
        partnerCrystallisedThisYear += grossCrystallised;
        partnerPclsDrawnThisYear += pclsAmount;

        partnerPensionPot = partnerUncrystallisedPot + partnerCrystallisedPot;

        if (pclsAmount > 0) {
          const alloc = allocateLumpSumToPots(pclsAmount, tranche.targetPot || profile.partnerLumpSumTargetPot, tranche.splits || profile.partnerLumpSumSplits);
          if (!isRetired) {
            partnerIsaPot += alloc.toIsa;
            partnerSsIsaPot += alloc.toSsIsa;
            partnerCashIsaPot += alloc.toCashIsa;
            partnerGiaPot += alloc.toGia;
            partnerCashSavingsPot += alloc.toCashSavings;
            partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;
          }
          partnerPclsSpentOrDebt += alloc.spentOrDebt;
        }
      }
      pensionPot = primaryPensionPot + partnerPensionPot;
      isaPot = primaryIsaPot + partnerIsaPot;
      giaPot = primaryGiaPot + partnerGiaPot;
      cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
      cashGiaPot = giaPot + cashSavingsPot;
    }

    // 3. Upfront Tax-Free Lump Sum (PCLS) extraction for Primary
    if (
      isUpfrontPrimary &&
      !pclsTaken &&
      age >= lumpSumTakeAge &&
      canAccessPension &&
      primaryPensionPot > 0 &&
      !annuityPurchasedPrimary &&
      (profile.pclsLumpSumPercent ?? 25) > 0
    ) {
      const lumpSumPercent = Math.min(25, profile.pclsLumpSumPercent ?? 25) / 100;
      const pclsAmount = Math.min(primaryPensionPot * lumpSumPercent, Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn));
      
      const crystallisedTotal = Math.min(primaryPensionPot, pclsAmount * 4);
      const crystallisedDrawdownRemaining = Math.max(0, crystallisedTotal - pclsAmount);

      primaryCrystallisedPot += crystallisedDrawdownRemaining;
      primaryUncrystallisedPot = Math.max(0, primaryPensionPot - crystallisedTotal);
      primaryCumulativeTaxFreeDrawn += pclsAmount;
      primaryCrystallisedThisYear += crystallisedTotal;
      primaryPclsDrawnThisYear += pclsAmount;

      primaryPensionPot -= pclsAmount;

      // Add PCLS into Primary's chosen target pots / splits
      const primaryAlloc = allocateLumpSumToPots(pclsAmount, profile.lumpSumTargetPot, profile.lumpSumSplits);
      primaryIsaPot += primaryAlloc.toIsa;
      primarySsIsaPot += primaryAlloc.toSsIsa;
      primaryCashIsaPot += primaryAlloc.toCashIsa;
      primaryGiaPot += primaryAlloc.toGia;
      primaryCashSavingsPot += primaryAlloc.toCashSavings;
      primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;
      primaryPclsSpentOrDebt += primaryAlloc.spentOrDebt;

      pensionPot = primaryPensionPot + partnerPensionPot;
      isaPot = primaryIsaPot + partnerIsaPot;
      giaPot = primaryGiaPot + partnerGiaPot;
      cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
      cashGiaPot = giaPot + cashSavingsPot;
      pclsTaken = true;
    }

    // 4. Upfront Tax-Free Lump Sum (PCLS) extraction for Partner
    if (
      profile.isCouplePlanning &&
      isUpfrontPartner &&
      !partnerPclsTaken &&
      partnerAge >= partnerLumpSumTakeAge &&
      partnerCanAccessPension &&
      partnerPensionPot > 0 &&
      !annuityPurchasedPartner &&
      (profile.partnerPclsLumpSumPercent ?? 25) > 0
    ) {
      const partnerLumpSumPercent = Math.min(25, profile.partnerPclsLumpSumPercent ?? 25) / 100;
      const partnerPclsAmount = Math.min(partnerPensionPot * partnerLumpSumPercent, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
      
      const crystallisedTotal = Math.min(partnerPensionPot, partnerPclsAmount * 4);
      const crystallisedDrawdownRemaining = Math.max(0, crystallisedTotal - partnerPclsAmount);

      partnerCrystallisedPot += crystallisedDrawdownRemaining;
      partnerUncrystallisedPot = Math.max(0, partnerPensionPot - crystallisedTotal);
      partnerCumulativeTaxFreeDrawn += partnerPclsAmount;
      partnerCrystallisedThisYear += crystallisedTotal;
      partnerPclsDrawnThisYear += partnerPclsAmount;

      partnerPensionPot -= partnerPclsAmount;

      // Add Partner PCLS into Partner's chosen target pots / splits
      const partnerAlloc = allocateLumpSumToPots(partnerPclsAmount, profile.partnerLumpSumTargetPot, profile.partnerLumpSumSplits);
      partnerIsaPot += partnerAlloc.toIsa;
      partnerSsIsaPot += partnerAlloc.toSsIsa;
      partnerCashIsaPot += partnerAlloc.toCashIsa;
      partnerGiaPot += partnerAlloc.toGia;
      partnerCashSavingsPot += partnerAlloc.toCashSavings;
      partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;
      partnerPclsSpentOrDebt += partnerAlloc.spentOrDebt;

      pensionPot = primaryPensionPot + partnerPensionPot;
      isaPot = primaryIsaPot + partnerIsaPot;
      giaPot = primaryGiaPot + partnerGiaPot;
      cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
      cashGiaPot = giaPot + cashSavingsPot;
      partnerPclsTaken = true;
    }

    // Defined Benefit (DB) pensions processing
    const activeDbPensions = (profile.dbPensions || []).filter((p) => p.enabled);
    let primaryDbPensionReceived = 0;
    let partnerDbPensionReceived = 0;
    let dbTaxFreeLumpSumReceived = 0;

    activeDbPensions.forEach((db) => {
      const isPartner = db.owner === 'partner';
      if (isPartner && (!profile.isCouplePlanning || partnerDead)) return;

      const evalAge = isPartner
        ? age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge)
        : age;

      const isStartAgeReached = evalAge >= db.startAge;
      const isUntilAge = db.durationOption === 'until_age' || (db.endAge !== undefined && db.endAge > 0);
      const isBeforeEndAge = !isUntilAge || (db.endAge !== undefined && evalAge <= db.endAge);

      if (isStartAgeReached && isBeforeEndAge) {
        const dbIncome = db.inflationLinked
          ? db.annualIncome * inflationFactor
          : db.annualIncome;
        if (isPartner) partnerDbPensionReceived += dbIncome;
        else primaryDbPensionReceived += dbIncome;
      }
      if (evalAge === db.startAge && db.taxFreeLumpSum > 0) {
        const lumpSumInflated = db.taxFreeLumpSum * inflationFactor;
        dbTaxFreeLumpSumReceived += lumpSumInflated;
        if (profile.isCouplePlanning && isPartner) {
          partnerCumulativeTaxFreeDrawn += lumpSumInflated;
        } else {
          primaryCumulativeTaxFreeDrawn += lumpSumInflated;
        }
        const target = db.targetPot || 'cash_savings';
        if (target !== 'spend_clear_debt') {
          const isIsaTarget = target === 'stocks_and_shares_isa' || target === 'cash_isa' || target === 'lisa';
          const isGiaTarget = target === 'gia';
          if (profile.isCouplePlanning && isPartner) {
            if (isIsaTarget) {
              partnerIsaPot += lumpSumInflated;
              partnerSsIsaPot += lumpSumInflated;
            } else if (isGiaTarget) {
              partnerGiaPot += lumpSumInflated;
              partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;
            } else {
              partnerCashSavingsPot += lumpSumInflated;
              partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;
            }
          } else {
            if (isIsaTarget) {
              primaryIsaPot += lumpSumInflated;
              primarySsIsaPot += lumpSumInflated;
            } else if (isGiaTarget) {
              primaryGiaPot += lumpSumInflated;
              primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;
            } else {
              primaryCashSavingsPot += lumpSumInflated;
              primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;
            }
          }
        }
        isaPot = primaryIsaPot + partnerIsaPot;
        giaPot = primaryGiaPot + partnerGiaPot;
        cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
        cashGiaPot = giaPot + cashSavingsPot;
      }
    });

    const dbPensionIncomeReceived = primaryDbPensionReceived + partnerDbPensionReceived;

    // Add annual regular monthly contributions for current year into pots prior to custom lump sums and transfers
    const primaryTaxThisYr = calculateUKTax(profile, cleanPots, false, age);
    const partnerAgeForYr = profile.isCouplePlanning
      ? age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge)
      : undefined;
    const partnerTaxThisYr = (profile.isCouplePlanning && partnerAgeForYr !== undefined)
      ? calculatePartnerUKTax(profile, partnerPots, partnerAgeForYr)
      : null;

    const primaryPensionContribThisYr = !isRetired
      ? (primaryTaxThisYr.regularPensionContributionsAnnual ?? primaryTaxThisYr.totalPensionContributionsAnnual)
      : 0;
    const primaryTotalIsaContribs = primaryTaxThisYr.totalIsaContributionsAnnual || 0;
    const primaryRegSsIsaContrib = primaryTaxThisYr.regularSsIsaContributionsAnnual ?? 
                                   (primaryTaxThisYr.regularIsaContributionsAnnual ?? primaryTotalIsaContribs);
    const primaryRegCashIsaContrib = primaryTaxThisYr.regularCashIsaContributionsAnnual ?? 0;
    const primaryRegLisaContrib = primaryTaxThisYr.regularLisaContributionsAnnual ?? 0;
    
    const primarySsIsaContribThisYr = !isRetired ? primaryRegSsIsaContrib : 0;
    const primaryCashIsaContribThisYr = !isRetired ? primaryRegCashIsaContrib : 0;
    const primaryLisaContribThisYr = !isRetired ? (primaryRegLisaContrib + primaryTaxThisYr.lisaGovernmentBonusAnnual) : 0;
    const primaryIsaContribThisYr = primarySsIsaContribThisYr + primaryCashIsaContribThisYr + primaryLisaContribThisYr;
    const primaryCashGiaPotContribThisYr = !isRetired
      ? (primaryTaxThisYr.regularCashGiaContributionsAnnual ?? primaryTaxThisYr.totalCashGiaContributionsAnnual)
      : 0;
    // Split contributions into separate GIA and Cash Savings pots
    const primaryGiaContribThisYr = !isRetired ? (primaryTaxThisYr.regularGiaContributionsAnnual ?? 0) : 0;
    const primaryCashSavingsContribThisYr = !isRetired ? (primaryTaxThisYr.regularCashSavingsContributionsAnnual ?? 0) : 0;

    let partnerPContribThisYr = 0;
    let partnerIContribThisYr = 0;
    let partnerSsIContribThisYr = 0;
    let partnerCashIContribThisYr = 0;
    let partnerLisaContribThisYr = 0;
    let partnerCContribThisYr = 0;
    let partnerGiaContribThisYr = 0;
    let partnerCashSavingsContribThisYr = 0;

    const partnerRetireAge = profile.partnerTargetRetirementAge ?? 60;
    if (profile.isCouplePlanning && partnerTaxThisYr && partnerAgeForYr !== undefined) {
      const partnerRetireAge = profile.partnerTargetRetirementAge ?? 60;
      if (partnerAgeForYr < partnerRetireAge) {
        partnerPContribThisYr = partnerTaxThisYr.regularPensionContributionsAnnual ?? partnerTaxThisYr.totalPensionContributionsAnnual;
        const partnerTotalIsaContribs = partnerTaxThisYr.totalIsaContributionsAnnual || 0;
        const partnerRegSsIsaContrib = partnerTaxThisYr.regularSsIsaContributionsAnnual ?? 
                                       (partnerTaxThisYr.regularIsaContributionsAnnual ?? partnerTotalIsaContribs);
        const partnerRegCashIsaContrib = partnerTaxThisYr.regularCashIsaContributionsAnnual ?? 0;
        const partnerRegLisaContrib = partnerTaxThisYr.regularLisaContributionsAnnual ?? 0;
        
        partnerSsIContribThisYr = partnerRegSsIsaContrib;
        partnerCashIContribThisYr = partnerRegCashIsaContrib;
        partnerLisaContribThisYr = partnerRegLisaContrib + partnerTaxThisYr.lisaGovernmentBonusAnnual;
        partnerIContribThisYr = partnerSsIContribThisYr + partnerCashIContribThisYr + partnerLisaContribThisYr;
        partnerCContribThisYr = partnerTaxThisYr.regularCashGiaContributionsAnnual ?? partnerTaxThisYr.totalCashGiaContributionsAnnual;
        partnerGiaContribThisYr = partnerTaxThisYr.regularGiaContributionsAnnual ?? 0;
        partnerCashSavingsContribThisYr = partnerTaxThisYr.regularCashSavingsContributionsAnnual ?? 0;
      }
    }

    primaryUncrystallisedPot += primaryPensionContribThisYr;
    primaryPensionPot += primaryPensionContribThisYr;
    primarySsIsaPot += primarySsIsaContribThisYr;
    primaryCashIsaPot += primaryCashIsaContribThisYr;
    primaryLisaPot += primaryLisaContribThisYr;
    primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
    primaryGiaPot += primaryGiaContribThisYr;
    primaryCashSavingsPot += primaryCashSavingsContribThisYr;
    primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;

    if (profile.isCouplePlanning) {
      partnerUncrystallisedPot += partnerPContribThisYr;
      partnerPensionPot += partnerPContribThisYr;
      partnerSsIsaPot += partnerSsIContribThisYr;
      partnerCashIsaPot += partnerCashIContribThisYr;
      partnerLisaPot += partnerLisaContribThisYr;
      partnerIsaPot = partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot;
      partnerGiaPot += partnerGiaContribThisYr;
      partnerCashSavingsPot += partnerCashSavingsContribThisYr;
      partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;
    }

    pensionPot = primaryPensionPot + partnerPensionPot;
    isaPot = primaryIsaPot + partnerIsaPot;
    giaPot = primaryGiaPot + partnerGiaPot;
    cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
    cashGiaPot = giaPot + cashSavingsPot;

    // Process One-Off Gross Lump Sum Contributions for this calendar year
    const activeOneOffs = (profile.oneOffContributions || []).filter((c) => c.enabled && c.frequency !== 'regular_monthly');
    let oneOffInflowsThisYear = 0;
    let primaryLisaContribsThisYear = !isRetired && primaryTaxThisYr ? (primaryTaxThisYr.lisaGovernmentBonusAnnual * 4) : 0;
    let partnerLisaContribsThisYear = profile.isCouplePlanning && partnerAgeForYr < partnerRetireAge && partnerTaxThisYr ? (partnerTaxThisYr.lisaGovernmentBonusAnnual * 4) : 0;

    activeOneOffs.forEach((contrib) => {
      const isPartner = contrib.owner === 'partner';
      if (isPartner && !profile.isCouplePlanning) return;

      let contribYear: number | undefined;
      if (contrib.date) {
        contribYear = parseInt(contrib.date.split('-')[0], 10);
      }

      if (contribYear !== undefined && !isNaN(contribYear) && contribYear === calendarYear) {
        const gross = contrib.grossAmount || 0;
        if (gross > 0) {
          oneOffInflowsThisYear += gross;
          if (contrib.targetPot === 'workplace_pension') {
            if (isPartner) {
              partnerPensionPot += gross;
              partnerUncrystallisedPot += gross;
            } else {
              primaryPensionPot += gross;
              primaryUncrystallisedPot += gross;
            }
          } else if (contrib.targetPot === 'sipp') {
            const sippGross = contrib.sippContributionType === 'gross' ? gross : gross * 1.25;
            if (isPartner) {
              partnerPensionPot += sippGross;
              partnerUncrystallisedPot += sippGross;
            } else {
              primaryPensionPot += sippGross;
              primaryUncrystallisedPot += sippGross;
            }
          } else if (contrib.targetPot === 'stocks_and_shares_isa') {
            if (isPartner) {
              partnerSsIsaPot += gross;
              partnerIsaPot = partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot;
            } else {
              primarySsIsaPot += gross;
              primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
            }
          } else if (contrib.targetPot === 'cash_isa') {
            if (isPartner) {
              partnerCashIsaPot += gross;
              partnerIsaPot = partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot;
            } else {
              primaryCashIsaPot += gross;
              primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
            }
          } else if (contrib.targetPot === 'lisa') {
            let bonus = 0;
            if (isPartner) {
              const eligible = Math.max(0, 4000 - partnerLisaContribsThisYear);
              const eligibleContrib = Math.min(gross, eligible);
              bonus = eligibleContrib * 0.25;
              partnerLisaContribsThisYear += eligibleContrib;
              partnerLisaPot += gross + bonus;
              partnerIsaPot = partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot;
            } else {
              const eligible = Math.max(0, 4000 - primaryLisaContribsThisYear);
              const eligibleContrib = Math.min(gross, eligible);
              bonus = eligibleContrib * 0.25;
              primaryLisaContribsThisYear += eligibleContrib;
              primaryLisaPot += gross + bonus;
              primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
            }
          } else if (contrib.targetPot === 'gia') {
            if (isPartner) {
              partnerGiaPot += gross;
              partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;
            } else {
              primaryGiaPot += gross;
              primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;
            }
          } else if (contrib.targetPot === 'cash_savings') {
            if (isPartner) {
              partnerCashSavingsPot += gross;
              partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;
            } else {
              primaryCashSavingsPot += gross;
              primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;
            }
          }
        }
      }
    });

    pensionPot = primaryPensionPot + partnerPensionPot;
    isaPot = primaryIsaPot + partnerIsaPot;
    cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;

    // Process Investment Pot Transfers for this calendar year or age
    const activeTransfers = (profile.potTransfers || []).filter((t) => t.enabled);
    activeTransfers.forEach((transfer) => {
      const isSrcPartner = (transfer.owner || 'primary') === 'partner';
      const isDstPartner = (transfer.destinationOwner || transfer.owner || 'primary') === 'partner';
      if ((isSrcPartner || isDstPartner) && !profile.isCouplePlanning) return;

      let match = false;
      if (transfer.transferDate) {
        const transferYear = parseInt(transfer.transferDate.split('-')[0], 10);
        if (!isNaN(transferYear) && transferYear === calendarYear) {
          match = true;
        }
      } else if (transfer.transferAge !== undefined && transfer.transferAge > 0) {
        const evalAge = isSrcPartner ? partnerAge : age;
        if (evalAge === transfer.transferAge) {
          match = true;
        }
      }

      if (match) {
        // Deduct from Source Pot
        const srcIsPension = transfer.sourcePot === 'workplace_pension' || transfer.sourcePot === 'sipp';
        const srcIsSsIsa = transfer.sourcePot === 'stocks_and_shares_isa';
        const srcIsCashIsa = transfer.sourcePot === 'cash_isa';
        const srcIsLisa = transfer.sourcePot === 'lisa';
        const srcIsIsa = srcIsSsIsa || srcIsCashIsa || srcIsLisa;
        const srcIsGia = transfer.sourcePot === 'gia';
        const srcIsCashSavings = transfer.sourcePot === 'cash_savings';

        let availableSrc = 0;
        if (isSrcPartner) {
          availableSrc = srcIsPension ? partnerPensionPot : srcIsSsIsa ? partnerSsIsaPot : srcIsCashIsa ? partnerCashIsaPot : srcIsLisa ? partnerLisaPot : srcIsGia ? partnerGiaPot : srcIsCashSavings ? partnerCashSavingsPot : 0;
        } else {
          availableSrc = srcIsPension ? primaryPensionPot : srcIsSsIsa ? primarySsIsaPot : srcIsCashIsa ? primaryCashIsaPot : srcIsLisa ? primaryLisaPot : srcIsGia ? primaryGiaPot : srcIsCashSavings ? primaryCashSavingsPot : 0;
        }

        const requestedTransfer = (transfer.amount != null && transfer.amount > 0) ? transfer.amount : availableSrc;
        const actualTransfer = Math.min(requestedTransfer, Math.max(0, availableSrc));

        if (actualTransfer > 0) {
          // Subtract from source
          if (isSrcPartner) {
            if (srcIsPension) {
              partnerPensionPot = Math.max(0, partnerPensionPot - actualTransfer);
              partnerUncrystallisedPot = Math.max(0, partnerUncrystallisedPot - actualTransfer);
            } else if (srcIsSsIsa) {
              partnerSsIsaPot = Math.max(0, partnerSsIsaPot - actualTransfer);
              partnerIsaPot = partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot;
            } else if (srcIsCashIsa) {
              partnerCashIsaPot = Math.max(0, partnerCashIsaPot - actualTransfer);
              partnerIsaPot = partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot;
            } else if (srcIsLisa) {
              partnerLisaPot = Math.max(0, partnerLisaPot - actualTransfer);
              partnerIsaPot = partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot;
            } else if (srcIsGia) {
              partnerGiaPot = Math.max(0, partnerGiaPot - actualTransfer);
            } else if (srcIsCashSavings) {
              partnerCashSavingsPot = Math.max(0, partnerCashSavingsPot - actualTransfer);
            }
          } else {
            if (srcIsPension) {
              primaryPensionPot = Math.max(0, primaryPensionPot - actualTransfer);
              primaryUncrystallisedPot = Math.max(0, primaryUncrystallisedPot - actualTransfer);
            } else if (srcIsSsIsa) {
              primarySsIsaPot = Math.max(0, primarySsIsaPot - actualTransfer);
              primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
            } else if (srcIsCashIsa) {
              primaryCashIsaPot = Math.max(0, primaryCashIsaPot - actualTransfer);
              primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
            } else if (srcIsLisa) {
              primaryLisaPot = Math.max(0, primaryLisaPot - actualTransfer);
              primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
            } else if (srcIsGia) {
              primaryGiaPot = Math.max(0, primaryGiaPot - actualTransfer);
            } else if (srcIsCashSavings) {
              primaryCashSavingsPot = Math.max(0, primaryCashSavingsPot - actualTransfer);
            }
          }

          // Add to destination
          const dstIsSipp = transfer.destinationPot === 'sipp';
          const dstIsWorkplace = transfer.destinationPot === 'workplace_pension';
          const dstIsPension = dstIsSipp || dstIsWorkplace;
          const dstIsSsIsa = transfer.destinationPot === 'stocks_and_shares_isa';
          const dstIsCashIsa = transfer.destinationPot === 'cash_isa';
          const dstIsLisa = transfer.destinationPot === 'lisa';
          const dstIsGia = transfer.destinationPot === 'gia';
          const dstIsCashSavings = transfer.destinationPot === 'cash_savings';

          let addedAmount = actualTransfer;
          if (dstIsSipp && !srcIsPension) {
            addedAmount = actualTransfer * 1.25; // 20% UK tax relief bonus
          } else if (dstIsLisa) {
            let bonus = 0;
            const dstOwnerAge = isDstPartner ? partnerAge : age;
            const srcIsLisa = transfer.sourcePot === 'lisa';
            if (dstOwnerAge < 50 && !srcIsLisa) {
              if (isDstPartner) {
                const eligible = Math.max(0, 4000 - partnerLisaContribsThisYear);
                const eligibleContrib = Math.min(actualTransfer, eligible);
                bonus = eligibleContrib * 0.25;
                partnerLisaContribsThisYear += eligibleContrib;
              } else {
                const eligible = Math.max(0, 4000 - primaryLisaContribsThisYear);
                const eligibleContrib = Math.min(actualTransfer, eligible);
                bonus = eligibleContrib * 0.25;
                primaryLisaContribsThisYear += eligibleContrib;
              }
            }
            addedAmount = actualTransfer + bonus;
          }

          if (isDstPartner) {
            if (dstIsPension) {
              partnerPensionPot += addedAmount;
              partnerUncrystallisedPot += addedAmount;
            } else if (dstIsSsIsa) {
              partnerSsIsaPot += addedAmount;
              partnerIsaPot = partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot;
            } else if (dstIsCashIsa) {
              partnerCashIsaPot += addedAmount;
              partnerIsaPot = partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot;
            } else if (dstIsLisa) {
              partnerLisaPot += addedAmount;
              partnerIsaPot = partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot;
            } else if (dstIsGia) {
              partnerGiaPot += addedAmount;
            } else if (dstIsCashSavings) {
              partnerCashSavingsPot += addedAmount;
            }
          } else {
            if (dstIsPension) {
              primaryPensionPot += addedAmount;
              primaryUncrystallisedPot += addedAmount;
            } else if (dstIsSsIsa) {
              primarySsIsaPot += addedAmount;
              primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
            } else if (dstIsCashIsa) {
              primaryCashIsaPot += addedAmount;
              primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
            } else if (dstIsLisa) {
              primaryLisaPot += addedAmount;
              primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
            } else if (dstIsGia) {
              primaryGiaPot += addedAmount;
            } else if (dstIsCashSavings) {
              primaryCashSavingsPot += addedAmount;
            }
          }

          primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;
          partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;

          pensionPot = primaryPensionPot + partnerPensionPot;
          isaPot = primaryIsaPot + partnerIsaPot;
          giaPot = primaryGiaPot + partnerGiaPot;
          cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
          cashGiaPot = giaPot + cashSavingsPot;
        }
      }
    });

    // Additional Fixed Income Streams (Taxable e.g. Rental/Consulting & Tax-Free e.g. PIP/Disability)
    const activeFixedIncomeStreams = (profile.fixedIncomeStreams || []).filter((s) => s.enabled);
    let primaryTaxableFixedIncomeReceived = 0;
    let partnerTaxableFixedIncomeReceived = 0;
    let primaryTaxFreeFixedIncomeReceived = 0;
    let partnerTaxFreeFixedIncomeReceived = 0;

    activeFixedIncomeStreams.forEach((stream) => {
      const isPartner = stream.owner === 'partner';
      if (isPartner && (!profile.isCouplePlanning || partnerDead)) return;

      const evalAge = isPartner
        ? age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge)
        : age;

      const isStartAgeReached = evalAge >= stream.startAge;
      const isBeforeEndAge = !stream.endAge || evalAge <= stream.endAge;

      if (isStartAgeReached && isBeforeEndAge) {
        const amount = stream.inflationLinked
          ? stream.annualAmount * inflationFactor
          : stream.annualAmount;

        if (stream.type === 'taxable') {
          if (isPartner) partnerTaxableFixedIncomeReceived += amount;
          else primaryTaxableFixedIncomeReceived += amount;
        } else {
          if (isPartner) partnerTaxFreeFixedIncomeReceived += amount;
          else primaryTaxFreeFixedIncomeReceived += amount;
        }
      }
    });

    const taxableFixedIncomeReceived = primaryTaxableFixedIncomeReceived + partnerTaxableFixedIncomeReceived;
    const taxFreeFixedIncomeReceived = primaryTaxFreeFixedIncomeReceived + partnerTaxFreeFixedIncomeReceived;


      // Dynamic tax-free percentage accounting for individual uncrystallised pension ratios and LSA limits
      const primaryUncrystallisedRatio = primaryPensionPot > 0 ? Math.max(0, Math.min(1.0, primaryUncrystallisedPot / primaryPensionPot)) : 0;
      const partnerUncrystallisedRatio = partnerPensionPot > 0 ? Math.max(0, Math.min(1.0, partnerUncrystallisedPot / partnerPensionPot)) : 0;

      const primaryTaxablePercent = (primaryCumulativeTaxFreeDrawn >= primaryMaxLsa || primaryUncrystallisedRatio <= 0)
        ? 1.0
        : 1.0 - (0.25 * primaryUncrystallisedRatio);

      const partnerTaxablePercent = (partnerCumulativeTaxFreeDrawn >= partnerMaxLsa || partnerUncrystallisedRatio <= 0)
        ? 1.0
        : 1.0 - (0.25 * partnerUncrystallisedRatio);

      const totalAvailPensionForTax = (canAccessPension ? primaryPensionPot : 0) + (profile.isCouplePlanning && partnerCanAccessPension ? partnerPensionPot : 0);
      const priPensionRatioForTax = (canAccessPension && totalAvailPensionForTax > 0) ? primaryPensionPot / totalAvailPensionForTax : (canAccessPension ? 1 : 0);
      const partPensionRatioForTax = (profile.isCouplePlanning && partnerCanAccessPension) ? (1 - priPensionRatioForTax) : 0;

      const taxablePercent = (primaryTaxablePercent * priPensionRatioForTax) + (partnerTaxablePercent * partPensionRatioForTax);
      let annuityCapitalAllocatedThisYear = 0;
      const primaryPensionPotBeforeAnnuity = Math.round(primaryPensionPot);
      const partnerPensionPotBeforeAnnuity = Math.round(partnerPensionPot);


      // 1. Primary Annuity Purchase Logic
      if (canAccessPension && primaryPensionPot > 0) {
        // Single Annuity Option for Primary (cannot purchase before pensionAccessAge NMPA)
        const primaryTargetPurchaseAge = Math.max(pensionAccessAge, profile.annuityPurchaseAge || profile.targetRetirementAge);
        if (
          !annuityPurchasedPrimary &&
          age >= primaryTargetPurchaseAge &&
          (profile.incomeProductOption === 'annuity' || profile.incomeProductOption === 'hybrid')
        ) {
          const allocPercent =
            profile.incomeProductOption === 'annuity'
              ? 100
              : Math.min(100, Math.max(1, profile.annuityAllocationPercent || 50));
          const potForAnnuity = primaryPensionPot * (allocPercent / 100);
          primaryPensionPot -= potForAnnuity;
          let remAnnuityCap = potForAnnuity;
          let actualAnnuityPurchaseAmount = 0;
          let pclsGenerated = 0;
          if (primaryCrystallisedPot > 0) {
            const drawCryst = Math.min(primaryCrystallisedPot, remAnnuityCap);
            primaryCrystallisedPot -= drawCryst;
            remAnnuityCap -= drawCryst;
            actualAnnuityPurchaseAmount += drawCryst;
          }
          if (remAnnuityCap > 0 && primaryUncrystallisedPot > 0) {
            const drawUncryst = Math.min(primaryUncrystallisedPot, remAnnuityCap);
            primaryUncrystallisedPot -= drawUncryst;
            remAnnuityCap -= drawUncryst;
            
            const uncrystPcls = Math.min(drawUncryst * 0.25, Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn));
            pclsGenerated += uncrystPcls;
            primaryCumulativeTaxFreeDrawn += uncrystPcls;
            actualAnnuityPurchaseAmount += (drawUncryst - uncrystPcls);
          }
          annuityCapitalAllocatedThisYear += potForAnnuity;
          
          if (pclsGenerated > 0) {
            const alloc = allocateLumpSumToPots(pclsGenerated, profile.lumpSumTargetPot, profile.lumpSumSplits);
            primaryIsaPot += alloc.toIsa;
            primarySsIsaPot += alloc.toSsIsa;
            primaryCashIsaPot += alloc.toCashIsa;
            primaryGiaPot += alloc.toGia;
            primaryCashSavingsPot += alloc.toCashSavings;
            primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;
          }

          const rate = (profile.annuityRatePercent || 4.2) / 100;
          const baseNominal = actualAnnuityPurchaseAmount * rate;
          annuityPurchasedPrimary = true;

          const cfgPrimary = parseAnnuityTypeConfig(profile.annuityType);
          activeAnnuityStreams.push({
            id: `primary-single-${age}`,
            baseNominal,
            isInflationLinked: cfgPrimary.isInflationLinked,
            fixedEscalationRate: cfgPrimary.fixedEscalationRate,
            durationOption: profile.annuityDurationOption || 'lifetime',
            durationUntilAge: profile.annuityDurationUntilAge || 75,
            owner: 'primary',
            purchaseInflationFactor: inflationFactor,
            purchaseYearOffset: yearOffset,
          });
        }

        // Multi-tranche Annuity Purchases for Primary (ONLY applied if incomeProductOption === 'hybrid' & age >= pensionAccessAge)
        if (profile.incomeProductOption === 'hybrid') {
          (profile.annuityTranches || []).forEach((t) => {
            if (t.enabled && (t.owner || 'primary') === 'primary' && t.purchaseAge === age && age >= pensionAccessAge && primaryPensionPot > 0) {
              const allocPercent = Math.min(100, Math.max(1, t.allocationPercent || 50));
              const potForAnnuity = primaryPensionPot * (allocPercent / 100);
              primaryPensionPot -= potForAnnuity;
              let remAnnuityCap = potForAnnuity;
              let actualAnnuityPurchaseAmount = 0;
              let pclsGenerated = 0;
              if (primaryCrystallisedPot > 0) {
                const drawCryst = Math.min(primaryCrystallisedPot, remAnnuityCap);
                primaryCrystallisedPot -= drawCryst;
                remAnnuityCap -= drawCryst;
                actualAnnuityPurchaseAmount += drawCryst;
              }
              if (remAnnuityCap > 0 && primaryUncrystallisedPot > 0) {
                const drawUncryst = Math.min(primaryUncrystallisedPot, remAnnuityCap);
                primaryUncrystallisedPot -= drawUncryst;
                remAnnuityCap -= drawUncryst;
                
                // H15: PCLS entitlement on annuity purchase from uncrystallised funds
                const uncrystPcls = Math.min(drawUncryst * 0.25, Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn));
                pclsGenerated += uncrystPcls;
                primaryCumulativeTaxFreeDrawn += uncrystPcls;
                actualAnnuityPurchaseAmount += (drawUncryst - uncrystPcls);
              }
              annuityCapitalAllocatedThisYear += potForAnnuity;
              
              if (pclsGenerated > 0) {
                const alloc = allocateLumpSumToPots(pclsGenerated, profile.lumpSumTargetPot, profile.lumpSumSplits);
                primaryIsaPot += alloc.toIsa;
                primarySsIsaPot += alloc.toSsIsa;
                primaryCashIsaPot += alloc.toCashIsa;
                primaryGiaPot += alloc.toGia;
                primaryCashSavingsPot += alloc.toCashSavings;
                primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;
              }

              const rate = (t.annuityRatePercent || 4.2) / 100;
              const baseNominal = actualAnnuityPurchaseAmount * rate;

              const cfgTranchePrimary = parseAnnuityTypeConfig(t.annuityType || profile.annuityType);
              activeAnnuityStreams.push({
                id: t.id || `primary-tranche-${t.purchaseAge}-${t.allocationPercent}-${t.annuityRatePercent}`,
                baseNominal,
                isInflationLinked: cfgTranchePrimary.isInflationLinked,
                fixedEscalationRate: cfgTranchePrimary.fixedEscalationRate,
                durationOption: t.durationOption || 'lifetime',
                durationUntilAge: t.durationUntilAge || 75,
                owner: 'primary',
                purchaseInflationFactor: inflationFactor,
                purchaseYearOffset: yearOffset,
              });
            }
          });
        }
      }

      // 2. Partner Annuity Purchase Logic
      if (profile.isCouplePlanning && partnerPensionPot > 0) {
        const partnerAge = age + ((profile.partnerCurrentAge || profile.currentAge) - profile.currentAge);
        const partnerCanAccess = partnerAge >= partnerPensionAccessAge;

        if (partnerCanAccess) {
          const partnerOption = profile.partnerIncomeProductOption || profile.incomeProductOption;
          const partnerTargetPurchaseAge = Math.max(partnerPensionAccessAge, profile.partnerAnnuityPurchaseAge || (profile.partnerTargetRetirementAge || profile.targetRetirementAge));
          if (
            !annuityPurchasedPartner &&
            partnerAge >= partnerTargetPurchaseAge &&
            (partnerOption === 'annuity' || partnerOption === 'hybrid')
          ) {
            const allocPercent =
              partnerOption === 'annuity'
                ? 100
                : Math.min(100, Math.max(1, profile.partnerAnnuityAllocationPercent || 50));
            const potForAnnuity = partnerPensionPot * (allocPercent / 100);
            partnerPensionPot -= potForAnnuity;
            let remAnnuityCapPart = potForAnnuity;
            let actualAnnuityPurchaseAmount = 0;
            let pclsGenerated = 0;
            if (partnerCrystallisedPot > 0) {
              const drawCryst = Math.min(partnerCrystallisedPot, remAnnuityCapPart);
              partnerCrystallisedPot -= drawCryst;
              remAnnuityCapPart -= drawCryst;
              actualAnnuityPurchaseAmount += drawCryst;
            }
            if (remAnnuityCapPart > 0 && partnerUncrystallisedPot > 0) {
              const drawUncryst = Math.min(partnerUncrystallisedPot, remAnnuityCapPart);
              partnerUncrystallisedPot -= drawUncryst;
              remAnnuityCapPart -= drawUncryst;
              
              const uncrystPcls = Math.min(drawUncryst * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
              pclsGenerated += uncrystPcls;
              partnerCumulativeTaxFreeDrawn += uncrystPcls;
              actualAnnuityPurchaseAmount += (drawUncryst - uncrystPcls);
            }
            annuityCapitalAllocatedThisYear += potForAnnuity;

            if (pclsGenerated > 0) {
              const alloc = allocateLumpSumToPots(pclsGenerated, profile.partnerLumpSumTargetPot, profile.partnerLumpSumSplits);
              partnerIsaPot += alloc.toIsa;
              partnerSsIsaPot += alloc.toSsIsa;
              partnerCashIsaPot += alloc.toCashIsa;
              partnerGiaPot += alloc.toGia;
              partnerCashSavingsPot += alloc.toCashSavings;
              partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;
            }

            const rate = (profile.partnerAnnuityRatePercent || profile.annuityRatePercent || 4.2) / 100;
            const baseNominal = actualAnnuityPurchaseAmount * rate;
            annuityPurchasedPartner = true;

            const cfgPartner = parseAnnuityTypeConfig(profile.partnerAnnuityType || profile.annuityType);
            activeAnnuityStreams.push({
              id: `partner-single-${partnerAge}`,
              baseNominal,
              isInflationLinked: cfgPartner.isInflationLinked,
              fixedEscalationRate: cfgPartner.fixedEscalationRate,
              durationOption: profile.partnerAnnuityDurationOption || 'lifetime',
              durationUntilAge: profile.partnerAnnuityDurationUntilAge || 75,
              owner: 'partner',
              purchaseInflationFactor: inflationFactor,
              purchaseYearOffset: yearOffset,
            });
          }

          // Partner Tranches (ONLY applied if partnerOption === 'hybrid' & partnerAge >= partnerPensionAccessAge)
          if (partnerOption === 'hybrid') {
            const partnerTranches = profile.partnerAnnuityTranches || (profile.annuityTranches || []).filter((t) => t.owner === 'partner');
            partnerTranches.forEach((t) => {
              if (t.enabled && t.purchaseAge === partnerAge && partnerAge >= partnerPensionAccessAge && partnerPensionPot > 0) {
                const allocPercent = Math.min(100, Math.max(1, t.allocationPercent || 50));
                const potForAnnuity = partnerPensionPot * (allocPercent / 100);
                partnerPensionPot -= potForAnnuity;
                let remAnnuityCapPart = potForAnnuity;
                let actualAnnuityPurchaseAmount = 0;
                let pclsGenerated = 0;
                if (partnerCrystallisedPot > 0) {
                  const drawCryst = Math.min(partnerCrystallisedPot, remAnnuityCapPart);
                  partnerCrystallisedPot -= drawCryst;
                  remAnnuityCapPart -= drawCryst;
                  actualAnnuityPurchaseAmount += drawCryst;
                }
                if (remAnnuityCapPart > 0 && partnerUncrystallisedPot > 0) {
                  const drawUncryst = Math.min(partnerUncrystallisedPot, remAnnuityCapPart);
                  partnerUncrystallisedPot -= drawUncryst;
                  remAnnuityCapPart -= drawUncryst;
                  
                  const uncrystPcls = Math.min(drawUncryst * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
                  pclsGenerated += uncrystPcls;
                  partnerCumulativeTaxFreeDrawn += uncrystPcls;
                  actualAnnuityPurchaseAmount += (drawUncryst - uncrystPcls);
                }
                annuityCapitalAllocatedThisYear += potForAnnuity;

                if (pclsGenerated > 0) {
                  const alloc = allocateLumpSumToPots(pclsGenerated, profile.partnerLumpSumTargetPot, profile.partnerLumpSumSplits);
                  partnerIsaPot += alloc.toIsa;
                  partnerSsIsaPot += alloc.toSsIsa;
                  partnerCashIsaPot += alloc.toCashIsa;
                  partnerGiaPot += alloc.toGia;
                  partnerCashSavingsPot += alloc.toCashSavings;
                  partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;
                }

                const rate = (t.annuityRatePercent || 4.2) / 100;
                const baseNominal = actualAnnuityPurchaseAmount * rate;

                const cfgTranchePartner = parseAnnuityTypeConfig(t.annuityType || profile.partnerAnnuityType || profile.annuityType);
                activeAnnuityStreams.push({
                  id: t.id || `partner-tranche-${t.purchaseAge}-${t.allocationPercent}-${t.annuityRatePercent}`,
                  baseNominal,
                  isInflationLinked: cfgTranchePartner.isInflationLinked,
                  fixedEscalationRate: cfgTranchePartner.fixedEscalationRate,
                  durationOption: t.durationOption || 'lifetime',
                  durationUntilAge: t.durationUntilAge || 75,
                  owner: 'partner',
                  purchaseInflationFactor: inflationFactor,
                  purchaseYearOffset: yearOffset,
                });
              }
            });
          }
        }
      }

      // Re-aggregate total pension pot after annuity deductions
      pensionPot = primaryPensionPot + partnerPensionPot;

      // 3. Calculate Annuity Income for Current Year across all active streams

      let primaryAnnuityIncomeThisYear = 0;
      let partnerAnnuityIncomeThisYear = 0;
      const currentPartnerAge = age + ((profile.partnerCurrentAge || profile.currentAge) - profile.currentAge);

      activeAnnuityStreams.forEach((stream) => {
        const ownerAge = stream.owner === 'partner' ? currentPartnerAge : age;
        if (stream.durationOption === 'until_age' && stream.durationUntilAge && ownerAge >= stream.durationUntilAge) {
          return; // Annuity expired at target age
        }

        let amt = stream.baseNominal;
        if (stream.isInflationLinked) {
          amt = stream.baseNominal * (inflationFactor / (stream.purchaseInflationFactor || 1));
        } else if (stream.fixedEscalationRate) {
          const yearsSincePurchase = Math.max(0, yearOffset - (stream.purchaseYearOffset || 0));
          amt = stream.baseNominal * Math.pow(1 + stream.fixedEscalationRate, yearsSincePurchase);
        }
        if (stream.owner === 'partner') {
          if (!partnerDead) {
            partnerAnnuityIncomeThisYear += amt;
          }
        } else {
          primaryAnnuityIncomeThisYear += amt;
        }
      });

      const annuityIncomeThisYear = primaryAnnuityIncomeThisYear + partnerAnnuityIncomeThisYear;

      // 4. Gilt Ladder Execution & Income Calculation (Primary & Partner)
      let primaryGiltLadderIncomeThisYear = 0;
      let primaryGiltLadderCapitalAllocatedThisYear = 0;
      let primaryGiltLadderPurchasedThisYear = false;

      let partnerGiltLadderIncomeThisYear = 0;
      let partnerGiltLadderCapitalAllocatedThisYear = 0;
      let partnerGiltLadderPurchasedThisYear = false;

      // Primary Gilt Ladder Execution
      if (isGiltLadderEnabled && giltLadderSummary && !giltLadderPurchased) {
        const giltPurchaseAge = Math.max(profile.currentAge, giltLadderConfig!.purchaseAge || giltLadderConfig!.startAge || profile.targetRetirementAge);
        if (age >= giltPurchaseAge) {
          let upfrontCost = giltLadderSummary.totalUpfrontCost;
          primaryGiltLadderCapitalAllocatedThisYear = upfrontCost;
          giltLadderPurchased = true;
          primaryGiltLadderPurchasedThisYear = true;

          const source = giltLadderConfig!.fundingSource || 'gia';
          if (source === 'gia') {
            const drawPriGia = Math.min(primaryGiaPot, upfrontCost);
            primaryGiaPot -= drawPriGia;
            upfrontCost -= drawPriGia;
            if (upfrontCost > 0) {
              const drawPriCash = Math.min(primaryCashSavingsPot, upfrontCost);
              primaryCashSavingsPot -= drawPriCash;
              upfrontCost -= drawPriCash;
            }
            if (upfrontCost > 0 && profile.isCouplePlanning) {
              const drawPartGia = Math.min(partnerGiaPot, upfrontCost);
              partnerGiaPot -= drawPartGia;
              upfrontCost -= drawPartGia;
            }
            if (upfrontCost > 0 && profile.isCouplePlanning) {
              const drawPartCash = Math.min(partnerCashSavingsPot, upfrontCost);
              partnerCashSavingsPot -= drawPartCash;
              upfrontCost -= drawPartCash;
            }
          } else if (source === 'isa') {
            const drawPriSs = Math.min(primarySsIsaPot, upfrontCost);
            primarySsIsaPot -= drawPriSs;
            upfrontCost -= drawPriSs;
            if (upfrontCost > 0) {
              const drawPriCashIsa = Math.min(primaryCashIsaPot, upfrontCost);
              primaryCashIsaPot -= drawPriCashIsa;
              upfrontCost -= drawPriCashIsa;
            }
            if (upfrontCost > 0 && profile.isCouplePlanning) {
              const drawPartSs = Math.min(partnerSsIsaPot, upfrontCost);
              partnerSsIsaPot -= drawPartSs;
              upfrontCost -= drawPartSs;
            }
            if (upfrontCost > 0 && profile.isCouplePlanning) {
              const drawPartCashIsa = Math.min(partnerCashIsaPot, upfrontCost);
              partnerCashIsaPot -= drawPartCashIsa;
              upfrontCost -= drawPartCashIsa;
            }
          } else if (source === 'cash') {
            const drawPriCash = Math.min(primaryCashSavingsPot, upfrontCost);
            primaryCashSavingsPot -= drawPriCash;
            upfrontCost -= drawPriCash;
            if (upfrontCost > 0) {
              const drawPriCashIsa = Math.min(primaryCashIsaPot, upfrontCost);
              primaryCashIsaPot -= drawPriCashIsa;
              upfrontCost -= drawPriCashIsa;
            }
            if (upfrontCost > 0 && profile.isCouplePlanning) {
              const drawPartCash = Math.min(partnerCashSavingsPot, upfrontCost);
              partnerCashSavingsPot -= drawPartCash;
              upfrontCost -= drawPartCash;
            }
          } else if (source === 'pension' && canAccessPension) {
            if (primaryCrystallisedPot > 0) {
              const drawCryst = Math.min(primaryCrystallisedPot, upfrontCost);
              primaryCrystallisedPot -= drawCryst;
              upfrontCost -= drawCryst;
            }
            if (upfrontCost > 0 && primaryUncrystallisedPot > 0) {
              const drawUncryst = Math.min(primaryUncrystallisedPot, upfrontCost);
              primaryUncrystallisedPot -= drawUncryst;
              upfrontCost -= drawUncryst;
            }
          } else if (source === 'blended') {
            const drawPriGia = Math.min(primaryGiaPot, upfrontCost);
            primaryGiaPot -= drawPriGia;
            upfrontCost -= drawPriGia;

            if (upfrontCost > 0) {
              const drawPriCash = Math.min(primaryCashSavingsPot, upfrontCost);
              primaryCashSavingsPot -= drawPriCash;
              upfrontCost -= drawPriCash;
            }

            if (upfrontCost > 0) {
              const drawPriIsa = Math.min(primaryIsaPot, upfrontCost);
              primarySsIsaPot = Math.max(0, primarySsIsaPot - drawPriIsa);
              upfrontCost -= drawPriIsa;
            }

            if (upfrontCost > 0 && profile.isCouplePlanning) {
              const drawPartGia = Math.min(partnerGiaPot, upfrontCost);
              partnerGiaPot -= drawPartGia;
              upfrontCost -= drawPartGia;
            }
            if (upfrontCost > 0 && profile.isCouplePlanning) {
              const drawPartCash = Math.min(partnerCashSavingsPot, upfrontCost);
              partnerCashSavingsPot -= drawPartCash;
              upfrontCost -= drawPartCash;
            }
            if (upfrontCost > 0 && profile.isCouplePlanning) {
              const drawPartIsa = Math.min(partnerIsaPot, upfrontCost);
              partnerSsIsaPot = Math.max(0, partnerSsIsaPot - drawPartIsa);
              upfrontCost -= drawPartIsa;
            }
          }

          primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
          partnerIsaPot = partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot;
          primaryPensionPot = primaryUncrystallisedPot + primaryCrystallisedPot;
          partnerPensionPot = partnerUncrystallisedPot + partnerCrystallisedPot;
          primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;
          partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;
          pensionPot = primaryPensionPot + partnerPensionPot;
          isaPot = primaryIsaPot + partnerIsaPot;
          giaPot = primaryGiaPot + partnerGiaPot;
          cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
          cashGiaPot = giaPot + cashSavingsPot;
        }
      }

      // Partner Gilt Ladder Execution
      if (isPartnerGiltLadderEnabled && partnerGiltLadderSummary && !partnerGiltLadderPurchased) {
        const partnerGiltPurchaseAge = Math.max(
          profile.partnerCurrentAge ?? profile.currentAge,
          partnerGiltLadderConfig!.purchaseAge || partnerGiltLadderConfig!.startAge || (profile.partnerTargetRetirementAge ?? 60)
        );
        if (partnerAge >= partnerGiltPurchaseAge) {
          let upfrontCost = partnerGiltLadderSummary.totalUpfrontCost;
          partnerGiltLadderCapitalAllocatedThisYear = upfrontCost;
          partnerGiltLadderPurchased = true;
          partnerGiltLadderPurchasedThisYear = true;

          const source = partnerGiltLadderConfig!.fundingSource || 'gia';
          if (source === 'gia') {
            const drawPartGia = Math.min(partnerGiaPot, upfrontCost);
            partnerGiaPot -= drawPartGia;
            upfrontCost -= drawPartGia;
            if (upfrontCost > 0) {
              const drawPartCash = Math.min(partnerCashSavingsPot, upfrontCost);
              partnerCashSavingsPot -= drawPartCash;
              upfrontCost -= drawPartCash;
            }
            if (upfrontCost > 0) {
              const drawPriGia = Math.min(primaryGiaPot, upfrontCost);
              primaryGiaPot -= drawPriGia;
              upfrontCost -= drawPriGia;
            }
            if (upfrontCost > 0) {
              const drawPriCash = Math.min(primaryCashSavingsPot, upfrontCost);
              primaryCashSavingsPot -= drawPriCash;
              upfrontCost -= drawPriCash;
            }
          } else if (source === 'isa') {
            const drawPartSs = Math.min(partnerSsIsaPot, upfrontCost);
            partnerSsIsaPot -= drawPartSs;
            upfrontCost -= drawPartSs;
            if (upfrontCost > 0) {
              const drawPartCashIsa = Math.min(partnerCashIsaPot, upfrontCost);
              partnerCashIsaPot -= drawPartCashIsa;
              upfrontCost -= drawPartCashIsa;
            }
            if (upfrontCost > 0) {
              const drawPriSs = Math.min(primarySsIsaPot, upfrontCost);
              primarySsIsaPot -= drawPriSs;
              upfrontCost -= drawPriSs;
            }
            if (upfrontCost > 0) {
              const drawPriCashIsa = Math.min(primaryCashIsaPot, upfrontCost);
              primaryCashIsaPot -= drawPriCashIsa;
              upfrontCost -= drawPriCashIsa;
            }
          } else if (source === 'cash') {
            const drawPartCash = Math.min(partnerCashSavingsPot, upfrontCost);
            partnerCashSavingsPot -= drawPartCash;
            upfrontCost -= drawPartCash;
            if (upfrontCost > 0) {
              const drawPartCashIsa = Math.min(partnerCashIsaPot, upfrontCost);
              partnerCashIsaPot -= drawPartCashIsa;
              upfrontCost -= drawPartCashIsa;
            }
            if (upfrontCost > 0) {
              const drawPriCash = Math.min(primaryCashSavingsPot, upfrontCost);
              primaryCashSavingsPot -= drawPriCash;
              upfrontCost -= drawPriCash;
            }
          } else if (source === 'pension' && partnerCanAccessPension) {
            if (partnerCrystallisedPot > 0) {
              const drawCryst = Math.min(partnerCrystallisedPot, upfrontCost);
              partnerCrystallisedPot -= drawCryst;
              upfrontCost -= drawCryst;
            }
            if (upfrontCost > 0 && partnerUncrystallisedPot > 0) {
              const drawUncryst = Math.min(partnerUncrystallisedPot, upfrontCost);
              partnerUncrystallisedPot -= drawUncryst;
              upfrontCost -= drawUncryst;
            }
          } else if (source === 'blended') {
            const drawPartGia = Math.min(partnerGiaPot, upfrontCost);
            partnerGiaPot -= drawPartGia;
            upfrontCost -= drawPartGia;

            if (upfrontCost > 0) {
              const drawPartCash = Math.min(partnerCashSavingsPot, upfrontCost);
              partnerCashSavingsPot -= drawPartCash;
              upfrontCost -= drawPartCash;
            }

            if (upfrontCost > 0) {
              const drawPartIsa = Math.min(partnerIsaPot, upfrontCost);
              partnerSsIsaPot = Math.max(0, partnerSsIsaPot - drawPartIsa);
              upfrontCost -= drawPartIsa;
            }

            if (upfrontCost > 0) {
              const drawPriGia = Math.min(primaryGiaPot, upfrontCost);
              primaryGiaPot -= drawPriGia;
              upfrontCost -= drawPriGia;
            }
            if (upfrontCost > 0) {
              const drawPriCash = Math.min(primaryCashSavingsPot, upfrontCost);
              primaryCashSavingsPot -= drawPriCash;
              upfrontCost -= drawPriCash;
            }
            if (upfrontCost > 0) {
              const drawPriIsa = Math.min(primaryIsaPot, upfrontCost);
              primarySsIsaPot = Math.max(0, primarySsIsaPot - drawPriIsa);
              upfrontCost -= drawPriIsa;
            }
          }

          primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
          partnerIsaPot = partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot;
          primaryPensionPot = primaryUncrystallisedPot + primaryCrystallisedPot;
          partnerPensionPot = partnerUncrystallisedPot + partnerCrystallisedPot;
          primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;
          partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;
          pensionPot = primaryPensionPot + partnerPensionPot;
          isaPot = primaryIsaPot + partnerIsaPot;
          giaPot = primaryGiaPot + partnerGiaPot;
          cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
          cashGiaPot = giaPot + cashSavingsPot;
        }
      }

      if (isGiltLadderEnabled && giltLadderSummary) {
        const activeRung = giltLadderSummary.rungs.find((r) => r.age === age);
        if (activeRung) {
          primaryGiltLadderIncomeThisYear = activeRung.totalNetPayout;
        }
      }

      if (isPartnerGiltLadderEnabled && partnerGiltLadderSummary) {
        const activeRung = partnerGiltLadderSummary.rungs.find((r) => r.age === partnerAge);
        if (activeRung) {
          partnerGiltLadderIncomeThisYear = activeRung.totalNetPayout;
        }
      }

      const giltLadderIncomeThisYear = primaryGiltLadderIncomeThisYear + partnerGiltLadderIncomeThisYear;
      const giltLadderCapitalAllocatedThisYear = primaryGiltLadderCapitalAllocatedThisYear + partnerGiltLadderCapitalAllocatedThisYear;
      const giltLadderPurchasedThisYear = primaryGiltLadderPurchasedThisYear || partnerGiltLadderPurchasedThisYear;


      // State Pension income (Primary + Partner if couple mode)
      let primaryStatePensionReceived = 0;
      let partnerStatePensionReceived = 0;

      if ((profile.includeStatePension ?? true) && age >= (profile.statePensionAge || 67)) {
        const primaryYears = profile.qualifyingYears ?? 35;
        if (primaryYears >= 10) {
          const primaryTripleLock = profile.enableTripleLock ?? true;
          const primaryIndexFactor = primaryTripleLock ? inflationFactor : 1;
          const primaryFull = profile.fullStatePensionAmount ?? 12547.60;
          const primaryAnnualCalculated = Math.round((Math.min(primaryYears, 35) / 35) * primaryFull * 100) / 100;
          const primaryBaseAmount = profile.statePensionAmountAnnual ?? primaryAnnualCalculated;
          primaryStatePensionReceived = primaryBaseAmount * primaryIndexFactor;
        }
      }
      if (profile.isCouplePlanning && !partnerDead && (profile.partnerIncludeStatePension ?? true)) {
        const partnerAge = age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge);
        if (partnerAge >= (profile.partnerStatePensionAge || 67)) {
          const partnerYears = profile.partnerQualifyingYears ?? 35;
          if (partnerYears >= 10) {
            const partnerTripleLock = profile.partnerEnableTripleLock ?? true;
            const partnerIndexFactor = partnerTripleLock ? inflationFactor : 1;
            const partnerFull = profile.partnerFullStatePensionAmount ?? 12547.60;
            const partnerAnnualCalculated = Math.round((Math.min(partnerYears, 35) / 35) * partnerFull * 100) / 100;
            const partnerBaseAmount = profile.partnerStatePensionAmountAnnual ?? partnerAnnualCalculated;
            partnerStatePensionReceived = partnerBaseAmount * partnerIndexFactor;
          }
        }
      }

      const statePensionReceived = primaryStatePensionReceived + partnerStatePensionReceived;

      let primaryLifeEventsIncomeThisYear = 0;
      let primaryLifeEventsExpenseThisYear = 0;
      let partnerLifeEventsIncomeThisYear = 0;
      let partnerLifeEventsExpenseThisYear = 0;
      let lifeEventsIncomeThisYear = 0;
      let lifeEventsExpenseThisYear = 0;
      const decumulationEventSummaries: string[] = [];

      const processLifeEventsThisYear = () => {
        const activeLifeEvents = (profile.decumulationLifeEvents || []).filter((e) => e.enabled);
        for (const event of activeLifeEvents) {
          const isPartnerEvent = event.owner === 'partner';
          const targetAgeMatches = isPartnerEvent ? partnerAge === event.age : age === event.age;

          if (targetAgeMatches) {
            const rawAmount = Number(event.amount) || 0;
            if (rawAmount > 0) {
              const inflLinked = event.inflationLinked ?? true;
              const eventAmount = inflLinked ? rawAmount * inflationFactor : rawAmount;
              const isIncome = event.type === 'income';
              const potTarget = (event.targetPot || 'cash_savings') as string;
              const adjustInflationPref = Boolean(profile.adjustForInflation);

              if (isIncome) {
                if (isPartnerEvent) {
                  partnerLifeEventsIncomeThisYear += eventAmount;
                } else {
                  primaryLifeEventsIncomeThisYear += eventAmount;
                }
                lifeEventsIncomeThisYear += eventAmount;
                decumulationEventSummaries.push(`+£${Math.round(eventAmount / (adjustInflationPref ? inflationFactor : 1)).toLocaleString()} ${event.name}`);

                if (potTarget === 'stocks_and_shares_isa') {
                  if (isPartnerEvent) { partnerSsIsaPot += eventAmount; partnerIsaPot += eventAmount; } else { primarySsIsaPot += eventAmount; primaryIsaPot += eventAmount; }
                } else if (potTarget === 'cash_isa') {
                  if (isPartnerEvent) { partnerCashIsaPot += eventAmount; partnerIsaPot += eventAmount; } else { primaryCashIsaPot += eventAmount; primaryIsaPot += eventAmount; }
                } else if (potTarget === 'lisa') {
                  if (isPartnerEvent) { partnerLisaPot += eventAmount; partnerIsaPot += eventAmount; } else { primaryLisaPot += eventAmount; primaryIsaPot += eventAmount; }
                } else if (potTarget === 'isa') {
                  if (isPartnerEvent) { partnerSsIsaPot += eventAmount; partnerIsaPot += eventAmount; } else { primarySsIsaPot += eventAmount; primaryIsaPot += eventAmount; }
                } else if (potTarget === 'gia') {
                  if (isPartnerEvent) partnerGiaPot += eventAmount; else primaryGiaPot += eventAmount;
                } else if (potTarget === 'sipp') {
                  if (isPartnerEvent) {
                    partnerUncrystallisedPot += eventAmount;
                    partnerPensionPot += eventAmount;
                  } else {
                    primaryUncrystallisedPot += eventAmount;
                    primaryPensionPot += eventAmount;
                  }
                } else {
                  if (isPartnerEvent) partnerCashSavingsPot += eventAmount; else primaryCashSavingsPot += eventAmount;
                }
              } else {
                if (isPartnerEvent) {
                  partnerLifeEventsExpenseThisYear += eventAmount;
                } else {
                  primaryLifeEventsExpenseThisYear += eventAmount;
                }
                lifeEventsExpenseThisYear += eventAmount;
                decumulationEventSummaries.push(`-£${Math.round(eventAmount / (adjustInflationPref ? inflationFactor : 1)).toLocaleString()} ${event.name}`);

                let remainingToDeduct = eventAmount;
                const deductFromPrimaryCash = (amt: number) => {
                  const drawn = Math.min(primaryCashSavingsPot, amt);
                  primaryCashSavingsPot -= drawn;
                  return amt - drawn;
                };
                const deductFromPartnerCash = (amt: number) => {
                  const drawn = Math.min(partnerCashSavingsPot, amt);
                  partnerCashSavingsPot -= drawn;
                  return amt - drawn;
                };
                const deductFromPrimaryGia = (amt: number) => {
                  const drawn = Math.min(primaryGiaPot, amt);
                  primaryGiaPot -= drawn;
                  return amt - drawn;
                };
                const deductFromPartnerGia = (amt: number) => {
                  const drawn = Math.min(partnerGiaPot, amt);
                  partnerGiaPot -= drawn;
                  return amt - drawn;
                };
                const deductFromPrimaryIsa = (amt: number) => {
                  const drawn = Math.min(primaryIsaPot, amt);
                  if (drawn > 0) {
                    const drawSs = drawn * (primarySsIsaPot / (primaryIsaPot || 1));
                    const drawCash = drawn * (primaryCashIsaPot / (primaryIsaPot || 1));
                    const drawLisa = drawn * (primaryLisaPot / (primaryIsaPot || 1));
                    primarySsIsaPot = Math.max(0, primarySsIsaPot - drawSs);
                    primaryCashIsaPot = Math.max(0, primaryCashIsaPot - drawCash);
                    primaryLisaPot = Math.max(0, primaryLisaPot - drawLisa);
                    primaryIsaPot = Math.max(0, primaryIsaPot - drawn);
                  }
                  return amt - drawn;
                };
                const deductFromPartnerIsa = (amt: number) => {
                  const drawn = Math.min(partnerIsaPot, amt);
                  if (drawn > 0) {
                    const drawSs = drawn * (partnerSsIsaPot / (partnerIsaPot || 1));
                    const drawCash = drawn * (partnerCashIsaPot / (partnerIsaPot || 1));
                    const drawLisa = drawn * (partnerLisaPot / (partnerIsaPot || 1));
                    partnerSsIsaPot = Math.max(0, partnerSsIsaPot - drawSs);
                    partnerCashIsaPot = Math.max(0, partnerCashIsaPot - drawCash);
                    partnerLisaPot = Math.max(0, partnerLisaPot - drawLisa);
                    partnerIsaPot = Math.max(0, partnerIsaPot - drawn);
                  }
                  return amt - drawn;
                };

                if (potTarget === 'stocks_and_shares_isa' || potTarget === 'cash_isa') {
                  remainingToDeduct = isPartnerEvent ? deductFromPartnerIsa(remainingToDeduct) : deductFromPrimaryIsa(remainingToDeduct);
                } else if (potTarget === 'gia') {
                  remainingToDeduct = isPartnerEvent ? deductFromPartnerGia(remainingToDeduct) : deductFromPrimaryGia(remainingToDeduct);
                } else if (potTarget === 'cash_savings') {
                  remainingToDeduct = isPartnerEvent ? deductFromPartnerCash(remainingToDeduct) : deductFromPrimaryCash(remainingToDeduct);
                }

                if (remainingToDeduct > 0) remainingToDeduct = deductFromPrimaryCash(remainingToDeduct);
                if (remainingToDeduct > 0 && profile.isCouplePlanning) remainingToDeduct = deductFromPartnerCash(remainingToDeduct);
                if (remainingToDeduct > 0) remainingToDeduct = deductFromPrimaryGia(remainingToDeduct);
                if (remainingToDeduct > 0 && profile.isCouplePlanning) remainingToDeduct = deductFromPartnerGia(remainingToDeduct);
                if (remainingToDeduct > 0) remainingToDeduct = deductFromPrimaryIsa(remainingToDeduct);
                if (remainingToDeduct > 0 && profile.isCouplePlanning) remainingToDeduct = deductFromPartnerIsa(remainingToDeduct);
              }

              primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;
              partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;
              pensionPot = primaryPensionPot + partnerPensionPot;
              isaPot = primaryIsaPot + partnerIsaPot;
              giaPot = primaryGiaPot + partnerGiaPot;
              cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
              cashGiaPot = giaPot + cashSavingsPot;
            }
          }
        }
      };


    if (!isRetired) {
      // ACCUMULATION PHASE
      if (primaryStatePensionReceived > 0) {
        primaryCashSavingsPot += primaryStatePensionReceived;
        primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;
      }
      if (partnerStatePensionReceived > 0 && profile.isCouplePlanning) {
        partnerCashSavingsPot += partnerStatePensionReceived;
        partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;
      }

      const primaryPensionContrib = annualPensionContribution;
      const primaryIsaContrib = annualIsaContribution;
      let primaryCashGiaPotContrib = annualCashGiaContribution;

      // Add extra guaranteed income net of basic tax approximation
      const primaryExtraTaxableGross = primaryStatePensionReceived + primaryDbPensionReceived + primaryTaxableFixedIncomeReceived + primaryAnnuityIncomeThisYear;
      if (primaryExtraTaxableGross > 0) {
         primaryCashGiaPotContrib += primaryExtraTaxableGross * (1 - (primaryTaxThisYr.marginalTaxRate / 100));
      }
      primaryCashGiaPotContrib += primaryTaxFreeFixedIncomeReceived;

      let partnerPContrib = 0;
      let partnerIContrib = 0;
      let partnerCContrib = 0;

      if (profile.isCouplePlanning) {
        const partnerAge = age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge);
        const partnerRetireAge = profile.partnerTargetRetirementAge ?? 60;
        
        if (partnerAge < partnerRetireAge && !partnerDead) {
          partnerPContrib = partnerAnnualPensionContrib;
          partnerIContrib = partnerAnnualIsaContrib;
          partnerCContrib = partnerAnnualCashGiaContrib;
        }

        if (!partnerDead) {
          const partnerExtraTaxableGross = partnerStatePensionReceived + partnerDbPensionReceived + partnerTaxableFixedIncomeReceived + partnerAnnuityIncomeThisYear;
          if (partnerExtraTaxableGross > 0) {
             const partMarginal = partnerTaxThisYr ? partnerTaxThisYr.marginalTaxRate : 0;
             partnerCContrib += partnerExtraTaxableGross * (1 - (partMarginal / 100));
          }
          partnerCContrib += partnerTaxFreeFixedIncomeReceived;
        }
      }

      // Apply pot-specific growth rate overrides during accumulation if enabled
      const overrides = profile.potReturnOverrides;
      const useOverrides = Boolean(overrides?.enabled);

      const returnAccumulationGross = (profile.assetAllocationSplit && profile.assetAllocationSplit.enabled)
        ? calculateWeightedAssetReturn(profile.assetAllocationSplit.accumulation, profile.assetAllocationSplit.assetClassReturns) / 100
        : (profile.expectedInvestmentReturn || 6.5) / 100;

      const primaryPensionFee = getPotFeePercent(profile.investmentFees, 'primary', 'pension', cleanPots) / 100;
      const partnerPensionFee = getPotFeePercent(profile.investmentFees, 'partner', 'pension', profile.partnerPots) / 100;
      const primaryIsaFee = getPotFeePercent(profile.investmentFees, 'primary', 'stocksAndSharesIsa') / 100;
      const partnerIsaFee = getPotFeePercent(profile.investmentFees, 'partner', 'stocksAndSharesIsa') / 100;
      const primaryGiaFee = getPotFeePercent(profile.investmentFees, 'primary', 'gia') / 100;
      const partnerGiaFee = getPotFeePercent(profile.investmentFees, 'partner', 'gia') / 100;

      const primaryAccumPensionGross = useOverrides
        ? (overrides!.workplacePensionReturn || 7.0) / 100
        : getPotGrossReturn(profile.assetAllocationSplit, 'primary', 'pension', 'accumulation', returnAccumulationGross * 100) / 100;
      const partnerAccumPensionGross = useOverrides
        ? (overrides!.workplacePensionReturn || 7.0) / 100
        : getPotGrossReturn(profile.assetAllocationSplit, 'partner', 'pension', 'accumulation', returnAccumulationGross * 100) / 100;

      const primaryAccumIsaGross = useOverrides
        ? (overrides!.stocksAndSharesIsaReturn || 7.5) / 100
        : getPotGrossReturn(profile.assetAllocationSplit, 'primary', 'stocksAndSharesIsa', 'accumulation', returnAccumulationGross * 100) / 100;
      const partnerAccumIsaGross = useOverrides
        ? (overrides!.stocksAndSharesIsaReturn || 7.5) / 100
        : getPotGrossReturn(profile.assetAllocationSplit, 'partner', 'stocksAndSharesIsa', 'accumulation', returnAccumulationGross * 100) / 100;

      const primaryAccumGiaGross = useOverrides
        ? (overrides!.giaReturn || 6.5) / 100
        : getPotGrossReturn(profile.assetAllocationSplit, 'primary', 'gia', 'accumulation', returnAccumulationGross * 90) / 100;
      const partnerAccumGiaGross = useOverrides
        ? (overrides!.giaReturn || 6.5) / 100
        : getPotGrossReturn(profile.assetAllocationSplit, 'partner', 'gia', 'accumulation', returnAccumulationGross * 90) / 100;

      const primaryAccumPensionRate = Math.max(-0.05, primaryAccumPensionGross - primaryPensionFee);
      const partnerAccumPensionRate = Math.max(-0.05, partnerAccumPensionGross - partnerPensionFee);
      const primaryAccumIsaRate = Math.max(-0.05, primaryAccumIsaGross - primaryIsaFee);
      const partnerAccumIsaRate = Math.max(-0.05, partnerAccumIsaGross - partnerIsaFee);
      const primaryAccumGiaRate = Math.max(-0.05, primaryAccumGiaGross - primaryGiaFee);
      const partnerAccumGiaRate = Math.max(-0.05, partnerAccumGiaGross - partnerGiaFee);

      const accumCashRate = useOverrides ? (overrides!.cashSavingsReturn || 3.5) / 100 : returnAccumulationGross * 0.85;

      const accumFeesPaid = Math.round(
        (primaryPensionPot * primaryPensionFee) +
        (partnerPensionPot * partnerPensionFee) +
        (primarySsIsaPot * primaryIsaFee) +
        (partnerSsIsaPot * partnerIsaFee) +
        (primaryGiaPot * primaryGiaFee) +
        (partnerGiaPot * partnerGiaFee)
      );

      // Calculate growth on pot balances (Contributions receive half-year growth)
      const getGrowth = (pot: number, contrib: number, rate: number) => {
        return Math.max(0, (pot - contrib) * rate + contrib * (rate / 2));
      };
      
      const pensionGrowth = getGrowth(primaryPensionPot, primaryPensionContribThisYr, primaryAccumPensionRate) + 
                            getGrowth(partnerPensionPot, partnerPContribThisYr, partnerAccumPensionRate);
      
      const isaGrowth = getGrowth(primarySsIsaPot, primarySsIsaContribThisYr, primaryAccumIsaRate) + 
                        getGrowth(primaryLisaPot, primaryLisaContribThisYr, primaryAccumIsaRate) + 
                        getGrowth(primaryCashIsaPot, primaryCashIsaContribThisYr, accumCashRate) +
                        getGrowth(partnerSsIsaPot, partnerSsIContribThisYr, partnerAccumIsaRate) + 
                        getGrowth(partnerLisaPot, partnerLisaContribThisYr, partnerAccumIsaRate) +
                        getGrowth(partnerCashIsaPot, partnerCashIContribThisYr, accumCashRate);
                        
      const giaGrowth = getGrowth(primaryGiaPot, primaryGiaContribThisYr, primaryAccumGiaRate) + 
                        getGrowth(partnerGiaPot, partnerGiaContribThisYr, partnerAccumGiaRate);
      
      // Interest on cash savings
      const primaryCashInterest = getGrowth(primaryCashSavingsPot, primaryCashSavingsContribThisYr, accumCashRate);
      const partnerCashInterest = profile.isCouplePlanning ? getGrowth(partnerCashSavingsPot, partnerCashSavingsContribThisYr, accumCashRate) : 0;

      const primaryPsa = calculatePSAAndSavingsTax(
        primaryTaxThisYr.adjustedNetIncome,
        primaryCashInterest,
        profile.taxRegion === 'scotland',
        primaryTaxThisYr.effectiveGrossIncomeAfterSacrifice,
        primaryTaxThisYr.personalAllowance
      );
      const partnerPsa = (profile.isCouplePlanning && partnerTaxResult) ? calculatePSAAndSavingsTax(
        partnerTaxResult.adjustedNetIncome,
        partnerCashInterest,
        profile.taxRegion === 'scotland',
        partnerTaxResult.effectiveGrossIncomeAfterSacrifice,
        partnerTaxResult.personalAllowance
      ) : { savingsInterestTax: 0, personalSavingsAllowance: 1000 };

      const accumSavingsTax = primaryPsa.savingsInterestTax + partnerPsa.savingsInterestTax;
      const totalPsaUsed = Math.min(primaryPsa.personalSavingsAllowance, primaryCashInterest) + (profile.isCouplePlanning ? Math.min(partnerPsa.personalSavingsAllowance, partnerCashInterest) : 0);

      const cashGrowthNet = Math.max(0, primaryCashInterest + partnerCashInterest - accumSavingsTax);
      const estimatedPotGrowth = Math.round(pensionGrowth + isaGrowth + giaGrowth + cashGrowthNet);

      const applyGrowthToPot = (pot: number, contrib: number, rate: number) => {
        return Math.max(0, pot + getGrowth(pot, contrib, rate));
      };

      primaryUncrystallisedPot = applyGrowthToPot(primaryUncrystallisedPot, primaryPensionContribThisYr, primaryAccumPensionRate);
      primaryCrystallisedPot = applyGrowthToPot(primaryCrystallisedPot, 0, primaryAccumPensionRate);
      primaryPensionPot = primaryUncrystallisedPot + primaryCrystallisedPot;

      primarySsIsaPot = applyGrowthToPot(primarySsIsaPot, primarySsIsaContribThisYr, primaryAccumIsaRate);
      primaryCashIsaPot = applyGrowthToPot(primaryCashIsaPot, primaryCashIsaContribThisYr, accumCashRate);
      primaryLisaPot = applyGrowthToPot(primaryLisaPot, primaryLisaContribThisYr, primaryAccumIsaRate);
      primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
      
      primaryGiaPot = applyGrowthToPot(primaryGiaPot, primaryGiaContribThisYr, primaryAccumGiaRate);
      primaryCashSavingsPot = applyGrowthToPot(primaryCashSavingsPot, primaryCashSavingsContribThisYr, accumCashRate) - primaryPsa.savingsInterestTax;
      primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;

      if (profile.isCouplePlanning) {
        partnerUncrystallisedPot = applyGrowthToPot(partnerUncrystallisedPot, partnerPContribThisYr, partnerAccumPensionRate);
        partnerCrystallisedPot = applyGrowthToPot(partnerCrystallisedPot, 0, partnerAccumPensionRate);
        partnerPensionPot = partnerUncrystallisedPot + partnerCrystallisedPot;

        partnerSsIsaPot = applyGrowthToPot(partnerSsIsaPot, partnerSsIContribThisYr, partnerAccumIsaRate);
        partnerCashIsaPot = applyGrowthToPot(partnerCashIsaPot, partnerCashIContribThisYr, accumCashRate);
        partnerLisaPot = applyGrowthToPot(partnerLisaPot, partnerLisaContribThisYr, partnerAccumIsaRate);
        partnerIsaPot = partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot;
        
        partnerGiaPot = applyGrowthToPot(partnerGiaPot, partnerGiaContribThisYr, partnerAccumGiaRate);
        partnerCashSavingsPot = applyGrowthToPot(partnerCashSavingsPot, partnerCashSavingsContribThisYr, accumCashRate) - partnerPsa.savingsInterestTax;
        partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;
      }

      pensionPot = primaryPensionPot + partnerPensionPot;
      isaPot = primaryIsaPot + partnerIsaPot;
      const stocksAndSharesIsaPot = primarySsIsaPot + partnerSsIsaPot;
      const cashIsaPot = primaryCashIsaPot + partnerCashIsaPot;
      const lisaPot = primaryLisaPot + partnerLisaPot;
      giaPot = primaryGiaPot + partnerGiaPot;
      cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
      cashGiaPot = giaPot + cashSavingsPot;

      const aaChargePrimary = primaryTaxThisYr.annualAllowanceCharge || 0;
      const aaChargePartner = (partnerTaxThisYr?.annualAllowanceCharge) || 0;
      if (aaChargePrimary > 0) {
        primaryCashSavingsPot = Math.max(0, primaryCashSavingsPot - aaChargePrimary);
        primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;
      }
      if (aaChargePartner > 0 && profile.isCouplePlanning) {
        partnerCashSavingsPot = Math.max(0, partnerCashSavingsPot - aaChargePartner);
        partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;
      }
      cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
      cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
      const currentGiltPotBalance = isGiltLadderEnabled && giltLadderSummary && giltLadderPurchased
        ? giltLadderSummary.rungs.filter((r) => r.age > age).reduce((sum, r) => sum + r.purchaseCost, 0)
        : 0;
      const totalPot = Math.max(0, pensionPot + isaPot + cashGiaPot + currentGiltPotBalance);
      const totalTaxPaid = Math.round((primaryTaxThisYr.totalIncomeTax || 0) + (primaryTaxThisYr.totalNationalInsurance || 0) + accumSavingsTax + aaChargePrimary + aaChargePartner);

      processLifeEventsThisYear();
      const finalTotalPot = Math.max(0, pensionPot + isaPot + cashGiaPot + currentGiltPotBalance);

      projections.push({
        year: calendarYear,
        age,
        isRetired: false,
        pensionPot: Math.round(pensionPot),
        uncrystallisedPot: Math.round(primaryUncrystallisedPot + partnerUncrystallisedPot),
        crystallisedPot: Math.round(primaryCrystallisedPot + partnerCrystallisedPot),
        primaryUncrystallisedPot: Math.round(primaryUncrystallisedPot),
        primaryCrystallisedPot: Math.round(primaryCrystallisedPot),
        partnerUncrystallisedPot: Math.round(partnerUncrystallisedPot),
        partnerCrystallisedPot: Math.round(partnerCrystallisedPot),
        crystallisedThisYear: Math.round(primaryCrystallisedThisYear + partnerCrystallisedThisYear),
        primaryCrystallisedThisYear: Math.round(primaryCrystallisedThisYear),
        partnerCrystallisedThisYear: Math.round(partnerCrystallisedThisYear),
        pclsTaxFreeDrawnThisYear: Math.round(primaryPclsDrawnThisYear + partnerPclsDrawnThisYear),
        primaryLsaRemaining: Math.round(Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn)),
        partnerLsaRemaining: Math.round(Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn)),
        totalLsaRemaining: Math.round(Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn) + (profile.isCouplePlanning ? Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn) : 0)),
        isaPot: Math.round(isaPot),
        stocksAndSharesIsaPot: Math.round(stocksAndSharesIsaPot),
        cashIsaPot: Math.round(cashIsaPot),
        lisaPot: Math.round(lisaPot),
        cashGiaPot: Math.round(cashGiaPot),
        giaPot: Math.round(giaPot),
        cashSavingsPot: Math.round(cashSavingsPot),
        giltLadderPot: Math.round(currentGiltPotBalance),
        totalPot: Math.round(finalTotalPot),

        primaryPensionPot: Math.round(primaryPensionPot),
        primaryPensionPotBeforeAnnuity: Math.round(primaryPensionPot),
        primaryPensionPotBeforePcls,
        primaryIsaPot: Math.round(primaryIsaPot),
        primaryStocksAndSharesIsaPot: Math.round(primarySsIsaPot),
        primaryCashIsaPot: Math.round(primaryCashIsaPot),
        primaryLisaPot: Math.round(primaryLisaPot),
        primaryCashGiaPot: Math.round(primaryCashGiaPot),
        primaryGiaPot: Math.round(primaryGiaPot),
        primaryCashSavingsPot: Math.round(primaryCashSavingsPot),
        primaryGiltLadderPot: Math.round(currentGiltPotBalance),
        primaryTotalPot: Math.round(primaryPensionPot + primaryIsaPot + primaryCashGiaPot + currentGiltPotBalance),

        partnerPensionPot: Math.round(partnerPensionPot),
        partnerPensionPotBeforeAnnuity: Math.round(partnerPensionPot),
        partnerPensionPotBeforePcls,
        partnerIsaPot: Math.round(partnerIsaPot),
        partnerStocksAndSharesIsaPot: Math.round(partnerSsIsaPot),
        partnerCashIsaPot: Math.round(partnerCashIsaPot),
        partnerLisaPot: Math.round(partnerLisaPot),
        partnerCashGiaPot: Math.round(partnerCashGiaPot),
        partnerGiaPot: Math.round(partnerGiaPot),
        partnerCashSavingsPot: Math.round(partnerCashSavingsPot),
        partnerTotalPot: Math.round(partnerPensionPot + partnerIsaPot + partnerCashGiaPot),

        estimatedPotGrowth,
        estimatedInvestmentFees: accumFeesPaid,
        annualContributionTotal: Math.round(primaryPensionContribThisYr + primaryIsaContribThisYr + primaryCashGiaPotContribThisYr + partnerPContribThisYr + partnerIContribThisYr + partnerCContribThisYr),
        oneOffContributionsReceived: Math.round(oneOffInflowsThisYear),
        lifeEventsIncome: Math.round(lifeEventsIncomeThisYear),
        propertyDownsizeEquityReleased: Math.round(propertyDownsizeEquityReleasedThisYear),
        lifeEventsExpense: Math.round(lifeEventsExpenseThisYear),
        decumulationLifeEventsSummary: decumulationEventSummaries.join(', '),
        annualTaxReliefTotal: Math.round(primaryTaxThisYr.totalPensionTaxRelief + primaryTaxThisYr.lisaGovernmentBonusAnnual + (partnerTaxThisYr ? partnerTaxThisYr.totalPensionTaxRelief + partnerTaxThisYr.lisaGovernmentBonusAnnual : 0)),
        statePensionReceived: Math.round(statePensionReceived),
        dbPensionIncomeReceived: Math.round(dbPensionIncomeReceived),
        dbTaxFreeLumpSumReceived: Math.round(dbTaxFreeLumpSumReceived),
        taxableFixedIncomeReceived: Math.round(taxableFixedIncomeReceived),
        taxFreeFixedIncomeReceived: Math.round(taxFreeFixedIncomeReceived),
        pensionDrawdown: 0,
        pensionDrawdownTaxFree: 0,
        pensionDrawdownTaxable: 0,
        annuityIncomeReceived: Math.round(annuityIncomeThisYear),
        giltLadderIncomeReceived: Math.round(giltLadderIncomeThisYear),
        giltLadderCapitalAllocated: Math.round(giltLadderCapitalAllocatedThisYear),
        giltLadderPurchasedThisYear: giltLadderCapitalAllocatedThisYear > 0,
        isaDrawdown: 0,
        cashDrawdown: 0,
        totalWithdrawalAmount: 0,
        taxOnWithdrawal: 0,
        totalTaxPaid,
        primaryTaxPaid: Math.round(primaryTaxThisYr.totalIncomeTax + primaryPsa.savingsInterestTax),
        partnerTaxPaid: partnerTaxThisYr ? Math.round(partnerTaxThisYr.totalIncomeTax + partnerPsa.savingsInterestTax) : 0,
        primaryNetIncome: 0,
        partnerNetIncome: 0,
        savingsInterestTax: Math.round(accumSavingsTax),
        primarySavingsInterestTax: Math.round(primaryPsa.savingsInterestTax),
        partnerSavingsInterestTax: Math.round(partnerPsa.savingsInterestTax),
        personalSavingsAllowanceUsed: Math.round(totalPsaUsed),
        netRetirementIncome: 0,
        purchasingPowerAdjustedIncome: 0,
        targetRetirementIncome: 0,
        incomeShortfall: 0,
        incomeRequirementMet: true,
        potDepleted: false,
        canAccessPension,
      });
    } else {
      // DECUMULATION PHASE

      // Pot-specific growth rates (if overrides enabled)
      const overrides = profile.potReturnOverrides;
      const useOverrides = Boolean(overrides?.enabled);

      const returnAccumulationGross = (profile.assetAllocationSplit && profile.assetAllocationSplit.enabled)
        ? calculateWeightedAssetReturn(profile.assetAllocationSplit.accumulation, profile.assetAllocationSplit.assetClassReturns) / 100
        : (profile.expectedInvestmentReturn || 6.5) / 100;

      const returnDecumulationGross = (profile.assetAllocationSplit && profile.assetAllocationSplit.enabled)
        ? calculateWeightedAssetReturn(profile.assetAllocationSplit.decumulation, profile.assetAllocationSplit.assetClassReturns) / 100
        : (profile.postRetirementReturn || 4.5) / 100;
      const returnBaseGross = isRetired ? returnDecumulationGross : returnAccumulationGross;

      const primaryPensionFeeDecum = getPotFeePercent(profile.investmentFees, 'primary', 'pension', cleanPots) / 100;
      const partnerPensionFeeDecum = getPotFeePercent(profile.investmentFees, 'partner', 'pension', profile.partnerPots) / 100;
      const primaryIsaFeeDecum = getPotFeePercent(profile.investmentFees, 'primary', 'stocksAndSharesIsa') / 100;
      const partnerIsaFeeDecum = getPotFeePercent(profile.investmentFees, 'partner', 'stocksAndSharesIsa') / 100;
      const primaryGiaFeeDecum = getPotFeePercent(profile.investmentFees, 'primary', 'gia') / 100;
      const partnerGiaFeeDecum = getPotFeePercent(profile.investmentFees, 'partner', 'gia') / 100;

      const currentPhase = isRetired ? 'decumulation' : 'accumulation';

      const primaryPensionGrossDecum = useOverrides
        ? (overrides!.workplacePensionReturn || 7.0) / 100
        : getPotGrossReturn(profile.assetAllocationSplit, 'primary', 'pension', currentPhase, returnBaseGross * 100) / 100;
      const partnerPensionGrossDecum = useOverrides
        ? (overrides!.workplacePensionReturn || 7.0) / 100
        : getPotGrossReturn(profile.assetAllocationSplit, 'partner', 'pension', currentPhase, returnBaseGross * 100) / 100;

      const primaryIsaGrossDecum = useOverrides
        ? (overrides!.stocksAndSharesIsaReturn || 7.5) / 100
        : getPotGrossReturn(profile.assetAllocationSplit, 'primary', 'stocksAndSharesIsa', currentPhase, returnBaseGross * 100) / 100;
      const partnerIsaGrossDecum = useOverrides
        ? (overrides!.stocksAndSharesIsaReturn || 7.5) / 100
        : getPotGrossReturn(profile.assetAllocationSplit, 'partner', 'stocksAndSharesIsa', currentPhase, returnBaseGross * 100) / 100;

      const primaryGiaGrossDecum = useOverrides
        ? (overrides!.giaReturn || 6.5) / 100
        : getPotGrossReturn(profile.assetAllocationSplit, 'primary', 'gia', currentPhase, (isRetired ? returnDecumulationGross * 95 : returnAccumulationGross * 90)) / 100;
      const partnerGiaGrossDecum = useOverrides
        ? (overrides!.giaReturn || 6.5) / 100
        : getPotGrossReturn(profile.assetAllocationSplit, 'partner', 'gia', currentPhase, (isRetired ? returnDecumulationGross * 95 : returnAccumulationGross * 90)) / 100;

      const primaryPensionRateDecum = Math.max(-0.05, primaryPensionGrossDecum - primaryPensionFeeDecum);
      const partnerPensionRateDecum = Math.max(-0.05, partnerPensionGrossDecum - partnerPensionFeeDecum);
      const primaryIsaRateDecum = Math.max(-0.05, primaryIsaGrossDecum - primaryIsaFeeDecum);
      const partnerIsaRateDecum = Math.max(-0.05, partnerIsaGrossDecum - partnerIsaFeeDecum);
      const primaryGiaRateDecum = Math.max(-0.05, primaryGiaGrossDecum - primaryGiaFeeDecum);
      const partnerGiaRateDecum = Math.max(-0.05, partnerGiaGrossDecum - partnerGiaFeeDecum);

      const effectiveCashIsaRate = useOverrides
        ? (overrides!.cashIsaReturn || 4.2) / 100
        : (isRetired ? returnDecumulation * 0.85 : returnAccumulation * 0.85);

      const effectiveCashSavingsRate = useOverrides
        ? (overrides!.cashSavingsReturn || 3.5) / 100
        : (isRetired ? returnDecumulation * 0.85 : returnAccumulation * 0.80);

      // Apply annual investment growth for remaining active pots (Primary & Partner)
      const primaryPensionGrowth = primaryPensionPot * primaryPensionRateDecum;
      const partnerPensionGrowth = partnerPensionPot * partnerPensionRateDecum;
      const primaryIsaGrowth = (primarySsIsaPot * primaryIsaRateDecum) + (primaryCashIsaPot * effectiveCashIsaRate) + (primaryLisaPot * primaryIsaRateDecum);
      const partnerIsaGrowth = (partnerSsIsaPot * partnerIsaRateDecum) + (partnerCashIsaPot * effectiveCashIsaRate) + (partnerLisaPot * partnerIsaRateDecum);
      const primaryGiaGrowth = primaryGiaPot * primaryGiaRateDecum;
      const partnerGiaGrowth = partnerGiaPot * partnerGiaRateDecum;
      const primaryCashGrowth = primaryCashSavingsPot * effectiveCashSavingsRate;
      const partnerCashGrowth = partnerCashSavingsPot * effectiveCashSavingsRate;

      const decumFeesPaid = Math.round(
        (primaryPensionPot * primaryPensionFeeDecum) +
        (partnerPensionPot * partnerPensionFeeDecum) +
        (primarySsIsaPot * primaryIsaFeeDecum) +
        (partnerSsIsaPot * partnerIsaFeeDecum) +
        (primaryGiaPot * primaryGiaFeeDecum) +
        (partnerGiaPot * partnerGiaFeeDecum)
      );

      let estimatedPotGrowth = Math.round(
        primaryPensionGrowth + partnerPensionGrowth +
        primaryIsaGrowth + partnerIsaGrowth +
        primaryGiaGrowth + partnerGiaGrowth +
        primaryCashGrowth + partnerCashGrowth
      );

      primaryUncrystallisedPot = Math.max(0, primaryUncrystallisedPot * (1 + primaryPensionRateDecum));
      primaryCrystallisedPot = Math.max(0, primaryCrystallisedPot * (1 + primaryPensionRateDecum));
      primaryPensionPot = primaryUncrystallisedPot + primaryCrystallisedPot;

      if (profile.isCouplePlanning) {
        partnerUncrystallisedPot = Math.max(0, partnerUncrystallisedPot * (1 + partnerPensionRateDecum));
        partnerCrystallisedPot = Math.max(0, partnerCrystallisedPot * (1 + partnerPensionRateDecum));
        partnerPensionPot = partnerUncrystallisedPot + partnerCrystallisedPot;
      } else {
        partnerPensionPot *= (1 + partnerPensionRateDecum);
      }

      primarySsIsaPot *= (1 + primaryIsaRateDecum);
      primaryCashIsaPot *= (1 + effectiveCashIsaRate);
      primaryLisaPot *= (1 + primaryIsaRateDecum);
      primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;

      partnerSsIsaPot *= (1 + partnerIsaRateDecum);
      partnerCashIsaPot *= (1 + effectiveCashIsaRate);
      partnerLisaPot *= (1 + partnerIsaRateDecum);
      partnerIsaPot = partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot;

      primaryGiaPot *= (1 + primaryGiaRateDecum);
      partnerGiaPot *= (1 + partnerGiaRateDecum);
      primaryCashSavingsPot *= (1 + effectiveCashSavingsRate);
      partnerCashSavingsPot *= (1 + effectiveCashSavingsRate);

      primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;
      partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;

      pensionPot = primaryPensionPot + partnerPensionPot;
      isaPot = primaryIsaPot + partnerIsaPot;
      giaPot = primaryGiaPot + partnerGiaPot;
      cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
      cashGiaPot = giaPot + cashSavingsPot;
      cashGiaPot = giaPot + cashSavingsPot;

      processLifeEventsThisYear();

      // Desired gross retirement income adjusted for inflationion
      const maxDrawdownIncomeTarget = getTargetIncomeForAge(profile, age);
      const actualSpendingBase = getActualSpendingTargetForAge(profile, age);

      const isReinvestExcess = Boolean(
        profile.reinvestExcessDrawdown ||
        profile.maximizedSpendConfig?.reinvestExcessDrawdown
      );

      let incomeIncreaseFactor = inflationFactor;
      if (profile.incomeIncreaseMode === 'custom') {
        const customRate = (profile.customIncomeIncreasePercent ?? 0) / 100;
        incomeIncreaseFactor = Math.pow(1 + customRate, yearOffset);
      }

      const requiredNetIncomeTarget = actualSpendingBase * incomeIncreaseFactor;
      const drawdownNetTarget = isReinvestExcess ? (maxDrawdownIncomeTarget * incomeIncreaseFactor) : requiredNetIncomeTarget;

      // Individual Personal Allowance — indexed with CPI inflation or frozen at base level based on user preference
      const paBase = profile.customTaxBands?.enabled ? (profile.customTaxBands.personalAllowance ?? PERSONAL_ALLOWANCE) : PERSONAL_ALLOWANCE;
      const singlePersonalAllowance = paBase * (indexTaxBands ? inflationFactor : 1);
      const personalAllowanceInflated = profile.isCouplePlanning ? singlePersonalAllowance * 2 : singlePersonalAllowance;

      // Individual Guaranteed Income Streams
      const primaryTaxableGuaranteed = primaryStatePensionReceived + primaryAnnuityIncomeThisYear + primaryDbPensionReceived + primaryTaxableFixedIncomeReceived;
      const primaryGuaranteedTotal = primaryTaxableGuaranteed + primaryTaxFreeFixedIncomeReceived;

      const partnerTaxableGuaranteed = profile.isCouplePlanning
        ? partnerStatePensionReceived + partnerAnnuityIncomeThisYear + partnerDbPensionReceived + partnerTaxableFixedIncomeReceived
        : 0;
      const partnerGuaranteedTotal = partnerTaxableGuaranteed + (profile.isCouplePlanning ? partnerTaxFreeFixedIncomeReceived : 0);

      const taxableGuaranteedIncome = primaryTaxableGuaranteed + partnerTaxableGuaranteed;
      const guaranteedIncomeTotal = primaryGuaranteedTotal + partnerGuaranteedTotal;

      // Compute guaranteed income tax liability using strict individual assessment
      const primaryGuaranteedTax = computeIncomeTax(primaryTaxableGuaranteed, inflationFactor, isScottishTax);
      const partnerGuaranteedTax = profile.isCouplePlanning
        ? computeIncomeTax(partnerTaxableGuaranteed, inflationFactor, isPartnerScottishTax)
        : 0;
      const guaranteedTaxLiability = primaryGuaranteedTax + partnerGuaranteedTax;

      // True Net Guaranteed Income secured
      const netGuaranteedIncomeSecured = Math.max(0, guaranteedIncomeTotal - guaranteedTaxLiability);

      // Phased Crystallisation / PCLS Tax-Free Income secured this year
      const phasedTaxFreeIncomeThisYear = primaryPclsDrawnThisYear + partnerPclsDrawnThisYear;
      const netInitialIncomeSecured = netGuaranteedIncomeSecured + phasedTaxFreeIncomeThisYear + giltLadderIncomeThisYear;

      // Remaining net income needed from investment pots to reach drawdownNetTarget
      let remainingIncomeNeeded = Math.max(0, drawdownNetTarget - netInitialIncomeSecured);

            let priActualUncrystDrawn = 0;
      let partActualUncrystDrawn = 0;
      let priActualDraw = 0;
      let partActualDraw = 0;
      let primaryIsaDrawdown = 0;
      let partnerIsaDrawdown = 0;
      let primaryCashDrawdown = 0;
      let partnerCashDrawdown = 0;
      let pensionDrawdown = 0;
      let isaDrawdown = 0;
      let cashDrawdown = 0;
      let taxOnWithdrawal = 0;

        let primaryGuaranteedIncome = 0;
        let partnerGuaranteedIncome = 0;
        if (profile.isCouplePlanning && !partnerDead) {
          primaryGuaranteedIncome = primaryStatePensionReceived + primaryDbPensionReceived + primaryTaxableFixedIncomeReceived + primaryAnnuityIncomeThisYear;
          partnerGuaranteedIncome = partnerStatePensionReceived + partnerDbPensionReceived + partnerTaxableFixedIncomeReceived + partnerAnnuityIncomeThisYear;
        } else {
          primaryGuaranteedIncome = taxableGuaranteedIncome;
        }

        const executeDeduct = (potType: 'pension' | 'isa' | 'cashGia', amount: number, owner: 'primary' | 'partner') => {
          if (amount <= 0) return;
          if (potType === 'pension') {
            if (owner === 'primary') {
              let remaining = amount;
              if (primaryCrystallisedPot > 0) {
                 const d = Math.min(primaryCrystallisedPot, remaining);
                 primaryCrystallisedPot -= d;
                 remaining -= d;
                 priActualDraw += d;
              }
              if (remaining > 0 && primaryUncrystallisedPot > 0) {
                 const d = Math.min(primaryUncrystallisedPot, remaining);
                 primaryUncrystallisedPot -= d;
                 remaining -= d;
                 priActualUncrystDrawn += d;
                 priActualDraw += d;
              }
              primaryPensionPot = primaryCrystallisedPot + primaryUncrystallisedPot;
            } else {
              let remaining = amount;
              if (partnerCrystallisedPot > 0) {
                 const d = Math.min(partnerCrystallisedPot, remaining);
                 partnerCrystallisedPot -= d;
                 remaining -= d;
                 partActualDraw += d;
              }
              if (remaining > 0 && partnerUncrystallisedPot > 0) {
                 const d = Math.min(partnerUncrystallisedPot, remaining);
                 partnerUncrystallisedPot -= d;
                 remaining -= d;
                 partActualUncrystDrawn += d;
                 partActualDraw += d;
              }
              partnerPensionPot = partnerCrystallisedPot + partnerUncrystallisedPot;
            }
            pensionPot = primaryPensionPot + partnerPensionPot;
            pensionDrawdown += amount;
          } else if (potType === 'isa') {
            if (owner === 'primary') {
               const r = amount / primaryIsaPot;
               primarySsIsaPot = Math.max(0, primarySsIsaPot * (1 - r));
               primaryCashIsaPot = Math.max(0, primaryCashIsaPot * (1 - r));
               primaryLisaPot = Math.max(0, primaryLisaPot * (1 - r));
               primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
               primaryIsaDrawdown += amount;
            } else {
               const r = amount / partnerIsaPot;
               partnerSsIsaPot = Math.max(0, partnerSsIsaPot * (1 - r));
               partnerCashIsaPot = Math.max(0, partnerCashIsaPot * (1 - r));
               partnerLisaPot = Math.max(0, partnerLisaPot * (1 - r));
               partnerIsaPot = partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot;
               partnerIsaDrawdown += amount;
            }
            isaPot = primaryIsaPot + partnerIsaPot;
            isaDrawdown += amount;
          } else if (potType === 'cashGia') {
            if (owner === 'primary') {
               let remaining = amount;
               if (primaryCashSavingsPot > 0) {
                 const d = Math.min(primaryCashSavingsPot, remaining);
                 primaryCashSavingsPot -= d;
                 remaining -= d;
               }
               if (remaining > 0 && primaryGiaPot > 0) {
                 const d = Math.min(primaryGiaPot, remaining);
                 primaryGiaPot -= d;
                 remaining -= d;
               }
               primaryCashGiaPot = primaryCashSavingsPot + primaryGiaPot;
               primaryCashDrawdown += amount;
            } else {
               let remaining = amount;
               if (partnerCashSavingsPot > 0) {
                 const d = Math.min(partnerCashSavingsPot, remaining);
                 partnerCashSavingsPot -= d;
                 remaining -= d;
               }
               if (remaining > 0 && partnerGiaPot > 0) {
                 const d = Math.min(partnerGiaPot, remaining);
                 partnerGiaPot -= d;
                 remaining -= d;
               }
               partnerCashGiaPot = partnerCashSavingsPot + partnerGiaPot;
               partnerCashDrawdown += amount;
            }
            cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
            cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
            giaPot = primaryGiaPot + partnerGiaPot;
            cashDrawdown += amount;
          }
        };

        const approximateNetFromGrossForOwner = (grossDraw: number, owner: 'primary' | 'partner'): number => {
          let taxFree = 0;
          if (owner === 'primary') {
            const crystDrawn = Math.min(primaryCrystallisedPot, grossDraw);
            const uncrystDrawn = Math.min(primaryUncrystallisedPot, Math.max(0, grossDraw - crystDrawn));
            taxFree = Math.min(uncrystDrawn * 0.25, Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn));
          } else {
            const crystDrawn = Math.min(partnerCrystallisedPot, grossDraw);
            const uncrystDrawn = Math.min(partnerUncrystallisedPot, Math.max(0, grossDraw - crystDrawn));
            taxFree = Math.min(uncrystDrawn * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
          }
          
          const taxableDrawdown = grossDraw - taxFree;
          const guaranteedTaxable = owner === 'primary' ? primaryGuaranteedIncome : partnerGuaranteedIncome;
          const totalTaxable = guaranteedTaxable + taxableDrawdown;
          const isScot = owner === 'primary' ? isScottishTax : isPartnerScottishTax;
          
          const totalTax = computeIncomeTax(totalTaxable, inflationFactor, isScot);
          const baseTax = computeIncomeTax(guaranteedTaxable, inflationFactor, isScot);
          const marginalTax = Math.max(0, totalTax - baseTax);
          
          return grossDraw - marginalTax;
        };

        const getGrossPensionNeededForNetForOwner = (netNeeded: number, potAvailable: number, owner: 'primary' | 'partner'): number => {
          if (netNeeded <= 0 || potAvailable <= 0) return 0;
          let low = 0;
          let high = Math.min(potAvailable, netNeeded * 5.0);
          let bestGross = high;
          for (let i = 0; i < 25; i++) {
            const mid = (low + high) / 2;
            const net = approximateNetFromGrossForOwner(mid, owner);
            if (net >= netNeeded) { high = mid; bestGross = mid; } else { low = mid; }
          }
          const exactGross = approximateNetFromGrossForOwner(bestGross, owner) >= netNeeded ? bestGross : potAvailable;
          return Math.min(potAvailable, Math.ceil(exactGross));
        };

        const executeStrategyForOwner = (strategy: string, owner: 'primary' | 'partner', targetNetNeeded: number): number => {
          if (targetNetNeeded <= 0) return 0;

          const isPrimary = owner === 'primary';
          const pPot = isPrimary ? primaryPensionPot : partnerPensionPot;
          const iPot = isPrimary ? primaryIsaPot : partnerIsaPot;
          const cPot = isPrimary ? primaryCashGiaPot : partnerCashGiaPot;
          const hasAccess = isPrimary ? (age >= pensionAccessAge || primaryCrystallisedPot > 0) : (profile.isCouplePlanning && !partnerDead && (age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge) >= partnerPensionAccessAge || partnerCrystallisedPot > 0));
          
          let remaining = targetNetNeeded;
          let netAchieved = 0;

          const executePensionDeduct = (grossDrawNeeded: number) => {
             const draw = Math.min(pPot, grossDrawNeeded);
             const netDraw = approximateNetFromGrossForOwner(draw, owner);
             executeDeduct('pension', draw, owner); if (age === 60) console.log('DEBUG PENSION DEDUCT:', {draw, netDraw, remaining});
             remaining = Math.max(0, remaining - netDraw);
             netAchieved += netDraw;
          };

          if (isReinvestExcess) {
            if (hasAccess && pPot > 0) {
              const grossDrawNeeded = getGrossPensionNeededForNetForOwner(remaining, pPot, owner);
              executePensionDeduct(grossDrawNeeded);
            }
            if (iPot > 0 && remaining > 0) {
              const draw = Math.min(iPot, remaining);
              executeDeduct('isa', draw, owner);
              remaining -= draw;
              netAchieved += draw;
            }
            if (cPot > 0 && remaining > 0) {
              const draw = Math.min(cPot, remaining);
              executeDeduct('cashGia', draw, owner);
              remaining -= draw;
              netAchieved += draw;
            }
          } else if (strategy === 'isa_first' || strategy === 'cash_first' || strategy === 'pension_first') {
            const order = strategy === 'cash_first'
                ? ['cashGia', 'isa', 'pension']
                : strategy === 'pension_first'
                ? ['pension', 'isa', 'cashGia']
                : ['isa', 'cashGia', 'pension'];

            for (const potType of order) {
              if (remaining <= 0) break;
              if (potType === 'isa' && iPot > 0) {
                const draw = Math.min(iPot, remaining);
                executeDeduct('isa', draw, owner);
                remaining -= draw;
                netAchieved += draw;
              } else if (potType === 'cashGia' && cPot > 0) {
                const draw = Math.min(cPot, remaining);
                executeDeduct('cashGia', draw, owner);
                remaining -= draw;
                netAchieved += draw;
              } else if (potType === 'pension' && hasAccess && pPot > 0) {
                const grossDrawNeeded = getGrossPensionNeededForNetForOwner(remaining, pPot, owner);
                executePensionDeduct(grossDrawNeeded);
              }
            }
          } else if (strategy === 'tax_optimizer' || strategy === 'tax_free_bracket' || strategy === 'basic_rate_bracket' || strategy === 'higher_rate_bracket') {
            const isScot = isPrimary ? profile.taxRegion === 'scotland' : (profile.partnerTaxRegion || profile.taxRegion) === 'scotland';
            const inflMult = inflationFactor;

            let thresholdGross = 12570 * inflMult;
            if (strategy === 'tax_optimizer' || strategy === 'basic_rate_bracket') {
              thresholdGross = (12570 + (isScot ? SCOT_INTERMEDIATE_THRESHOLD : RUK_BASIC_THRESHOLD)) * inflMult;
            } else if (strategy === 'higher_rate_bracket') {
              thresholdGross = (isScot ? (12570 + SCOT_HIGHER_THRESHOLD) : RUK_ADDITIONAL_THRESHOLD) * inflMult;
            }

            const incomeAlready = isPrimary ? primaryGuaranteedIncome : partnerGuaranteedIncome;
            const room = Math.max(0, thresholdGross - incomeAlready);

            const remLsa = Math.max(0, (isPrimary ? primaryMaxLsa : partnerMaxLsa) - (isPrimary ? primaryCumulativeTaxFreeDrawn : partnerCumulativeTaxFreeDrawn));
            const crystPot = isPrimary ? primaryCrystallisedPot : partnerCrystallisedPot;

            let maxGrossForBracket = 0;
            if (room > 0) {
              if (remLsa >= room / 3) {
                maxGrossForBracket = room / 0.75;
              } else {
                maxGrossForBracket = room + remLsa;
              }
            }

            let targetGross = Math.min(hasAccess ? pPot : 0, maxGrossForBracket);
            if (targetGross > 0) {
               const maxNet = approximateNetFromGrossForOwner(targetGross, owner);
               if (maxNet > remaining) targetGross = getGrossPensionNeededForNetForOwner(remaining, pPot, owner);
               executePensionDeduct(targetGross);
            }
            if (iPot > 0 && remaining > 0) {
              const draw = Math.min(iPot, remaining);
              executeDeduct('isa', draw, owner);
              remaining -= draw;
              netAchieved += draw;
            }
            if (cPot > 0 && remaining > 0) {
              const draw = Math.min(cPot, remaining);
              executeDeduct('cashGia', draw, owner);
              remaining -= draw;
              netAchieved += draw;
            }
          } else if (strategy === 'pro_rata') {
            const totalAccessible = cPot + iPot + (hasAccess ? pPot : 0);
            if (totalAccessible > 0 && remaining > 0) {
              if (hasAccess && pPot > 0) {
                const portion = pPot / totalAccessible;
                const netToDraw = remaining * portion;
                const grossDrawNeeded = getGrossPensionNeededForNetForOwner(netToDraw, pPot, owner);
                executePensionDeduct(grossDrawNeeded);
              }
              if (iPot > 0 && remaining > 0) {
                const portion = iPot / totalAccessible;
                const draw = Math.min(iPot, remaining * portion);
                executeDeduct('isa', draw, owner);
                remaining -= draw;
                netAchieved += draw;
              }
              if (cPot > 0 && remaining > 0) {
                const draw = Math.min(cPot, remaining);
                executeDeduct('cashGia', draw, owner);
                remaining -= draw;
                netAchieved += draw;
              }
            }
          }
          return netAchieved;
        };

        const primaryStrategy = profile.drawdownStrategy || 'isa_first';
        const partnerStrategy = profile.isCouplePlanning ? (profile.partnerDrawdownStrategy || primaryStrategy) : primaryStrategy;

        const hasPriAcc = (age >= pensionAccessAge || primaryCrystallisedPot > 0);
        const hasPartAcc = (profile.isCouplePlanning && !partnerDead && (age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge) >= partnerPensionAccessAge || partnerCrystallisedPot > 0));

        let priAvailTotal = primaryIsaPot + primaryCashGiaPot + (hasPriAcc ? primaryPensionPot : 0);
        let partAvailTotal = 0;
        if (profile.isCouplePlanning && !partnerDead) {
          partAvailTotal = partnerIsaPot + partnerCashGiaPot + (hasPartAcc ? partnerPensionPot : 0);
        }

        const totalAvail = priAvailTotal + partAvailTotal;
        let priRatio = 1;
        let partRatio = 0;
        if (totalAvail > 0) {
          priRatio = priAvailTotal / totalAvail;
          partRatio = partAvailTotal / totalAvail;
        }

        let primaryNetNeeded = remainingIncomeNeeded * priRatio;
        let partnerNetNeeded = remainingIncomeNeeded * partRatio;

        let priAchieved = executeStrategyForOwner(primaryStrategy, 'primary', primaryNetNeeded);
        let partAchieved = 0;
        
        let primaryShortfall = primaryNetNeeded - priAchieved;
        if (profile.isCouplePlanning && !partnerDead) {
          partnerNetNeeded += Math.max(0, primaryShortfall);
          partAchieved = executeStrategyForOwner(partnerStrategy, 'partner', partnerNetNeeded);
          
          let partnerShortfall = partnerNetNeeded - partAchieved;
          if (partnerShortfall > 0) {
            priAchieved += executeStrategyForOwner(primaryStrategy, 'primary', partnerShortfall);
          }
        }
        
        remainingIncomeNeeded = Math.max(0, drawdownNetTarget - netInitialIncomeSecured - priAchieved - partAchieved);

        if (remainingIncomeNeeded > 0) {
          if (primaryIsaPot > 0) executeDeduct('isa', Math.min(primaryIsaPot, remainingIncomeNeeded), 'primary');
          if (partnerIsaPot > 0) executeDeduct('isa', Math.min(partnerIsaPot, remainingIncomeNeeded), 'partner');
          if (primaryCashGiaPot > 0) executeDeduct('cashGia', Math.min(primaryCashGiaPot, remainingIncomeNeeded), 'primary');
          if (partnerCashGiaPot > 0) executeDeduct('cashGia', Math.min(partnerCashGiaPot, remainingIncomeNeeded), 'partner');
          if (hasPriAcc && primaryPensionPot > 0) executeDeduct('pension', Math.min(primaryPensionPot, getGrossPensionNeededForNetForOwner(remainingIncomeNeeded, primaryPensionPot, 'primary')), 'primary');
          if (hasPartAcc && partnerPensionPot > 0) executeDeduct('pension', Math.min(partnerPensionPot, getGrossPensionNeededForNetForOwner(remainingIncomeNeeded, partnerPensionPot, 'partner')), 'partner');
        }


      // Calculate Total Taxable Income & Comprehensive Income Tax Liability in Retirement (Annuity, State, DB, & Pension Drawdown)
      const priDrawGross = priActualDraw;
      const partDrawGross = partActualDraw;

      const priUncrystDrawn = priActualUncrystDrawn;
      const priDrawTaxFree = Math.min(priUncrystDrawn * 0.25, Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn));
      const priDrawTaxable = priDrawGross - priDrawTaxFree;

      const partUncrystDrawn = partActualUncrystDrawn;
      const partDrawTaxFree = Math.min(partUncrystDrawn * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
      const partDrawTaxable = partDrawGross - partDrawTaxFree;

      if (priDrawTaxFree > 0) primaryCumulativeTaxFreeDrawn += priDrawTaxFree;
      if (partDrawTaxFree > 0) partnerCumulativeTaxFreeDrawn += partDrawTaxFree;

      // Include phased crystallisation PCLS into pension tax-free drawdown
      const priPensionDrawdownTaxFree = primaryPclsDrawnThisYear + priDrawTaxFree;
      const partPensionDrawdownTaxFree = partnerPclsDrawnThisYear + partDrawTaxFree;
      const pensionDrawdownTaxFree = priPensionDrawdownTaxFree + partPensionDrawdownTaxFree;

      const priPensionDrawdownTaxable = priDrawTaxable;
      const partPensionDrawdownTaxable = partDrawTaxable;
      const pensionDrawdownTaxable = priPensionDrawdownTaxable + partPensionDrawdownTaxable;

      const primaryPensionDrawdown = priPensionDrawdownTaxFree + priPensionDrawdownTaxable;
      const partnerPensionDrawdown = partPensionDrawdownTaxFree + partPensionDrawdownTaxable;
      pensionDrawdown = primaryPensionDrawdown + partnerPensionDrawdown;

      const totalTaxableIncomeRetirement = taxableGuaranteedIncome + pensionDrawdownTaxable;

      // Calculate Decumulation Personal Savings Allowance & Savings Interest Tax
      let decumSavingsTaxNominal = 0;
      let decumPsaUsedNominal = 0;
      let priSavingsTaxNominal = 0;
      let partSavingsTaxNominal = 0;

      if (profile.isCouplePlanning) {
        const priTaxableIncReal = (primaryStatePensionReceived + primaryDbPensionReceived + primaryTaxableFixedIncomeReceived + primaryAnnuityIncomeThisYear + priDrawTaxable) / inflationFactor;
        const priCashIntReal = primaryCashGrowth / inflationFactor;
        const partTaxableIncReal = (partnerStatePensionReceived + partnerDbPensionReceived + partnerTaxableFixedIncomeReceived + partnerAnnuityIncomeThisYear + partDrawTaxable) / inflationFactor;
        const partCashIntReal = partnerCashGrowth / inflationFactor;

        const getPA = (income: number) => Math.max(0, PERSONAL_ALLOWANCE - (income > PA_TAPER_THRESHOLD ? Math.floor((income - PA_TAPER_THRESHOLD) / 2) : 0));
        const priPA = getPA(priTaxableIncReal);
        const partPA = getPA(partTaxableIncReal);

        const psaP1 = calculatePSAAndSavingsTax(priTaxableIncReal, priCashIntReal, profile.taxRegion === 'scotland', priTaxableIncReal, priPA);
        const psaP2 = calculatePSAAndSavingsTax(partTaxableIncReal, partCashIntReal, profile.taxRegion === 'scotland', partTaxableIncReal, partPA);

        priSavingsTaxNominal = psaP1.savingsInterestTax * inflationFactor;
        partSavingsTaxNominal = psaP2.savingsInterestTax * inflationFactor;

        decumSavingsTaxNominal = priSavingsTaxNominal + partSavingsTaxNominal;
        decumPsaUsedNominal = (Math.min(psaP1.personalSavingsAllowance, priCashIntReal) + Math.min(psaP2.personalSavingsAllowance, partCashIntReal)) * inflationFactor;

        if (decumSavingsTaxNominal > 0) {
          if (priSavingsTaxNominal > 0) {
            let rem = priSavingsTaxNominal;
            if (primaryCashSavingsPot > 0) {
              const draw = Math.min(primaryCashSavingsPot, rem);
              primaryCashSavingsPot -= draw;
              rem -= draw;
            }
            if (rem > 0 && primaryGiaPot > 0) {
              primaryGiaPot = Math.max(0, primaryGiaPot - rem);
            }
            primaryCashGiaPot = primaryCashSavingsPot + primaryGiaPot;
          }
          if (partSavingsTaxNominal > 0) {
            let rem = partSavingsTaxNominal;
            if (partnerCashSavingsPot > 0) {
              const draw = Math.min(partnerCashSavingsPot, rem);
              partnerCashSavingsPot -= draw;
              rem -= draw;
            }
            if (rem > 0 && partnerGiaPot > 0) {
              partnerGiaPot = Math.max(0, partnerGiaPot - rem);
            }
            partnerCashGiaPot = partnerCashSavingsPot + partnerGiaPot;
          }
          giaPot = primaryGiaPot + partnerGiaPot;
          cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
          cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
        }
      } else {
        const realTaxableRetirementIncome = totalTaxableIncomeRetirement / inflationFactor;
        const realCashInterest = primaryCashGrowth / inflationFactor;
        const getPA = (income: number) => Math.max(0, PERSONAL_ALLOWANCE - (income > PA_TAPER_THRESHOLD ? Math.floor((income - PA_TAPER_THRESHOLD) / 2) : 0));
        const psaSingle = calculatePSAAndSavingsTax(realTaxableRetirementIncome, realCashInterest, profile.taxRegion === 'scotland', realTaxableRetirementIncome, getPA(realTaxableRetirementIncome));
        decumSavingsTaxNominal = psaSingle.savingsInterestTax * inflationFactor;
        decumPsaUsedNominal = Math.min(psaSingle.personalSavingsAllowance, realCashInterest) * inflationFactor;

        if (decumSavingsTaxNominal > 0) {
          let rem = decumSavingsTaxNominal;
          if (primaryCashSavingsPot > 0) {
            const draw = Math.min(primaryCashSavingsPot, rem);
            primaryCashSavingsPot -= draw;
            rem -= draw;
          }
          if (rem > 0 && primaryGiaPot > 0) {
            primaryGiaPot = Math.max(0, primaryGiaPot - rem);
          }
          primaryCashGiaPot = primaryCashSavingsPot + primaryGiaPot;
          giaPot = primaryGiaPot + partnerGiaPot;
          cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
          cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
        }
      }


      // Compute total retirement tax using strict individual assessment
      let totalRetirementTax = 0;

      const priTotalTaxableRetirement = primaryTaxableGuaranteed + priDrawTaxable;
      const partTotalTaxableRetirement = partnerTaxableGuaranteed + partDrawTaxable;

      const priTaxRetirement = computeIncomeTax(priTotalTaxableRetirement, inflationFactor, isScottishTax);
      const partTaxRetirement = profile.isCouplePlanning
        ? computeIncomeTax(partTotalTaxableRetirement, inflationFactor, isPartnerScottishTax)
        : 0;

      totalRetirementTax = priTaxRetirement + partTaxRetirement;

      taxOnWithdrawal = totalRetirementTax;

      const totalWithdrawal = pensionDrawdown + isaDrawdown + cashDrawdown;
      const grossRetirementIncome = guaranteedIncomeTotal + giltLadderIncomeThisYear + totalWithdrawal;
      const netRetirementIncome = Math.max(0, grossRetirementIncome - totalRetirementTax);
      const purchasingPowerAdjustedIncome = netRetirementIncome / inflationFactor;

      let totalPot = Math.max(0, pensionPot + isaPot + cashGiaPot);
      const isDepleted = totalPot <= 0 && netRetirementIncome < requiredNetIncomeTarget;

      if (isDepleted && !depletionAge) {
        depletionAge = age;
      }

      const targetRetirementIncomeNominal = Math.round(requiredNetIncomeTarget);
      const netRetirementIncomeNominal = Math.round(netRetirementIncome);
      const rawShortfall = Math.max(0, targetRetirementIncomeNominal - netRetirementIncomeNominal);
      const incomeShortfall = rawShortfall > 1 ? rawShortfall : 0;
      const incomeRequirementMet = incomeShortfall === 0;

      const rawExcess = Math.max(0, netRetirementIncomeNominal - targetRetirementIncomeNominal);
      const annualIncomeExcess = rawExcess > 1 ? rawExcess : 0;
      cumulativeExcessIncome += annualIncomeExcess;

      // Reinvest excess income into designated non-pension pot if option is set
      if (annualIncomeExcess > 0) {
        const primaryOption = profile.annuityExcessReinvestOption || profile.reinvestDestinationPot || profile.maximizedSpendConfig?.reinvestDestinationPot || 'stocks_and_shares_isa';
        const partnerOption = profile.isCouplePlanning ? (profile.partnerAnnuityExcessReinvestOption || profile.partnerReinvestDestinationPot || primaryOption) : primaryOption;

        const isIsaTarget = (opt: string) => opt === 'isa' || opt === 'stocks_and_shares_isa' || opt === 'cash_isa';
        const isGiaTarget = (opt: string) => opt === 'gia';
        const isNoneTarget = (opt: string) => opt === 'none';

        const applyReinvest = (opt: string, amt: number, isPartner: boolean) => {
          if (isNoneTarget(opt)) {
            // Spend surplus on lifestyle (do not deposit into any pot)
            return;
          }
          if (isGiaTarget(opt)) {
            const growthRate = isPartner ? partnerGiaRateDecum : primaryGiaRateDecum;
            const inYearGrowth = amt * (growthRate * 0.5);
            if (isPartner) partnerGiaPot += (amt + inYearGrowth); else primaryGiaPot += (amt + inYearGrowth);
            estimatedPotGrowth += Math.round(inYearGrowth);
          } else if (isIsaTarget(opt)) {
            if (opt === 'cash_isa') {
              const inYearGrowth = amt * (effectiveCashIsaRate * 0.5);
              if (isPartner) { partnerIsaPot += (amt + inYearGrowth); partnerCashIsaPot += (amt + inYearGrowth); }
              else { primaryIsaPot += (amt + inYearGrowth); primaryCashIsaPot += (amt + inYearGrowth); }
              estimatedPotGrowth += Math.round(inYearGrowth);
            } else {
              // 'stocks_and_shares_isa' or 'isa' (Higher equity ISA compounding rate)
              const growthRate = isPartner ? partnerIsaRateDecum : primaryIsaRateDecum;
              const inYearGrowth = amt * (growthRate * 0.5);
              if (isPartner) { partnerIsaPot += (amt + inYearGrowth); partnerSsIsaPot += (amt + inYearGrowth); }
              else { primaryIsaPot += (amt + inYearGrowth); primarySsIsaPot += (amt + inYearGrowth); }
              estimatedPotGrowth += Math.round(inYearGrowth);
            }
          } else {
            // 'cash', 'cash_savings'
            const inYearGrowth = amt * (effectiveCashSavingsRate * 0.5);
            if (isPartner) partnerCashSavingsPot += (amt + inYearGrowth); else primaryCashSavingsPot += (amt + inYearGrowth);
            estimatedPotGrowth += Math.round(inYearGrowth);
          }
        };

        if (profile.isCouplePlanning) {
          const halfExcess = annualIncomeExcess * 0.5;
          applyReinvest(primaryOption, halfExcess, false);
          applyReinvest(partnerOption, halfExcess, true);
        } else {
          applyReinvest(primaryOption, annualIncomeExcess, false);
        }

        primaryCashGiaPot = primaryGiaPot + primaryCashSavingsPot;
        partnerCashGiaPot = partnerGiaPot + partnerCashSavingsPot;

        pensionPot = primaryPensionPot + partnerPensionPot;
        isaPot = primaryIsaPot + partnerIsaPot;
        giaPot = primaryGiaPot + partnerGiaPot;
        cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
        cashGiaPot = giaPot + cashSavingsPot;
        const priGiltPotBalance = isGiltLadderEnabled && giltLadderSummary && giltLadderPurchased
          ? giltLadderSummary.rungs.filter((r) => r.age > age).reduce((sum, r) => sum + r.purchaseCost, 0)
          : 0;
        const partGiltPotBalance = isPartnerGiltLadderEnabled && partnerGiltLadderSummary && partnerGiltLadderPurchased
          ? partnerGiltLadderSummary.rungs.filter((r) => r.age > partnerAge).reduce((sum, r) => sum + r.purchaseCost, 0)
          : 0;
        const currentGiltPotBalance = priGiltPotBalance + partGiltPotBalance;
        totalPot = pensionPot + isaPot + cashGiaPot + currentGiltPotBalance;
      }

      const priGiltPotBalance = isGiltLadderEnabled && giltLadderSummary && giltLadderPurchased
        ? giltLadderSummary.rungs.filter((r) => r.age > age).reduce((sum, r) => sum + r.purchaseCost, 0)
        : 0;
      const partGiltPotBalance = isPartnerGiltLadderEnabled && partnerGiltLadderSummary && partnerGiltLadderPurchased
        ? partnerGiltLadderSummary.rungs.filter((r) => r.age > partnerAge).reduce((sum, r) => sum + r.purchaseCost, 0)
        : 0;
      const decumGiltPotBalance = priGiltPotBalance + partGiltPotBalance;

      projections.push({
        year: calendarYear,
        age,
        isRetired: true,
        pensionPot: Math.round(pensionPot),
        uncrystallisedPot: Math.round(primaryUncrystallisedPot + partnerUncrystallisedPot),
        crystallisedPot: Math.round(primaryCrystallisedPot + partnerCrystallisedPot),
        primaryUncrystallisedPot: Math.round(primaryUncrystallisedPot),
        primaryCrystallisedPot: Math.round(primaryCrystallisedPot),
        partnerUncrystallisedPot: Math.round(partnerUncrystallisedPot),
        partnerCrystallisedPot: Math.round(partnerCrystallisedPot),
        crystallisedThisYear: Math.round(primaryCrystallisedThisYear + partnerCrystallisedThisYear),
        primaryCrystallisedThisYear: Math.round(primaryCrystallisedThisYear),
        partnerCrystallisedThisYear: Math.round(partnerCrystallisedThisYear),
        pclsTaxFreeDrawnThisYear: Math.round(primaryPclsDrawnThisYear + partnerPclsDrawnThisYear),
        primaryLsaRemaining: Math.round(Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn)),
        partnerLsaRemaining: Math.round(Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn)),
        totalLsaRemaining: Math.round(Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn) + (profile.isCouplePlanning ? Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn) : 0)),
        isaPot: Math.round(isaPot),
        stocksAndSharesIsaPot: Math.round(primarySsIsaPot + partnerSsIsaPot),
        cashIsaPot: Math.round(primaryCashIsaPot + partnerCashIsaPot),
        lisaPot: Math.round(primaryLisaPot + partnerLisaPot),
        cashGiaPot: Math.round(cashGiaPot),
        giaPot: Math.round(giaPot),
        cashSavingsPot: Math.round(cashSavingsPot),
        giltLadderPot: Math.round(decumGiltPotBalance),
        totalPot: Math.round(totalPot),

        primaryPensionPot: Math.round(primaryPensionPot),
        primaryPensionPotBeforeAnnuity,
        primaryPensionPotBeforePcls,
        primaryIsaPot: Math.round(primaryIsaPot),
        primaryStocksAndSharesIsaPot: Math.round(primarySsIsaPot),
        primaryCashIsaPot: Math.round(primaryCashIsaPot),
        primaryLisaPot: Math.round(primaryLisaPot),
        primaryCashGiaPot: Math.round(primaryCashGiaPot),
        primaryGiaPot: Math.round(primaryGiaPot),
        primaryCashSavingsPot: Math.round(primaryCashSavingsPot),
        primaryGiltLadderPot: Math.round(priGiltPotBalance),
        primaryTotalPot: Math.round(primaryPensionPot + primaryIsaPot + primaryCashGiaPot + priGiltPotBalance),

        partnerPensionPot: Math.round(partnerPensionPot),
        partnerPensionPotBeforeAnnuity,
        partnerPensionPotBeforePcls,
        partnerIsaPot: Math.round(partnerIsaPot),
        partnerStocksAndSharesIsaPot: Math.round(partnerSsIsaPot),
        partnerCashIsaPot: Math.round(partnerCashIsaPot),
        partnerLisaPot: Math.round(partnerLisaPot),
        partnerCashGiaPot: Math.round(partnerCashGiaPot),
        partnerGiaPot: Math.round(partnerGiaPot),
        partnerCashSavingsPot: Math.round(partnerCashSavingsPot),
        partnerGiltLadderPot: Math.round(partGiltPotBalance),
        partnerTotalPot: Math.round(partnerPensionPot + partnerIsaPot + partnerCashGiaPot + partGiltPotBalance),

        primaryStatePensionReceived: Math.round(primaryStatePensionReceived),
        primaryDbPensionIncomeReceived: Math.round(primaryDbPensionReceived),
        primaryAnnuityIncomeReceived: Math.round(primaryAnnuityIncomeThisYear),
        primaryGiltLadderIncomeReceived: Math.round(primaryGiltLadderIncomeThisYear),
        primaryGiltLadderCapitalAllocated: Math.round(primaryGiltLadderCapitalAllocatedThisYear),
        primaryGiltLadderPurchasedThisYear,
        primaryTaxableFixedIncomeReceived: Math.round(primaryTaxableFixedIncomeReceived),
        primaryTaxFreeFixedIncomeReceived: Math.round(primaryTaxFreeFixedIncomeReceived),
        primaryPensionDrawdown: Math.round(primaryPensionDrawdown),
        primaryPensionDrawdownTaxFree: Math.round(priPensionDrawdownTaxFree),
        primaryPensionDrawdownTaxable: Math.round(priPensionDrawdownTaxable),
        primaryIsaDrawdown: Math.round(primaryIsaDrawdown),
        primaryCashDrawdown: Math.round(primaryCashDrawdown),
        primaryNetRetirementIncome: Math.round(Math.max(0, primaryGuaranteedTotal + primaryGiltLadderIncomeThisYear + primaryPensionDrawdown + primaryIsaDrawdown + primaryCashDrawdown - priTaxRetirement - (profile.isCouplePlanning ? priSavingsTaxNominal : decumSavingsTaxNominal))),

        partnerStatePensionReceived: Math.round(partnerStatePensionReceived),
        partnerDbPensionIncomeReceived: Math.round(partnerDbPensionReceived),
        partnerAnnuityIncomeReceived: Math.round(partnerAnnuityIncomeThisYear),
        partnerGiltLadderIncomeReceived: Math.round(partnerGiltLadderIncomeThisYear),
        partnerGiltLadderCapitalAllocated: Math.round(partnerGiltLadderCapitalAllocatedThisYear),
        partnerGiltLadderPurchasedThisYear,
        partnerTaxableFixedIncomeReceived: Math.round(partnerTaxableFixedIncomeReceived),
        partnerTaxFreeFixedIncomeReceived: Math.round(partnerTaxFreeFixedIncomeReceived),
        partnerPensionDrawdown: Math.round(partnerPensionDrawdown),
        partnerPensionDrawdownTaxFree: Math.round(partPensionDrawdownTaxFree),
        partnerPensionDrawdownTaxable: Math.round(partPensionDrawdownTaxable),
        partnerIsaDrawdown: Math.round(partnerIsaDrawdown),
        partnerCashDrawdown: Math.round(partnerCashDrawdown),
        partnerNetRetirementIncome: Math.round(profile.isCouplePlanning ? Math.max(0, partnerGuaranteedTotal + partnerGiltLadderIncomeThisYear + partnerPensionDrawdown + partnerIsaDrawdown + partnerCashDrawdown - partTaxRetirement - partSavingsTaxNominal) : 0),

        estimatedPotGrowth,
        estimatedInvestmentFees: decumFeesPaid,
        annualContributionTotal: 0,
        lifeEventsIncome: Math.round(lifeEventsIncomeThisYear),
        lifeEventsExpense: Math.round(lifeEventsExpenseThisYear),
        primaryLifeEventsIncome: Math.round(primaryLifeEventsIncomeThisYear),
        primaryLifeEventsExpense: Math.round(primaryLifeEventsExpenseThisYear),
        partnerLifeEventsIncome: Math.round(partnerLifeEventsIncomeThisYear),
        partnerLifeEventsExpense: Math.round(partnerLifeEventsExpenseThisYear),
        propertyDownsizeEquityReleased: Math.round(propertyDownsizeEquityReleasedThisYear),
        decumulationLifeEventsSummary: decumulationEventSummaries.join(', '),
        annualTaxReliefTotal: 0,
        statePensionReceived: Math.round(statePensionReceived),
        dbPensionIncomeReceived: Math.round(dbPensionIncomeReceived),
        dbTaxFreeLumpSumReceived: Math.round(dbTaxFreeLumpSumReceived),
        taxableFixedIncomeReceived: Math.round(taxableFixedIncomeReceived),
        taxFreeFixedIncomeReceived: Math.round(taxFreeFixedIncomeReceived),
        pensionDrawdown: Math.round(pensionDrawdown),
        pensionDrawdownTaxFree: Math.round(pensionDrawdownTaxFree),
        pensionDrawdownTaxable: Math.round(pensionDrawdownTaxable),
        annuityIncomeReceived: Math.round(annuityIncomeThisYear),
        annuityCapitalAllocated: Math.round(annuityCapitalAllocatedThisYear),
        annuityPurchasedThisYear: annuityCapitalAllocatedThisYear > 0,
        giltLadderIncomeReceived: Math.round(giltLadderIncomeThisYear),
        giltLadderCapitalAllocated: Math.round(giltLadderCapitalAllocatedThisYear),
        giltLadderPurchasedThisYear: giltLadderCapitalAllocatedThisYear > 0,
        isaDrawdown: Math.round(isaDrawdown),
        cashDrawdown: Math.round(cashDrawdown),
        totalWithdrawalAmount: Math.round(totalWithdrawal),
        taxOnWithdrawal: Math.round(taxOnWithdrawal),
        totalTaxPaid: Math.round(taxOnWithdrawal + decumSavingsTaxNominal),
        primaryTaxPaid: Math.round(priTaxRetirement + (profile.isCouplePlanning ? priSavingsTaxNominal : decumSavingsTaxNominal)),
        partnerTaxPaid: Math.round(profile.isCouplePlanning ? (partTaxRetirement + partSavingsTaxNominal) : 0),
        primaryNetIncome: Math.round(Math.max(0, primaryGuaranteedTotal + primaryGiltLadderIncomeThisYear + primaryPensionDrawdown + primaryIsaDrawdown + primaryCashDrawdown - priTaxRetirement - (profile.isCouplePlanning ? priSavingsTaxNominal : decumSavingsTaxNominal))),
        partnerNetIncome: Math.round(profile.isCouplePlanning ? Math.max(0, partnerGuaranteedTotal + partnerGiltLadderIncomeThisYear + partnerPensionDrawdown + partnerIsaDrawdown + partnerCashDrawdown - partTaxRetirement - partSavingsTaxNominal) : 0),
        savingsInterestTax: Math.round(decumSavingsTaxNominal),
        personalSavingsAllowanceUsed: Math.round(decumPsaUsedNominal),
        netRetirementIncome: netRetirementIncomeNominal,
        purchasingPowerAdjustedIncome: Math.round(purchasingPowerAdjustedIncome),
        targetRetirementIncome: targetRetirementIncomeNominal,
        incomeShortfall,
        annualIncomeExcess,
        cumulativeExcessIncome: Math.round(cumulativeExcessIncome),
        incomeRequirementMet,
        potDepleted: totalPot <= 0,
        depletionAge,
        canAccessPension,
      });
    }

    // Compound property value for the next year
    if (profile.propertyDownsizePlan?.enabled && !hasDownsized) {
      currentPropertyValue *= (1 + (profile.propertyDownsizePlan.expectedAnnualGrowthRate / 100));
    }
  }

  return projections;
}



