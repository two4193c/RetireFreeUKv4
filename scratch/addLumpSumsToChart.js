const fs = require('fs');
let c = fs.readFileSync('src/components/MortgageArbitrageInsight.tsx', 'utf8');

const targetBlock = `  // Multi-year projection based on actual overpayment
  const isHypothetical = (mortgage.regularMonthlyOverpayment || 0) === 0;
  const monthlySurplus = isHypothetical ? 500 : mortgage.regularMonthlyOverpayment;
  
  // Base timeframe on mortgage term (max 25 years to keep chart readable)
  const mortgageYears = mortgage.remainingTermYears || 10;
  const years = Math.min(25, Math.max(5, mortgageYears));

  const rMort = (effectiveMortgageCost / 100) / 12;
  const rConfig = (expectedInvestmentReturn / 100) / 12;
  const rLow = (Math.max(1, expectedInvestmentReturn - 3) / 100) / 12;
  const rHigh = ((expectedInvestmentReturn + 3) / 100) / 12;

  const chartData = [];
  for(let y = 0; y <= years; y++) {
    const m = y * 12;
    const totalPrincipal = monthlySurplus * m;

    const overpayFV = rMort === 0 ? totalPrincipal : monthlySurplus * ((Math.pow(1 + rMort, m) - 1) / rMort);
    const configFV = rConfig === 0 ? totalPrincipal : monthlySurplus * ((Math.pow(1 + rConfig, m) - 1) / rConfig);
    const lowFV = rLow === 0 ? totalPrincipal : monthlySurplus * ((Math.pow(1 + rLow, m) - 1) / rLow);
    const highFV = rHigh === 0 ? totalPrincipal : monthlySurplus * ((Math.pow(1 + rHigh, m) - 1) / rHigh);

    chartData.push({
      year: \`Yr \${y}\`,
      'Overpay (Guaranteed)': Math.round(overpayFV),
      [\`Invest (\${expectedInvestmentReturn}%)\`]: Math.round(configFV),
      [\`Invest (\${Math.max(1, expectedInvestmentReturn - 3)}%)\`]: Math.round(lowFV),
      [\`Invest (\${expectedInvestmentReturn + 3}%)\`]: Math.round(highFV),
    });
  }

  const finalOverpay = chartData[chartData.length - 1]['Overpay (Guaranteed)'];
  const finalInvest = chartData[chartData.length - 1][\`Invest (\${expectedInvestmentReturn}%)\`];
  const difference = Math.abs(finalInvest - finalOverpay);`;

const newBlock = `  // Base timeframe on mortgage term (max 25 years to keep chart readable)
  const mortgageYears = mortgage.remainingTermYears || 10;
  const years = Math.min(25, Math.max(5, mortgageYears));

  const rMort = (effectiveMortgageCost / 100) / 12;
  const rConfig = (expectedInvestmentReturn / 100) / 12;
  const rLow = (Math.max(1, expectedInvestmentReturn - 3) / 100) / 12;
  const rHigh = ((expectedInvestmentReturn + 3) / 100) / 12;

  const lumpSums = mortgage.lumpSumOverpayments || [];
  const hasLumpSumsWithinTerm = lumpSums.some(ls => ls.enabled && ls.age >= profile.currentAge && ls.age <= profile.currentAge + years);
  const isHypothetical = (mortgage.regularMonthlyOverpayment || 0) === 0 && !hasLumpSumsWithinTerm;
  const monthlySurplus = isHypothetical ? 500 : (mortgage.regularMonthlyOverpayment || 0);

  const chartData = [];
  let overpayBal = 0, configBal = 0, lowBal = 0, highBal = 0;

  // Starting year 0
  chartData.push({
    year: \`Yr 0\`,
    'Overpay (Guaranteed)': 0,
    [\`Invest (\${expectedInvestmentReturn}%)\`]: 0,
    [\`Invest (\${Math.max(1, expectedInvestmentReturn - 3)}%)\`]: 0,
    [\`Invest (\${expectedInvestmentReturn + 3}%)\`]: 0,
  });

  for(let y = 1; y <= years; y++) {
    const currentAge = profile.currentAge + y - 1; // Age at the start of this year

    // 1. Compound existing balances for 12 months
    overpayBal = overpayBal * Math.pow(1 + rMort, 12);
    configBal = configBal * Math.pow(1 + rConfig, 12);
    lowBal = lowBal * Math.pow(1 + rLow, 12);
    highBal = highBal * Math.pow(1 + rHigh, 12);

    // 2. Add the future value of the 12 monthly payments made during this year
    if (monthlySurplus > 0) {
      overpayBal += rMort === 0 ? monthlySurplus * 12 : monthlySurplus * ((Math.pow(1 + rMort, 12) - 1) / rMort);
      configBal += rConfig === 0 ? monthlySurplus * 12 : monthlySurplus * ((Math.pow(1 + rConfig, 12) - 1) / rConfig);
      lowBal += rLow === 0 ? monthlySurplus * 12 : monthlySurplus * ((Math.pow(1 + rLow, 12) - 1) / rLow);
      highBal += rHigh === 0 ? monthlySurplus * 12 : monthlySurplus * ((Math.pow(1 + rHigh, 12) - 1) / rHigh);
    }

    // 3. Add any lump sums scheduled for this age (added at end of year for simplicity)
    const yearLumpSums = lumpSums.filter(ls => ls.enabled && ls.age === currentAge).reduce((sum, ls) => sum + ls.amount, 0);
    if (yearLumpSums > 0 && !isHypothetical) {
      overpayBal += yearLumpSums;
      configBal += yearLumpSums;
      lowBal += yearLumpSums;
      highBal += yearLumpSums;
    }

    chartData.push({
      year: \`Yr \${y}\`,
      'Overpay (Guaranteed)': Math.round(overpayBal),
      [\`Invest (\${expectedInvestmentReturn}%)\`]: Math.round(configBal),
      [\`Invest (\${Math.max(1, expectedInvestmentReturn - 3)}%)\`]: Math.round(lowBal),
      [\`Invest (\${expectedInvestmentReturn + 3}%)\`]: Math.round(highBal),
    });
  }

  const finalOverpay = chartData[chartData.length - 1]['Overpay (Guaranteed)'];
  const finalInvest = chartData[chartData.length - 1][\`Invest (\${expectedInvestmentReturn}%)\`];
  const difference = Math.abs(finalInvest - finalOverpay);`;

c = c.replace(targetBlock, newBlock);

fs.writeFileSync('src/components/MortgageArbitrageInsight.tsx', c);
console.log('Updated insight engine to support lump sums!');
