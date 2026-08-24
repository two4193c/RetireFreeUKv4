const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\projectionEngine.ts');
let code = fs.readFileSync(file, 'utf8');

const startIdx = code.indexOf("const getGrossPensionNeededForNet = (");
const endIdx = code.indexOf("// Partner Mortality", startIdx);

console.log({startIdx, endIdx});
