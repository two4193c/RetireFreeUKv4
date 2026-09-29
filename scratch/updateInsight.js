const fs = require('fs');

let c = fs.readFileSync('src/components/MortgageArbitrageInsight.tsx', 'utf8');

const targetLogic = `  // 10-Year £10,000 projection for chart
  const initialCapital = 10000;
  const overpaySavings = initialCapital * Math.pow(1 + effectiveMortgageCost / 100, 10) - initialCapital;
  const investGrowth = initialCapital * Math.pow(1 + expectedInvestmentReturn / 100, 10) - initialCapital;`;

const newLogic = `  // 10-Year projection based on actual overpayment (fallback to £500/mo if none planned)
  const isHypothetical = (mortgage.regularMonthlyOverpayment || 0) === 0;
  const monthlySurplus = isHypothetical ? 500 : mortgage.regularMonthlyOverpayment;
  const years = 10;
  const months = years * 12;

  // Future Value of a series of monthly payments
  // Formula: PMT * (((1 + r)^n - 1) / r)
  const rMort = (effectiveMortgageCost / 100) / 12;
  const rInv = (expectedInvestmentReturn / 100) / 12;

  const totalPrincipal = monthlySurplus * months;

  const overpayFV = rMort === 0 ? totalPrincipal : monthlySurplus * ((Math.pow(1 + rMort, months) - 1) / rMort);
  const overpaySavings = overpayFV - totalPrincipal;

  const investFV = rInv === 0 ? totalPrincipal : monthlySurplus * ((Math.pow(1 + rInv, months) - 1) / rInv);
  const investGrowth = investFV - totalPrincipal;`;

c = c.replace(targetLogic, newLogic);

const targetHeader = `            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-4 text-center">
              10-Year Impact of A10,000 Surplus
            </h4>`;

const newHeader = `            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-4 text-center">
              10-Year Impact of {isHypothetical ? 'a Hypothetical £500/mo' : \`Your £\${monthlySurplus}/mo\`} Surplus
            </h4>`;

// We might need to handle the encoding issue (A) gracefully. Let's just use regex.
c = c.replace(/<h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-4 text-center">[\s\S]*?<\/h4>/, newHeader);

fs.writeFileSync('src/components/MortgageArbitrageInsight.tsx', c);
console.log('Updated to use actual figures.');
