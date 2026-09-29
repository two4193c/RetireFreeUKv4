const fs = require('fs');
let c = fs.readFileSync('src/utils/planInsightsEngine.ts', 'utf8');

const anchor = `  // Opportunity 5: Mortgage Strategy & Decumulation Cash Flow
  if (profile.mortgage?.enabled && (profile.mortgage.currentBalance || 0) > 0) {
    const mortgageBal = profile.mortgage.currentBalance;
    const clearanceAgeExact = calculateActualMortgageClearanceAge(profile);
    const clearanceAge = Math.ceil(clearanceAgeExact);
    const isPayoffAtRetirement = profile.mortgage.payoffAtRetirement;`;

const newCode = `  // Opportunity 5: Mortgage Strategy & Decumulation Cash Flow
  if (profile.mortgage?.enabled && (profile.mortgage.currentBalance || 0) > 0) {
    const mortgageBal = profile.mortgage.currentBalance;
    const clearanceAgeExact = calculateActualMortgageClearanceAge(profile);
    const clearanceAge = Math.ceil(clearanceAgeExact);
    const isPayoffAtRetirement = profile.mortgage.payoffAtRetirement;

    // Opportunity 5b: Overpay vs Invest Arbitrage
    const interestRate = profile.mortgage.interestRatePercent;
    const expectedInvestmentReturn = profile.potReturnOverrides?.enabled 
        ? profile.potReturnOverrides.stocksAndSharesIsaReturn 
        : (profile.postRetirementReturn || 5.0);

    const annualOverpayment = (profile.mortgage.regularMonthlyOverpayment || 0) * 12;
    const penaltyFreeAllowance = profile.mortgage.ercEnabled ? profile.mortgage.currentBalance * ((profile.mortgage.ercThresholdPercent || 10) / 100) : Infinity;
    
    const incursERC = profile.mortgage.ercEnabled && annualOverpayment > penaltyFreeAllowance;
    const effectiveMortgageCost = incursERC 
        ? interestRate + (profile.mortgage.ercPercent || 0) 
        : interestRate;

    const isBetterToInvest = expectedInvestmentReturn > effectiveMortgageCost;

    opportunities.push({
      id: 'mortgage_overpay_vs_invest',
      category: 'Decumulation & SWR',
      title: 'Mortgage Overpayment vs Investment Arbitrage',
      impactLevel: 'Medium Impact',
      status: isBetterToInvest ? (annualOverpayment > 0 ? 'review_suggested' : 'already_optimised') : (annualOverpayment === 0 ? 'recommended' : 'already_optimised'),
      observation: \`Mortgage interest is \${interestRate}% tax-free.\` + (incursERC ? \` Your planned overpayment of £\${Math.round(annualOverpayment).toLocaleString()} exceeds the \${profile.mortgage.ercThresholdPercent || 10}% penalty-free threshold, triggering an estimated \${profile.mortgage.ercPercent || 0}% Early Repayment Charge (ERC).\` : '') + \` Projected investment returns are ~\${expectedInvestmentReturn}%.\`,
      actionableStep: isBetterToInvest 
        ? \`Consider redirecting \${annualOverpayment > 0 ? 'your mortgage overpayments' : 'surplus cash'} into S&S ISAs or SIPPs where expected tax-free returns (\${expectedInvestmentReturn}%) exceed your mortgage debt cost (\${effectiveMortgageCost}%).\`
        : \`Consider overpaying the mortgage up to the \${profile.mortgage.ercThresholdPercent || 10}% penalty-free allowance. A guaranteed \${interestRate}% tax-free saving outpaces expected investment yields.\`,
      projectedBenefit: isBetterToInvest 
        ? \`Maximizes long-term compound wealth by capturing the positive yield spread between investments and debt cost.\`
        : \`Delivers a guaranteed risk-free return by eliminating debt interest, avoiding market volatility.\`,
      owner: 'Household',
    });`;

c = c.replace(anchor, newCode);
fs.writeFileSync('src/utils/planInsightsEngine.ts', c);
console.log('Successfully injected opportunity.');
