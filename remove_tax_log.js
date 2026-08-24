const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\projectionEngine.ts');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "if (age===60) console.log('APPROX TAX:', {grossDraw, taxFree, taxableDrawdown, guaranteedTaxable, totalTaxable, totalTax, baseTax, marginalTax, net: grossDraw - marginalTax}); return grossDraw - marginalTax;",
  "return grossDraw - marginalTax;"
);
fs.writeFileSync(file, code);
console.log('done removing tax log');
