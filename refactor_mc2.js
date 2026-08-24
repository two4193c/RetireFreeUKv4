const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\monteCarloEngine.ts');
let code = fs.readFileSync(file, 'utf8');

const deductProRataIdx = code.indexOf("const deductProRata =");
console.log(code.substring(deductProRataIdx, deductProRataIdx + 1500));
