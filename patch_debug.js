const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\__tests__\\projectionEngine.test.ts');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "expect(row60!.primaryStocksAndSharesIsaPot).toBeCloseTo(startingIsa - isaDrawdown, 1);",
  "console.log('DEBUG NET:', {approximateNet: row60.priAchieved}); expect(row60!.primaryStocksAndSharesIsaPot).toBeCloseTo(startingIsa - isaDrawdown, 1);"
);
fs.writeFileSync(file, code);
console.log('done patching to debug net');
