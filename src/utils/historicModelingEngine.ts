import { UserProfile, InvestmentPots, TaxCalculationResult } from '../types';
import { DEFAULT_PARTNER_POTS, DEFAULT_POTS, ZERO_POTS, sanitizePots } from './defaultData';
import { parseTransferYear } from './potTransferUtils';
import { getPensionAccessAge, getPartnerPensionAccessAge, getLsaLimit, getPartnerLsaLimit, getLumpSumTakeAge, getPartnerLumpSumTakeAge, calculateUKTax, calculatePartnerUKTax, allocateLumpSumToPots, computeIncomeTaxOnAmount } from './ukTaxEngine';
import { getTargetIncomeForAge, getActualSpendingTargetForAge } from './projectionEngine';
import { SCOT_INTERMEDIATE_THRESHOLD, RUK_BASIC_THRESHOLD, SCOT_HIGHER_THRESHOLD, RUK_ADDITIONAL_THRESHOLD, STATE_PENSION_FULL_ANNUAL } from '../config/ukTaxRates';
import { HISTORIC_MARKET_DATA, getHistoricSequence, HistoricYearData } from '../data/historicMarketData';
import { getPotFeePercent } from './assetAllocation';

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
  primaryUncrystallisedPot?: number;
  primaryCrystallisedPot?: number;
  partnerUncrystallisedPot?: number;
  partnerCrystallisedPot?: number;
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
  const partnerLumpSumTakeAge = profile.isCouplePlanning ? getPartnerLumpSumTakeAge(profile) : 57;
  const maxLsa = getLsaLimit(profile);
  const partnerMaxLsa = profile.isCouplePlanning ? getPartnerLsaLimit(profile) : maxLsa;

  const cleanPots = sanitizePots(pots, pots ? ZERO_POTS : DEFAULT_POTS);
  const partnerFallback = profile.isCouplePlanning ? DEFAULT_PARTNER_POTS : ZERO_POTS;
  const partnerPots = sanitizePots(
    profile.partnerPots,
    profile.partnerPots
      ? ZERO_POTS
      : {
          ...partnerFallback,
          workplacePensionBalance: profile.partnerWorkplacePensionBalance ?? partnerFallback.workplacePensionBalance,
          sippBalance: profile.partnerSippBalance ?? partnerFallback.sippBalance,
          stocksAndSharesIsaBalance: profile.partnerIsaBalance ?? partnerFallback.stocksAndSharesIsaBalance,
        }
  );

  // Asset allocation dynamically applied in the year loop


  const runResults: HistoricRunResult[] = [];

  // Run 75 historical starting year scenarios (index 0..74)
  for (let startIndex = 0; startIndex < HISTORIC_MARKET_DATA.length; startIndex++) {
    const startData = HISTORIC_MARKET_DATA[startIndex];
    const rawSequence = getHistoricSequence(startIndex, numYears);
    const sequence = reverseSequence ? [...rawSequence].reverse() : rawSequence;

    let gkMultiplier = 1.0;
      let initialWithdrawalRate = 0;

      let primaryUncrystallisedPot = cleanPots.workplacePensionBalance + cleanPots.sippBalance;
    let primaryCrystallisedPot = 0;
    let primaryPensionPot = primaryUncrystallisedPot + primaryCrystallisedPot;
    let partnerUncrystallisedPot = profile.isCouplePlanning ? (partnerPots.workplacePensionBalance + partnerPots.sippBalance) : 0;
    let partnerCrystallisedPot = 0;
    let partnerPensionPot = partnerUncrystallisedPot + partnerCrystallisedPot;
    let primaryIsaPot = cleanPots.stocksAndSharesIsaBalance + cleanPots.cashIsaBalance + cleanPots.lisaBalance;
    let partnerIsaPot = profile.isCouplePlanning ? (partnerPots.stocksAndSharesIsaBalance + partnerPots.cashIsaBalance + partnerPots.lisaBalance) : 0;
    let primaryCashGiaPot = cleanPots.giaBalance + cleanPots.cashSavingsBalance;
    let partnerCashGiaPot = profile.isCouplePlanning ? (partnerPots.giaBalance + partnerPots.cashSavingsBalance) : 0;

    let pensionPot = primaryPensionPot + partnerPensionPot;
    let isaPot = primaryIsaPot + partnerIsaPot;
    let cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;

    const parseAnnuityTypeConfig = (typeStr = '') => {
      const isInflationLinked = typeStr.includes('inflation_linked');
      let fixedEscalationRate = undefined;
      if (typeStr.includes('_3')) fixedEscalationRate = 0.03;
      else if (typeStr.includes('_5')) fixedEscalationRate = 0.05;
      return { isInflationLinked, fixedEscalationRate };
    };
    let pclsTaken = false;
    let partnerPclsTaken = false;
    const priorPrimaryDbLumpSum = (profile.dbPensions || [])
      .filter((p) => p.enabled && (p.owner || 'primary') !== 'partner' && (p.startAge || 65) < profile.currentAge)
      .reduce((sum, p) => sum + (p.taxFreeLumpSum || 0), 0);
    const priorPartnerDbLumpSum = (profile.dbPensions || [])
      .filter((p) => p.enabled && p.owner === 'partner' && (p.startAge || 65) < (profile.partnerCurrentAge || profile.currentAge))
      .reduce((sum, p) => sum + (p.taxFreeLumpSum || 0), 0);

    let primaryCumulativeTaxFreeDrawn = priorPrimaryDbLumpSum;
    let partnerCumulativeTaxFreeDrawn = priorPartnerDbLumpSum;
    let depletedAtAge: number | null = null;
    let partnerDead = false;
    let minPotBalance = pensionPot + isaPot + cashGiaPot;
    let retirementPotBalance = 0;

    let annuityPurchased = false;
    let partnerAnnuityPurchased = false;
    const historicAnnuityStreams: Array<{
      baseNominal: number;
      isInflationLinked: boolean;
      fixedEscalationRate?: number;
      purchaseYearOffset: number;
      durationOption: string;
      durationUntilAge: number;
      owner: 'primary' | 'partner';
      purchaseInflationFactor: number;
    }> = [];

    let cumulativeInflationFactor = 1.0;
    const dbStartInflation: Record<string, number> = {};
    const trajectory: HistoricYearSnapshot[] = [];

    for (let yr = 0; yr < numYears; yr++) {
      const age = safeCurrentAge + yr;
      const partnerAge = age + ((profile.partnerCurrentAge ?? profile.currentAge) - profile.currentAge);
      const isRetired = age >= profile.targetRetirementAge;
      const isPhasedPrimary = profile.crystallisationMode === 'phased_tranches';
      const isPhasedPartner = profile.partnerCrystallisationMode === 'phased_tranches';
      const canAccessPension = age >= pensionAccessAge || (isPhasedPrimary && (profile.crystallisationTranches || []).some((t) => t.enabled && (t.frequency === 'recurring' ? (age >= t.age && (!t.endAge || age <= t.endAge)) : t.age <= age) && (t.owner || 'primary') !== 'partner'));
      const partnerCanAccessPension = profile.isCouplePlanning && !partnerDead && (partnerAge >= partnerPensionAccessAge || (isPhasedPartner && (profile.partnerCrystallisationTranches || profile.crystallisationTranches || []).some((t) => t.enabled && (t.frequency === 'recurring' ? (partnerAge >= t.age && (!t.endAge || partnerAge <= t.endAge)) : t.age <= partnerAge) && t.owner === 'partner')));
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
            const priCrystDrawn = Math.min(primaryCrystallisedPot, primaryDraw);
            const priUncrystDrawn = Math.min(primaryUncrystallisedPot, Math.max(0, primaryDraw - priCrystDrawn));
            primaryCrystallisedPot -= priCrystDrawn;
            primaryUncrystallisedPot -= priUncrystDrawn;
            primaryPensionPot = primaryCrystallisedPot + primaryUncrystallisedPot;
            primaryCumulativeTaxFreeDrawn += Math.min(priUncrystDrawn * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
            
            const partCrystDrawn = Math.min(partnerCrystallisedPot, partnerDraw);
            const partUncrystDrawn = Math.min(partnerUncrystallisedPot, Math.max(0, partnerDraw - partCrystDrawn));
            partnerCrystallisedPot -= partCrystDrawn;
            partnerUncrystallisedPot -= partUncrystDrawn;
            partnerPensionPot = partnerCrystallisedPot + partnerUncrystallisedPot;
            partnerCumulativeTaxFreeDrawn += Math.min(partUncrystDrawn * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
            pensionPot = primaryPensionPot + partnerPensionPot;
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
            const priCrystDrawn = Math.min(primaryCrystallisedPot, amount);
            const priUncrystDrawn = Math.min(primaryUncrystallisedPot, Math.max(0, amount - priCrystDrawn));
            primaryCrystallisedPot -= priCrystDrawn;
            primaryUncrystallisedPot -= priUncrystDrawn;
            primaryPensionPot = primaryCrystallisedPot + primaryUncrystallisedPot;
            primaryCumulativeTaxFreeDrawn += Math.min(priUncrystDrawn * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
          } else {
            const partCrystDrawn = Math.min(partnerCrystallisedPot, amount);
            const partUncrystDrawn = Math.min(partnerUncrystallisedPot, Math.max(0, amount - partCrystDrawn));
            partnerCrystallisedPot -= partCrystDrawn;
            partnerUncrystallisedPot -= partUncrystDrawn;
            partnerPensionPot = partnerCrystallisedPot + partnerUncrystallisedPot;
            partnerCumulativeTaxFreeDrawn += Math.min(partUncrystDrawn * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
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
          if (isPartner) {
            partnerUncrystallisedPot += amount;
            partnerPensionPot = partnerUncrystallisedPot + partnerCrystallisedPot;
          } else {
            primaryUncrystallisedPot += amount;
            primaryPensionPot = primaryUncrystallisedPot + primaryCrystallisedPot;
          }
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
        primaryUncrystallisedPot = Math.max(0, primaryUncrystallisedPot * (1 + pensionReturn));
        primaryCrystallisedPot = Math.max(0, primaryCrystallisedPot * (1 + pensionReturn));
        primaryPensionPot = primaryUncrystallisedPot + primaryCrystallisedPot;
        partnerUncrystallisedPot = Math.max(0, partnerUncrystallisedPot * (1 + pensionReturn));
        partnerCrystallisedPot = Math.max(0, partnerCrystallisedPot * (1 + pensionReturn));
        partnerPensionPot = partnerUncrystallisedPot + partnerCrystallisedPot;
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
      
      const blendedGrossReturnRate = (
        eqRatio * (hData.equityReturn / 100) +
        bondRatio * (hData.bondReturn / 100) +
        cashRatio * (hData.cashReturn / 100)
      );

      // Compute pot-specific net returns by subtracting investment fees (Issue 1 fix)
      const fees = profile.investmentFees;
      const pensionFeePercent = getPotFeePercent(fees, 'primary', 'pension', {
        workplacePensionBalance: cleanPots.workplacePensionBalance,
        sippBalance: cleanPots.sippBalance,
      }) / 100;
      const isaFeePercent = getPotFeePercent(fees, 'primary', 'stocksAndSharesIsa') / 100;
      const giaFeePercent = getPotFeePercent(fees, 'primary', 'gia') / 100;

      // Pot-specific returns: Pensions & ISAs follow blended return; Cash/GIA leans higher cash/bond weighting
      const cashGiaGrossReturnRate = 0.5 * (hData.cashReturn / 100) + 0.3 * (hData.bondReturn / 100) + 0.2 * (hData.equityReturn / 100);

      const pensionReturnRate = blendedGrossReturnRate - pensionFeePercent;
      const isaReturnRate = blendedGrossReturnRate - isaFeePercent;
      const cashGiaReturnRate = cashGiaGrossReturnRate - giaFeePercent;

      // Keep a blendedReturnRate for snapshot reporting (gross, for display purposes)
      const blendedReturnRate = blendedGrossReturnRate;

      if (age === profile.targetRetirementAge) {
        retirementPotBalance = pensionPot + isaPot + cashGiaPot;
      }

      const isUpfrontPrimary = (profile.crystallisationMode === 'upfront') || (!profile.crystallisationMode && profile.takeLumpSumAtStart);
      const isUpfrontPartner = (profile.partnerCrystallisationMode === 'upfront') || (!profile.partnerCrystallisationMode && (profile.partnerTakeLumpSumAtStart ?? profile.takeLumpSumAtStart));

      // Defined Benefit Pensions - evaluated before DC crystallisation so DB lump sum takes precedence & reserves LSA
      let primaryDbIncomeThisYr = 0;
      let partnerDbIncomeThisYr = 0;
      const activeDbPensions = (profile.dbPensions || []).filter((p) => p.enabled);
      activeDbPensions.forEach((db) => {
        const isPartner = db.owner === 'partner';
        if (isPartner && (!profile.isCouplePlanning || partnerDead)) return;
        const evalAge = isPartner ? partnerAge : age;
        const dbStartAge = db.startAge || 65;
        if (evalAge >= dbStartAge) {
          if (dbStartInflation[db.id] === undefined) {
            dbStartInflation[db.id] = cumulativeInflationFactor;
          }
          const startInflation = dbStartInflation[db.id] || 1;
          const dbInc = db.inflationLinked
            ? db.annualIncome * (cumulativeInflationFactor / startInflation)
            : db.annualIncome;
          if (isPartner) partnerDbIncomeThisYr += dbInc;
          else primaryDbIncomeThisYr += dbInc;
        }
        if (evalAge === dbStartAge && db.taxFreeLumpSum > 0) {
          const personMaxLsa = profile.isCouplePlanning && isPartner ? partnerMaxLsa : maxLsa;
          const cumTaxFree = profile.isCouplePlanning && isPartner ? partnerCumulativeTaxFreeDrawn : primaryCumulativeTaxFreeDrawn;
          const remLsa = Math.max(0, personMaxLsa - cumTaxFree);
          const lump = Math.min(db.taxFreeLumpSum, remLsa);
          if (isPartner) partnerCumulativeTaxFreeDrawn += lump;
          else primaryCumulativeTaxFreeDrawn += lump;
          if (db.targetPot !== 'spend_clear_debt') {
            if (db.targetPot === 'stocks_and_shares_isa' || db.targetPot === 'cash_isa' || db.targetPot === 'lisa') addProRata("isa", lump, isPartner);
            else addProRata("cashGia", lump, isPartner);
          }
        }
      });
      const dbIncomeThisYr = primaryDbIncomeThisYr + partnerDbIncomeThisYr;

      // Phased Crystallisation Tranches - Primary
      const primaryActiveTranches = isPhasedPrimary
        ? (profile.crystallisationTranches || []).filter(
            (t) => t.enabled && (t.owner || 'primary') !== 'partner' && (
              t.frequency === 'recurring'
                ? (age >= t.age && (!t.endAge || age <= t.endAge))
                : (t.age === age)
            )
          )
        : [];
      if (primaryPensionPot > 0 && primaryActiveTranches.length > 0) {
        for (const tranche of primaryActiveTranches) {
          if (primaryPensionPot <= 0) break;
          const pclsPct = Math.min(25, Math.max(0, tranche.pclsPercent ?? 25)) / 100;
          const pendingPrimaryDbLumpSum = activeDbPensions
            .filter((db) => (db.owner || 'primary') !== 'partner' && (db.startAge || 65) > age && db.taxFreeLumpSum > 0)
            .reduce((sum, db) => sum + db.taxFreeLumpSum, 0);
          const remainingLsa = Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn - pendingPrimaryDbLumpSum);
          const maxGrossForLsa = pclsPct > 0 ? Math.floor(remainingLsa / pclsPct) : primaryUncrystallisedPot;
          const grossCrystallised = Math.min(primaryUncrystallisedPot, tranche.amount, maxGrossForLsa);
          if (grossCrystallised <= 0) continue;

          const pclsAmount = Math.min(grossCrystallised * pclsPct, remainingLsa);
          primaryUncrystallisedPot -= grossCrystallised;
          
          primaryCrystallisedPot += (grossCrystallised - pclsAmount);
          
          primaryPensionPot = primaryUncrystallisedPot + primaryCrystallisedPot;
          primaryCumulativeTaxFreeDrawn += pclsAmount;
          const alloc = allocateLumpSumToPots(pclsAmount, tranche.targetPot || profile.lumpSumTargetPot, tranche.splits || profile.lumpSumSplits);
          primaryIsaPot += alloc.toIsa;
          primaryCashGiaPot += alloc.toCashGia;
        }
        pensionPot = primaryPensionPot + partnerPensionPot;
        isaPot = primaryIsaPot + partnerIsaPot;
        cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
      }

      // Phased Crystallisation Tranches - Partner
      const partnerActiveTranches = isPhasedPartner
        ? (profile.partnerCrystallisationTranches || profile.crystallisationTranches || []).filter(
            (t) => t.enabled && t.owner === 'partner' && (
              t.frequency === 'recurring'
                ? (partnerAge >= t.age && (!t.endAge || partnerAge <= t.endAge))
                : (t.age === partnerAge)
            )
          )
        : [];
      if (profile.isCouplePlanning && !partnerDead && partnerPensionPot > 0 && partnerActiveTranches.length > 0) {
        for (const tranche of partnerActiveTranches) {
          if (partnerPensionPot <= 0) break;
          const pclsPct = Math.min(25, Math.max(0, tranche.pclsPercent ?? 25)) / 100;
          const pendingPartnerDbLumpSum = activeDbPensions
            .filter((db) => db.owner === 'partner' && (db.startAge || 65) > partnerAge && db.taxFreeLumpSum > 0)
            .reduce((sum, db) => sum + db.taxFreeLumpSum, 0);
          const remainingLsa = Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn - pendingPartnerDbLumpSum);
          const maxGrossForLsa = pclsPct > 0 ? Math.floor(remainingLsa / pclsPct) : partnerUncrystallisedPot;
          const grossCrystallised = Math.min(partnerUncrystallisedPot, tranche.amount, maxGrossForLsa);
          if (grossCrystallised <= 0) continue;

          const pclsAmount = Math.min(grossCrystallised * pclsPct, remainingLsa);
          partnerUncrystallisedPot -= grossCrystallised;
          
          partnerCrystallisedPot += (grossCrystallised - pclsAmount);
          
          partnerPensionPot = partnerUncrystallisedPot + partnerCrystallisedPot;
          partnerCumulativeTaxFreeDrawn += pclsAmount;
          const alloc = allocateLumpSumToPots(pclsAmount, tranche.targetPot || profile.partnerLumpSumTargetPot || profile.lumpSumTargetPot, tranche.splits || profile.partnerLumpSumSplits || profile.lumpSumSplits);
          partnerIsaPot += alloc.toIsa;
          partnerCashGiaPot += alloc.toCashGia;
        }
        pensionPot = primaryPensionPot + partnerPensionPot;
        isaPot = primaryIsaPot + partnerIsaPot;
        cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
      }

      // Upfront PCLS - Primary
      if (
        isRetired &&
        isUpfrontPrimary &&
        !pclsTaken &&
        age >= lumpSumTakeAge &&
        canAccessPension &&
        primaryUncrystallisedPot > 0 &&
        (profile.pclsLumpSumPercent ?? 25) > 0
      ) {
        const lumpSumPercent = Math.min(25, profile.pclsLumpSumPercent ?? 25) / 100;
        const pendingPrimaryDbLumpSum = activeDbPensions
          .filter((db) => (db.owner || 'primary') !== 'partner' && (db.startAge || 65) > age && db.taxFreeLumpSum > 0)
          .reduce((sum, db) => sum + db.taxFreeLumpSum, 0);
        const remainingLsa = Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn - pendingPrimaryDbLumpSum);
        const pclsAmount = Math.min(primaryUncrystallisedPot * lumpSumPercent, remainingLsa);
        
        primaryCrystallisedPot += (primaryUncrystallisedPot - pclsAmount);
        primaryUncrystallisedPot = 0;
        
        primaryPensionPot = primaryUncrystallisedPot + primaryCrystallisedPot;
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
        isUpfrontPartner &&
        !partnerDead && !partnerPclsTaken &&
        partnerAge >= (profile.partnerTargetRetirementAge ?? profile.targetRetirementAge) &&
        partnerAge >= partnerLumpSumTakeAge &&
        partnerCanAccessPension &&
        partnerUncrystallisedPot > 0 &&
        (profile.partnerPclsLumpSumPercent ?? 25) > 0
      ) {
        const lumpSumPercent = Math.min(25, profile.partnerPclsLumpSumPercent ?? 25) / 100;
        const pendingPartnerDbLumpSum = activeDbPensions
          .filter((db) => db.owner === 'partner' && (db.startAge || 65) > partnerAge && db.taxFreeLumpSum > 0)
          .reduce((sum, db) => sum + db.taxFreeLumpSum, 0);
        const remainingLsa = Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn - pendingPartnerDbLumpSum);
        const partnerPclsAmount = Math.min(partnerUncrystallisedPot * lumpSumPercent, remainingLsa);
        
        partnerCrystallisedPot += (partnerUncrystallisedPot - partnerPclsAmount);
        partnerUncrystallisedPot = 0;
        
        partnerPensionPot = partnerUncrystallisedPot + partnerCrystallisedPot;
        pensionPot = primaryPensionPot + partnerPensionPot;
        const alloc = allocateLumpSumToPots(partnerPclsAmount, profile.partnerLumpSumTargetPot || profile.lumpSumTargetPot, profile.partnerLumpSumSplits || profile.lumpSumSplits);
        partnerIsaPot += alloc.toIsa;
        partnerCashGiaPot += alloc.toCashGia;
        isaPot = primaryIsaPot + partnerIsaPot;
        cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
        partnerPclsTaken = true;
        partnerCumulativeTaxFreeDrawn += partnerPclsAmount;
      }

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
          const transferYear = parseTransferYear(transfer.transferDate);
          if (transferYear !== undefined && transferYear === calendarYear) match = true;
        } else if (transfer.transferAge !== undefined && transfer.transferAge > 0) {
          const evalAge = isSrcPartner ? partnerAge : age;
          if (evalAge === transfer.transferAge) match = true;
        }

        if (match) {
          const srcIsPension = transfer.sourcePot === 'workplace_pension' || transfer.sourcePot === 'sipp';
          const srcIsIsa = transfer.sourcePot === 'stocks_and_shares_isa' || transfer.sourcePot === 'cash_isa' || transfer.sourcePot === 'lisa';
          const srcIsGiaCash = transfer.sourcePot === 'gia' || transfer.sourcePot === 'cash_savings';

          let availableSrc: number;
          if (isSrcPartner) {
            availableSrc = srcIsPension ? partnerPensionPot : srcIsIsa ? partnerIsaPot : srcIsGiaCash ? partnerCashGiaPot : 0;
          } else {
            availableSrc = srcIsPension ? primaryPensionPot : srcIsIsa ? primaryIsaPot : srcIsGiaCash ? primaryCashGiaPot : 0;
          }

          const requestedTransfer = (transfer.amount != null && transfer.amount > 0) ? transfer.amount : availableSrc;
          const actualTransfer = Math.min(requestedTransfer, Math.max(0, availableSrc));

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
            const dstOwnerAge = isDstPartner ? partnerAge : age;
            const srcIsLisa = transfer.sourcePot === 'lisa';
            if (dstIsSipp && !srcIsPension) {
              addedAmount = actualTransfer * 1.25;
            } else if (dstIsLisa && dstOwnerAge < 50 && !srcIsLisa) {
              addedAmount = actualTransfer + Math.min(actualTransfer, 4000) * 0.25;
            }

            if (dstIsPension) addProRata("pension", addedAmount, isDstPartner);
            else if (dstIsIsa || dstIsLisa) addProRata("isa", addedAmount, isDstPartner);
            else if (dstIsGiaCash) addProRata("cashGia", addedAmount, isDstPartner);
          }
        }
      });

      // Fixed Income Streams
      let primaryFixedIncomeThisYr = 0;
      let partnerFixedIncomeThisYr = 0;
      (profile.fixedIncomeStreams || []).filter((s) => s.enabled).forEach((s) => {
        const isPartner = (s.owner || 'primary') === 'partner';
        if (isPartner && (!profile.isCouplePlanning || partnerDead)) return;
        const evalAge = isPartner ? partnerAge : age;
        if (evalAge >= s.startAge && (s.endAge === undefined || evalAge <= s.endAge)) {
          const inc = s.inflationLinked ? s.annualAmount * cumulativeInflationFactor : s.annualAmount;
          if (isPartner) partnerFixedIncomeThisYr += inc;
          else primaryFixedIncomeThisYr += inc;
        }
      });
      const fixedIncomeThisYr = primaryFixedIncomeThisYr + partnerFixedIncomeThisYr;

      // State Pensions (Primary + Partner if couple mode)
      let primaryStatePensionThisYr = 0;
      let partnerStatePensionThisYr = 0;
      const primaryDeferralYears = profile.statePensionDeferralYears || 0;
      const primaryDeferralBoost = 1 + (0.058 * primaryDeferralYears);
      if ((profile.includeStatePension ?? true) && age >= (profile.statePensionAge || 67) + primaryDeferralYears) {
        const primaryYears = Math.min(35, profile.qualifyingYears ?? 35);
        if (primaryYears >= 10) {
          const primaryFull = profile.fullStatePensionAmount ?? STATE_PENSION_FULL_ANNUAL;
          const primaryAnnualCalculated = Math.round((primaryYears / 35) * primaryFull * 100) / 100;
          const spAmount = profile.statePensionAmountAnnual ?? primaryAnnualCalculated;
          const primaryTripleLock = profile.enableTripleLock ?? true;
          primaryStatePensionThisYr += spAmount * (primaryTripleLock ? cumulativeInflationFactor : 1) * primaryDeferralBoost;
        }
      }
      if (profile.isCouplePlanning && !partnerDead && (profile.partnerIncludeStatePension ?? true)) {
        const partnerDeferralYears = profile.partnerStatePensionDeferralYears || 0;
        const partnerDeferralBoost = 1 + (0.058 * partnerDeferralYears);
        if (partnerAge >= (profile.partnerStatePensionAge || 67) + partnerDeferralYears) {
          const partnerYears = Math.min(35, profile.partnerQualifyingYears ?? 35);
          if (partnerYears >= 10) {
            const partnerTripleLock = profile.partnerEnableTripleLock ?? true;
            const partnerFull = profile.partnerFullStatePensionAmount ?? STATE_PENSION_FULL_ANNUAL;
            const partnerAnnualCalculated = Math.round((partnerYears / 35) * partnerFull * 100) / 100;
            const pSpAmount = profile.partnerStatePensionAmountAnnual ?? partnerAnnualCalculated;
            partnerStatePensionThisYr += pSpAmount * (partnerTripleLock ? cumulativeInflationFactor : 1) * partnerDeferralBoost;
          }
        }
      }
      const statePensionThisYr = primaryStatePensionThisYr + partnerStatePensionThisYr;

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

        // Fix Issue 2: PCLS only from uncrystallised portion; deduct proportionally from both sub-pots
        const uncrystFraction = primaryPensionPot > 0 ? primaryUncrystallisedPot / primaryPensionPot : 0;
        const uncrystForAnnuity = grossPotForAnnuity * uncrystFraction;
        const crystForAnnuity = grossPotForAnnuity * (1 - uncrystFraction);

        let pclsFromAnnuity = 0;
        if (primaryCumulativeTaxFreeDrawn < maxLsa && uncrystForAnnuity > 0) {
          pclsFromAnnuity = Math.min(uncrystForAnnuity * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
          const alloc = allocateLumpSumToPots(pclsFromAnnuity, profile.lumpSumTargetPot, profile.lumpSumSplits);
          primaryIsaPot += alloc.toIsa;
          primaryCashGiaPot += alloc.toCashGia;
          primaryCumulativeTaxFreeDrawn += pclsFromAnnuity;
          isaPot = primaryIsaPot + partnerIsaPot;
          cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
        }

        const actualCapitalToAnnuity = grossPotForAnnuity - pclsFromAnnuity;

        // Deduct from sub-pots correctly
        primaryUncrystallisedPot = Math.max(0, primaryUncrystallisedPot - uncrystForAnnuity);
        primaryCrystallisedPot = Math.max(0, primaryCrystallisedPot - crystForAnnuity);
        primaryPensionPot = primaryUncrystallisedPot + primaryCrystallisedPot;
        pensionPot = primaryPensionPot + partnerPensionPot;

        const rate = (profile.annuityRatePercent || 4.2) / 100;
        const baseNominal = actualCapitalToAnnuity * rate;
        annuityPurchased = true;


        const cfgPrimary = parseAnnuityTypeConfig(profile.annuityType);
        historicAnnuityStreams.push({
          baseNominal,
          isInflationLinked: cfgPrimary.isInflationLinked,
          fixedEscalationRate: cfgPrimary.fixedEscalationRate,
          durationOption: profile.annuityDurationOption || 'lifetime',
          durationUntilAge: profile.annuityDurationUntilAge || 75,
          owner: 'primary',
          purchaseInflationFactor: cumulativeInflationFactor,
          purchaseYearOffset: yr,
        });
      }

      // Partner Single Annuity Purchase
      const partnerOption = profile.partnerIncomeProductOption || profile.incomeProductOption;
      const partnerTargetPurchaseAge = Math.max(partnerPensionAccessAge, profile.partnerAnnuityPurchaseAge ?? (profile.partnerTargetRetirementAge ?? profile.targetRetirementAge));
      if (
        profile.isCouplePlanning &&
        partnerCanAccessPension &&
        partnerPensionPot > 0 &&
        !partnerAnnuityPurchased &&
        (partnerOption === 'annuity' || partnerOption === 'hybrid') &&
        partnerAge >= partnerTargetPurchaseAge
      ) {
        const allocPercent =
          partnerOption === 'annuity'
            ? 100
            : Math.min(100, Math.max(1, profile.partnerAnnuityAllocationPercent ?? 50));
        const grossPotForAnnuity = partnerPensionPot * (allocPercent / 100);

        // Fix Issue 2: PCLS only from uncrystallised portion of partner's pension
        const uncrystFraction = partnerPensionPot > 0 ? partnerUncrystallisedPot / partnerPensionPot : 0;
        const uncrystForAnnuity = grossPotForAnnuity * uncrystFraction;
        const crystForAnnuity = grossPotForAnnuity * (1 - uncrystFraction);

        let pclsFromAnnuity = 0;
        if (partnerCumulativeTaxFreeDrawn < partnerMaxLsa && uncrystForAnnuity > 0) {
          pclsFromAnnuity = Math.min(uncrystForAnnuity * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
          const alloc = allocateLumpSumToPots(pclsFromAnnuity, profile.partnerLumpSumTargetPot || profile.lumpSumTargetPot, profile.partnerLumpSumSplits || profile.lumpSumSplits);
          partnerIsaPot += alloc.toIsa;
          partnerCashGiaPot += alloc.toCashGia;
          partnerCumulativeTaxFreeDrawn += pclsFromAnnuity;
          isaPot = primaryIsaPot + partnerIsaPot;
          cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
        }

        const actualCapitalToAnnuity = grossPotForAnnuity - pclsFromAnnuity;

        // Deduct from sub-pots correctly
        partnerUncrystallisedPot = Math.max(0, partnerUncrystallisedPot - uncrystForAnnuity);
        partnerCrystallisedPot = Math.max(0, partnerCrystallisedPot - crystForAnnuity);
        partnerPensionPot = partnerUncrystallisedPot + partnerCrystallisedPot;
        pensionPot = primaryPensionPot + partnerPensionPot;

        const rate = (profile.partnerAnnuityRatePercent || profile.annuityRatePercent || 4.2) / 100;
        const baseNominal = actualCapitalToAnnuity * rate;
        partnerAnnuityPurchased = true;

        const cfgPartner = parseAnnuityTypeConfig(profile.partnerAnnuityType || profile.annuityType);
        historicAnnuityStreams.push({
          baseNominal,
          isInflationLinked: cfgPartner.isInflationLinked,
          fixedEscalationRate: cfgPartner.fixedEscalationRate,
          durationOption: profile.partnerAnnuityDurationOption || 'lifetime',
          durationUntilAge: profile.partnerAnnuityDurationUntilAge || 75,
          owner: 'partner',
          purchaseInflationFactor: cumulativeInflationFactor,
          purchaseYearOffset: yr,
        });
      }

      // Calculate Annuity Income for Current Year
      let primaryAnnuityIncomeThisYear = 0;
      let partnerAnnuityIncomeThisYear = 0;
      historicAnnuityStreams.forEach((stream) => {
        if (stream.owner === 'partner' && partnerDead) return;
        const streamOwnerAge = stream.owner === 'partner' ? partnerAge : age;
        if (stream.durationOption === 'until_age' && streamOwnerAge >= stream.durationUntilAge) {
          return;
        }
        let streamNominal = stream.baseNominal;
        if (stream.isInflationLinked) {
          streamNominal = stream.baseNominal * (cumulativeInflationFactor / (stream.purchaseInflationFactor || 1));
        } else if (stream.fixedEscalationRate) {
          const yearsSincePurchase = Math.max(0, yr - (stream.purchaseYearOffset || 0));
          streamNominal = stream.baseNominal * Math.pow(1 + stream.fixedEscalationRate, yearsSincePurchase);
        }
        if (stream.owner === 'partner') partnerAnnuityIncomeThisYear += streamNominal;
        else primaryAnnuityIncomeThisYear += streamNominal;
      });
      const annuityIncomeThisYear = primaryAnnuityIncomeThisYear + partnerAnnuityIncomeThisYear;

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

        // Process accumulation life events (income injections or capital expense deductions)
        const activeAccumEvents = (profile.decumulationLifeEvents || []).filter((e) => e.enabled);
        for (const event of activeAccumEvents) {
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
                const potTarget = event.targetPot || 'cash_savings';
                const isPension = potTarget === 'sipp';
                const isIsa = (potTarget as string) === 'stocks_and_shares_isa' || (potTarget as string) === 'cash_isa' || (potTarget as string) === 'lisa' || (potTarget as string) === 'isa';
                const potName = isPension ? 'pension' : isIsa ? 'isa' : 'cashGia';

                const availTarget = potName === 'pension' ? (canAccessPension ? pensionPot : 0) : potName === 'isa' ? isaPot : cashGiaPot;
                const drawn = Math.min(availTarget, eventAmount);
                deductProRata(potName, drawn);
                let remExpense = eventAmount - drawn;
                if ((event.allowWaterfall ?? false) && remExpense > 0) {
                  if (cashGiaPot > 0 && remExpense > 0) {
                    const d = Math.min(cashGiaPot, remExpense);
                    deductProRata('cashGia', d);
                    remExpense -= d;
                  }
                  if (isaPot > 0 && remExpense > 0) {
                    const d = Math.min(isaPot, remExpense);
                    deductProRata('isa', d);
                    remExpense -= d;
                  }
                }
              }
            }
          }
        }

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

        let incomeIncreaseFactor = cumulativeInflationFactor;
        if (profile.incomeIncreaseMode === 'custom') {
          const customRate = (profile.customIncomeIncreasePercent ?? 0) / 100;
          incomeIncreaseFactor = Math.pow(1 + customRate, yr);
        }

        // Target income calculations accounting for Maximized Spend & Reinvest Excess
        if (profile.dynamicSpendingRules?.enabled) {
          const totalWealth = pensionPot + isaPot + cashGiaPot;
          const nominalBaseTarget = getActualSpendingTargetForAge(profile, age) * incomeIncreaseFactor;
          
          if (initialWithdrawalRate === 0 && totalWealth > 0) {
            initialWithdrawalRate = nominalBaseTarget / totalWealth;
          } else if (initialWithdrawalRate > 0 && totalWealth > 0) {
            const currentWithdrawalRate = (nominalBaseTarget * gkMultiplier) / totalWealth;
            const presThresh = 1 + (profile.dynamicSpendingRules.capitalPreservationThresholdPercent / 100);
            const presCut = profile.dynamicSpendingRules.capitalPreservationCutPercent / 100;
            const prospThresh = 1 - (profile.dynamicSpendingRules.prosperityThresholdPercent / 100);
            const prospInc = profile.dynamicSpendingRules.prosperityIncreasePercent / 100;
            
            if (currentWithdrawalRate > (initialWithdrawalRate * presThresh)) {
              gkMultiplier *= (1 - presCut);
            } else if (currentWithdrawalRate < (initialWithdrawalRate * prospThresh)) {
              gkMultiplier *= (1 + prospInc);
            }
            
            if (profile.dynamicSpendingRules.skipInflationOnNegativeReturn && blendedReturnRate < 0) {
              // Cancel out this year's inflation growth
              gkMultiplier /= (1 + hInf);
            }
          }
        }

        const essentialFloor = (profile.essentialRetirementIncomeAnnual !== undefined && profile.essentialRetirementIncomeAnnual > 0)
          ? profile.essentialRetirementIncomeAnnual
          : Math.round(getActualSpendingTargetForAge(profile, age) * 0.65);
        const maxDrawdownIncomeTarget = Math.max(essentialFloor, getTargetIncomeForAge(profile, age) * gkMultiplier);
        const actualSpendingBase = Math.max(essentialFloor, getActualSpendingTargetForAge(profile, age) * gkMultiplier);

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

        const requiredNetIncomeTarget = actualSpendingBase * incomeIncreaseFactor + lifeEventsExpenseThisYear;
        const isBracketStrategy = ['tax_optimizer', 'tax_free_bracket', 'basic_rate_bracket', 'higher_rate_bracket'].includes(profile.drawdownStrategy || 'isa_first');
        const effectiveReinvestExcess = isReinvestExcess || isBracketStrategy;
        const drawdownNetTarget = effectiveReinvestExcess
          ? (maxDrawdownIncomeTarget * incomeIncreaseFactor + lifeEventsExpenseThisYear)
          : requiredNetIncomeTarget;

        const primaryGuaranteedIncome = primaryStatePensionThisYr + primaryAnnuityIncomeThisYear + primaryDbIncomeThisYr + primaryFixedIncomeThisYr;
        const partnerGuaranteedIncome = (profile.isCouplePlanning && !partnerDead)
          ? (partnerStatePensionThisYr + partnerAnnuityIncomeThisYear + partnerDbIncomeThisYr + partnerFixedIncomeThisYr)
          : 0;
        const guaranteedIncome = primaryGuaranteedIncome + partnerGuaranteedIncome;

        // Net down the guaranteed income by accurate individual income tax before subtracting from net target
        const indexTaxBandsForGI = profile.indexTaxBands ?? true;
        const inflMultGI = indexTaxBandsForGI ? cumulativeInflationFactor : 1;
        const isScotPri = profile.taxRegion === 'scotland';
        const isScotPart = (profile.partnerTaxRegion || profile.taxRegion) === 'scotland';

        const { tax: priGiTax } = computeIncomeTaxOnAmount(primaryGuaranteedIncome / inflMultGI, isScotPri, profile.customTaxBands);
        const { tax: partGiTax } = (profile.isCouplePlanning && !partnerDead)
          ? computeIncomeTaxOnAmount(partnerGuaranteedIncome / inflMultGI, isScotPart, profile.customTaxBands)
          : { tax: 0 };
        const guaranteedTaxLiability = (priGiTax + partGiTax) * inflMultGI;
        const netGuaranteedIncome = Math.max(0, guaranteedIncome - guaranteedTaxLiability);
        let remainingNeeded = Math.max(0, drawdownNetTarget - netGuaranteedIncome);

        const executeDeduct = (potType: 'pension' | 'isa' | 'cashGia', amount: number, owner: 'primary' | 'partner') => {
          if (amount <= 0) return;
          deductExplicit(potType, amount, owner);
          drawdownThisYr += amount;
        };

        const approximateNetFromGrossForOwner = (grossDraw: number, owner: 'primary' | 'partner'): number => {
          let taxFree = 0;
          
          if (owner === 'primary') {
            if (primaryCumulativeTaxFreeDrawn < maxLsa) {
               const crystDrawn = Math.min(primaryCrystallisedPot, grossDraw);
               const uncrystDrawn = Math.min(primaryUncrystallisedPot, Math.max(0, grossDraw - crystDrawn));
               taxFree = Math.min(uncrystDrawn * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
            }
          } else {
            if (partnerCumulativeTaxFreeDrawn < partnerMaxLsa) {
               const crystDrawn = Math.min(partnerCrystallisedPot, grossDraw);
               const uncrystDrawn = Math.min(partnerUncrystallisedPot, Math.max(0, grossDraw - crystDrawn));
               taxFree = Math.min(uncrystDrawn * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
            }
          }
          
          const taxable = grossDraw - taxFree;
          
          const indexTaxBands = profile.indexTaxBands ?? true;
          const inflMult = indexTaxBands ? cumulativeInflationFactor : 1;
          const isScottish = owner === 'primary' ? profile.taxRegion === 'scotland' : (profile.partnerTaxRegion || profile.taxRegion) === 'scotland';
          
          const guaranteed = owner === 'primary' ? primaryGuaranteedIncome : partnerGuaranteedIncome;
          
          const { tax: totalTax } = computeIncomeTaxOnAmount((guaranteed + taxable) / inflMult, isScottish, profile.customTaxBands);
          const { tax: baseTax } = computeIncomeTaxOnAmount(guaranteed / inflMult, isScottish, profile.customTaxBands);
          const taxOnDraw = (totalTax - baseTax) * inflMult;
          
          return grossDraw - Math.max(0, taxOnDraw);
        };

        const getGrossPensionNeededForNetForOwner = (netNeeded: number, potAvailable: number, owner: 'primary' | 'partner'): number => {
          if (netNeeded <= 0 || potAvailable <= 0) return 0;
          let low = netNeeded;
          let high = netNeeded * 5.0;
          let bestGross = netNeeded;
          for (let i = 0; i < 25; i++) {
            const mid = (low + high) / 2;
            const net = approximateNetFromGrossForOwner(mid, owner);
            if (net < netNeeded) { low = mid; } else { high = mid; bestGross = mid; }
          }
          return Math.min(potAvailable, bestGross);
        };

        let netDrawdownAchieved = 0;

        const executeStrategyForOwner = (strategy: string, owner: 'primary' | 'partner', targetNetNeeded: number): number => {
          if (targetNetNeeded <= 0) return 0;

          const isPrimary = owner === 'primary';
          const pPot = isPrimary ? primaryPensionPot : partnerPensionPot;
          const iPot = isPrimary ? primaryIsaPot : partnerIsaPot;
          const cPot = isPrimary ? primaryCashGiaPot : partnerCashGiaPot;
          const hasAccess = isPrimary ? canAccessPension : (profile.isCouplePlanning && partnerCanAccessPension && !partnerDead);
          
          let remaining = targetNetNeeded;
          let netAchieved = 0;

          if (isReinvestExcess) {
            if (hasAccess && pPot > 0) {
              const grossDrawNeeded = getGrossPensionNeededForNetForOwner(remaining, pPot, owner);
              const draw = Math.min(pPot, grossDrawNeeded);
              const netDraw = approximateNetFromGrossForOwner(draw, owner);
              executeDeduct('pension', draw, owner);
              remaining = Math.max(0, remaining - netDraw);
              netAchieved += netDraw;
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
                const draw = Math.min(pPot, grossDrawNeeded);
                const netDraw = approximateNetFromGrossForOwner(draw, owner);
                executeDeduct('pension', draw, owner);
                remaining = Math.max(0, remaining - netDraw);
                netAchieved += netDraw;
              }
            }
          } else if (strategy === 'tax_optimizer' || strategy === 'tax_free_bracket' || strategy === 'basic_rate_bracket' || strategy === 'higher_rate_bracket') {
              const isScot = isPrimary ? profile.taxRegion === 'scotland' : (profile.partnerTaxRegion || profile.taxRegion) === 'scotland';
              const indexTaxBands = profile.indexTaxBands ?? true;
              const inflMult = indexTaxBands ? cumulativeInflationFactor : 1;
  
              const cb = profile.customTaxBands;
              const cEnabled = cb?.enabled;
              const paBase = cEnabled ? (cb.personalAllowance ?? 12570) : 12570;
              const singlePersonalAllowance = paBase * inflMult;
              
              const rukBasicThresh = cEnabled && cb.basicRateThreshold != null ? cb.basicRateThreshold : RUK_BASIC_THRESHOLD;
              const rukAddThresh = cEnabled && cb.higherRateThreshold != null ? cb.higherRateThreshold : RUK_ADDITIONAL_THRESHOLD;
              const scotIntThresh = cEnabled && cb.scotIntermediateThreshold != null ? cb.scotIntermediateThreshold : SCOT_INTERMEDIATE_THRESHOLD;
              const scotHigherThresh = cEnabled && cb.scotHigherThreshold != null ? cb.scotHigherThreshold : SCOT_HIGHER_THRESHOLD;

              let thresholdGross = singlePersonalAllowance;
              if (strategy === 'tax_optimizer' || strategy === 'basic_rate_bracket') {
                thresholdGross = singlePersonalAllowance + ((isScot ? scotIntThresh : rukBasicThresh) * inflMult);
              } else if (strategy === 'higher_rate_bracket') {
                thresholdGross = (isScot ? (singlePersonalAllowance + (scotHigherThresh * inflMult)) : (rukAddThresh * inflMult));
              }

            const incomeAlready = isPrimary ? primaryGuaranteedIncome : partnerGuaranteedIncome;
            const room = Math.max(0, thresholdGross - incomeAlready);

            const getGrossForTaxableTarget = (taxableTarget: number, crystPot: number, remainingLsa: number): number => {
              if (taxableTarget <= crystPot) return taxableTarget;
              let targetUncrystTaxable = taxableTarget - crystPot;
              const maxUncrystTaxableWithPcls = remainingLsa * 3;
              if (targetUncrystTaxable <= maxUncrystTaxableWithPcls) {
                return crystPot + (targetUncrystTaxable / 0.75);
              }
              targetUncrystTaxable -= maxUncrystTaxableWithPcls;
              return crystPot + (maxUncrystTaxableWithPcls / 0.75) + targetUncrystTaxable;
            };

            const crystPot = isPrimary ? primaryCrystallisedPot : partnerCrystallisedPot;
            const remLsa = Math.max(0, (isPrimary ? maxLsa : partnerMaxLsa) - (isPrimary ? primaryCumulativeTaxFreeDrawn : partnerCumulativeTaxFreeDrawn));

            const maxGrossForBracket = hasAccess ? getGrossForTaxableTarget(room, crystPot, remLsa) : 0;
            const targetGross = Math.min(hasAccess ? pPot : 0, maxGrossForBracket);

            if (targetGross > 0) {
               const netDraw = approximateNetFromGrossForOwner(targetGross, owner);
               executeDeduct('pension', targetGross, owner);
               netAchieved += netDraw;
               remaining = Math.max(0, remaining - netDraw);
            }
            const currentIPot = isPrimary ? primaryIsaPot : partnerIsaPot;
            if (currentIPot > 0 && remaining > 0) {
              const draw = Math.min(currentIPot, remaining);
              executeDeduct('isa', draw, owner);
              remaining -= draw;
              netAchieved += draw;
            }
            const currentCPot = isPrimary ? primaryCashGiaPot : partnerCashGiaPot;
            if (currentCPot > 0 && remaining > 0) {
              const draw = Math.min(currentCPot, remaining);
              executeDeduct('cashGia', draw, owner);
              remaining -= draw;
              netAchieved += draw;
            }
            // If spending need still remains after bracket, ISA, and Cash are drawn, draw remaining shortfall from pension
            if (hasAccess && remaining > 0) {
              const currentPPot = isPrimary ? primaryPensionPot : partnerPensionPot;
              if (currentPPot > 0) {
                const grossDrawNeeded = getGrossPensionNeededForNetForOwner(remaining, currentPPot, owner);
                const draw = Math.min(currentPPot, grossDrawNeeded);
                if (draw > 0) {
                  const netDraw = approximateNetFromGrossForOwner(draw, owner);
                  executeDeduct('pension', draw, owner);
                  remaining = Math.max(0, remaining - netDraw);
                  netAchieved += netDraw;
                }
              }
            }
          } else if (strategy === 'pro_rata') {
            const totalAccessible = cPot + iPot + (hasAccess ? pPot : 0);
            if (totalAccessible > 0 && remaining > 0) {
              if (hasAccess && pPot > 0) {
                const portion = pPot / totalAccessible;
                const netToDraw = remaining * portion;
                const grossDrawNeeded = getGrossPensionNeededForNetForOwner(netToDraw, pPot, owner);
                const draw = Math.min(pPot, grossDrawNeeded);
                const netDraw = approximateNetFromGrossForOwner(draw, owner);
                executeDeduct('pension', draw, owner);
                remaining = Math.max(0, remaining - netDraw);
                netAchieved += netDraw;
              }
              const nonPensionAccessible = iPot + cPot;
              if (nonPensionAccessible > 0 && remaining > 0) {
                if (iPot > 0) {
                  const portion = iPot / nonPensionAccessible;
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
          }
          return netAchieved;
        };

        const primaryStrategy = profile.drawdownStrategy || 'isa_first';
        const partnerStrategy = profile.isCouplePlanning ? (profile.partnerDrawdownStrategy || primaryStrategy) : primaryStrategy;

        let priAvailTotal = primaryIsaPot + primaryCashGiaPot + (canAccessPension ? primaryPensionPot : 0);
        let partAvailTotal = 0;
        if (profile.isCouplePlanning && !partnerDead) {
          partAvailTotal = partnerIsaPot + partnerCashGiaPot + (partnerCanAccessPension ? partnerPensionPot : 0);
        }

        const totalAvail = priAvailTotal + partAvailTotal;
        let priRatio = 1;
        let partRatio = 0;
        if (totalAvail > 0) {
          priRatio = priAvailTotal / totalAvail;
          partRatio = partAvailTotal / totalAvail;
        }

        let primaryNetNeeded = remainingNeeded * priRatio;
        let partnerNetNeeded = remainingNeeded * partRatio;

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
        
        netDrawdownAchieved = priAchieved + partAchieved;
        let householdShortfall = remainingNeeded - netDrawdownAchieved;

        // Household safety fallback: sweep remaining liquid pots and accessible pensions if individual passes didn't cover
        if (householdShortfall > 0) {
          if (primaryIsaPot > 0 && householdShortfall > 0) {
            const draw = Math.min(primaryIsaPot, householdShortfall);
            executeDeduct('isa', draw, 'primary');
            householdShortfall -= draw;
            priAchieved += draw;
          }
          if (profile.isCouplePlanning && !partnerDead && partnerIsaPot > 0 && householdShortfall > 0) {
            const draw = Math.min(partnerIsaPot, householdShortfall);
            executeDeduct('isa', draw, 'partner');
            householdShortfall -= draw;
            partAchieved += draw;
          }
          if (primaryCashGiaPot > 0 && householdShortfall > 0) {
            const draw = Math.min(primaryCashGiaPot, householdShortfall);
            executeDeduct('cashGia', draw, 'primary');
            householdShortfall -= draw;
            priAchieved += draw;
          }
          if (profile.isCouplePlanning && !partnerDead && partnerCashGiaPot > 0 && householdShortfall > 0) {
            const draw = Math.min(partnerCashGiaPot, householdShortfall);
            executeDeduct('cashGia', draw, 'partner');
            householdShortfall -= draw;
            partAchieved += draw;
          }
          if (canAccessPension && primaryPensionPot > 0 && householdShortfall > 0) {
            const grossNeeded = getGrossPensionNeededForNetForOwner(householdShortfall, primaryPensionPot, 'primary');
            const draw = Math.min(primaryPensionPot, grossNeeded);
            if (draw > 0) {
              const netDraw = approximateNetFromGrossForOwner(draw, 'primary');
              executeDeduct('pension', draw, 'primary');
              householdShortfall = Math.max(0, householdShortfall - netDraw);
              priAchieved += netDraw;
            }
          }
          if (profile.isCouplePlanning && !partnerDead && partnerCanAccessPension && partnerPensionPot > 0 && householdShortfall > 0) {
            const grossNeeded = getGrossPensionNeededForNetForOwner(householdShortfall, partnerPensionPot, 'partner');
            const draw = Math.min(partnerPensionPot, grossNeeded);
            if (draw > 0) {
              const netDraw = approximateNetFromGrossForOwner(draw, 'partner');
              executeDeduct('pension', draw, 'partner');
              householdShortfall = Math.max(0, householdShortfall - netDraw);
              partAchieved += netDraw;
            }
          }
        }
        netDrawdownAchieved = priAchieved + partAchieved;

// 2. Apply growth to the remaining pot balances (fixing phantom growth)
        growPots(pensionReturnRate, isaReturnRate, cashGiaReturnRate);

        // Reinvest surplus income when net achieved exceeds living expenses spending target
        const totalNetAchieved = guaranteedIncome + netDrawdownAchieved;
        
        if (totalNetAchieved > requiredNetIncomeTarget) {
          const surplus = totalNetAchieved - requiredNetIncomeTarget;
          const reinvestOpt =
            profile.annuityExcessReinvestOption ||
            profile.reinvestDestinationPot ||
            profile.maximizedSpendConfig?.reinvestDestinationPot ||
            'stocks_and_shares_isa';

          if (reinvestOpt === 'isa' || reinvestOpt === 'stocks_and_shares_isa' || reinvestOpt === 'cash_isa') {
            addProRata('isa', surplus * (1 + isaReturnRate / 2), false);
          } else if (reinvestOpt === 'gia') {
            addProRata('cashGia', surplus * (1 + cashGiaReturnRate / 2), false);
          } else if (reinvestOpt === 'cash' || reinvestOpt === 'cash_savings') {
            addProRata('cashGia', surplus * (1 + cashGiaReturnRate / 2), false);
          } else if (reinvestOpt !== 'none') {
            addProRata('cashGia', surplus * (1 + cashGiaReturnRate / 2), false);
          }
        }

      }

      // Partner Mortality Inheritance
      if (profile.isCouplePlanning && !partnerDead && partnerAge >= (profile.partnerLifeExpectancyAge ?? profile.lifeExpectancyAge ?? 95)) {
        partnerDead = true;
        
        // Issue 4 Fix: Force inherited pension into crystallised pot to prevent further PCLS
        primaryPensionPot += partnerPensionPot;
        primaryCrystallisedPot += partnerPensionPot;
        
        partnerPensionPot = 0;
        partnerUncrystallisedPot = 0;
        partnerCrystallisedPot = 0;
        
        primaryIsaPot += partnerIsaPot;
        partnerIsaPot = 0;
        primaryCashGiaPot += partnerCashGiaPot;
        partnerCashGiaPot = 0;

        pensionPot = primaryPensionPot + partnerPensionPot;
        isaPot = primaryIsaPot + partnerIsaPot;
        cashGiaPot = primaryCashGiaPot + partnerCashGiaPot;
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
        primaryUncrystallisedPot: Math.round(primaryUncrystallisedPot),
        primaryCrystallisedPot: Math.round(primaryCrystallisedPot),
        partnerUncrystallisedPot: Math.round(partnerUncrystallisedPot),
        partnerCrystallisedPot: Math.round(partnerCrystallisedPot),
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
