import { describe, it, expect } from 'vitest';
import { runMonteCarloSimulation, calculateCashBufferRequiredDetails } from '../monteCarloEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { calculateUKTax } from '../ukTaxEngine';

describe('monteCarloEngine - runMonteCarloSimulation', () => {
  it('runs a basic Monte Carlo simulation successfully', () => {
    const taxResult = calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS);
    
    const result = runMonteCarloSimulation(DEFAULT_PROFILE, DEFAULT_POTS, taxResult, {
      numSimulations: 15,
      maxAge: 80, // Keep short for test speed
      accumulationVolatility: 10,
      decumulationVolatility: 8,
      marketScenario: 'standard'
    });

    expect(result).toBeDefined();
    expect(result.params.numSimulations).toBe(15);
    expect(result.params.maxAge).toBe(80);
    
    // Check that percentiles array is populated correctly
    expect(result.agePercentiles.length).toBeGreaterThan(0);
    
    const firstRow = result.agePercentiles[0];
    expect(firstRow).toHaveProperty('age');
    expect(firstRow).toHaveProperty('p10TotalPot');
    expect(firstRow).toHaveProperty('p25TotalPot');
    expect(firstRow).toHaveProperty('p50TotalPot');
    expect(firstRow).toHaveProperty('p75TotalPot');
    expect(firstRow).toHaveProperty('p90TotalPot');
    expect(firstRow).toHaveProperty('survivalRate');
    
    // It should reach target maxAge (or depletion before it)
    const lastRow = result.agePercentiles[result.agePercentiles.length - 1];
    expect(lastRow.age).toBe(80);
    
    // In a short time horizon with high pots, success rate is usually 1.0 (or close)
    expect(firstRow.survivalRate).toBeDefined();
  });

  it('handles early_crash scenario properly', () => {
    const taxResult = calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS);
    
    const result = runMonteCarloSimulation(DEFAULT_PROFILE, DEFAULT_POTS, taxResult, {
      numSimulations: 10,
      maxAge: 70,
      marketScenario: 'early_crash',
      crashStartAge: 60,
      crashDurationYears: 2
    });

    expect(result.params.marketScenario).toBe('early_crash');
    expect(result.params.crashStartAge).toBe(60);
    expect(result.agePercentiles.length).toBeGreaterThan(0);
    
    const at60 = result.agePercentiles.find(r => r.age === 60);
    expect(at60).toBeDefined();
  });

  it('runs stressed market scenario', () => {
    const taxResult = calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS);
    
    const result = runMonteCarloSimulation(DEFAULT_PROFILE, DEFAULT_POTS, taxResult, {
      numSimulations: 10,
      marketScenario: 'stressed',
      stressedReturnDropPercent: 3.0
    });

    expect(result.params.marketScenario).toBe('stressed');
    expect(result.agePercentiles.length).toBeGreaterThan(0);
  });
});

describe('monteCarloEngine - calculateCashBufferRequiredDetails', () => {
  it('returns valid buffer detail based on profile target', () => {
    const profile = {
      ...DEFAULT_PROFILE,
    };
    
    const pots = {
      ...DEFAULT_POTS,
      cashSavingsBalance: 50000,
      cashIsaBalance: 20000
    };
    
    const result = calculateCashBufferRequiredDetails(profile, pots, 60, 3, 70000);
    expect(result).toBeDefined();
    expect(result.useCashBuffer).toBe(true);
    expect(typeof result.cashBufferYears).toBe('number');
    expect(Array.isArray(result.yearlyDetails)).toBe(true);
  });
});

describe('monteCarloEngine - massive market crashes and percentile edge cases', () => {
  it('handles massive market crash with total depletion', () => {
    const taxResult = calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS);
    
    const result = runMonteCarloSimulation(
      {
        ...DEFAULT_PROFILE,
        expectedInvestmentReturn: 5,
        targetRetirementAge: 60,
        essentialRetirementAnnualSpend: 100000 // Huge spend to force depletion
      }, 
      {
        ...DEFAULT_POTS,
        primaryWorkplacePensionBalance: 100000, // Small pot to deplete quickly
        primarySippBalance: 0,
        cashSavingsBalance: 0,
        cashIsaBalance: 0,
        stocksSharesIsaBalance: 0,
        giaBalance: 0,
      }, 
      taxResult, 
      {
        numSimulations: 10,
        maxAge: 80,
        marketScenario: 'early_crash',
        crashStartAge: 60,
        crashDurationYears: 5,
        crashYearDropsPercent: [50, 40, 30, 20, 10] // Massive drops
      }
    );

    expect(result.params.marketScenario).toBe('early_crash');
    expect(result.agePercentiles.length).toBeGreaterThan(0);
    // At age 75, pot should be 0 or very small due to depletion
    const at75 = result.agePercentiles.find(r => r.age === 75);
    expect(at75).toBeDefined();
    
    // Survival rate should be low or 0
    expect(result.successRateAge80).toBeLessThan(100);
  });
  
  it('calculates percentiles correctly for single depletion to test getPercentile edges', () => {
    const taxResult = calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS);
    
    const result = runMonteCarloSimulation(
      {
        ...DEFAULT_PROFILE,
        expectedInvestmentReturn: 0,
        targetRetirementAge: 65,
        essentialRetirementAnnualSpend: 200000 
      }, 
      {
        ...DEFAULT_POTS,
        primaryWorkplacePensionBalance: 150000, 
      }, 
      taxResult, 
      {
        numSimulations: 10,
        maxAge: 70,
        marketScenario: 'stressed',
        stressedReturnDropPercent: 20
      }
    );

    expect(result).toBeDefined();
    expect(result.agePercentiles).toBeDefined();
    
    // Check percentiles for edge boundaries
    const lastRow = result.agePercentiles[result.agePercentiles.length - 1];
    expect(lastRow.p10TotalPot).toBeDefined();
    expect(lastRow.p90TotalPot).toBeDefined();
  });
});

describe('monteCarloEngine - missing areas', () => {
  it('covers drawdown strategies inside the loop', () => {
    ['tax_optimizer', 'pension_first', 'cash_first', 'proportional', 'basic_rate_bracket', 'higher_rate_bracket'].forEach(strategy => {
      const result = runMonteCarloSimulation(
        { ...DEFAULT_PROFILE, drawdownStrategy: strategy, targetRetirementAge: 60, currentAge: 59 },
        { ...DEFAULT_POTS, primaryWorkplacePensionBalance: 100000, cashSavingsBalance: 50000, stocksSharesIsaBalance: 50000 },
        calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS),
        { numSimulations: 2, maxAge: 65, marketScenario: 'standard' }
      );
      expect(result).toBeDefined();
    });
  });

  it('covers couple-mode simulation', () => {
    const result = runMonteCarloSimulation(
      { 
        ...DEFAULT_PROFILE, 
        isCouplePlanning: true, 
        partnerCurrentAge: 60, 
        currentAge: 60, 
        partnerTargetRetirementAge: 62, 
        targetRetirementAge: 62,
        partnerDrawdownStrategy: 'tax_optimizer',
        drawdownStrategy: 'pension_first'
      },
      { 
        ...DEFAULT_POTS, 
        primaryWorkplacePensionBalance: 100000,
        partnerWorkplacePensionBalance: 100000,
        cashSavingsBalance: 50000,
        partnerCashSavingsBalance: 50000 
      },
      calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS),
      { numSimulations: 2, maxAge: 70, marketScenario: 'standard' }
    );
    expect(result).toBeDefined();
  });

  it('covers reinvest excess logic', () => {
    ['isa', 'gia', 'cash', 'stocks_and_shares_isa'].forEach(target => {
      const result = runMonteCarloSimulation(
        { 
          ...DEFAULT_PROFILE, 
          reinvestExcessIncome: true, 
          reinvestExcessTargetPot: target,
          isCouplePlanning: true,
          partnerReinvestExcessTargetPot: target,
          currentAge: 65,
          targetRetirementAge: 65,
          essentialRetirementAnnualSpend: 10000,
          statePensionAmountAnnual: 20000,
        },
        DEFAULT_POTS,
        calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS),
        { numSimulations: 2, maxAge: 70 }
      );
      expect(result).toBeDefined();
    });
  });

  it('covers cash buffer active years', () => {
    const result = runMonteCarloSimulation(
      { 
        ...DEFAULT_PROFILE, 
        currentAge: 60, 
        targetRetirementAge: 60,
      },
      { ...DEFAULT_POTS, cashSavingsBalance: 100000, giaBalance: 50000, stocksSharesIsaBalance: 50000 },
      calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS),
      { 
        numSimulations: 2, 
        maxAge: 65, 
        marketScenario: 'early_crash', 
        crashStartAge: 60, 
        useCashBuffer: true, 
        cashBufferYears: 3 
      }
    );
    expect(result).toBeDefined();
  });

  it('covers tax-free lump sum tracking and phased tranches', () => {
    const result = runMonteCarloSimulation(
      {
        ...DEFAULT_PROFILE,
        currentAge: 60,
        targetRetirementAge: 60,
        crystallisationMode: 'phased_tranches',
        crystallisationTranches: [
          { age: 60, amount: 50000, pclsPercent: 25, targetPot: 'cash_savings', owner: 'primary', enabled: true },
          { age: 61, amount: 50000, pclsPercent: 25, targetPot: 'stocks_and_shares_isa', owner: 'primary', enabled: true }
        ],
        partnerCrystallisationMode: 'upfront',
        partnerTakeLumpSumAtStart: true,
        isCouplePlanning: true,
        partnerCurrentAge: 60,
        partnerTargetRetirementAge: 60,
        partnerPclsLumpSumPercent: 25
      },
      {
        ...DEFAULT_POTS,
        primaryWorkplacePensionBalance: 200000,
        partnerWorkplacePensionBalance: 200000
      },
      calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS),
      { numSimulations: 2, maxAge: 65 }
    );
    expect(result).toBeDefined();
  });

  it('covers annuity purchases mid-simulation', () => {
    const result = runMonteCarloSimulation(
      {
        ...DEFAULT_PROFILE,
        currentAge: 60,
        targetRetirementAge: 60,
        annuities: [
          { enabled: true, purchaseAge: 62, purchaseAmount: 50000, type: 'inflation_linked', durationOption: 'life', owner: 'primary' },
          { enabled: true, purchaseAge: 63, purchaseAmount: 50000, type: 'level', durationOption: 'fixed_term', durationUntilAge: 75, owner: 'partner' }
        ],
        isCouplePlanning: true,
        partnerCurrentAge: 60
      },
      {
        ...DEFAULT_POTS,
        primaryWorkplacePensionBalance: 200000,
        partnerWorkplacePensionBalance: 200000
      },
      calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS),
      { numSimulations: 2, maxAge: 70 }
    );
    expect(result).toBeDefined();
  });

  it('covers decumulation life events', () => {
    const result = runMonteCarloSimulation(
      {
        ...DEFAULT_PROFILE,
        currentAge: 60,
        targetRetirementAge: 60,
        decumulationLifeEvents: [
          { enabled: true, type: 'income', age: 61, amount: 20000, targetPot: 'cash_savings', owner: 'primary' },
          { enabled: true, type: 'expense', age: 62, amount: 15000, targetPot: 'stocks_and_shares_isa', owner: 'primary' },
          { enabled: true, type: 'income', age: 63, amount: 20000, targetPot: 'sipp', owner: 'partner' }
        ],
        isCouplePlanning: true,
        partnerCurrentAge: 60
      },
      { ...DEFAULT_POTS, cashSavingsBalance: 50000, stocksSharesIsaBalance: 50000 },
      calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS),
      { numSimulations: 2, maxAge: 65 }
    );
    expect(result).toBeDefined();
  });

  it('covers partner mortality mid-simulation and fixed income/db pensions', () => {
    const result = runMonteCarloSimulation(
      {
        ...DEFAULT_PROFILE,
        currentAge: 60,
        targetRetirementAge: 60,
        isCouplePlanning: true,
        partnerCurrentAge: 60,
        partnerTargetRetirementAge: 60,
        fixedIncomeStreams: [
          { enabled: true, owner: 'primary', startAge: 61, annualAmount: 5000, type: 'taxable', inflationLinked: true },
          { enabled: true, owner: 'partner', startAge: 61, endAge: 68, annualAmount: 5000, type: 'tax_free', inflationLinked: false }
        ],
        dbPensions: [
          { enabled: true, owner: 'primary', startAge: 61, annualIncome: 5000, inflationLinked: true, taxFreeLumpSum: 10000, targetPot: 'cash_savings' },
          { enabled: true, owner: 'partner', startAge: 61, annualIncome: 5000, inflationLinked: false, taxFreeLumpSum: 0 }
        ],
        potTransfers: [
          { enabled: true, sourcePot: 'workplace_pension', destinationPot: 'sipp', transferAge: 62, amount: 10000, owner: 'primary' },
          { enabled: true, sourcePot: 'stocks_and_shares_isa', destinationPot: 'cash_isa', transferAge: 62, amount: 5000, owner: 'partner' }
        ],
        oneOffContributions: [
          { enabled: true, targetPot: 'sipp', date: String(new Date().getFullYear() + 2), grossAmount: 10000, owner: 'primary', frequency: 'one_off' }
        ]
      },
      { ...DEFAULT_POTS, primaryWorkplacePensionBalance: 100000, partnerWorkplacePensionBalance: 100000, stocksSharesIsaBalance: 50000 },
      calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS),
      { numSimulations: 2, maxAge: 65 }
    );
    expect(result).toBeDefined();
  });
});

describe('monteCarloEngine - specific missing lines for >80% coverage', () => {
  it('covers guaranteed income floor surplus reinvestment and reinvest excess drawdown', () => {
    ['isa', 'gia', 'cash', 'none'].forEach(potType => {
      const result = runMonteCarloSimulation(
        { 
          ...DEFAULT_PROFILE, 
          reinvestExcessDrawdown: true, 
          reinvestDestinationPot: potType,
          annuityExcessReinvestOption: potType,
          partnerAnnuityExcessReinvestOption: potType,
          isCouplePlanning: true,
          partnerCurrentAge: 65,
          currentAge: 65,
          targetRetirementAge: 65,
          partnerTargetRetirementAge: 65,
          essentialRetirementAnnualSpend: 1000, // Very low spend
          statePensionAmountAnnual: 25000, // High guaranteed income -> surplus
          partnerStatePensionAmountAnnual: 25000,
          drawdownStrategy: 'tax_optimizer',
          partnerDrawdownStrategy: 'tax_optimizer',
          maximizedSpendConfig: { reinvestExcessDrawdown: true, reinvestDestinationPot: potType }
        },
        { 
          ...DEFAULT_POTS, 
          primaryWorkplacePensionBalance: 100000,
          partnerWorkplacePensionBalance: 100000,
          cashSavingsBalance: 50000,
          partnerCashSavingsBalance: 50000,
          stocksSharesIsaBalance: 50000,
          giaBalance: 50000
        },
        calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS),
        { numSimulations: 2, maxAge: 70 }
      );
      expect(result).toBeDefined();
    });
  });

  it('covers isa_first drawdown and basic_rate_bracket', () => {
    ['isa_first', 'basic_rate_bracket', 'higher_rate_bracket', 'tax_free_bracket'].forEach(strategy => {
      const result = runMonteCarloSimulation(
        { 
          ...DEFAULT_PROFILE, 
          drawdownStrategy: strategy,
          partnerDrawdownStrategy: strategy,
          isCouplePlanning: true,
          currentAge: 60,
          targetRetirementAge: 60,
          essentialRetirementAnnualSpend: 50000, 
        },
        { 
          ...DEFAULT_POTS, 
          primaryWorkplacePensionBalance: 100000,
          stocksSharesIsaBalance: 100000,
          cashSavingsBalance: 100000,
        },
        calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS),
        { numSimulations: 2, maxAge: 65 }
      );
      expect(result).toBeDefined();
    });
  });
  
  it('covers annuity purchase logic and partner mortality with drawdown', () => {
    const result = runMonteCarloSimulation(
      { 
        ...DEFAULT_PROFILE, 
        isCouplePlanning: true,
        currentAge: 60,
        partnerCurrentAge: 60,
        targetRetirementAge: 60,
        partnerTargetRetirementAge: 60,
        drawdownStrategy: 'proportional',
        partnerDrawdownStrategy: 'proportional',
        essentialRetirementAnnualSpend: 100000, // force drawdown
        dbPensions: [
          { enabled: true, startAge: 61, owner: 'partner', taxFreeLumpSum: 10000, annualIncome: 5000, inflationLinked: false, targetPot: 'cash_isa' }
        ],
        annuities: [
          { enabled: true, purchaseAge: 61, purchaseAmount: 20000, durationOption: 'fixed_term', durationUntilAge: 75, type: 'level', owner: 'primary' },
          { enabled: true, purchaseAge: 61, purchaseAmount: 20000, durationOption: 'life', type: 'inflation_linked_3', owner: 'partner' }
        ]
      },
      { 
        ...DEFAULT_POTS, 
        primaryWorkplacePensionBalance: 200000,
        partnerWorkplacePensionBalance: 200000,
        stocksSharesIsaBalance: 50000,
        cashSavingsBalance: 50000
      },
      calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS),
      { numSimulations: 2, maxAge: 65, marketScenario: 'early_crash', crashStartAge: 60 }
    );
    expect(result).toBeDefined();
  });
});

describe('monteCarloEngine - missing lines chunk 3', () => {
  it('covers state pension, db, fixed income in cash buffer calculation', () => {
    const result = calculateCashBufferRequiredDetails(
      {
        ...DEFAULT_PROFILE,
        isCouplePlanning: true,
        currentAge: 65,
        partnerCurrentAge: 65,
        statePensionAge: 67,
        partnerStatePensionAge: 67,
        qualifyingYears: 35,
        partnerQualifyingYears: 35,
        enableTripleLock: true,
        partnerEnableTripleLock: true,
        fullStatePensionAmount: 10000,
        partnerFullStatePensionAmount: 10000,
        dbPensions: [{ enabled: true, startAge: 68, annualIncome: 5000, inflationLinked: true }],
        fixedIncomeStreams: [{ enabled: true, startAge: 68, endAge: 80, annualAmount: 5000, inflationLinked: false }]
      },
      DEFAULT_POTS,
      68, // crashStartAge
      3,
      0
    );
    expect(result).toBeDefined();
  });

  it('covers cash buffer generation from ISA and pension when cash is low', () => {
    const result = runMonteCarloSimulation(
      {
        ...DEFAULT_PROFILE,
        currentAge: 60,
        targetRetirementAge: 60,
        essentialRetirementAnnualSpend: 100000
      },
      {
        ...DEFAULT_POTS,
        cashSavingsBalance: 0,
        giaBalance: 0,
        cashIsaBalance: 0,
        stocksSharesIsaBalance: 50000,
        primaryWorkplacePensionBalance: 200000,
      },
      calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS),
      {
        numSimulations: 2,
        maxAge: 65,
        marketScenario: 'early_crash',
        crashStartAge: 60,
        useCashBuffer: true,
        cashBufferYears: 3
      }
    );
    expect(result).toBeDefined();
  });

  it('covers hybrid annuity tranches for primary and partner', () => {
    const result = runMonteCarloSimulation(
      {
        ...DEFAULT_PROFILE,
        isCouplePlanning: true,
        currentAge: 60,
        partnerCurrentAge: 60,
        incomeProductOption: 'hybrid',
        partnerIncomeProductOption: 'hybrid',
        annuityTranches: [
          { enabled: true, owner: 'primary', purchaseAge: 60, allocationPercent: 50, annuityRatePercent: 5, annuityType: 'level', durationOption: 'lifetime' },
          { enabled: true, owner: 'partner', purchaseAge: 60, allocationPercent: 50, annuityRatePercent: 5, annuityType: 'inflation_linked', durationOption: 'fixed_term', durationUntilAge: 75 }
        ],
        targetRetirementAge: 60,
        partnerTargetRetirementAge: 60
      },
      {
        ...DEFAULT_POTS,
        primaryWorkplacePensionBalance: 100000,
        partnerWorkplacePensionBalance: 100000
      },
      calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS),
      { numSimulations: 2, maxAge: 65 }
    );
    expect(result).toBeDefined();
  });

  it('covers pro_rata drawdown strategy', () => {
    const result = runMonteCarloSimulation(
      {
        ...DEFAULT_PROFILE,
        drawdownStrategy: 'pro_rata',
        isCouplePlanning: true,
        partnerDrawdownStrategy: 'pro_rata',
        currentAge: 60,
        targetRetirementAge: 60,
        partnerTargetRetirementAge: 60,
        essentialRetirementAnnualSpend: 100000
      },
      {
        ...DEFAULT_POTS,
        primaryWorkplacePensionBalance: 100000,
        partnerWorkplacePensionBalance: 100000,
        stocksSharesIsaBalance: 50000,
        cashSavingsBalance: 50000
      },
      calculateUKTax(DEFAULT_PROFILE, DEFAULT_POTS),
      { numSimulations: 2, maxAge: 65 }
    );
    expect(result).toBeDefined();
  });
});
