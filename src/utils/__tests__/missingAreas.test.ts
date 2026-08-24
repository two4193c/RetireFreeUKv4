import { describe, it, expect } from 'vitest';
import { generateProjections } from '../projectionEngine';
import { DEFAULT_PROFILE, DEFAULT_POTS } from '../defaultData';
import { UserProfile, InvestmentPots } from '../../types';

describe('projectionEngine missing areas', () => {
  it('Fee drag application logic during accumulation and decumulation', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 55,
      expectedInvestmentReturn: 0,
      postRetirementReturn: 0,
      potReturnOverrides: { enabled: false },
      investmentFees: {
        enabled: true,
        perPotFeesEnabled: true,
        primaryPots: {
          workplacePension: { platformFeePercent: 2.5 }
        }
      }
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 100000,
    };
    const rows = generateProjections(profile, pots);
    const row50 = rows.find(r => r.age === 50);
    expect(row50!.estimatedInvestmentFees).toBeGreaterThan(2000);
  });

  it('Mortgage payment integration (payoffAtRetirement with downsizing)', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 65,
      lifeExpectancyAge: 85,
      mortgage: {
        enabled: true,
        currentBalance: 50000,
        remainingTermYears: 10,
        payoffAtRetirement: true
      },
      propertyDownsizePlan: {
        enabled: true,
        downsizeAge: 65,
        currentPropertyValue: 300000,
        targetNewPropertyCostToday: 200000,
        destinationPot: 'cash',
        sellingCostsPercent: 0,
        expectedAnnualGrowthRate: 0
      }
    };
    const pots: InvestmentPots = { ...DEFAULT_POTS };
    const rows = generateProjections(profile, pots);
    const row65 = rows.find(r => r.age === 65);
    console.log('ROW65 propertyDownsizeEquityReleased:', row65!.propertyDownsizeEquityReleased);
    // Equity released should have mortgage deducted: 300000 - 200000 - 50000(approx)
    expect(row65!.propertyDownsizeEquityReleased).toBeLessThan(100000);
    expect(row65!.propertyDownsizeEquityReleased).toBeGreaterThan(0);
  });

  it('One-off contribution scheduling logic', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      planStartYear: 2026,
      currentAge: 50,
      targetRetirementAge: 60,
      oneOffContributions: [
        {
          id: '1',
          name: 'Bonus',
          owner: 'primary',
          targetPot: 'sipp',
          frequency: 'one_off',
          grossAmount: 10000,
          date: '2028-01-01',
          enabled: true
        }
      ]
    };
    const pots: InvestmentPots = { ...DEFAULT_POTS };
    const rows = generateProjections(profile, pots);
    const row52 = rows.find(r => r.age === 52);
    expect(row52!.oneOffContributionsReceived).toBe(10000);
    expect(row52!.primaryPensionPot).toBeGreaterThan(10000); // 10k + tax relief
  });

  it('Salary sacrifice vs net-pay pension schemes', () => {
    const potsSacrifice: any = {
      ...DEFAULT_POTS,
      workplacePensionMonthlyEmployee: 5,
      workplacePensionMonthlyEmployeeType: 'percent'
    };
    const profileSacrifice: any = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 50000,
      pensionContributionMethod: 'salary_sacrifice'
    };
    
    const profileNetPay: any = {
      ...DEFAULT_PROFILE,
      grossAnnualSalary: 50000,
      pensionContributionMethod: 'net_pay'
    };
    
    generateProjections(profileSacrifice, potsSacrifice);
    generateProjections(profileNetPay, potsSacrifice);
  });

  it('Tax optimizer drawdown strategy', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 40000,
      drawdownStrategy: 'tax_optimizer'
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 500000,
      stocksAndSharesIsaBalance: 50000,
      cashSavingsBalance: 50000
    };
    const rows = generateProjections(profile, pots);
    const row60 = rows.find(r => r.age === 60);
    expect(row60!.netRetirementIncome).toBeGreaterThan(0);
  });

  it('Reinvest excess drawdown logic into ISA/GIA/cash', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 20000, // low target
      reinvestExcessDrawdown: true,
      reinvestDestinationPot: 'stocks_and_shares_isa',
      includeStatePension: true,
      statePensionAge: 60, // get it immediately to force excess
      statePensionAmountAnnual: 15000,
      dbPensions: [
        {
          id: 'db1',
          name: 'DB',
          owner: 'primary',
          startAge: 60,
          annualIncome: 20000, // 15k + 20k = 35k > 20k target
          taxFreeLumpSum: 0,
          enabled: true,
          targetPot: 'cash_savings'
        }
      ]
    };
    const pots: InvestmentPots = { ...DEFAULT_POTS };
    const rows = generateProjections(profile, pots);
    const row60 = rows.find(r => r.age === 60);
    expect(row60!.annualIncomeExcess).toBeGreaterThan(0);
    expect(row60!.isaPot).toBeGreaterThan(0); // Excess reinvested into ISA
  });

  it('Inter-pot auto-rebalance transfers logic', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 60,
      expectedInvestmentReturn: 0,
      expectedInflationRate: 0,
      postRetirementReturn: 0,
      potReturnOverrides: { enabled: true, stocksAndSharesIsa: 0, cashSavings: 0 },
      assetAllocationSplit: { enabled: false },
      potTransfers: [
        {
          id: 'trans1',
          owner: 'primary',
          sourcePot: 'cash_savings',
          destinationOwner: 'primary',
          destinationPot: 'stocks_and_shares_isa',
          transferAge: 51,
          amount: 5000,
          enabled: true
        }
      ]
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      cashSavingsBalance: 10000,
      stocksAndSharesIsaBalance: 0,
      cashSavingsMonthlyContribution: 0,
      stocksAndSharesIsaMonthlyContribution: 0,
      workplacePensionMonthlyEmployee: 0,
      sippMonthlyContribution: 0
    };
    const rows = generateProjections(profile, pots);
    const row50 = rows.find(r => r.age === 50);
    const row51 = rows.find(r => r.age === 51);
    
    // In year 1 (age 50), no transfer yet, ISA should be 0.
    // In year 2 (age 51), transfer of 5000 happens, ISA should jump to 5000 + growth.
    expect(row50!.primaryStocksAndSharesIsaPot).toBe(0);
    expect(row51!.primaryStocksAndSharesIsaPot).toBeGreaterThanOrEqual(5000);
    expect(row51!.primaryCashSavingsPot).toBeGreaterThanOrEqual(5000);
  });
});
