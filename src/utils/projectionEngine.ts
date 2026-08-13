import { UserProfile, InvestmentPots, YearProjection, TaxCalculationResult } from '../types';
import { DEFAULT_PARTNER_POTS, DEFAULT_POTS, sanitizePots } from './defaultData';
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
  const returnAccumulation = getEffectiveAccumulationReturn(profile.expectedInvestmentReturn ?? 6.5, profile.assetAllocationSplit, profile.investmentFees) / 100;
  const returnDecumulation = getEffectiveDecumulationReturn(profile.postRetirementReturn ?? 4.5, profile.assetAllocationSplit, profile.investmentFees) / 100;

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
    const yearOffset = age - profile.currentAge;
    const calendarYear = new Date().getFullYear() + yearOffset;
    const isRetired = age >= profile.targetRetirementAge;
    const canAccessPension = age >= pensionAccessAge || primaryCrystallisedPot > 0 || (profile.crystallisationMode === 'phased_tranches' && (profile.crystallisationTranches || []).some((t) => t.enabled && t.age <= age && (t.owner || 'primary') !== 'partner'));

    const partnerAge = profile.isCouplePlanning
      ? age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge)
      : age;
    const partnerCanAccessPension = partnerAge >= partnerPensionAccessAge || partnerCrystallisedPot > 0 || (profile.partnerCrystallisationMode === 'phased_tranches' && (profile.partnerCrystallisationTranches || profile.crystallisationTranches || []).some((t) => t.enabled && t.age <= partnerAge && t.owner === 'partner'));

    // Partner Mortality Inheritance
    if (profile.isCouplePlanning && !partnerDead && partnerAge >= (profile.partnerLifeExpectancyAge || 95)) {
      partnerDead = true;
      primaryPensionPot += partnerPensionPot;
      primaryUncrystallisedPot += partnerUncrystallisedPot;
      primaryCrystallisedPot += partnerCrystallisedPot;
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
    const primaryActiveTranches = profile.crystallisationMode === 'phased_tranches' 
      ? (profile.crystallisationTranches || []).filter((t) => t.enabled && t.age === age && t.owner !== 'partner')
      : [];
    if (primaryUncrystallisedPot > 0 && primaryActiveTranches.length > 0) {
      for (const tranche of primaryActiveTranches) {
        if (primaryUncrystallisedPot <= 0) break;
        const requestedGross = tranche.amount;
        const pclsPct = Math.min(100, Math.max(0, tranche.pclsPercent ?? 25)) / 100;
        const remainingLsa = Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn);
        const maxGrossForLsa = pclsPct > 0 ? Math.floor(remainingLsa / pclsPct) : primaryUncrystallisedPot;
        const grossCrystallised = Math.min(primaryUncrystallisedPot, requestedGross, maxGrossForLsa);
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
    const partnerActiveTranches = profile.partnerCrystallisationMode === 'phased_tranches'
      ? (profile.partnerCrystallisationTranches || profile.crystallisationTranches || []).filter((t) => t.enabled && t.age === partnerAge && t.owner === 'partner')
      : [];
    if (profile.isCouplePlanning && !partnerDead && partnerUncrystallisedPot > 0 && partnerActiveTranches.length > 0) {
      for (const tranche of partnerActiveTranches) {
        if (partnerUncrystallisedPot <= 0) break;
        const requestedGross = tranche.amount;
        const pclsPct = Math.min(100, Math.max(0, tranche.pclsPercent ?? 25)) / 100;
        const remainingLsa = Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn);
        const maxGrossForLsa = pclsPct > 0 ? Math.floor(remainingLsa / pclsPct) : partnerUncrystallisedPot;
        const grossCrystallised = Math.min(partnerUncrystallisedPot, requestedGross, maxGrossForLsa);
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
      const lumpSumPercent = Math.min(100, profile.pclsLumpSumPercent ?? 25) / 100;
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
      const partnerLumpSumPercent = Math.min(100, profile.partnerPclsLumpSumPercent ?? 25) / 100;
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

    // Inflation factor for purchasing power tracking
    const inflationFactor = Math.pow(1 + inflation, yearOffset);

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
    const primaryTaxThisYr = calculateUKTax(profile, pots, false, age);
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
            primarySsIsaPot += alloc.toIsa;
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
                primarySsIsaPot += alloc.toIsa;
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
            partnerSsIsaPot += alloc.toIsa;
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
                partnerSsIsaPot += alloc.toIsa;
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

      const primaryPensionFee = getPotFeePercent(profile.investmentFees, 'primary', 'pension') / 100;
      const partnerPensionFee = getPotFeePercent(profile.investmentFees, 'partner', 'pension') / 100;
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
        (primaryIsaPot * primaryIsaFee) +
        (partnerIsaPot * partnerIsaFee) +
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
                        getGrowth(partnerSsIsaPot, partnerSsIContribThisYr, partnerAccumIsaRate) + 
                        getGrowth(partnerLisaPot, partnerLisaContribThisYr, partnerAccumIsaRate);
                        
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
      const totalPot = Math.max(0, pensionPot + isaPot + cashGiaPot);
      const totalTaxPaid = Math.round((primaryTaxThisYr.totalIncomeTax || 0) + (primaryTaxThisYr.totalNationalInsurance || 0) + accumSavingsTax + aaChargePrimary + aaChargePartner);

      processLifeEventsThisYear();
      const finalTotalPot = Math.max(0, pensionPot + isaPot + cashGiaPot);

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
        primaryTotalPot: Math.round(primaryPensionPot + primaryIsaPot + primaryCashGiaPot),

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

      const primaryPensionFeeDecum = getPotFeePercent(profile.investmentFees, 'primary', 'pension') / 100;
      const partnerPensionFeeDecum = getPotFeePercent(profile.investmentFees, 'partner', 'pension') / 100;
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
      const netInitialIncomeSecured = netGuaranteedIncomeSecured + phasedTaxFreeIncomeThisYear;

      // Remaining net income needed from investment pots to reach drawdownNetTarget
      let remainingIncomeNeeded = Math.max(0, drawdownNetTarget - netInitialIncomeSecured);

      let pensionDrawdown = 0;
      let isaDrawdown = 0;
      let cashDrawdown = 0;
      let taxOnWithdrawal = 0;
      let explicitPriPensionDraw = -1;
      let explicitPartPensionDraw = -1;

      // Execute Drawdown Strategy for remaining need
      const primaryStrategy = profile.drawdownStrategy || 'isa_first';
      const partnerStrategy = profile.isCouplePlanning ? (profile.partnerDrawdownStrategy || primaryStrategy) : primaryStrategy;
      
      // Effective strategy selection: if equal, use that. Prefer explicit bracket filling strategies over fallback defaults.
      let effectiveStrategy = primaryStrategy;
      if (profile.isCouplePlanning && primaryStrategy !== partnerStrategy) {
        const isBracketStrategy = (s: string) => s === 'tax_free_bracket' || s === 'basic_rate_bracket' || s === 'higher_rate_bracket';
        if (isBracketStrategy(primaryStrategy)) {
          effectiveStrategy = primaryStrategy;
        } else if (isBracketStrategy(partnerStrategy)) {
          effectiveStrategy = partnerStrategy;
        } else if (primaryStrategy === 'pension_first' || partnerStrategy === 'pension_first') {
          effectiveStrategy = 'pension_first';
        } else if (primaryStrategy === 'cash_first' || partnerStrategy === 'cash_first') {
          effectiveStrategy = 'cash_first';
        } else {
          effectiveStrategy = primaryStrategy;
        }
      }

      // Helper to compute exact gross pension drawdown required to achieve a target net income amount
      // Evaluates tax liability strictly per individual for primary and partner, accounting for existing gross draws
      const getGrossPensionNeededForNet = (
        netNeeded: number,
        availablePension: number,
        existingPriGross = 0,
        existingPartGross = 0
      ): number => {
        if (netNeeded <= 0 || availablePension <= 0) return 0;

        const getNetFromGross = (gross: number): number => {
          const totalAvailPension = (canAccessPension ? primaryPensionPot : 0) + (profile.isCouplePlanning && partnerCanAccessPension ? partnerPensionPot : 0);
          const maxScope = profile.maximizedSpendConfig?.enabled ? (profile.maximizedSpendConfig.coupleScope || 'couple') : 'couple';
          
          let priRatio = (canAccessPension && totalAvailPension > 0) ? primaryPensionPot / totalAvailPension : (canAccessPension ? 1 : 0);
          let partRatio = (profile.isCouplePlanning && partnerCanAccessPension) ? (1 - priRatio) : 0;

          if (profile.isCouplePlanning && maxScope === 'primary') {
            if (canAccessPension && primaryPensionPot > 0) {
              priRatio = 1;
              partRatio = 0;
            } else if (partnerCanAccessPension && partnerPensionPot > 0) {
              priRatio = 0;
              partRatio = 1;
            }
          } else if (profile.isCouplePlanning && maxScope === 'partner') {
            if (partnerCanAccessPension && partnerPensionPot > 0) {
              priRatio = 0;
              partRatio = 1;
            } else if (canAccessPension && primaryPensionPot > 0) {
              priRatio = 1;
              partRatio = 0;
            }
          }

          const priGrossTotal = existingPriGross + (gross * priRatio);
          const partGrossTotal = existingPartGross + (gross * partRatio);

          const priCrystDrawn = Math.min(primaryCrystallisedPot, priGrossTotal);
          const priUncrystDrawn = Math.min(primaryUncrystallisedPot, Math.max(0, priGrossTotal - priCrystDrawn));
          const priTaxFree = Math.min(priUncrystDrawn * 0.25, Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn));
          const priTaxableDrawdown = priGrossTotal - priTaxFree;
          
          const partCrystDrawn = Math.min(partnerCrystallisedPot, partGrossTotal);
          const partUncrystDrawn = Math.min(partnerUncrystallisedPot, Math.max(0, partGrossTotal - partCrystDrawn));
          const partTaxFree = Math.min(partUncrystDrawn * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
          const partTaxableDrawdown = partGrossTotal - partTaxFree;
          
          const priTotalTaxable = primaryTaxableGuaranteed + priTaxableDrawdown;
          const partTotalTaxable = partnerTaxableGuaranteed + partTaxableDrawdown;

          const priTax = computeIncomeTax(priTotalTaxable, inflationFactor, isScottishTax);
          const partTax = profile.isCouplePlanning
            ? computeIncomeTax(partTotalTaxable, inflationFactor, isPartnerScottishTax)
            : 0;

          // Calculate base tax on existing gross draws alone
          const priCrystBase = Math.min(primaryCrystallisedPot, existingPriGross);
          const priUncrystBase = Math.min(primaryUncrystallisedPot, Math.max(0, existingPriGross - priCrystBase));
          const priTaxFreeBase = Math.min(priUncrystBase * 0.25, Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn));
          const priTaxableBase = existingPriGross - priTaxFreeBase;

          const partCrystBase = Math.min(partnerCrystallisedPot, existingPartGross);
          const partUncrystBase = Math.min(partnerUncrystallisedPot, Math.max(0, existingPartGross - partCrystBase));
          const partTaxFreeBase = Math.min(partUncrystBase * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
          const partTaxableBase = existingPartGross - partTaxFreeBase;

          const priTaxBase = computeIncomeTax(primaryTaxableGuaranteed + priTaxableBase, inflationFactor, isScottishTax);
          const partTaxBase = profile.isCouplePlanning
            ? computeIncomeTax(partnerTaxableGuaranteed + partTaxableBase, inflationFactor, isPartnerScottishTax)
            : 0;

          const baseTax = priTaxBase + partTaxBase;
          const totalTax = priTax + partTax;
          const marginalTaxOnExtra = Math.max(0, totalTax - baseTax);
          return gross - marginalTaxOnExtra;
        };

        let low = 0;
        let high = Math.min(availablePension, netNeeded * 5.0);
        let bestGross = high;

        for (let i = 0; i < 25; i++) {
          const mid = (low + high) / 2;
          const net = getNetFromGross(mid);
          if (net >= netNeeded) {
            bestGross = mid;
            high = mid;
          } else {
            low = mid;
          }
        }

        const exactGross = getNetFromGross(bestGross) >= netNeeded ? bestGross : availablePension;
        return Math.min(availablePension, Math.ceil(exactGross));
      };

      const getNetProducedByPensionGross = (
        gross: number,
        existingPriGross = 0,
        existingPartGross = 0
      ): number => {
        const totalAvailPension = (canAccessPension ? primaryPensionPot : 0) + (profile.isCouplePlanning && partnerCanAccessPension ? partnerPensionPot : 0);
        const maxScope = profile.maximizedSpendConfig?.enabled ? (profile.maximizedSpendConfig.coupleScope || 'couple') : 'couple';

        let priRatio = (canAccessPension && totalAvailPension > 0) ? primaryPensionPot / totalAvailPension : (canAccessPension ? 1 : 0);
        let partRatio = (profile.isCouplePlanning && partnerCanAccessPension) ? (1 - priRatio) : 0;

        if (profile.isCouplePlanning && maxScope === 'primary') {
          if (canAccessPension && primaryPensionPot > 0) {
            priRatio = 1;
            partRatio = 0;
          } else if (partnerCanAccessPension && partnerPensionPot > 0) {
            priRatio = 0;
            partRatio = 1;
          }
        } else if (profile.isCouplePlanning && maxScope === 'partner') {
          if (partnerCanAccessPension && partnerPensionPot > 0) {
            priRatio = 0;
            partRatio = 1;
          } else if (canAccessPension && primaryPensionPot > 0) {
            priRatio = 1;
            partRatio = 0;
          }
        }

        const priGrossTotal = existingPriGross + (gross * priRatio);
        const partGrossTotal = existingPartGross + (gross * partRatio);

        const priCrystDrawn = Math.min(primaryCrystallisedPot, priGrossTotal);
        const priUncrystDrawn = Math.min(primaryUncrystallisedPot, Math.max(0, priGrossTotal - priCrystDrawn));
        const priTaxFree = Math.min(priUncrystDrawn * 0.25, Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn));
        const priTaxableDrawdown = priGrossTotal - priTaxFree;

        const partCrystDrawn = Math.min(partnerCrystallisedPot, partGrossTotal);
        const partUncrystDrawn = Math.min(partnerUncrystallisedPot, Math.max(0, partGrossTotal - partCrystDrawn));
        const partTaxFree = Math.min(partUncrystDrawn * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
        const partTaxableDrawdown = partGrossTotal - partTaxFree;

        const priTotalTaxable = primaryTaxableGuaranteed + priTaxableDrawdown;
        const partTotalTaxable = partnerTaxableGuaranteed + partTaxableDrawdown;

        const priTax = computeIncomeTax(priTotalTaxable, inflationFactor, isScottishTax);
        const partTax = profile.isCouplePlanning
          ? computeIncomeTax(partTotalTaxable, inflationFactor, isPartnerScottishTax)
          : 0;

        // Calculate base tax on existing gross draws alone
        const priCrystBase = Math.min(primaryCrystallisedPot, existingPriGross);
        const priUncrystBase = Math.min(primaryUncrystallisedPot, Math.max(0, existingPriGross - priCrystBase));
        const priTaxFreeBase = Math.min(priUncrystBase * 0.25, Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn));
        const priTaxableBase = existingPriGross - priTaxFreeBase;

        const partCrystBase = Math.min(partnerCrystallisedPot, existingPartGross);
        const partUncrystBase = Math.min(partnerUncrystallisedPot, Math.max(0, existingPartGross - partCrystBase));
        const partTaxFreeBase = Math.min(partUncrystBase * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
        const partTaxableBase = existingPartGross - partTaxFreeBase;

        const priTaxBase = computeIncomeTax(primaryTaxableGuaranteed + priTaxableBase, inflationFactor, isScottishTax);
        const partTaxBase = profile.isCouplePlanning
          ? computeIncomeTax(partnerTaxableGuaranteed + partTaxableBase, inflationFactor, isPartnerScottishTax)
          : 0;

        const baseTax = priTaxBase + partTaxBase;
        const totalTax = priTax + partTax;
        const marginalTaxOnExtra = Math.max(0, totalTax - baseTax);
        return gross - marginalTaxOnExtra;
      };

      if (isReinvestExcess) {
        // Maximized Drawdown Mode: Draw down from Pension up to drawdownNetTarget.
        // Non-pension pots (ISA / Cash / GIA) are drawn down ONLY if net pension + net guaranteed income is insufficient for requiredNetIncomeTarget.
        if ((canAccessPension || partnerCanAccessPension) && pensionPot > 0) {
          const pensionNetNeeded = Math.max(0, drawdownNetTarget - netGuaranteedIncomeSecured);
          if (pensionNetNeeded > 0) {
            pensionDrawdown = getGrossPensionNeededForNet(pensionNetNeeded, pensionPot);
            pensionPot -= pensionDrawdown;
          }
        }

        const netPensionSecured = getNetProducedByPensionGross(pensionDrawdown);
        const netSecuredSoFar = netGuaranteedIncomeSecured + netPensionSecured;

        let livingShortfall = Math.max(0, requiredNetIncomeTarget - netSecuredSoFar);

        if (livingShortfall > 0) {
          if (effectiveStrategy === 'cash_first') {
            if (cashGiaPot > 0 && livingShortfall > 0) {
              cashDrawdown = Math.min(cashGiaPot, livingShortfall);
              cashGiaPot -= cashDrawdown;
              livingShortfall -= cashDrawdown;
            }
            if (isaPot > 0 && livingShortfall > 0) {
              isaDrawdown = Math.min(isaPot, livingShortfall);
              isaPot -= isaDrawdown;
              livingShortfall -= isaDrawdown;
            }
          } else {
            if (isaPot > 0 && livingShortfall > 0) {
              isaDrawdown = Math.min(isaPot, livingShortfall);
              isaPot -= isaDrawdown;
              livingShortfall -= isaDrawdown;
            }
            if (cashGiaPot > 0 && livingShortfall > 0) {
              cashDrawdown = Math.min(cashGiaPot, livingShortfall);
              cashGiaPot -= cashDrawdown;
              livingShortfall -= cashDrawdown;
            }
          }
        }
      } else if (effectiveStrategy === 'isa_first' || effectiveStrategy === 'cash_first') {
        // Draw from Cash/GIA first
        if (cashGiaPot > 0 && remainingIncomeNeeded > 0) {
          cashDrawdown = Math.min(cashGiaPot, remainingIncomeNeeded);
          cashGiaPot -= cashDrawdown;
          remainingIncomeNeeded -= cashDrawdown;
        }

        // Next draw from ISA (100% tax-free)
        if (isaPot > 0 && remainingIncomeNeeded > 0) {
          isaDrawdown = Math.min(isaPot, remainingIncomeNeeded);
          isaPot -= isaDrawdown;
          remainingIncomeNeeded -= isaDrawdown;
        }

        // Finally draw from Pension (only if age >= pensionAccessAge)
        if (canAccessPension && pensionPot > 0 && remainingIncomeNeeded > 0) {
          pensionDrawdown = getGrossPensionNeededForNet(remainingIncomeNeeded, pensionPot);
          pensionPot -= pensionDrawdown;
          const netPensionDrawdown = getNetProducedByPensionGross(pensionDrawdown);
          remainingIncomeNeeded = Math.max(0, remainingIncomeNeeded - netPensionDrawdown);
        }
      } else if (effectiveStrategy === 'pension_first') {
        // Draw from Pension first if accessible
        if (canAccessPension && pensionPot > 0 && remainingIncomeNeeded > 0) {
          pensionDrawdown = getGrossPensionNeededForNet(remainingIncomeNeeded, pensionPot);
          pensionPot -= pensionDrawdown;
          const netPensionDrawdown = getNetProducedByPensionGross(pensionDrawdown);
          remainingIncomeNeeded = Math.max(0, remainingIncomeNeeded - netPensionDrawdown);
        }

        // Then ISA
        if (isaPot > 0 && remainingIncomeNeeded > 0) {
          isaDrawdown = Math.min(isaPot, remainingIncomeNeeded);
          isaPot -= isaDrawdown;
          remainingIncomeNeeded -= isaDrawdown;
        }

        // Then Cash
        if (cashGiaPot > 0 && remainingIncomeNeeded > 0) {
          cashDrawdown = Math.min(cashGiaPot, remainingIncomeNeeded);
          cashGiaPot -= cashDrawdown;
          remainingIncomeNeeded -= cashDrawdown;
        }
      } else if (
        effectiveStrategy === 'tax_free_bracket' ||
        effectiveStrategy === 'basic_rate_bracket' ||
        effectiveStrategy === 'higher_rate_bracket'
      ) {
        // Tax bracket filling / individual strategy drawdown phase (fill target band with pension, rest from ISA/Cash)
        const isPrimaryScot = profile.taxRegion === 'scotland';
        const isPartnerScot = (profile.partnerTaxRegion || profile.taxRegion) === 'scotland';

        const getThresholdGross = (strat: string, isScot: boolean) => {
          const inflMult = indexTaxBands ? inflationFactor : 1;
          const basicBandWidth = profile.customTaxBands?.enabled ? (profile.customTaxBands.basicRateThreshold ?? RUK_BASIC_THRESHOLD) : RUK_BASIC_THRESHOLD;
          const higherGrossLimit = profile.customTaxBands?.enabled ? (profile.customTaxBands.higherRateThreshold ?? RUK_ADDITIONAL_THRESHOLD) : RUK_ADDITIONAL_THRESHOLD;

          if (strat === 'tax_free_bracket') return singlePersonalAllowance;
          if (strat === 'basic_rate_bracket') return (singlePersonalAllowance + (isScot ? (SCOT_INTERMEDIATE_THRESHOLD * inflMult) : (basicBandWidth * inflMult)));
          if (strat === 'higher_rate_bracket') return (isScot ? (singlePersonalAllowance + (SCOT_HIGHER_THRESHOLD * inflMult)) : (higherGrossLimit * inflMult));
          return 0;
        };

        const priThresholdGross = getThresholdGross(primaryStrategy, isPrimaryScot);
        const partThresholdGross = profile.isCouplePlanning ? getThresholdGross(partnerStrategy, isPartnerScot) : 0;

        const priRoom = Math.max(0, priThresholdGross - primaryTaxableGuaranteed);
        const partRoom = profile.isCouplePlanning ? Math.max(0, partThresholdGross - partnerTaxableGuaranteed) : 0;
        
        const primaryCanAccessOrCryst = canAccessPension || primaryCrystallisedPot > 0;
        const partnerCanAccessOrCryst = profile.isCouplePlanning && (partnerCanAccessPension || partnerCrystallisedPot > 0);

        if ((primaryCanAccessOrCryst || partnerCanAccessOrCryst) && pensionPot > 0) {
          const isBracketStrat = (s: string) => s === 'tax_free_bracket' || s === 'basic_rate_bracket' || s === 'higher_rate_bracket';

          let maxPriGrossForBracket = 0;
          if (primaryCanAccessOrCryst) {
            if (isBracketStrat(primaryStrategy)) {
              if (primaryCrystallisedPot >= priRoom) {
                maxPriGrossForBracket = priRoom;
              } else {
                const remTaxablePri = priRoom - primaryCrystallisedPot;
                const priTaxablePercent = (primaryCumulativeTaxFreeDrawn >= primaryMaxLsa) ? 1.0 : 0.75;
                maxPriGrossForBracket = primaryCrystallisedPot + (remTaxablePri / priTaxablePercent);
              }
            } else if (primaryStrategy === 'pension_first') {
              maxPriGrossForBracket = primaryPensionPot;
            }
          }

          let maxPartGrossForBracket = 0;
          if (partnerCanAccessOrCryst) {
            if (isBracketStrat(partnerStrategy)) {
              if (partnerCrystallisedPot >= partRoom) {
                maxPartGrossForBracket = partRoom;
              } else {
                const remTaxablePart = partRoom - partnerCrystallisedPot;
                const partTaxablePercent = (partnerCumulativeTaxFreeDrawn >= partnerMaxLsa) ? 1.0 : 0.75;
                maxPartGrossForBracket = partnerCrystallisedPot + (remTaxablePart / partTaxablePercent);
              }
            } else if (partnerStrategy === 'pension_first') {
              maxPartGrossForBracket = partnerPensionPot;
            }
          }

          let priTargetGross = Math.min(primaryCanAccessOrCryst ? primaryPensionPot : 0, maxPriGrossForBracket);
          let partTargetGross = Math.min(partnerCanAccessOrCryst ? partnerPensionPot : 0, maxPartGrossForBracket);

          const getNetFromSpecificDraws = (priG: number, partG: number) => {
            const priCrystDrawn = Math.min(primaryCrystallisedPot, priG);
            const priUncrystDrawn = Math.min(primaryUncrystallisedPot, Math.max(0, priG - priCrystDrawn));
            const priTaxFree = Math.min(priUncrystDrawn * 0.25, Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn));
            const priTaxableDrawdown = priG - priTaxFree;

            const partCrystDrawn = Math.min(partnerCrystallisedPot, partG);
            const partUncrystDrawn = Math.min(partnerUncrystallisedPot, Math.max(0, partG - partCrystDrawn));
            const partTaxFree = Math.min(partUncrystDrawn * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
            const partTaxableDrawdown = partG - partTaxFree;

            const priTotalTaxable = primaryTaxableGuaranteed + priTaxableDrawdown;
            const partTotalTaxable = partnerTaxableGuaranteed + partTaxableDrawdown;

            const priTax = computeIncomeTax(priTotalTaxable, inflationFactor, isScottishTax);
            const partTax = profile.isCouplePlanning
              ? computeIncomeTax(partTotalTaxable, inflationFactor, isPartnerScottishTax)
              : 0;

            const totalTax = priTax + partTax;
            const additionalTax = Math.max(0, totalTax - guaranteedTaxLiability);
            return (priG + partG) - additionalTax;
          };

          const isPriBracket = isBracketStrat(primaryStrategy);
          const isPartBracket = profile.isCouplePlanning && isBracketStrat(partnerStrategy);

          // Only scale down if neither person is using a bracket-filling strategy
          if (!isPriBracket && !isPartBracket) {
            const totalTargetNet = getNetFromSpecificDraws(priTargetGross, partTargetGross);
            if (totalTargetNet > remainingIncomeNeeded && totalTargetNet > 0) {
              const scale = remainingIncomeNeeded / totalTargetNet;
              priTargetGross *= scale;
              partTargetGross *= scale;
            }
          } else if (isPriBracket && !isPartBracket) {
            const priNetOnly = getNetFromSpecificDraws(priTargetGross, 0);
            if (priNetOnly >= remainingIncomeNeeded) {
              partTargetGross = 0;
            } else {
              const remForPart = remainingIncomeNeeded - priNetOnly;
              const partNetOnly = getNetFromSpecificDraws(0, partTargetGross);
              if (partNetOnly > 0) {
                partTargetGross *= Math.min(1, remForPart / partNetOnly);
              }
            }
          } else if (!isPriBracket && isPartBracket) {
            const partNetOnly = getNetFromSpecificDraws(0, partTargetGross);
            if (partNetOnly >= remainingIncomeNeeded) {
              priTargetGross = 0;
            } else {
              const remForPri = remainingIncomeNeeded - partNetOnly;
              const priNetOnly = getNetFromSpecificDraws(priTargetGross, 0);
              if (priNetOnly > 0) {
                priTargetGross *= Math.min(1, remForPri / priNetOnly);
              }
            }
          }

          explicitPriPensionDraw = priTargetGross;
          explicitPartPensionDraw = partTargetGross;
          pensionDrawdown = priTargetGross + partTargetGross;
          pensionPot -= pensionDrawdown;
          const netPensionDrawdown = getNetFromSpecificDraws(priTargetGross, partTargetGross);
          remainingIncomeNeeded = Math.max(0, remainingIncomeNeeded - netPensionDrawdown);
        }



        // Top up remaining net income needed from ISA (100% tax-free)
        if (isaPot > 0 && remainingIncomeNeeded > 0) {
          isaDrawdown = Math.min(isaPot, remainingIncomeNeeded);
          isaPot -= isaDrawdown;
          remainingIncomeNeeded -= isaDrawdown;
        }

        // Top up remaining net income needed from Cash/GIA
        if (cashGiaPot > 0 && remainingIncomeNeeded > 0) {
          cashDrawdown = Math.min(cashGiaPot, remainingIncomeNeeded);
          cashGiaPot -= cashDrawdown;
          remainingIncomeNeeded -= cashDrawdown;
        }
      } else {
        // Pro-rata strategy
        const currentTotal = (canAccessPension ? pensionPot : 0) + isaPot + cashGiaPot;
        if (currentTotal > 0 && remainingIncomeNeeded > 0) {
          const pensionShare = canAccessPension ? pensionPot / currentTotal : 0;
          const isaShare = isaPot / currentTotal;
          const cashShare = cashGiaPot / currentTotal;

          const targetPensionNetNeeded = remainingIncomeNeeded * pensionShare;
          pensionDrawdown = canAccessPension ? getGrossPensionNeededForNet(targetPensionNetNeeded, pensionPot) : 0;
          isaDrawdown = Math.min(isaPot, remainingIncomeNeeded * isaShare);
          cashDrawdown = Math.min(cashGiaPot, remainingIncomeNeeded * cashShare);

          pensionPot -= pensionDrawdown;
          isaPot -= isaDrawdown;
          cashGiaPot -= cashDrawdown;

          const isaTotalBeforeRata = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
          if (isaTotalBeforeRata > 0 && isaDrawdown > 0) {
            const ratio = Math.min(1, isaDrawdown / isaTotalBeforeRata);
            primarySsIsaPot = Math.max(0, primarySsIsaPot - primarySsIsaPot * ratio);
            primaryCashIsaPot = Math.max(0, primaryCashIsaPot - primaryCashIsaPot * ratio);
            primaryLisaPot = Math.max(0, primaryLisaPot - primaryLisaPot * ratio);
            primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;
          }

          const netPensionDrawdown = getNetProducedByPensionGross(pensionDrawdown);
          const currentNetAchieved = netPensionDrawdown + isaDrawdown + cashDrawdown;
          remainingIncomeNeeded = Math.max(0, remainingIncomeNeeded - currentNetAchieved);
        }
      }

      // Secondary Safety Net Pass: If primary strategy left a net shortfall but remaining pots exist, top up net income
      if (remainingIncomeNeeded > 0) {
        // 1. Top up from remaining ISA pot (tax-free)
        if (isaPot > 0 && remainingIncomeNeeded > 0) {
          const extraIsa = Math.min(isaPot, remainingIncomeNeeded);
          isaDrawdown += extraIsa;
          isaPot -= extraIsa;
          remainingIncomeNeeded -= extraIsa;
        }

        // 2. Top up from remaining Cash/GIA pot (tax-free)
        if (cashGiaPot > 0 && remainingIncomeNeeded > 0) {
          const extraCash = Math.min(cashGiaPot, remainingIncomeNeeded);
          cashDrawdown += extraCash;
          cashGiaPot -= extraCash;
          remainingIncomeNeeded -= extraCash;
        }

        // 3. Top up from remaining Pension pot (grossed up for tax)
        if (canAccessPension && pensionPot > 0 && remainingIncomeNeeded > 0) {
          const curPriGross = explicitPriPensionDraw >= 0 ? explicitPriPensionDraw : pensionDrawdown;
          const curPartGross = explicitPartPensionDraw >= 0 ? explicitPartPensionDraw : 0;

          const extraPensionGross = getGrossPensionNeededForNet(remainingIncomeNeeded, pensionPot, curPriGross, curPartGross);
          pensionDrawdown += extraPensionGross;
          pensionPot -= extraPensionGross;

          const priPotBefore = primaryUncrystallisedPot + primaryCrystallisedPot;
          const partPotBefore = profile.isCouplePlanning ? (partnerUncrystallisedPot + partnerCrystallisedPot) : 0;
          const availablePri = age >= pensionAccessAge ? priPotBefore : 0;
          const partnerAgeCurrent = age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge);
          const availablePart = (profile.isCouplePlanning && partnerAgeCurrent >= partnerPensionAccessAge) ? partPotBefore : 0;
          const totalAvail = availablePri + availablePart;

          const maxScope = profile.maximizedSpendConfig?.enabled ? (profile.maximizedSpendConfig.coupleScope || 'couple') : 'couple';
          let priExtraRatio = (availablePri + availablePart > 0) ? availablePri / (availablePri + availablePart) : 1;
          let partExtraRatio = profile.isCouplePlanning ? (1 - priExtraRatio) : 0;

          if (profile.isCouplePlanning && maxScope === 'primary') {
            if (availablePri > 0) {
              priExtraRatio = 1;
              partExtraRatio = 0;
            } else if (availablePart > 0) {
              priExtraRatio = 0;
              partExtraRatio = 1;
            }
          } else if (profile.isCouplePlanning && maxScope === 'partner') {
            if (availablePart > 0) {
              priExtraRatio = 0;
              partExtraRatio = 1;
            } else if (availablePri > 0) {
              priExtraRatio = 1;
              partExtraRatio = 0;
            }
          }

          if (availablePri + availablePart > 0) {
            const extraPri = extraPensionGross * priExtraRatio;
            const extraPart = extraPensionGross * partExtraRatio;
            if (explicitPriPensionDraw >= 0) explicitPriPensionDraw += extraPri;
            if (explicitPartPensionDraw >= 0) explicitPartPensionDraw += extraPart;
          }

          const netExtra = getNetProducedByPensionGross(extraPensionGross, curPriGross, curPartGross);
          remainingIncomeNeeded = Math.max(0, remainingIncomeNeeded - netExtra);
        }
      }

      let priActualUncrystDrawn = 0;
      let partActualUncrystDrawn = 0;
      let priActualDraw = 0;
      let partActualDraw = 0;

      // Update individual Primary & Partner pots after drawdown deductions
      if (pensionDrawdown > 0 && pensionPot + pensionDrawdown > 0) {
        const primaryCanAccess = age >= pensionAccessAge || primaryCrystallisedPot > 0;
        const partnerAgeCurrent = age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge);
        const partnerCanAccess = profile.isCouplePlanning && (partnerAgeCurrent >= partnerPensionAccessAge || partnerCrystallisedPot > 0);

        const priPotBefore = primaryUncrystallisedPot + primaryCrystallisedPot;
        const partPotBefore = profile.isCouplePlanning ? (partnerUncrystallisedPot + partnerCrystallisedPot) : 0;

        const availablePri = primaryCanAccess ? priPotBefore : 0;
        const availablePart = partnerCanAccess ? partPotBefore : 0;
        const totalAvailable = availablePri + availablePart;

        const maxScope = profile.maximizedSpendConfig?.enabled ? (profile.maximizedSpendConfig.coupleScope || 'couple') : 'couple';
        let priRatioAlloc = (totalAvailable > 0) ? availablePri / totalAvailable : 1;
        let partRatioAlloc = profile.isCouplePlanning ? (1 - priRatioAlloc) : 0;

        if (profile.isCouplePlanning && maxScope === 'primary') {
          if (availablePri > 0) {
            priRatioAlloc = 1;
            partRatioAlloc = 0;
          } else if (availablePart > 0) {
            priRatioAlloc = 0;
            partRatioAlloc = 1;
          }
        } else if (profile.isCouplePlanning && maxScope === 'partner') {
          if (availablePart > 0) {
            priRatioAlloc = 0;
            partRatioAlloc = 1;
          } else if (availablePri > 0) {
            priRatioAlloc = 1;
            partRatioAlloc = 0;
          }
        }

        if (totalAvailable > 0) {
          const priDraw = (explicitPriPensionDraw >= 0) ? explicitPriPensionDraw : pensionDrawdown * priRatioAlloc;
          const partDraw = (explicitPartPensionDraw >= 0) ? explicitPartPensionDraw : pensionDrawdown * partRatioAlloc;

          if (priDraw > 0) {
            let remainingPriDraw = priDraw;
            if (primaryCrystallisedPot > 0) {
              const drawFromCryst = Math.min(primaryCrystallisedPot, remainingPriDraw);
              primaryCrystallisedPot -= drawFromCryst;
              remainingPriDraw -= drawFromCryst;
              priActualDraw += drawFromCryst;
            }
            if (remainingPriDraw > 0 && primaryUncrystallisedPot > 0) {
              const drawFromUncryst = Math.min(primaryUncrystallisedPot, remainingPriDraw);
              primaryUncrystallisedPot -= drawFromUncryst;
              remainingPriDraw -= drawFromUncryst;
              priActualUncrystDrawn += drawFromUncryst;
              priActualDraw += drawFromUncryst;
            }
            primaryPensionPot = primaryCrystallisedPot + primaryUncrystallisedPot;
          }

          if (profile.isCouplePlanning && partDraw > 0) {
            let remainingPartDraw = partDraw;
            if (partnerCrystallisedPot > 0) {
              const drawFromCryst = Math.min(partnerCrystallisedPot, remainingPartDraw);
              partnerCrystallisedPot -= drawFromCryst;
              remainingPartDraw -= drawFromCryst;
              partActualDraw += drawFromCryst;
            }
            if (remainingPartDraw > 0 && partnerUncrystallisedPot > 0) {
              const drawFromUncryst = Math.min(partnerUncrystallisedPot, remainingPartDraw);
              partnerUncrystallisedPot -= drawFromUncryst;
              remainingPartDraw -= drawFromUncryst;
              partActualUncrystDrawn += drawFromUncryst;
              partActualDraw += drawFromUncryst;
            }
            partnerPensionPot = partnerCrystallisedPot + partnerUncrystallisedPot;
          }
        } else {
          let remainingDraw = pensionDrawdown;
          if (primaryCrystallisedPot > 0) {
            const drawFromCryst = Math.min(primaryCrystallisedPot, remainingDraw);
            primaryCrystallisedPot -= drawFromCryst;
            remainingDraw -= drawFromCryst;
            priActualDraw += drawFromCryst;
          }
          if (remainingDraw > 0 && primaryUncrystallisedPot > 0) {
            const drawFromUncryst = Math.min(primaryUncrystallisedPot, remainingDraw);
            primaryUncrystallisedPot -= drawFromUncryst;
            remainingDraw -= drawFromUncryst;
            priActualUncrystDrawn += drawFromUncryst;
            priActualDraw += drawFromUncryst;
          }
          primaryPensionPot = primaryCrystallisedPot + primaryUncrystallisedPot;

          if (profile.isCouplePlanning && remainingDraw > 0) {
            if (partnerCrystallisedPot > 0) {
              const drawFromCryst = Math.min(partnerCrystallisedPot, remainingDraw);
              partnerCrystallisedPot -= drawFromCryst;
              remainingDraw -= drawFromCryst;
              partActualDraw += drawFromCryst;
            }
            if (remainingDraw > 0 && partnerUncrystallisedPot > 0) {
              const drawFromUncryst = Math.min(partnerUncrystallisedPot, remainingDraw);
              partnerUncrystallisedPot -= drawFromUncryst;
              remainingDraw -= drawFromUncryst;
              partActualUncrystDrawn += drawFromUncryst;
              partActualDraw += drawFromUncryst;
            }
            partnerPensionPot = partnerCrystallisedPot + partnerUncrystallisedPot;
          }
        }
        pensionPot = primaryPensionPot + partnerPensionPot;
      }
      const primaryIsaPotBeforeDraw = primaryIsaPot;
      const partnerIsaPotBeforeDraw = partnerIsaPot;
      const primaryCashGiaPotBeforeDraw = primaryCashGiaPot;
      const partnerCashGiaPotBeforeDraw = partnerCashGiaPot;

      if (isaDrawdown > 0 && isaPot + isaDrawdown > 0) {
        const totalIsaDenom = isaPot + isaDrawdown;
        const drawRatio = totalIsaDenom > 0 ? isaDrawdown / totalIsaDenom : 0;
        primarySsIsaPot = Math.max(0, primarySsIsaPot * (1 - drawRatio));
        primaryCashIsaPot = Math.max(0, primaryCashIsaPot * (1 - drawRatio));
        primaryLisaPot = Math.max(0, primaryLisaPot * (1 - drawRatio));
        primaryIsaPot = primarySsIsaPot + primaryCashIsaPot + primaryLisaPot;

        partnerSsIsaPot = Math.max(0, partnerSsIsaPot * (1 - drawRatio));
        partnerCashIsaPot = Math.max(0, partnerCashIsaPot * (1 - drawRatio));
        partnerLisaPot = Math.max(0, partnerLisaPot * (1 - drawRatio));
        partnerIsaPot = partnerSsIsaPot + partnerCashIsaPot + partnerLisaPot;
        isaPot = primaryIsaPot + partnerIsaPot;
      }
      if (cashDrawdown > 0 && cashGiaPot + cashDrawdown > 0) {
        const totalCashDenom = cashGiaPot + cashDrawdown;
        const drawRatio = totalCashDenom > 0 ? cashDrawdown / totalCashDenom : 0;
        primaryCashGiaPot = Math.max(0, primaryCashGiaPot * (1 - drawRatio));
        partnerCashGiaPot = Math.max(0, partnerCashGiaPot * (1 - drawRatio));
        cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
      }

      const totalIsaBeforeDraw = primaryIsaPotBeforeDraw + partnerIsaPotBeforeDraw;
      const primaryIsaDrawdown = isaDrawdown > 0 && totalIsaBeforeDraw > 0 ? Math.min(primaryIsaPotBeforeDraw, isaDrawdown * (primaryIsaPotBeforeDraw / totalIsaBeforeDraw)) : 0;
      const partnerIsaDrawdown = isaDrawdown > 0 ? Math.max(0, isaDrawdown - primaryIsaDrawdown) : 0;

      const totalCashBeforeDraw = primaryCashGiaPotBeforeDraw + partnerCashGiaPotBeforeDraw;
      const primaryCashDrawdown = cashDrawdown > 0 && totalCashBeforeDraw > 0 ? Math.min(primaryCashGiaPotBeforeDraw, cashDrawdown * (primaryCashGiaPotBeforeDraw / totalCashBeforeDraw)) : 0;
      const partnerCashDrawdown = cashDrawdown > 0 ? Math.max(0, cashDrawdown - primaryCashDrawdown) : 0;

      if (primaryCashDrawdown > 0) {
        let rem = primaryCashDrawdown;
        if (primaryCashSavingsPot > 0) {
          const draw = Math.min(primaryCashSavingsPot, rem);
          primaryCashSavingsPot -= draw;
          rem -= draw;
        }
        if (rem > 0 && primaryGiaPot > 0) {
          const draw = Math.min(primaryGiaPot, rem);
          primaryGiaPot -= draw;
          rem -= draw;
        }
        primaryCashGiaPot = primaryCashSavingsPot + primaryGiaPot;
      }

      if (partnerCashDrawdown > 0) {
        let rem = partnerCashDrawdown;
        if (partnerCashSavingsPot > 0) {
          const draw = Math.min(partnerCashSavingsPot, rem);
          partnerCashSavingsPot -= draw;
          rem -= draw;
        }
        if (rem > 0 && partnerGiaPot > 0) {
          const draw = Math.min(partnerGiaPot, rem);
          partnerGiaPot -= draw;
          rem -= draw;
        }
        partnerCashGiaPot = partnerCashSavingsPot + partnerGiaPot;
      }

      giaPot = primaryGiaPot + partnerGiaPot;
      cashSavingsPot = primaryCashSavingsPot + partnerCashSavingsPot;
      cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;

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
      const grossRetirementIncome = guaranteedIncomeTotal + totalWithdrawal;
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
        totalPot = pensionPot + isaPot + cashGiaPot;
      }

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
        primaryTotalPot: Math.round(primaryPensionPot + primaryIsaPot + primaryCashGiaPot),

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
        partnerTotalPot: Math.round(partnerPensionPot + partnerIsaPot + partnerCashGiaPot),

        primaryStatePensionReceived: Math.round(primaryStatePensionReceived),
        primaryDbPensionIncomeReceived: Math.round(primaryDbPensionReceived),
        primaryAnnuityIncomeReceived: Math.round(primaryAnnuityIncomeThisYear),
        primaryTaxableFixedIncomeReceived: Math.round(primaryTaxableFixedIncomeReceived),
        primaryTaxFreeFixedIncomeReceived: Math.round(primaryTaxFreeFixedIncomeReceived),
        primaryPensionDrawdown: Math.round(primaryPensionDrawdown),
        primaryPensionDrawdownTaxFree: Math.round(priPensionDrawdownTaxFree),
        primaryPensionDrawdownTaxable: Math.round(priPensionDrawdownTaxable),
        primaryIsaDrawdown: Math.round(primaryIsaDrawdown),
        primaryCashDrawdown: Math.round(primaryCashDrawdown),
        primaryNetRetirementIncome: Math.round(Math.max(0, primaryGuaranteedTotal + primaryPensionDrawdown + primaryIsaDrawdown + primaryCashDrawdown - priTaxRetirement - (profile.isCouplePlanning ? priSavingsTaxNominal : decumSavingsTaxNominal))),

        partnerStatePensionReceived: Math.round(partnerStatePensionReceived),
        partnerDbPensionIncomeReceived: Math.round(partnerDbPensionReceived),
        partnerAnnuityIncomeReceived: Math.round(partnerAnnuityIncomeThisYear),
        partnerTaxableFixedIncomeReceived: Math.round(partnerTaxableFixedIncomeReceived),
        partnerTaxFreeFixedIncomeReceived: Math.round(partnerTaxFreeFixedIncomeReceived),
        partnerPensionDrawdown: Math.round(partnerPensionDrawdown),
        partnerPensionDrawdownTaxFree: Math.round(partPensionDrawdownTaxFree),
        partnerPensionDrawdownTaxable: Math.round(partPensionDrawdownTaxable),
        partnerIsaDrawdown: Math.round(partnerIsaDrawdown),
        partnerCashDrawdown: Math.round(partnerCashDrawdown),
        partnerNetRetirementIncome: Math.round(profile.isCouplePlanning ? Math.max(0, partnerGuaranteedTotal + partnerPensionDrawdown + partnerIsaDrawdown + partnerCashDrawdown - partTaxRetirement - partSavingsTaxNominal) : 0),

        estimatedPotGrowth,
        estimatedInvestmentFees: decumFeesPaid,
        annualContributionTotal: 0,
        lifeEventsIncome: Math.round(lifeEventsIncomeThisYear),
        lifeEventsExpense: Math.round(lifeEventsExpenseThisYear),
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
        isaDrawdown: Math.round(isaDrawdown),
        cashDrawdown: Math.round(cashDrawdown),
        totalWithdrawalAmount: Math.round(totalWithdrawal),
        taxOnWithdrawal: Math.round(taxOnWithdrawal),
        totalTaxPaid: Math.round(taxOnWithdrawal + decumSavingsTaxNominal),
        primaryTaxPaid: Math.round(priTaxRetirement + (profile.isCouplePlanning ? priSavingsTaxNominal : decumSavingsTaxNominal)),
        partnerTaxPaid: Math.round(profile.isCouplePlanning ? (partTaxRetirement + partSavingsTaxNominal) : 0),
        primaryNetIncome: Math.round(Math.max(0, primaryGuaranteedTotal + primaryPensionDrawdown + primaryIsaDrawdown + primaryCashDrawdown - priTaxRetirement - (profile.isCouplePlanning ? priSavingsTaxNominal : decumSavingsTaxNominal))),
        partnerNetIncome: Math.round(profile.isCouplePlanning ? Math.max(0, partnerGuaranteedTotal + partnerPensionDrawdown + partnerIsaDrawdown + partnerCashDrawdown - partTaxRetirement - partSavingsTaxNominal) : 0),
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
  }

  return projections;
}



