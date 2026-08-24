const fs = require('fs');
const path = 'src/utils/__tests__/projectionEngine.test.ts';
const content = fs.readFileSync(path, 'utf8');

const newTest = `
  it('covers one-off expenses deducting from various pots for primary and partner', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      oneOffExpenses: [
        { owner: 'primary', date: '2030-01-01', amount: 5000, targetPot: 'stocks_and_shares_isa', enabled: true },
        { owner: 'primary', date: '2030-01-01', amount: 5000, targetPot: 'gia', enabled: true },
        { owner: 'primary', date: '2030-01-01', amount: 5000, targetPot: 'cash_savings', enabled: true },
        { owner: 'partner', date: '2030-01-01', amount: 5000, targetPot: 'stocks_and_shares_isa', enabled: true },
        { owner: 'partner', date: '2030-01-01', amount: 5000, targetPot: 'gia', enabled: true },
        { owner: 'partner', date: '2030-01-01', amount: 5000, targetPot: 'cash_savings', enabled: true },
        
        // Exceeding amount to test fallbacks (deduct from other pots)
        { owner: 'primary', date: '2031-01-01', amount: 100000, targetPot: 'cash_savings', enabled: true },
        { owner: 'partner', date: '2031-01-01', amount: 100000, targetPot: 'cash_savings', enabled: true },
      ]
    };
    generateProjections(profile, { 
      ...DEFAULT_POTS, 
      stocksAndSharesIsaBalance: 20000,
      cashIsaBalance: 10000,
      lisaBalance: 10000,
      giaBalance: 20000,
      cashSavingsBalance: 20000,
      
      partnerStocksAndSharesIsaBalance: 20000,
      partnerCashIsaBalance: 10000,
      partnerLisaBalance: 10000,
      partnerGiaBalance: 20000,
      partnerCashSavingsBalance: 20000
    });
  });
`;

const updatedContent = content.replace(/}\);\s*$/, newTest + '\n});\n');
fs.writeFileSync(path, updatedContent);
console.log("Appended expenses tests successfully");
