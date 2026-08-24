const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\projectionEngine.ts');
let code = fs.readFileSync(file, 'utf8');

const stratStartStr = "const strategy = profile.drawdownStrategy || 'isa_first';";
const stratStart = code.indexOf(stratStartStr);
console.log({stratStart});

const approxStart = code.indexOf("const getGrossPensionNeededForNet = (");
const getGrossStart = code.indexOf("const getNetProducedByPensionGross = (");

console.log({
  approxStart,
  getGrossStart
});
