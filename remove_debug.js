const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\projectionEngine.ts');
let code = fs.readFileSync(file, 'utf8');
code = code.replace("const netDraw = approximateNetFromGrossForOwner(draw, owner); if (age === 60) console.log('DEBUG PENSION DEDUCT:', {draw, netDraw, remaining});", "const netDraw = approximateNetFromGrossForOwner(draw, owner);");
code = code.replace("const netDraw = approximateNetFromGrossForOwner(draw, owner);\n             if (age === 60) console.log('DEBUG PENSION DEDUCT:', {draw, netDraw, remaining});", "const netDraw = approximateNetFromGrossForOwner(draw, owner);");
fs.writeFileSync(file, code);
console.log('done removing last debug');
