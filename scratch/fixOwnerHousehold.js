const fs = require('fs');
let c = fs.readFileSync('src/utils/planInsightsEngine.ts', 'utf8');

c = c.replace(/title: `\${ownerName}: 60% Marginal Tax Trap Elimination \(\£100k–\£125k Taper\)`,\s*impactLevel: 'High Impact',\s*status: 'recommended',\s*observation: [^,]+,\s*actionableStep: [^,]+,\s*projectedBenefit: [^,]+,\s*owner: 'Household',/g, (match) => {
  return match.replace("owner: 'Household',", "owner: ownerPrefix === 'primary' ? 'Primary' : 'Partner',");
});

c = c.replace(/title: `\${ownerName}: 60% Tax Trap Successfully Mitigated`,\s*impactLevel: 'Strategic Value',\s*status: 'already_optimised',\s*observation: [^,]+,\s*actionableStep: [^,]+,\s*projectedBenefit: [^,]+,\s*owner: 'Household',/g, (match) => {
  return match.replace("owner: 'Household',", "owner: ownerPrefix === 'primary' ? 'Primary' : 'Partner',");
});

c = c.replace(/title: `\${ownerName}: Workplace Salary Sacrifice National Insurance Optimisation`,\s*impactLevel: 'High Impact',\s*status: 'recommended',\s*observation: [^,]+,\s*actionableStep: [^,]+,\s*projectedBenefit: [^,]+,\s*owner: 'Household',/g, (match) => {
  return match.replace("owner: 'Household',", "owner: ownerPrefix === 'primary' ? 'Primary' : 'Partner',");
});

c = c.replace(/title: `\${ownerName}: Salary Sacrifice National Insurance Shield`,\s*impactLevel: 'Strategic Value',\s*status: 'already_optimised',\s*observation: [^,]+,\s*actionableStep: [^,]+,\s*projectedBenefit: [^,]+,\s*owner: 'Household',/g, (match) => {
  return match.replace("owner: 'Household',", "owner: ownerPrefix === 'primary' ? 'Primary' : 'Partner',");
});

c = c.replace(/title: `\${ownerName}: State Pension Voluntary Class 3 NI Gap Maximisation`,\s*impactLevel: 'High Impact',\s*status: 'recommended',\s*observation: [^,]+,\s*actionableStep: [^,]+,\s*projectedBenefit: [^,]+,\s*owner: 'Household',/g, (match) => {
  return match.replace("owner: 'Household',", "owner: ownerPrefix === 'primary' ? 'Primary' : 'Partner',");
});

c = c.replace(/title: `\${ownerName}: Full State Pension Entitlement Secured`,\s*impactLevel: 'Strategic Value',\s*status: 'already_optimised',\s*observation: [^,]+,\s*actionableStep: [^,]+,\s*projectedBenefit: [^,]+,\s*owner: 'Household',/g, (match) => {
  return match.replace("owner: 'Household',", "owner: ownerPrefix === 'primary' ? 'Primary' : 'Partner',");
});

fs.writeFileSync('src/utils/planInsightsEngine.ts', c);
console.log('Fixed owner prefixes in helper functions.');
