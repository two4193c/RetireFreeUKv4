const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\__tests__\\sankeyEngine.test.ts');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "expect(nodeIds).toContain('pri_pension_dd');",
  "expect(nodeIds).toContain('part_pension_dd');"
);
code = code.replace(
  "const data = computeCashFlowSankeyData(profile, pots, projections, 65, 'split'); console.log('ROW65:', projections.find(r => r.age === 65));",
  "const data = computeCashFlowSankeyData(profile, pots, projections, 65, 'split');"
);
fs.writeFileSync(file, code);
console.log('done updating sankeyEngine test');
