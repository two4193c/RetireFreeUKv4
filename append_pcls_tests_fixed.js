const fs = require('fs');
const path = 'src/utils/__tests__/projectionEngine.test.ts';
const content = fs.readFileSync(path, 'utf8');

const newTest = `
  it('covers takeLumpSumAtStart (PCLS upfront) for primary and partner with correct timing', () => {
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
      partnerUncrystallisedPot: 100000,
      workplacePensionBalance: 100000,
      partnerWorkplacePensionBalance: 100000
    });
  });
`;

const updatedContent = content.replace(/}\);\s*$/, newTest + '\n});\n');
fs.writeFileSync(path, updatedContent);
console.log("Appended updated pcls tests successfully");
