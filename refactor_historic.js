const fs = require('fs');
const path = require('path');

const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\historicModelingEngine.ts');
let code = fs.readFileSync(file, 'utf8');

const stratStartStr = "const strategy = profile.drawdownStrategy || 'isa_first';";
const stratStart = code.indexOf(stratStartStr);
if (stratStart === -1) throw new Error('Could not find start');

const executeDeductStr = "const executeDeduct = (potType: 'pension' | 'isa' | 'cashGia', amount: number, owner?: 'primary' | 'partner') => {";
const executeDeductStart = code.indexOf(executeDeductStr);

const approxStart = code.indexOf("const approximateNetFromGross = (grossDraw: number): number => {");
const getGrossStart = code.indexOf("const getGrossPensionNeededForNet = (netNeeded: number, potAvailable: number): number => {");

console.log({
  executeDeductStart,
  approxStart,
  getGrossStart,
  stratStart
});
