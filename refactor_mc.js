const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\monteCarloEngine.ts');
let code = fs.readFileSync(file, 'utf8');

const startStr = "const getNetFromSpecificDraws = (priG: number, partG: number) => {";
const startIdx = code.indexOf(startStr);

const endStr = "// 2. Apply growth to the remaining pot balances (fixing phantom growth)";
const endIdx = code.indexOf(endStr);

console.log({startIdx, endIdx});
