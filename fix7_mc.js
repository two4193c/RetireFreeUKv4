const fs = require('fs');
const file = 'src/utils/monteCarloEngine.ts';
let code = fs.readFileSync(file, 'utf8');

const target1 = `getEffectiveAccumulationReturn(profile.expectedInvestmentReturn || 6.0, profile.assetAllocationSplit, profile.investmentFees)`;
const rep1 = `getEffectiveAccumulationReturn(profile.expectedInvestmentReturn || 6.0, profile.assetAllocationSplit, profile.investmentFees, profile.pots, profile.partnerPots)`;
code = code.replace(target1, rep1);

const target2 = `getEffectiveDecumulationReturn(profile.postRetirementReturn || 4.5, profile.assetAllocationSplit, profile.investmentFees)`;
const rep2 = `getEffectiveDecumulationReturn(profile.postRetirementReturn || 4.5, profile.assetAllocationSplit, profile.investmentFees, profile.pots, profile.partnerPots)`;
code = code.replace(target2, rep2);

fs.writeFileSync(file, code);
