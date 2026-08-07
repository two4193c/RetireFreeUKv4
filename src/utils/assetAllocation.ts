import { AssetAllocationConfig, AssetClassReturns, AssetAllocationSplit, InvestmentFeeConfig, SinglePotFeeConfig } from '../types';

export function getTotalFeePercent(fees?: InvestmentFeeConfig): number {
  if (!fees || !fees.enabled) return 0;
  const platform = fees.platformFeePercent ?? 0;
  const fund = fees.fundFeePercent ?? 0;
  const advisor = fees.advisorFeePercent ?? 0;
  return Math.max(0, platform + fund + advisor);
}

export function getPotFeePercent(
  fees?: InvestmentFeeConfig,
  owner: 'primary' | 'partner' = 'primary',
  potType?: 'workplacePension' | 'sipp' | 'stocksAndSharesIsa' | 'cashIsa' | 'gia' | 'pension'
): number {
  if (!fees || !fees.enabled) return 0;

  if (fees.perPotFeesEnabled && potType) {
    const personPots = owner === 'partner' ? fees.partnerPots : fees.primaryPots;
    if (personPots) {
      let potConfig: SinglePotFeeConfig | undefined = undefined;
      if (potType === 'pension') {
        potConfig = personPots.workplacePension || personPots.sipp;
      } else {
        potConfig = personPots[potType];
      }

      if (potConfig) {
        const platform = potConfig.platformFeePercent ?? 0;
        const fund = potConfig.fundFeePercent ?? 0;
        const advisor = potConfig.advisorFeePercent ?? 0;
        return Math.max(0, platform + fund + advisor);
      }
    }
  }

  return getTotalFeePercent(fees);
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
