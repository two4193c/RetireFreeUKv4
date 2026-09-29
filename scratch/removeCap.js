const fs = require('fs');

function replaceInFile(path) {
  let c = fs.readFileSync(path, 'utf8');
  c = c.replace(
    'const years = Math.min(25, Math.max(5, mortgageYears));',
    'const years = Math.max(1, mortgageYears);'
  );
  fs.writeFileSync(path, c);
}

replaceInFile('src/components/MortgageArbitrageInsight.tsx');
replaceInFile('src/components/ExportSection.tsx');

console.log('Removed 25-year cap from Arbitrage calculations');
