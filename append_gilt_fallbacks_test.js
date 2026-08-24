const fs = require('fs');
const path = 'src/utils/__tests__/projectionEngine.test.ts';
const content = fs.readFileSync(path, 'utf8');

const newTest = `
  it('covers gilt ladder fallback deductions', () => {
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
          annualIncome: 1000000, // Massive cost to force fallbacks
          durationYears: 5,
          fundingSource: source
        },
        partnerGiltLadderConfig: {
          enabled: true,
          purchaseAge: 60,
          annualIncome: 1000000,
          durationYears: 5,
          fundingSource: source
        }
      };

      const pots: any = {
        ...DEFAULT_POTS,
        workplacePensionBalance: 10,
        primaryUncrystallisedPot: 10,
        primaryCrystallisedPot: 10,
        stocksAndSharesIsaBalance: 10,
        cashIsaBalance: 10,
        giaBalance: 10,
        cashSavingsBalance: 10,
        
        partnerWorkplacePensionBalance: 10,
        partnerUncrystallisedPot: 10,
        partnerCrystallisedPot: 10,
        partnerStocksAndSharesIsaBalance: 10,
        partnerCashIsaBalance: 10,
        partnerGiaBalance: 10,
        partnerCashSavingsBalance: 10,
        
        // Add one big pot so that we don't break downstream logic unnecessarily
        // Wait, if it fails to fund, it just deducts whatever it can and continues.
      };

      generateProjections(profile, pots);
    }
  });

  it('covers PCLS fallback deductions', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      takeLumpSumAtStart: true,
      lumpSumTiming: 'upfront',
      partnerLumpSumTiming: 'upfront',
      pclsLumpSumPercent: 25,
      partnerPclsLumpSumPercent: 25,
      lumpSumTakeAge: 60,
      partnerLumpSumTakeAge: 60,
    };
    generateProjections(profile, { 
      ...DEFAULT_POTS, 
      primaryUncrystallisedPot: 100000, 
      primaryCrystallisedPot: 100000, 
      partnerUncrystallisedPot: 100000,
      partnerCrystallisedPot: 100000,
      workplacePensionBalance: 100000,
      partnerWorkplacePensionBalance: 100000
    });
  });
`;

const updatedContent = content.replace(/}\);\s*$/, newTest + '\n});\n');
fs.writeFileSync(path, updatedContent);
console.log("Appended gilt fallbacks successfully");
