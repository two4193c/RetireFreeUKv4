const fs = require('fs');
const file = 'src/utils/assetAllocation.ts';
let code = fs.readFileSync(file, 'utf8');

const target1 = `export function getEffectiveAccumulationReturn(
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
}`;

const rep1 = `export function getEffectiveAccumulationReturn(
  expectedInvestmentReturn: number,
  aaSplit?: AssetAllocationSplit,
  fees?: InvestmentFeeConfig,
  primaryBalances?: InvestmentPots,
  partnerBalances?: InvestmentPots
): number {
  let grossReturn = expectedInvestmentReturn;
  if (aaSplit && aaSplit.enabled) {
    grossReturn = calculateWeightedAssetReturn(aaSplit.accumulation, aaSplit.assetClassReturns);
  }
  const feePercent = getTotalFeePercent(fees, primaryBalances, partnerBalances);
  return grossReturn - feePercent;
}`;

code = code.replace(target1, rep1);

const target2 = `export function getEffectiveDecumulationReturn(
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
}`;

const rep2 = `export function getEffectiveDecumulationReturn(
  postRetirementReturn: number,
  aaSplit?: AssetAllocationSplit,
  fees?: InvestmentFeeConfig,
  primaryBalances?: InvestmentPots,
  partnerBalances?: InvestmentPots
): number {
  let grossReturn = postRetirementReturn;
  if (aaSplit && aaSplit.enabled) {
    grossReturn = calculateWeightedAssetReturn(aaSplit.decumulation, aaSplit.assetClassReturns);
  }
  const feePercent = getTotalFeePercent(fees, primaryBalances, partnerBalances);
  return grossReturn - feePercent;
}`;

code = code.replace(target2, rep2);

fs.writeFileSync(file, code);
