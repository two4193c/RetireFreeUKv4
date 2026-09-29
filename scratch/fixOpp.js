const fs = require('fs'); 
let c = fs.readFileSync('src/utils/planInsightsEngine.ts', 'utf8'); 

const search = /\/\/ Opportunity 7: Lump Sum Allowance \(LSA £268,275\) Protection Check[\s\S]*?(?=\/\/ Opportunity 8:)/; 

const replacement = `// Opportunity 7: Lump Sum Allowance (LSA £268,275) Protection Check
  const priTakeAge = getLumpSumTakeAge(profile);
  const priPensionAtTake = getProjectedPensionAtTakeAge(profile, pots, priTakeAge, false);
  const priMaxPcls = calculateMaxPcls(priPensionAtTake, profile);
  
  if (priMaxPcls.isCappedByLsa && profile.lsaProtectionType === 'standard') {
    const rawPcls = Math.round(priPensionAtTake * (profile.pclsLumpSumPercent ? profile.pclsLumpSumPercent / 100 : 0.25));
    opportunities.push({
      id: 'lsa_cap_monitoring_primary',
      category: 'Tax Efficiency',
      title: 'Lump Sum Allowance (£268,275 LSA Cap) Headroom Review',
      impactLevel: 'Medium Impact',
      status: 'review_suggested',
      observation: \`Projected pension pots (£\${Math.round(priPensionAtTake).toLocaleString()}) produce a 25% tax-free cash entitlement of £\${rawPcls.toLocaleString()}, which exceeds the standard £268,275 Lump Sum Allowance by £\${(rawPcls - priMaxPcls.lsaLimit).toLocaleString()}.\`,
      actionableStep: \`Check if you hold historic transitional protection (Enhanced, Fixed, or Individual Protection) or consider redirecting future surplus savings into ISAs.\`,
      projectedBenefit: \`Prevents excess pension lump sum withdrawals above £268,275 from being taxed at marginal income tax rates (up to 40%–45%).\`,
    });
  }

  if (profile.isCouplePlanning) {
    const partTakeAge = getPartnerLumpSumTakeAge(profile);
    const partPensionAtTake = getProjectedPensionAtTakeAge(profile, pots, partTakeAge, true);
    const partMaxPcls = calculatePartnerMaxPcls(partPensionAtTake, profile);
    if (partMaxPcls.isCappedByLsa && profile.partnerLsaProtectionType === 'standard') {
      const rawPcls = Math.round(partPensionAtTake * (profile.partnerPclsLumpSumPercent ? profile.partnerPclsLumpSumPercent / 100 : 0.25));
      opportunities.push({
        id: 'lsa_cap_monitoring_partner',
        category: 'Tax Efficiency',
        title: 'Partner Lump Sum Allowance (£268,275 LSA Cap) Headroom Review',
        impactLevel: 'Medium Impact',
        status: 'review_suggested',
        observation: \`Partner projected pension pots (£\${Math.round(partPensionAtTake).toLocaleString()}) produce a 25% tax-free cash entitlement of £\${rawPcls.toLocaleString()}, which exceeds the standard £268,275 Lump Sum Allowance by £\${(rawPcls - partMaxPcls.lsaLimit).toLocaleString()}.\`,
        actionableStep: \`Check if the partner holds historic transitional protection or consider redirecting their surplus savings into ISAs.\`,
        projectedBenefit: \`Prevents partner excess pension lump sum withdrawals above £268,275 from being taxed at marginal income tax rates (up to 40%–45%).\`,
      });
    }
  }

  `; 

if (c.match(search)) {
  c = c.replace(search, replacement); 
  fs.writeFileSync('src/utils/planInsightsEngine.ts', c); 
  console.log('Success');
} else { 
  console.log('No match found'); 
}
