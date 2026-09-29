const fs = require('fs');

let mcPath = 'src/utils/monteCarloEngine.ts';
let mc = fs.readFileSync(mcPath, 'utf8');

// Patch 1
mc = mc.replace(/let primaryCumulativeTaxFreeDrawn = 0;/g, 'let primaryCumulativeTaxFreeDrawn = 0;\n      let gkMultiplier = 1.0;\n      let initialWithdrawalRate = 0;');

// Patch 2
mc = mc.replace(/\/\/ Required inflation-adjusted gross target\r?\n\s+const maxDrawdownIncomeTarget = getTargetIncomeForAge\(profile, age\);\r?\n\s+const actualSpendingBase = getActualSpendingTargetForAge\(profile, age\);/g, 
`// Guyton-Klinger Dynamic Spending Rules
          if (profile.dynamicSpendingRules?.enabled) {
            const totalWealth = pensionPot + isaPot + cashGiaPot;
            const nominalBaseTarget = getActualSpendingTargetForAge(profile, age) * inflationFactor;
            
            if (initialWithdrawalRate === 0 && totalWealth > 0) {
              initialWithdrawalRate = nominalBaseTarget / totalWealth;
            } else if (initialWithdrawalRate > 0 && totalWealth > 0) {
              const currentWithdrawalRate = (nominalBaseTarget * gkMultiplier) / totalWealth;
              const presThresh = 1 + (profile.dynamicSpendingRules.capitalPreservationThresholdPercent / 100);
              const presCut = profile.dynamicSpendingRules.capitalPreservationCutPercent / 100;
              const prospThresh = 1 - (profile.dynamicSpendingRules.prosperityThresholdPercent / 100);
              const prospInc = profile.dynamicSpendingRules.prosperityIncreasePercent / 100;
              
              if (currentWithdrawalRate > (initialWithdrawalRate * presThresh)) {
                gkMultiplier *= (1 - presCut);
              } else if (currentWithdrawalRate < (initialWithdrawalRate * prospThresh)) {
                gkMultiplier *= (1 + prospInc);
              }
              
              if (profile.dynamicSpendingRules.skipInflationOnNegativeReturn && randomReturn < 0) {
                // Cancel out this year's inflation growth
                gkMultiplier /= (1 + inflation);
              }
            }
          }

          // Required inflation-adjusted gross target
          const maxDrawdownIncomeTarget = getTargetIncomeForAge(profile, age) * gkMultiplier;
          const actualSpendingBase = getActualSpendingTargetForAge(profile, age) * gkMultiplier;`);

fs.writeFileSync(mcPath, mc);

let histPath = 'src/utils/historicModelingEngine.ts';
let hist = fs.readFileSync(histPath, 'utf8');

hist = hist.replace(/let primaryUncrystallisedPot = cleanPots.workplacePensionBalance \+ cleanPots.sippBalance;/g, 'let gkMultiplier = 1.0;\n      let initialWithdrawalRate = 0;\n\n      let primaryUncrystallisedPot = cleanPots.workplacePensionBalance + cleanPots.sippBalance;');

hist = hist.replace(/\/\/ Target income calculations accounting for Maximized Spend & Reinvest Excess\r?\n\s+const maxDrawdownIncomeTarget = getTargetIncomeForAge\(profile, age\);\r?\n\s+const actualSpendingBase = getActualSpendingTargetForAge\(profile, age\);/g, 
`// Target income calculations accounting for Maximized Spend & Reinvest Excess
          if (profile.dynamicSpendingRules?.enabled) {
            const totalWealth = pensionPot + isaPot + cashGiaPot;
            const nominalBaseTarget = getActualSpendingTargetForAge(profile, age) * cumulativeInflationFactor;
            
            if (initialWithdrawalRate === 0 && totalWealth > 0) {
              initialWithdrawalRate = nominalBaseTarget / totalWealth;
            } else if (initialWithdrawalRate > 0 && totalWealth > 0) {
              const currentWithdrawalRate = (nominalBaseTarget * gkMultiplier) / totalWealth;
              const presThresh = 1 + (profile.dynamicSpendingRules.capitalPreservationThresholdPercent / 100);
              const presCut = profile.dynamicSpendingRules.capitalPreservationCutPercent / 100;
              const prospThresh = 1 - (profile.dynamicSpendingRules.prosperityThresholdPercent / 100);
              const prospInc = profile.dynamicSpendingRules.prosperityIncreasePercent / 100;
              
              if (currentWithdrawalRate > (initialWithdrawalRate * presThresh)) {
                gkMultiplier *= (1 - presCut);
              } else if (currentWithdrawalRate < (initialWithdrawalRate * prospThresh)) {
                gkMultiplier *= (1 + prospInc);
              }
              
              if (profile.dynamicSpendingRules.skipInflationOnNegativeReturn && blendedReturnRate < 0) {
                // Cancel out this year's inflation growth
                gkMultiplier /= (1 + hInf);
              }
            }
          }

          const maxDrawdownIncomeTarget = getTargetIncomeForAge(profile, age) * gkMultiplier;
          const actualSpendingBase = getActualSpendingTargetForAge(profile, age) * gkMultiplier;`);

fs.writeFileSync(histPath, hist);
console.log("Done");
