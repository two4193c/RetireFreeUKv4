const fs = require('fs');
let lines = fs.readFileSync('src/utils/excelFormulaExporter.ts', 'utf8').split(/\r?\n/);

// Remove lines 2346 to 2348 (0-indexed 2347 to 2349)
lines.splice(2346, 3);

fs.writeFileSync('src/utils/excelFormulaExporter.ts', lines.join('\n'));
console.log('Removed lines 2347-2349');
