import { UserProfile, InvestmentPots, TaxCalculationResult } from '../types';
import { DEFAULT_PARTNER_POTS, DEFAULT_POTS, sanitizePots } from './defaultData';
import { getPensionAccessAge, getPartnerPensionAccessAge, getLsaLimit, getPartnerLsaLimit, getLumpSumTakeAge, calculateUKTax, calculatePartnerUKTax, allocateLumpSumToPots, computeIncomeTaxOnAmount } from './ukTaxEngine';
import { getTargetIncomeForAge, getActualSpendingTargetForAge } from './projectionEngine';
import { SCOT_INTERMEDIATE_THRESHOLD, RUK_BASIC_THRESHOLD, SCOT_HIGHER_THRESHOLD, RUK_ADDITIONAL_THRESHOLD } from '../config/ukTaxRates';
import { HISTORIC_MARKET_DATA, getHistoricSequence, HistoricYearData } from '../data/historicMarketData';

export interface AssetAllocation {
  equityPercent: number; // e.g. 80
  bondPercent: number;   // e.g. 15
  cashPercent: number;   // e.g. 5
}

export interface HistoricYearSnapshot {
  yearIndex: number;
  calendarYear: number;
  age: number;
  partnerAge?: number;
  isRetired: boolean;
  histYear: number;
  histEvent: string;
  histEquityReturn: number;
  histBondReturn: number;
  histCashReturn: number;
  histInflation: number;
  blendedReturn: number;
  pensionPot: number;
  isaPot: number;
  cashGiaPot: number;
  totalPot: number;
  totalPotReal: number;
  drawdownAmount: number;
}

export interface HistoricRunResult {
  startYear: number;
  startIndex: number;
  startEvent: string;
  isSuccess: boolean;
  depletedAtAge: number | null;
  minPotBalance: number;
  retirementPotBalance: number;
  finalNominalBalance: number;
  finalRealBalance: number;
  trajectory: HistoricYearSnapshot[];
}

export interface HistoricAggregateYear {
  age: number;
  calendarYear: number;
  isRetired: boolean;
  p10TotalPot: number;
  p25TotalPot: number;
  p50TotalPot: number; // Median
  p75TotalPot: number;
  p90TotalPot: number;
  p10RealPot: number;
  p50RealPot: number;
  p90RealPot: number;
}

export interface HistoricSimulationSummary {
  totalRuns: number; // 50
  successfulRuns: number;
  successRate: number; // %
  worstStartYear: HistoricRunResult;
  bestStartYear: HistoricRunResult;
  medianFinalNominal: number;
  medianFinalReal: number;
  p10FinalReal: number;
  p90FinalReal: number;
  p10FinalNominal: number;
  p90FinalNominal: number;
  runResults: HistoricRunResult[];
  aggregateTrajectory: HistoricAggregateYear[];
  allocation: AssetAllocation;
  maxAge: number;
}

function getPercentile(sorted: number[], percentile: number): number {
  if (sorted.length === 0) return 0;
  const index = (percentile / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (upper >= sorted.length) return sorted[sorted.length - 1];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function runHistoricModelingSimulation(
  profile: UserProfile,
  pots: InvestmentPots,
  taxResult: TaxCalculationResult,
  customMaxAge?: number,
  customAllocation?: AssetAllocation,
  reverseSequence: boolean = false
): HistoricSimulationSummary {
  const safeCurrentAge = Math.max(18, Math.min(100, Number(profile.currentAge) || 30));
  const maxAge = Math.max(safeCurrentAge + 1, Math.floor(Number(customMaxAge) || 95));
  const numYears = Math.max(1, maxAge - safeCurrentAge + 1);

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

  // Asset allocation dynamically applied in the year loop


  const runResults: HistoricRunResult[] = [];

  // Run 75 historical starting year scenarios (index 0..74)
  for (let startIndex = 0; startIndex < HISTORIC_MARKET_DATA.length; startIndex++) {
    const startData = HISTORIC_MARKET_DATA[startIndex];
    const rawSequence = getHistoricSequence(startIndex, numYears);
    const sequence = reverseSequence ? [...rawSequence].reverse() : rawSequence;

    let primaryPensionPot = cleanPots.workplacePensionBalance + cleanPots.sippBalance;
    let partnerPensionPot = profile.isCouplePlanning ? (partnerPots.workplacePensionBalance + partnerPots.sippBalance) : 0;
    let primaryIsaPot = cleanPots.stocksAndSharesIsaBalance + cleanPots.cashIsaBalance + cleanPots.lisaBalance;
    let partnerIsaPot = profile.isCouplePlanning ? (partnerPots.stocksAndSharesIsaBalance + partnerPots.cashIsaBalance + partnerPots.lisaBalance) : 0;
    let primaryCashGiaPot = cleanPots.giaBalance + cleanPots.cashSavingsBalance;
    let partnerCashGiaPot = profile.isCouplePlanning ? (partnerPots.giaBalance + partnerPots.cashSavingsBalance) : 0;

    let pensionPot = primaryPensionPot + partnerPensionPot;
    let isaPot = primaryIsaPot + partnerIsaPot;
    let cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;

    let pclsTaken = false;
    let partnerPclsTaken = false;
    let primaryCumulativeTaxFreeDrawn = 0;
    let partnerCumulativeTaxFreeDrawn = 0;
    let depletedAtAge: number | null = null;
    let partnerDead = false;
    let minPotBalance = pensionPot + isaPot + cashGiaPot;
    let retirementPotBalance = 0;

    let annuityPurchased = false;
    let partnerAnnuityPurchased = false;
    const historicAnnuityStreams: Array<{
      baseNominal: number;
      isInflationLinked: boolean;
      durationOption: string;
      durationUntilAge: number;
      owner: 'primary' | 'partner';
      purchaseInflationFactor: number;
    }> = [];

    let cumulativeInflationFactor = 1.0;
    const trajectory: HistoricYearSnapshot[] = [];

    for (let yr = 0; yr < numYears; yr++) {
      const age = safeCurrentAge + yr;
      const partnerAge = age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge);
      const isRetired = age >= profile.targetRetirementAge;
      const canAccessPension = age >= pensionAccessAge;
      const partnerCanAccessPension = profile.isCouplePlanning && !partnerDead && partnerAge >= partnerPensionAccessAge;
      const calendarYear = new Date().getFullYear() + yr;

      const hData = sequence[yr];
      const hInf = hData.inflation / 100;
      cumulativeInflationFactor *= (1 + hInf);

      const deductProRata = (potType, amount) => {
        if (potType === 'pension') {
          const priAvail = canAccessPension ? primaryPensionPot : 0;
          const partAvail = partnerCanAccessPension ? partnerPensionPot : 0;
          const totalAvail = priAvail + partAvail;
          if (totalAvail > 0) {
            const priRatio = priAvail / totalAvail;
            const primaryDraw = amount * priRatio;
            const partnerDraw = amount * (1 - priRatio);
            primaryPensionPot = Math.max(0, primaryPensionPot - primaryDraw);
            partnerPensionPot = Math.max(0, partnerPensionPot - partnerDraw);
            pensionPot = primaryPensionPot + partnerPensionPot;
            primaryCumulativeTaxFreeDrawn += Math.min(primaryDraw * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
            partnerCumulativeTaxFreeDrawn += Math.min(partnerDraw * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
          }
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
      const deductExplicit = (potType: 'pension' | 'isa' | 'cashGia', amount: number, owner: 'primary' | 'partner') => {
        if (potType === 'pension') {
          if (owner === 'primary') {
            primaryPensionPot = Math.max(0, primaryPensionPot - amount);
            primaryCumulativeTaxFreeDrawn += Math.min(amount * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
          } else {
            partnerPensionPot = Math.max(0, partnerPensionPot - amount);
            partnerCumulativeTaxFreeDrawn += Math.min(amount * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
          }
          pensionPot = primaryPensionPot + partnerPensionPot;
        } else if (potType === 'isa') {
          if (owner === 'primary') primaryIsaPot = Math.max(0, primaryIsaPot - amount);
          else partnerIsaPot = Math.max(0, partnerIsaPot - amount);
          isaPot = primaryIsaPot + partnerIsaPot;
        } else if (potType === 'cashGia') {
          if (owner === 'primary') primaryCashGiaPot = Math.max(0, primaryCashGiaPot - amount);
          else partnerCashGiaPot = Math.max(0, partnerCashGiaPot - amount);
          cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
        }
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


      // Blended return based on dynamic asset allocation
      const isPartnerRetired = profile.isCouplePlanning ? (partnerAge >= (profile.partnerTargetRetirementAge ?? profile.targetRetirementAge)) : false;
      const isFullyRetired = profile.isCouplePlanning ? (isRetired && isPartnerRetired) : isRetired;
      const allocationSplit: any = customAllocation || (isFullyRetired ? (profile.assetAllocationSplit?.decumulation ?? { equityPercent: 60, bondPercent: 30, cashPercent: 10 }) : (profile.assetAllocationSplit?.accumulation ?? { equityPercent: 80, bondPercent: 15, cashPercent: 5 }));
      const eqRatio = (allocationSplit.equityPercent ?? allocationSplit.stocks ?? 60) / 100;
      const bondRatio = (allocationSplit.bondPercent ?? allocationSplit.bonds ?? 30) / 100;
      const cashRatio = (allocationSplit.cashPercent ?? allocationSplit.cash ?? 10) / 100;
      
      const blendedReturnRate = (
        eqRatio * (hData.equityReturn / 100) +
        bondRatio * (hData.bondReturn / 100) +
        cashRatio * (hData.cashReturn / 100)
      );

      // Pot-specific returns
      // Pensions & ISAs follow blended return; Cash/GIA leans higher cash/bond weighting
      const pensionReturnRate = blendedReturnRate;
      const isaReturnRate = blendedReturnRate;
      const cashGiaReturnRate = 0.5 * (hData.cashReturn / 100) + 0.3 * (hData.bondReturn / 100) + 0.2 * (hData.equityReturn / 100);

      if (age === profile.targetRetirementAge) {
        retirementPotBalance = pensionPot + isaPot + cashGiaPot;
      }

      // Upfront PCLS - Primary
      if (
        isRetired &&
        profile.takeLumpSumAtStart &&
        !pclsTaken &&
        age >= lumpSumTakeAge &&
        canAccessPension &&
        primaryPensionPot > 0 &&
        (profile.pclsLumpSumPercent ?? 25) > 0
      ) {
        const lumpSumPercent = Math.min(100, profile.pclsLumpSumPercent ?? 25) / 100;
        const pclsAmount = Math.min(primaryPensionPot * lumpSumPercent, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
        primaryPensionPot -= pclsAmount;
        pensionPot = primaryPensionPot + partnerPensionPot;
        const alloc = allocateLumpSumToPots(pclsAmount, profile.lumpSumTargetPot, profile.lumpSumSplits);
        primaryIsaPot += alloc.toIsa;
        primaryCashGiaPot += alloc.toCashGia;
        isaPot = primaryIsaPot + partnerIsaPot;
        cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
        pclsTaken = true;
        primaryCumulativeTaxFreeDrawn += pclsAmount;
      }

      // Upfront PCLS - Partner
      if (
        profile.isCouplePlanning &&
        profile.partnerTakeLumpSumAtStart &&
        !partnerDead && !partnerPclsTaken &&
        partnerAge >= (profile.partnerTargetRetirementAge ?? profile.targetRetirementAge) &&
        partnerAge >= lumpSumTakeAge &&
        partnerCanAccessPension &&
        partnerPensionPot > 0 &&
        (profile.partnerPclsLumpSumPercent ?? 25) > 0
      ) {
        const lumpSumPercent = Math.min(100, profile.partnerPclsLumpSumPercent ?? 25) / 100;
        const partnerPclsAmount = Math.min(partnerPensionPot * lumpSumPercent, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
        partnerPensionPot -= partnerPclsAmount;
        pensionPot = primaryPensionPot + partnerPensionPot;
        const alloc = allocateLumpSumToPots(partnerPclsAmount, profile.partnerLumpSumTargetPot || profile.lumpSumTargetPot, profile.partnerLumpSumSplits || profile.lumpSumSplits);
        partnerIsaPot += alloc.toIsa;
        partnerCashGiaPot += alloc.toCashGia;
        isaPot = primaryIsaPot + partnerIsaPot;
        cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
        partnerPclsTaken = true;
        partnerCumulativeTaxFreeDrawn += partnerPclsAmount;
      }



      // Defined Benefit Pensions
      let dbIncomeThisYr = 0;
      (profile.dbPensions || []).filter((p) => p.enabled).forEach((db) => {
        const isPartner = db.owner === 'partner';
        if (isPartner && (!profile.isCouplePlanning || partnerDead)) return;
        const evalAge = isPartner ? partnerAge : age;
        if (evalAge >= db.startAge) {
          const dbInc = db.inflationLinked ? db.annualIncome * cumulativeInflationFactor : db.annualIncome;
          dbIncomeThisYr += dbInc;
        }
        if (evalAge === db.startAge && db.taxFreeLumpSum > 0) {
          const lump = db.taxFreeLumpSum * cumulativeInflationFactor;
          if (isPartner) partnerCumulativeTaxFreeDrawn += lump;
          else primaryCumulativeTaxFreeDrawn += lump;
          if (db.targetPot !== 'spend_clear_debt') {
            if (db.targetPot === 'stocks_and_shares_isa' || db.targetPot === 'cash_isa' || db.targetPot === 'lisa') addProRata("isa", lump, false);
            else addProRata("cashGia", lump, false);
          }
        }
      });

      // One-off lump sum contributions
      (profile.oneOffContributions || []).filter((c) => c.enabled && c.frequency !== 'regular_monthly').forEach((contrib) => {
        const isPartner = contrib.owner === 'partner';
        if (isPartner && !profile.isCouplePlanning) return;
        let cYear: number | undefined;
        if (contrib.date) cYear = parseInt(contrib.date.split('-')[0], 10);
        if (cYear !== undefined && cYear === calendarYear) {
          const gross = contrib.grossAmount || 0;
          if (gross > 0) {
            if (contrib.targetPot === 'workplace_pension') addProRata("pension", gross, isPartner);
            else if (contrib.targetPot === 'sipp') {
              const sippGross = contrib.sippContributionType === 'gross' ? gross : gross * 1.25;
              addProRata("pension", sippGross, isPartner);
            }
            else if (contrib.targetPot === 'stocks_and_shares_isa' || contrib.targetPot === 'cash_isa') addProRata("isa", gross, isPartner);
            else if (contrib.targetPot === 'lisa') addProRata("isa", gross + Math.min(gross, 4000) * 0.25, false);
            else addProRata("cashGia", gross, isPartner);
          }
        }
      });

      // Pot transfers
      (profile.potTransfers || []).filter((t) => t.enabled).forEach((transfer) => {
        const isSrcPartner = (transfer.owner || 'primary') === 'partner';
        const isDstPartner = (transfer.destinationOwner || transfer.owner || 'primary') === 'partner';
        if ((isSrcPartner || isDstPartner) && !profile.isCouplePlanning) return;

        let match = false;
        if (transfer.transferDate) {
          const transferYear = parseInt(transfer.transferDate.split('-')[0], 10);
          if (!isNaN(transferYear) && transferYear === calendarYear) match = true;
        } else if (transfer.transferAge !== undefined && transfer.transferAge > 0) {
          const evalAge = isSrcPartner ? partnerAge : age;
          if (evalAge === transfer.transferAge) match = true;
        }

        if (match) {
          const srcIsPension = transfer.sourcePot === 'workplace_pension' || transfer.sourcePot === 'sipp';
          const srcIsIsa = transfer.sourcePot === 'stocks_and_shares_isa' || transfer.sourcePot === 'cash_isa' || transfer.sourcePot === 'lisa';
          const srcIsGiaCash = transfer.sourcePot === 'gia' || transfer.sourcePot === 'cash_savings';

          let availableSrc = srcIsPension ? pensionPot : srcIsIsa ? isaPot : srcIsGiaCash ? cashGiaPot : 0;
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
            const dstIsIsa = transfer.destinationPot === 'stocks_and_shares_isa' || transfer.destinationPot === 'cash_isa';
            const dstIsLisa = transfer.destinationPot === 'lisa';
            const dstIsGiaCash = transfer.destinationPot === 'gia' || transfer.destinationPot === 'cash_savings';

            let addedAmount = actualTransfer;
            if (dstIsSipp && !srcIsPension) addedAmount = actualTransfer * 1.25;
            else if (dstIsLisa) addedAmount = actualTransfer + Math.min(actualTransfer, 4000) * 0.25;

            if (dstIsPension) addProRata("pension", addedAmount, isDstPartner);
            else if (dstIsIsa || dstIsLisa) addProRata("isa", addedAmount, isDstPartner);
            else if (dstIsGiaCash) addProRata("cashGia", addedAmount, isDstPartner);
          }
        }
      });

      // Fixed Income Streams
      let fixedIncomeThisYr = 0;
      (profile.fixedIncomeStreams || []).filter((s) => s.enabled).forEach((s) => {
        const isPartner = (s.owner || 'primary') === 'partner';
        if (isPartner && (!profile.isCouplePlanning || partnerDead)) return;
        const evalAge = isPartner ? partnerAge : age;
        if (evalAge >= s.startAge && (s.endAge === undefined || evalAge <= s.endAge)) {
          const inc = s.inflationLinked ? s.annualAmount * cumulativeInflationFactor : s.annualAmount;
          fixedIncomeThisYr += inc;
        }
      });

      // State Pensions (Primary + Partner if couple mode)
      let statePensionThisYr = 0;
      if ((profile.includeStatePension ?? true) && age >= (profile.statePensionAge || 67)) {
        const primaryYears = Math.min(35, profile.qualifyingYears ?? 35);
        if (primaryYears >= 10) {
          const primaryFull = profile.fullStatePensionAmount ?? 12547.60;
          const primaryAnnualCalculated = Math.round((primaryYears / 35) * primaryFull * 100) / 100;
          const spAmount = profile.statePensionAmountAnnual ?? primaryAnnualCalculated;
          const primaryTripleLock = profile.enableTripleLock ?? true;
          statePensionThisYr += spAmount * (primaryTripleLock ? cumulativeInflationFactor : 1);
        }
      }
      if (profile.isCouplePlanning && !partnerDead && (profile.partnerIncludeStatePension ?? true) && partnerAge >= (profile.partnerStatePensionAge || 67)) {
        const partnerYears = Math.min(35, profile.partnerQualifyingYears ?? 35);
        if (partnerYears >= 10) {
          const partnerTripleLock = profile.partnerEnableTripleLock ?? true;
          const partnerFull = profile.partnerFullStatePensionAmount ?? 12547.60;
          const partnerAnnualCalculated = Math.round((partnerYears / 35) * partnerFull * 100) / 100;
          const pSpAmount = profile.partnerStatePensionAmountAnnual ?? partnerAnnualCalculated;
          statePensionThisYr += pSpAmount * (partnerTripleLock ? cumulativeInflationFactor : 1);
        }
      }

      let drawdownThisYr = 0;

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
        
        if (primaryCumulativeTaxFreeDrawn < maxLsa) {
          const uncrystPcls = Math.min(grossPotForAnnuity * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
          actualCapitalToAnnuity = grossPotForAnnuity - uncrystPcls;
          const alloc = allocateLumpSumToPots(uncrystPcls, profile.lumpSumTargetPot, profile.lumpSumSplits);
          primaryIsaPot += alloc.toIsa;
          primaryCashGiaPot += alloc.toCashGia;
          primaryCumulativeTaxFreeDrawn += uncrystPcls;
        }

        primaryPensionPot -= grossPotForAnnuity;
        pensionPot = primaryPensionPot + partnerPensionPot;

        const rate = (profile.annuityRatePercent || 4.2) / 100;
        const baseNominal = actualCapitalToAnnuity * rate;
        annuityPurchased = true;

        historicAnnuityStreams.push({
          baseNominal,
          isInflationLinked: (profile.annuityType || '').includes('inflation_linked'),
          durationOption: profile.annuityDurationOption || 'lifetime',
          durationUntilAge: profile.annuityDurationUntilAge || 75,
          owner: 'primary',
          purchaseInflationFactor: cumulativeInflationFactor,
        });
      }

      // Partner Single Annuity Purchase
      const partnerTargetPurchaseAge = Math.max(partnerPensionAccessAge, profile.partnerAnnuityPurchaseAge || profile.partnerTargetRetirementAge || 60);
      if (
        profile.isCouplePlanning &&
        partnerCanAccessPension &&
        partnerPensionPot > 0 &&
        !partnerAnnuityPurchased &&
        (profile.partnerIncomeProductOption === 'annuity') &&
        partnerAge >= partnerTargetPurchaseAge
      ) {
        const allocPercent = 100;

        const grossPotForAnnuity = partnerPensionPot * (allocPercent / 100);
        let actualCapitalToAnnuity = grossPotForAnnuity;
        
        if (partnerCumulativeTaxFreeDrawn < partnerMaxLsa) {
          const uncrystPcls = Math.min(grossPotForAnnuity * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
          actualCapitalToAnnuity = grossPotForAnnuity - uncrystPcls;
          const alloc = allocateLumpSumToPots(uncrystPcls, profile.partnerLumpSumTargetPot || profile.lumpSumTargetPot, profile.partnerLumpSumSplits);
          partnerIsaPot += alloc.toIsa;
          partnerCashGiaPot += alloc.toCashGia;
          partnerCumulativeTaxFreeDrawn += uncrystPcls;
        }

        partnerPensionPot -= grossPotForAnnuity;
        pensionPot = primaryPensionPot + partnerPensionPot;

        const rate = (profile.partnerAnnuityRatePercent || 4.2) / 100;
        const baseNominal = actualCapitalToAnnuity * rate;
        partnerAnnuityPurchased = true;

        historicAnnuityStreams.push({
          baseNominal,
          isInflationLinked: (profile.partnerAnnuityType || '').includes('inflation_linked'),
          durationOption: profile.partnerAnnuityDurationOption || 'lifetime',
          durationUntilAge: profile.partnerAnnuityDurationUntilAge || 75,
          owner: 'partner',
          purchaseInflationFactor: cumulativeInflationFactor,
        });
      }

      // Calculate Annuity Income for Current Year
      let annuityIncomeThisYear = 0;
      historicAnnuityStreams.forEach((stream) => {
        if (stream.owner === 'partner' && partnerDead) return;
        const streamOwnerAge = stream.owner === 'partner' ? partnerAge : age;
        if (stream.durationOption === 'until_age' && streamOwnerAge >= stream.durationUntilAge) {
          return;
        }
        const streamNominal = stream.isInflationLinked
          ? stream.baseNominal * (cumulativeInflationFactor / (stream.purchaseInflationFactor || 1))
          : stream.baseNominal;
        annuityIncomeThisYear += streamNominal;
      });

            if (!isRetired) {
        // Accumulation phase: Add ongoing monthly savings
        const primaryTaxThisYr = calculateUKTax(profile, cleanPots, false, age);
        const partnerTaxThisYr = (profile.isCouplePlanning && !partnerDead)
          ? calculatePartnerUKTax(profile, partnerPots, partnerAge)
          : null;

        let primaryPensionContrib = primaryTaxThisYr.regularPensionContributionsAnnual ?? primaryTaxThisYr.totalPensionContributionsAnnual;
        let primaryIsaContrib = (primaryTaxThisYr.regularIsaContributionsAnnual ?? primaryTaxThisYr.totalIsaContributionsAnnual) + primaryTaxThisYr.lisaGovernmentBonusAnnual;
        let primaryCashGiaContrib = primaryTaxThisYr.regularCashGiaContributionsAnnual ?? primaryTaxThisYr.totalCashGiaContributionsAnnual;

        let partnerPensionContrib = 0;
        let partnerIsaContrib = 0;
        let partnerCashGiaContrib = 0;

        if (profile.isCouplePlanning && partnerTaxThisYr) {
          const partnerRetireAge = profile.partnerTargetRetirementAge ?? 60;
          if (partnerAge < partnerRetireAge) {
            partnerPensionContrib = partnerTaxThisYr.regularPensionContributionsAnnual ?? partnerTaxThisYr.totalPensionContributionsAnnual;
            partnerIsaContrib = (partnerTaxThisYr.regularIsaContributionsAnnual ?? partnerTaxThisYr.totalIsaContributionsAnnual) + partnerTaxThisYr.lisaGovernmentBonusAnnual;
            partnerCashGiaContrib = partnerTaxThisYr.regularCashGiaContributionsAnnual ?? partnerTaxThisYr.totalCashGiaContributionsAnnual;
          }
        }

        growPots(pensionReturnRate, isaReturnRate, cashGiaReturnRate);
        addProRata('pension', primaryPensionContrib * cumulativeInflationFactor * (1 + pensionReturnRate / 2), false);
        addProRata('isa', primaryIsaContrib * cumulativeInflationFactor * (1 + isaReturnRate / 2), false);
        addProRata('cashGia', primaryCashGiaContrib * cumulativeInflationFactor * (1 + cashGiaReturnRate / 2), false);
        
        if (partnerPensionContrib > 0) addProRata('pension', partnerPensionContrib * cumulativeInflationFactor * (1 + pensionReturnRate / 2), true);
        if (partnerIsaContrib > 0) addProRata('isa', partnerIsaContrib * cumulativeInflationFactor * (1 + isaReturnRate / 2), true);
        if (partnerCashGiaContrib > 0) addProRata('cashGia', partnerCashGiaContrib * cumulativeInflationFactor * (1 + cashGiaReturnRate / 2), true);

      } else {
        // DECUMULATION PHASE (For Primary, but partner might still be working)
        let partnerWorkingPensionContrib = 0;
        let partnerWorkingIsaContrib = 0;
        let partnerWorkingCashGiaContrib = 0;
        const partnerRetireAge = profile.partnerTargetRetirementAge ?? 60;
        if (profile.isCouplePlanning && !partnerDead && partnerAge < partnerRetireAge) {
          const partnerTaxThisYr = calculatePartnerUKTax(profile, partnerPots, partnerAge);
          partnerWorkingPensionContrib = partnerTaxThisYr.regularPensionContributionsAnnual ?? partnerTaxThisYr.totalPensionContributionsAnnual;
          partnerWorkingIsaContrib = (partnerTaxThisYr.regularIsaContributionsAnnual ?? partnerTaxThisYr.totalIsaContributionsAnnual) + partnerTaxThisYr.lisaGovernmentBonusAnnual;
          partnerWorkingCashGiaContrib = partnerTaxThisYr.regularCashGiaContributionsAnnual ?? partnerTaxThisYr.totalCashGiaContributionsAnnual;
        }

        if (partnerWorkingPensionContrib > 0) addProRata('pension', partnerWorkingPensionContrib * cumulativeInflationFactor * ((1 + pensionReturnRate / 2) / (1 + pensionReturnRate)), true);
        if (partnerWorkingIsaContrib > 0) addProRata('isa', partnerWorkingIsaContrib * cumulativeInflationFactor * ((1 + isaReturnRate / 2) / (1 + isaReturnRate)), true);
        if (partnerWorkingCashGiaContrib > 0) addProRata('cashGia', partnerWorkingCashGiaContrib * cumulativeInflationFactor * ((1 + cashGiaReturnRate / 2) / (1 + cashGiaReturnRate)), true);

        // Target income calculations accounting for Maximized Spend & Reinvest Excess
        const maxDrawdownIncomeTarget = getTargetIncomeForAge(profile, age);
        const actualSpendingBase = getActualSpendingTargetForAge(profile, age);

        const isReinvestExcess = Boolean(
          profile.reinvestExcessDrawdown ||
          profile.maximizedSpendConfig?.reinvestExcessDrawdown
        );

        let lifeEventsExpenseThisYear = 0;
        const activeDecumEvents = (profile.decumulationLifeEvents || []).filter(e => e.enabled);
        for (const event of activeDecumEvents) {
          const isPartnerEvent = event.owner === 'partner';
          const targetAgeMatches = isPartnerEvent ? partnerAge === event.age : age === event.age;
          if (targetAgeMatches) {
            const rawAmount = Number(event.amount) || 0;
            if (rawAmount > 0) {
              const inflLinked = event.inflationLinked ?? true;
              const eventAmount = inflLinked ? rawAmount * cumulativeInflationFactor : rawAmount;
              if (event.type === 'income') {
                const potTarget = event.targetPot || 'cash_savings';
                const isPension = potTarget === 'sipp';
                const isIsa = (potTarget as string) === 'stocks_and_shares_isa' || (potTarget as string) === 'cash_isa' || (potTarget as string) === 'lisa' || (potTarget as string) === 'isa';
                const potName = isPension ? 'pension' : isIsa ? 'isa' : 'cashGia';
                addProRata(potName, eventAmount, isPartnerEvent);
              } else {
                lifeEventsExpenseThisYear += eventAmount;
              }
            }
          }
        }

        const requiredNetIncomeTarget = actualSpendingBase * cumulativeInflationFactor + lifeEventsExpenseThisYear;
        const drawdownNetTarget = isReinvestExcess
          ? (maxDrawdownIncomeTarget * cumulativeInflationFactor + lifeEventsExpenseThisYear)
          : requiredNetIncomeTarget;

        const guaranteedIncome = statePensionThisYr + annuityIncomeThisYear + dbIncomeThisYr + fixedIncomeThisYr;
        let remainingNeeded = Math.max(0, drawdownNetTarget - guaranteedIncome);

        let drawdownThisYr = 0;
        const executeDeduct = (potType: 'pension' | 'isa' | 'cashGia', amount: number, owner?: 'primary' | 'partner') => {
          if (amount <= 0) return;
          if (owner) {
            deductExplicit(potType, amount, owner);
          } else {
            deductProRata(potType, amount);
          }
          drawdownThisYr += amount;
        };

        let primaryGuaranteedIncome = 0;
        let partnerGuaranteedIncome = 0;
        if (profile.isCouplePlanning && !partnerDead) {
          primaryGuaranteedIncome = statePensionThisYr / 2 + annuityIncomeThisYear / 2 + dbIncomeThisYr / 2 + (fixedIncomeThisYr || 0) / 2;
          partnerGuaranteedIncome = primaryGuaranteedIncome;
        } else {
          primaryGuaranteedIncome = guaranteedIncome;
        }

        const approximateNetFromGross = (grossDraw: number): number => {
          const priAvail = canAccessPension ? primaryPensionPot : 0;
          const partAvail = (profile.isCouplePlanning && partnerCanAccessPension && !partnerDead) ? partnerPensionPot : 0;
          const totalAvail = priAvail + partAvail;
          const priRatio = totalAvail > 0 ? priAvail / totalAvail : (canAccessPension ? 1 : 0);
          const partRatio = totalAvail > 0 ? partAvail / totalAvail : (profile.isCouplePlanning && partnerCanAccessPension && !partnerDead ? 1 : 0);
          
          let priTaxFree = 0;
          let partTaxFree = 0;
          
          if (primaryCumulativeTaxFreeDrawn < maxLsa) {
             priTaxFree = Math.min((grossDraw * priRatio) * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
          }
          if (partnerCumulativeTaxFreeDrawn < partnerMaxLsa) {
             partTaxFree = Math.min((grossDraw * partRatio) * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
          }
          
          const priTaxable = (grossDraw * priRatio) - priTaxFree;
          const partTaxable = (grossDraw * partRatio) - partTaxFree;
          
          const indexTaxBands = profile.indexTaxBands ?? true;
          const inflMult = indexTaxBands ? cumulativeInflationFactor : 1;
          const isScottish = profile.taxRegion === 'scotland';
          const partnerIsScottish = profile.partnerTaxRegion === 'scotland';
          
          const { tax: priTotalTax } = computeIncomeTaxOnAmount((primaryGuaranteedIncome + priTaxable) / inflMult, isScottish, profile.customTaxBands);
          const { tax: priBaseTax } = computeIncomeTaxOnAmount(primaryGuaranteedIncome / inflMult, isScottish, profile.customTaxBands);
          const priTaxOnDraw = (priTotalTax - priBaseTax) * inflMult;
          
          let partTaxOnDraw = 0;
          if (profile.isCouplePlanning && !partnerDead) {
            const { tax: partTotalTax } = computeIncomeTaxOnAmount((partnerGuaranteedIncome + partTaxable) / inflMult, partnerIsScottish, profile.customTaxBands);
            const { tax: partBaseTax } = computeIncomeTaxOnAmount(partnerGuaranteedIncome / inflMult, partnerIsScottish, profile.customTaxBands);
            partTaxOnDraw = (partTotalTax - partBaseTax) * inflMult;
          }
          
          return grossDraw - Math.max(0, priTaxOnDraw) - Math.max(0, partTaxOnDraw);
        };
        const getGrossPensionNeededForNet = (netNeeded: number, potAvailable: number): number => {
          if (netNeeded <= 0 || potAvailable <= 0) return 0;
          let low = netNeeded;
          let high = netNeeded * 5.0;
          let bestGross = netNeeded;
          for (let i = 0; i < 25; i++) {
            const mid = (low + high) / 2;
            const net = approximateNetFromGross(mid);
            if (net < netNeeded) { low = mid; } else { high = mid; bestGross = mid; }
          }
          return Math.min(potAvailable, bestGross);
        };

        const strategy = profile.drawdownStrategy || 'isa_first';

        let netDrawdownAchieved = 0;

        if (isReinvestExcess) {
          if (canAccessPension && pensionPot > 0) {
            const pensionNetNeeded = Math.max(0, drawdownNetTarget - guaranteedIncome);
            if (pensionNetNeeded > 0) {
              const grossDrawNeeded = getGrossPensionNeededForNet(pensionNetNeeded, pensionPot);
              const draw = Math.min(pensionPot, grossDrawNeeded);
              executeDeduct('pension', draw);
              const netDraw = approximateNetFromGross(draw);
              remainingNeeded = Math.max(0, requiredNetIncomeTarget - (guaranteedIncome + netDraw));
              netDrawdownAchieved += netDraw;
            } else {
              remainingNeeded = Math.max(0, requiredNetIncomeTarget - guaranteedIncome);
            }
          } else {
            remainingNeeded = Math.max(0, requiredNetIncomeTarget - guaranteedIncome);
          }

          if (isaPot > 0 && remainingNeeded > 0) {
            const draw = Math.min(isaPot, remainingNeeded);
            executeDeduct('isa', draw);
            remainingNeeded -= draw;
            netDrawdownAchieved += draw;
          }
          if (cashGiaPot > 0 && remainingNeeded > 0) {
            const draw = Math.min(cashGiaPot, remainingNeeded);
            executeDeduct('cashGia', draw);
            remainingNeeded -= draw;
            netDrawdownAchieved += draw;
          }
        } else if (strategy === 'isa_first' || strategy === 'cash_first' || strategy === 'pension_first') {
          const order: ('isa' | 'cashGia' | 'pension')[] =
            strategy === 'cash_first'
              ? ['cashGia', 'isa', 'pension']
              : strategy === 'pension_first'
              ? ['pension', 'isa', 'cashGia']
              : ['isa', 'cashGia', 'pension'];

          for (const potType of order) {
            if (remainingNeeded <= 0) break;
            if (potType === 'isa' && isaPot > 0) {
              const draw = Math.min(isaPot, remainingNeeded);
              executeDeduct('isa', draw);
              remainingNeeded -= draw;
              netDrawdownAchieved += draw;
            } else if (potType === 'cashGia' && cashGiaPot > 0) {
              const draw = Math.min(cashGiaPot, remainingNeeded);
              executeDeduct('cashGia', draw);
              remainingNeeded -= draw;
              netDrawdownAchieved += draw;
            } else if (potType === 'pension' && canAccessPension && pensionPot > 0) {
              const grossDrawNeeded = getGrossPensionNeededForNet(remainingNeeded, pensionPot);
              const draw = Math.min(pensionPot, grossDrawNeeded);
              executeDeduct('pension', draw);
              const netDraw = approximateNetFromGross(draw);
              remainingNeeded = Math.max(0, remainingNeeded - netDraw);
              netDrawdownAchieved += netDraw;
            }
          }
        } else if (strategy === 'tax_free_bracket' || strategy === 'basic_rate_bracket' || strategy === 'higher_rate_bracket') {
          const isPrimaryScot = profile.taxRegion === 'scotland';
          const isPartnerScot = (profile.partnerTaxRegion || profile.taxRegion) === 'scotland';

          const indexTaxBands = profile.indexTaxBands ?? true;
          const inflMult = indexTaxBands ? cumulativeInflationFactor : 1;

          let priThresholdGross = 12570 * inflMult;
          if (strategy === 'basic_rate_bracket') {
            priThresholdGross = (12570 + (isPrimaryScot ? SCOT_INTERMEDIATE_THRESHOLD : RUK_BASIC_THRESHOLD)) * inflMult;
          } else if (strategy === 'higher_rate_bracket') {
            priThresholdGross = (isPrimaryScot ? (12570 + SCOT_HIGHER_THRESHOLD) : RUK_ADDITIONAL_THRESHOLD) * inflMult;
          }

          let partThresholdGross = 12570 * inflMult;
          if (strategy === 'basic_rate_bracket') {
            partThresholdGross = (12570 + (isPartnerScot ? SCOT_INTERMEDIATE_THRESHOLD : RUK_BASIC_THRESHOLD)) * inflMult;
          } else if (strategy === 'higher_rate_bracket') {
            partThresholdGross = (isPartnerScot ? (12570 + SCOT_HIGHER_THRESHOLD) : RUK_ADDITIONAL_THRESHOLD) * inflMult;
          }

          const primaryTaxablePercent = (primaryCumulativeTaxFreeDrawn >= maxLsa) ? 1.0 : 0.75;
          const partnerTaxablePercent = (partnerCumulativeTaxFreeDrawn >= partnerMaxLsa) ? 1.0 : 0.75;

          const cashGiaReturn = cashGiaReturnRate !== undefined ? cashGiaReturnRate : (blendedReturnRate * 0.90);
          const primaryCashGrowth = primaryCashGiaPot * cashGiaReturn;
          const partnerCashGrowth = partnerCashGiaPot * cashGiaReturn;

          const priIncomeAlready = statePensionThisYr / (profile.isCouplePlanning ? 2 : 1) + (annuityIncomeThisYear + dbIncomeThisYr + (fixedIncomeThisYr || 0)) / (profile.isCouplePlanning ? 2 : 1) + primaryCashGrowth;
          const partIncomeAlready = profile.isCouplePlanning ? (statePensionThisYr / 2 + (annuityIncomeThisYear + dbIncomeThisYr + (fixedIncomeThisYr || 0)) / 2 + partnerCashGrowth) : 0;

          const priRoom = Math.max(0, priThresholdGross - priIncomeAlready);
          const partRoom = profile.isCouplePlanning ? Math.max(0, partThresholdGross - partIncomeAlready) : 0;

          const maxPriGrossForBracket = primaryTaxablePercent > 0 ? priRoom / primaryTaxablePercent : priRoom;
          const maxPartGrossForBracket = partnerTaxablePercent > 0 ? partRoom / partnerTaxablePercent : partRoom;

          let priTargetGross = Math.min(canAccessPension ? primaryPensionPot : 0, maxPriGrossForBracket);
          let partTargetGross = Math.min(partnerCanAccessPension ? partnerPensionPot : 0, maxPartGrossForBracket);

          if (priTargetGross > 0 || partTargetGross > 0) {
             if (priTargetGross > 0) {
                executeDeduct('pension', priTargetGross, 'primary');
             }
             if (partTargetGross > 0) {
                executeDeduct('pension', partTargetGross, 'partner');
             }
             
             const netDraw = approximateNetFromGross(priTargetGross + partTargetGross);
             netDrawdownAchieved += netDraw;
             remainingNeeded = Math.max(0, remainingNeeded - netDraw);
          }
          if (isaPot > 0 && remainingNeeded > 0) {
            const draw = Math.min(isaPot, remainingNeeded);
            executeDeduct('isa', draw);
            remainingNeeded -= draw;
            netDrawdownAchieved += draw;
          }
          if (cashGiaPot > 0 && remainingNeeded > 0) {
            const draw = Math.min(cashGiaPot, remainingNeeded);
            executeDeduct('cashGia', draw);
            remainingNeeded -= draw;
            netDrawdownAchieved += draw;
          }
        } else if (strategy === 'pro_rata') {
          const hasPensionAccess = canAccessPension || partnerCanAccessPension;
          const totalAccessible = cashGiaPot + isaPot + (hasPensionAccess ? pensionPot : 0);
          if (totalAccessible > 0 && remainingNeeded > 0) {
            if (hasPensionAccess && pensionPot > 0) {
              const portion = pensionPot / totalAccessible;
              const netToDraw = remainingNeeded * portion;
              const grossDrawNeeded = getGrossPensionNeededForNet(netToDraw, pensionPot);
              const draw = Math.min(pensionPot, grossDrawNeeded);
              executeDeduct('pension', draw);
              const netDraw = approximateNetFromGross(draw);
              remainingNeeded = Math.max(0, remainingNeeded - netDraw);
              netDrawdownAchieved += netDraw;
            }
            if (isaPot > 0 && remainingNeeded > 0) {
              const portion = isaPot / totalAccessible;
              const draw = Math.min(isaPot, remainingNeeded * portion);
              executeDeduct('isa', draw);
              remainingNeeded -= draw;
              netDrawdownAchieved += draw;
            }
            if (cashGiaPot > 0 && remainingNeeded > 0) {
              const draw = Math.min(cashGiaPot, remainingNeeded);
              executeDeduct('cashGia', draw);
              remainingNeeded -= draw;
              netDrawdownAchieved += draw;
            }
          }
        }

        // Reinvest surplus income when net achieved exceeds living expenses spending target
        const totalNetAchieved = guaranteedIncome + netDrawdownAchieved;
        
        if (totalNetAchieved > requiredNetIncomeTarget) {
          const surplus = totalNetAchieved - requiredNetIncomeTarget;
          const reinvestOpt =
            profile.maximizedSpendConfig?.reinvestDestinationPot ||
            profile.annuityExcessReinvestOption ||
            'isa';

          if (reinvestOpt === 'isa' || reinvestOpt === 'stocks_and_shares_isa' || reinvestOpt === 'cash_isa') {
            addProRata('isa', surplus, false);
          } else if (reinvestOpt === 'gia' || reinvestOpt === 'cash') {
            addProRata('cashGia', surplus, false);
          } else if (reinvestOpt !== 'none') {
            addProRata('cashGia', surplus, false);
          }
        }

        // 2. Apply growth to the remaining pot balances (fixing phantom growth)
        growPots(pensionReturnRate, isaReturnRate, cashGiaReturnRate);

      }

      // Partner Mortality Inheritance
      if (profile.isCouplePlanning && !partnerDead && partnerAge === (profile.partnerLifeExpectancyAge || 95)) {
        partnerDead = true;
        primaryPensionPot += partnerPensionPot;
        partnerPensionPot = 0;
        primaryIsaPot += partnerIsaPot;
        partnerIsaPot = 0;
        primaryCashGiaPot += partnerCashGiaPot;
        partnerCashGiaPot = 0;
      }

      const totalPot = pensionPot + isaPot + cashGiaPot;
      const totalPotReal = totalPot / cumulativeInflationFactor;

      if (totalPot < minPotBalance) minPotBalance = totalPot;

      if (isRetired && totalPot <= 0 && depletedAtAge === null) {
        depletedAtAge = age;
      }

      trajectory.push({
        yearIndex: yr,
        calendarYear,
        age,
        partnerAge: profile.isCouplePlanning ? partnerAge : undefined,
        isRetired,
        histYear: hData.year,
        histEvent: hData.event,
        histEquityReturn: hData.equityReturn,
        histBondReturn: hData.bondReturn,
        histCashReturn: hData.cashReturn,
        histInflation: hData.inflation,
        blendedReturn: Math.round(blendedReturnRate * 1000) / 10,
        pensionPot: Math.round(pensionPot),
        isaPot: Math.round(isaPot),
        cashGiaPot: Math.round(cashGiaPot),
        totalPot: Math.round(totalPot),
        totalPotReal: Math.round(totalPotReal),
        drawdownAmount: Math.round(drawdownThisYr),
      });
    }

    const lastSnap = trajectory[trajectory.length - 1];
    const isSuccess = depletedAtAge === null && lastSnap.totalPot > 0;

    runResults.push({
      startYear: startData.year,
      startIndex,
      startEvent: startData.event,
      isSuccess,
      depletedAtAge,
      minPotBalance: Math.round(minPotBalance),
      retirementPotBalance: Math.round(retirementPotBalance),
      finalNominalBalance: lastSnap.totalPot,
      finalRealBalance: lastSnap.totalPotReal,
      trajectory,
    });
  }

  // Calculate Aggregates
  const successfulRuns = runResults.filter((r) => r.isSuccess).length;
  const successRate = Math.round((successfulRuns / runResults.length) * 100);

  // Sort runs by final real balance to find percentiles, best, worst
  const sortedByRealWealth = [...runResults].sort((a, b) => {
    if (a.finalRealBalance !== b.finalRealBalance) return a.finalRealBalance - b.finalRealBalance;
    if (a.depletedAtAge !== null && b.depletedAtAge !== null) return a.depletedAtAge - b.depletedAtAge;
    if (a.depletedAtAge !== null) return -1;
    if (b.depletedAtAge !== null) return 1;
    return 0;
  });
  
  const sortedByNominalWealth = [...runResults].sort((a, b) => {
    if (a.finalNominalBalance !== b.finalNominalBalance) return a.finalNominalBalance - b.finalNominalBalance;
    if (a.depletedAtAge !== null && b.depletedAtAge !== null) return a.depletedAtAge - b.depletedAtAge;
    if (a.depletedAtAge !== null) return -1;
    if (b.depletedAtAge !== null) return 1;
    return 0;
  });

  // Worst start year: earliest depletion age, or lowest final real balance
  const sortedByWorst = [...runResults].sort((a, b) => {
    if (a.depletedAtAge !== null && b.depletedAtAge !== null) {
      return a.depletedAtAge - b.depletedAtAge;
    }
    if (a.depletedAtAge !== null) return -1;
    if (b.depletedAtAge !== null) return 1;
    return a.finalRealBalance - b.finalRealBalance;
  });

  const worstStartYear = sortedByWorst[0];
  const bestStartYear = sortedByRealWealth[sortedByRealWealth.length - 1];

  const medianFinalReal = Math.round(getPercentile(sortedByRealWealth.map((r) => r.finalRealBalance), 50));
  const p10FinalReal = Math.round(getPercentile(sortedByRealWealth.map((r) => r.finalRealBalance), 10));
  const p90FinalReal = Math.round(getPercentile(sortedByRealWealth.map((r) => r.finalRealBalance), 90));

  const medianFinalNominal = Math.round(getPercentile(sortedByNominalWealth.map((r) => r.finalNominalBalance), 50));
  const p10FinalNominal = Math.round(getPercentile(sortedByNominalWealth.map((r) => r.finalNominalBalance), 10));
  const p90FinalNominal = Math.round(getPercentile(sortedByNominalWealth.map((r) => r.finalNominalBalance), 90));

  // Build aggregate trajectory percentiles by year Index
  const aggregateTrajectory: HistoricAggregateYear[] = [];
  for (let yr = 0; yr < numYears; yr++) {
    const age = safeCurrentAge + yr;
    const calendarYear = new Date().getFullYear() + yr;
    const isRetired = age >= profile.targetRetirementAge;

    const nominalPotsAtYr = runResults.map((r) => r.trajectory[yr]?.totalPot || 0).sort((a, b) => a - b);
    const realPotsAtYr = runResults.map((r) => r.trajectory[yr]?.totalPotReal || 0).sort((a, b) => a - b);

    aggregateTrajectory.push({
      age,
      calendarYear,
      isRetired,
      p10TotalPot: Math.round(getPercentile(nominalPotsAtYr, 10)),
      p25TotalPot: Math.round(getPercentile(nominalPotsAtYr, 25)),
      p50TotalPot: Math.round(getPercentile(nominalPotsAtYr, 50)),
      p75TotalPot: Math.round(getPercentile(nominalPotsAtYr, 75)),
      p90TotalPot: Math.round(getPercentile(nominalPotsAtYr, 90)),
      p10RealPot: Math.round(getPercentile(realPotsAtYr, 10)),
      p50RealPot: Math.round(getPercentile(realPotsAtYr, 50)),
      p90RealPot: Math.round(getPercentile(realPotsAtYr, 90)),
    });
  }

  return {
    totalRuns: runResults.length,
    successfulRuns,
    successRate,
    worstStartYear,
    bestStartYear,
    medianFinalNominal,
    medianFinalReal,
    p10FinalReal,
    p90FinalReal,
    p10FinalNominal,
    p90FinalNominal,
    runResults,
    aggregateTrajectory,
    allocation: customAllocation || (profile.assetAllocationSplit?.accumulation as unknown as AssetAllocation) || { equityPercent: 80, bondPercent: 15, cashPercent: 5 },
    maxAge,
  };
}

export const runHistoricSimulation = runHistoricModelingSimulation;
