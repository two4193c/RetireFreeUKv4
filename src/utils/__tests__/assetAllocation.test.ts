import { describe, it, expect } from 'vitest';
import {
  getTotalFeePercent,
  getPotFeePercent,
  calculateWeightedAssetReturn,
  getEffectiveAccumulationReturn,
  getEffectiveDecumulationReturn,
  getPotAssetAllocation,
  getPotGrossReturn,
} from '../assetAllocation';
import { InvestmentFeeConfig, AssetAllocationSplit, AssetAllocationConfig } from '../../types';

// ---------------------------------------------------------------------------
// getTotalFeePercent
// ---------------------------------------------------------------------------
describe('getTotalFeePercent', () => {
  it('returns 0 when fees config is undefined', () => {
    expect(getTotalFeePercent(undefined)).toBe(0);
  });

  it('returns 0 when fees are disabled', () => {
    const fees: InvestmentFeeConfig = {
      enabled: false,
      platformFeePercent: 0.25,
      fundFeePercent: 0.40,
      advisorFeePercent: 0.50,
    };
    expect(getTotalFeePercent(fees)).toBe(0);
  });

  it('sums platform, fund and advisor fees when enabled', () => {
    const fees: InvestmentFeeConfig = {
      enabled: true,
      platformFeePercent: 0.25,
      fundFeePercent: 0.40,
      advisorFeePercent: 0.50,
    };
    expect(getTotalFeePercent(fees)).toBeCloseTo(1.15, 2);
  });

  it('defaults missing individual fee fields to 0', () => {
    const fees = {
      enabled: true,
      platformFeePercent: 0.30,
    } as any;
    // fundFeePercent and advisorFeePercent are undefined → default 0
    expect(getTotalFeePercent(fees)).toBeCloseTo(0.30, 2);
  });

  it('returns 0 (via Math.max) when all fee components are 0', () => {
    const fees: InvestmentFeeConfig = {
      enabled: true,
      platformFeePercent: 0,
      fundFeePercent: 0,
      advisorFeePercent: 0,
    };
    expect(getTotalFeePercent(fees)).toBe(0);
  });

  it('clamps to 0 if somehow all fees were negative (Math.max guard)', () => {
    const fees = {
      enabled: true,
      platformFeePercent: -0.5,
      fundFeePercent: -0.3,
      advisorFeePercent: -0.1,
    } as any;
    expect(getTotalFeePercent(fees)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// getPotFeePercent
// ---------------------------------------------------------------------------
describe('getPotFeePercent', () => {
  it('returns 0 when fees config is undefined', () => {
    expect(getPotFeePercent(undefined, 'primary', 'sipp')).toBe(0);
  });

  it('returns 0 when fees are disabled', () => {
    const fees: InvestmentFeeConfig = {
      enabled: false,
      platformFeePercent: 0.25,
      fundFeePercent: 0.40,
      advisorFeePercent: 0.00,
    };
    expect(getPotFeePercent(fees, 'primary', 'sipp')).toBe(0);
  });

  it('returns per-pot fee for primary SIPP when perPotFeesEnabled', () => {
    const fees: InvestmentFeeConfig = {
      enabled: true,
      platformFeePercent: 0.25,
      fundFeePercent: 0.40,
      advisorFeePercent: 0.00,
      perPotFeesEnabled: true,
      primaryPots: {
        sipp: { platformFeePercent: 0.15, fundFeePercent: 0.22, advisorFeePercent: 0.10 },
      },
    };
    // 0.15 + 0.22 + 0.10 = 0.47
    expect(getPotFeePercent(fees, 'primary', 'sipp')).toBeCloseTo(0.47, 2);
  });

  it('returns per-pot fee for partner stocksAndSharesIsa when perPotFeesEnabled', () => {
    const fees: InvestmentFeeConfig = {
      enabled: true,
      platformFeePercent: 0.25,
      fundFeePercent: 0.40,
      advisorFeePercent: 0.00,
      perPotFeesEnabled: true,
      partnerPots: {
        stocksAndSharesIsa: { platformFeePercent: 0.30, fundFeePercent: 0.50, advisorFeePercent: 0.25 },
      },
    };
    // 0.30 + 0.50 + 0.25 = 1.05
    expect(getPotFeePercent(fees, 'partner', 'stocksAndSharesIsa')).toBeCloseTo(1.05, 2);
  });

  it('falls back to global fees when perPotFeesEnabled but pot config is missing', () => {
    const fees: InvestmentFeeConfig = {
      enabled: true,
      platformFeePercent: 0.25,
      fundFeePercent: 0.40,
      advisorFeePercent: 0.10,
      perPotFeesEnabled: true,
      primaryPots: {
        // sipp is not configured
        workplacePension: { platformFeePercent: 0.20, fundFeePercent: 0.20, advisorFeePercent: 0.00 },
      },
    };
    // Falls back to global: 0.25 + 0.40 + 0.10 = 0.75
    expect(getPotFeePercent(fees, 'primary', 'sipp')).toBeCloseTo(0.75, 2);
  });

  it('falls back to global fees when perPotFeesEnabled is false', () => {
    const fees: InvestmentFeeConfig = {
      enabled: true,
      platformFeePercent: 0.25,
      fundFeePercent: 0.40,
      advisorFeePercent: 0.00,
      perPotFeesEnabled: false,
      primaryPots: {
        sipp: { platformFeePercent: 0.99, fundFeePercent: 0.99, advisorFeePercent: 0.99 },
      },
    };
    // Should ignore per-pot config and use global: 0.25 + 0.40 + 0.00 = 0.65
    expect(getPotFeePercent(fees, 'primary', 'sipp')).toBeCloseTo(0.65, 2);
  });

  it('falls back to global fees when potType is undefined', () => {
    const fees: InvestmentFeeConfig = {
      enabled: true,
      platformFeePercent: 0.25,
      fundFeePercent: 0.40,
      advisorFeePercent: 0.00,
      perPotFeesEnabled: true,
      primaryPots: {
        sipp: { platformFeePercent: 0.99, fundFeePercent: 0.99, advisorFeePercent: 0.99 },
      },
    };
    // potType is undefined → skip per-pot lookup, use global
    expect(getPotFeePercent(fees, 'primary', undefined)).toBeCloseTo(0.65, 2);
  });

  it('resolves "pension" potType to workplacePension config', () => {
    const fees: InvestmentFeeConfig = {
      enabled: true,
      platformFeePercent: 0.25,
      fundFeePercent: 0.40,
      advisorFeePercent: 0.00,
      perPotFeesEnabled: true,
      primaryPots: {
        workplacePension: { platformFeePercent: 0.10, fundFeePercent: 0.15, advisorFeePercent: 0.00 },
      },
    };
    // "pension" maps to workplacePension: 0.10 + 0.15 + 0.00 = 0.25
    expect(getPotFeePercent(fees, 'primary', 'pension')).toBeCloseTo(0.25, 2);
  });

  it('resolves "pension" potType to sipp config when workplacePension is absent', () => {
    const fees: InvestmentFeeConfig = {
      enabled: true,
      platformFeePercent: 0.25,
      fundFeePercent: 0.40,
      advisorFeePercent: 0.00,
      perPotFeesEnabled: true,
      primaryPots: {
        sipp: { platformFeePercent: 0.20, fundFeePercent: 0.30, advisorFeePercent: 0.05 },
      },
    };
    // "pension" → workplacePension (undefined) || sipp → 0.20 + 0.30 + 0.05 = 0.55
    expect(getPotFeePercent(fees, 'primary', 'pension')).toBeCloseTo(0.55, 2);
  });

  it('defaults owner to primary when not specified', () => {
    const fees: InvestmentFeeConfig = {
      enabled: true,
      platformFeePercent: 0.25,
      fundFeePercent: 0.40,
      advisorFeePercent: 0.00,
      perPotFeesEnabled: true,
      primaryPots: {
        gia: { platformFeePercent: 0.10, fundFeePercent: 0.10, advisorFeePercent: 0.10 },
      },
      partnerPots: {
        gia: { platformFeePercent: 0.90, fundFeePercent: 0.90, advisorFeePercent: 0.90 },
      },
    };
    // Default owner is 'primary' → uses primaryPots.gia: 0.30
    expect(getPotFeePercent(fees, undefined as any, 'gia')).toBeCloseTo(0.30, 2);
  });
});

// ---------------------------------------------------------------------------
// calculateWeightedAssetReturn
// ---------------------------------------------------------------------------
describe('calculateWeightedAssetReturn', () => {
  const defaultReturns = { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 };

  it('returns default 6.5 when allocation is undefined', () => {
    expect(calculateWeightedAssetReturn(undefined, defaultReturns)).toBe(6.5);
  });

  it('returns default 6.5 when returns are undefined', () => {
    expect(calculateWeightedAssetReturn({ equity: 80, bond: 15, cash: 5 }, undefined)).toBe(6.5);
  });

  it('returns default 6.5 when both inputs are null/undefined', () => {
    expect(calculateWeightedAssetReturn(undefined, undefined)).toBe(6.5);
    expect(calculateWeightedAssetReturn(null as any, null as any)).toBe(6.5);
  });

  it('returns default 6.5 when total weight is zero', () => {
    expect(calculateWeightedAssetReturn({ equity: 0, bond: 0, cash: 0 }, defaultReturns)).toBe(6.5);
  });

  it('calculates weighted return for standard 80/15/5 accumulation allocation', () => {
    // (80*8 + 15*4 + 5*2) / (80+15+5) = (640+60+10)/100 = 7.10
    const result = calculateWeightedAssetReturn({ equity: 80, bond: 15, cash: 5 }, defaultReturns);
    expect(result).toBeCloseTo(7.10, 2);
  });

  it('calculates weighted return for standard 40/50/10 decumulation allocation', () => {
    // (40*8 + 50*4 + 10*2) / (40+50+10) = (320+200+20)/100 = 5.40
    const result = calculateWeightedAssetReturn({ equity: 40, bond: 50, cash: 10 }, defaultReturns);
    expect(result).toBeCloseTo(5.40, 2);
  });

  it('calculates weighted return for equal-weighted allocation (33/33/34)', () => {
    // (33*8 + 33*4 + 34*2) / 100 = (264+132+68)/100 = 4.64
    const result = calculateWeightedAssetReturn({ equity: 33, bond: 33, cash: 34 }, defaultReturns);
    expect(result).toBeCloseTo(4.64, 2);
  });

  it('calculates return for 100% equity allocation', () => {
    const result = calculateWeightedAssetReturn({ equity: 100, bond: 0, cash: 0 }, defaultReturns);
    expect(result).toBeCloseTo(8.0, 2);
  });

  it('calculates return for 100% bonds allocation', () => {
    const result = calculateWeightedAssetReturn({ equity: 0, bond: 100, cash: 0 }, defaultReturns);
    expect(result).toBeCloseTo(4.0, 2);
  });

  it('calculates return for 100% cash allocation', () => {
    const result = calculateWeightedAssetReturn({ equity: 0, bond: 0, cash: 100 }, defaultReturns);
    expect(result).toBeCloseTo(2.0, 2);
  });

  it('handles 80/20/0 allocation correctly', () => {
    // (80*8 + 20*4 + 0*2) / 100 = (640+80)/100 = 7.20
    const result = calculateWeightedAssetReturn({ equity: 80, bond: 20, cash: 0 }, defaultReturns);
    expect(result).toBeCloseTo(7.20, 2);
  });

  it('normalises by total weight even if weights do not sum to 100', () => {
    // e.g. weights sum to 50: (20*8 + 20*4 + 10*2) / 50 = (160+80+20)/50 = 5.20
    const result = calculateWeightedAssetReturn({ equity: 20, bond: 20, cash: 10 }, defaultReturns);
    expect(result).toBeCloseTo(5.20, 2);
  });

  it('uses default returns for missing return fields (equity 8, bond 4, cash 2)', () => {
    // Only equityReturn provided → bond defaults 4, cash defaults 2
    const partialReturns = { equityReturn: 10.0 } as any;
    // (80*10 + 15*4 + 5*2) / 100 = (800+60+10)/100 = 8.70
    const result = calculateWeightedAssetReturn({ equity: 80, bond: 15, cash: 5 }, partialReturns);
    expect(result).toBeCloseTo(8.70, 2);
  });

  it('rounds result to 2 decimal places', () => {
    // (60*8 + 30*4 + 10*2) / 100 = (480+120+20)/100 = 6.20 (exact)
    const result = calculateWeightedAssetReturn({ equity: 60, bond: 30, cash: 10 }, defaultReturns);
    expect(result).toBe(6.2);
  });
});

// ---------------------------------------------------------------------------
// getEffectiveAccumulationReturn
// ---------------------------------------------------------------------------
describe('getEffectiveAccumulationReturn', () => {
  it('returns the raw expectedInvestmentReturn when aaSplit is undefined', () => {
    expect(getEffectiveAccumulationReturn(6.5, undefined, undefined)).toBe(6.5);
  });

  it('returns expectedInvestmentReturn minus fees when aaSplit is disabled', () => {
    const fees: InvestmentFeeConfig = {
      enabled: true,
      platformFeePercent: 0.25,
      fundFeePercent: 0.40,
      advisorFeePercent: 0.00,
    };
    // 6.5 - 0.65 = 5.85
    expect(getEffectiveAccumulationReturn(6.5, undefined, fees)).toBeCloseTo(5.85, 2);
  });

  it('uses weighted accumulation return when aaSplit is enabled', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 80, bond: 15, cash: 5 },
      decumulation: { equity: 40, bond: 50, cash: 10 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
    };
    // Weighted accumulation return: (80*8 + 15*4 + 5*2)/100 = 7.10
    // No fees → 7.10
    expect(getEffectiveAccumulationReturn(6.5, aaSplit, undefined)).toBeCloseTo(7.10, 2);
  });

  it('uses weighted accumulation return minus fees when both enabled', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 80, bond: 15, cash: 5 },
      decumulation: { equity: 40, bond: 50, cash: 10 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
    };
    const fees: InvestmentFeeConfig = {
      enabled: true,
      platformFeePercent: 0.25,
      fundFeePercent: 0.40,
      advisorFeePercent: 0.10,
    };
    // Weighted return: 7.10 - fees (0.75) = 6.35
    expect(getEffectiveAccumulationReturn(6.5, aaSplit, fees)).toBeCloseTo(6.35, 2);
  });

  it('ignores the fallback expectedInvestmentReturn when aaSplit is enabled', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 100, bond: 0, cash: 0 },
      decumulation: { equity: 40, bond: 50, cash: 10 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
    };
    // Weighted = 8.0, regardless of passed expectedInvestmentReturn = 3.0
    expect(getEffectiveAccumulationReturn(3.0, aaSplit, undefined)).toBeCloseTo(8.0, 2);
  });
});

// ---------------------------------------------------------------------------
// getEffectiveDecumulationReturn
// ---------------------------------------------------------------------------
describe('getEffectiveDecumulationReturn', () => {
  it('returns the raw postRetirementReturn when aaSplit is undefined', () => {
    expect(getEffectiveDecumulationReturn(4.5, undefined, undefined)).toBe(4.5);
  });

  it('returns postRetirementReturn minus fees when aaSplit is disabled', () => {
    const fees: InvestmentFeeConfig = {
      enabled: true,
      platformFeePercent: 0.25,
      fundFeePercent: 0.40,
      advisorFeePercent: 0.00,
    };
    // 4.5 - 0.65 = 3.85
    expect(getEffectiveDecumulationReturn(4.5, undefined, fees)).toBeCloseTo(3.85, 2);
  });

  it('uses weighted decumulation return when aaSplit is enabled', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 80, bond: 15, cash: 5 },
      decumulation: { equity: 40, bond: 50, cash: 10 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
    };
    // Weighted decumulation return: (40*8 + 50*4 + 10*2)/100 = 5.40
    expect(getEffectiveDecumulationReturn(4.5, aaSplit, undefined)).toBeCloseTo(5.40, 2);
  });

  it('uses weighted decumulation return minus fees when both enabled', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 80, bond: 15, cash: 5 },
      decumulation: { equity: 40, bond: 50, cash: 10 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
    };
    const fees: InvestmentFeeConfig = {
      enabled: true,
      platformFeePercent: 0.25,
      fundFeePercent: 0.40,
      advisorFeePercent: 0.00,
    };
    // Weighted: 5.40 - fees (0.65) = 4.75
    expect(getEffectiveDecumulationReturn(4.5, aaSplit, fees)).toBeCloseTo(4.75, 2);
  });

  it('ignores the fallback postRetirementReturn when aaSplit is enabled', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 80, bond: 15, cash: 5 },
      decumulation: { equity: 0, bond: 0, cash: 100 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
    };
    // 100% cash → weighted = 2.0, regardless of passed postRetirementReturn = 10.0
    expect(getEffectiveDecumulationReturn(10.0, aaSplit, undefined)).toBeCloseTo(2.0, 2);
  });
});

// ---------------------------------------------------------------------------
// getPotAssetAllocation
// ---------------------------------------------------------------------------
describe('getPotAssetAllocation', () => {
  it('returns default accumulation allocation when aaSplit is undefined', () => {
    const result = getPotAssetAllocation(undefined, 'primary', 'sipp', 'accumulation');
    expect(result).toEqual({ equity: 80, bond: 15, cash: 5 });
  });

  it('returns default decumulation allocation when aaSplit is undefined', () => {
    const result = getPotAssetAllocation(undefined, 'primary', 'sipp', 'decumulation');
    expect(result).toEqual({ equity: 40, bond: 50, cash: 10 });
  });

  it('returns default accumulation allocation when aaSplit is disabled', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: false,
      accumulation: { equity: 90, bond: 5, cash: 5 },
      decumulation: { equity: 30, bond: 60, cash: 10 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
    };
    // When disabled, returns hardcoded defaults, not aaSplit.accumulation
    const result = getPotAssetAllocation(aaSplit, 'primary', 'sipp', 'accumulation');
    expect(result).toEqual({ equity: 80, bond: 15, cash: 5 });
  });

  it('returns global accumulation allocation when aaSplit is enabled without per-pot', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 70, bond: 20, cash: 10 },
      decumulation: { equity: 30, bond: 50, cash: 20 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
    };
    const result = getPotAssetAllocation(aaSplit, 'primary', 'sipp', 'accumulation');
    expect(result).toEqual({ equity: 70, bond: 20, cash: 10 });
  });

  it('returns global decumulation allocation when aaSplit is enabled without per-pot', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 70, bond: 20, cash: 10 },
      decumulation: { equity: 30, bond: 50, cash: 20 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
    };
    const result = getPotAssetAllocation(aaSplit, 'primary', 'sipp', 'decumulation');
    expect(result).toEqual({ equity: 30, bond: 50, cash: 20 });
  });

  it('returns per-pot accumulation allocation for primary SIPP when perPotAllocationsEnabled', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 70, bond: 20, cash: 10 },
      decumulation: { equity: 30, bond: 50, cash: 20 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
      perPotAllocationsEnabled: true,
      primaryPots: {
        sipp: {
          accumulation: { equity: 90, bond: 5, cash: 5 },
          decumulation: { equity: 50, bond: 40, cash: 10 },
        },
      },
    };
    const result = getPotAssetAllocation(aaSplit, 'primary', 'sipp', 'accumulation');
    expect(result).toEqual({ equity: 90, bond: 5, cash: 5 });
  });

  it('returns per-pot decumulation allocation for partner ISA when perPotAllocationsEnabled', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 70, bond: 20, cash: 10 },
      decumulation: { equity: 30, bond: 50, cash: 20 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
      perPotAllocationsEnabled: true,
      partnerPots: {
        stocksAndSharesIsa: {
          accumulation: { equity: 60, bond: 30, cash: 10 },
          decumulation: { equity: 20, bond: 60, cash: 20 },
        },
      },
    };
    const result = getPotAssetAllocation(aaSplit, 'partner', 'stocksAndSharesIsa', 'decumulation');
    expect(result).toEqual({ equity: 20, bond: 60, cash: 20 });
  });

  it('falls back to global allocation when per-pot is enabled but pot type not configured', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 70, bond: 20, cash: 10 },
      decumulation: { equity: 30, bond: 50, cash: 20 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
      perPotAllocationsEnabled: true,
      primaryPots: {
        // Only sipp is configured, gia is not
        sipp: {
          accumulation: { equity: 90, bond: 5, cash: 5 },
        },
      },
    };
    const result = getPotAssetAllocation(aaSplit, 'primary', 'gia', 'accumulation');
    expect(result).toEqual({ equity: 70, bond: 20, cash: 10 });
  });

  it('resolves "pension" potType to workplacePension allocation', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 70, bond: 20, cash: 10 },
      decumulation: { equity: 30, bond: 50, cash: 20 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
      perPotAllocationsEnabled: true,
      primaryPots: {
        workplacePension: {
          accumulation: { equity: 60, bond: 25, cash: 15 },
          decumulation: { equity: 35, bond: 45, cash: 20 },
        },
      },
    };
    const result = getPotAssetAllocation(aaSplit, 'primary', 'pension', 'accumulation');
    expect(result).toEqual({ equity: 60, bond: 25, cash: 15 });
  });

  it('resolves "pension" potType to sipp allocation when workplacePension is absent', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 70, bond: 20, cash: 10 },
      decumulation: { equity: 30, bond: 50, cash: 20 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
      perPotAllocationsEnabled: true,
      primaryPots: {
        sipp: {
          accumulation: { equity: 85, bond: 10, cash: 5 },
        },
      },
    };
    const result = getPotAssetAllocation(aaSplit, 'primary', 'pension', 'accumulation');
    expect(result).toEqual({ equity: 85, bond: 10, cash: 5 });
  });

  it('falls back to global when per-pot is enabled but personPots is undefined', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 70, bond: 20, cash: 10 },
      decumulation: { equity: 30, bond: 50, cash: 20 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
      perPotAllocationsEnabled: true,
      // primaryPots is undefined
    };
    const result = getPotAssetAllocation(aaSplit, 'primary', 'sipp', 'accumulation');
    expect(result).toEqual({ equity: 70, bond: 20, cash: 10 });
  });

  it('defaults to accumulation phase when phase is not specified', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 75, bond: 20, cash: 5 },
      decumulation: { equity: 35, bond: 55, cash: 10 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
    };
    // phase defaults to 'accumulation'
    const result = getPotAssetAllocation(aaSplit, 'primary', 'sipp');
    expect(result).toEqual({ equity: 75, bond: 20, cash: 5 });
  });
});

// ---------------------------------------------------------------------------
// getPotGrossReturn
// ---------------------------------------------------------------------------
describe('getPotGrossReturn', () => {
  it('returns fallbackReturn when aaSplit is undefined', () => {
    expect(getPotGrossReturn(undefined, 'primary', 'sipp', 'accumulation', 7.0)).toBe(7.0);
  });

  it('returns default 6.5 for accumulation phase when aaSplit is undefined and no fallback', () => {
    expect(getPotGrossReturn(undefined, 'primary', 'sipp', 'accumulation')).toBe(6.5);
  });

  it('returns default 4.5 for decumulation phase when aaSplit is undefined and no fallback', () => {
    expect(getPotGrossReturn(undefined, 'primary', 'sipp', 'decumulation')).toBe(4.5);
  });

  it('returns fallbackReturn when aaSplit is disabled', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: false,
      accumulation: { equity: 80, bond: 15, cash: 5 },
      decumulation: { equity: 40, bond: 50, cash: 10 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
    };
    expect(getPotGrossReturn(aaSplit, 'primary', 'sipp', 'accumulation', 7.5)).toBe(7.5);
  });

  it('calculates weighted return from global accumulation allocation when aaSplit is enabled', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 80, bond: 15, cash: 5 },
      decumulation: { equity: 40, bond: 50, cash: 10 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
    };
    // Weighted: (80*8 + 15*4 + 5*2)/100 = 7.10
    expect(getPotGrossReturn(aaSplit, 'primary', 'sipp', 'accumulation')).toBeCloseTo(7.10, 2);
  });

  it('calculates weighted return from global decumulation allocation when aaSplit is enabled', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 80, bond: 15, cash: 5 },
      decumulation: { equity: 40, bond: 50, cash: 10 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
    };
    // Weighted: (40*8 + 50*4 + 10*2)/100 = 5.40
    expect(getPotGrossReturn(aaSplit, 'primary', 'sipp', 'decumulation')).toBeCloseTo(5.40, 2);
  });

  it('uses per-pot allocation for weighted return when perPotAllocationsEnabled', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 80, bond: 15, cash: 5 },
      decumulation: { equity: 40, bond: 50, cash: 10 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
      perPotAllocationsEnabled: true,
      primaryPots: {
        sipp: {
          accumulation: { equity: 100, bond: 0, cash: 0 },
          decumulation: { equity: 50, bond: 30, cash: 20 },
        },
      },
    };
    // SIPP accumulation: 100% equity → 8.0
    expect(getPotGrossReturn(aaSplit, 'primary', 'sipp', 'accumulation')).toBeCloseTo(8.0, 2);
    // SIPP decumulation: (50*8 + 30*4 + 20*2)/100 = (400+120+40)/100 = 5.60
    expect(getPotGrossReturn(aaSplit, 'primary', 'sipp', 'decumulation')).toBeCloseTo(5.60, 2);
  });

  it('ignores fallbackReturn when aaSplit is enabled (uses calculated weighted return)', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 0, bond: 0, cash: 100 },
      decumulation: { equity: 40, bond: 50, cash: 10 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
    };
    // 100% cash → 2.0, even though fallback is 10.0
    expect(getPotGrossReturn(aaSplit, 'primary', 'sipp', 'accumulation', 10.0)).toBeCloseTo(2.0, 2);
  });

  it('uses partner per-pot allocation when owner is partner', () => {
    const aaSplit: AssetAllocationSplit = {
      enabled: true,
      accumulation: { equity: 80, bond: 15, cash: 5 },
      decumulation: { equity: 40, bond: 50, cash: 10 },
      assetClassReturns: { equityReturn: 8.0, bondReturn: 4.0, cashReturn: 2.0 },
      perPotAllocationsEnabled: true,
      primaryPots: {
        stocksAndSharesIsa: {
          accumulation: { equity: 100, bond: 0, cash: 0 },
        },
      },
      partnerPots: {
        stocksAndSharesIsa: {
          accumulation: { equity: 0, bond: 100, cash: 0 },
        },
      },
    };
    // Partner ISA: 100% bonds → 4.0
    expect(getPotGrossReturn(aaSplit, 'partner', 'stocksAndSharesIsa', 'accumulation')).toBeCloseTo(4.0, 2);
    // Primary ISA: 100% equity → 8.0
    expect(getPotGrossReturn(aaSplit, 'primary', 'stocksAndSharesIsa', 'accumulation')).toBeCloseTo(8.0, 2);
  });
});
