import { UserProfile, InvestmentPots, PotTransfer, NonPensionPotType, DestinationPotType } from '../types';
import { DEFAULT_PARTNER_POTS, DEFAULT_POTS, sanitizePots } from './defaultData';

export interface ParsedTransferTarget {
  targetYear: number;
  targetMonth: number; // 1-12
  targetDay: number;   // 1-31
  isoDate: string;     // YYYY-MM-DD
}

/**
 * Normalizes and parses transfer target date/age into structured target info.
 * Supports ISO (YYYY-MM-DD), UK format (DD/MM/YYYY, D/M/YY), plain year (YYYY), and age-based transfers.
 */
export function parseTransferTarget(
  transferDate?: string,
  transferAge?: number,
  baseAge?: number,
  now = new Date()
): ParsedTransferTarget {
  const currentYear = now.getFullYear();
  let targetYear = currentYear + 1;
  let targetMonth = 4;
  let targetDay = 6;

  if (transferDate && transferDate.trim()) {
    const raw = transferDate.trim();
    if (raw.includes('-')) {
      const parts = raw.split('-');
      if (parts.length >= 3) {
        targetYear = parseInt(parts[0], 10) || targetYear;
        targetMonth = parseInt(parts[1], 10) || 4;
        targetDay = parseInt(parts[2], 10) || 6;
      } else if (parts.length === 2) {
        targetYear = parseInt(parts[0], 10) || targetYear;
        targetMonth = parseInt(parts[1], 10) || 1;
        targetDay = 1;
      } else {
        targetYear = parseInt(parts[0], 10) || targetYear;
      }
    } else if (raw.includes('/')) {
      const parts = raw.split('/');
      if (parts.length === 3) {
        // UK date format: DD/MM/YYYY or D/M/YY
        targetDay = parseInt(parts[0], 10) || 1;
        targetMonth = parseInt(parts[1], 10) || 1;
        let yr = parseInt(parts[2], 10);
        if (yr < 100) yr = yr >= 70 ? 1900 + yr : 2000 + yr;
        targetYear = yr || targetYear;
      } else if (parts.length === 2) {
        targetMonth = parseInt(parts[0], 10) || 1;
        let yr = parseInt(parts[1], 10);
        if (yr < 100) yr = yr >= 70 ? 1900 + yr : 2000 + yr;
        targetYear = yr || targetYear;
      }
    } else {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed > 1900) targetYear = parsed;
    }
  } else if (transferAge !== undefined && transferAge > 0 && baseAge !== undefined) {
    targetYear = currentYear + Math.max(0, transferAge - baseAge);
    targetMonth = 4;
    targetDay = 6;
  }

  // Sanity fallbacks
  if (isNaN(targetYear) || targetYear < 1900) targetYear = currentYear + 1;
  if (isNaN(targetMonth) || targetMonth < 1 || targetMonth > 12) targetMonth = 4;
  if (isNaN(targetDay) || targetDay < 1 || targetDay > 31) targetDay = 6;

  const isoDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
  return { targetYear, targetMonth, targetDay, isoDate };
}

/**
 * Returns the calendar year in which a transfer will take place.
 */
export function parseTransferYear(
  transferDate?: string,
  transferAge?: number,
  baseAge?: number,
  now = new Date()
): number {
  return parseTransferTarget(transferDate, transferAge, baseAge, now).targetYear;
}

/**
 * Normalizes any valid user input date into a clean ISO YYYY-MM-DD string.
 */
export function normalizeTransferDate(dateStr?: string, now = new Date()): string | undefined {
  if (!dateStr || !dateStr.trim()) return undefined;
  return parseTransferTarget(dateStr, undefined, undefined, now).isoDate;
}

/**
 * Calculates realistic, month-by-month projected balance for a source or destination pot
 * as of the scheduled transfer date BEFORE the transfer execution.
 *
 * Prevents over-projecting (e.g. adding 24 full months of contributions to a 5-month horizon).
 */
export function getProjectedPotBalance(
  profile: UserProfile,
  pots: InvestmentPots,
  owner: 'primary' | 'partner',
  potType: string,
  targetYear: number,
  transferDate?: string,
  currentTransferId?: string,
  now = new Date()
): number {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate();

  const isCouple = Boolean(profile.isCouplePlanning);
  const pPots = sanitizePots(pots, DEFAULT_POTS);
  const partPots = sanitizePots(profile.partnerPots, {
    ...DEFAULT_PARTNER_POTS,
    sippBalance: profile.partnerSippBalance ?? DEFAULT_PARTNER_POTS.sippBalance,
  });

  const selectedPots = owner === 'partner' && isCouple ? partPots : pPots;

  const primaryAge = profile.currentAge || 35;
  const partnerAge = profile.partnerCurrentAge || primaryAge;
  const ownerBaseAge = owner === 'partner' ? partnerAge : primaryAge;
  const ownerRetireAge = owner === 'partner' ? (profile.partnerTargetRetirementAge || 57) : (profile.targetRetirementAge || 55);

  let balance = 0;
  let baselineMonthlyContrib = 0;

  if (potType === 'workplace_pension') {
    balance = selectedPots.workplacePensionBalance || 0;
    const salary = owner === 'partner' ? (profile.partnerGrossAnnualSalary || 0) : (profile.grossAnnualSalary || 0);
    if (selectedPots.workplacePensionMonthlyEmployeeType === 'percent') {
      baselineMonthlyContrib = (salary * ((selectedPots.workplacePensionMonthlyEmployee || 0) / 100)) / 12;
    } else {
      baselineMonthlyContrib = selectedPots.workplacePensionMonthlyEmployee || 0;
    }
    baselineMonthlyContrib += (salary * ((selectedPots.employerMatchPercentage || 0) / 100)) / 12;
  } else if (potType === 'sipp') {
    balance = selectedPots.sippBalance || 0;
    // SIPP personal net contribution receives +25% basic rate tax relief
    baselineMonthlyContrib = (selectedPots.sippMonthlyContribution || 0) * 1.25;
  } else if (potType === 'stocks_and_shares_isa') {
    balance = selectedPots.stocksAndSharesIsaBalance || 0;
    baselineMonthlyContrib = selectedPots.stocksAndSharesIsaMonthlyContribution || 0;
  } else if (potType === 'cash_isa') {
    balance = selectedPots.cashIsaBalance || 0;
    baselineMonthlyContrib = selectedPots.cashIsaMonthlyContribution || 0;
  } else if (potType === 'lisa') {
    balance = selectedPots.lisaBalance || 0;
    const net = selectedPots.lisaMonthlyContribution || 0;
    baselineMonthlyContrib = net + Math.min(net, 4000 / 12) * 0.25;
  } else if (potType === 'gia') {
    balance = selectedPots.giaBalance || 0;
    baselineMonthlyContrib = selectedPots.giaMonthlyContribution || 0;
  } else if (potType === 'cash_savings') {
    balance = selectedPots.cashSavingsBalance || 0;
    baselineMonthlyContrib = selectedPots.cashSavingsMonthlyContribution || 0;
  }

  // Determine annual growth rate
  const overrides = profile.potReturnOverrides;
  let annualRate = (profile.expectedInvestmentReturn ?? 6.5) / 100;
  if (overrides?.enabled) {
    if (potType === 'workplace_pension') annualRate = (overrides.workplacePensionReturn ?? 7.0) / 100;
    else if (potType === 'sipp') annualRate = (overrides.sippReturn ?? 7.5) / 100;
    else if (potType === 'stocks_and_shares_isa') annualRate = (overrides.stocksAndSharesIsaReturn ?? 7.5) / 100;
    else if (potType === 'cash_isa') annualRate = (overrides.cashIsaReturn ?? 4.2) / 100;
    else if (potType === 'lisa') annualRate = (overrides.lisaReturn ?? 6.5) / 100;
    else if (potType === 'gia') annualRate = (overrides.giaReturn ?? 6.5) / 100;
    else if (potType === 'cash_savings') annualRate = (overrides.cashSavingsReturn ?? 3.5) / 100;
  } else {
    if (potType === 'cash_savings') annualRate = 0.035;
    else if (potType === 'cash_isa') annualRate = 0.042;
    else if (potType === 'lisa') annualRate = 0.065;
    else if (potType === 'gia') annualRate = 0.065;
    else annualRate = (profile.expectedInvestmentReturn ?? 6.5) / 100;
  }

  const monthlyRate = annualRate / 12;

  const targetInfo = parseTransferTarget(transferDate, undefined, undefined, now);
  // If targetYear was explicitly provided and differs, prioritize the provided targetYear
  const finalTargetYear = targetYear || targetInfo.targetYear;
  const finalTargetMonth = targetInfo.targetMonth;
  const finalTargetDay = targetInfo.targetDay;

  const totalMonths = (finalTargetYear - currentYear) * 12 + (finalTargetMonth - currentMonth);

  // If transfer is in the past or today, return current balance
  if (totalMonths < 0 || (totalMonths === 0 && finalTargetDay <= currentDay)) {
    return Math.max(0, balance);
  }

  const potTransfers = profile.potTransfers || [];

  const applyMonthOneOffsAndTransfers = (yr: number, mo: number, isTgtMo: boolean, tgtDay: number) => {
    // 1. One-off lump sums in this month
    (profile.oneOffContributions || []).forEach((c) => {
      if (!c.enabled) return;
      const cOwner = c.owner || 'primary';
      if (cOwner !== owner || c.targetPot !== potType) return;
      if (c.frequency !== 'regular_monthly') {
        let match = false;
        let cDay = 6;
        if (c.date && c.date.trim()) {
          const cTarget = parseTransferTarget(c.date, undefined, undefined, now);
          if (cTarget.targetYear === yr && cTarget.targetMonth === mo) {
            match = true;
            cDay = cTarget.targetDay;
          }
        } else if (c.startAge !== undefined && c.startAge > 0) {
          const cYear = currentYear + (c.startAge - ownerBaseAge);
          if (cYear === yr && mo === 4) {
            match = true;
            cDay = 6;
          }
        }

        if (match) {
          if (!isTgtMo || cDay <= tgtDay) {
            let gross = c.grossAmount || 0;
            if (c.targetPot === 'sipp' && c.sippContributionType !== 'gross') {
              gross *= 1.25;
            } else if (c.targetPot === 'lisa') {
              const evalAge = ownerBaseAge + (yr - currentYear);
              if (evalAge < 50) {
                gross += Math.min(gross, 4000) * 0.25;
              }
            }
            balance += gross;
          }
        }
      }
    });

    // 2. Account for other transfers occurring in this month
    potTransfers.forEach((t) => {
      if (!t.enabled || t.id === currentTransferId) return;
      const srcOwner = t.owner || 'primary';
      const dstOwner = t.destinationOwner || srcOwner;
      if (!isCouple && (srcOwner === 'partner' || dstOwner === 'partner')) return;

      const tOwnerAge = srcOwner === 'partner' ? partnerAge : primaryAge;
      const tTarget = parseTransferTarget(t.transferDate, t.transferAge, tOwnerAge, now);

      if (tTarget.targetYear === yr && tTarget.targetMonth === mo) {
        let isBefore = false;
        if (!isTgtMo) {
          isBefore = true;
        } else {
          if (tTarget.targetDay < tgtDay) {
            isBefore = true;
          } else if (tTarget.targetDay === tgtDay) {
            const idxT = potTransfers.findIndex((p) => p.id === t.id);
            const idxCurrent = potTransfers.findIndex((p) => p.id === currentTransferId);
            if (idxT !== -1 && idxCurrent !== -1 && idxT < idxCurrent) {
              isBefore = true;
            }
          }
        }

        if (isBefore) {
          const amt = t.amount || 0;
          if (srcOwner === owner && t.sourcePot === potType) {
            balance = Math.max(0, balance - amt);
          }
          if (dstOwner === owner && t.destinationPot === potType) {
            let added = amt;
            if (t.destinationPot === 'sipp') added *= 1.25;
            else if (t.destinationPot === 'lisa') added += Math.min(added, 4000) * 0.25;
            balance += added;
          }
        }
      }
    });
  };

  // Month-by-month projection
  for (let m = 1; m <= totalMonths; m++) {
    const iterYear = currentYear + Math.floor((currentMonth - 1 + m) / 12);
    const iterMonth = ((currentMonth - 1 + m) % 12) + 1;
    const isTargetMonth = (m === totalMonths);

    // If it's the target month and transfer occurs on day 1 (before monthly payroll deposit),
    // skip this month's regular contribution and interest
    if (isTargetMonth && finalTargetDay <= 1) {
      applyMonthOneOffsAndTransfers(iterYear, iterMonth, isTargetMonth, finalTargetDay);
      break;
    }

    const evalAge = ownerBaseAge + (iterYear - currentYear);
    const isRetired = evalAge >= ownerRetireAge;

    // Check if there are active regular monthly contributions in profile.oneOffContributions for this pot
    const activeRegularOneOffs = (profile.oneOffContributions || []).filter((c) => {
      if (!c.enabled) return false;
      const cOwner = c.owner || 'primary';
      if (cOwner !== owner || c.targetPot !== potType) return false;
      if (c.frequency !== 'regular_monthly') return false;
      const startAge = c.startAge ?? ownerBaseAge;
      const endAge = c.endAge ?? ownerRetireAge;
      return evalAge >= startAge && evalAge <= endAge;
    });

    let currentMonthContrib = 0;

    if (!isRetired) {
      if (activeRegularOneOffs.length > 0) {
        // Use regular monthly contributions from oneOffContributions (replaces baseline pot contribution to prevent double counting)
        activeRegularOneOffs.forEach((c) => {
          let monthly = c.grossAmount || 0;
          if (c.targetPot === 'workplace_pension') {
            const salary = owner === 'partner' ? (profile.partnerGrossAnnualSalary || 0) : (profile.grossAnnualSalary || 0);
            if (c.workplaceContributionType === 'fixed') {
              monthly = (c.employeeMonthlyAmount ?? c.grossAmount ?? 0) + (c.employerMonthlyAmount ?? 0);
            } else {
              monthly = (salary * (((c.employeePercent ?? 5) + (c.employerPercent ?? 3)) / 100)) / 12;
            }
          } else if (c.targetPot === 'sipp') {
            if (c.sippContributionType !== 'gross') {
              monthly *= 1.25;
            }
          } else if (c.targetPot === 'lisa') {
            if (evalAge < 50) {
              monthly += Math.min(monthly, 4000 / 12) * 0.25;
            } else {
              monthly = 0; // LISA contributions stop at age 50
            }
          }
          currentMonthContrib += monthly;
        });
      } else {
        // Fallback to baseline pot monthly contribution (only if no active regular one-off for this pot)
        if (potType === 'lisa') {
          if (evalAge < 50) {
            currentMonthContrib = baselineMonthlyContrib;
          }
        } else {
          currentMonthContrib = baselineMonthlyContrib;
        }
      }
    }

    balance += currentMonthContrib;

    // Apply any lump sums or other scheduled transfers this month
    applyMonthOneOffsAndTransfers(iterYear, iterMonth, isTargetMonth, finalTargetDay);

    // Apply monthly growth
    balance += balance * monthlyRate;

    if (isTargetMonth) {
      break;
    }
  }

  return Math.max(0, balance);
}
