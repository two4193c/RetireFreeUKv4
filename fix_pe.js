const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\projectionEngine.ts');
let code = fs.readFileSync(file, 'utf8');
code = code.replace("maxGrossForBracket = crystPot + (room / 0.75); // rough proxy", "maxGrossForBracket = room / 0.75;");
code = code.replace("maxGrossForBracket = crystPot + room + remLsa;", "maxGrossForBracket = room + remLsa;");
fs.writeFileSync(file, code);
console.log('done fixing maxGrossForBracket');
