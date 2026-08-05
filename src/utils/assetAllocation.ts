import { AssetAllocationConfig, AssetClassReturns, AssetAllocationSplit } from '../types';

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
  aaSplit?: AssetAllocationSplit
): number {
  if (aaSplit && aaSplit.enabled) {
    return calculateWeightedAssetReturn(aaSplit.accumulation, aaSplit.assetClassReturns);
  }
  return expectedInvestmentReturn;
}

export function getEffectiveDecumulationReturn(
  postRetirementReturn: number,
  aaSplit?: AssetAllocationSplit
): number {
  if (aaSplit && aaSplit.enabled) {
    return calculateWeightedAssetReturn(aaSplit.decumulation, aaSplit.assetClassReturns);
  }
  return postRetirementReturn;
}
