const fs = require('fs');
let c = fs.readFileSync('src/utils/excelFormulaExporter.ts', 'utf8');

const target1 = `    const netIncomeYouFormula = \`IF(D\${rowNum}="Accumulation", 0, \${baseNetIncomeYouFormula} + (\${isaDrawdownYouFormula}) + (\${cashDrawdownYouFormula}))\`;
    const netIncomePartnerFormula = isCouple ? \`IF(D\${rowNum}="Accumulation", 0, \${baseNetIncomePartnerFormula} + (\${isaDrawdownPartnerFormula}) + (\${cashDrawdownPartnerFormula}))\` : '0';
    const householdNetIncomeFormula = \`U\${rowNum} + V\${rowNum}\`;`;

// Find all indexes of this block
let startIndex = 0, index, indices = [];
while ((index = c.indexOf(target1, startIndex)) > -1) {
    indices.push(index);
    startIndex = index + target1.length;
}

console.log("Found occurrences:", indices.length);

if (indices.length > 1) {
    // Keep only the last one!
    // We will slice the string and remove the first occurrence.
    const firstOcc = indices[0];
    c = c.substring(0, firstOcc) + c.substring(firstOcc + target1.length);
    fs.writeFileSync('src/utils/excelFormulaExporter.ts', c);
    console.log("Removed the first occurrence!");
}

