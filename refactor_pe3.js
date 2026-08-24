const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\projectionEngine.ts');
let code = fs.readFileSync(file, 'utf8');
const startStr = "let explicitPriPensionDraw = -1;";
const endStr = "// Calculate Total Taxable Income & Comprehensive Income Tax Liability in Retirement (Annuity, State, DB, & Pension Drawdown)";
console.log({
  startIdx: code.indexOf(startStr),
  endIdx: code.indexOf(endStr)
});
