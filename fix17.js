const fs = require('fs');
const file = 'src/utils/monteCarloEngine.ts';
let code = fs.readFileSync(file, 'utf8');

const targetBrackets = `            const targetGross = Math.min(hasAccess ? pPot : 0, maxGrossForBracket);

            if (targetGross > 0) {
               executePensionDeduct(targetGross);
            }`;

const repBrackets = `            let targetGross = Math.min(hasAccess ? pPot : 0, maxGrossForBracket);
            if (!isReinvestExcess && remaining > 0) {
               const neededForRemaining = getGrossPensionNeededForNetForOwner(remaining, pPot, owner);
               targetGross = Math.min(targetGross, neededForRemaining);
            }

            if (targetGross > 0 && remaining > 0) {
               executePensionDeduct(targetGross);
            }`;

code = code.replace(targetBrackets, repBrackets);

fs.writeFileSync(file, code);
console.log('Issue 17 fixed: tax optimizer now caps at required need unless reinvesting excess');
