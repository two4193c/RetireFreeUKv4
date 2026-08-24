const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\monteCarloEngine.ts');
let code = fs.readFileSync(file, 'utf8');
code = code.replace("// Partner Mortality Inheritance", "} // Partner Mortality Inheritance");
fs.writeFileSync(file, code);
