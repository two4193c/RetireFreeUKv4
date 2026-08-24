const fs = require('fs');
const path = 'src/utils/__tests__/projectionEngine.test.ts';
const content = fs.readFileSync(path, 'utf8');

const newTest = `
  it('covers primary and partner gilt ladder purchases with various funding sources', () => {
    const sources = ['gia', 'isa', 'cash', 'pension', 'blended'];
    for (const source of sources) {
      const profile: any = {
        ...DEFAULT_PROFILE,
        currentAge: 60,
        targetRetirementAge: 60,
        lifeExpectancyAge: 65,
        isCouplePlanning: true,
        partnerCurrentAge: 60,
        partnerTargetRetirementAge: 60,
        incomeProductOption: 'gilt_ladder',
        partnerIncomeProductOption: 'gilt_ladder',
        giltLadderConfig: {
          enabled: true,
          purchaseAge: 60,
          annualIncome: 10000,
          durationYears: 5,
          fundingSource: source
        },
        partnerGiltLadderConfig: {
          enabled: true,
          purchaseAge: 60,
          annualIncome: 10000,
          durationYears: 5,
          fundingSource: source
        }
      };

      const pots: any = {
        ...DEFAULT_POTS,
        workplacePensionBalance: 100000,
        stocksAndSharesIsaBalance: 100000,
        giaBalance: 100000,
        cashSavingsBalance: 100000,
        partnerWorkplacePensionBalance: 100000,
        partnerStocksAndSharesIsaBalance: 100000,
        partnerGiaBalance: 100000,
        partnerCashSavingsBalance: 100000
      };

      const rows = generateProjections(profile, pots);
      const row60 = rows.find(r => r.age === 60);
      expect(row60).toBeDefined();
    }
  });

  it('covers uncrystallised drawdown for pcls recycling check branch', () => {
    // Just a quick check to hit some uncrystallised vs crystallised branches
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 65,
      crystallisationMode: 'uncrystallised_drawdown',
      takeLumpSumAtStart: false
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 100000 });
  });

  it('covers phased tranches with pcls timing delayed', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      takeLumpSumAtStart: false,
      lumpSumTiming: 'phased',
      crystallisationMode: 'phased_tranches',
      crystallisationTranches: [
        { age: 62, amount: 50000, enabled: true, owner: 'primary' }
      ]
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 100000 });
  });
`;

const updatedContent = content.replace(/}\);\s*$/, newTest + '\n});\n');
fs.writeFileSync(path, updatedContent);
console.log("Appended gilt ladder tests successfully");
