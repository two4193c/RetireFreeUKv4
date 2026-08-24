const fs = require('fs');
const file = 'src/components/InvestmentFeesCard.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `const globalFeePercent = getTotalFeePercent(feeConfig);`;
const rep = `const globalFeePercent = getTotalFeePercent(feeConfig, pots || profile.pots, profile.partnerPots);`;

code = code.replace(target, rep);

fs.writeFileSync(file, code);
