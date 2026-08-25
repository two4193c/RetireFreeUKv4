const fs = require('fs');
const file = 'src/utils/monteCarloEngine.ts';
let code = fs.readFileSync(file, 'utf8');

// Issue 13: The second reinvestment block should only reinvest drawdown excess,
// not the guaranteed surplus that was already reinvested above
const target13 = `        // Handle Reinvest Surplus
        if (isReinvestExcess && !isCashBufferActiveYr) {
            const actualNetSecured = netGuaranteedIncomeSecured + totalNetAchieved;
            if (actualNetSecured > requiredNetIncomeTarget) {
                const surplus = actualNetSecured - requiredNetIncomeTarget;`;

const rep13 = `        // Handle Reinvest Surplus (drawdown excess only — guaranteed surplus already reinvested above)
        if (isReinvestExcess && !isCashBufferActiveYr) {
            const guaranteedAlreadyReinvested = Math.max(0, netGuaranteedIncomeSecured - requiredNetIncomeTarget);
            const actualNetSecured = netGuaranteedIncomeSecured + totalNetAchieved;
            if (actualNetSecured > requiredNetIncomeTarget) {
                const surplus = Math.max(0, actualNetSecured - requiredNetIncomeTarget - guaranteedAlreadyReinvested);
                if (surplus <= 0) { /* no drawdown excess to reinvest */ }`;

code = code.replace(target13, rep13);

fs.writeFileSync(file, code);
console.log('Issue 13 fixed: guaranteed surplus no longer double-reinvested');
