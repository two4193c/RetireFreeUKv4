import { AssetAllocationConfig, AssetClassReturns, AssetAllocationSplit, InvestmentFeeConfig, SinglePotFeeConfig, PerPersonPotFees, InvestmentPots } from '../types';

export function getTotalFeePercent(fees?: InvestmentFeeConfig): number {
  if (!fees || !fees.enabled) return 0;
  if (fees.perPotFeesEnabled && fees.primaryPots) {
    const pots = [
      fees.primaryPots.workplacePension,
      fees.primaryPots.sipp,
      fees.primaryPots.stocksAndSharesIsa,
      fees.primaryPots.gia,
    ].filter(Boolean);
    if (pots.length > 0) {
      const sum = pots.reduce(
        (acc, p) => acc + (p?.platformFeePercent ?? 0) + (p?.fundFeePercent ?? 0) + (p?.advisorFeePercent ?? 0),
        0
      );
      return Math.round((sum / pots.length) * 100) / 100;
    }
  }
  const platform = fees.platformFeePercent ?? 0;
  const fund = fees.fundFeePercent ?? 0;
  const advisor = fees.advisorFeePercent ?? 0;
  return Math.max(0, platform + fund + advisor);
}

export function getPotFeePercent(
  fees?: InvestmentFeeConfig,
  owner: 'primary' | 'partner' = 'primary',
  potType?: 'workplacePension' | 'sipp' | 'stocksAndSharesIsa' | 'cashIsa' | 'gia' | 'pension' | 'lisa' | 'cashSavings',
  pensionBalances?: { workplacePensionBalance?: number; sippBalance?: number }
): number {
  if (!fees || !fees.enabled) return 0;

  if (fees.perPotFeesEnabled && potType) {
    const personPots = owner === 'partner' ? fees.partnerPots : fees.primaryPots;
    if (personPots) {
      if (potType === 'pension') {
        const wpConfig = personPots.workplacePension;
        const sippConfig = personPots.sipp;
        const globalFee = Math.max(0, (fees.platformFeePercent ?? 0) + (fees.fundFeePercent ?? 0) + (fees.advisorFeePercent ?? 0));
        const wpFee = wpConfig ? Math.max(0, (wpConfig.platformFeePercent ?? 0) + (wpConfig.fundFeePercent ?? 0) + (wpConfig.advisorFeePercent ?? 0)) : globalFee;
        const sippFee = sippConfig ? Math.max(0, (sippConfig.platformFeePercent ?? 0) + (sippConfig.fundFeePercent ?? 0) + (sippConfig.advisorFeePercent ?? 0)) : globalFee;

        if (pensionBalances) {
          const wpBal = Math.max(0, pensionBalances.workplacePensionBalance || 0);
          const sippBal = Math.max(0, pensionBalances.sippBalance || 0);
          const total = wpBal + sippBal;
          if (total > 0) {
            return (wpBal * wpFee + sippBal * sippFee) / total;
          }
        }
        if (wpConfig && !sippConfig) return wpFee;
        if (!wpConfig && sippConfig) return sippFee;
        return (wpFee + sippFee) / 2;
      }

      const potKey = potType === 'lisa' ? 'stocksAndSharesIsa' : (potType === 'cashSavings' ? 'cashIsa' : potType);
      const potConfig = personPots[potKey as keyof PerPersonPotFees];

      if (potConfig) {
        const platform = potConfig.platformFeePercent ?? 0;
        const fund = potConfig.fundFeePercent ?? 0;
        const advisor = potConfig.advisorFeePercent ?? 0;
        return Math.max(0, platform + fund + advisor);
      }
    }
  }

  const platform = fees.platformFeePercent ?? 0;
  const fund = fees.fundFeePercent ?? 0;
  const advisor = fees.advisorFeePercent ?? 0;
  return Math.max(0, platform + fund + advisor);
}

export function calculateWeightedAssetReturn(
  allocation?: AssetAllocationConfig,
  returns?: AssetClassReturns
): number {
  if (!allocation || !returns) return 6.5;

  const eq = (allocation.equity ?? 0) * (returns.equityReturn ?? 8.0);
  const bd = (allocation.bond ?? 0) * (returns.bondReturn ?? 4.0);
  const cs = (allocation.cash ?? 0) * (returns.cashReturn ?? 2.0);

  const totalWeight = (allocation.equity ?? 0) + (allocation.bond ?? 0) + (allocation.cash ?? 0);
  if (totalWeight <= 0) return 6.5;

  return Math.round(((eq + bd + cs) / totalWeight) * 100) / 100;
}

export function getEffectiveAccumulationReturn(
  expectedInvestmentReturn: number,
  aaSplit?: AssetAllocationSplit,
  fees?: InvestmentFeeConfig
): number {
  let grossReturn = expectedInvestmentReturn;
  if (aaSplit && aaSplit.enabled) {
    grossReturn = calculateWeightedAssetReturn(aaSplit.accumulation, aaSplit.assetClassReturns);
  }
  const feePercent = getTotalFeePercent(fees);
  return grossReturn - feePercent;
}

export function getEffectiveDecumulationReturn(
  postRetirementReturn: number,
  aaSplit?: AssetAllocationSplit,
  fees?: InvestmentFeeConfig
): number {
  let grossReturn = postRetirementReturn;
  if (aaSplit && aaSplit.enabled) {
    grossReturn = calculateWeightedAssetReturn(aaSplit.decumulation, aaSplit.assetClassReturns);
  }
  const feePercent = getTotalFeePercent(fees);
  return grossReturn - feePercent;
}

export function getPotAssetAllocation(
  aaSplit?: AssetAllocationSplit,
  owner: 'primary' | 'partner' = 'primary',
  potType?: 'workplacePension' | 'sipp' | 'stocksAndSharesIsa' | 'cashIsa' | 'gia' | 'pension',
  phase: 'accumulation' | 'decumulation' = 'accumulation'
): AssetAllocationConfig {
  if (aaSplit?.enabled && aaSplit?.perPotAllocationsEnabled && potType) {
    const personPots = owner === 'partner' ? aaSplit.partnerPots : aaSplit.primaryPots;
    if (personPots) {
      const potPhases = potType === 'pension' ? (personPots.workplacePension || personPots.sipp) : personPots[potType];
      if (potPhases) {
        const config = phase === 'decumulation' ? potPhases.decumulation : potPhases.accumulation;
        if (config) return config;
      }
    }
  }
  if (aaSplit?.enabled) {
    return phase === 'decumulation' ? aaSplit.decumulation : aaSplit.accumulation;
  }
  return phase === 'decumulation' ? { equity: 40, bond: 50, cash: 10 } : { equity: 80, bond: 15, cash: 5 };
}

export function getPotGrossReturn(
  aaSplit?: AssetAllocationSplit,
  owner: 'primary' | 'partner' = 'primary',
  potType?: 'workplacePension' | 'sipp' | 'stocksAndSharesIsa' | 'cashIsa' | 'gia' | 'pension',
  phase: 'accumulation' | 'decumulation' = 'accumulation',
  fallbackReturn?: number
): number {
  if (aaSplit?.enabled) {
    const alloc = getPotAssetAllocation(aaSplit, owner, potType, phase);
    return calculateWeightedAssetReturn(alloc, aaSplit.assetClassReturns);
  }
  return fallbackReturn ?? (phase === 'decumulation' ? 4.5 : 6.5);
}
