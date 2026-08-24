const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\monteCarloEngine.ts');
let code = fs.readFileSync(file, 'utf8');

const targetStr = "const executeStrategyForOwner = (strategy: string, owner: 'primary' | 'partner', targetNetNeeded: number): number => {";

code = code.replace(targetStr, "const isCashBufferActiveYr = useCashBuf && marketScenario === 'early_crash' && age >= crashStartAge && age < (crashStartAge + cashBufYears);\n\n        " + targetStr);
fs.writeFileSync(file, code);
console.log('done fixing isCashBufferActiveYr');
