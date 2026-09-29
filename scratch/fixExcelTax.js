const fs = require('fs');
let c = fs.readFileSync('src/utils/excelFormulaExporter.ts', 'utf8');

c = c.replace(
  "const taxPaidYouFormula = `IF(Q${rowNum}>'Settings'!$B$5, MAX(0, MIN(Q${rowNum}-'Settings'!$B$5, 'Settings'!$B$6-'Settings'!$B$5)*0.20) + MAX(0, MIN(Q${rowNum}-'Settings'!$B$6, 'Settings'!$B$7-'Settings'!$B$6))*0.40 + MAX(0, Q${rowNum}-'Settings'!$B$7)*0.45, 0)`;",
  "const paYou = `MAX(0, 'Settings'!$B$5 - MAX(0, (Q${rowNum} - 100000)/2))`;\n      const taxPaidYouFormula = `IF(Q${rowNum}>${paYou}, MAX(0, MIN(Q${rowNum}-${paYou}, 'Settings'!$B$6-${paYou})*0.20) + MAX(0, MIN(Q${rowNum}-'Settings'!$B$6, 'Settings'!$B$7-'Settings'!$B$6))*0.40 + MAX(0, Q${rowNum}-'Settings'!$B$7)*0.45, 0)`;"
);

c = c.replace(
  "const taxPaidPartnerFormula = isCouple ? `IF(R${rowNum}>'Settings'!$B$5, MAX(0, MIN(R${rowNum}-'Settings'!$B$5, 'Settings'!$B$6-'Settings'!$B$5)*0.20) + MAX(0, MIN(R${rowNum}-'Settings'!$B$6, 'Settings'!$B$7-'Settings'!$B$6))*0.40 + MAX(0, R${rowNum}-'Settings'!$B$7)*0.45, 0)` : '0';",
  "const paPartner = `MAX(0, 'Settings'!$B$5 - MAX(0, (R${rowNum} - 100000)/2))`;\n      const taxPaidPartnerFormula = isCouple ? `IF(R${rowNum}>${paPartner}, MAX(0, MIN(R${rowNum}-${paPartner}, 'Settings'!$B$6-${paPartner})*0.20) + MAX(0, MIN(R${rowNum}-'Settings'!$B$6, 'Settings'!$B$7-'Settings'!$B$6))*0.40 + MAX(0, R${rowNum}-'Settings'!$B$7)*0.45, 0)` : '0';"
);

fs.writeFileSync('src/utils/excelFormulaExporter.ts', c);
console.log('Fixed Tax Formulas!');
