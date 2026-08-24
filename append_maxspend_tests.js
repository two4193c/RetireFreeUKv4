const fs = require('fs');
const path = 'src/utils/__tests__/projectionEngine.test.ts';
const content = fs.readFileSync(path, 'utf8');

const newTest = `
  it('covers maximizedSpendConfig with coupleScope: primary and partner', () => {
    const profilePrimary: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      targetRetirementIncomeAnnual: 100000,
      drawdownStrategy: 'proportional_phases',
      maximizedSpendConfig: {
        enabled: true,
        coupleScope: 'primary',
        drawdownStrategy: 'proportional_phases'
      }
    };
    generateProjections(profilePrimary, { ...DEFAULT_POTS, workplacePensionBalance: 100000, partnerWorkplacePensionBalance: 100000 });

    const profilePartner: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      targetRetirementIncomeAnnual: 100000,
      drawdownStrategy: 'proportional_phases',
      maximizedSpendConfig: {
        enabled: true,
        coupleScope: 'partner',
        drawdownStrategy: 'proportional_phases'
      }
    };
    generateProjections(profilePartner, { ...DEFAULT_POTS, workplacePensionBalance: 100000, partnerWorkplacePensionBalance: 100000 });
  });

  it('covers primary only accessing pension while partner has none', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      targetRetirementIncomeAnnual: 100000,
      maximizedSpendConfig: {
        enabled: true,
        coupleScope: 'partner'
      }
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 100000, partnerWorkplacePensionBalance: 0 });
  });

  it('covers partner only accessing pension while primary has none', () => {
    const profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      isCouplePlanning: true,
      partnerCurrentAge: 60,
      partnerTargetRetirementAge: 60,
      targetRetirementIncomeAnnual: 100000,
      maximizedSpendConfig: {
        enabled: true,
        coupleScope: 'primary'
      }
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 0, partnerWorkplacePensionBalance: 100000 });
  });
`;

const updatedContent = content.replace(/}\);\s*$/, newTest + '\n});\n');
fs.writeFileSync(path, updatedContent);
console.log("Appended max spend tests successfully");
