const fs = require('fs');
const file = 'src/utils/historicModelingEngine.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  "addProRata('cashGia', surplus * (1 + (pensionReturnRate * 0.95) / 2), false);",
  "addProRata('cashGia', surplus * (1 + cashGiaReturnRate / 2), false);"
);

fs.writeFileSync(file, code);
console.log('Issue 22 fixed: GIA reinvestment uses correct return rate');
