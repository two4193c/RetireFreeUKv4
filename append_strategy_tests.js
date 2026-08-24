const fs = require('fs');
const path = 'src/utils/__tests__/projectionEngine.test.ts';
const content = fs.readFileSync(path, 'utf8');

const newTest = `
  it('covers pro_rata drawdown strategy', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 60000,
      drawdownStrategy: 'pro_rata'
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 50000, cashSavingsBalance: 50000 });
  });

  it('covers cash_first drawdown strategy', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 60000,
      drawdownStrategy: 'cash_first'
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 50000, cashSavingsBalance: 50000 });
  });

  it('covers pension_first drawdown strategy', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 60000,
      drawdownStrategy: 'pension_first'
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 50000, cashSavingsBalance: 50000 });
  });

  it('covers basic_rate_bracket drawdown strategy for couple', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      targetRetirementIncomeAnnual: 100000,
      drawdownStrategy: 'basic_rate_bracket',
      partnerDrawdownStrategy: 'isa_first'
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 100000, stocksAndSharesIsaBalance: 50000, partnerWorkplacePensionBalance: 100000, partnerStocksAndSharesIsaBalance: 50000 });
  });

  it('covers higher_rate_bracket drawdown strategy for couple', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      targetRetirementIncomeAnnual: 150000,
      drawdownStrategy: 'higher_rate_bracket',
      partnerDrawdownStrategy: 'higher_rate_bracket'
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 500000, stocksAndSharesIsaBalance: 50000, partnerWorkplacePensionBalance: 500000, partnerStocksAndSharesIsaBalance: 50000 });
  });

  it('covers proportional_phases secondary safety net', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      targetRetirementIncomeAnnual: 200000,
      drawdownStrategy: 'proportional_phases'
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 50000, stocksAndSharesIsaBalance: 20000, cashSavingsBalance: 20000 });
  });
`;

const updatedContent = content.replace(/}\);\s*$/, newTest + '\n});\n');
fs.writeFileSync(path, updatedContent);
console.log("Appended strategy tests successfully");
