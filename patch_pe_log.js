const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\projectionEngine.ts');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "isaDrawdown += amount;",
  "isaDrawdown += amount; if (age === 60) console.log('executeDeduct isa called with amount:', amount, 'new isaDrawdown:', isaDrawdown);"
);
fs.writeFileSync(file, code);
console.log('done patching projectionEngine to log executeDeduct');
