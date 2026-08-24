const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\projectionEngine.ts');
let code = fs.readFileSync(file, 'utf8');

const startStr = "let pensionDrawdown = 0;";
const endStr = "// Calculate Total Taxable Income & Comprehensive Income Tax Liability in Retirement (Annuity, State, DB, & Pension Drawdown)";

const startIdx = code.indexOf(startStr);
const endIdx = code.indexOf(endStr);

const replacement = fs.readFileSync('scratch_replace_pe.txt', 'utf8');

let newCode = code.substring(0, startIdx) + replacement + "\n      " + code.substring(endIdx);
fs.writeFileSync(file, newCode);
console.log('done projectionEngine');
