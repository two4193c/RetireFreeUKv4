
describe('ukTaxEngine - Scottish tax bands', () => {
  it('calculates full Scottish bands correctly', () => {
    let res = computeIncomeTaxOnAmount(13570, true);
    expect(res.tax).toBeCloseTo(190, 1);
    expect(res.marginalRate).toBe(19);

    res = computeIncomeTaxOnAmount(20000, true);
    expect(res.tax).toBeCloseTo(1463.04, 1);
    expect(res.marginalRate).toBe(20);

    res = computeIncomeTaxOnAmount(30000, true);
    expect(res.tax).toBeCloseTo(3497.44, 1);
    expect(res.marginalRate).toBe(21);

    res = computeIncomeTaxOnAmount(50000, true);
    expect(res.tax).toBeCloseTo(9028.63, 1);
    expect(res.marginalRate).toBe(42);

    res = computeIncomeTaxOnAmount(100000, true);
    expect(res.tax).toBeCloseTo(30778.66, 1);
    expect(res.marginalRate).toBe(45);

    res = computeIncomeTaxOnAmount(150000, true);
    expect(res.tax).toBeCloseTo(60058.09, 1);
    expect(res.marginalRate).toBe(48);
  });
  
  it('respects Scottish custom tax band overrides', () => {
    const customBands: any = {
      enabled: true,
      scotStarterRatePercent: 10,
      scotStarterThreshold: 2000,
      scotBasicRatePercent: 20,
      scotBasicThreshold: 4000,
      scotIntermediateRatePercent: 30,
      scotIntermediateThreshold: 6000,
      scotHigherRatePercent: 40,
      scotHigherThreshold: 8000,
      scotAdvancedRatePercent: 50,
      scotAdvancedThreshold: 10000,
      scotTopRatePercent: 60,
    };
    
    let res = computeIncomeTaxOnAmount(14000, true, customBands);
    expect(res.tax).toBeCloseTo(143, 1);
    
    res = computeIncomeTaxOnAmount(15000, true, customBands);
    expect(res.tax).toBeCloseTo(286, 1);
    
    res = computeIncomeTaxOnAmount(17000, true, customBands);
    expect(res.tax).toBeCloseTo(729, 1);
    
    res = computeIncomeTaxOnAmount(19000, true, customBands);
    expect(res.tax).toBeCloseTo(1372, 1);
    
    res = computeIncomeTaxOnAmount(21000, true, customBands);
    expect(res.tax).toBeCloseTo(2215, 1);
    
    res = computeIncomeTaxOnAmount(25000, true, customBands);
    expect(res.tax).toBeCloseTo(4458, 1);
  });
});

describe('ukTaxEngine - Partner/Marriage Tax Allowance', () => {
  it('applies marriage allowance tax credit when primary is basic rate payer and partner earns below personal allowance', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      enableMarriageAllowance: true,
      grossAnnualSalary: 30000,
      partnerGrossAnnualSalary: 10000,
    };
    const result = calculateUKTax(profile, DEFAULT_POTS);
    expect(result.totalIncomeTax).toBeCloseTo(3486 - 252, 1);
  });

  it('applies marriage allowance reduction to PA when primary gives to partner', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      isCouplePlanning: true,
      enableMarriageAllowance: true,
      grossAnnualSalary: 10000,
      partnerGrossAnnualSalary: 30000,
    };
    const result = calculateUKTax(profile, DEFAULT_POTS);
    expect(result.personalAllowance).toBe(12570 - 1260);
  });
});

describe('ukTaxEngine - Tapering edge cases', () => {
  it('computes 60% tax trap metrics', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 110000,
    };
    const result = calculateUKTax(profile, DEFAULT_POTS);
    expect(result.is60PercentTaxTrap).toBe(true);
    expect(result.taxTrapAmountInBracket).toBe(10000);
    expect(result.recommendedTaxTrapPensionContribution).toBe(10000);
  });

  it('AA taper exact reduction limits', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 300000,
      hasTriggeredMpaa: false,
      carryForwardAllowance: 0,
    };
    const pots: any = { ...DEFAULT_POTS };
    const result = calculateUKTax(profile, pots);
    expect(result.isTaperedAnnualAllowance).toBe(true);
    expect(result.taperedReduction).toBe(20000);
  });
  
  it('tapers AA down to a minimum of 10k', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 500000,
      hasTriggeredMpaa: false,
    };
    const result = calculateUKTax(profile, DEFAULT_POTS);
    expect(result.isTaperedAnnualAllowance).toBe(true);
    expect(result.pensionAnnualAllowanceLimit).toBe(10000);
  });
});

describe('ukTaxEngine - Capital Gains Tax', () => {
  it('calculates CGT with basic rate band remaining', () => {
    const result = calculateCapitalGainsTax(20000, 10000, false);
    expect(result.cgtTax).toBe(7000 * 0.18);
  });

  it('calculates CGT above basic rate band', () => {
    const result = calculateCapitalGainsTax(40000, 10000, false);
    expect(result.cgtTax).toBe(7000 * 0.24);
  });
});

describe('ukTaxEngine - Dividend Tax', () => {
  it('calculates dividend tax correctly', () => {
    let res = calculateDividendTax(20000, 1000);
    expect(res.dividendTax).toBe(Math.round(500 * 0.0875));
    
    res = calculateDividendTax(60000, 1000);
    expect(res.dividendTax).toBe(Math.round(500 * 0.3375));
    
    res = calculateDividendTax(160000, 1000);
    expect(res.dividendTax).toBe(Math.round(500 * 0.3935));
  });
});

describe('ukTaxEngine - SDLT', () => {
  it('calculates stamp duty correctly', () => {
    expect(calculateUKStampDuty(200000)).toBe(0);
    expect(calculateUKStampDuty(300000)).toBe(2500);
    expect(calculateUKStampDuty(200000, true)).toBe(6000);
  });
});

describe('ukTaxEngine - Savings Interest Tax', () => {
  it('calculates PSA correctly', () => {
    let res = calculatePSAAndSavingsTax(20000, 2000);
    expect(res.personalSavingsAllowance).toBe(1000);
    expect(res.savingsInterestTax).toBe(200);

    res = calculatePSAAndSavingsTax(60000, 2000);
    expect(res.personalSavingsAllowance).toBe(500);
    expect(res.savingsInterestTax).toBe(1500 * 0.40);
  });
});

describe('ukTaxEngine - calculatePartnerUKTax', () => {
  it('calculates partner tax correctly', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      partnerGrossAnnualSalary: 60000,
    };
    const result = calculatePartnerUKTax(profile);
    expect(result.grossIncome).toBe(60000);
    expect(result.marginalTaxRate).toBe(4000);
  });
});

describe('ukTaxEngine - allocateLumpSumToPots', () => {
  it('allocates correctly with split', () => {
    const res = allocateLumpSumToPots(10000, 'split', [
      { pot: 'stocks_and_shares_isa', value: 50, mode: 'percentage' },
      { pot: 'gia', value: 25, mode: 'percentage' }
    ]);
    expect(res.toSsIsa).toBe(5000);
    expect(res.toGia).toBe(2500);
    expect(res.toCashSavings).toBe(2500);
  });
  
  it('allocates correctly with specific pot', () => {
    const res = allocateLumpSumToPots(10000, 'gia', []);
    expect(res.toGia).toBe(10000);
  });
});

describe('ukTaxEngine - PCLS Recycling', () => {
  it('flags PCLS recycling when upfront PCLS is taken and high one-off contributions exist', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      takeLumpSumAtStart: true,
      currentAge: 55,
      targetRetirementAge: 65,
      oneOffContributions: [
        {
          enabled: true,
          owner: 'primary',
          frequency: 'one_off',
          date: '2024-06-01',
          targetPot: 'sipp',
          sippContributionType: 'gross',
          grossAmount: 50000
        }
      ]
    };
    const pots: any = {
      ...DEFAULT_POTS,
      sippBalance: 500000,
    };
    
    const result = calculateUKTax(profile, pots, false, 55);
    expect(result.isPclsRecyclingRisk).toBe(true);
    expect(result.pclsRecyclingDetails).toBeDefined();
  });
});
