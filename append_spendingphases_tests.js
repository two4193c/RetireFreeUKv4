const fs = require('fs');
const path = 'src/utils/__tests__/projectionEngine.test.ts';
const content = fs.readFileSync(path, 'utf8');

const newTest = `
  it('covers spendingPhases and maximizedSpendConfig spendingPhases logic', () => {
    // 1. Normal spendingPhases with custom ranges
    let profile: any = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 85,
      spendingPhases: {
        enabled: true,
        customRanges: [
          { startAge: 60, endAge: 65, annualTargetIncome: 50000 },
          { startAge: 66, endAge: 75, annualTargetIncome: 40000 }
        ]
      }
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 1000000 });

    // 2. Normal spendingPhases with legacy 3-phase goGo
    profile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 85,
      spendingPhases: {
        enabled: true,
        goGoEndAge: 65,
        goGoIncomeAnnual: 50000,
        slowGoEndAge: 75,
        slowGoIncomeAnnual: 40000,
        noGoIncomeAnnual: 30000
      }
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 1000000 });

    // 3. Maximized Spend Config spendingPhases with custom ranges
    profile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 85,
      maximizedSpendConfig: {
        enabled: true,
        spendingPhases: {
          enabled: true,
          customRanges: [
            { startAge: 60, endAge: 65, annualTargetIncome: 60000 },
            { startAge: 66, endAge: 75, annualTargetIncome: 50000 }
          ]
        }
      }
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 1000000 });

    // 4. Maximized Spend Config spendingPhases with legacy 3-phase goGo
    profile = {
      ...DEFAULT_PROFILE,
      currentAge: 60,
      targetRetirementAge: 60,
      lifeExpectancyAge: 85,
      maximizedSpendConfig: {
        enabled: true,
        spendingPhases: {
          enabled: true,
          goGoEndAge: 65,
          goGoIncomeAnnual: 60000,
          slowGoEndAge: 75,
          slowGoIncomeAnnual: 50000,
          noGoIncomeAnnual: 40000
        }
      }
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 1000000 });
    
    // 5. Test under startAge and over endAge
    profile = {
      ...DEFAULT_PROFILE,
      currentAge: 50,
      targetRetirementAge: 60,
      lifeExpectancyAge: 90,
      spendingPhases: {
        enabled: true,
        customRanges: [
          { startAge: 60, endAge: 70, annualTargetIncome: 50000 },
        ]
      }
    };
    generateProjections(profile, { ...DEFAULT_POTS, workplacePensionBalance: 1000000 });
  });
`;

const updatedContent = content.replace(/}\);\s*$/, newTest + '\n});\n');
fs.writeFileSync(path, updatedContent);
console.log("Appended spendingPhases tests successfully");
