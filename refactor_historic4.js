const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\historicModelingEngine.ts');
let code = fs.readFileSync(file, 'utf8');

const executeDeductStr = "const executeDeduct = (potType: 'pension' | 'isa' | 'cashGia', amount: number, owner?: 'primary' | 'partner') => {";
const executeDeductStart = code.indexOf(executeDeductStr);

const endStr = "// 2. Apply growth to the remaining pot balances (fixing phantom growth)";
const endIdx = code.indexOf(endStr);

const replacement = fs.readFileSync('scratch_replace.txt', 'utf8');

let newCode = code.substring(0, executeDeductStart) + replacement + code.substring(endIdx);
fs.writeFileSync(file, newCode);
console.log('done');
