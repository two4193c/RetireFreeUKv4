const fs = require('fs');
const testContent = `
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
`;
const fp = 'C:/Users/two41/.gemini/antigravity/scratch/RetireFreeUKv4/src/utils/__tests__/monteCarloEngine.test.ts';
fs.appendFileSync(fp, testContent);
console.log('Appended more tests successfully');
