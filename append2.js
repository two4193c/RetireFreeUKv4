const fs = require('fs');
const kitchen = fs.readFileSync('src/utils/__tests__/kitchenSink.test.ts', 'utf8');
const lines = kitchen.split('\n');
const tests = lines.slice(5, -2).join('\n'); // skip imports and describe
let proj = fs.readFileSync('src/utils/__tests__/projectionEngine.test.ts', 'utf8');
proj = proj.trim().replace(/}\);\s*$/, tests + '\n});\n');
fs.writeFileSync('src/utils/__tests__/projectionEngine.test.ts', proj);
console.log('Appended kitchenSink successfully');
