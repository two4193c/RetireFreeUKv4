import { UserProfile, InvestmentPots, TaxCalculationResult, LumpSumTargetPot, LumpSumSplit } from '../types';
import { DEFAULT_PARTNER_POTS, DEFAULT_POTS, sanitizePots } from './defaultData';
import {
  PERSONAL_ALLOWANCE,
  PA_TAPER_THRESHOLD,
  PA_TAPER_CEILING,
  RUK_BASIC_RATE,
  RUK_BASIC_THRESHOLD,
  RUK_HIGHER_RATE,
  RUK_ADDITIONAL_THRESHOLD,
  RUK_ADDITIONAL_RATE,
  SCOT_STARTER_RATE,
  SCOT_STARTER_THRESHOLD,
  SCOT_BASIC_RATE,
  SCOT_BASIC_THRESHOLD,
  SCOT_INTERMEDIATE_RATE,
  SCOT_INTERMEDIATE_THRESHOLD,
  SCOT_HIGHER_RATE,
  SCOT_HIGHER_THRESHOLD,
  SCOT_ADVANCED_RATE,
  SCOT_ADVANCED_THRESHOLD,
  SCOT_TOP_RATE,
  EMPLOYER_NI_RATE,
  LSA_STANDARD_LIMIT,
  PENSION_ANNUAL_ALLOWANCE,
  ISA_ANNUAL_LIMIT,
  LISA_ANNUAL_LIMIT,
} from '../config/ukTaxRates';

/**
 * Lightweight, unified income tax calculation function for a given taxable gross amount.
 * Can be used by decumulation engines (e.g. projectionEngine binary search) and display components.
 */
export function computeIncomeTaxOnAmount(
  grossIncome: number,
  isScottish: boolean = false,
  customTaxBands?: UserProfile['customTaxBands']
): { tax: number; marginalRate: number } {
  if (grossIncome <= 0) return { tax: 0, marginalRate: 0 };

  const useOverrides = Boolean(customTaxBands?.enabled);
  const paValue = useOverrides ? (customTaxBands?.personalAllowance ?? PERSONAL_ALLOWANCE) : PERSONAL_ALLOWANCE;
  const paTaperThresh = useOverrides ? (customTaxBands?.paTaperThreshold ?? PA_TAPER_THRESHOLD) : PA_TAPER_THRESHOLD;

  // Calculate Personal Allowance with Taper (£1 for every £2 over taper threshold)
  let pa = paValue;
  if (grossIncome > paTaperThresh) {
    const reduction = Math.floor((grossIncome - paTaperThresh) / 2);
    pa = Math.max(0, paValue - reduction);
  }

  const taxableIncome = Math.max(0, grossIncome - pa);
  if (taxableIncome <= 0) return { tax: 0, marginalRate: 0 };

  let tax = 0;
  let marginalRate = 0;

  if (isScottish && !useOverrides) {
    if (taxableIncome <= SCOT_STARTER_THRESHOLD) {
      tax = taxableIncome * SCOT_STARTER_RATE;
      marginalRate = SCOT_STARTER_RATE * 100;
    } else if (taxableIncome <= SCOT_BASIC_THRESHOLD) {
      tax = (SCOT_STARTER_THRESHOLD * SCOT_STARTER_RATE) +
        ((taxableIncome - SCOT_STARTER_THRESHOLD) * SCOT_BASIC_RATE);
      marginalRate = SCOT_BASIC_RATE * 100;
    } else if (taxableIncome <= SCOT_INTERMEDIATE_THRESHOLD) {
      tax = (SCOT_STARTER_THRESHOLD * SCOT_STARTER_RATE) +
        ((SCOT_BASIC_THRESHOLD - SCOT_STARTER_THRESHOLD) * SCOT_BASIC_RATE) +
        ((taxableIncome - SCOT_BASIC_THRESHOLD) * SCOT_INTERMEDIATE_RATE);
      marginalRate = SCOT_INTERMEDIATE_RATE * 100;
    } else if (taxableIncome <= SCOT_HIGHER_THRESHOLD) {
      tax = (SCOT_STARTER_THRESHOLD * SCOT_STARTER_RATE) +
        ((SCOT_BASIC_THRESHOLD - SCOT_STARTER_THRESHOLD) * SCOT_BASIC_RATE) +
        ((SCOT_INTERMEDIATE_THRESHOLD - SCOT_BASIC_THRESHOLD) * SCOT_INTERMEDIATE_RATE) +
        ((taxableIncome - SCOT_INTERMEDIATE_THRESHOLD) * SCOT_HIGHER_RATE);
      marginalRate = SCOT_HIGHER_RATE * 100;
    } else if (taxableIncome <= SCOT_ADVANCED_THRESHOLD) {
      tax = (SCOT_STARTER_THRESHOLD * SCOT_STARTER_RATE) +
        ((SCOT_BASIC_THRESHOLD - SCOT_STARTER_THRESHOLD) * SCOT_BASIC_RATE) +
        ((SCOT_INTERMEDIATE_THRESHOLD - SCOT_BASIC_THRESHOLD) * SCOT_INTERMEDIATE_RATE) +
        ((SCOT_HIGHER_THRESHOLD - SCOT_INTERMEDIATE_THRESHOLD) * SCOT_HIGHER_RATE) +
        ((taxableIncome - SCOT_HIGHER_THRESHOLD) * SCOT_ADVANCED_RATE);
      marginalRate = SCOT_ADVANCED_RATE * 100;
    } else {
      tax = (SCOT_STARTER_THRESHOLD * SCOT_STARTER_RATE) +
        ((SCOT_BASIC_THRESHOLD - SCOT_STARTER_THRESHOLD) * SCOT_BASIC_RATE) +
        ((SCOT_INTERMEDIATE_THRESHOLD - SCOT_BASIC_THRESHOLD) * SCOT_INTERMEDIATE_RATE) +
        ((SCOT_HIGHER_THRESHOLD - SCOT_INTERMEDIATE_THRESHOLD) * SCOT_HIGHER_RATE) +
        ((SCOT_ADVANCED_THRESHOLD - SCOT_HIGHER_THRESHOLD) * SCOT_ADVANCED_RATE) +
        ((taxableIncome - SCOT_ADVANCED_THRESHOLD) * SCOT_TOP_RATE);
      marginalRate = SCOT_TOP_RATE * 100;
    }
  } else if (isScottish && useOverrides) {
    const sStarRate = (customTaxBands?.scotStarterRatePercent ?? 19) / 100;
    const sStarThresh = customTaxBands?.scotStarterThreshold ?? SCOT_STARTER_THRESHOLD;
    const sBasicRate = (customTaxBands?.scotBasicRatePercent ?? 20) / 100;
    const sBasicThresh = customTaxBands?.scotBasicThreshold ?? SCOT_BASIC_THRESHOLD;
    const sInterRate = (customTaxBands?.scotIntermediateRatePercent ?? 21) / 100;
    const sInterThresh = customTaxBands?.scotIntermediateThreshold ?? SCOT_INTERMEDIATE_THRESHOLD;
    const sHighRate = (customTaxBands?.scotHigherRatePercent ?? 42) / 100;
    const sHighThresh = customTaxBands?.scotHigherThreshold ?? SCOT_HIGHER_THRESHOLD;
    const sAdvRate = (customTaxBands?.scotAdvancedRatePercent ?? 45) / 100;
    const sAdvThresh = customTaxBands?.scotAdvancedThreshold ?? SCOT_ADVANCED_THRESHOLD;
    const sTopRate = (customTaxBands?.scotTopRatePercent ?? 48) / 100;

    if (taxableIncome <= sStarThresh) {
      tax = taxableIncome * sStarRate;
      marginalRate = sStarRate * 100;
    } else if (taxableIncome <= sBasicThresh) {
      tax = (sStarThresh * sStarRate) + ((taxableIncome - sStarThresh) * sBasicRate);
      marginalRate = sBasicRate * 100;
    } else if (taxableIncome <= sInterThresh) {
      tax = (sStarThresh * sStarRate) + ((sBasicThresh - sStarThresh) * sBasicRate) + ((taxableIncome - sBasicThresh) * sInterRate);
      marginalRate = sInterRate * 100;
    } else if (taxableIncome <= sHighThresh) {
      tax = (sStarThresh * sStarRate) + ((sBasicThresh - sStarThresh) * sBasicRate) + ((sInterThresh - sBasicThresh) * sInterRate) + ((taxableIncome - sInterThresh) * sHighRate);
      marginalRate = sHighRate * 100;
    } else if (taxableIncome <= sAdvThresh) {
      tax = (sStarThresh * sStarRate) + ((sBasicThresh - sStarThresh) * sBasicRate) + ((sInterThresh - sBasicThresh) * sInterRate) + ((sHighThresh - sInterThresh) * sHighRate) + ((taxableIncome - sHighThresh) * sAdvRate);
      marginalRate = sAdvRate * 100;
    } else {
      tax = (sStarThresh * sStarRate) + ((sBasicThresh - sStarThresh) * sBasicRate) + ((sInterThresh - sBasicThresh) * sInterRate) + ((sHighThresh - sInterThresh) * sHighRate) + ((sAdvThresh - sHighThresh) * sAdvRate) + ((taxableIncome - sAdvThresh) * sTopRate);
      marginalRate = sTopRate * 100;
    }
  } else {
    // Rest of UK (or Custom Overrides)
    const basicRate = useOverrides ? (customTaxBands?.basicRatePercent ?? 20) / 100 : RUK_BASIC_RATE;
    const basicThresh = useOverrides ? (customTaxBands?.basicRateThreshold ?? RUK_BASIC_THRESHOLD) : RUK_BASIC_THRESHOLD;
    const higherRate = useOverrides ? (customTaxBands?.higherRatePercent ?? 40) / 100 : RUK_HIGHER_RATE;
    const higherGrossLimit = useOverrides ? (customTaxBands?.higherRateThreshold ?? RUK_ADDITIONAL_THRESHOLD) : RUK_ADDITIONAL_THRESHOLD;
    const additionalRate = useOverrides ? (customTaxBands?.additionalRatePercent ?? 45) / 100 : RUK_ADDITIONAL_RATE;

    const higherTaxableMax = Math.max(0, higherGrossLimit - basicThresh);

    if (taxableIncome <= basicThresh) {
      tax = taxableIncome * basicRate;
      marginalRate = basicRate * 100;
    } else if (taxableIncome <= basicThresh + higherTaxableMax) {
      tax = (basicThresh * basicRate) + ((taxableIncome - basicThresh) * higherRate);
      marginalRate = higherRate * 100;
    } else {
      tax = (basicThresh * basicRate) +
        (higherTaxableMax * higherRate) +
        ((taxableIncome - (basicThresh + higherTaxableMax)) * additionalRate);
      marginalRate = additionalRate * 100;
    }
  }

  const taperCeiling = paTaperThresh + (paValue * 2);
  if (grossIncome > paTaperThresh && grossIncome <= taperCeiling) {
    marginalRate += (marginalRate / 2);
  }

  return { tax, marginalRate };
}

export function getPensionAccessAge(profile: UserProfile): number {
  if (profile.pensionAccessAge !== undefined && profile.pensionAccessAge !== null && !isNaN(profile.pensionAccessAge) && profile.pensionAccessAge > 0) {
    return profile.pensionAccessAge;
  }
  if (profile.protectedPensionAccessAge !== undefined && profile.protectedPensionAccessAge !== null && !isNaN(profile.protectedPensionAccessAge) && profile.protectedPensionAccessAge > 0) {
    return profile.protectedPensionAccessAge;
  }
  if (!profile.dateOfBirth) return 57;
  const dob = new Date(profile.dateOfBirth);
  if (isNaN(dob.getTime())) return 57;

  // Born before 6 April 1973 -> Normal Minimum Pension Age (NMPA) is 55
  // Born on or after 6 April 1973 -> NMPA increases to 57 starting 6 April 2028
  const cutoff = new Date('1973-04-06');
  return dob < cutoff ? 55 : 57;
}

export function getLumpSumTakeAge(profile: UserProfile): number {
  const accessAge = getPensionAccessAge(profile);
  if (profile.lumpSumTiming === 'custom' && profile.lumpSumCustomAge) {
    return Math.max(accessAge, profile.lumpSumCustomAge);
  }
  return accessAge;
}

export function allocateLumpSumToPots(
  lumpSumAmount: number,
  targetPot: LumpSumTargetPot | undefined,
  splits: LumpSumSplit[] | undefined
): {
  toIsa: number;
  toGia: number;
  toCashSavings: number;
  toCashGia: number;
  spentOrDebt: number;
} {
  let toIsa = 0;
  let toGia = 0;
  let toCashSavings = 0;
  let spentOrDebt = 0;

  if (targetPot === 'split' && splits && splits.length > 0) {
    let remaining = lumpSumAmount;
    splits.forEach((s) => {
      let allocated = 0;
      if (s.mode === 'percentage') {
        allocated = Math.round((s.value / 100) * lumpSumAmount);
      } else {
        allocated = Math.max(0, s.value);
      }
      allocated = Math.min(remaining, allocated);
      if (allocated <= 0) return;

      if (s.pot === 'stocks_and_shares_isa' || s.pot === 'cash_isa') {
        toIsa += allocated;
      } else if (s.pot === 'gia') {
        toGia += allocated;
      } else if (s.pot === 'cash_savings') {
        toCashSavings += allocated;
      } else if (s.pot === 'spend_clear_debt') {
        spentOrDebt += allocated;
      }
      remaining -= allocated;
    });
    if (remaining > 0) {
      toCashSavings += remaining;
    }
  } else {
    const pot = targetPot || 'stocks_and_shares_isa';
    if (pot === 'stocks_and_shares_isa' || pot === 'cash_isa') {
      toIsa += lumpSumAmount;
    } else if (pot === 'gia') {
      toGia += lumpSumAmount;
    } else if (pot === 'cash_savings') {
      toCashSavings += lumpSumAmount;
    } else if (pot === 'spend_clear_debt') {
      spentOrDebt += lumpSumAmount;
    } else {
      toIsa += lumpSumAmount;
    }
  }

  const toCashGia = toGia + toCashSavings;
  return { toIsa, toGia, toCashSavings, toCashGia, spentOrDebt };
}

export function calculateStandardNI(income: number): number {
  if (income <= 12570) return 0;
  let ni = 0;
  const band1 = Math.min(income - 12570, 50270 - 12570);
  ni += band1 * 0.08;
  if (income > 50270) {
    const band2 = income - 50270;
    ni += band2 * 0.02;
  }
  return ni;
}

export function getLsaLimit(profile: UserProfile): number {
  if (profile.lsaProtectionType === 'fixed_2014') return 375000;
  if (profile.lsaProtectionType === 'fixed_2016') return 312500;
  if (profile.lsaProtectionType === 'individual_2014') return 300000;
  if (profile.lsaProtectionType === 'individual_2016') return 280000;
  if (profile.lsaProtectionType === 'standard') return 268275;
  if (profile.lsaProtectionType === 'custom') {
    if (profile.customLsaAllowance !== undefined && profile.customLsaAllowance !== null && !isNaN(profile.customLsaAllowance) && profile.customLsaAllowance >= 0) {
      return profile.customLsaAllowance;
    }
    return 268275;
  }
  if (profile.customLsaAllowance !== undefined && profile.customLsaAllowance !== null && !isNaN(profile.customLsaAllowance) && profile.customLsaAllowance >= 0) {
    return profile.customLsaAllowance;
  }
  return 268275; // Standard UK 2024/25 Lump Sum Allowance limit
}

export function calculateMaxPcls(pensionBalance: number, profile: UserProfile) {
  const lsaLimit = getLsaLimit(profile);
  const pclsPercent = profile.pclsLumpSumPercent || 25;
  const uncappedPcls = pensionBalance * (pclsPercent / 100);
  const maxTaxFreeCash = Math.min(uncappedPcls, lsaLimit);
  const isCappedByLsa = uncappedPcls > lsaLimit;
  return {
    maxTaxFreeCash,
    lsaLimit,
    pclsPercent,
    isCappedByLsa,
  };
}

export function getPartnerPensionAccessAge(profile: UserProfile): number {
  if (profile.partnerPensionAccessAge !== undefined && profile.partnerPensionAccessAge !== null && !isNaN(profile.partnerPensionAccessAge) && profile.partnerPensionAccessAge > 0) {
    return profile.partnerPensionAccessAge;
  }
  if (profile.partnerProtectedPensionAccessAge !== undefined && profile.partnerProtectedPensionAccessAge !== null && !isNaN(profile.partnerProtectedPensionAccessAge) && profile.partnerProtectedPensionAccessAge > 0) {
    return profile.partnerProtectedPensionAccessAge;
  }
  if (profile.partnerDateOfBirth) {
    const dob = new Date(profile.partnerDateOfBirth);
    if (!isNaN(dob.getTime())) {
      const cutOff = new Date('1973-04-06');
      return dob < cutOff ? 55 : 57;
    }
  }
  const partnerAge = profile.partnerCurrentAge || profile.currentAge || 35;
  const partnerBirthYear = new Date().getFullYear() - partnerAge;
  return partnerBirthYear < 1971 ? 55 : 57;
}

export function getPartnerLumpSumTakeAge(profile: UserProfile): number {
  const accessAge = getPartnerPensionAccessAge(profile);
  if (profile.partnerLumpSumTiming === 'custom' && profile.partnerLumpSumCustomAge) {
    return Math.max(accessAge, profile.partnerLumpSumCustomAge);
  }
  return accessAge;
}

export function getPartnerLsaLimit(profile: UserProfile): number {
  if (profile.partnerLsaProtectionType === 'fixed_2014') return 375000;
  if (profile.partnerLsaProtectionType === 'fixed_2016') return 312500;
  if (profile.partnerLsaProtectionType === 'individual_2014') return 300000;
  if (profile.partnerLsaProtectionType === 'individual_2016') return 280000;
  if (profile.partnerLsaProtectionType === 'standard') return 268275;
  if (profile.partnerLsaProtectionType === 'custom') {
    if (profile.partnerCustomLsaAllowance !== undefined && profile.partnerCustomLsaAllowance !== null && !isNaN(profile.partnerCustomLsaAllowance) && profile.partnerCustomLsaAllowance >= 0) {
      return profile.partnerCustomLsaAllowance;
    }
    return 268275;
  }
  if (profile.partnerCustomLsaAllowance !== undefined && profile.partnerCustomLsaAllowance !== null && !isNaN(profile.partnerCustomLsaAllowance) && profile.partnerCustomLsaAllowance >= 0) {
    return profile.partnerCustomLsaAllowance;
  }
  return 268275;
}

export function calculatePartnerMaxPcls(pensionBalance: number, profile: UserProfile) {
  const lsaLimit = getPartnerLsaLimit(profile);
  const pclsPercent = profile.partnerPclsLumpSumPercent || 25;
  const uncappedPcls = pensionBalance * (pclsPercent / 100);
  const maxTaxFreeCash = Math.min(uncappedPcls, lsaLimit);
  const isCappedByLsa = uncappedPcls > lsaLimit;
  return {
    maxTaxFreeCash,
    lsaLimit,
    pclsPercent,
    isCappedByLsa,
  };
}

export function getProjectedPensionAtTakeAge(
  profile: UserProfile,
  pots: InvestmentPots,
  takeAge: number,
  isPartner: boolean = false
): number {
  const currentAge = isPartner ? (profile.partnerCurrentAge || profile.currentAge || 35) : profile.currentAge;
  
  let pensionPot = isPartner
    ? ((profile.partnerPots?.workplacePensionBalance ?? profile.partnerWorkplacePensionBalance ?? 25000) +
       (profile.partnerPots?.sippBalance ?? profile.partnerSippBalance ?? 10000))
    : (pots.workplacePensionBalance + pots.sippBalance);

  if (currentAge >= takeAge) {
    return Math.round(pensionPot);
  }

  const overrides = profile.potReturnOverrides;
  const useOverrides = Boolean(overrides?.enabled);
  const returnAccumulation = useOverrides && overrides.workplacePensionReturn
    ? overrides.workplacePensionReturn / 100
    : (profile.expectedInvestmentReturn || 6.0) / 100;

  const targetRetireAge = isPartner
    ? (profile.partnerTargetRetirementAge || profile.targetRetirementAge)
    : profile.targetRetirementAge;

  const activePots = isPartner ? (profile.partnerPots || pots) : pots;
  const taxRes = isPartner 
    ? calculatePartnerUKTax(profile, activePots) 
    : calculateUKTax(profile, pots);
  const totalAnnualContrib = taxRes.regularPensionContributionsAnnual ?? taxRes.totalPensionContributionsAnnual;

  for (let age = currentAge; age < takeAge; age++) {
    const isRetired = age >= targetRetireAge;
    const yearOffset = age - currentAge;
    const calendarYear = new Date().getFullYear() + yearOffset;

    // Incorporate one-off / custom pension contributions for this year
    const activeOneOffs = (profile.oneOffContributions || []).filter((c) => c.enabled && c.frequency !== 'regular_monthly');
    activeOneOffs.forEach((contrib) => {
      const cOwner = contrib.owner || 'primary';
      if (cOwner === 'partner' && !profile.isCouplePlanning) return;

      let contribYear: number | undefined;
      if (contrib.date) {
        contribYear = parseInt(contrib.date.split('-')[0], 10);
      }
      if (contribYear !== undefined && !isNaN(contribYear) && contribYear === calendarYear) {
        const isMatchOwner = isPartner ? cOwner === 'partner' : cOwner === 'primary';
        if (isMatchOwner) {
          const gross = contrib.grossAmount || 0;
          if (gross > 0) {
            if (contrib.targetPot === 'workplace_pension') {
              pensionPot += gross;
            } else if (contrib.targetPot === 'sipp') {
              const sippGross = contrib.sippContributionType === 'gross' ? gross : gross * 1.25;
              pensionPot += sippGross;
            }
          }
        }
      }
    });

    // Incorporate pot transfers into SIPP / workplace pension
    const activeTransfers = (profile.potTransfers || []).filter((t) => t.enabled);
    activeTransfers.forEach((t) => {
      const srcOwner = t.owner || 'primary';
      const dstOwner = t.destinationOwner || srcOwner;
      if ((srcOwner === 'partner' || dstOwner === 'partner') && !profile.isCouplePlanning) return;

      let tYear: number | undefined;
      if (t.transferDate) {
        tYear = parseInt(t.transferDate.split('-')[0], 10);
      } else if (t.transferAge !== undefined && t.transferAge > 0) {
        tYear = new Date().getFullYear() + (t.transferAge - currentAge);
      }
      if (tYear !== undefined && tYear === calendarYear) {
        const isMatchDst = isPartner ? dstOwner === 'partner' : dstOwner === 'primary';
        const srcIsPension = t.sourcePot === 'sipp' || t.sourcePot === 'workplace_pension';
        if (isMatchDst && ((t.destinationPot as string) === 'sipp' || (t.destinationPot as string) === 'workplace_pension')) {
          const added = ((t.destinationPot as string) === 'sipp' && !srcIsPension) ? (t.amount || 0) * 1.25 : (t.amount || 0);
          pensionPot += added;
        }
      }
    });

    const contribThisYear = isRetired ? 0 : totalAnnualContrib;

    pensionPot = pensionPot * (1 + returnAccumulation) + contribThisYear * (1 + returnAccumulation / 2);
  }

  return Math.round(pensionPot);
}

export function getProjectedPensionAtAccessAge(
  profile: UserProfile,
  pots: InvestmentPots,
  annualPensionContributionTotal: number
): number {
  const pensionAccessAge = getPensionAccessAge(profile);
  let pensionPot = pots.workplacePensionBalance + pots.sippBalance;

  if (profile.currentAge >= pensionAccessAge) {
    return Math.round(pensionPot);
  }

  const returnAccumulation = (profile.expectedInvestmentReturn || 6.0) / 100;

  for (let age = profile.currentAge; age < pensionAccessAge; age++) {
    // Existing pot earns full year return; ongoing monthly contributions earn half-year average return
    pensionPot = pensionPot * (1 + returnAccumulation) + annualPensionContributionTotal * (1 + returnAccumulation / 2);
  }

  return Math.round(pensionPot);
}

export function isCurrentTaxYearContribution(
  c: { enabled?: boolean; date?: string; age?: number; startAge?: number },
  ownerCurrentAge?: number,
  currentEvalAge?: number,
  evalCalYear?: number
): boolean {
  if (!c.enabled) return false;

  const targetEvalAge = currentEvalAge;
  const targetCalYear = evalCalYear ?? new Date().getFullYear();

  // If age or startAge is set on a one-off contribution:
  const cAge = c.startAge ?? c.age;
  if (cAge !== undefined && cAge > 0) {
    if (targetEvalAge !== undefined) {
      return cAge === targetEvalAge;
    }
  }

  // If date is set:
  if (c.date && c.date.trim() !== '') {
    const parts = c.date.split('-');
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const contribTaxYearStartYear = (month > 4 || (month === 4 && day >= 6)) ? year : year - 1;
        return contribTaxYearStartYear === targetCalYear;
      }
    } else if (parts.length >= 1) {
      const year = parseInt(parts[0], 10);
      if (!isNaN(year)) {
        return year === targetCalYear;
      }
    }
  }

  // Fallback: if no date and no age, include only if targetEvalAge matches ownerCurrentAge
  if (targetEvalAge !== undefined && ownerCurrentAge !== undefined) {
    return targetEvalAge === ownerCurrentAge;
  }

  return true;
}

export function calculateStandardIncomeTax(grossSalary: number, taxRegion?: string): number {
  if (grossSalary <= 0) return 0;

  let pa = PERSONAL_ALLOWANCE;
  if (grossSalary > PA_TAPER_THRESHOLD) {
    const reduction = Math.min(PERSONAL_ALLOWANCE, (grossSalary - PA_TAPER_THRESHOLD) / 2);
    pa = PERSONAL_ALLOWANCE - reduction;
  }

  const taxable = Math.max(0, grossSalary - pa);
  if (taxable <= 0) return 0;

  if (taxRegion === 'scotland') {
    let tax = 0;
    let rem = taxable;
    const b1 = Math.min(rem, SCOT_STARTER_THRESHOLD);
    tax += b1 * SCOT_STARTER_RATE;
    rem -= b1;

    if (rem > 0) {
      const b2 = Math.min(rem, SCOT_BASIC_THRESHOLD - SCOT_STARTER_THRESHOLD);
      tax += b2 * SCOT_BASIC_RATE;
      rem -= b2;
    }
    if (rem > 0) {
      const b3 = Math.min(rem, SCOT_INTERMEDIATE_THRESHOLD - SCOT_BASIC_THRESHOLD);
      tax += b3 * SCOT_INTERMEDIATE_RATE;
      rem -= b3;
    }
    if (rem > 0) {
      const b4 = Math.min(rem, SCOT_HIGHER_THRESHOLD - SCOT_INTERMEDIATE_THRESHOLD);
      tax += b4 * SCOT_HIGHER_RATE;
      rem -= b4;
    }
    if (rem > 0) {
      const b5 = Math.min(rem, SCOT_ADVANCED_THRESHOLD - SCOT_HIGHER_THRESHOLD);
      tax += b5 * SCOT_ADVANCED_RATE;
      rem -= b5;
    }
    if (rem > 0) {
      tax += rem * SCOT_TOP_RATE;
    }
    return tax;
  } else {
    let tax = 0;
    const basicPortion = Math.min(taxable, RUK_BASIC_THRESHOLD);
    tax += basicPortion * RUK_BASIC_RATE;

    const remainingAfterBasic = taxable - basicPortion;
    if (remainingAfterBasic > 0) {
      const higherPortion = Math.min(remainingAfterBasic, RUK_ADDITIONAL_THRESHOLD - RUK_BASIC_THRESHOLD);
      tax += Math.max(0, higherPortion) * RUK_HIGHER_RATE;

      const additionalPortion = remainingAfterBasic - higherPortion;
      if (additionalPortion > 0) {
        tax += additionalPortion * RUK_ADDITIONAL_RATE;
      }
    }
    return tax;
  }
}

export interface IncomeAggregation {
  grossSalary: number;
  taxableFixedIncome: number;
  dbPensionIncome: number;
  statePensionIncome: number;
  nonInvestmentTaxableIncome: number;
  investmentIncome: number;
  totalTaxableIncome: number;
}

export function aggregateIncome(
  profile: UserProfile,
  isPartner: boolean = false,
  evalAge?: number
): IncomeAggregation {
  const ownerTarget = isPartner ? 'partner' : 'primary';
  const ownerCurrentAge = isPartner ? (profile.partnerCurrentAge ?? profile.currentAge) : profile.currentAge;
  const ownerRetireAge = isPartner ? (profile.partnerTargetRetirementAge ?? profile.targetRetirementAge) : profile.targetRetirementAge;
  const currentEvalAge = evalAge ?? ownerCurrentAge;
  const isRetired = currentEvalAge >= ownerRetireAge;

  const grossSalary = isRetired ? 0 : (isPartner ? (profile.partnerGrossAnnualSalary || 0) : (profile.grossAnnualSalary || 0));

  let taxableFixedIncome = 0;
  (profile.fixedIncomeStreams || []).forEach((stream) => {
    if (stream.enabled === false) return;
    const streamOwner = stream.owner || 'primary';
    if (streamOwner !== ownerTarget) return;
    if (stream.type !== 'taxable') return;
    const start = stream.startAge ?? 0;
    const end = stream.endAge ?? 100;
    if (currentEvalAge >= start && currentEvalAge <= end) {
      taxableFixedIncome += stream.annualAmount || 0;
    }
  });

  let dbPensionIncome = 0;
  (profile.dbPensions || []).forEach((db) => {
    if (db.enabled === false) return;
    const dbOwner = db.owner || 'primary';
    if (dbOwner !== ownerTarget) return;
    const startAge = db.startAge ?? 60;
    if (currentEvalAge >= startAge) {
      dbPensionIncome += db.annualIncome || 0;
    }
  });

  let statePensionIncome = 0;
  const includeSp = isPartner ? profile.partnerIncludeStatePension : profile.includeStatePension;
  const spAge = isPartner ? (profile.partnerStatePensionAge ?? 67) : (profile.statePensionAge ?? 67);
  if (includeSp && currentEvalAge >= spAge) {
    statePensionIncome = isPartner
      ? (profile.partnerStatePensionAmountAnnual ?? profile.partnerFullStatePensionAmount ?? 11502)
      : (profile.statePensionAmountAnnual ?? profile.fullStatePensionAmount ?? 11502);
  }

  const nonInvestmentTaxableIncome = grossSalary + taxableFixedIncome + dbPensionIncome + statePensionIncome;
  const investmentIncome = 0; // Explicitly excluded from threshold income taper
  const totalTaxableIncome = nonInvestmentTaxableIncome + investmentIncome;

  return {
    grossSalary,
    taxableFixedIncome,
    dbPensionIncome,
    statePensionIncome,
    nonInvestmentTaxableIncome,
    investmentIncome,
    totalTaxableIncome,
  };
}

export function calculateUKTax(
  profile: UserProfile,
  pots: InvestmentPots,
  isPartner: boolean = false,
  evalAge?: number
): TaxCalculationResult {
  // Process active contributions for selected owner
  const ownerTarget = isPartner ? 'partner' : 'primary';
  const ownerCurrentAge = isPartner ? (profile.partnerCurrentAge ?? profile.currentAge) : profile.currentAge;
  const ownerRetireAge = isPartner ? (profile.partnerTargetRetirementAge ?? profile.targetRetirementAge) : profile.targetRetirementAge;
  const currentEvalAge = evalAge ?? ownerCurrentAge;
  const currentCalYear = new Date().getFullYear();
  const evalCalYear = currentCalYear + (currentEvalAge - ownerCurrentAge);

  const incomeAgg = aggregateIncome(profile, isPartner, evalAge);
  const grossSalary = incomeAgg.grossSalary;
  const gross = incomeAgg.nonInvestmentTaxableIncome;


  const activeContributions = (profile.oneOffContributions || []).filter((c) => {
    if (!c.enabled) return false;
    const cOwner = c.owner || 'primary';
    if (cOwner === 'partner' && !profile.isCouplePlanning) return false;
    return cOwner === ownerTarget;
  });

  let oneOffWorkplacePensionGross = 0;
  let oneOffSippGross = 0;
  let oneOffSippNet = 0;
  let oneOffSsIsa = 0;
  let oneOffCashIsa = 0;
  let oneOffLisa = 0;
  let oneOffGia = 0;
  let oneOffCashSavings = 0;

  let regularWorkplaceEmployeeAnnual = 0;
  let regularEmployerMatchAnnual = 0;
  let regularSippNetAnnual = 0;
  let regularSippGrossAnnual = 0;
  let regularSsIsaAnnual = 0;
  let regularCashIsaAnnual = 0;
  let regularLisaAnnual = 0;
  let regularGiaAnnual = 0;
  let regularCashSavingsAnnual = 0;

  activeContributions.forEach((c) => {
    const isRegular = c.frequency === 'regular_monthly';

    if (isRegular) {
      let startAge = c.startAge;
      if (startAge === undefined && c.date && c.date.trim() !== '') {
        const parts = c.date.split('-');
        if (parts.length >= 1) {
          const year = parseInt(parts[0], 10);
          if (!isNaN(year)) {
            startAge = ownerCurrentAge + (year - new Date().getFullYear());
          }
        }
      }
      const effectiveStartAge = startAge ?? ownerCurrentAge;
      const effectiveEndAge = c.endAge ?? ownerRetireAge;

      if (currentEvalAge >= effectiveStartAge && currentEvalAge <= effectiveEndAge && currentEvalAge < ownerRetireAge) {
        if (c.targetPot === 'workplace_pension') {
          if (c.workplaceContributionType === 'fixed') {
            regularWorkplaceEmployeeAnnual += (c.employeeMonthlyAmount ?? c.grossAmount ?? 0) * 12;
            regularEmployerMatchAnnual += (c.employerMonthlyAmount ?? 0) * 12;
          } else {
            regularWorkplaceEmployeeAnnual += gross * ((c.employeePercent ?? 5) / 100);
            regularEmployerMatchAnnual += gross * ((c.employerPercent ?? 3) / 100);
          }
        } else if (c.targetPot === 'sipp') {
          const rawAmt = (c.grossAmount || 0) * 12;
          if (c.sippContributionType === 'gross') {
            regularSippGrossAnnual += rawAmt;
            regularSippNetAnnual += rawAmt * 0.8;
          } else {
            // Default: Net out of pocket paid by user, grossed up by +25%
            regularSippNetAnnual += rawAmt;
            regularSippGrossAnnual += rawAmt * 1.25;
          }
        } else if (c.targetPot === 'stocks_and_shares_isa') {
          regularSsIsaAnnual += (c.grossAmount || 0) * 12;
        } else if (c.targetPot === 'cash_isa') {
          regularCashIsaAnnual += (c.grossAmount || 0) * 12;
        } else if (c.targetPot === 'lisa') {
          regularLisaAnnual += (c.grossAmount || 0) * 12;
        } else if (c.targetPot === 'gia') {
          regularGiaAnnual += (c.grossAmount || 0) * 12;
        } else if (c.targetPot === 'cash_savings') {
          regularCashSavingsAnnual += (c.grossAmount || 0) * 12;
        }
      }
    } else {
      if (!isCurrentTaxYearContribution(c, ownerCurrentAge, currentEvalAge, evalCalYear)) return;
      const rawAmt = c.grossAmount || 0;
      if (rawAmt <= 0) return;
      switch (c.targetPot) {
        case 'workplace_pension':
          oneOffWorkplacePensionGross += rawAmt;
          break;
        case 'sipp':
          if (c.sippContributionType === 'gross') {
            oneOffSippGross += rawAmt;
            oneOffSippNet += rawAmt * 0.8;
          } else {
            // Net out of pocket, grossed up by +25%
            oneOffSippNet += rawAmt;
            oneOffSippGross += rawAmt * 1.25;
          }
          break;
        case 'stocks_and_shares_isa':
          oneOffSsIsa += rawAmt;
          break;
        case 'cash_isa':
          oneOffCashIsa += rawAmt;
          break;
        case 'lisa':
          oneOffLisa += rawAmt;
          break;
        case 'gia':
          oneOffGia += rawAmt;
          break;
        case 'cash_savings':
          oneOffCashSavings += rawAmt;
          break;
      }
    }
  });

  // Incorporate pot transfers for evaluated tax year
  const activeTransfers = (profile.potTransfers || []).filter((t) => {
    if (!t.enabled) return false;
    const dstOwner = t.destinationOwner || t.owner || 'primary';
    if (dstOwner === 'partner' && !profile.isCouplePlanning) return false;
    return dstOwner === ownerTarget;
  });

  activeTransfers.forEach((t) => {
    let tYear: number | undefined;
    if (t.transferDate) {
      tYear = parseInt(t.transferDate.split('-')[0], 10);
    } else if (t.transferAge !== undefined && t.transferAge > 0) {
      tYear = currentCalYear + (t.transferAge - ownerCurrentAge);
    }

    if (tYear !== undefined && !isNaN(tYear) && tYear === evalCalYear) {
      const rawAmt = t.amount || 0;
      if (rawAmt <= 0) return;

      switch (t.destinationPot) {
        case 'workplace_pension':
          oneOffWorkplacePensionGross += rawAmt;
          break;
        case 'sipp':
          // Net transfer into SIPP grossed up by +25% (£19,000 net -> £23,750 gross in SIPP)
          oneOffSippNet += rawAmt;
          oneOffSippGross += rawAmt * 1.25;
          break;
        case 'stocks_and_shares_isa':
          oneOffSsIsa += rawAmt;
          break;
        case 'cash_isa':
          oneOffCashIsa += rawAmt;
          break;
        case 'lisa':
          oneOffLisa += rawAmt;
          break;
        case 'gia':
          oneOffGia += rawAmt;
          break;
        case 'cash_savings':
          oneOffCashSavings += rawAmt;
          break;
      }
    }
  });

  const totalOneOffPensionGross = oneOffWorkplacePensionGross + oneOffSippGross;
  const totalOneOffIsaGross = oneOffSsIsa + oneOffCashIsa + oneOffLisa;

  // Calculate annual workplace pension employee contribution
  const hasWorkplaceInActive = activeContributions.some((c) => {
    if (c.frequency !== 'regular_monthly' || c.targetPot !== 'workplace_pension') return false;
    let startAge = c.startAge;
    if (startAge === undefined && c.date && c.date.trim() !== '') {
      const parts = c.date.split('-');
      if (parts.length >= 1) {
        const year = parseInt(parts[0], 10);
        if (!isNaN(year)) startAge = ownerCurrentAge + (year - new Date().getFullYear());
      }
    }
    const effectiveStartAge = startAge ?? ownerCurrentAge;
    const effectiveEndAge = c.endAge ?? ownerRetireAge;
    return currentEvalAge >= effectiveStartAge && currentEvalAge <= effectiveEndAge && currentEvalAge < ownerRetireAge;
  });

  let workplaceEmployeeAnnual = regularWorkplaceEmployeeAnnual;
  let employerMatchAnnual = regularEmployerMatchAnnual;

  if (!hasWorkplaceInActive && currentEvalAge < ownerRetireAge) {
    if (pots.workplacePensionMonthlyEmployeeType === 'percent') {
      workplaceEmployeeAnnual += gross * ((pots.workplacePensionMonthlyEmployee || 0) / 100);
    } else {
      workplaceEmployeeAnnual += (pots.workplacePensionMonthlyEmployee || 0) * 12;
    }
    employerMatchAnnual += gross * ((pots.employerMatchPercentage || 0) / 100);
  }

  // Include baseline pot monthly contributions if pre-retirement
  if (currentEvalAge < ownerRetireAge) {
    regularSippNetAnnual += (pots.sippMonthlyContribution || 0) * 12;
    regularSippGrossAnnual += (pots.sippMonthlyContribution || 0) * 12 * 1.25;

    regularSsIsaAnnual += (pots.stocksAndSharesIsaMonthlyContribution || 0) * 12;
    regularCashIsaAnnual += (pots.cashIsaMonthlyContribution || 0) * 12;
    if (currentEvalAge < 50) {
      regularLisaAnnual += (pots.lisaMonthlyContribution || 0) * 12;
    }
    regularGiaAnnual += (pots.giaMonthlyContribution || 0) * 12;
    regularCashSavingsAnnual += (pots.cashSavingsMonthlyContribution || 0) * 12;
  }

  const sippNetAnnual = regularSippNetAnnual + oneOffSippNet;
  const grossSippAnnual = regularSippGrossAnnual + oneOffSippGross;

  // Calculate ISA & LISA annual contributions
  const ssIsaAnnual = regularSsIsaAnnual + oneOffSsIsa;
  const cashIsaAnnual = regularCashIsaAnnual + oneOffCashIsa;
  const lisaAnnual = regularLisaAnnual + oneOffLisa;
  const giaAnnual = regularGiaAnnual + oneOffGia;
  const cashSavingsAnnual = regularCashSavingsAnnual + oneOffCashSavings;

  const lisaLimit = profile.customTaxBands?.enabled 
    ? (profile.customTaxBands.lisaAnnualAllowance ?? LISA_ANNUAL_LIMIT)
    : LISA_ANNUAL_LIMIT;

  const lisaEligibleAge = currentEvalAge < 50;
  const totalIsaAnnual = ssIsaAnnual + cashIsaAnnual + lisaAnnual;
  const lisaBonusAnnual = lisaEligibleAge ? Math.min(lisaAnnual, lisaLimit) * 0.25 : 0;

  let effectiveGross = gross;
  let salarySacrificeNicSavedEmployee = 0;
  let salarySacrificeNicSavedEmployer = 0;

  // Total workplace pension employee gross contribution including one-off
  const totalWorkplacePensionGross = workplaceEmployeeAnnual + oneOffWorkplacePensionGross;

  // NI relief on salary sacrifice
  const niReliefEligibleSacrifice = profile.pensionContributionMethod === 'salary_sacrifice'
    ? totalWorkplacePensionGross
    : 0;

  // Handle Salary Sacrifice
  if (profile.pensionContributionMethod === 'salary_sacrifice') {
    effectiveGross = Math.max(0, gross - totalWorkplacePensionGross);
    
    // Calculate NI savings on salary sacrificed
    const niOnGross = calculateStandardNI(gross);
    const niOnGrossAfterSacrifice = calculateStandardNI(Math.max(0, gross - niReliefEligibleSacrifice));
    salarySacrificeNicSavedEmployee = Math.max(0, niOnGross - niOnGrossAfterSacrifice);

    salarySacrificeNicSavedEmployer = niReliefEligibleSacrifice * EMPLOYER_NI_RATE;
  }

  const totalEmployeePensionGross = totalWorkplacePensionGross + grossSippAnnual;
  const totalPensionContributionsAnnual = totalEmployeePensionGross + employerMatchAnnual;

  // Adjusted Net Income for Personal Allowance Tapering
  // ANI = Taxable Income - Gross Personal Pension Contributions (Relief at source grossed up)
  const isNetPayOrSacrifice = profile.pensionContributionMethod === 'salary_sacrifice' || profile.pensionContributionMethod === 'net_pay';
  const taxableIncomeBase = isNetPayOrSacrifice ? Math.max(0, gross - totalWorkplacePensionGross) : gross;
  // Deduct SIPP gross contributions (and workplace gross contributions if relief at source) to compute Adjusted Net Income
  const grossPensionReliefAtSourceToDeduct = profile.pensionContributionMethod === 'relief_at_source'
    ? (totalWorkplacePensionGross + grossSippAnnual)
    : grossSippAnnual;
  
  const adjustedNetIncome = Math.max(0, taxableIncomeBase - grossPensionReliefAtSourceToDeduct);

  // Personal Allowance Taper (£12,570 reduced by £1 for every £2 over £100,000)
  let personalAllowance = 12570;
  if (adjustedNetIncome > 100000) {
    const reduction = Math.min(12570, (adjustedNetIncome - 100000) / 2);
    personalAllowance = 12570 - reduction;
  }

  // Marriage Allowance Logic (M9)
  let marriageAllowanceTaxCredit = 0;
  if (profile.isCouplePlanning && profile.enableMarriageAllowance) {
    // For the person currently being evaluated, use their simulated adjustedNetIncome.
    // For the other person, we only have their static profile gross income.
    const priIncome = !isPartner ? adjustedNetIncome : (profile.grossAnnualSalary || 0);
    const partIncome = isPartner ? adjustedNetIncome : (profile.partnerGrossAnnualSalary || 0);
    
    const priIsScot = profile.taxRegion === 'scotland';
    const partIsScot = (profile.partnerTaxRegion || profile.taxRegion) === 'scotland';
    
    // Limits
    const priReceiverLimit = 12570 + (priIsScot ? SCOT_INTERMEDIATE_THRESHOLD : RUK_BASIC_THRESHOLD);
    const partReceiverLimit = 12570 + (partIsScot ? SCOT_INTERMEDIATE_THRESHOLD : RUK_BASIC_THRESHOLD);

    const isPriGiver = priIncome <= 12570 && partIncome > 12570 && partIncome <= partReceiverLimit;
    const isPartGiver = partIncome <= 12570 && priIncome > 12570 && priIncome <= priReceiverLimit;

    if (isPartner && isPartGiver) {
      personalAllowance = Math.max(0, personalAllowance - 1260);
    } else if (!isPartner && isPriGiver) {
      personalAllowance = Math.max(0, personalAllowance - 1260);
    } else if (isPartner && isPriGiver) {
      marriageAllowanceTaxCredit = 252;
    } else if (!isPartner && isPartGiver) {
      marriageAllowanceTaxCredit = 252;
    }
  }

  // Check 60% Tax Trap (£100k - £125,140)
  const is60PercentTaxTrap = taxableIncomeBase > 100000 && adjustedNetIncome > 100000;
  const taxTrapAmountInBracket = is60PercentTaxTrap
    ? Math.min(adjustedNetIncome - 100000, 25140)
    : 0;
  
  // Recommended contribution to clear 60% tax trap
  const recommendedTaxTrapPensionContribution = is60PercentTaxTrap
    ? adjustedNetIncome - 100000
    : 0;

  const grossRasToExtendBand = profile.pensionContributionMethod === 'relief_at_source'
    ? (totalWorkplacePensionGross + grossSippAnnual)
    : grossSippAnnual;

  // Extract Custom Tax Bands with fallbacks to global constants
  const cb = profile.customTaxBands;
  const cEnabled = cb?.enabled;

  const scotStarterThresh = cEnabled && cb.scotStarterThreshold != null ? cb.scotStarterThreshold : SCOT_STARTER_THRESHOLD;
  const scotBasicThresh = cEnabled && cb.scotBasicThreshold != null ? cb.scotBasicThreshold : SCOT_BASIC_THRESHOLD;
  const scotIntThresh = cEnabled && cb.scotIntermediateThreshold != null ? cb.scotIntermediateThreshold : SCOT_INTERMEDIATE_THRESHOLD;
  const scotHigherThresh = cEnabled && cb.scotHigherThreshold != null ? cb.scotHigherThreshold : SCOT_HIGHER_THRESHOLD;
  const scotAdvThresh = cEnabled && cb.scotAdvancedThreshold != null ? cb.scotAdvancedThreshold : SCOT_ADVANCED_THRESHOLD;

  const scotStarterRate = cEnabled && cb.scotStarterRatePercent != null ? cb.scotStarterRatePercent / 100 : SCOT_STARTER_RATE;
  const scotBasicRate = cEnabled && cb.scotBasicRatePercent != null ? cb.scotBasicRatePercent / 100 : SCOT_BASIC_RATE;
  const scotIntRate = cEnabled && cb.scotIntermediateRatePercent != null ? cb.scotIntermediateRatePercent / 100 : SCOT_INTERMEDIATE_RATE;
  const scotHigherRate = cEnabled && cb.scotHigherRatePercent != null ? cb.scotHigherRatePercent / 100 : SCOT_HIGHER_RATE;
  const scotAdvRate = cEnabled && cb.scotAdvancedRatePercent != null ? cb.scotAdvancedRatePercent / 100 : SCOT_ADVANCED_RATE;
  const scotTopRate = cEnabled && cb.scotTopRatePercent != null ? cb.scotTopRatePercent / 100 : SCOT_TOP_RATE;

  const rukBasicThresh = cEnabled && cb.basicRateThreshold != null ? cb.basicRateThreshold : RUK_BASIC_THRESHOLD;
  const rukAddThresh = cEnabled && cb.higherRateThreshold != null ? cb.higherRateThreshold : RUK_ADDITIONAL_THRESHOLD;

  const rukBasicRate = cEnabled && cb.basicRatePercent != null ? cb.basicRatePercent / 100 : RUK_BASIC_RATE;
  const rukHigherRate = cEnabled && cb.higherRatePercent != null ? cb.higherRatePercent / 100 : RUK_HIGHER_RATE;
  const rukAddRate = cEnabled && cb.additionalRatePercent != null ? cb.additionalRatePercent / 100 : RUK_ADDITIONAL_RATE;

  // Calculate Income Tax
  let totalIncomeTax = 0;
  let marginalTaxRate = 20;

  const taxable = Math.max(0, taxableIncomeBase - personalAllowance);

  if (profile.taxRegion === 'scotland') {
    if (taxable <= 0) {
      totalIncomeTax = 0;
      marginalTaxRate = 0;
    } else {
      let rem = taxable;
      const b1 = Math.min(rem, scotStarterThresh);
      totalIncomeTax += b1 * scotStarterRate;
      rem -= b1;

      if (rem > 0) {
        // Basic band extended by RAS
        const basicWidth = (scotBasicThresh - scotStarterThresh) + grossRasToExtendBand;
        const b2 = Math.min(rem, basicWidth);
        totalIncomeTax += b2 * scotBasicRate;
        rem -= b2;
      }
      if (rem > 0) {
        const b3 = Math.min(rem, scotIntThresh - scotBasicThresh);
        totalIncomeTax += b3 * scotIntRate;
        rem -= b3;
      }
      if (rem > 0) {
        const b4 = Math.min(rem, scotHigherThresh - scotIntThresh);
        totalIncomeTax += b4 * scotHigherRate;
        rem -= b4;
      }
      if (rem > 0) {
        // Advanced Rate band
        const b5 = Math.min(rem, scotAdvThresh - scotHigherThresh);
        totalIncomeTax += b5 * scotAdvRate;
        rem -= b5;
      }
      if (rem > 0) {
        totalIncomeTax += rem * scotTopRate;
      }

      // Scottish Top Rate starts when taxable income > Advanced Threshold
      if (taxable > (scotAdvThresh + grossRasToExtendBand)) marginalTaxRate = scotTopRate * 100;
      else if (is60PercentTaxTrap) marginalTaxRate = (scotAdvRate * 100) + 22.5; // PA clawback approx
      else if (taxable > (scotHigherThresh + grossRasToExtendBand)) marginalTaxRate = scotAdvRate * 100;
      else if (taxable > (scotIntThresh + grossRasToExtendBand)) marginalTaxRate = scotHigherRate * 100;
      else if (taxable > (scotBasicThresh + grossRasToExtendBand)) marginalTaxRate = scotIntRate * 100;
      else marginalTaxRate = scotBasicRate * 100;
    }
  } else {
    // Rest of UK (England, NI, Wales)
    const basicRateBandWidth = rukBasicThresh + grossRasToExtendBand;

    if (taxable <= 0) {
      totalIncomeTax = 0;
      marginalTaxRate = 0;
    } else {
      const basicPortion = Math.min(taxable, basicRateBandWidth);
      totalIncomeTax += basicPortion * rukBasicRate;

      const remainingAfterBasic = taxable - basicPortion;
      if (remainingAfterBasic > 0) {
        const higherPortion = Math.min(remainingAfterBasic, rukAddThresh - rukBasicThresh);
        totalIncomeTax += Math.max(0, higherPortion) * rukHigherRate;

        const additionalPortion = remainingAfterBasic - higherPortion;
        if (additionalPortion > 0) {
          totalIncomeTax += additionalPortion * rukAddRate;
        }
      }

      if (taxable > (basicRateBandWidth + (rukAddThresh - rukBasicThresh))) marginalTaxRate = rukAddRate * 100;
      else if (is60PercentTaxTrap) marginalTaxRate = (rukHigherRate * 100) + 20; // 60% effective
      else if (taxable > basicRateBandWidth) marginalTaxRate = rukHigherRate * 100;
      else marginalTaxRate = rukBasicRate * 100;
    }
  }

  totalIncomeTax = Math.max(0, totalIncomeTax - marriageAllowanceTaxCredit);

  // Calculate National Insurance
  // Salary sacrifice NI relief is capped at the first £2,000 of sacrificed salary
  const niTaxableIncome = profile.pensionContributionMethod === 'salary_sacrifice'
    ? Math.max(0, gross - niReliefEligibleSacrifice)
    : gross;
  const totalNationalInsurance = calculateStandardNI(niTaxableIncome);

  // Net Take-Home Pay
  const grossPayAfterSalarySacrifice = effectiveGross;
  const netPayBeforeOutgoings = grossPayAfterSalarySacrifice - totalIncomeTax - totalNationalInsurance;
  
  const netOutgoings = sippNetAnnual + totalIsaAnnual + giaAnnual + cashSavingsAnnual;
  const netTakeHomePay = Math.max(0, netPayBeforeOutgoings - netOutgoings);

  // Total Pension Tax Relief Gained across all channels
  const taxWithoutPension = calculateStandardIncomeTax(gross, profile.taxRegion);
  const totalIncomeTaxSaved = Math.max(0, taxWithoutPension - totalIncomeTax);

  let pensionBasicRateTaxRelief = 0;
  let pensionHigherRateTaxReliefClaimable = 0;
  let totalPensionTaxRelief = 0;

  if (profile.pensionContributionMethod === 'relief_at_source') {
    pensionBasicRateTaxRelief = (totalWorkplacePensionGross + grossSippAnnual) * 0.20;
    pensionHigherRateTaxReliefClaimable = Math.max(0, totalIncomeTaxSaved - pensionBasicRateTaxRelief);
    totalPensionTaxRelief = pensionBasicRateTaxRelief + pensionHigherRateTaxReliefClaimable;
  } else if (profile.pensionContributionMethod === 'salary_sacrifice') {
    const taxWithoutWorkplace = calculateStandardIncomeTax(gross - totalWorkplacePensionGross, profile.taxRegion);
    const workplaceIncomeTaxSaved = Math.max(0, taxWithoutPension - taxWithoutWorkplace);
    pensionBasicRateTaxRelief = grossSippAnnual * 0.20;
    const sippTaxSaved = Math.max(0, totalIncomeTaxSaved - workplaceIncomeTaxSaved);
    pensionHigherRateTaxReliefClaimable = Math.max(0, sippTaxSaved - pensionBasicRateTaxRelief);
    totalPensionTaxRelief = workplaceIncomeTaxSaved + salarySacrificeNicSavedEmployee + pensionBasicRateTaxRelief + pensionHigherRateTaxReliefClaimable;
  } else {
    // net_pay
    const taxWithoutWorkplace = calculateStandardIncomeTax(gross - totalWorkplacePensionGross, profile.taxRegion);
    const workplaceIncomeTaxSaved = Math.max(0, taxWithoutPension - taxWithoutWorkplace);
    pensionBasicRateTaxRelief = grossSippAnnual * 0.20;
    const sippTaxSaved = Math.max(0, totalIncomeTaxSaved - workplaceIncomeTaxSaved);
    pensionHigherRateTaxReliefClaimable = Math.max(0, sippTaxSaved - pensionBasicRateTaxRelief);
    totalPensionTaxRelief = workplaceIncomeTaxSaved + pensionBasicRateTaxRelief + pensionHigherRateTaxReliefClaimable;
  }

  // Allowances & Pension Cap Checks
  const eligibleEarnings = Math.max(3600, grossSalary);

  // Threshold Income Test (£200,000): Taxable earnings minus member pension contributions
  const thresholdIncome = Math.max(0, gross - totalWorkplacePensionGross - grossSippAnnual);
  
  // Adjusted Income Test (£260,000): Threshold Income plus all employer/member pension contributions.
  // HMRC rule: SIPP contributions (grossSippAnnual) reduce threshold income but must be added back
  // to adjustedIncome - member pension contributions must NOT reduce Adjusted Income.
  const adjustedIncome = thresholdIncome + totalWorkplacePensionGross + grossSippAnnual + employerMatchAnnual;

  const hasTriggeredMpaa = isPartner ? profile.partnerHasTriggeredMpaa : profile.hasTriggeredMpaa;
  const carryForward = isPartner ? (profile.partnerCarryForwardAllowance || 0) : (profile.carryForwardAllowance || 0);

  const basePensionAnnualAllowance = profile.customTaxBands?.enabled
    ? (profile.customTaxBands.pensionAnnualAllowance ?? PENSION_ANNUAL_ALLOWANCE)
    : PENSION_ANNUAL_ALLOWANCE;

  let pensionAnnualAllowanceLimit = hasTriggeredMpaa ? 10000 : (basePensionAnnualAllowance + carryForward);
  let isTaperedAnnualAllowance = false;
  let taperedReduction = 0;

  // Annual Allowance Tapering: Applies ONLY IF Threshold Income > £200,000 AND Adjusted Income > £260,000 AND user has NOT triggered MPAA
  if (!hasTriggeredMpaa && thresholdIncome > 200000 && adjustedIncome > 260000) {
    isTaperedAnnualAllowance = true;
    const maxReduction = Math.max(0, basePensionAnnualAllowance - 10000);
    taperedReduction = Math.min(maxReduction, Math.floor((adjustedIncome - 260000) / 2));
    pensionAnnualAllowanceLimit = Math.max(10000, basePensionAnnualAllowance - taperedReduction) + carryForward;
  }

  const pensionAnnualAllowanceUsed = totalPensionContributionsAnnual;
  const pensionAnnualAllowanceRemaining = Math.max(0, pensionAnnualAllowanceLimit - pensionAnnualAllowanceUsed);
  
  // HMRC Rule: Employer contributions are NOT capped by 100% of the employee's relevant UK earnings.
  // ONLY employee/personal contributions are capped by 100% of earnings. Both share the AA.
  // Under salary sacrifice, the employee's contribution is treated as an employer contribution.
  const eligibleEmployeePensionGross = profile.pensionContributionMethod === 'salary_sacrifice'
    ? grossSippAnnual
    : totalEmployeePensionGross;
  const exceedsEligibleIncome = eligibleEmployeePensionGross > eligibleEarnings;
  const actualPensionAllowance = pensionAnnualAllowanceLimit;
  const actualPensionAllowanceRemaining = pensionAnnualAllowanceRemaining;
  const exceedsAnnualAllowanceOnly = pensionAnnualAllowanceUsed > pensionAnnualAllowanceLimit && !exceedsEligibleIncome;

  const isaAllowanceLimit = profile.customTaxBands?.enabled
    ? (profile.customTaxBands.isaAnnualAllowance ?? ISA_ANNUAL_LIMIT)
    : ISA_ANNUAL_LIMIT;
  const isaAllowanceUsed = totalIsaAnnual;
  const isaAllowanceRemaining = Math.max(0, isaAllowanceLimit - isaAllowanceUsed);

  const lisaAllowanceLimit = profile.customTaxBands?.enabled 
    ? (profile.customTaxBands.lisaAnnualAllowance ?? LISA_ANNUAL_LIMIT)
    : LISA_ANNUAL_LIMIT;
  const lisaAllowanceUsed = lisaAnnual;

  // PCLS & NMPA calculations
  const totalCurrentPension = pots.workplacePensionBalance + pots.sippBalance;
  // Use regular pension contributions for ongoing annual projections
  const annualPensionContributionTotal = regularWorkplaceEmployeeAnnual + regularEmployerMatchAnnual + regularSippGrossAnnual;
  const projectedPensionAtAccessAge = getProjectedPensionAtAccessAge(profile, pots, annualPensionContributionTotal);
  const { maxTaxFreeCash: maxTaxFreeCashCurrentBalance } = calculateMaxPcls(totalCurrentPension, profile);
  const { maxTaxFreeCash: maxTaxFreeCashAtAccessAge } = calculateMaxPcls(projectedPensionAtAccessAge, profile);
  const lsaLimit = getLsaLimit(profile);
  const pensionAccessAge = getPensionAccessAge(profile);
  const isNmpaRestricted = pensionAccessAge === 57;
  const isRetirementBeforeAccessAge = profile.targetRetirementAge < pensionAccessAge;

  // HMRC PCLS Recycling Rule Check (Schedule 29 Finance Act 2004 & HMRC PTM133800)
  // Recycling only occurs if:
  // 1. Upfront tax-free lump sum (PCLS) > £7,500 is taken.
  // 2. There is a SIGNIFICANT INCREASE (>30% of PCLS and >£7,500) in pension contributions resulting from the PCLS.
  // NOTE: Maintaining normal, pre-existing, routine workplace pension contributions paid from normal salary
  // does NOT constitute recycling because there is no "significant increase" resulting from the lump sum (PTM133800).
  const isUpfrontPcls = profile.takeLumpSumAtStart ?? false;
  const pclsLumpSumValue = Math.round(maxTaxFreeCashCurrentBalance);
  
  let isPclsRecyclingRisk = false;
  let pclsRecyclingDetails: { pclsAmount: number; annualContributions: number; threshold: number; recyclingReason: string } | undefined = undefined;

  if (isUpfrontPcls && pclsLumpSumValue > 7500) {
    const recyclingThreshold = Math.round(pclsLumpSumValue * 0.3);

    // Additional one-off pension contributions in the current tax year window beyond baseline routine salary contributions
    const totalIncreasedPensionContributions = totalOneOffPensionGross;

    if (totalIncreasedPensionContributions > recyclingThreshold) {
      isPclsRecyclingRisk = true;
      pclsRecyclingDetails = {
        pclsAmount: pclsLumpSumValue,
        annualContributions: totalIncreasedPensionContributions,
        threshold: recyclingThreshold,
        recyclingReason: `HMRC Schedule 29 rules flag a potential PCLS recycling risk because you are making £${totalIncreasedPensionContributions.toLocaleString()} of additional one-off pension contributions in the PCLS extraction window. This exceeds 30% of your PCLS (£${recyclingThreshold.toLocaleString()}) and £7,500. Standard pre-existing routine workplace pension contributions from normal salary are exempt, but direct re-contributions or new lump-sum top-ups trigger unauthorised payment tax charges up to 55%.`,
      };
    }
  }

  // Personal Savings Allowance (PSA) & Savings Interest Tax Calculation
  const cashSavingsRate = ((profile.potReturnOverrides?.cashSavingsReturn ?? 3.5) / 100);
  const savingsInterestEarned = Math.round((pots.cashSavingsBalance || 0) * cashSavingsRate);
  const psaResult = calculatePSAAndSavingsTax(
    taxableIncomeBase,
    savingsInterestEarned,
    profile.taxRegion === 'scotland',
    taxableIncomeBase,
    Math.max(0, personalAllowance - taxableIncomeBase) // unused PA
  );

  return {
    grossIncome: gross,
    effectiveGrossIncomeAfterSacrifice: effectiveGross,
    personalAllowance,
    adjustedNetIncome,
    totalIncomeTax,
    totalNationalInsurance,
    netTakeHomePay,
    marginalTaxRate,
    totalPensionContributionsAnnual,
    regularPensionContributionsAnnual: workplaceEmployeeAnnual + employerMatchAnnual + regularSippGrossAnnual,
    employeePensionContributionsAnnual: totalWorkplacePensionGross + sippNetAnnual,
    employerPensionContributionsAnnual: employerMatchAnnual,
    pensionBasicRateTaxRelief,
    pensionHigherRateTaxReliefClaimable,
    totalPensionTaxRelief,
    salarySacrificeNicSavedEmployee,
    salarySacrificeNicSavedEmployer,
    totalIsaContributionsAnnual: totalIsaAnnual,
    regularIsaContributionsAnnual: regularSsIsaAnnual + regularCashIsaAnnual + regularLisaAnnual,
    regularSsIsaContributionsAnnual: regularSsIsaAnnual,
    regularCashIsaContributionsAnnual: regularCashIsaAnnual,
    regularLisaContributionsAnnual: regularLisaAnnual,
    lisaGovernmentBonusAnnual: lisaBonusAnnual,
    lisaAllowanceRemaining: Math.max(0, lisaAllowanceLimit - lisaAnnual),
    totalCashGiaContributionsAnnual: giaAnnual + cashSavingsAnnual,
    regularCashGiaContributionsAnnual: regularGiaAnnual + regularCashSavingsAnnual,
    regularGiaContributionsAnnual: regularGiaAnnual,
    regularCashSavingsContributionsAnnual: regularCashSavingsAnnual,
    is60PercentTaxTrap,
    taxTrapAmountInBracket,
    recommendedTaxTrapPensionContribution,
    oneOffPensionContributionsGross: totalOneOffPensionGross,
    oneOffIsaContributionsGross: totalOneOffIsaGross,
    eligibleEarnings,
    pensionAnnualAllowanceUsed,
    pensionAnnualAllowanceLimit,
    thresholdIncome: Math.round(thresholdIncome),
    adjustedIncome: Math.round(adjustedIncome),
    isTaperedAnnualAllowance,
    taperedReduction: Math.round(taperedReduction),
    actualPensionAllowance,
    pensionAnnualAllowanceRemaining,
    actualPensionAllowanceRemaining,
    exceedsEligibleIncome,
    exceedsAnnualAllowanceOnly,
    isaAllowanceUsed,
    isaAllowanceLimit,
    isaAllowanceRemaining,
    lisaAllowanceUsed,
    lisaAllowanceLimit,
    maxTaxFreeCashCurrentBalance: Math.round(maxTaxFreeCashCurrentBalance),
    projectedPensionAtAccessAge,
    maxTaxFreeCashAtAccessAge: Math.round(maxTaxFreeCashAtAccessAge),
    lsaLimit,
    pensionAccessAge,
    isNmpaRestricted,
    isRetirementBeforeAccessAge,
    isPclsRecyclingRisk,
    pclsRecyclingDetails,
    savingsInterestEarned,
    personalSavingsAllowance: psaResult.personalSavingsAllowance,
    taxableSavingsInterest: psaResult.taxableSavingsInterest,
    savingsInterestTax: psaResult.savingsInterestTax,
    savingsInterestTaxRate: psaResult.savingsInterestTaxRate,
  };
}

/**
 * Calculates Personal Savings Allowance (PSA) and Tax on Savings Interest based on taxpayer's income tax band.
 * - Basic Rate Taxpayer (<= £50,270): £1,000 allowance, 20% tax on excess
 * - Higher Rate Taxpayer (£50,271 - £125,140): £500 allowance, 40%/42% tax on excess
 * - Additional Rate Taxpayer (> £125,140): £0 allowance, 45%/48% tax on excess
 */
export function calculatePSAAndSavingsTax(
  taxableIncome: number,
  grossInterestEarned: number,
  isScottish: boolean = false,
  nonSavingsEarnedIncome?: number,
  unusedPersonalAllowance: number = 0
): {
  personalSavingsAllowance: number;
  startingRateForSavingsUsed: number;
  taxableSavingsInterest: number;
  savingsInterestTax: number;
  savingsInterestTaxRate: number;
  taxBandLabel: 'Basic Rate' | 'Higher Rate' | 'Additional Rate';
} {
  let personalSavingsAllowance = 1000;
  let savingsInterestTaxRate = 0;
  let taxBandLabel: 'Basic Rate' | 'Higher Rate' | 'Additional Rate' = 'Basic Rate';

  // Savings interest tax is NOT devolved to Scotland. Always use UK-wide rates and thresholds.
  const thresholdBasic = RUK_BASIC_THRESHOLD;
  const totalTaxableIncome = taxableIncome + Math.max(0, grossInterestEarned - unusedPersonalAllowance);

  if (totalTaxableIncome > RUK_ADDITIONAL_THRESHOLD) {
    personalSavingsAllowance = 0;
    taxBandLabel = 'Additional Rate';
  } else if (totalTaxableIncome > thresholdBasic) {
    personalSavingsAllowance = 500;
    taxBandLabel = 'Higher Rate';
  } else {
    personalSavingsAllowance = 1000;
    taxBandLabel = 'Basic Rate';
  }

  // 0% Starting Rate for Savings (up to £5,000 if non-savings earned income <= PA)
  const earnedInc = nonSavingsEarnedIncome !== undefined ? nonSavingsEarnedIncome : taxableIncome;
  const startingRateAllowance = Math.max(0, 5000 - earnedInc);
  const interestAfterPA = Math.max(0, grossInterestEarned - unusedPersonalAllowance);
  const startingRateForSavingsUsed = Math.min(interestAfterPA, startingRateAllowance);

  const interestAfterStartingRate = Math.max(0, interestAfterPA - startingRateForSavingsUsed);
  const taxableSavingsInterest = Math.max(0, interestAfterStartingRate - personalSavingsAllowance);

  // Band the taxable savings interest
  let remainingInterest = taxableSavingsInterest;
  let savingsInterestTax = 0;
  let currentIncome = taxableIncome + startingRateForSavingsUsed + Math.min(interestAfterStartingRate, personalSavingsAllowance);

  // Basic Rate Band (20%)
  if (currentIncome < thresholdBasic && remainingInterest > 0) {
    const spaceInBasic = thresholdBasic - currentIncome;
    const amountInBasic = Math.min(spaceInBasic, remainingInterest);
    savingsInterestTax += amountInBasic * 0.20;
    remainingInterest -= amountInBasic;
    currentIncome += amountInBasic;
  }

  // Higher Rate Band (40%)
  if (currentIncome < RUK_ADDITIONAL_THRESHOLD && remainingInterest > 0) {
    const spaceInHigher = RUK_ADDITIONAL_THRESHOLD - currentIncome;
    const amountInHigher = Math.min(spaceInHigher, remainingInterest);
    savingsInterestTax += amountInHigher * 0.40;
    remainingInterest -= amountInHigher;
    currentIncome += amountInHigher;
  }

  // Additional Rate Band (45%)
  if (remainingInterest > 0) {
    savingsInterestTax += remainingInterest * 0.45;
  }

  savingsInterestTax = Math.round(savingsInterestTax);
  savingsInterestTaxRate = taxableSavingsInterest > 0 ? savingsInterestTax / taxableSavingsInterest : 0;

  return {
    personalSavingsAllowance,
    startingRateForSavingsUsed,
    taxableSavingsInterest,
    savingsInterestTax,
    savingsInterestTaxRate,
    taxBandLabel,
  };
}

export function calculatePartnerUKTax(
  profile: UserProfile,
  customPartnerPots?: InvestmentPots,
  evalAge?: number
): TaxCalculationResult {
  const pots = sanitizePots(
    customPartnerPots || profile.partnerPots,
    {
      ...DEFAULT_PARTNER_POTS,
      workplacePensionBalance: profile.partnerWorkplacePensionBalance || DEFAULT_PARTNER_POTS.workplacePensionBalance,
      sippBalance: profile.partnerSippBalance || DEFAULT_PARTNER_POTS.sippBalance,
      stocksAndSharesIsaBalance: profile.partnerIsaBalance || DEFAULT_PARTNER_POTS.stocksAndSharesIsaBalance,
    }
  );

  const partnerAge = profile.partnerCurrentAge || profile.currentAge || 35;
  const partnerBirthYear = new Date().getFullYear() - partnerAge;

  const partnerProfile: UserProfile = {
    ...profile,
    grossAnnualSalary: profile.partnerGrossAnnualSalary ?? 35000,
    taxRegion: profile.partnerTaxRegion || profile.taxRegion,
    pensionContributionMethod: profile.partnerPensionContributionMethod || profile.pensionContributionMethod,
    currentAge: partnerAge,
    targetRetirementAge: profile.partnerTargetRetirementAge ?? 60,
    dateOfBirth: `${partnerBirthYear}-06-15`,
    protectedPensionAccessAge: profile.partnerProtectedPensionAccessAge,
    pclsLumpSumPercent: profile.partnerPclsLumpSumPercent ?? 25,
    takeLumpSumAtStart: profile.partnerTakeLumpSumAtStart ?? false,
    lumpSumTiming: profile.partnerLumpSumTiming ?? 'access_age',
    lumpSumCustomAge: profile.partnerLumpSumCustomAge,
    lsaProtectionType: profile.partnerLsaProtectionType ?? 'standard',
    customLsaAllowance: profile.partnerCustomLsaAllowance,
  };

  return calculateUKTax(partnerProfile, pots, true, evalAge);
}

/**
 * Calculates UK Dividend Tax for 2024/25 tax year.
 * - Dividend Allowance: £500
 * - Basic Rate: 8.75%
 * - Higher Rate: 33.75%
 * - Additional Rate: 39.35%
 */
export function calculateDividendTax(
  taxableIncome: number,
  grossDividendIncome: number,
  isScottish: boolean = false,
  grossRasToExtendBand: number = 0,
  unusedPersonalAllowance: number = 0
): {
  dividendAllowance: number;
  taxableDividendIncome: number;
  dividendTax: number;
  dividendTaxRate: number;
} {
  const dividendAllowance = 500;
  const dividendAfterPA = Math.max(0, grossDividendIncome - unusedPersonalAllowance);
  const taxableDividendIncome = Math.max(0, dividendAfterPA - dividendAllowance);
  if (taxableDividendIncome <= 0) {
    return { dividendAllowance, taxableDividendIncome: 0, dividendTax: 0, dividendTaxRate: 0 };
  }

  // Dividend tax is NOT devolved to Scotland. Always use UK-wide basic rate ceiling.
  const basicRateCeiling = 37700 + grossRasToExtendBand;
  const additionalRateThreshold = 125140 + grossRasToExtendBand;

  let remainingDividend = taxableDividendIncome;
  let dividendTax = 0;
  let currentIncome = taxableIncome + Math.min(dividendAfterPA, dividendAllowance);

  // Basic Rate Band (8.75%)
  if (currentIncome < basicRateCeiling && remainingDividend > 0) {
    const spaceInBasic = basicRateCeiling - currentIncome;
    const amountInBasic = Math.min(spaceInBasic, remainingDividend);
    dividendTax += amountInBasic * 0.0875;
    remainingDividend -= amountInBasic;
    currentIncome += amountInBasic;
  }

  // Higher Rate Band (33.75%)
  if (currentIncome < additionalRateThreshold && remainingDividend > 0) {
    const spaceInHigher = additionalRateThreshold - currentIncome;
    const amountInHigher = Math.min(spaceInHigher, remainingDividend);
    dividendTax += amountInHigher * 0.3375;
    remainingDividend -= amountInHigher;
    currentIncome += amountInHigher;
  }

  // Additional Rate Band (39.35%)
  if (remainingDividend > 0) {
    dividendTax += remainingDividend * 0.3935;
  }

  dividendTax = Math.round(dividendTax);
  const dividendTaxRate = dividendTax / taxableDividendIncome;
  return {
    dividendAllowance,
    taxableDividendIncome,
    dividendTax,
    dividendTaxRate,
  };
}

/**
 * Calculates UK Capital Gains Tax (CGT) for 2024/25 tax year.
 * - Annual Exempt Amount (AEA): £3,000
 * - Standard Assets (GIA stocks/bonds): 10% basic / 20% higher
 * - Residential Property Assets: 18% basic / 24% higher
 */
export function calculateCapitalGainsTax(
  taxableIncome: number,
  totalCapitalGains: number,
  isResidentialProperty: boolean = false,
  isScottish: boolean = false,
  grossRasToExtendBand: number = 0
): {
  annualExemptAmount: number;
  taxableGain: number;
  cgtTax: number;
  cgtRate: number;
} {
  const annualExemptAmount = 3000;
  const taxableGain = Math.max(0, totalCapitalGains - annualExemptAmount);
  if (taxableGain <= 0) {
    return { annualExemptAmount, taxableGain: 0, cgtTax: 0, cgtRate: 0 };
  }

  // CGT is NOT devolved to Scotland. Always use UK-wide basic rate ceiling.
  // CGT does not use Personal Allowance, so the threshold is strictly taxable income (37700).
  const basicRateCeiling = 37700 + grossRasToExtendBand;
  const basicRate = isResidentialProperty ? 0.18 : 0.18;
  const higherRate = isResidentialProperty ? 0.24 : 0.24;

  let cgtTax = 0;
  if (taxableIncome >= basicRateCeiling) {
    cgtTax = taxableGain * higherRate;
  } else {
    const remainingBasicBand = Math.max(0, basicRateCeiling - taxableIncome);
    const basicPortion = Math.min(taxableGain, remainingBasicBand);
    const higherPortion = taxableGain - basicPortion;
    cgtTax = (basicPortion * basicRate) + (higherPortion * higherRate);
  }

  cgtTax = Math.round(cgtTax);
  const cgtRate = taxableIncome >= basicRateCeiling ? higherRate : basicRate;
  return {
    annualExemptAmount,
    taxableGain,
    cgtTax,
    cgtRate,
  };
}


