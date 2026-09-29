const fs = require('fs');
let c = fs.readFileSync('src/utils/excelFormulaExporter.ts', 'utf8');

const topBlock = `    const netIncomeYouFormula = \`IF(D\${rowNum}="Accumulation", 0, \${baseNetIncomeYouFormula} + (\${isaDrawdownYouFormula}) + (\${cashDrawdownYouFormula}))\`;
    const netIncomePartnerFormula = isCouple ? \`IF(D\${rowNum}="Accumulation", 0, \${baseNetIncomePartnerFormula} + (\${isaDrawdownPartnerFormula}) + (\${cashDrawdownPartnerFormula}))\` : '0';
    const householdNetIncomeFormula = \`U\${rowNum} + V\${rowNum}\`;`;

c = c.replace(topBlock, '');

const afterCashDrawdown = `let cashDrawdownPartnerFormula = isCouple ? \`IF(D\${rowNum}="Accumulation", 0, MIN(MAX(0, \${prevCashPartnerRef}), MAX(0, \${remainingShortfallPartnerFormula} - MIN(MAX(0, \${prevIsaPartnerRef}), \${remainingShortfallPartnerFormula}))))\` : '0';`;

const finalInject = `${afterCashDrawdown}

    const netIncomeYouFormula = \`IF(D\${rowNum}="Accumulation", 0, \${baseNetIncomeYouFormula} + (\${isaDrawdownYouFormula}) + (\${cashDrawdownYouFormula}))\`;
    const netIncomePartnerFormula = isCouple ? \`IF(D\${rowNum}="Accumulation", 0, \${baseNetIncomePartnerFormula} + (\${isaDrawdownPartnerFormula}) + (\${cashDrawdownPartnerFormula}))\` : '0';
    const householdNetIncomeFormula = \`U\${rowNum} + V\${rowNum}\`;`;

c = c.replace(afterCashDrawdown, finalInject);

fs.writeFileSync('src/utils/excelFormulaExporter.ts', c);
console.log('Fixed exactly!');
