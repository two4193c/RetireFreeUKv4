const fs = require('fs');
let c = fs.readFileSync('src/utils/planInsightsEngine.ts', 'utf8');

const search = /\/\/ Opportunity 7: Lump Sum Allowance \(LSA £268,275\) Protection Check[\s\S]*?(?=\/\/ Opportunity 8: Plan Longevity)/;

const replacement = `// Opportunity 7: Lump Sum Allowance (LSA £268,275) Protection Check
  const priTakeAge = getLumpSumTakeAge(profile);
  const priPensionAtTake = getProjectedPensionAtTakeAge(profile, pots, priTakeAge, false);
  const priMaxPcls = calculateMaxPcls(priPensionAtTake, profile);
  const priRawPcls = Math.round(priPensionAtTake * (profile.pclsLumpSumPercent !== undefined ? profile.pclsLumpSumPercent / 100 : 0.25));
  
  if (priMaxPcls.isCappedByLsa) {
    opportunities.push({
      id: 'lsa_cap_monitoring_primary',
      category: 'Tax Efficiency',
      title: 'Lump Sum Allowance (£268,275 LSA Cap) Headroom Review',
      impactLevel: 'Medium Impact',
      status: 'review_suggested',
      observation: \`Projected pension pots (£\${Math.round(priPensionAtTake).toLocaleString()}) produce a \${profile.pclsLumpSumPercent || 25}% tax-free cash entitlement of £\${priRawPcls.toLocaleString()}, which exceeds your LSA allowance of £\${priMaxPcls.lsaLimit.toLocaleString()} by £\${(priRawPcls - priMaxPcls.lsaLimit).toLocaleString()}.\`,
      actionableStep: \`Check if you hold historic transitional protection (Enhanced, Fixed, or Individual Protection) or consider redirecting future surplus savings into ISAs.\`,
      projectedBenefit: \`Prevents excess pension lump sum withdrawals above your LSA from being taxed at marginal income tax rates (up to 40%–45%).\`,
    });
  } else {
    opportunities.push({
      id: 'lsa_cap_monitoring_primary',
      category: 'Tax Efficiency',
      title: 'Lump Sum Allowance (£268,275 LSA Cap) Headroom Review',
      impactLevel: 'Low Impact',
      status: 'already_optimised',
      observation: \`Projected pension pots (£\${Math.round(priPensionAtTake).toLocaleString()}) produce a tax-free cash entitlement of £\${priRawPcls.toLocaleString()}, leaving £\${(priMaxPcls.lsaLimit - priRawPcls).toLocaleString()} of Lump Sum Allowance headroom.\`,
      actionableStep: \`Your projected pension size remains securely below the LSA threshold. No immediate action required.\`,
      projectedBenefit: \`Ensures all available tax-free cash can be withdrawn without incurring marginal tax penalties.\`,
    });
  }

  if (profile.isCouplePlanning) {
    const partTakeAge = getPartnerLumpSumTakeAge(profile);
    const partPensionAtTake = getProjectedPensionAtTakeAge(profile, pots, partTakeAge, true);
    const partMaxPcls = calculatePartnerMaxPcls(partPensionAtTake, profile);
    const partRawPcls = Math.round(partPensionAtTake * (profile.partnerPclsLumpSumPercent !== undefined ? profile.partnerPclsLumpSumPercent / 100 : 0.25));
    
    if (partMaxPcls.isCappedByLsa) {
      opportunities.push({
        id: 'lsa_cap_monitoring_partner',
        category: 'Tax Efficiency',
        title: 'Partner Lump Sum Allowance (£268,275 LSA Cap) Headroom Review',
        impactLevel: 'Medium Impact',
        status: 'review_suggested',
        observation: \`Partner's projected pension pots (£\${Math.round(partPensionAtTake).toLocaleString()}) produce a \${profile.partnerPclsLumpSumPercent || 25}% tax-free cash entitlement of £\${partRawPcls.toLocaleString()}, which exceeds their LSA allowance of £\${partMaxPcls.lsaLimit.toLocaleString()} by £\${(partRawPcls - partMaxPcls.lsaLimit).toLocaleString()}.\`,
        actionableStep: \`Check if the partner holds historic transitional protection or consider redirecting their surplus savings into ISAs.\`,
        projectedBenefit: \`Prevents partner's excess pension lump sum withdrawals above their LSA from being taxed at marginal income tax rates (up to 40%–45%).\`,
      });
    } else {
      opportunities.push({
        id: 'lsa_cap_monitoring_partner',
        category: 'Tax Efficiency',
        title: 'Partner Lump Sum Allowance (£268,275 LSA Cap) Headroom Review',
        impactLevel: 'Low Impact',
        status: 'already_optimised',
        observation: \`Partner's projected pension pots (£\${Math.round(partPensionAtTake).toLocaleString()}) produce a tax-free cash entitlement of £\${partRawPcls.toLocaleString()}, leaving £\${(partMaxPcls.lsaLimit - partRawPcls).toLocaleString()} of Lump Sum Allowance headroom.\`,
        actionableStep: \`Partner's projected pension size remains securely below the LSA threshold. No immediate action required.\`,
        projectedBenefit: \`Ensures all available tax-free cash can be withdrawn without incurring marginal tax penalties.\`,
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
