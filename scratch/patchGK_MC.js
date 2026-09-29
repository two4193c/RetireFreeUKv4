const fs = require('fs');

const path = 'src/utils/monteCarloEngine.ts';
let c = fs.readFileSync(path, 'utf8');

// Normalize line endings for reliable matching
c = c.replace(/\r\n/g, '\n');

const target1 = `      let pclsTaken = false;
      let partnerPclsTaken = false;
      let primaryCumulativeTaxFreeDrawn = 0;`;

const patch1 = `      let pclsTaken = false;
      let partnerPclsTaken = false;
      let primaryCumulativeTaxFreeDrawn = 0;
      let gkMultiplier = 1.0;
      let initialWithdrawalRate = 0;`;

c = c.replace(target1, patch1);

const target2 = `          // Required inflation-adjusted gross target
          const maxDrawdownIncomeTarget = getTargetIncomeForAge(profile, age);
          const actualSpendingBase = getActualSpendingTargetForAge(profile, age);`;

const patch2 = `          // Guyton-Klinger Dynamic Spending Rules
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
          const actualSpendingBase = getActualSpendingTargetForAge(profile, age) * gkMultiplier;`;

c = c.replace(target2, patch2);

fs.writeFileSync(path, c);
console.log('Patched monteCarloEngine.ts with GK Rules');
