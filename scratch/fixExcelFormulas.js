const fs = require('fs');

let c = fs.readFileSync('src/utils/excelFormulaExporter.ts', 'utf8');

c = c.replace(
  "const remainingShortfallYouFormula = `MAX(0, F${rowNum} - (U${rowNum}))`;",
  "const dynamicCrystYouFormula = `MAX(0, O${rowNum} - (${prevCrystYouRef} + K${rowNum} - M${rowNum})) / 0.75`;\n      const dynamicPclsYouFormula = `(${dynamicCrystYouFormula}) * 0.25`;\n      const baseNetIncomeYouFormula = `Q${rowNum} - S${rowNum} + M${rowNum} + ${dynamicPclsYouFormula}`;\n      const remainingShortfallYouFormula = `MAX(0, F${rowNum} - (${baseNetIncomeYouFormula}))`;"
);

c = c.replace(
  "const remainingShortfallPartnerFormula = isCouple ? `MAX(0, (F${rowNum}/2) - (V${rowNum}))` : '0';",
  "const dynamicCrystPartnerFormula = isCouple ? `MAX(0, P${rowNum} - (${prevCrystPartnerRef} + L${rowNum} - N${rowNum})) / 0.75` : '0';\n      const dynamicPclsPartnerFormula = isCouple ? `(${dynamicCrystPartnerFormula}) * 0.25` : '0';\n      const baseNetIncomePartnerFormula = isCouple ? `R${rowNum} - T${rowNum} + N${rowNum} + ${dynamicPclsPartnerFormula}` : '0';\n      const remainingShortfallPartnerFormula = isCouple ? `MAX(0, (F${rowNum}/2) - (${baseNetIncomePartnerFormula}))` : '0';"
);

c = c.replace(
  "const netIncomeYouFormula = `IF(D${rowNum}=\"Accumulation\", 0, Q${rowNum} - S${rowNum} + M${rowNum})`;",
  "const netIncomeYouFormula = `IF(D${rowNum}=\"Accumulation\", 0, ${baseNetIncomeYouFormula} + (${isaDrawdownYouFormula}) + (${cashDrawdownYouFormula}))`;"
);

c = c.replace(
  "const netIncomePartnerFormula = isCouple ? `IF(D${rowNum}=\"Accumulation\", 0, R${rowNum} - T${rowNum} + N${rowNum})` : '0';",
  "const netIncomePartnerFormula = isCouple ? `IF(D${rowNum}=\"Accumulation\", 0, ${baseNetIncomePartnerFormula} + (${isaDrawdownPartnerFormula}) + (${cashDrawdownPartnerFormula}))` : '0';"
);

c = c.replace(
  "const uncrystPensionBalYouFormula = `MAX(0, (${prevUncrystYouRef} - K${rowNum}) * (1 + 'Settings'!$B$12) + 'Contributions'!G${contribRowNum} + (${pInYou}) + (${pTrInYou}) - (${pTrOutYou}))`;",
  "const uncrystPensionBalYouFormula = `MAX(0, (${prevUncrystYouRef} - K${rowNum} - (${dynamicCrystYouFormula})) * (1 + 'Settings'!$B$12) + 'Contributions'!G${contribRowNum} + (${pInYou}) + (${pTrInYou}) - (${pTrOutYou}))`;"
);

c = c.replace(
  "const uncrystPensionBalPartnerFormula = isCouple ? `MAX(0, (${prevUncrystPartnerRef} - L${rowNum}) * (1 + 'Settings'!$B$12) + 'Contributions'!P${contribRowNum} + (${pInPartner}) + (${pTrInPartner}) - (${pTrOutPartner}))` : '0';",
  "const uncrystPensionBalPartnerFormula = isCouple ? `MAX(0, (${prevUncrystPartnerRef} - L${rowNum} - (${dynamicCrystPartnerFormula})) * (1 + 'Settings'!$B$12) + 'Contributions'!P${contribRowNum} + (${pInPartner}) + (${pTrInPartner}) - (${pTrOutPartner}))` : '0';"
);

fs.writeFileSync('src/utils/excelFormulaExporter.ts', c);
console.log('Fixed formulas!');
