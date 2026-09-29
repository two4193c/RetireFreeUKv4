const fs = require('fs');

let c = fs.readFileSync('src/utils/planInsightsEngine.ts', 'utf8');

// 1. Add calculatePartnerUKTax to the import from ukTaxEngine
c = c.replace(
  "import { getPensionAccessAge, getPartnerPensionAccessAge, getProjectedPensionAtTakeAge, getLumpSumTakeAge, getPartnerLumpSumTakeAge, calculateMaxPcls, calculatePartnerMaxPcls } from './ukTaxEngine';",
  "import { getPensionAccessAge, getPartnerPensionAccessAge, getProjectedPensionAtTakeAge, getLumpSumTakeAge, getPartnerLumpSumTakeAge, calculateMaxPcls, calculatePartnerMaxPcls, calculatePartnerUKTax } from './ukTaxEngine';"
);

// 2. Add partnerTaxResult calculation to computePlanInsights
const fnStart = "export function computePlanInsights(";
const fnBodyStartStr = "  const opportunities: ActionableOpportunity[] = [];";
const newFnBodyStart = `  const partnerTaxResult = profile.isCouplePlanning ? calculatePartnerUKTax(profile, pots) : null;
  const opportunities: ActionableOpportunity[] = [];`;

c = c.replace(fnBodyStartStr, newFnBodyStart);

// 3. Replace Opportunity 1, 2, 3 block
const searchOpp = /\/\/ Opportunity 1: 60% Marginal Tax Trap \(\£100k - £125,140\)[\s\S]*?(?=\/\/ Opportunity 4:)/;

const oppReplacement = `// Helper function to evaluate Tax Trap
  const evaluateTaxTrap = (ownerName: string, tRes: TaxCalculationResult | null | undefined, salary: number, ownerPrefix: string) => {
    const is60TrapActive = Boolean(tRes?.is60PercentTaxTrap);
    const trapAmount = tRes?.taxTrapAmountInBracket || 0;
    const recommendedTrapContrib = tRes?.recommendedTaxTrapPensionContribution || 0;
    const adjustedNetIncome = tRes?.adjustedNetIncome ?? salary;

    if (is60TrapActive && trapAmount > 0) {
      opportunities.push({
        id: \`tax_trap_mitigation_\${ownerPrefix}\`,
        category: 'Allowances & Reliefs',
        title: \`\${ownerName}: 60% Marginal Tax Trap Elimination (£100k–£125k Taper)\`,
        impactLevel: 'High Impact',
        status: 'recommended',
        observation: \`\${ownerName}'s Adjusted Net Income is £\${Math.round(adjustedNetIncome).toLocaleString()}, placing £\${Math.round(trapAmount).toLocaleString()} in the Personal Allowance taper zone where earnings suffer an effective 60% marginal tax rate.\`,
        actionableStep: \`Contribute an additional £\${Math.round(recommendedTrapContrib).toLocaleString()}/yr into a workplace pension or SIPP to pull Adjusted Net Income down to exactly £100,000.\`,
        projectedBenefit: \`Reclaims £\${Math.round(trapAmount * 0.5).toLocaleString()} of tax-free Personal Allowance, saving £\${Math.round(trapAmount * 0.6).toLocaleString()}/yr in income tax (60% effective relief).\`,
      });
    } else if (salary > 100000 && !is60TrapActive) {
      opportunities.push({
        id: \`tax_trap_optimised_\${ownerPrefix}\`,
        category: 'Allowances & Reliefs',
        title: \`\${ownerName}: 60% Tax Trap Successfully Mitigated\`,
        impactLevel: 'Strategic Value',
        status: 'already_optimised',
        observation: \`Gross salary of £\${salary.toLocaleString()} is above £100,000, but active pension contributions of £\${Math.round(tRes?.totalPensionContributionsAnnual || 0).toLocaleString()}/yr successfully reduce Adjusted Net Income to £\${Math.round(adjustedNetIncome).toLocaleString()}.\`,
        actionableStep: \`Maintain current pension contributions to protect the full £12,570 Personal Allowance each tax year.\`,
        projectedBenefit: \`Successfully avoiding up to £\${Math.round(Math.min(25140, (salary - 100000)) * 0.6).toLocaleString()}/yr in 60% marginal tax drag.\`,
      });
    }
  };

  // Opportunity 1: 60% Marginal Tax Trap
  const priName = profile.isCouplePlanning ? (profile.name || 'Primary') : 'Primary';
  const partName = profile.isCouplePlanning ? (profile.partnerName || 'Partner') : 'Partner';
  
  evaluateTaxTrap(profile.isCouplePlanning ? priName : 'Primary', taxResult, profile.grossAnnualSalary || 0, 'primary');
  if (profile.isCouplePlanning) {
    evaluateTaxTrap(partName, partnerTaxResult, profile.partnerGrossAnnualSalary || 0, 'partner');
  }

  // Opportunity 2: Salary Sacrifice vs Relief at Source NI Savings
  const evaluateSalarySacrifice = (ownerName: string, tRes: TaxCalculationResult | null | undefined, salary: number, method: string, ownerPrefix: string) => {
    const isSalarySacrifice = method === 'salary_sacrifice';
    const employeePensionContrib = tRes?.employeePensionContributionsAnnual || 0;
    if (!isSalarySacrifice && salary > 12570 && employeePensionContrib > 0) {
      const estNicSavings = Math.round(employeePensionContrib * (salary > 50270 ? 0.02 : 0.08));
      opportunities.push({
        id: \`salary_sacrifice_opportunity_\${ownerPrefix}\`,
        category: 'Tax Efficiency',
        title: \`\${ownerName}: Workplace Salary Sacrifice National Insurance Optimisation\`,
        impactLevel: 'High Impact',
        status: 'recommended',
        observation: \`Pension contributions are currently set to '\${method.replace(/_/g, ' ')}'. Paying employee National Insurance on £\${Math.round(employeePensionContrib).toLocaleString()}/yr of pension contributions.\`,
        actionableStep: \`Switch pension contributions to workplace Salary Sacrifice (SMART pensions) if offered by the employer.\`,
        projectedBenefit: \`Immediately saves ~£\${estNicSavings.toLocaleString()}/yr in employee National Insurance, plus potential employer NI rebate pass-through.\`,
      });
    } else if (isSalarySacrifice && (tRes?.salarySacrificeNicSavedEmployee || 0) > 0) {
      opportunities.push({
        id: \`salary_sacrifice_active_\${ownerPrefix}\`,
        category: 'Tax Efficiency',
        title: \`\${ownerName}: Salary Sacrifice National Insurance Shield\`,
        impactLevel: 'Strategic Value',
        status: 'already_optimised',
        observation: \`Salary Sacrifice is enabled on the workplace pension, shielding £\${Math.round(employeePensionContrib).toLocaleString()}/yr from National Insurance.\`,
        actionableStep: \`Continue channeling all regular salary increments and annual bonuses via salary sacrifice to maximize NI relief.\`,
        projectedBenefit: \`Saving £\${Math.round(tRes?.salarySacrificeNicSavedEmployee || 0).toLocaleString()}/yr in employee National Insurance.\`,
      });
    }
  };

  evaluateSalarySacrifice(profile.isCouplePlanning ? priName : 'Primary', taxResult, profile.grossAnnualSalary || 0, profile.pensionContributionMethod, 'primary');
  if (profile.isCouplePlanning) {
    evaluateSalarySacrifice(partName, partnerTaxResult, profile.partnerGrossAnnualSalary || 0, profile.partnerPensionContributionMethod || profile.pensionContributionMethod, 'partner');
  }

  // Opportunity 3: State Pension NI Qualifying Years Gaps
  const evaluateStatePensionGap = (ownerName: string, includeSP: boolean, qYears: number, ownerPrefix: string) => {
    if (includeSP) {
      const qualifyingYears = qYears;
      if (qualifyingYears < 35) {
        const missingYears = 35 - qualifyingYears;
        const annualStatePensionLoss = Math.round(missingYears * (12547.6 / 35));
        const estClass3Cost = Math.round(missingYears * 907.4);
        opportunities.push({
          id: \`state_pension_gap_fill_\${ownerPrefix}\`,
          category: 'Allowances & Reliefs',
          title: \`\${ownerName}: State Pension Voluntary Class 3 NI Gap Maximisation\`,
          impactLevel: 'High Impact',
          status: 'recommended',
          observation: \`Profile has \${qualifyingYears} qualifying years (\${missingYears} years short of the 35 years required for the full New State Pension).\`,
          actionableStep: \`Check National Insurance record on gov.uk and consider purchasing voluntary Class 3 NI contributions (~£\${estClass3Cost.toLocaleString()} total).\`,
          projectedBenefit: \`Boosts guaranteed State Pension by +£\${annualStatePensionLoss.toLocaleString()}/yr index-linked for life, typically breaking even in under 3 years of retirement.\`,
        });
      } else {
        const spaAge = ownerPrefix === 'primary' ? (profile.statePensionAge || 67) : (profile.partnerStatePensionAge || 67);
        opportunities.push({
          id: \`state_pension_maxed_\${ownerPrefix}\`,
          category: 'Allowances & Reliefs',
          title: \`\${ownerName}: Full State Pension Entitlement Secured\`,
          impactLevel: 'Strategic Value',
          status: 'already_optimised',
          observation: \`Full 35 qualifying National Insurance years achieved, securing 100% of the New State Pension (£12,548/yr).\`,
          actionableStep: \`Maintain NI record until State Pension Age (\${spaAge}).\`,
          projectedBenefit: \`Guarantees £\${Math.round(12547.6 * (horizonAge - spaAge)).toLocaleString()} of cumulative triple-lock indexed income across retirement.\`,
        });
      }
    }
  };

  evaluateStatePensionGap(profile.isCouplePlanning ? priName : 'Primary', profile.includeStatePension, profile.qualifyingYears ?? 35, 'primary');
  if (profile.isCouplePlanning) {
    evaluateStatePensionGap(partName, profile.partnerIncludeStatePension !== false, profile.partnerQualifyingYears ?? 35, 'partner');
  }

  `;

c = c.replace(searchOpp, oppReplacement);
fs.writeFileSync('src/utils/planInsightsEngine.ts', c);
console.log('Modified planInsightsEngine.ts');
