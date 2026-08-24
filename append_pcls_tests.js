const fs = require('fs');
const path = 'src/utils/__tests__/projectionEngine.test.ts';
const content = fs.readFileSync(path, 'utf8');

const newTest = `
  it('covers takeLumpSumAtStart (PCLS upfront) for primary and partner', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      takeLumpSumAtStart: true,
      pclsLumpSumPercent: 25,
      partnerPclsLumpSumPercent: 25,
      lumpSumTakeAge: 60,
      partnerLumpSumTakeAge: 60,
    };
    generateProjections(profile, { 
      ...DEFAULT_POTS, 
      workplacePensionBalance: 100000, 
      partnerWorkplacePensionBalance: 100000 
    });
  });

  it('covers phased tranches for partner', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      takeLumpSumAtStart: false,
      crystallisationMode: 'phased_tranches',
      crystallisationTranches: [
        { enabled: true, owner: 'partner', age: 60, amount: 50000, pclsPercent: 25 }
      ]
    };
    generateProjections(profile, { 
      ...DEFAULT_POTS, 
      workplacePensionBalance: 100000, 
      partnerWorkplacePensionBalance: 100000 
    });
  });
`;

const updatedContent = content.replace(/}\);\s*$/, newTest + '\n});\n');
fs.writeFileSync(path, updatedContent);
console.log("Appended pcls tests successfully");
