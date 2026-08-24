const fs = require('fs');
const path = 'src/utils/__tests__/projectionEngine.test.ts';
const content = fs.readFileSync(path, 'utf8');

const newTest = `
  it('covers PCLS upfront with crystallisationMode = upfront', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      crystallisationMode: 'upfront', // This is the KEY!
      partnerCrystallisationMode: 'upfront',
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
console.log("Appended correct PCLS test successfully");
