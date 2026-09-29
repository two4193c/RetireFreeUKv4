const fs = require('fs');

const path = 'src/utils/historicModelingEngine.ts';
let c = fs.readFileSync(path, 'utf8');

const target1 = `    for (let startIndex = 0; startIndex < HISTORIC_MARKET_DATA.length; startIndex++) {
      const startData = HISTORIC_MARKET_DATA[startIndex];
      const rawSequence = getHistoricSequence(startIndex, numYears);
      const sequence = reverseSequence ? [...rawSequence].reverse() : rawSequence;

      let primaryUncrystallisedPot = cleanPots.workplacePensionBalance + cleanPots.sippBalance;`;

const patch1 = `    for (let startIndex = 0; startIndex < HISTORIC_MARKET_DATA.length; startIndex++) {
      const startData = HISTORIC_MARKET_DATA[startIndex];
      const rawSequence = getHistoricSequence(startIndex, numYears);
      const sequence = reverseSequence ? [...rawSequence].reverse() : rawSequence;

      let gkMultiplier = 1.0;
      let initialWithdrawalRate = 0;

      let primaryUncrystallisedPot = cleanPots.workplacePensionBalance + cleanPots.sippBalance;`;

c = c.replace(target1, patch1);


const target2 = `          // Target income calculations accounting for Maximized Spend & Reinvest Excess
        const maxDrawdownIncomeTarget = getTargetIncomeForAge(profile, age);
        const actualSpendingBase = getActualSpendingTargetForAge(profile, age);`;

const patch2 = `          // Target income calculations accounting for Maximized Spend & Reinvest Excess
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
        const actualSpendingBase = getActualSpendingTargetForAge(profile, age) * gkMultiplier;`;

c = c.replace(target2, patch2);

fs.writeFileSync(path, c);
console.log('Patched historicModelingEngine.ts with GK Rules');
