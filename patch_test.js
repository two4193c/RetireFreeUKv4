const fs = require('fs');
const path = require('path');
const file = path.join('C:\\Users\\two41\\.gemini\\antigravity\\scratch\\RetireFreeUKv4\\src\\utils\\__tests__\\projectionEngine.test.ts');
let code = fs.readFileSync(file, 'utf8');

code = code.replace("expect(isaDrawdown).toBeGreaterThan(0);", "console.log('TEST DATA:', {isaDrawdown, startingIsa, actual: row60.primaryStocksAndSharesIsaPot, expected: startingIsa - isaDrawdown}); expect(isaDrawdown).toBeGreaterThan(0);");
fs.writeFileSync(file, code);
console.log('done patching test');
