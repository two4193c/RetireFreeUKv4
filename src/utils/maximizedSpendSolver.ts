import { UserProfile, InvestmentPots, YearProjection, SpendingPhasesConfig, AnnuityType, AnnuityDurationOption, CoupleMaxSpendScope } from '../types';
import { generateProjections } from './projectionEngine';
import { calculateUKTax } from './ukTaxEngine';
import { DEFAULT_PARTNER_POTS } from './defaultData';

export type AnnuityFloorMode = 'none' | 'target_floor' | 'custom_percent';

export interface AnnuityFloorOptions {
  annuityFloorMode?: AnnuityFloorMode;
  annuityFloorIncomeTarget?: number; // e.g. £15,000/yr guaranteed floor
  annuityFloorPercent?: number; // e.g. 40% of pension pot
  annuityFloorAge?: number; // Age when annuity is bought (e.g. 60, 65, 67)
  annuityRatePercent?: number; // e.g. 6.0%
  annuityType?: AnnuityType; // e.g. 'inflation_linked_single' | 'level_single' | 'fixed_increase_single_3'
  annuityDurationOption?: AnnuityDurationOption; // 'lifetime' | 'until_age'
  annuityDurationUntilAge?: number; // e.g. 75, 80
}

export interface SolveMaximizedSpendOptions extends AnnuityFloorOptions {
  profile: UserProfile;
  pots: InvestmentPots;
  coupleScope?: CoupleMaxSpendScope;
  targetEndAge?: number; // e.g. 95 (default)
  targetLegacyBuffer?: number; // e.g. 0 (Die with Zero)
  spendingPattern?: 'uniform' | 'proportional_phases' | 'front_loaded';
  reinvestExcessDrawdown?: boolean; // Option to max drawdown while keeping actual spending target lower
  actualSpendingTargetAnnual?: number; // Actual lifestyle spending requirement (£/yr)
  reinvestDestinationPot?: 'isa' | 'gia' | 'cash'; // Destination pot for reinvesting surplus
}

export interface ReinvestExcessOptions {
  reinvestExcessDrawdown?: boolean;
  actualSpendingTargetAnnual?: number;
  reinvestDestinationPot?: 'isa' | 'gia' | 'cash';
}

export interface SolveMaximizedSpendResult {
  maxAnnualIncome: number; // £/yr in today's terms for baseline / post-access
  bridgeAnnualIncome?: number; // £/yr during pre-pension access bridge years if applicable
  originalAnnualIncome: number; // £/yr original baseline target
  extraAnnualSpend: number; // +£/yr
  extraLifetimeSpend: number; // Total extra £ spent over retirement
  targetEndAge: number;
  targetLegacyBuffer: number;
  finalPotAtTargetAge: number;
  boostPercentage: number;
  bestCandidateProfile: UserProfile;
  projectionsWithMaxSpend: YearProjection[];
  spendingPattern: 'uniform' | 'proportional_phases' | 'front_loaded';
  coupleScope: CoupleMaxSpendScope;
  phaseIncomes?: {
    goGoIncome?: number;
    slowGoIncome?: number;
    noGoIncome?: number;
  };
  annuityFloorDetails?: {
    mode: AnnuityFloorMode;
    guaranteedAnnualIncome: number;
    pensionPotAllocated: number;
    allocationPercent: number;
    annuityPurchaseAge: number;
    annuityRatePercent: number;
    annuityType: AnnuityType;
    annuityDurationOption: AnnuityDurationOption;
    annuityDurationUntilAge?: number;
    flexiDrawdownAnnualIncome: number;
  };
  reinvestExcessDetails?: {
    enabled: boolean;
    actualSpendingTargetAnnual: number;
    maxAnnualDrawdown: number;
    annualSurplusReinvested: number;
    reinvestDestinationPot: 'isa' | 'gia' | 'cash';
  };
}

/**
 * Disables Maximized Spend mode and cleanly restores the pre-solver baseline income requirements.
 */
export function disableMaximizedSpend(profile: UserProfile): UserProfile {
  if (!profile.maximizedSpendConfig) {
    return profile;
  }

  const baselineTarget = profile.maximizedSpendConfig.baselineTargetAnnualIncome;
  const baselinePhases = profile.maximizedSpendConfig.baselineSpendingPhases;

  return {
    ...profile,
    targetRetirementIncomeAnnual:
      baselineTarget !== undefined ? baselineTarget : profile.targetRetirementIncomeAnnual,
    spendingPhases:
      baselinePhases !== undefined ? baselinePhases : profile.spendingPhases,
    maximizedSpendConfig: {
      ...profile.maximizedSpendConfig,
      enabled: false,
    },
  };
}

/**
 * Gets the original baseline target income of a profile, looking at custom ranges or goGo income if spending phases are enabled.
 */
export function getOriginalBaseIncome(profile: UserProfile): number {
  if (profile.maximizedSpendConfig?.enabled && profile.maximizedSpendConfig.baselineTargetAnnualIncome !== undefined) {
    return profile.maximizedSpendConfig.baselineTargetAnnualIncome;
  }
  if (profile.spendingPhases?.enabled) {
    if (profile.spendingPhases.customRanges && profile.spendingPhases.customRanges.length > 0) {
      const retAge = profile.targetRetirementAge || 60;
      const match = profile.spendingPhases.customRanges.find(r => r.startAge <= retAge && (!r.endAge || r.endAge >= retAge));
      return match ? match.annualTargetIncome : profile.spendingPhases.customRanges[0].annualTargetIncome;
    }
    if (profile.spendingPhases.goGoIncomeAnnual) {
      return profile.spendingPhases.goGoIncomeAnnual;
    }
  }
  return profile.targetRetirementIncomeAnnual || 30000;
}

/**
 * Prepares isolated profile and pots for solver evaluation based on Couple Scope
 */
export function getScopeEvaluationInputs(
  profileInput: UserProfile,
  potsInput: InvestmentPots,
  scope: CoupleMaxSpendScope = 'couple'
): { evalProfile: UserProfile; evalPots: InvestmentPots } {
  if (!profileInput.isCouplePlanning || scope === 'couple') {
    return { evalProfile: profileInput, evalPots: potsInput };
  }

  const evalProfile = JSON.parse(JSON.stringify(profileInput)) as UserProfile;
  const evalPots = JSON.parse(JSON.stringify(potsInput)) as InvestmentPots;

  if (scope === 'primary') {
    // Only evaluate primary wealth
    evalProfile.isCouplePlanning = false;
    evalProfile.partnerGrossAnnualSalary = 0;
    evalProfile.dbPensions = (profileInput.dbPensions || []).filter((p) => p.owner !== 'partner');
    evalProfile.partnerPots = {
      workplacePensionBalance: 0,
      workplacePensionMonthlyEmployee: 0,
      workplacePensionMonthlyEmployeeType: 'percent',
      employerMatchPercentage: 0,
      sippBalance: 0,
      stocksAndSharesIsaBalance: 0,
      cashIsaBalance: 0,
      lisaBalance: 0,
      giaBalance: 0,
      cashSavingsBalance: 0,
      sippMonthlyContribution: 0,
      sippContributionType: 'net',
      stocksAndSharesIsaMonthlyContribution: 0,
      cashIsaMonthlyContribution: 0,
      lisaMonthlyContribution: 0,
      giaMonthlyContribution: 0,
      cashSavingsMonthlyContribution: 0,
    };
    evalProfile.partnerWorkplacePensionBalance = 0;
    evalProfile.partnerSippBalance = 0;
    evalProfile.partnerIsaBalance = 0;
  } else if (scope === 'partner') {
    // Evaluate partner wealth by replacing primary pots with partner's pots, and setting profile to single partner mode
    evalProfile.isCouplePlanning = false;
    evalProfile.currentAge = profileInput.partnerCurrentAge ?? profileInput.currentAge;
    evalProfile.targetRetirementAge = profileInput.partnerTargetRetirementAge ?? profileInput.targetRetirementAge;
    evalProfile.statePensionAge = profileInput.partnerStatePensionAge ?? 67;
    evalProfile.grossAnnualSalary = profileInput.partnerGrossAnnualSalary ?? 0;
    evalProfile.taxRegion = profileInput.partnerTaxRegion ?? profileInput.taxRegion;
    evalProfile.includeStatePension = profileInput.partnerIncludeStatePension ?? profileInput.includeStatePension;
    if (profileInput.partnerStatePensionAmountAnnual) {
      evalProfile.statePensionAmountAnnual = profileInput.partnerStatePensionAmountAnnual;
    }
    if (profileInput.partnerQualifyingYears !== undefined) {
      evalProfile.qualifyingYears = profileInput.partnerQualifyingYears;
    }

    const pPots = profileInput.partnerPots || DEFAULT_PARTNER_POTS;
    evalPots.workplacePensionBalance = pPots.workplacePensionBalance || profileInput.partnerWorkplacePensionBalance || 0;
    evalPots.sippBalance = pPots.sippBalance || profileInput.partnerSippBalance || 0;
    evalPots.stocksAndSharesIsaBalance = pPots.stocksAndSharesIsaBalance || profileInput.partnerIsaBalance || 0;
    evalPots.cashIsaBalance = pPots.cashIsaBalance || 0;
    evalPots.lisaBalance = pPots.lisaBalance || 0;
    evalPots.giaBalance = pPots.giaBalance || 0;
    evalPots.cashSavingsBalance = pPots.cashSavingsBalance || 0;
    evalPots.workplacePensionMonthlyEmployee = pPots.workplacePensionMonthlyEmployee || 0;
    evalPots.workplacePensionMonthlyEmployeeType = pPots.workplacePensionMonthlyEmployeeType || 'percent';
    evalPots.employerMatchPercentage = pPots.employerMatchPercentage || 0;
    evalPots.sippMonthlyContribution = pPots.sippMonthlyContribution || 0;
    evalPots.sippContributionType = pPots.sippContributionType || 'net';
    evalPots.stocksAndSharesIsaMonthlyContribution = pPots.stocksAndSharesIsaMonthlyContribution || 0;
    evalPots.cashIsaMonthlyContribution = pPots.cashIsaMonthlyContribution || 0;
    evalPots.lisaMonthlyContribution = pPots.lisaMonthlyContribution || 0;
    evalPots.giaMonthlyContribution = pPots.giaMonthlyContribution || 0;
    evalPots.cashSavingsMonthlyContribution = pPots.cashSavingsMonthlyContribution || 0;

    evalProfile.partnerPots = {
      workplacePensionBalance: 0,
      workplacePensionMonthlyEmployee: 0,
      workplacePensionMonthlyEmployeeType: 'percent',
      employerMatchPercentage: 0,
      sippBalance: 0,
      stocksAndSharesIsaBalance: 0,
      cashIsaBalance: 0,
      lisaBalance: 0,
      giaBalance: 0,
      cashSavingsBalance: 0,
      sippMonthlyContribution: 0,
      sippContributionType: 'net',
      stocksAndSharesIsaMonthlyContribution: 0,
      cashIsaMonthlyContribution: 0,
      lisaMonthlyContribution: 0,
      giaMonthlyContribution: 0,
      cashSavingsMonthlyContribution: 0,
    };
    evalProfile.partnerWorkplacePensionBalance = 0;
    evalProfile.partnerSippBalance = 0;
    evalProfile.partnerIsaBalance = 0;
    evalProfile.dbPensions = (profileInput.dbPensions || []).filter((p) => p.owner === 'partner').map((p) => ({ ...p, owner: 'primary' as const }));
  }

  return { evalProfile, evalPots };
}

/**
 * Calculates candidate profile with a given target baseline income and pattern
 */
export function createCandidateProfile(
  profileInput: UserProfile,
  baselineIncome: number,
  pattern: 'uniform' | 'proportional_phases' | 'front_loaded',
  pots?: InvestmentPots,
  annuityFloorOpts?: AnnuityFloorOptions,
  reinvestOpts?: ReinvestExcessOptions,
  targetEndAge?: number,
  targetLegacyBuffer?: number,
  coupleScope?: CoupleMaxSpendScope
): UserProfile {
  const profile = profileInput.maximizedSpendConfig?.enabled
    ? disableMaximizedSpend(profileInput)
    : profileInput;

  const candidate = JSON.parse(JSON.stringify(profile)) as UserProfile;
  const roundedBaseline = Math.round(baselineIncome);

  const isReinvestExcess = reinvestOpts !== undefined 
    ? Boolean(reinvestOpts.reinvestExcessDrawdown)
    : Boolean(profile.reinvestExcessDrawdown || profile.maximizedSpendConfig?.reinvestExcessDrawdown);
  const actualSpendingTarget =
    reinvestOpts?.actualSpendingTargetAnnual ??
    profile.actualSpendingTargetAnnual ??
    profile.maximizedSpendConfig?.actualSpendingTargetAnnual ??
    profile.targetRetirementIncomeAnnual ??
    30000;
  const rawDest =
    reinvestOpts?.reinvestDestinationPot ||
    profile.annuityExcessReinvestOption ||
    profile.reinvestDestinationPot ||
    profile.maximizedSpendConfig?.reinvestDestinationPot;
  const reinvestDestination: 'isa' | 'gia' | 'cash' =
    (rawDest === 'gia' || rawDest === 'cash' || rawDest === 'cash_savings') ? (rawDest === 'gia' ? 'gia' : 'cash') : 'isa';

  // Apply Annuity Floor configuration if enabled
  if (annuityFloorOpts && annuityFloorOpts.annuityFloorMode && annuityFloorOpts.annuityFloorMode !== 'none') {
    const mode = annuityFloorOpts.annuityFloorMode;
    const retAge = candidate.targetRetirementAge || 60;
    const pensionAccessAge = candidate.protectedPensionAccessAge || 57;
    const purchaseAge = Math.max(pensionAccessAge, annuityFloorOpts.annuityFloorAge || retAge);
    const ratePercent = annuityFloorOpts.annuityRatePercent || 6.0;
    const aType = annuityFloorOpts.annuityType || 'inflation_linked_single';

    let allocPercent = 0;
    const totalPensionPot = (pots?.workplacePensionBalance || 0) + (pots?.sippBalance || 0);

    if (mode === 'custom_percent') {
      allocPercent = Math.min(100, Math.max(1, annuityFloorOpts.annuityFloorPercent || 30));
    } else if (mode === 'target_floor') {
      const targetFloorIncome = annuityFloorOpts.annuityFloorIncomeTarget || 15000;
      const capitalNeeded = targetFloorIncome / (ratePercent / 100);
      if (totalPensionPot > 0) {
        allocPercent = Math.min(100, Math.max(1, Math.round((capitalNeeded / totalPensionPot) * 100)));
      } else {
        allocPercent = 50;
      }
    }

    candidate.incomeProductOption = 'hybrid';
    candidate.annuityAllocationPercent = allocPercent;
    candidate.annuityPurchaseAge = purchaseAge;
    candidate.annuityRatePercent = ratePercent;
    candidate.annuityType = aType;
    candidate.annuityDurationOption = annuityFloorOpts.annuityDurationOption || 'lifetime';
    candidate.annuityDurationUntilAge = annuityFloorOpts.annuityDurationUntilAge || 75;
  }

  let maxPhases: SpendingPhasesConfig | undefined = undefined;

  if (pattern === 'uniform') {
    maxPhases = { enabled: false };
  } else if (pattern === 'front_loaded') {
    const goGoEnd = Math.min(candidate.targetRetirementAge + 10, 75);
    const slowGoEnd = Math.min(candidate.targetRetirementAge + 20, 85);
    maxPhases = {
      enabled: true,
      goGoEndAge: goGoEnd,
      goGoIncomeAnnual: Math.round(baselineIncome * 1.2), // +20% Go-Go boost
      slowGoEndAge: slowGoEnd,
      slowGoIncomeAnnual: roundedBaseline, // Standard
      noGoIncomeAnnual: Math.round(baselineIncome * 0.8), // -20% No-Go decline
      customRanges: [], // Clear customRanges so 3-phase takes effect
    };
  } else if (pattern === 'proportional_phases') {
    const origBase = Math.max(1000, getOriginalBaseIncome(profile));
    const ratio = baselineIncome / origBase;

    if (profile.spendingPhases) {
      const clonedPhases = JSON.parse(JSON.stringify(profile.spendingPhases)) as SpendingPhasesConfig;
      clonedPhases.enabled = true;
      if (clonedPhases.customRanges && clonedPhases.customRanges.length > 0) {
        clonedPhases.customRanges = clonedPhases.customRanges.map((r) => ({
          ...r,
          annualTargetIncome: Math.round(r.annualTargetIncome * ratio),
        }));
      } else {
        if (clonedPhases.goGoIncomeAnnual !== undefined) {
          clonedPhases.goGoIncomeAnnual = Math.round(clonedPhases.goGoIncomeAnnual * ratio);
        }
        if (clonedPhases.slowGoIncomeAnnual !== undefined) {
          clonedPhases.slowGoIncomeAnnual = Math.round(clonedPhases.slowGoIncomeAnnual * ratio);
        }
        if (clonedPhases.noGoIncomeAnnual !== undefined) {
          clonedPhases.noGoIncomeAnnual = Math.round(clonedPhases.noGoIncomeAnnual * ratio);
        }
      }
      maxPhases = clonedPhases;
    } else {
      const goGoEnd = Math.min(candidate.targetRetirementAge + 10, 75);
      const slowGoEnd = Math.min(candidate.targetRetirementAge + 20, 85);
      maxPhases = {
        enabled: true,
        goGoEndAge: goGoEnd,
        goGoIncomeAnnual: Math.round(baselineIncome * 1.2),
        slowGoEndAge: slowGoEnd,
        slowGoIncomeAnnual: roundedBaseline,
        noGoIncomeAnnual: Math.round(baselineIncome * 0.8),
      };
    }
  }

  const baselineTargetAnnualIncome =
    profile.maximizedSpendConfig?.baselineTargetAnnualIncome ?? profile.targetRetirementIncomeAnnual;
  const baselineSpendingPhases =
    profile.maximizedSpendConfig?.baselineSpendingPhases ??
    (profile.spendingPhases ? JSON.parse(JSON.stringify(profile.spendingPhases)) : undefined);

  candidate.reinvestExcessDrawdown = isReinvestExcess;
  candidate.actualSpendingTargetAnnual = actualSpendingTarget;
  candidate.annuityExcessReinvestOption = (rawDest === 'stocks_and_shares_isa' || rawDest === 'cash_isa' || rawDest === 'gia' || rawDest === 'cash' || rawDest === 'cash_savings' || rawDest === 'none') ? rawDest : (reinvestDestination === 'isa' ? 'stocks_and_shares_isa' : reinvestDestination);
  candidate.reinvestDestinationPot = reinvestDestination;
  if (targetEndAge !== undefined) {
    candidate.lifeExpectancyAge = targetEndAge;
  }

  candidate.maximizedSpendConfig = {
    enabled: true,
    coupleScope: coupleScope || profile.maximizedSpendConfig?.coupleScope || 'couple',
    targetAnnualIncome: roundedBaseline,
    spendingPattern: pattern,
    spendingPhases: maxPhases,
    baselineTargetAnnualIncome,
    baselineSpendingPhases,
    reinvestExcessDrawdown: isReinvestExcess,
    actualSpendingTargetAnnual: actualSpendingTarget,
    reinvestDestinationPot: reinvestDestination,
    targetEndAge,
    targetLegacyBuffer,
    annuityFloorMode: annuityFloorOpts?.annuityFloorMode || 'none',
    annuityFloorIncomeTarget: annuityFloorOpts?.annuityFloorIncomeTarget,
    annuityFloorPercent: annuityFloorOpts?.annuityFloorPercent,
    annuityFloorAge: annuityFloorOpts?.annuityFloorAge,
    annuityRatePercent: annuityFloorOpts?.annuityRatePercent,
    annuityType: annuityFloorOpts?.annuityType,
    annuityDurationOption: annuityFloorOpts?.annuityDurationOption,
    annuityDurationUntilAge: annuityFloorOpts?.annuityDurationUntilAge,
  };

  // Explicitly set the target income: targetRetirementIncomeAnnual is always the maximized target income
  candidate.targetRetirementIncomeAnnual = roundedBaseline;
  candidate.spendingPhases = maxPhases;

  // Clamping bridge ranges is done whenever pots are provided and retAge < pensionAccessAge
  if (pots) {
    return clampBridgeRangesIfNeeded(candidate, pots);
  }

  return candidate;
}

/**
 * Handles early retirement bridge constraints (retAge < pensionAccessAge).
 * Clamps pre-pension access targets to sustainable ISA/cash levels so binary search
 * can optimize post-access pension wealth to £0 without early depletion during bridge years.
 */
function clampBridgeRangesIfNeeded(candidateProfile: UserProfile, pots: InvestmentPots): UserProfile {
  const retAge = candidateProfile.targetRetirementAge || 60;
  const pensionAccessAge = candidateProfile.protectedPensionAccessAge || 57;

  if (retAge >= pensionAccessAge || !candidateProfile.maximizedSpendConfig) {
    return candidateProfile;
  }

  // Test if candidate profile causes shortfall during pre-pension access bridge years
  const taxResult = calculateUKTax(candidateProfile, pots);
  const projections = generateProjections(candidateProfile, pots, taxResult);
  const hasBridgeShortfall = projections.some(
    (p) => p.age >= retAge && p.age < pensionAccessAge && (p.incomeShortfall || 0) > 50
  );

  if (!hasBridgeShortfall) {
    return candidateProfile;
  }

  // If there is a shortfall during bridge years, clamp bridge year target(s)
  const cloned = JSON.parse(JSON.stringify(candidateProfile)) as UserProfile;
  const maxConfig = cloned.maximizedSpendConfig!;
  maxConfig.spendingPhases = maxConfig.spendingPhases || { enabled: true };
  maxConfig.spendingPhases.enabled = true;

  if (maxConfig.spendingPhases.customRanges && maxConfig.spendingPhases.customRanges.length > 0) {
    const bridgeRanges = maxConfig.spendingPhases.customRanges.filter((r) => r.startAge < pensionAccessAge);
    for (const r of bridgeRanges) {
      let bLow = 0;
      let bHigh = r.annualTargetIncome;
      let bestB = bLow;

      for (let i = 0; i < 24; i++) {
        if (bLow > bHigh) break;
        const bMid = Math.floor((bLow + bHigh) / 2);
        r.annualTargetIncome = bMid;
        const testTax = calculateUKTax(cloned, pots);
        const testProj = generateProjections(cloned, pots, testTax);
        const testShortfall = testProj.some(
          (p) => p.age >= retAge && p.age < pensionAccessAge && (p.incomeShortfall || 0) > 50
        );
        if (!testShortfall) {
          bestB = bMid;
          bLow = bMid + 1;
        } else {
          bHigh = bMid - 1;
        }
      }
      r.annualTargetIncome = bestB;
    }
  } else {
    const origTarget = maxConfig.targetAnnualIncome || 30000;
    
    let bLow = 0;
    let bHigh = origTarget;
    let bestB = bLow;

    const basePhases = maxConfig.spendingPhases || ({} as SpendingPhasesConfig);
    const buildCustomRanges = (bridgeTarget: number) => {
      const ranges = [
        { id: 'bridge-auto', name: `Pre-Pension Bridge (Ages ${retAge}-${pensionAccessAge - 1})`, startAge: retAge, endAge: pensionAccessAge - 1, annualTargetIncome: bridgeTarget },
      ];
      if (basePhases.goGoEndAge) {
        ranges.push({ id: 'gogo-auto', name: `Go-Go Phase`, startAge: pensionAccessAge, endAge: basePhases.goGoEndAge, annualTargetIncome: basePhases.goGoIncomeAnnual || origTarget });
        if (basePhases.slowGoEndAge) {
          ranges.push({ id: 'slowgo-auto', name: `Slow-Go Phase`, startAge: basePhases.goGoEndAge + 1, endAge: basePhases.slowGoEndAge, annualTargetIncome: basePhases.slowGoIncomeAnnual || origTarget });
          ranges.push({ id: 'nogo-auto', name: `No-Go Phase`, startAge: basePhases.slowGoEndAge + 1, endAge: 100, annualTargetIncome: basePhases.noGoIncomeAnnual || origTarget });
        } else {
          ranges.push({ id: 'nogo-auto', name: `Slow/No-Go Phase`, startAge: basePhases.goGoEndAge + 1, endAge: 100, annualTargetIncome: basePhases.slowGoIncomeAnnual || origTarget });
        }
      } else {
        ranges.push({ id: 'post-auto', name: `Pension Access (Ages ${pensionAccessAge}+)`, startAge: pensionAccessAge, endAge: 100, annualTargetIncome: origTarget });
      }
      return ranges;
    };

    const testProfile = JSON.parse(JSON.stringify(cloned)) as UserProfile;
    testProfile.maximizedSpendConfig!.spendingPhases = {
      enabled: true,
      customRanges: buildCustomRanges(origTarget),
    };

    const bridgeRange = testProfile.maximizedSpendConfig!.spendingPhases.customRanges![0];

    for (let i = 0; i < 24; i++) {
      if (bLow > bHigh) break;
      const bMid = Math.floor((bLow + bHigh) / 2);
      bridgeRange.annualTargetIncome = bMid;
      const testTax = calculateUKTax(testProfile, pots);
      const testProj = generateProjections(testProfile, pots, testTax);
      const testShortfall = testProj.some(
        (p) => p.age >= retAge && p.age < pensionAccessAge && (p.incomeShortfall || 0) > 50
      );
      if (!testShortfall) {
        bestB = bMid;
        bLow = bMid + 1;
      } else {
        bHigh = bMid - 1;
      }
    }

    maxConfig.spendingPhases = {
      enabled: true,
      customRanges: buildCustomRanges(bestB),
    };
  }

  cloned.spendingPhases = maxConfig.spendingPhases;
  return cloned;
}

/**
 * Checks if a candidate profile is feasible up to targetEndAge with buffer
 */
export function testFeasibility(
  candidateProfile: UserProfile,
  pots: InvestmentPots,
  targetEndAge: number,
  targetLegacyBuffer: number
): { feasible: boolean; finalPot: number; projections: YearProjection[]; depletedAge?: number } {
  const taxResult = calculateUKTax(candidateProfile, pots);
  const projections = generateProjections(candidateProfile, pots, taxResult);
  
  if (!projections || projections.length === 0) {
    return { feasible: false, finalPot: 0, projections: [] };
  }

  const retAge = candidateProfile.targetRetirementAge || 60;
  let depletedAge: number | undefined;

  // Check year-by-year from retirement age up to targetEndAge for premature pot depletion or income shortfall
  for (const p of projections) {
    if (p.age >= retAge && p.age <= targetEndAge) {
      const shortfall = p.incomeShortfall || 0;
      if (shortfall > 50) {
        if (!depletedAge) depletedAge = p.age;
      }
    }
  }

  // If depleted prematurely at or before targetEndAge, not feasible
  if (depletedAge && depletedAge <= targetEndAge) {
    const targetRow = projections.find((p) => p.age === targetEndAge) || projections[projections.length - 1];
    return { feasible: false, finalPot: targetRow?.totalPot || 0, projections, depletedAge };
  }

  const targetRow = projections.find((p) => p.age === targetEndAge) || projections[projections.length - 1];
  const finalPot = targetRow?.totalPot || 0;

  if (finalPot < targetLegacyBuffer - 10) {
    return { feasible: false, finalPot, projections };
  }

  return { feasible: true, finalPot, projections };
}

/**
 * Solves for the Maximized Sustainable Annual Spend (Die With Zero Solver)
 */
export function solveMaximizedSpend(options: SolveMaximizedSpendOptions): SolveMaximizedSpendResult {
  const cfg = options.profile.maximizedSpendConfig;

  const {
    profile,
    pots,
    coupleScope = options.coupleScope ?? cfg?.coupleScope ?? 'couple',
    targetEndAge = options.targetEndAge ?? cfg?.targetEndAge ?? profile.lifeExpectancyAge ?? 95,
    targetLegacyBuffer = options.targetLegacyBuffer ?? cfg?.targetLegacyBuffer ?? 0,
    spendingPattern = options.spendingPattern ?? cfg?.spendingPattern ?? 'uniform',
    annuityFloorMode = options.annuityFloorMode ?? cfg?.annuityFloorMode ?? 'none',
    annuityFloorIncomeTarget = options.annuityFloorIncomeTarget ?? cfg?.annuityFloorIncomeTarget ?? 15000,
    annuityFloorPercent = options.annuityFloorPercent ?? cfg?.annuityFloorPercent ?? 40,
    annuityFloorAge = options.annuityFloorAge ?? cfg?.annuityFloorAge ?? profile.annuityPurchaseAge ?? profile.targetRetirementAge ?? 60,
    annuityRatePercent = options.annuityRatePercent ?? cfg?.annuityRatePercent ?? profile.annuityRatePercent ?? 6.0,
    annuityType = options.annuityType ?? cfg?.annuityType ?? profile.annuityType ?? 'inflation_linked_single',
    annuityDurationOption = options.annuityDurationOption ?? cfg?.annuityDurationOption ?? profile.annuityDurationOption ?? 'lifetime',
    annuityDurationUntilAge = options.annuityDurationUntilAge ?? cfg?.annuityDurationUntilAge ?? profile.annuityDurationUntilAge ?? 75,
  } = options;

  const annuityFloorOpts: AnnuityFloorOptions = {
    annuityFloorMode,
    annuityFloorIncomeTarget,
    annuityFloorPercent,
    annuityFloorAge,
    annuityRatePercent,
    annuityType,
    annuityDurationOption,
    annuityDurationUntilAge,
  };

  const reinvestOpts: ReinvestExcessOptions = {
    reinvestExcessDrawdown: options.reinvestExcessDrawdown,
    actualSpendingTargetAnnual: options.actualSpendingTargetAnnual,
    reinvestDestinationPot: options.reinvestDestinationPot,
  };

  const { evalProfile, evalPots } = getScopeEvaluationInputs(profile, pots, coupleScope);

  const originalAnnualIncome = Math.round(getOriginalBaseIncome(profile));
  const retAge = profile.targetRetirementAge || 60;
  const pensionAccessAge = profile.protectedPensionAccessAge || 57;
  const clampedEndAge = Math.max(retAge + 1, Math.min(100, targetEndAge));

  let low = 0;
  // Calculate dynamic high ceiling based on total pots
  const totalPots = (evalPots.workplacePensionBalance || 0) +
    (evalPots.sippBalance || 0) +
    (evalPots.stocksAndSharesIsaBalance || 0) +
    (evalPots.cashIsaBalance || 0) +
    (evalPots.lisaBalance || 0) +
    (evalPots.giaBalance || 0) +
    (evalPots.cashSavingsBalance || 0) +
    (evalProfile.partnerPots ? (
      (evalProfile.partnerPots.workplacePensionBalance || 0) +
      (evalProfile.partnerPots.sippBalance || 0) +
      (evalProfile.partnerPots.stocksAndSharesIsaBalance || 0) +
      (evalProfile.partnerPots.cashIsaBalance || 0) +
      (evalProfile.partnerPots.lisaBalance || 0) +
      (evalProfile.partnerPots.giaBalance || 0) +
      (evalProfile.partnerPots.cashSavingsBalance || 0)
    ) : 0);

  let high = Math.max(2_000_000, totalPots * 2);
  let bestFeasibleIncome = low;
  let bestProjections: YearProjection[] = [];
  let bestFinalPot = 0;

  // Binary search over 28 iterations to find maximum sustainable target income based on portfolio capacity and scope
  for (let i = 0; i < 28; i++) {
    if (low > high) break;
    const mid = Math.floor((low + high) / 2);
    const candidateProfile = createCandidateProfile(
      evalProfile,
      mid,
      spendingPattern,
      evalPots,
      annuityFloorOpts,
      { reinvestExcessDrawdown: false }, // Explicitly disable reinvestment logic during binary search
      clampedEndAge,
      targetLegacyBuffer,
      coupleScope
    );
    const result = testFeasibility(candidateProfile, evalPots, clampedEndAge, targetLegacyBuffer);

    if (result.feasible) {
      bestFeasibleIncome = mid;
      bestProjections = result.projections;
      bestFinalPot = result.finalPot;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const bestCandidateProfile = createCandidateProfile(
    evalProfile,
    bestFeasibleIncome,
    spendingPattern,
    evalPots,
    annuityFloorOpts,
    reinvestOpts,
    clampedEndAge,
    targetLegacyBuffer,
    coupleScope
  );

  // If reinvest surplus is active, re-evaluate projections with reinvestment enabled
  if (reinvestOpts?.reinvestExcessDrawdown) {
    const finalResult = testFeasibility(bestCandidateProfile, evalPots, clampedEndAge, targetLegacyBuffer);
    bestProjections = finalResult.projections;
    bestFinalPot = finalResult.finalPot;
  }

  // Calculate extra lifetime spend across retirement years
  const origTax = calculateUKTax(profile, pots);
  const originalProjections = generateProjections(profile, pots, origTax);
  
  let origLifetimeIncome = 0;
  let maxLifetimeIncome = 0;

  for (let age = retAge; age <= clampedEndAge; age++) {
    const origRow = originalProjections.find((p) => p.age === age);
    const maxRow = bestProjections.find((p) => p.age === age);

    if (origRow) origLifetimeIncome += origRow.netRetirementIncome || 0;
    if (maxRow) maxLifetimeIncome += maxRow.netRetirementIncome || 0;
  }

  const extraLifetimeSpend = Math.round(Math.max(0, maxLifetimeIncome - origLifetimeIncome));
  const extraAnnualSpend = Math.round(bestFeasibleIncome - originalAnnualIncome);
  const boostPercentage = originalAnnualIncome > 0
    ? Math.round(((bestFeasibleIncome - originalAnnualIncome) / originalAnnualIncome) * 100)
    : 0;

  let phaseIncomes;
  if (spendingPattern === 'front_loaded') {
    phaseIncomes = {
      goGoIncome: Math.round(bestFeasibleIncome * 1.2),
      slowGoIncome: Math.round(bestFeasibleIncome),
      noGoIncome: Math.round(bestFeasibleIncome * 0.8),
    };
  }

  let bridgeAnnualIncome: number | undefined;
  const maxPhases = bestCandidateProfile.maximizedSpendConfig?.spendingPhases;
  if (retAge < pensionAccessAge && maxPhases?.enabled) {
    if (maxPhases.customRanges && maxPhases.customRanges.length > 0) {
      const bridgeRange = maxPhases.customRanges.find(r => r.startAge < pensionAccessAge);
      if (bridgeRange) {
        bridgeAnnualIncome = bridgeRange.annualTargetIncome;
      }
    }
  }

  let annuityFloorDetails: SolveMaximizedSpendResult['annuityFloorDetails'] = undefined;
  if (annuityFloorMode !== 'none') {
    const purchaseAge = bestCandidateProfile.annuityPurchaseAge || retAge;
    const purchaseRow = bestProjections.find((p) => p.age >= purchaseAge);
    const guaranteedAnnualIncome = Math.round(
      purchaseRow?.primaryAnnuityIncomeReceived || purchaseRow?.annuityIncomeReceived || 0
    );
    const pensionPotAllocated = Math.round(purchaseRow?.annuityCapitalAllocated || 0);
    const flexiDrawdownAnnualIncome = Math.max(0, Math.round(bestFeasibleIncome - guaranteedAnnualIncome));

    annuityFloorDetails = {
      mode: annuityFloorMode,
      guaranteedAnnualIncome,
      pensionPotAllocated,
      allocationPercent: bestCandidateProfile.annuityAllocationPercent || 0,
      annuityPurchaseAge: purchaseAge,
      annuityRatePercent: bestCandidateProfile.annuityRatePercent || 6.0,
      annuityType: bestCandidateProfile.annuityType || 'inflation_linked_single',
      annuityDurationOption: bestCandidateProfile.annuityDurationOption || 'lifetime',
      annuityDurationUntilAge: bestCandidateProfile.annuityDurationUntilAge || 75,
      flexiDrawdownAnnualIncome,
    };
  }

  return {
    maxAnnualIncome: bestFeasibleIncome,
    bridgeAnnualIncome,
    originalAnnualIncome,
    extraAnnualSpend,
    extraLifetimeSpend,
    targetEndAge: clampedEndAge,
    targetLegacyBuffer,
    finalPotAtTargetAge: Math.round(bestFinalPot),
    boostPercentage,
    bestCandidateProfile,
    projectionsWithMaxSpend: bestProjections,
    spendingPattern,
    coupleScope,
    phaseIncomes,
    annuityFloorDetails,
    reinvestExcessDetails: (() => {
      const isReinvest = Boolean(
        options.reinvestExcessDrawdown ||
        bestCandidateProfile.reinvestExcessDrawdown ||
        bestCandidateProfile.maximizedSpendConfig?.reinvestExcessDrawdown
      );
      if (!isReinvest) return undefined;
      const actualSpendingTargetAnnual =
        options.actualSpendingTargetAnnual ??
        bestCandidateProfile.actualSpendingTargetAnnual ??
        bestCandidateProfile.maximizedSpendConfig?.actualSpendingTargetAnnual ??
        originalAnnualIncome;
      const maxAnnualDrawdown = bestFeasibleIncome;
      const annualSurplusReinvested = Math.max(0, maxAnnualDrawdown - actualSpendingTargetAnnual);
      const reinvestDestinationPot =
        options.reinvestDestinationPot ||
        bestCandidateProfile.maximizedSpendConfig?.reinvestDestinationPot ||
        'isa';

      return {
        enabled: true,
        actualSpendingTargetAnnual,
        maxAnnualDrawdown,
        annualSurplusReinvested,
        reinvestDestinationPot,
      };
    })(),
  };
}
