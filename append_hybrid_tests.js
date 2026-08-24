const fs = require('fs');
const path = 'src/utils/__tests__/projectionEngine.test.ts';
const content = fs.readFileSync(path, 'utf8');

const newTest = `
  it('covers hybrid annuity tranches for primary and partner', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 65,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      incomeProductOption: 'hybrid',
      partnerIncomeProductOption: 'hybrid',
      annuityTranches: [
        { enabled: true, owner: 'primary', purchaseAge: 60, allocationPercent: 50, annuityRatePercent: 5, annuityType: 'level', durationOption: 'lifetime' }
      ],
      partnerAnnuityTranches: [
        { enabled: true, owner: 'partner', purchaseAge: 60, allocationPercent: 50, annuityRatePercent: 5, annuityType: 'inflation_linked', durationOption: 'fixed_term', durationUntilAge: 75 }
      ]
    };

    const pots: any = {
      ...DEFAULT_POTS,
      workplacePensionBalance: 100000,
      primaryUncrystallisedPot: 100000,
      partnerWorkplacePensionBalance: 100000,
      partnerUncrystallisedPot: 100000,
      stocksAndSharesIsaBalance: 100000,
      cashSavingsBalance: 100000,
    };

    const rows = generateProjections(profile, pots);
    const row60 = rows.find(r => r.age === 60);
    expect(row60).toBeDefined();
  });

  it('covers partner annuity purchase (non-hybrid)', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 65,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      partnerIncomeProductOption: 'annuity',
      partnerAnnuityPurchaseAge: 60,
      partnerAnnuityAllocationPercent: 100,
      partnerAnnuityRatePercent: 5,
      partnerAnnuityType: 'level'
    };

    const pots: any = {
      ...DEFAULT_POTS,
      partnerWorkplacePensionBalance: 100000,
      partnerUncrystallisedPot: 100000
    };

    const rows = generateProjections(profile, pots);
    const row60 = rows.find(r => r.age === 60);
    expect(row60).toBeDefined();
  });
`;

const updatedContent = content.replace(/}\);\s*$/, newTest + '\n});\n');
fs.writeFileSync(path, updatedContent);
console.log("Appended hybrid tests successfully");
