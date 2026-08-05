import { UserProfile, InvestmentPots, YearProjection, SpendingPhasesConfig } from '../types';
import { generateProjections } from './projectionEngine';
import { calculateUKTax } from './ukTaxEngine';

export interface SolveMaximizedSpendOptions {
  profile: UserProfile;
  pots: InvestmentPots;
  targetEndAge?: number; // e.g. 95 (default)
  targetLegacyBuffer?: number; // e.g. 0 (Die with Zero)
  spendingPattern?: 'uniform' | 'proportional_phases' | 'front_loaded';
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
  phaseIncomes?: {
    goGoIncome?: number;
    slowGoIncome?: number;
    noGoIncome?: number;
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
 * Calculates candidate profile with a given target baseline income and pattern
 */
export function createCandidateProfile(
  profile: UserProfile,
  baselineIncome: number,
  pattern: 'uniform' | 'proportional_phases' | 'front_loaded',
  pots?: InvestmentPots
): UserProfile {
  const candidate = JSON.parse(JSON.stringify(profile)) as UserProfile;
  const roundedBaseline = Math.round(baselineIncome);

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

  candidate.maximizedSpendConfig = {
    enabled: true,
    targetAnnualIncome: roundedBaseline,
    spendingPattern: pattern,
    spendingPhases: maxPhases,
    baselineTargetAnnualIncome,
    baselineSpendingPhases,
  };

  // Explicitly overwrite the baseline profile values to ensure ALL components and PDF sections natively see the maximized spend data
  candidate.targetRetirementIncomeAnnual = roundedBaseline;
  candidate.spendingPhases = maxPhases;

  // Clamping bridge ranges is only done if pots are provided AND pattern is not uniform!
  if (pots && pattern !== 'uniform') {
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

      for (let i = 0; i < 16; i++) {
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

    const testProfile = JSON.parse(JSON.stringify(cloned)) as UserProfile;
    testProfile.maximizedSpendConfig!.spendingPhases = {
      enabled: true,
      customRanges: [
        { id: 'bridge-auto', name: `Pre-Pension Bridge (Ages ${retAge}-${pensionAccessAge - 1})`, startAge: retAge, endAge: pensionAccessAge - 1, annualTargetIncome: origTarget },
        { id: 'post-auto', name: `Pension Access (Ages ${pensionAccessAge}+)`, startAge: pensionAccessAge, endAge: 100, annualTargetIncome: origTarget },
      ],
    };

    const bridgeRange = testProfile.maximizedSpendConfig!.spendingPhases.customRanges![0];

    for (let i = 0; i < 16; i++) {
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
      customRanges: [
        { id: 'bridge-auto', name: `Pre-Pension Bridge (Ages ${retAge}-${pensionAccessAge - 1})`, startAge: retAge, endAge: pensionAccessAge - 1, annualTargetIncome: bestB },
        { id: 'post-auto', name: `Pension Access (Ages ${pensionAccessAge}+)`, startAge: pensionAccessAge, endAge: 100, annualTargetIncome: origTarget },
      ],
    };
  }

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
  const {
    profile,
    pots,
    targetEndAge = profile.lifeExpectancyAge || 95,
    targetLegacyBuffer = 0,
    spendingPattern = 'uniform',
  } = options;

  const originalAnnualIncome = Math.round(getOriginalBaseIncome(profile));
  const retAge = profile.targetRetirementAge || 60;
  const pensionAccessAge = profile.protectedPensionAccessAge || 57;
  const clampedEndAge = Math.max(retAge + 1, Math.min(100, targetEndAge));

  let low = 0;
  // Calculate dynamic high ceiling based on total pots
  const totalPots = (pots.workplacePensionBalance || 0) +
    (pots.sippBalance || 0) +
    (pots.stocksAndSharesIsaBalance || 0) +
    (pots.cashIsaBalance || 0) +
    (pots.lisaBalance || 0) +
    (pots.giaBalance || 0) +
    (pots.cashSavingsBalance || 0);

  let high = Math.max(2_000_000, totalPots * 2);
  let bestFeasibleIncome = low;
  let bestCandidateProfile: UserProfile = createCandidateProfile(profile, low, spendingPattern, pots);
  let bestProjections: YearProjection[] = [];
  let bestFinalPot = 0;

  // Binary search over 28 iterations
  for (let i = 0; i < 28; i++) {
    const mid = Math.floor((low + high) / 2);
    const candidateProfile = createCandidateProfile(profile, mid, spendingPattern, pots);
    const result = testFeasibility(candidateProfile, pots, clampedEndAge, targetLegacyBuffer);

    if (result.feasible) {
      bestFeasibleIncome = mid;
      bestCandidateProfile = candidateProfile;
      bestProjections = result.projections;
      bestFinalPot = result.finalPot;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
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
    phaseIncomes,
  };
}
