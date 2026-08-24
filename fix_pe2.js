const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\projectionEngine.ts');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "const targetGross = Math.min(hasAccess ? pPot : 0, maxGrossForBracket);\n\n            if (targetGross > 0) {\n               executePensionDeduct(targetGross);\n            }",
  "let targetGross = Math.min(hasAccess ? pPot : 0, maxGrossForBracket);\n            if (targetGross > 0) {\n               const maxNet = approximateNetFromGrossForOwner(targetGross, owner);\n               if (maxNet > remaining) targetGross = getGrossPensionNeededForNetForOwner(remaining, pPot, owner);\n               executePensionDeduct(targetGross);\n            }"
);

fs.writeFileSync(file, code);
console.log('done fixing overdraw');
