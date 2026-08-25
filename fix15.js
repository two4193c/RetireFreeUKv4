const fs = require('fs');
const file = 'src/utils/monteCarloEngine.ts';
let code = fs.readFileSync(file, 'utf8');

// Close the !isRetired branch and start the annuity logic unconditionally
const targetPhaseSplit = `          addProRata('pension', partnerWorkingPensionContrib * inflationFactor * (1 + randomReturn / 2), true);
          addProRata('isa', partnerWorkingIsaContrib * inflationFactor * (1 + randomReturn / 2), true);
          addProRata('cashGia', partnerWorkingCashGiaContrib * inflationFactor * (1 + (randomReturn * 0.85) / 2), true);
        }

        // Primary Single / Initial Hybrid Annuity Purchase`;

const repPhaseSplit = `          addProRata('pension', partnerWorkingPensionContrib * inflationFactor * (1 + randomReturn / 2), true);
          addProRata('isa', partnerWorkingIsaContrib * inflationFactor * (1 + randomReturn / 2), true);
          addProRata('cashGia', partnerWorkingCashGiaContrib * inflationFactor * (1 + (randomReturn * 0.85) / 2), true);
        }
      } // End of ACCUMULATION vs PARTNER-WORKING branches

      // --- Life Events & Decumulation Transitions (Run independently of global retirement status) ---
        // Primary Single / Initial Hybrid Annuity Purchase`;

code = code.replace(targetPhaseSplit, repPhaseSplit);

// Then, wrap the drawdown block in if (isRetired)
const targetDrawdownStart = `        // Required inflation-adjusted gross target
        const maxDrawdownIncomeTarget = getTargetIncomeForAge(profile, age);`;

const repDrawdownStart = `        // --- Household Drawdown Logic ---
      if (isRetired) {
        // Required inflation-adjusted gross target
        const maxDrawdownIncomeTarget = getTargetIncomeForAge(profile, age);`;

code = code.replace(targetDrawdownStart, repDrawdownStart);

// Finally, find the end of the isRetired block. The old else block used to end before partner mortality.
const targetDrawdownEnd = `      // Partner Mortality Inheritance
      if (profile.isCouplePlanning && !partnerDead && partnerAge >= (profile.partnerLifeExpectancyAge || 95)) {`;

const repDrawdownEnd = `      } // End of isRetired Household Drawdown Block

      // Partner Mortality Inheritance
      if (profile.isCouplePlanning && !partnerDead && partnerAge >= (profile.partnerLifeExpectancyAge || 95)) {`;

code = code.replace(targetDrawdownEnd, repDrawdownEnd);

fs.writeFileSync(file, code);
console.log('Issue 15 fixed: decoupled partner decumulation from primary retirement');
