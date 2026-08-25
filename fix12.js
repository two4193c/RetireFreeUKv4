const fs = require('fs');
const file = 'src/utils/historicModelingEngine.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'const pensionReturnRate = Math.max(-0.05, blendedGrossReturnRate - pensionFeePercent);',
  'const pensionReturnRate = blendedGrossReturnRate - pensionFeePercent;'
);
code = code.replace(
  'const isaReturnRate = Math.max(-0.05, blendedGrossReturnRate - isaFeePercent);',
  'const isaReturnRate = blendedGrossReturnRate - isaFeePercent;'
);
code = code.replace(
  'const cashGiaReturnRate = Math.max(-0.05, cashGiaGrossReturnRate - giaFeePercent);',
  'const cashGiaReturnRate = cashGiaGrossReturnRate - giaFeePercent;'
);

fs.writeFileSync(file, code);
console.log('Issue 12 fixed: removed -5% loss floor');
