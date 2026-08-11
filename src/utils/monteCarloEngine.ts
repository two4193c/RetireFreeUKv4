import { UserProfile, InvestmentPots, TaxCalculationResult } from '../types';
import { DEFAULT_PARTNER_POTS, DEFAULT_POTS, sanitizePots } from './defaultData';
import { getPensionAccessAge, getPartnerPensionAccessAge, getLsaLimit, getPartnerLsaLimit, getLumpSumTakeAge, calculateUKTax, calculatePartnerUKTax, allocateLumpSumToPots } from './ukTaxEngine';
import { getTargetIncomeForAge, getActualSpendingTargetForAge } from './projectionEngine';
import { SCOT_INTERMEDIATE_THRESHOLD, RUK_BASIC_THRESHOLD, SCOT_HIGHER_THRESHOLD, RUK_ADDITIONAL_THRESHOLD } from '../config/ukTaxRates';
import { getEffectiveAccumulationReturn, getEffectiveDecumulationReturn } from './assetAllocation';

export type MarketScenario = 'standard' | 'stressed' | 'early_crash';

export interface MonteCarloParams {
  numSimulations?: number; // Default 500
  accumulationVolatility?: number; // e.g. 12% (std dev)
  decumulationVolatility?: number; // e.g. 8% (std dev)
  maxAge?: number; // e.g. 95
  marketScenario?: MarketScenario;
  stressedReturnDropPercent?: number; // e.g. 2.0 (% p.a. drop)
  crashDepthPercent?: number; // e.g. 30 (% drop)
  crashStartAge?: number; // e.g. targetRetirementAge
  crashDurationYears?: number; // e.g. 2
  crashYearDropsPercent?: number[]; // e.g. [30, 15] for Year 1 -30%, Year 2 -15%
  useCashBuffer?: boolean;
  cashBufferYears?: number;
}

export interface CashBufferYearDetail {
  crashYearIndex: number;
  age: number;
  calendarYear: number;
  targetNetIncome: number;
  statePension: number;
  dbIncome: number;
  fixedIncome: number;
  totalGuaranteedIncome: number;
  netCashBufferRequired: number;
  grossPensionAvoided: number;
  isCoveredByExistingCash: boolean;
}

export interface CashBufferSummary {
  useCashBuffer: boolean;
  cashBufferYears: number;
  crashStartAge: number;
  totalNetCashBufferRequired: number;
  totalGrossPensionAvoided: number;
  existingCashAvailable: number;
  shortfallOrSurplus: number;
  isFullyCovered: boolean;
  yearlyDetails: CashBufferYearDetail[];
}

export function calculateCashBufferRequiredDetails(
  profile: UserProfile,
  pots: InvestmentPots,
  crashStartAge: number,
  cashBufferYears: number,
  projectedCashAtCrashStart?: number
): CashBufferSummary {
  const safeCurrentAge = Math.max(18, Math.min(100, Number(profile.currentAge) || 30));
  const currentYear = new Date().getFullYear();
  const inflation = (profile.expectedInflationRate || 2.5) / 100;
  
  const sanitizedPots = sanitizePots(pots);
  const sanitizedPartnerPots = sanitizePots(profile.partnerPots || DEFAULT_PARTNER_POTS);

  const startingCashToday = (sanitizedPots.cashSavingsBalance || 0) + (sanitizedPots.cashIsaBalance || 0) +
    (profile.isCouplePlanning ? ((sanitizedPartnerPots.cashSavingsBalance || 0) + (sanitizedPartnerPots.cashIsaBalance || 0)) : 0);

  let existingCashAvailable = startingCashToday;

  if (projectedCashAtCrashStart !== undefined && projectedCashAtCrashStart >= 0) {
    existingCashAvailable = projectedCashAtCrashStart;
  } else if (crashStartAge > safeCurrentAge) {
    const yearsToCrash = crashStartAge - safeCurrentAge;
    const primaryTax = calculateUKTax(profile, pots, false, safeCurrentAge);
    const partnerTax = profile.isCouplePlanning ? calculatePartnerUKTax(profile, profile.partnerPots || DEFAULT_PARTNER_POTS, profile.partnerCurrentAge ?? safeCurrentAge) : null;
    
    const annualCashContribPrimary = (primaryTax.regularCashIsaContributionsAnnual ?? 0) + ((pots.cashSavingsMonthlyContribution || 0) * 12);
    const annualCashContribPartner = partnerTax ? ((partnerTax.regularCashIsaContributionsAnnual ?? 0) + ((profile.partnerPots?.cashSavingsMonthlyContribution || 0) * 12)) : 0;
    const totalAnnualCashContrib = annualCashContribPrimary + annualCashContribPartner;

    let projCash = startingCashToday;
    const cashGrowthRate = 0.02;

    for (let y = 0; y < yearsToCrash; y++) {
      const evalAge = safeCurrentAge + y;
      const infFactor = Math.pow(1 + inflation, y);
      projCash = projCash * (1 + cashGrowthRate);
      if (evalAge < (profile.targetRetirementAge || 60)) {
        projCash += totalAnnualCashContrib * infFactor;
      }
    }
    existingCashAvailable = projCash;
  }

  const yearlyDetails: CashBufferYearDetail[] = [];
  let totalNetCashBufferRequired = 0;
  let totalGrossPensionAvoided = 0;
  let cumulativeCashUsed = 0;

  for (let i = 0; i < cashBufferYears; i++) {
    const age = crashStartAge + i;
    const yearOffset = age - safeCurrentAge;
    const calendarYear = currentYear + yearOffset;
    const inflationFactor = Math.pow(1 + inflation, Math.max(0, yearOffset));

    let incomeIncreaseFactor = inflationFactor;
    if (profile.incomeIncreaseMode === 'custom') {
      const customRate = (profile.customIncomeIncreasePercent ?? 0) / 100;
      incomeIncreaseFactor = Math.pow(1 + customRate, Math.max(0, yearOffset));
    }

    const baseIncomeTarget = getTargetIncomeForAge(profile, age);
    const targetNetIncome = baseIncomeTarget * incomeIncreaseFactor;

    // Guaranteed State Pension
    let statePension = 0;
    if ((profile.includeStatePension ?? true) && age >= (profile.statePensionAge || 67)) {
      const primaryYears = profile.qualifyingYears ?? 35;
      if (primaryYears >= 10) {
        const primaryTripleLock = profile.enableTripleLock ?? true;
        const primaryIndexFactor = primaryTripleLock ? inflationFactor : 1;
        const primaryFull = profile.fullStatePensionAmount ?? 12547.60;
        const primaryAnnualCalculated = Math.round((primaryYears / 35) * primaryFull * 100) / 100;
        const primaryBaseAmount = profile.statePensionAmountAnnual ?? primaryAnnualCalculated;
        statePension += primaryBaseAmount * primaryIndexFactor;
      }
    }
    if (profile.isCouplePlanning && (profile.partnerIncludeStatePension ?? true)) {
      const partnerAge = age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge);
      if (partnerAge >= (profile.partnerStatePensionAge || 67)) {
        const partnerYears = profile.partnerQualifyingYears ?? 35;
        if (partnerYears >= 10) {
          const partnerTripleLock = profile.partnerEnableTripleLock ?? true;
          const partnerIndexFactor = partnerTripleLock ? inflationFactor : 1;
          const partnerFull = profile.partnerFullStatePensionAmount ?? 12547.60;
          const partnerAnnualCalculated = Math.round((partnerYears / 35) * partnerFull * 100) / 100;
          const partnerBaseAmount = profile.partnerStatePensionAmountAnnual ?? partnerAnnualCalculated;
          statePension += partnerBaseAmount * partnerIndexFactor;
        }
      }
    }

    // Defined Benefit Pensions
    let dbIncome = 0;
    (profile.dbPensions || []).filter((p) => p.enabled).forEach((db) => {
      const isPartner = db.owner === 'partner';
      const evalAge = isPartner ? age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge) : age;
      if (evalAge >= db.startAge) {
        dbIncome += db.inflationLinked ? db.annualIncome * inflationFactor : db.annualIncome;
      }
    });

    // Fixed Income Streams
    let fixedIncome = 0;
    (profile.fixedIncomeStreams || []).filter((s) => s.enabled).forEach((stream) => {
      const isPartner = stream.owner === 'partner';
      const evalAge = isPartner ? age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge) : age;
      if (evalAge >= stream.startAge && (!stream.endAge || evalAge <= stream.endAge)) {
        fixedIncome += stream.inflationLinked ? stream.annualAmount * inflationFactor : stream.annualAmount;
      }
    });

    const totalGuaranteedIncome = statePension + dbIncome + fixedIncome;
    const netCashBufferRequired = Math.max(0, targetNetIncome - totalGuaranteedIncome);

    // Approximate gross pension needed if drawn from pension
    const grossPensionAvoided = netCashBufferRequired > 0 ? (netCashBufferRequired / 0.85) : 0;

    cumulativeCashUsed += netCashBufferRequired;
    const isCoveredByExistingCash = existingCashAvailable >= cumulativeCashUsed;

    yearlyDetails.push({
      crashYearIndex: i + 1,
      age,
      calendarYear,
      targetNetIncome: Math.round(targetNetIncome),
      statePension: Math.round(statePension),
      dbIncome: Math.round(dbIncome),
      fixedIncome: Math.round(fixedIncome),
      totalGuaranteedIncome: Math.round(totalGuaranteedIncome),
      netCashBufferRequired: Math.round(netCashBufferRequired),
      grossPensionAvoided: Math.round(grossPensionAvoided),
      isCoveredByExistingCash,
    });

    totalNetCashBufferRequired += netCashBufferRequired;
    totalGrossPensionAvoided += grossPensionAvoided;
  }

  const shortfallOrSurplus = existingCashAvailable - totalNetCashBufferRequired;

  return {
    useCashBuffer: true,
    cashBufferYears,
    crashStartAge,
    totalNetCashBufferRequired: Math.round(totalNetCashBufferRequired),
    totalGrossPensionAvoided: Math.round(totalGrossPensionAvoided),
    existingCashAvailable: Math.round(existingCashAvailable),
    shortfallOrSurplus: Math.round(shortfallOrSurplus),
    isFullyCovered: shortfallOrSurplus >= 0,
    yearlyDetails,
  };
}

export interface AgePercentiles {
  age: number;
  year: number;
  isRetired: boolean;
  p10TotalPot: number;
  p25TotalPot: number;
  p50TotalPot: number; // Median
  p75TotalPot: number;
  p90TotalPot: number;
  p50PensionPot: number;
  p50IsaPot: number;
  p50CashGiaPot: number;
  survivalRate: number; // % of runs with pot > 0 at this age AND income met
  incomeSurvivalRate: number; // % of runs where income is met (even if pot is depleted)
}

export interface MonteCarloResult {
  params: Required<MonteCarloParams>;
  agePercentiles: AgePercentiles[];
  percentiles: (AgePercentiles & {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  })[];
  successRateTargetAge: number; // % runs lasting to maxAge or target age (e.g. 85)
  successRateAge80: number;
  successRateAge85: number;
  incomeSuccessRateAge85: number; // % of runs with income needs met at age 85
  successRateAge90: number;
  successRate: number; // overall success rate
  medianRetirementPot: number;
  p10RetirementPot: number;
  p90RetirementPot: number;
  medianEndPot: number;
  p10EndPot: number;
  p90EndPot: number;
  medianFinalWealth: number;
  p10FinalWealth: number;
  medianDepletionAge?: number;
}

// Box-Muller transform for standard normal random variable N(0,1)
function randomNormal(mean = 0, stdDev = 1): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
}

// Quick percentile calculation from sorted array
function getPercentile(sortedArr: number[], percentile: number): number {
  if (sortedArr.length === 0) return 0;
  const index = (percentile / 100) * (sortedArr.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (upper >= sortedArr.length) return sortedArr[sortedArr.length - 1];
  return sortedArr[lower] * (1 - weight) + sortedArr[upper] * weight;
}

function sampleLogNormalReturn(meanReturn: number, volatility: number): number {
  const z = randomNormal(0, 1);
  const drift = Math.log(1 + meanReturn) - 0.5 * volatility * volatility;
  return Math.exp(drift + volatility * z) - 1;
}

export function runMonteCarloSimulation(
  profile: UserProfile,
  pots: InvestmentPots,
  taxResult: TaxCalculationResult,
  customParams?: MonteCarloParams
): MonteCarloResult {
  const numSimulations = Math.max(10, Math.min(2000, Math.floor(Number(customParams?.numSimulations) || 500)));
  const accumulationVolatility = (customParams?.accumulationVolatility ?? 12.0) / 100;
  const decumulationVolatility = (customParams?.decumulationVolatility ?? 8.0) / 100;
  
  const safeCurrentAge = Math.max(18, Math.min(100, Number(profile.currentAge) || 30));
  const maxAgeInput = Math.floor(Number(customParams?.maxAge) || 95);
  const effectiveMaxAge = Math.max(safeCurrentAge + 1, maxAgeInput);

  const marketScenario = customParams?.marketScenario || 'standard';

  const inflation = (profile.expectedInflationRate || 2.5) / 100;
  let meanAccumReturn = getEffectiveAccumulationReturn(profile.expectedInvestmentReturn || 6.0, profile.assetAllocationSplit, profile.investmentFees) / 100;
  let meanDecumReturn = getEffectiveDecumulationReturn(profile.postRetirementReturn || 4.5, profile.assetAllocationSplit, profile.investmentFees) / 100;

  const stressedReturnDrop = (customParams?.stressedReturnDropPercent ?? 2.0) / 100;
  const crashStartAge = customParams?.crashStartAge ?? profile.targetRetirementAge;
  const crashDuration = Math.max(1, customParams?.crashDurationYears ?? 2);

  const getCrashDropForYearIndex = (yearIdx: number): number => {
    if (customParams?.crashYearDropsPercent && customParams.crashYearDropsPercent[yearIdx] !== undefined) {
      return customParams.crashYearDropsPercent[yearIdx] / 100;
    }
    if (yearIdx === 0) return (customParams?.crashDepthPercent ?? 30.0) / 100;
    if (yearIdx === 1) return 0.15;
    return 0.10;
  };

  if (marketScenario === 'stressed') {
    meanAccumReturn -= stressedReturnDrop;
    meanDecumReturn -= stressedReturnDrop;
  }

  const pensionAccessAge = getPensionAccessAge(profile);
  const partnerPensionAccessAge = profile.isCouplePlanning ? getPartnerPensionAccessAge(profile) : 57;
  const lumpSumTakeAge = getLumpSumTakeAge(profile);
  const maxLsa = getLsaLimit(profile);
  const partnerMaxLsa = profile.isCouplePlanning ? getPartnerLsaLimit(profile) : maxLsa;

  const cleanPots = sanitizePots(pots, DEFAULT_POTS);
  const partnerPots = sanitizePots(
    profile.partnerPots,
    {
      ...DEFAULT_PARTNER_POTS,
      workplacePensionBalance: profile.partnerWorkplacePensionBalance || DEFAULT_PARTNER_POTS.workplacePensionBalance,
      sippBalance: profile.partnerSippBalance || DEFAULT_PARTNER_POTS.sippBalance,
      stocksAndSharesIsaBalance: profile.partnerIsaBalance || DEFAULT_PARTNER_POTS.stocksAndSharesIsaBalance,
    }
  );

  const partnerTaxResult = profile.isCouplePlanning ? calculatePartnerUKTax(profile, partnerPots) : null;

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

  // Annual contribution totals (regular ongoing recurring contributions; one-offs and transfers added separately)
  const annualPensionContribution = taxResult.regularPensionContributionsAnnual ?? taxResult.totalPensionContributionsAnnual;
  const annualIsaContribution = (taxResult.regularIsaContributionsAnnual ?? taxResult.totalIsaContributionsAnnual) + taxResult.lisaGovernmentBonusAnnual;
  const annualCashGiaContribution = taxResult.regularCashGiaContributionsAnnual ?? taxResult.totalCashGiaContributionsAnnual ?? ((pots.giaMonthlyContribution + pots.cashSavingsMonthlyContribution) * 12);

  const partnerAnnualPensionContrib = partnerTaxResult
    ? (partnerTaxResult.regularPensionContributionsAnnual ?? partnerTaxResult.totalPensionContributionsAnnual)
    : 0;
  const partnerAnnualIsaContrib = partnerTaxResult
    ? ((partnerTaxResult.regularIsaContributionsAnnual ?? partnerTaxResult.totalIsaContributionsAnnual) + partnerTaxResult.lisaGovernmentBonusAnnual)
    : 0;
  const partnerAnnualCashGiaContrib = partnerTaxResult
    ? (partnerTaxResult.regularCashGiaContributionsAnnual ?? partnerTaxResult.totalCashGiaContributionsAnnual ?? ((partnerPots.giaMonthlyContribution + partnerPots.cashSavingsMonthlyContribution) * 12))
    : 0;

  const numYears = Math.max(1, effectiveMaxAge - safeCurrentAge + 1);

  // Matrix to hold results: simulations[simIndex][yearIndex]
  const simTotalPots: number[][] = Array.from({ length: numSimulations }, () => new Array(numYears).fill(0));
  const simPensionPots: number[][] = Array.from({ length: numSimulations }, () => new Array(numYears).fill(0));
  const simIsaPots: number[][] = Array.from({ length: numSimulations }, () => new Array(numYears).fill(0));
  const simCashGiaPots: number[][] = Array.from({ length: numSimulations }, () => new Array(numYears).fill(0));
  const simRemainingNeeded: number[][] = Array.from({ length: numSimulations }, () => new Array(numYears).fill(0));
  
  const depletionAges: number[] = [];

  const initialGia = pots.giaBalance + (profile.isCouplePlanning ? partnerPots.giaBalance : 0);
  const initialCash = pots.cashSavingsBalance + pots.cashIsaBalance + (profile.isCouplePlanning ? (partnerPots.cashSavingsBalance + partnerPots.cashIsaBalance) : 0);
  const totalInitial = initialGia + initialCash;
  const giaRatio = totalInitial > 0 ? initialGia / totalInitial : 0.5;
  const accCashGiaMult = giaRatio * 0.90 + (1 - giaRatio) * 0.80;
  const decumCashGiaMult = giaRatio * 0.95 + (1 - giaRatio) * 0.85;
  
  for (let sim = 0; sim < numSimulations; sim++) {
    let primaryPensionPot = pots.workplacePensionBalance + pots.sippBalance;
    let partnerPensionPot = profile.isCouplePlanning ? (partnerPots.workplacePensionBalance + partnerPots.sippBalance) : 0;
    let primaryIsaPot = pots.stocksAndSharesIsaBalance + pots.lisaBalance;
    let partnerIsaPot = profile.isCouplePlanning ? (partnerPots.stocksAndSharesIsaBalance + partnerPots.lisaBalance) : 0;
    let primaryCashGiaPot = pots.giaBalance + pots.cashSavingsBalance + pots.cashIsaBalance;
    let partnerCashGiaPot = profile.isCouplePlanning ? (partnerPots.giaBalance + partnerPots.cashSavingsBalance + partnerPots.cashIsaBalance) : 0;

    let pensionPot = primaryPensionPot + partnerPensionPot;
    let isaPot = primaryIsaPot + partnerIsaPot;
    let cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;

    let annuityPurchased = false;
    let partnerAnnuityPurchased = false;
    let pclsTaken = false;
    let partnerPclsTaken = false;
    let primaryCumulativeTaxFreeDrawn = 0;
    let partnerCumulativeTaxFreeDrawn = 0;
    let depletedAtAge: number | null = null;
    let partnerDead = false;

    const mcAnnuityStreams: Array<{
      baseNominal: number;
      isInflationLinked: boolean;
      fixedEscalationRate?: number;
      durationOption: string;
      durationUntilAge: number;
      owner: 'primary' | 'partner';
      purchaseInflationFactor: number;
      purchaseYearOffset: number;
    }> = [];

    for (let yr = 0; yr < numYears; yr++) {
      const age = safeCurrentAge + yr;
      const partnerAge = age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge);
      const isRetired = age >= profile.targetRetirementAge;
      const canAccessPension = age >= pensionAccessAge;
      const partnerCanAccessPension = profile.isCouplePlanning && !partnerDead && partnerAge >= partnerPensionAccessAge;
      const inflationFactor = Math.pow(1 + inflation, yr);

      const deductProRata = (potType, amount) => {
        if (potType === 'pension' && amount > 0) {
          const totalAvailPension = (canAccessPension ? primaryPensionPot : 0) + (partnerCanAccessPension ? partnerPensionPot : 0);
          const priRatio = (canAccessPension && totalAvailPension > 0) ? primaryPensionPot / totalAvailPension : (canAccessPension ? 1 : 0);
          const primaryDraw = amount * priRatio;
          const partnerDraw = amount * (1 - priRatio);
          primaryPensionPot = Math.max(0, primaryPensionPot - primaryDraw);
          partnerPensionPot = Math.max(0, partnerPensionPot - partnerDraw);
          pensionPot = primaryPensionPot + partnerPensionPot;
        } else if (potType === 'isa') {
          const priRatio = primaryIsaPot / (isaPot || 1);
          primaryIsaPot = Math.max(0, primaryIsaPot - amount * priRatio);
          partnerIsaPot = Math.max(0, partnerIsaPot - amount * (1 - priRatio));
          isaPot = primaryIsaPot + partnerIsaPot;
        } else if (potType === 'cashGia') {
          const priRatio = primaryCashGiaPot / (cashGiaPot || 1);
          primaryCashGiaPot = Math.max(0, primaryCashGiaPot - amount * priRatio);
          partnerCashGiaPot = Math.max(0, partnerCashGiaPot - amount * (1 - priRatio));
          cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
        }
      };

      const deductExactPension = (primaryDraw: number, partnerDraw: number) => {
        primaryPensionPot = Math.max(0, primaryPensionPot - primaryDraw);
        partnerPensionPot = Math.max(0, partnerPensionPot - partnerDraw);
        pensionPot = primaryPensionPot + partnerPensionPot;
      };
      const addProRata = (potType, amount, isPartner = false) => {
        if (potType === 'pension') {
          if (isPartner) partnerPensionPot += amount; else primaryPensionPot += amount;
          pensionPot = primaryPensionPot + partnerPensionPot;
        } else if (potType === 'isa') {
          if (isPartner) partnerIsaPot += amount; else primaryIsaPot += amount;
          isaPot = primaryIsaPot + partnerIsaPot;
        } else if (potType === 'cashGia') {
          if (isPartner) partnerCashGiaPot += amount; else primaryCashGiaPot += amount;
          cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
        }
      };
      const growPots = (pensionReturn, isaReturn, cashGiaReturn) => {
        primaryPensionPot = Math.max(0, primaryPensionPot * (1 + pensionReturn));
        partnerPensionPot = Math.max(0, partnerPensionPot * (1 + pensionReturn));
        pensionPot = primaryPensionPot + partnerPensionPot;
        primaryIsaPot = Math.max(0, primaryIsaPot * (1 + isaReturn));
        partnerIsaPot = Math.max(0, partnerIsaPot * (1 + isaReturn));
        isaPot = primaryIsaPot + partnerIsaPot;
        primaryCashGiaPot = Math.max(0, primaryCashGiaPot * (1 + cashGiaReturn));
        partnerCashGiaPot = Math.max(0, partnerCashGiaPot * (1 + cashGiaReturn));
        cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
      };


      // Upfront Tax-Free Lump Sum (PCLS) extraction - Primary
      if (
        profile.takeLumpSumAtStart &&
        !pclsTaken &&
        age >= lumpSumTakeAge &&
        canAccessPension &&
        primaryPensionPot > 0 &&
        !annuityPurchased &&
        (profile.pclsLumpSumPercent ?? 25) > 0
      ) {
        const lumpSumPercent = Math.min(100, profile.pclsLumpSumPercent ?? 25) / 100;
        const pclsAmount = Math.min(primaryPensionPot * lumpSumPercent, maxLsa);
        primaryPensionPot -= pclsAmount;
        pensionPot = primaryPensionPot + partnerPensionPot;
        const alloc = allocateLumpSumToPots(pclsAmount, profile.lumpSumTargetPot, profile.lumpSumSplits);
        primaryIsaPot += alloc.toIsa;
        primaryCashGiaPot += alloc.toCashGia;
        pclsTaken = true;
        primaryCumulativeTaxFreeDrawn += pclsAmount;
      }

      // Upfront Tax-Free Lump Sum (PCLS) extraction - Partner
      if (
        profile.isCouplePlanning &&
        profile.partnerTakeLumpSumAtStart &&
        !partnerDead && !partnerPclsTaken &&
        partnerAge >= lumpSumTakeAge &&
        partnerCanAccessPension &&
        partnerPensionPot > 0 &&
        (profile.partnerPclsLumpSumPercent ?? 25) > 0
      ) {
        const lumpSumPercent = Math.min(100, profile.partnerPclsLumpSumPercent ?? 25) / 100;
        const partnerPclsAmount = Math.min(partnerPensionPot * lumpSumPercent, partnerMaxLsa);
        partnerPensionPot -= partnerPclsAmount;
        pensionPot = primaryPensionPot + partnerPensionPot;
        const alloc = allocateLumpSumToPots(partnerPclsAmount, profile.partnerLumpSumTargetPot || profile.lumpSumTargetPot, profile.partnerLumpSumSplits || profile.lumpSumSplits);
        partnerIsaPot += alloc.toIsa;
        partnerCashGiaPot += alloc.toCashGia;
        partnerPclsTaken = true;
        partnerCumulativeTaxFreeDrawn += partnerPclsAmount;
      }



      // Defined Benefit (DB) pension calculations
      const activeDbPensions = (profile.dbPensions || []).filter((p) => p.enabled);
      let primaryDbIncomeThisYear = 0;
      let partnerDbIncomeThisYear = 0;

      activeDbPensions.forEach((db) => {
        const isPartner = db.owner === 'partner';
        if (isPartner && (!profile.isCouplePlanning || partnerDead)) return;

        const evalAge = isPartner
          ? partnerAge
          : age;

        if (evalAge >= db.startAge) {
          const dbIncome = db.inflationLinked
            ? db.annualIncome * inflationFactor
            : db.annualIncome;
          if (isPartner) {
            partnerDbIncomeThisYear += dbIncome;
          } else {
            primaryDbIncomeThisYear += dbIncome;
          }
        }
        if (evalAge === db.startAge && db.taxFreeLumpSum > 0) {
          const lumpSumInflated = db.taxFreeLumpSum * inflationFactor;
          const target = db.targetPot || 'cash_savings';
          if (target !== 'spend_clear_debt') {
            if (target === 'stocks_and_shares_isa' || target === 'cash_isa' || target === 'lisa') {
              addProRata("isa", lumpSumInflated, isPartner);
            } else {
              addProRata("cashGia", lumpSumInflated, isPartner);
            }
          }
        }
      });

      // Process One-Off Gross Lump Sum Contributions for this simulation year
      const simCalendarYear = new Date().getFullYear() + yr;
      const activeOneOffs = (profile.oneOffContributions || []).filter((c) => c.enabled && c.frequency !== 'regular_monthly');

      activeOneOffs.forEach((contrib) => {
        const isPartner = contrib.owner === 'partner';
        if (isPartner && !profile.isCouplePlanning) return;

        let contribYear: number | undefined;
        if (contrib.date) {
          contribYear = parseInt(contrib.date.split('-')[0], 10);
        }

        if (contribYear !== undefined && !isNaN(contribYear) && contribYear === simCalendarYear) {
          const gross = contrib.grossAmount || 0;
          if (gross > 0) {
            if (contrib.targetPot === 'workplace_pension') {
              addProRata("pension", gross, isPartner);
            } else if (contrib.targetPot === 'sipp') {
              const sippGross = contrib.sippContributionType === 'gross' ? gross : gross * 1.25;
              addProRata("pension", sippGross, isPartner);
            } else if (contrib.targetPot === 'stocks_and_shares_isa') {
              addProRata("isa", gross, isPartner);
            } else if (contrib.targetPot === 'lisa') {
              const lisaBonus = Math.min(gross, 4000) * 0.25;
              addProRata("isa", gross + lisaBonus, isPartner);
            } else if (contrib.targetPot === 'gia' || contrib.targetPot === 'cash_savings' || contrib.targetPot === 'cash_isa') {
              addProRata("cashGia", gross, isPartner);
            }
          }
        }
      });

      // Process Pot Transfers for this simulation year
      const activeTransfers = (profile.potTransfers || []).filter((t) => t.enabled);
      activeTransfers.forEach((transfer) => {
        const isSrcPartner = (transfer.owner || 'primary') === 'partner';
        const isDstPartner = (transfer.destinationOwner || transfer.owner || 'primary') === 'partner';
        if ((isSrcPartner || isDstPartner) && !profile.isCouplePlanning) return;

        let match = false;
        if (transfer.transferDate) {
          const transferYear = parseInt(transfer.transferDate.split('-')[0], 10);
          if (!isNaN(transferYear) && transferYear === simCalendarYear) {
            match = true;
          }
        } else if (transfer.transferAge !== undefined && transfer.transferAge > 0) {
          const evalAge = isSrcPartner ? partnerAge : age;
          if (evalAge === transfer.transferAge) {
            match = true;
          }
        }

        if (match) {
          const srcIsPension = transfer.sourcePot === 'workplace_pension' || transfer.sourcePot === 'sipp';
          const srcIsIsa = transfer.sourcePot === 'stocks_and_shares_isa' || transfer.sourcePot === 'lisa';
          const srcIsGiaCash = transfer.sourcePot === 'gia' || transfer.sourcePot === 'cash_savings' || transfer.sourcePot === 'cash_isa';

          let availableSrc = 0;
          if (isSrcPartner) {
            availableSrc = srcIsPension ? partnerPensionPot : srcIsIsa ? partnerIsaPot : srcIsGiaCash ? partnerCashGiaPot : 0;
          } else {
            availableSrc = srcIsPension ? primaryPensionPot : srcIsIsa ? primaryIsaPot : srcIsGiaCash ? primaryCashGiaPot : 0;
          }
          const actualTransfer = Math.min(transfer.amount || 0, Math.max(0, availableSrc));

          if (actualTransfer > 0) {
            if (isSrcPartner) {
              if (srcIsPension) partnerPensionPot = Math.max(0, partnerPensionPot - actualTransfer);
              else if (srcIsIsa) partnerIsaPot = Math.max(0, partnerIsaPot - actualTransfer);
              else if (srcIsGiaCash) partnerCashGiaPot = Math.max(0, partnerCashGiaPot - actualTransfer);
            } else {
              if (srcIsPension) primaryPensionPot = Math.max(0, primaryPensionPot - actualTransfer);
              else if (srcIsIsa) primaryIsaPot = Math.max(0, primaryIsaPot - actualTransfer);
              else if (srcIsGiaCash) primaryCashGiaPot = Math.max(0, primaryCashGiaPot - actualTransfer);
            }
            pensionPot = primaryPensionPot + partnerPensionPot;
            isaPot = primaryIsaPot + partnerIsaPot;
            cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;

            const dstIsSipp = transfer.destinationPot === 'sipp';
            const dstIsWorkplace = transfer.destinationPot === 'workplace_pension';
            const dstIsPension = dstIsSipp || dstIsWorkplace;
            const dstIsIsa = transfer.destinationPot === 'stocks_and_shares_isa';
            const dstIsLisa = transfer.destinationPot === 'lisa';
            const dstIsGiaCash = transfer.destinationPot === 'gia' || transfer.destinationPot === 'cash_savings' || transfer.destinationPot === 'cash_isa';

            let addedAmount = actualTransfer;
            if (dstIsSipp) addedAmount = actualTransfer * 1.25;
            else if (dstIsLisa) addedAmount = actualTransfer + Math.min(actualTransfer, 4000) * 0.25;

            if (dstIsPension) addProRata("pension", addedAmount, isDstPartner);
            else if (dstIsIsa || dstIsLisa) addProRata("isa", addedAmount, isDstPartner);
            else if (dstIsGiaCash) addProRata("cashGia", addedAmount, isDstPartner);
          }
        }
      });

      // Fixed Income Streams (Taxable & Tax-Free e.g. PIP)
      const activeFixedIncomeStreams = (profile.fixedIncomeStreams || []).filter((s) => s.enabled);
      let primaryTaxableFixedIncomeThisYr = 0;
      let partnerTaxableFixedIncomeThisYr = 0;
      let primaryTaxFreeFixedIncomeThisYr = 0;
      let partnerTaxFreeFixedIncomeThisYr = 0;

      activeFixedIncomeStreams.forEach((stream) => {
        const isPartner = stream.owner === 'partner';
        if (isPartner && (!profile.isCouplePlanning || partnerDead)) return;

        const evalAge = isPartner
          ? partnerAge
          : age;

        if (evalAge >= stream.startAge && (!stream.endAge || evalAge <= stream.endAge)) {
          const amount = stream.inflationLinked
            ? stream.annualAmount * inflationFactor
            : stream.annualAmount;
          if (stream.type === 'taxable') {
            if (isPartner) partnerTaxableFixedIncomeThisYr += amount;
            else primaryTaxableFixedIncomeThisYr += amount;
          } else {
            if (isPartner) partnerTaxFreeFixedIncomeThisYr += amount;
            else primaryTaxFreeFixedIncomeThisYr += amount;
          }
        }
      });

      let remainingNeeded = 0;

      const useCashBuf = customParams?.useCashBuffer ?? false;
      const cashBufYears = Math.max(1, customParams?.cashBufferYears ?? crashDuration);

      // If Cash Buffer strategy is enabled, ensure required buffer is ring-fenced in cash at crash start age
      if (useCashBuf && marketScenario === 'early_crash' && age === crashStartAge) {
        const bufSummary = calculateCashBufferRequiredDetails(profile, pots, crashStartAge, cashBufYears);
        const neededBuffer = bufSummary.totalNetCashBufferRequired;
        if (cashGiaPot < neededBuffer) {
          let shortfall = neededBuffer - cashGiaPot;
          
          // Draw from ISA first (tax free)
          if (isaPot > 0 && shortfall > 0) {
            const isaDraw = Math.min(isaPot, shortfall);
            deductProRata("isa", isaDraw);
            addProRata("cashGia", isaDraw, false);
            shortfall -= isaDraw;
          }
          
          // Draw remaining from Pension (approximate 15% effective tax)
          if ((canAccessPension || partnerCanAccessPension) && pensionPot > 0 && shortfall > 0) {
            const pensionGrossNeeded = shortfall / 0.85; 
            const pensionDraw = Math.min(pensionPot, pensionGrossNeeded);
            const actualNetAdded = pensionDraw * 0.85;
            deductProRata("pension", pensionDraw);
            if (!pclsTaken && primaryCumulativeTaxFreeDrawn < maxLsa) {
              primaryCumulativeTaxFreeDrawn += Math.min(pensionDraw * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
            }
            addProRata("cashGia", actualNetAdded, false);
            shortfall -= actualNetAdded;
          }
        }
      }

      if (!isRetired) {
        // ACCUMULATION PHASE
        const primaryTaxThisYr = calculateUKTax(profile, pots, false, age);
        const partnerTaxThisYr = (profile.isCouplePlanning && !partnerDead)
          ? calculatePartnerUKTax(profile, partnerPots, partnerAge)
          : null;

        let primaryPensionContrib = primaryTaxThisYr.regularPensionContributionsAnnual ?? primaryTaxThisYr.totalPensionContributionsAnnual;
        let primaryIsaContrib = (primaryTaxThisYr.regularSsIsaContributionsAnnual ?? primaryTaxThisYr.regularIsaContributionsAnnual ?? 0) + (primaryTaxThisYr.regularLisaContributionsAnnual ?? 0) + primaryTaxThisYr.lisaGovernmentBonusAnnual;
        let primaryCashGiaContrib = (primaryTaxThisYr.regularCashGiaContributionsAnnual ?? primaryTaxThisYr.totalCashGiaContributionsAnnual ?? 0) + (primaryTaxThisYr.regularCashIsaContributionsAnnual ?? 0);

        if (profile.isCouplePlanning && partnerTaxThisYr) {
          const partnerRetireAge = profile.partnerTargetRetirementAge ?? 60;
          if (partnerAge < partnerRetireAge) {
            primaryPensionContrib += partnerTaxThisYr.regularPensionContributionsAnnual ?? partnerTaxThisYr.totalPensionContributionsAnnual;
            primaryIsaContrib += (partnerTaxThisYr.regularSsIsaContributionsAnnual ?? partnerTaxThisYr.regularIsaContributionsAnnual ?? 0) + (partnerTaxThisYr.regularLisaContributionsAnnual ?? 0) + partnerTaxThisYr.lisaGovernmentBonusAnnual;
            primaryCashGiaContrib += (partnerTaxThisYr.regularCashGiaContributionsAnnual ?? partnerTaxThisYr.totalCashGiaContributionsAnnual ?? 0) + (partnerTaxThisYr.regularCashIsaContributionsAnnual ?? 0);
          }
        }

        const isCrashYear = marketScenario === 'early_crash' && age >= crashStartAge && age < (crashStartAge + crashDuration);
        const crashYearIdx = age - crashStartAge;
        const crashDrop = isCrashYear ? getCrashDropForYearIndex(crashYearIdx) : 0;
        const randomReturn = isCrashYear
          ? sampleLogNormalReturn(-crashDrop, accumulationVolatility)
          : sampleLogNormalReturn(meanAccumReturn, accumulationVolatility);

        // Existing pot earns full year random return; ongoing monthly contributions earn half-year average return
        
        growPots(randomReturn, randomReturn, randomReturn * accCashGiaMult);
        addProRata('pension', primaryPensionContrib * inflationFactor * (1 + randomReturn / 2), false);
        addProRata('isa', primaryIsaContrib * inflationFactor * (1 + randomReturn / 2), false);
        addProRata('cashGia', primaryCashGiaContrib * inflationFactor * (1 + (randomReturn * 0.85) / 2), false);

        
        

      } else {
        // DECUMULATION PHASE (For Primary, but partner might still be working)
        let partnerWorkingPensionContrib = 0;
        let partnerWorkingIsaContrib = 0;
        let partnerWorkingCashGiaContrib = 0;
        const partnerRetireAge = profile.partnerTargetRetirementAge ?? 60;
        const isPartnerWorking = profile.isCouplePlanning && !partnerDead && partnerAge < partnerRetireAge;

        if (isPartnerWorking) {
          const partnerTaxThisYr = calculatePartnerUKTax(profile, partnerPots, partnerAge);
          partnerWorkingPensionContrib = partnerTaxThisYr.regularPensionContributionsAnnual ?? partnerTaxThisYr.totalPensionContributionsAnnual;
          partnerWorkingIsaContrib = (partnerTaxThisYr.regularSsIsaContributionsAnnual ?? partnerTaxThisYr.regularIsaContributionsAnnual ?? 0) + (partnerTaxThisYr.regularLisaContributionsAnnual ?? 0) + partnerTaxThisYr.lisaGovernmentBonusAnnual;
          partnerWorkingCashGiaContrib = (partnerTaxThisYr.regularCashGiaContributionsAnnual ?? partnerTaxThisYr.totalCashGiaContributionsAnnual ?? 0) + (partnerTaxThisYr.regularCashIsaContributionsAnnual ?? 0);
          
          const randomReturn = marketScenario === 'early_crash' && age >= crashStartAge && age < (crashStartAge + crashDuration)
            ? sampleLogNormalReturn(-getCrashDropForYearIndex(age - crashStartAge), accumulationVolatility)
            : sampleLogNormalReturn(meanAccumReturn, accumulationVolatility);
          
          addProRata('pension', partnerWorkingPensionContrib * inflationFactor * (1 + randomReturn / 2), true);
          addProRata('isa', partnerWorkingIsaContrib * inflationFactor * (1 + randomReturn / 2), true);
          addProRata('cashGia', partnerWorkingCashGiaContrib * inflationFactor * (1 + (randomReturn * 0.85) / 2), true);
        }

        // Primary Single / Initial Hybrid Annuity Purchase
        const primaryTargetPurchaseAge = Math.max(pensionAccessAge, profile.annuityPurchaseAge || profile.targetRetirementAge);
        if (
          canAccessPension &&
          primaryPensionPot > 0 &&
          !annuityPurchased &&
          (profile.incomeProductOption === 'annuity' || profile.incomeProductOption === 'hybrid') &&
          age >= primaryTargetPurchaseAge
        ) {
          const allocPercent =
            profile.incomeProductOption === 'annuity'
              ? 100
              : Math.min(100, Math.max(1, profile.annuityAllocationPercent ?? 50));

          const grossPotForAnnuity = primaryPensionPot * (allocPercent / 100);
          let actualCapitalToAnnuity = grossPotForAnnuity;

          if (!pclsTaken && primaryCumulativeTaxFreeDrawn < maxLsa) {
            const uncrystPcls = Math.min(grossPotForAnnuity * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
            actualCapitalToAnnuity = grossPotForAnnuity - uncrystPcls;
            const alloc = allocateLumpSumToPots(uncrystPcls, profile.lumpSumTargetPot, profile.lumpSumSplits);
            primaryIsaPot += alloc.toIsa;
            primaryCashGiaPot += alloc.toCashGia;
            isaPot = primaryIsaPot + partnerIsaPot;
            cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
            primaryCumulativeTaxFreeDrawn += uncrystPcls;
          }

          primaryPensionPot = Math.max(0, primaryPensionPot - grossPotForAnnuity);
          pensionPot = primaryPensionPot + partnerPensionPot;

          const rate = (profile.annuityRatePercent || 4.2) / 100;
          const baseNominal = actualCapitalToAnnuity * rate;
          annuityPurchased = true;

          const cfgPrimary = parseAnnuityTypeConfig(profile.annuityType);
          mcAnnuityStreams.push({
            baseNominal,
            isInflationLinked: cfgPrimary.isInflationLinked,
            fixedEscalationRate: cfgPrimary.fixedEscalationRate,
            durationOption: profile.annuityDurationOption || 'lifetime',
            durationUntilAge: profile.annuityDurationUntilAge || 75,
            owner: 'primary',
            purchaseInflationFactor: inflationFactor,
            purchaseYearOffset: yr,
          });
        }

        // Partner Base / Hybrid Annuity Purchase
        const partnerTargetPurchaseAge = Math.max(partnerPensionAccessAge, profile.partnerAnnuityPurchaseAge || profile.partnerTargetRetirementAge || profile.targetRetirementAge);
        if (
          profile.isCouplePlanning &&
          !partnerDead &&
          partnerCanAccessPension &&
          partnerPensionPot > 0 &&
          !partnerAnnuityPurchased &&
          (profile.partnerIncomeProductOption === 'annuity' || profile.partnerIncomeProductOption === 'hybrid') &&
          partnerAge >= partnerTargetPurchaseAge
        ) {
          const allocPercent =
            profile.partnerIncomeProductOption === 'annuity'
              ? 100
              : Math.min(100, Math.max(1, profile.partnerAnnuityAllocationPercent ?? 50));

          const grossPotForAnnuity = partnerPensionPot * (allocPercent / 100);
          let actualCapitalToAnnuity = grossPotForAnnuity;

          if (!partnerPclsTaken && partnerCumulativeTaxFreeDrawn < partnerMaxLsa) {
            const uncrystPcls = Math.min(grossPotForAnnuity * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
            actualCapitalToAnnuity = grossPotForAnnuity - uncrystPcls;
            const alloc = allocateLumpSumToPots(uncrystPcls, profile.partnerLumpSumTargetPot || profile.lumpSumTargetPot, profile.partnerLumpSumSplits || profile.lumpSumSplits);
            partnerIsaPot += alloc.toIsa;
            partnerCashGiaPot += alloc.toCashGia;
            isaPot = primaryIsaPot + partnerIsaPot;
            cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
            partnerCumulativeTaxFreeDrawn += uncrystPcls;
          }

          partnerPensionPot = Math.max(0, partnerPensionPot - grossPotForAnnuity);
          pensionPot = primaryPensionPot + partnerPensionPot;

          const rate = (profile.partnerAnnuityRatePercent || 4.2) / 100;
          const baseNominal = actualCapitalToAnnuity * rate;
          partnerAnnuityPurchased = true;

          const cfgPartner = parseAnnuityTypeConfig(profile.partnerAnnuityType || profile.annuityType);
          mcAnnuityStreams.push({
            baseNominal,
            isInflationLinked: cfgPartner.isInflationLinked,
            fixedEscalationRate: cfgPartner.fixedEscalationRate,
            durationOption: profile.partnerAnnuityDurationOption || 'lifetime',
            durationUntilAge: profile.partnerAnnuityDurationUntilAge || 75,
            owner: 'partner',
            purchaseInflationFactor: inflationFactor,
            purchaseYearOffset: yr,
          });
        }

        // Multi-tranche Hybrid Annuities for Primary
        if (profile.incomeProductOption === 'hybrid' && canAccessPension) {
          (profile.annuityTranches || []).forEach((t) => {
            if (t.enabled && (t.owner || 'primary') === 'primary' && t.purchaseAge === age && primaryPensionPot > 0) {
              const allocPercent = Math.min(100, Math.max(1, t.allocationPercent ?? 25));
              const grossPotForAnnuity = primaryPensionPot * (allocPercent / 100);
              let actualCapitalToAnnuity = grossPotForAnnuity;

              if (!pclsTaken && primaryCumulativeTaxFreeDrawn < maxLsa) {
                const uncrystPcls = Math.min(grossPotForAnnuity * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
                actualCapitalToAnnuity = grossPotForAnnuity - uncrystPcls;
                const alloc = allocateLumpSumToPots(uncrystPcls, profile.lumpSumTargetPot, profile.lumpSumSplits);
                primaryIsaPot += alloc.toIsa;
                primaryCashGiaPot += alloc.toCashGia;
                isaPot = primaryIsaPot + partnerIsaPot;
                cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
                primaryCumulativeTaxFreeDrawn += uncrystPcls;
              }

              primaryPensionPot = Math.max(0, primaryPensionPot - grossPotForAnnuity);
              pensionPot = primaryPensionPot + partnerPensionPot;

              const rate = (t.annuityRatePercent || 4.2) / 100;
              const baseNominal = actualCapitalToAnnuity * rate;

              const cfgTranchePrimary = parseAnnuityTypeConfig(t.annuityType || profile.annuityType);
              mcAnnuityStreams.push({
                baseNominal,
                isInflationLinked: cfgTranchePrimary.isInflationLinked,
                fixedEscalationRate: cfgTranchePrimary.fixedEscalationRate,
                durationOption: t.durationOption || 'lifetime',
                durationUntilAge: t.durationUntilAge || 75,
                owner: 'primary',
                purchaseInflationFactor: inflationFactor,
                purchaseYearOffset: yr,
              });
            }
          });
        }

        // Multi-tranche Hybrid Annuities for Partner
        if (profile.isCouplePlanning && profile.partnerIncomeProductOption === 'hybrid') {
          const partnerTranches = profile.partnerAnnuityTranches || (profile.annuityTranches || []).filter((t) => t.owner === 'partner');
          partnerTranches.forEach((t) => {
            if (t.enabled && t.purchaseAge === partnerAge && partnerPensionPot > 0) {
              const allocPercent = Math.min(100, Math.max(1, t.allocationPercent ?? 25));
              const grossPotForAnnuity = partnerPensionPot * (allocPercent / 100);
              let actualCapitalToAnnuity = grossPotForAnnuity;

              if (!partnerPclsTaken && partnerCumulativeTaxFreeDrawn < partnerMaxLsa) {
                const uncrystPcls = Math.min(grossPotForAnnuity * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
                actualCapitalToAnnuity = grossPotForAnnuity - uncrystPcls;
                const alloc = allocateLumpSumToPots(uncrystPcls, profile.partnerLumpSumTargetPot || profile.lumpSumTargetPot, profile.partnerLumpSumSplits || profile.lumpSumSplits);
                partnerIsaPot += alloc.toIsa;
                partnerCashGiaPot += alloc.toCashGia;
                isaPot = primaryIsaPot + partnerIsaPot;
                cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
                partnerCumulativeTaxFreeDrawn += uncrystPcls;
              }

              partnerPensionPot = Math.max(0, partnerPensionPot - grossPotForAnnuity);
              pensionPot = primaryPensionPot + partnerPensionPot;

              const rate = (t.annuityRatePercent || 4.2) / 100;
              const baseNominal = actualCapitalToAnnuity * rate;

              const cfgTranchePartner = parseAnnuityTypeConfig(t.annuityType || profile.partnerAnnuityType || profile.annuityType);
              mcAnnuityStreams.push({
                baseNominal,
                isInflationLinked: cfgTranchePartner.isInflationLinked,
                fixedEscalationRate: cfgTranchePartner.fixedEscalationRate,
                durationOption: t.durationOption || 'lifetime',
                durationUntilAge: t.durationUntilAge || 75,
                owner: 'partner',
                purchaseInflationFactor: inflationFactor,
                purchaseYearOffset: yr,
              });
            }
          });
        }

        // Compute total active annuity income for current simulation year
        let primaryAnnuityIncomeThisYear = 0;
        let partnerAnnuityIncomeThisYear = 0;
        mcAnnuityStreams.forEach((stream) => {
          if (stream.owner === 'partner' && partnerDead) return;
          const isPartner = stream.owner === 'partner';
          const ownerAge = isPartner ? partnerAge : age;
          if (stream.durationOption === 'until_age' && stream.durationUntilAge && ownerAge >= stream.durationUntilAge) {
            return;
          }
          
          let amount = stream.baseNominal;
          if (stream.isInflationLinked) {
            amount *= (inflationFactor / (stream.purchaseInflationFactor || 1));
          } else if (stream.fixedEscalationRate) {
            const yearsSincePurchase = Math.max(0, yr - (stream.purchaseYearOffset || 0));
            amount *= Math.pow(1 + stream.fixedEscalationRate, yearsSincePurchase);
          }
          
          if (isPartner) partnerAnnuityIncomeThisYear += amount;
          else primaryAnnuityIncomeThisYear += amount;
        });

        // Apply random decumulation return (or custom crash in designated crash window)
        const isCrashYear = marketScenario === 'early_crash' && age >= crashStartAge && age < (crashStartAge + crashDuration);
        const crashYearIdx = age - crashStartAge;
        const crashDrop = isCrashYear ? getCrashDropForYearIndex(crashYearIdx) : 0;
        let randomReturn: number;
        if (isCrashYear) {
          randomReturn = sampleLogNormalReturn(-crashDrop, decumulationVolatility);
        } else {
          randomReturn = sampleLogNormalReturn(meanDecumReturn, decumulationVolatility);
        }

        // Cash savings return in decumulation during a crash year does not suffer equity crash drop
        const cashYield = 0.02;
        const decumCashGiaReturn = isCrashYear
          ? (giaRatio * randomReturn + (1 - giaRatio) * cashYield)
          : (randomReturn * decumCashGiaMult);

        growPots(randomReturn, randomReturn, decumCashGiaReturn);
        
        

        let lifeEventsExpenseThisYear = 0;
        const activeDecumEvents = (profile.decumulationLifeEvents || []).filter(e => e.enabled);
        for (const event of activeDecumEvents) {
          const isPartnerEvent = event.owner === 'partner';
          const targetAgeMatches = isPartnerEvent ? partnerAge === event.age : age === event.age;
          if (targetAgeMatches) {
            const rawAmount = Number(event.amount) || 0;
            if (rawAmount > 0) {
              const inflLinked = event.inflationLinked ?? true;
              const eventAmount = inflLinked ? rawAmount * inflationFactor : rawAmount;
              if (event.type === 'income') {
                const potTarget = event.targetPot || 'cash_savings';
                const isPension = potTarget === 'sipp';
                const isIsa = potTarget === 'stocks_and_shares_isa' || potTarget === 'cash_isa' || potTarget === 'lisa' || potTarget === 'isa';
                const potName = isPension ? 'pension' : isIsa ? 'isa' : 'cashGia';
                addProRata(potName, eventAmount, isPartnerEvent);
              } else {
                lifeEventsExpenseThisYear += eventAmount;
              }
            }
          }
        }

        // Required inflation-adjusted gross target
        const maxDrawdownIncomeTarget = getTargetIncomeForAge(profile, age);
        const actualSpendingBase = getActualSpendingTargetForAge(profile, age);
        const isReinvestExcess = Boolean(
          profile.reinvestExcessDrawdown ||
          profile.maximizedSpendConfig?.reinvestExcessDrawdown
        );

        const requiredNetIncomeTarget = actualSpendingBase * inflationFactor + lifeEventsExpenseThisYear;
        const drawdownNetTarget = isReinvestExcess ? (maxDrawdownIncomeTarget * inflationFactor + lifeEventsExpenseThisYear) : requiredNetIncomeTarget;

        // State Pension (Primary + Partner if couple mode)
        let primaryStatePension = 0;
        if ((profile.includeStatePension ?? true) && age >= (profile.statePensionAge || 67)) {
          const primaryYears = profile.qualifyingYears ?? 35;
          if (primaryYears >= 10) {
            const primaryTripleLock = profile.enableTripleLock ?? true;
            const primaryIndexFactor = primaryTripleLock ? inflationFactor : 1;
            const primaryFull = profile.fullStatePensionAmount ?? 12547.60;
            const primaryAnnualCalculated = Math.round((primaryYears / 35) * primaryFull * 100) / 100;
            const primaryBaseAmount = profile.statePensionAmountAnnual ?? primaryAnnualCalculated;
            primaryStatePension = primaryBaseAmount * primaryIndexFactor;
          }
        }
        let partnerStatePension = 0;
        if (profile.isCouplePlanning && !partnerDead && (profile.partnerIncludeStatePension ?? true)) {
          const partnerAge = age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge);
          if (partnerAge >= (profile.partnerStatePensionAge || 67)) {
            const partnerYears = profile.partnerQualifyingYears ?? 35;
            if (partnerYears >= 10) {
              const partnerTripleLock = profile.partnerEnableTripleLock ?? true;
              const partnerIndexFactor = partnerTripleLock ? inflationFactor : 1;
              const partnerFull = profile.partnerFullStatePensionAmount ?? 12547.60;
              const partnerAnnualCalculated = Math.round((partnerYears / 35) * partnerFull * 100) / 100;
              const partnerBaseAmount = profile.partnerStatePensionAmountAnnual ?? partnerAnnualCalculated;
              partnerStatePension = partnerBaseAmount * partnerIndexFactor;
            }
          }
        }

        const statePensionReceived = primaryStatePension + partnerStatePension;
        const primaryTaxableGuaranteed = primaryStatePension + primaryAnnuityIncomeThisYear + primaryDbIncomeThisYear + primaryTaxableFixedIncomeThisYr;
        const partnerTaxableGuaranteed = profile.isCouplePlanning && !partnerDead ? (partnerStatePension + partnerAnnuityIncomeThisYear + partnerDbIncomeThisYear + partnerTaxableFixedIncomeThisYr) : 0;

        const indexTaxBands = profile.indexTaxBands ?? true;
        const inflMult = indexTaxBands ? inflationFactor : 1;
        const singlePersonalAllowance = 12570 * inflMult;
        const isScottishTax = profile.taxRegion === 'scotland';
        const isPartnerScottishTax = (profile.partnerTaxRegion || profile.taxRegion) === 'scotland';

        const computeIncomeTax = (taxableIncome: number, inflFact: number, isScot: boolean): number => {
          if (taxableIncome <= 0) return 0;
          const basicBand = isScot ? (SCOT_INTERMEDIATE_THRESHOLD * inflFact) : (RUK_BASIC_THRESHOLD * inflFact);
          const basicTaxable = Math.min(taxableIncome, basicBand);
          let tax = basicTaxable * 0.20;
          if (taxableIncome > basicBand) {
            tax += (taxableIncome - basicBand) * 0.40;
          }
          return tax;
        };

        const priBaseTax = computeIncomeTax(Math.max(0, primaryTaxableGuaranteed - singlePersonalAllowance), inflationFactor, isScottishTax);
        const partBaseTax = profile.isCouplePlanning ? computeIncomeTax(Math.max(0, partnerTaxableGuaranteed - singlePersonalAllowance), inflationFactor, isPartnerScottishTax) : 0;
        const guaranteedTaxLiability = priBaseTax + partBaseTax;
        const partnerTaxFreeSecured = (profile.isCouplePlanning && !partnerDead) ? partnerTaxFreeFixedIncomeThisYr : 0;
        const guaranteedIncomeTotal = primaryTaxableGuaranteed + partnerTaxableGuaranteed + primaryTaxFreeFixedIncomeThisYr + partnerTaxFreeSecured;
        const netGuaranteedIncomeSecured = Math.max(0, guaranteedIncomeTotal - guaranteedTaxLiability);

        let remainingNeeded = Math.max(0, drawdownNetTarget - netGuaranteedIncomeSecured);

        const getNetFromSpecificDraws = (priG: number, partG: number) => {
          const priTaxFree = (!pclsTaken && primaryCumulativeTaxFreeDrawn < maxLsa)
            ? Math.min(priG * 0.25, maxLsa - primaryCumulativeTaxFreeDrawn)
            : 0;
          const priTaxableDrawdown = priG - priTaxFree;

          const partTaxFree = (profile.isCouplePlanning && !partnerPclsTaken && partnerCumulativeTaxFreeDrawn < partnerMaxLsa)
            ? Math.min(partG * 0.25, partnerMaxLsa - partnerCumulativeTaxFreeDrawn)
            : 0;
          const partTaxableDrawdown = partG - partTaxFree;

          const priTotalTaxable = primaryTaxableGuaranteed + priTaxableDrawdown;
          const partTotalTaxable = partnerTaxableGuaranteed + partTaxableDrawdown;

          const priTax = computeIncomeTax(Math.max(0, priTotalTaxable - singlePersonalAllowance), inflationFactor, isScottishTax);
          const partTax = profile.isCouplePlanning
            ? computeIncomeTax(Math.max(0, partTotalTaxable - singlePersonalAllowance), inflationFactor, isPartnerScottishTax)
            : 0;

          const totalTax = priTax + partTax;
          const additionalTax = Math.max(0, totalTax - guaranteedTaxLiability);
          return (priG + partG) - additionalTax;
        };

        let priTargetGross = 0;
        let partTargetGross = 0;
        let totalTargetNet = 0;

        const getGrossPensionNeededForNet = (
          netNeeded: number,
          potAvailable: number,
          existingPriGross = 0,
          existingPartGross = 0
        ): number => {
          if (netNeeded <= 0 || potAvailable <= 0) return 0;

          const getNetFromGross = (gross: number): number => {
            const totalAvailPension = (canAccessPension ? primaryPensionPot : 0) + (profile.isCouplePlanning && partnerCanAccessPension ? partnerPensionPot : 0);
            const priRatio = (canAccessPension && totalAvailPension > 0) ? primaryPensionPot / totalAvailPension : (canAccessPension ? 1 : 0);
            const partRatio = (profile.isCouplePlanning && partnerCanAccessPension) ? (1 - priRatio) : 0;

            const priGrossTotal = existingPriGross + (gross * priRatio);
            const partGrossTotal = existingPartGross + (gross * partRatio);

            const priTaxFree = (!pclsTaken && primaryCumulativeTaxFreeDrawn < maxLsa)
              ? Math.min(priGrossTotal * 0.25, maxLsa - primaryCumulativeTaxFreeDrawn)
              : 0;
            const priTaxableDrawdown = priGrossTotal - priTaxFree;

            const partTaxFree = (profile.isCouplePlanning && !partnerPclsTaken && partnerCumulativeTaxFreeDrawn < partnerMaxLsa)
              ? Math.min(partGrossTotal * 0.25, partnerMaxLsa - partnerCumulativeTaxFreeDrawn)
              : 0;
            const partTaxableDrawdown = partGrossTotal - partTaxFree;

            const priTotalTaxable = primaryTaxableGuaranteed + priTaxableDrawdown;
            const partTotalTaxable = partnerTaxableGuaranteed + partTaxableDrawdown;

            const priTax = computeIncomeTax(Math.max(0, priTotalTaxable - singlePersonalAllowance), inflationFactor, isScottishTax);
            const partTax = profile.isCouplePlanning
              ? computeIncomeTax(Math.max(0, partTotalTaxable - singlePersonalAllowance), inflationFactor, isPartnerScottishTax)
              : 0;

            const priTaxFreeBase = (!pclsTaken && primaryCumulativeTaxFreeDrawn < maxLsa)
              ? Math.min(existingPriGross * 0.25, maxLsa - primaryCumulativeTaxFreeDrawn)
              : 0;
            const priTaxableBase = existingPriGross - priTaxFreeBase;

            const partTaxFreeBase = (profile.isCouplePlanning && !partnerPclsTaken && partnerCumulativeTaxFreeDrawn < partnerMaxLsa)
              ? Math.min(existingPartGross * 0.25, partnerMaxLsa - partnerCumulativeTaxFreeDrawn)
              : 0;
            const partTaxableBase = existingPartGross - partTaxFreeBase;

            const priTaxBase = computeIncomeTax(Math.max(0, primaryTaxableGuaranteed + priTaxableBase - singlePersonalAllowance), inflationFactor, isScottishTax);
            const partTaxBase = profile.isCouplePlanning
              ? computeIncomeTax(Math.max(0, partnerTaxableGuaranteed + partTaxableBase - singlePersonalAllowance), inflationFactor, isPartnerScottishTax)
              : 0;

            const baseTax = priTaxBase + partTaxBase;
            const totalTax = priTax + partTax;
            const marginalTax = Math.max(0, totalTax - baseTax);

            return gross - marginalTax;
          };

          let low = 0;
          let high = Math.min(potAvailable, netNeeded * 5.0);
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

          const exactGross = getNetFromGross(bestGross) >= netNeeded ? bestGross : potAvailable;
          return Math.min(potAvailable, Math.ceil(exactGross));
        };

        const isCashBufferActiveYr = useCashBuf && marketScenario === 'early_crash' && age >= crashStartAge && age < (crashStartAge + cashBufYears);

        const primaryStrategy = profile.drawdownStrategy || 'isa_first';
        const partnerStrategy = profile.isCouplePlanning ? (profile.partnerDrawdownStrategy || primaryStrategy) : primaryStrategy;

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

        let actualIsReinvestExcess = isReinvestExcess;

        // Force Cash First and disable reinvestment during active buffer years to prevent equity sales
        if (isCashBufferActiveYr) {
          effectiveStrategy = 'cash_first';
          actualIsReinvestExcess = false;
        }

        if (actualIsReinvestExcess) {
          const hasPensionAccess = canAccessPension || partnerCanAccessPension;
          if (hasPensionAccess && pensionPot > 0) {
            const pensionNetNeeded = Math.max(0, drawdownNetTarget - netGuaranteedIncomeSecured);
            if (pensionNetNeeded > 0) {
              const grossDraw = getGrossPensionNeededForNet(pensionNetNeeded, pensionPot);
              const draw = Math.min(pensionPot, grossDraw);
              const totalAvail = (canAccessPension ? primaryPensionPot : 0) + (partnerCanAccessPension ? partnerPensionPot : 0);
              const priR = (canAccessPension && totalAvail > 0) ? primaryPensionPot / totalAvail : (canAccessPension ? 1 : 0);
              const priDraw = canAccessPension ? draw * priR : 0;
              const partDraw = partnerCanAccessPension ? draw * (1 - priR) : 0;
              const netPensionDraw = getNetFromSpecificDraws(priDraw, partDraw);
              deductProRata("pension", draw);
              if (!pclsTaken && primaryCumulativeTaxFreeDrawn < maxLsa && priDraw > 0) {
                primaryCumulativeTaxFreeDrawn += Math.min(priDraw * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
              }
              if (!partnerPclsTaken && partnerCumulativeTaxFreeDrawn < partnerMaxLsa && partDraw > 0) {
                partnerCumulativeTaxFreeDrawn += Math.min(partDraw * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
              }
              const actualNetSecured = netGuaranteedIncomeSecured + netPensionDraw;
              if (actualNetSecured > requiredNetIncomeTarget) {
                const surplus = actualNetSecured - requiredNetIncomeTarget;
                const reinvestOpt = profile.maximizedSpendConfig?.reinvestDestinationPot || profile.annuityExcessReinvestOption || 'isa';
                if (reinvestOpt === 'isa' || reinvestOpt === 'stocks_and_shares_isa' || reinvestOpt === 'cash_isa') {
                  addProRata("isa", surplus, false);
                } else if (reinvestOpt !== 'none') {
                  addProRata("cashGia", surplus, false);
                }
                remainingNeeded = 0;
              } else {
                remainingNeeded = Math.max(0, requiredNetIncomeTarget - actualNetSecured);
              }
            } else {
              remainingNeeded = Math.max(0, requiredNetIncomeTarget - netGuaranteedIncomeSecured);
            }
          } else {
            remainingNeeded = Math.max(0, requiredNetIncomeTarget - netGuaranteedIncomeSecured);
          }

          if (isaPot > 0 && remainingNeeded > 0) {
            const draw = Math.min(isaPot, remainingNeeded);
            deductProRata("isa", draw);
            remainingNeeded -= draw;
          }
          if (cashGiaPot > 0 && remainingNeeded > 0) {
            const draw = Math.min(cashGiaPot, remainingNeeded);
            deductProRata("cashGia", draw);
            remainingNeeded -= draw;
          }
        } else if (effectiveStrategy === 'isa_first' || effectiveStrategy === 'cash_first') {
          const firstPot = effectiveStrategy === 'isa_first' ? 'isa' : 'cashGia';
          const secondPot = effectiveStrategy === 'isa_first' ? 'cashGia' : 'isa';
          const firstPotAmt = firstPot === 'isa' ? isaPot : cashGiaPot;
          const secondPotAmt = secondPot === 'isa' ? isaPot : cashGiaPot;

          if (firstPotAmt > 0 && remainingNeeded > 0) {
            const draw = Math.min(firstPotAmt, remainingNeeded);
            deductProRata(firstPot, draw);
            remainingNeeded -= draw;
          }
          if (secondPotAmt > 0 && remainingNeeded > 0) {
            const draw = Math.min(secondPotAmt, remainingNeeded);
            deductProRata(secondPot, draw);
            remainingNeeded -= draw;
          }
          if ((canAccessPension || partnerCanAccessPension) && pensionPot > 0 && remainingNeeded > 0) {
            const grossDrawNeeded = getGrossPensionNeededForNet(remainingNeeded, pensionPot);
            const draw = Math.min(pensionPot, grossDrawNeeded);
            const totalAvail = (canAccessPension ? primaryPensionPot : 0) + (partnerCanAccessPension ? partnerPensionPot : 0);
            const priR = (canAccessPension && totalAvail > 0) ? primaryPensionPot / totalAvail : (canAccessPension ? 1 : 0);
            const priDraw = canAccessPension ? draw * priR : 0;
            const partDraw = partnerCanAccessPension ? draw * (1 - priR) : 0;
            deductProRata("pension", draw);
            const netDraw = getNetFromSpecificDraws(priDraw, partDraw);
            if (!pclsTaken && primaryCumulativeTaxFreeDrawn < maxLsa && priDraw > 0) {
              primaryCumulativeTaxFreeDrawn += Math.min(priDraw * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
            }
            if (!partnerPclsTaken && partnerCumulativeTaxFreeDrawn < partnerMaxLsa && partDraw > 0) {
              partnerCumulativeTaxFreeDrawn += Math.min(partDraw * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
            }
            remainingNeeded = Math.max(0, remainingNeeded - netDraw);
          }
        } else if (effectiveStrategy === 'tax_free_bracket' || effectiveStrategy === 'basic_rate_bracket' || effectiveStrategy === 'higher_rate_bracket') {
          const isPrimaryScot = profile.taxRegion === 'scotland';
          const isPartnerScot = (profile.partnerTaxRegion || profile.taxRegion) === 'scotland';

          const indexTaxBands = profile.indexTaxBands ?? true;
          const inflMult = indexTaxBands ? inflationFactor : 1;

          let priThresholdGross = 12570 * inflMult;
          if (primaryStrategy === 'basic_rate_bracket') {
            priThresholdGross = (12570 + (isPrimaryScot ? SCOT_INTERMEDIATE_THRESHOLD : RUK_BASIC_THRESHOLD)) * inflMult;
          } else if (primaryStrategy === 'higher_rate_bracket') {
            priThresholdGross = (isPrimaryScot ? (12570 + SCOT_HIGHER_THRESHOLD) : RUK_ADDITIONAL_THRESHOLD) * inflMult;
          }

          let partThresholdGross = 12570 * inflMult;
          if (partnerStrategy === 'basic_rate_bracket') {
            partThresholdGross = (12570 + (isPartnerScot ? SCOT_INTERMEDIATE_THRESHOLD : RUK_BASIC_THRESHOLD)) * inflMult;
          } else if (partnerStrategy === 'higher_rate_bracket') {
            partThresholdGross = (isPartnerScot ? (12570 + SCOT_HIGHER_THRESHOLD) : RUK_ADDITIONAL_THRESHOLD) * inflMult;
          }

          const remLsaPri = (!pclsTaken) ? Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn) : 0;
          const remLsaPart = (!partnerPclsTaken) ? Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn) : 0;

          const priIncomeAlready = primaryTaxableGuaranteed;
          const partIncomeAlready = partnerTaxableGuaranteed;

          const priRoom = Math.max(0, priThresholdGross - priIncomeAlready);
          const partRoom = profile.isCouplePlanning ? Math.max(0, partThresholdGross - partIncomeAlready) : 0;

          let maxPriGrossForBracket = 0;
          if (priRoom > 0) {
            if (remLsaPri >= priRoom / 3) {
              maxPriGrossForBracket = priRoom / 0.75;
            } else {
              maxPriGrossForBracket = priRoom + remLsaPri;
            }
          }

          let maxPartGrossForBracket = 0;
          if (partRoom > 0) {
            if (remLsaPart >= partRoom / 3) {
              maxPartGrossForBracket = partRoom / 0.75;
            } else {
              maxPartGrossForBracket = partRoom + remLsaPart;
            }
          }

          priTargetGross = Math.min(canAccessPension ? primaryPensionPot : 0, maxPriGrossForBracket);
          partTargetGross = Math.min(partnerCanAccessPension ? partnerPensionPot : 0, maxPartGrossForBracket);

          const totalTargetGross = priTargetGross + partTargetGross;
          totalTargetNet = getNetFromSpecificDraws(priTargetGross, partTargetGross);

          if (totalTargetNet > remainingNeeded && totalTargetNet > 0) {
            const surplus = totalTargetNet - remainingNeeded;
            const reinvestOpt = profile.maximizedSpendConfig?.reinvestDestinationPot || profile.annuityExcessReinvestOption || 'isa';
            if (reinvestOpt === 'isa' || reinvestOpt === 'stocks_and_shares_isa' || reinvestOpt === 'cash_isa') {
              addProRata("isa", surplus, false);
            } else if (reinvestOpt !== 'none') {
              addProRata("cashGia", surplus, false);
            }
            deductExactPension(priTargetGross, partTargetGross);
            if (!pclsTaken && primaryCumulativeTaxFreeDrawn < maxLsa && priTargetGross > 0) {
              primaryCumulativeTaxFreeDrawn += Math.min(priTargetGross * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
            }
            if (!partnerPclsTaken && partnerCumulativeTaxFreeDrawn < partnerMaxLsa && partTargetGross > 0) {
              partnerCumulativeTaxFreeDrawn += Math.min(partTargetGross * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
            }
            remainingNeeded = 0;
          } else {
            const totalPensionDraw = priTargetGross + partTargetGross;
            if (totalPensionDraw > 0) {
              deductExactPension(priTargetGross, partTargetGross);
              if (!pclsTaken && primaryCumulativeTaxFreeDrawn < maxLsa && priTargetGross > 0) {
                primaryCumulativeTaxFreeDrawn += Math.min(priTargetGross * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
              }
              if (!partnerPclsTaken && partnerCumulativeTaxFreeDrawn < partnerMaxLsa && partTargetGross > 0) {
                partnerCumulativeTaxFreeDrawn += Math.min(partTargetGross * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
              }
              remainingNeeded = Math.max(0, remainingNeeded - totalTargetNet);
            }
          }
          if (isaPot > 0 && remainingNeeded > 0) {
            const draw = Math.min(isaPot, remainingNeeded);
            deductProRata("isa", draw);
            remainingNeeded -= draw;
          }
          if (cashGiaPot > 0 && remainingNeeded > 0) {
            const draw = Math.min(cashGiaPot, remainingNeeded);
            deductProRata("cashGia", draw);
            remainingNeeded -= draw;
          }
        } else if (effectiveStrategy === 'pro_rata') {
          const hasPensionAccess = canAccessPension || partnerCanAccessPension;
          const totalAccessible = cashGiaPot + isaPot + (hasPensionAccess ? pensionPot : 0);
          if (totalAccessible > 0 && remainingNeeded > 0) {
            if (hasPensionAccess && pensionPot > 0) {
              const portion = pensionPot / totalAccessible;
              const netToDraw = remainingNeeded * portion;
              const grossDrawNeeded = getGrossPensionNeededForNet(netToDraw, pensionPot);
              const draw = Math.min(pensionPot, grossDrawNeeded);
              const totalAvail = (canAccessPension ? primaryPensionPot : 0) + (partnerCanAccessPension ? partnerPensionPot : 0);
              const priR = (canAccessPension && totalAvail > 0) ? primaryPensionPot / totalAvail : (canAccessPension ? 1 : 0);
              const priDraw = canAccessPension ? draw * priR : 0;
              const partDraw = partnerCanAccessPension ? draw * (1 - priR) : 0;
              deductProRata("pension", draw);
              const netDraw = getNetFromSpecificDraws(priDraw, partDraw);
              if (!pclsTaken && primaryCumulativeTaxFreeDrawn < maxLsa && priDraw > 0) {
                primaryCumulativeTaxFreeDrawn += Math.min(priDraw * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
              }
              if (!partnerPclsTaken && partnerCumulativeTaxFreeDrawn < partnerMaxLsa && partDraw > 0) {
                partnerCumulativeTaxFreeDrawn += Math.min(partDraw * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
              }
              remainingNeeded = Math.max(0, remainingNeeded - netDraw);
            }
            if (isaPot > 0 && remainingNeeded > 0) {
              const portion = isaPot / totalAccessible;
              const draw = Math.min(isaPot, remainingNeeded * portion);
              deductProRata("isa", draw);
              remainingNeeded -= draw;
            }
            if (cashGiaPot > 0 && remainingNeeded > 0) {
              const draw = Math.min(cashGiaPot, remainingNeeded);
              deductProRata("cashGia", draw);
              remainingNeeded -= draw;
            }
          }
        } else {
          // Pension First
          const hasPensionAccess = canAccessPension || partnerCanAccessPension;
          if (hasPensionAccess && pensionPot > 0 && remainingNeeded > 0) {
            const grossDrawNeeded = getGrossPensionNeededForNet(remainingNeeded, pensionPot);
            const draw = Math.min(pensionPot, grossDrawNeeded);
            const totalAvail = (canAccessPension ? primaryPensionPot : 0) + (partnerCanAccessPension ? partnerPensionPot : 0);
            const priR = (canAccessPension && totalAvail > 0) ? primaryPensionPot / totalAvail : (canAccessPension ? 1 : 0);
            const priDraw = canAccessPension ? draw * priR : 0;
            const partDraw = partnerCanAccessPension ? draw * (1 - priR) : 0;
            deductProRata("pension", draw);
            const netDraw = getNetFromSpecificDraws(priDraw, partDraw);
            if (!pclsTaken && primaryCumulativeTaxFreeDrawn < maxLsa && priDraw > 0) {
              primaryCumulativeTaxFreeDrawn += Math.min(priDraw * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
            }
            if (!partnerPclsTaken && partnerCumulativeTaxFreeDrawn < partnerMaxLsa && partDraw > 0) {
              partnerCumulativeTaxFreeDrawn += Math.min(partDraw * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
            }
            remainingNeeded = Math.max(0, remainingNeeded - netDraw);
          }
          if (isaPot > 0 && remainingNeeded > 0) {
            const draw = Math.min(isaPot, remainingNeeded);
            deductProRata("isa", draw);
            remainingNeeded -= draw;
          }
          if (cashGiaPot > 0 && remainingNeeded > 0) {
            const draw = Math.min(cashGiaPot, remainingNeeded);
            deductProRata("cashGia", draw);
            remainingNeeded -= draw;
          }
        }

        // Secondary Safety Net Pass: If primary strategy left a net shortfall but remaining pots exist, top up net income
        if (remainingNeeded > 0) {
          if (isaPot > 0 && remainingNeeded > 0) {
            const extraIsa = Math.min(isaPot, remainingNeeded);
            deductProRata("isa", extraIsa);
            remainingNeeded -= extraIsa;
          }
          if (cashGiaPot > 0 && remainingNeeded > 0) {
            const extraCash = Math.min(cashGiaPot, remainingNeeded);
            deductProRata("cashGia", extraCash);
            remainingNeeded -= extraCash;
          }
          const hasPensionAccess = canAccessPension || partnerCanAccessPension;
          if (hasPensionAccess && pensionPot > 0 && remainingNeeded > 0) {
            const extraPensionGross = getGrossPensionNeededForNet(remainingNeeded, pensionPot, priTargetGross, partTargetGross);
            const draw = Math.min(pensionPot, extraPensionGross);
            const totalAvail = (canAccessPension ? primaryPensionPot : 0) + (partnerCanAccessPension ? partnerPensionPot : 0);
            const priR = (canAccessPension && totalAvail > 0) ? primaryPensionPot / totalAvail : (canAccessPension ? 1 : 0);
            const priDraw = canAccessPension ? draw * priR : 0;
            const partDraw = partnerCanAccessPension ? draw * (1 - priR) : 0;
            deductProRata("pension", draw);
            const netDraw = getNetFromSpecificDraws(canAccessPension ? (priTargetGross + priDraw) : 0, partnerCanAccessPension ? (partTargetGross + partDraw) : 0) - totalTargetNet;
            if (!pclsTaken && primaryCumulativeTaxFreeDrawn < maxLsa && priDraw > 0) {
              primaryCumulativeTaxFreeDrawn += Math.min(priDraw * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
            }
            if (!partnerPclsTaken && partnerCumulativeTaxFreeDrawn < partnerMaxLsa && partDraw > 0) {
              partnerCumulativeTaxFreeDrawn += Math.min(partDraw * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
            }
            remainingNeeded = Math.max(0, remainingNeeded - Math.max(0, netDraw));
          }
        }
      }

      
      // Partner Mortality Inheritance
      if (profile.isCouplePlanning && !partnerDead && partnerAge >= (profile.partnerLifeExpectancyAge || 95)) {
        partnerDead = true;
        primaryPensionPot += partnerPensionPot;
        partnerPensionPot = 0;
        primaryIsaPot += partnerIsaPot;
        partnerIsaPot = 0;
        primaryCashGiaPot += partnerCashGiaPot;
        partnerCashGiaPot = 0;
      }

      const deflator = profile.adjustForInflation ? inflationFactor : 1.0;
      const totalPot = Math.max(0, pensionPot + isaPot + cashGiaPot);
      simPensionPots[sim][yr] = Math.round(pensionPot / deflator);
      simIsaPots[sim][yr] = Math.round(isaPot / deflator);
      simCashGiaPots[sim][yr] = Math.round(cashGiaPot / deflator);
      simTotalPots[sim][yr] = Math.round(totalPot / deflator);
      // Track whether this sim has ever had an unfunded shortfall
      // Once depleted, mark ALL subsequent years as failed (remainingNeeded = 1)
      if (isRetired && Math.round(remainingNeeded) >= 1 && depletedAtAge === null && age >= profile.targetRetirementAge) {
        depletedAtAge = age;
      }
      // If the sim has already depleted, persistently mark it as failed
      const effectiveRemaining = isRetired ? Math.round(remainingNeeded / deflator) : 0;
      simRemainingNeeded[sim][yr] = effectiveRemaining;
    }

    if (depletedAtAge !== null) {
      depletionAges.push(depletedAtAge);
    }
  }

  // Calculate age percentiles across simulations
  const currentYear = new Date().getFullYear();
  const agePercentiles: AgePercentiles[] = [];

  for (let yr = 0; yr < numYears; yr++) {
    const age = safeCurrentAge + yr;
    const year = currentYear + yr;
    const isRetired = age >= profile.targetRetirementAge;

    const totalsThisYr = simTotalPots.map((s) => s[yr]).sort((a, b) => a - b);
    const pensionsThisYr = simPensionPots.map((s) => s[yr]).sort((a, b) => a - b);
    const isasThisYr = simIsaPots.map((s) => s[yr]).sort((a, b) => a - b);
    const cashsThisYr = simCashGiaPots.map((s) => s[yr]).sort((a, b) => a - b);

    const survivalRates = (() => {
          let bothCount = 0;
          let incomeCount = 0;
          for (let sim = 0; sim < numSimulations; sim++) {
            const potOk = simTotalPots[sim][yr] > 100; // pot still has meaningful value
            const incomeOk = simRemainingNeeded[sim][yr] <= 0; // income needs met
            if (isRetired ? (potOk && incomeOk) : true) bothCount++;
            if (isRetired ? incomeOk : true) incomeCount++;
          }
          return {
            survivalRate: Math.round((bothCount / numSimulations) * 100),
            incomeSurvivalRate: Math.round((incomeCount / numSimulations) * 100),
          };
        })();

    agePercentiles.push({
      age,
      year,
      isRetired,
      p10TotalPot: Math.round(getPercentile(totalsThisYr, 10)),
      p25TotalPot: Math.round(getPercentile(totalsThisYr, 25)),
      p50TotalPot: Math.round(getPercentile(totalsThisYr, 50)),
      p75TotalPot: Math.round(getPercentile(totalsThisYr, 75)),
      p90TotalPot: Math.round(getPercentile(totalsThisYr, 90)),
      p50PensionPot: Math.round(getPercentile(pensionsThisYr, 50)),
      p50IsaPot: Math.round(getPercentile(isasThisYr, 50)),
      p50CashGiaPot: Math.round(getPercentile(cashsThisYr, 50)),
      survivalRate: survivalRates.survivalRate,
      incomeSurvivalRate: survivalRates.incomeSurvivalRate,
    });
  }

  // Success rates at benchmark ages
  const getSuccessRateForAge = (targetAge: number) => {
    const yrIndex = Math.min(numYears - 1, Math.max(0, targetAge - safeCurrentAge));
    return agePercentiles[yrIndex]?.survivalRate ?? 100;
  };

  const getIncomeSuccessRateForAge = (targetAge: number) => {
    const yrIndex = Math.min(numYears - 1, Math.max(0, targetAge - safeCurrentAge));
    return agePercentiles[yrIndex]?.incomeSurvivalRate ?? 100;
  };

  const retirementYrIndex = Math.min(numYears - 1, Math.max(0, profile.targetRetirementAge - safeCurrentAge));
  const endYrIndex = Math.max(0, numYears - 1);

  const retirementTotals = simTotalPots.map((s) => s[retirementYrIndex]).sort((a, b) => a - b);
  const endTotals = simTotalPots.map((s) => s[endYrIndex]).sort((a, b) => a - b);

  depletionAges.sort((a, b) => a - b);
  const medianDepletionAge = depletionAges.length > 0 ? getPercentile(depletionAges, 50) : undefined;

  return {
    params: {
      numSimulations,
      accumulationVolatility: customParams?.accumulationVolatility ?? 12.0,
      decumulationVolatility: customParams?.decumulationVolatility ?? 8.0,
      maxAge: effectiveMaxAge,
      marketScenario,
      stressedReturnDropPercent: customParams?.stressedReturnDropPercent ?? 2.0,
      crashDepthPercent: Math.round(getCrashDropForYearIndex(0) * 100),
      crashStartAge,
      crashDurationYears: crashDuration,
      crashYearDropsPercent: Array.from({ length: crashDuration }, (_, i) => Math.round(getCrashDropForYearIndex(i) * 100)),
      useCashBuffer: customParams?.useCashBuffer ?? false,
      cashBufferYears: customParams?.cashBufferYears ?? crashDuration,
    },
    agePercentiles,
    percentiles: agePercentiles.map((p) => ({
      ...p,
      p10: p.p10TotalPot,
      p25: p.p25TotalPot,
      p50: p.p50TotalPot,
      p75: p.p75TotalPot,
      p90: p.p90TotalPot,
    })),
    successRateTargetAge: getSuccessRateForAge(profile.targetRetirementAge || 85),
    successRateAge80: getSuccessRateForAge(80),
    successRateAge85: getSuccessRateForAge(85),
    incomeSuccessRateAge85: getIncomeSuccessRateForAge(85),
    successRateAge90: getSuccessRateForAge(90),
    successRate: getSuccessRateForAge(effectiveMaxAge),
    medianRetirementPot: Math.round(getPercentile(retirementTotals, 50)),
    p10RetirementPot: Math.round(getPercentile(retirementTotals, 10)),
    p90RetirementPot: Math.round(getPercentile(retirementTotals, 90)),
    medianEndPot: Math.round(getPercentile(endTotals, 50)),
    p10EndPot: Math.round(getPercentile(endTotals, 10)),
    p90EndPot: Math.round(getPercentile(endTotals, 90)),
    medianFinalWealth: Math.round(getPercentile(endTotals, 50)),
    p10FinalWealth: Math.round(getPercentile(endTotals, 10)),
    medianDepletionAge: medianDepletionAge ? Math.round(medianDepletionAge) : undefined,
  };
}


