const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\projectionEngine.ts');
let code = fs.readFileSync(file, 'utf8');
const endIdx = code.indexOf("// Calculate Total Taxable Income");
console.log(code.substring(endIdx).indexOf("isReinvestExcess"));
