const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\projectionEngine.ts');
let code = fs.readFileSync(file, 'utf8');

let pos = code.indexOf("let explicitPriPensionDraw = -1;");
while(pos !== -1) {
  console.log(pos);
  pos = code.indexOf("let explicitPriPensionDraw = -1;", pos + 1);
}
