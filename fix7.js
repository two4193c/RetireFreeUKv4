const fs = require('fs');
const file = 'src/utils/assetAllocation.ts';
let code = fs.readFileSync(file, 'utf8');

const importTarget = `import { AssetAllocationConfig, AssetClassReturns, AssetAllocationSplit, InvestmentFeeConfig, SinglePotFeeConfig, PerPersonPotFees } from '../types';`;
const importRep = `import { AssetAllocationConfig, AssetClassReturns, AssetAllocationSplit, InvestmentFeeConfig, SinglePotFeeConfig, PerPersonPotFees, InvestmentPots } from '../types';`;
code = code.replace(importTarget, importRep);

const target = `export function getTotalFeePercent(fees?: InvestmentFeeConfig): number {
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
  }`;
  
const rep = `export function getTotalFeePercent(fees?: InvestmentFeeConfig, primaryBalances?: InvestmentPots, partnerBalances?: InvestmentPots): number {
  if (!fees || !fees.enabled) return 0;
  
  if (fees.perPotFeesEnabled && fees.primaryPots) {
    const potKeys = [
      { key: 'workplacePension', balKey: 'workplacePensionBalance' },
      { key: 'sipp', balKey: 'sippBalance' },
      { key: 'stocksAndSharesIsa', balKey: 'stocksAndSharesIsaBalance' },
      { key: 'gia', balKey: 'giaBalance' }
    ];
    
    let totalBal = 0;
    let weightedFeeSum = 0;
    
    if (primaryBalances) {
      for (const {key, balKey} of potKeys) {
        const bal = (primaryBalances[balKey] || 0);
        const feeCfg = fees.primaryPots[key];
        const fee = feeCfg ? ((feeCfg.platformFeePercent ?? 0) + (feeCfg.fundFeePercent ?? 0) + (feeCfg.advisorFeePercent ?? 0)) : 0;
        if (bal > 0) {
          totalBal += bal;
          weightedFeeSum += (bal * fee);
        }
      }
      
      if (partnerBalances && fees.partnerPots) {
        for (const {key, balKey} of potKeys) {
          const bal = (partnerBalances[balKey] || 0);
          const feeCfg = fees.partnerPots[key];
          const fee = feeCfg ? ((feeCfg.platformFeePercent ?? 0) + (feeCfg.fundFeePercent ?? 0) + (feeCfg.advisorFeePercent ?? 0)) : 0;
          if (bal > 0) {
            totalBal += bal;
            weightedFeeSum += (bal * fee);
          }
        }
      }
      
      if (totalBal > 0) {
        return Math.round((weightedFeeSum / totalBal) * 1000) / 1000;
      }
    }
    
    // Fallback if no balances or 0 total balance
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
  }`;

code = code.replace(target, rep);
fs.writeFileSync(file, code);
