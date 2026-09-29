const fs = require('fs');
let c = fs.readFileSync('src/components/MortgageArbitrageInsight.tsx', 'utf8');

c = c.replace(
  `{years}-Year Trajectory of {isHypothetical ? 'a Hypothetical £500/mo' : \`Your £\${monthlySurplus}/mo\`} Surplus`,
  `{years}-Year Trajectory of {isHypothetical ? 'a Hypothetical £500/mo' : (monthlySurplus > 0 ? \`Your £\${monthlySurplus}/mo\` : 'Your Lump Sum')} Surplus`
);

fs.writeFileSync('src/components/MortgageArbitrageInsight.tsx', c);
console.log('Fixed chart title');
