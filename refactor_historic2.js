const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\historicModelingEngine.ts');
let code = fs.readFileSync(file, 'utf8');

const endStr = "// 2. Apply growth to the remaining pot balances (fixing phantom growth)";
const endIdx = code.indexOf(endStr);
console.log({endIdx});
