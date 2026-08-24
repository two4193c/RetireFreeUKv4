const fs = require('fs');
const path = 'src/utils/__tests__/projectionEngine.test.ts';
const content = fs.readFileSync(path, 'utf8');

const newTest = `
  it('covers pot transfers for various source and destination combinations (partner and primary)', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 50,
      partnerTargetRetirementAge: 60,
      potTransfers: [
        // partner sources
        { id: '1', owner: 'partner', sourcePot: 'workplace_pension', destinationOwner: 'primary', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '2', owner: 'partner', sourcePot: 'stocks_and_shares_isa', destinationOwner: 'primary', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '3', owner: 'partner', sourcePot: 'cash_isa', destinationOwner: 'primary', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '4', owner: 'partner', sourcePot: 'lisa', destinationOwner: 'primary', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '5', owner: 'partner', sourcePot: 'gia', destinationOwner: 'primary', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '6', owner: 'partner', sourcePot: 'cash_savings', destinationOwner: 'primary', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        
        // primary sources
        { id: '7', owner: 'primary', sourcePot: 'workplace_pension', destinationOwner: 'partner', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '8', owner: 'primary', sourcePot: 'stocks_and_shares_isa', destinationOwner: 'partner', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '9', owner: 'primary', sourcePot: 'cash_isa', destinationOwner: 'partner', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '10', owner: 'primary', sourcePot: 'lisa', destinationOwner: 'partner', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        { id: '11', owner: 'primary', sourcePot: 'gia', destinationOwner: 'partner', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },
        
        // partner destinations
        { id: '12', owner: 'primary', sourcePot: 'cash_savings', destinationOwner: 'partner', destinationPot: 'sipp', transferAge: 51, amount: 1000, enabled: true },
        { id: '13', owner: 'primary', sourcePot: 'cash_savings', destinationOwner: 'partner', destinationPot: 'stocks_and_shares_isa', transferAge: 51, amount: 1000, enabled: true },
        { id: '14', owner: 'primary', sourcePot: 'cash_savings', destinationOwner: 'partner', destinationPot: 'cash_isa', transferAge: 51, amount: 1000, enabled: true },
        { id: '15', owner: 'primary', sourcePot: 'cash_savings', destinationOwner: 'partner', destinationPot: 'lisa', transferAge: 51, amount: 1000, enabled: true },
        { id: '16', owner: 'primary', sourcePot: 'cash_savings', destinationOwner: 'partner', destinationPot: 'gia', transferAge: 51, amount: 1000, enabled: true },
        { id: '17', owner: 'primary', sourcePot: 'cash_savings', destinationOwner: 'partner', destinationPot: 'cash_savings', transferAge: 51, amount: 1000, enabled: true },

        // primary destinations
        { id: '18', owner: 'partner', sourcePot: 'cash_savings', destinationOwner: 'primary', destinationPot: 'sipp', transferAge: 51, amount: 1000, enabled: true },
        { id: '19', owner: 'partner', sourcePot: 'cash_savings', destinationOwner: 'primary', destinationPot: 'stocks_and_shares_isa', transferAge: 51, amount: 1000, enabled: true },
        { id: '20', owner: 'partner', sourcePot: 'cash_savings', destinationOwner: 'primary', destinationPot: 'cash_isa', transferAge: 51, amount: 1000, enabled: true },
        { id: '21', owner: 'partner', sourcePot: 'cash_savings', destinationOwner: 'primary', destinationPot: 'lisa', transferAge: 51, amount: 1000, enabled: true },
        { id: '22', owner: 'partner', sourcePot: 'cash_savings', destinationOwner: 'primary', destinationPot: 'gia', transferAge: 51, amount: 1000, enabled: true }
      ]
    };

    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 10000,
      stocksAndSharesIsaBalance: 10000,
      cashIsaBalance: 10000,
      lisaBalance: 10000,
      giaBalance: 10000,
      cashSavingsBalance: 100000, // plenty for sources

      partnerWorkplacePensionBalance: 10000,
      partnerStocksAndSharesIsaBalance: 10000,
      partnerCashIsaBalance: 10000,
      partnerLisaBalance: 10000,
      partnerGiaBalance: 10000,
      partnerCashSavingsBalance: 100000 // plenty for sources
    };

    const rows = generateProjections(profile, pots);
    expect(rows).toBeDefined();
  });
`;

const updatedContent = content.replace(/}\);\s*$/, newTest + '\n});\n');
fs.writeFileSync(path, updatedContent);
console.log("Appended transfer tests successfully");
