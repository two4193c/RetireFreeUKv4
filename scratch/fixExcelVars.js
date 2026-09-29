const fs = require('fs');
let c = fs.readFileSync('src/utils/excelFormulaExporter.ts', 'utf8');

const oldLines = `    const netIncomeYouFormula = \`IF(D\${rowNum}="Accumulation", 0, \${baseNetIncomeYouFormula} + (\${isaDrawdownYouFormula}) + (\${cashDrawdownYouFormula}))\`;
    const netIncomePartnerFormula = isCouple ? \`IF(D\${rowNum}="Accumulation", 0, \${baseNetIncomePartnerFormula} + (\${isaDrawdownPartnerFormula}) + (\${cashDrawdownPartnerFormula}))\` : '0';
    const householdNetIncomeFormula = \`U\${rowNum} + V\${rowNum}\`;`;

if (c.includes(oldLines)) {
  c = c.replace(oldLines, '');

  const targetLine = `    let cashDrawdownPartnerFormula = isCouple ? \`IF(D\${rowNum}="Accumulation", 0, MIN(MAX(0, \${prevCashPartnerRef}), MAX(0, \${remainingShortfallPartnerFormula} - MIN(MAX(0, \${prevIsaPartnerRef}), \${remainingShortfallPartnerFormula}))))\` : '0';`;
  
  c = c.replace(targetLine, `${targetLine}\n\n${oldLines}`);
  
  fs.writeFileSync('src/utils/excelFormulaExporter.ts', c);
  console.log('Fixed variable ordering in excelFormulaExporter.ts');
} else {
  console.log('Could not find old lines.');
}
