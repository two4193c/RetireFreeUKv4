const fs = require('fs');

const file = 'src/utils/__tests__/ukTaxEngine.test.ts';
let content = fs.readFileSync(file, 'utf8');

const newImports = `
  calculateCapitalGainsTax,
  calculateDividendTax,
  calculateUKStampDuty,
  calculatePSAAndSavingsTax,
  calculatePartnerUKTax,
  allocateLumpSumToPots,
`;

let lines = content.split('\n');
let modifiedLines = [];

for (let i = 0; i < lines.length; i++) {
  modifiedLines.push(lines[i]);
  if (lines[i].includes('aggregateIncome,')) {
    modifiedLines.push(newImports);
  }
}

let newTests = fs.readFileSync('newTests.ts', 'utf8');

fs.writeFileSync(file, modifiedLines.join('\n') + '\n' + newTests);
