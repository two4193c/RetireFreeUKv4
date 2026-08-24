const fs = require('fs');

const path = 'src/utils/__tests__/projectionEngine.test.ts';
const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes("it('Fee drag application logic"));
const endIndex = lines.lastIndexOf('});') - 1; 

const newTests = `
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
    expect(Math.round(row50!.estimatedInvestmentFees)).toBe(2500);
  });

  it('Mortgage payment integration (payoffAtRetirement and standard payments)', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 65,
      lifeExpectancyAge: 85,
      grossAnnualSalary: 50000,
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
    
    expect(row65!.propertyDownsizeEquityReleased).toBeLessThan(100000);
    expect(row65!.propertyDownsizeEquityReleased).toBeGreaterThan(0);
  });

  it('One-off contribution scheduling logic', () => {
    const currentYear = new Date().getFullYear();
    const profile: any = {
      ...DEFAULT_PROFILE,
      planStartYear: currentYear,
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
          date: \`\${currentYear + 2}-01-01\`,
          enabled: true
        }
      ]
    };
    const pots: InvestmentPots = { ...DEFAULT_POTS };
    const rows = generateProjections(profile, pots);
    const rowIn2Years = rows.find(r => r.age === 52);
    expect(rowIn2Years!.oneOffContributionsReceived).toBe(10000);
    expect(rowIn2Years!.primaryPensionPot).toBeGreaterThan(10000);
  });

  it('Salary sacrifice vs net-pay pension schemes', () => {
    const potsSacrifice: any = {
      ...DEFAULT_POTS,
      workplacePensionMonthlyEmployee: 5,
      workplacePensionMonthlyEmployeeType: 'percent'
    };
    const profileSacrifice: any = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 65,
      grossAnnualSalary: 50000,
      pensionContributionMethod: 'salary_sacrifice'
    };
    
    const profileNetPay: any = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 65,
      grossAnnualSalary: 50000,
      pensionContributionMethod: 'net_pay'
    };
    
    const rowsSacrifice = generateProjections(profileSacrifice, potsSacrifice);
    const rowsNetPay = generateProjections(profileNetPay, potsSacrifice);
    
    const sacrificeTax = rowsSacrifice.find(r => r.age === 50)!.totalTaxPaid;
    const netPayTax = rowsNetPay.find(r => r.age === 50)!.totalTaxPaid;
    expect(sacrificeTax).toBeLessThan(netPayTax);
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
    expect(row60!.netRetirementIncome).toBeGreaterThan(39000); // close to 40000
    expect(row60!.pensionDrawdown).toBeGreaterThan(0);
    expect(row60!.isaDrawdown).toBeGreaterThan(0);
  });

  it('Reinvest excess drawdown logic into ISA/GIA/cash', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 20000,
      reinvestExcessDrawdown: true,
      reinvestDestinationPot: 'stocks_and_shares_isa',
      includeStatePension: true,
      statePensionAge: 60,
      statePensionAmountAnnual: 15000,
      dbPensions: [
        {
          id: 'db1',
          name: 'DB',
          owner: 'primary',
          startAge: 60,
          annualIncome: 20000,
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
    expect(row60!.isaPot).toBeGreaterThan(0);
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
        },
        {
          id: 'trans2',
          owner: 'primary',
          sourcePot: 'gia',
          destinationOwner: 'partner',
          destinationPot: 'sipp',
          transferAge: 52,
          amount: 10000,
          enabled: true
        }
      ]
    };
    const pots: InvestmentPots = {
      ...DEFAULT_POTS,
      cashSavingsBalance: 10000,
      giaBalance: 15000,
      stocksAndSharesIsaBalance: 0,
      cashSavingsMonthlyContribution: 0,
      stocksAndSharesIsaMonthlyContribution: 0,
      workplacePensionMonthlyEmployee: 0,
      sippMonthlyContribution: 0
    };
    const rows = generateProjections(profile, pots);
    const row50 = rows.find(r => r.age === 50);
    const row51 = rows.find(r => r.age === 51);
    const row52 = rows.find(r => r.age === 52);
    
    expect(row50!.primaryStocksAndSharesIsaPot).toBe(0);
    expect(row51!.primaryStocksAndSharesIsaPot).toBeGreaterThanOrEqual(5000);
    expect(row52!.partnerPensionPot).toBeGreaterThanOrEqual(10000);
  });
`;

const newContent = lines.slice(0, startIndex).join('\\n') + '\\n' + newTests + '\\n});\\n';
fs.writeFileSync(path, newContent);
console.log("Replaced successfully");
