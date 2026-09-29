const fs = require('fs');
let c = fs.readFileSync('src/utils/excelFormulaExporter.ts', 'utf8');

c = c.replace(
  '    const netIncomeYouFormula = `IF(D${rowNum}="Accumulation", 0, ${baseNetIncomeYouFormula} + (${isaDrawdownYouFormula}) + (${cashDrawdownYouFormula}))`;\n    const netIncomePartnerFormula = isCouple ? `IF(D${rowNum}="Accumulation", 0, ${baseNetIncomePartnerFormula} + (${isaDrawdownPartnerFormula}) + (${cashDrawdownPartnerFormula}))` : \'0\';\n    const householdNetIncomeFormula = `U${rowNum} + V${rowNum}`;\n',
  ''
);

const target = 'let cashDrawdownPartnerFormula = isCouple ? `IF(D${rowNum}="Accumulation", 0, MIN(MAX(0, ${prevCashPartnerRef}), MAX(0, ${remainingShortfallPartnerFormula} - MIN(MAX(0, ${prevIsaPartnerRef}), ${remainingShortfallPartnerFormula}))))` : \'0\';';

c = c.replace(target, target + '\n\n    const netIncomeYouFormula = `IF(D${rowNum}="Accumulation", 0, ${baseNetIncomeYouFormula} + (${isaDrawdownYouFormula}) + (${cashDrawdownYouFormula}))`;\n    const netIncomePartnerFormula = isCouple ? `IF(D${rowNum}="Accumulation", 0, ${baseNetIncomePartnerFormula} + (${isaDrawdownPartnerFormula}) + (${cashDrawdownPartnerFormula}))` : \'0\';\n    const householdNetIncomeFormula = `U${rowNum} + V${rowNum}`;');

fs.writeFileSync('src/utils/excelFormulaExporter.ts', c);
console.log('Fixed variable ordering!');
