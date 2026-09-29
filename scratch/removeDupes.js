const fs = require('fs');
let c = fs.readFileSync('src/utils/excelFormulaExporter.ts', 'utf8');

const target = `    const netIncomeYouFormula = \`IF(D\${rowNum}="Accumulation", 0, \${baseNetIncomeYouFormula} + (\${isaDrawdownYouFormula}) + (\${cashDrawdownYouFormula}))\`;
    const netIncomePartnerFormula = isCouple ? \`IF(D\${rowNum}="Accumulation", 0, \${baseNetIncomePartnerFormula} + (\${isaDrawdownPartnerFormula}) + (\${cashDrawdownPartnerFormula}))\` : '0';
    const householdNetIncomeFormula = \`U\${rowNum} + V\${rowNum}\`;`;

c = c.replace(target, '');

fs.writeFileSync('src/utils/excelFormulaExporter.ts', c);
console.log('Removed duplicate block');
