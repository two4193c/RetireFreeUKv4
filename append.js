const fs = require('fs');
const missing = fs.readFileSync('src/utils/__tests__/missingAreas.test.ts', 'utf8');
const lines = missing.split('\n');
const tests = lines.slice(6, -2).join('\n');
let proj = fs.readFileSync('src/utils/__tests__/projectionEngine.test.ts', 'utf8');
proj = proj.trim().replace(/}\);\s*$/, tests + '\n});\n');
fs.writeFileSync('src/utils/__tests__/projectionEngine.test.ts', proj);
console.log('Appended successfully');
