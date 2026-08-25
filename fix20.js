const fs = require('fs');
const file = 'src/utils/taxOptimizerSolver.ts';
let code = fs.readFileSync(file, 'utf8');

const targetSearch = `    let high = Math.min(totalCombinedPension, remShortfall * 2.5);`;
const repSearch = `    // Increase binary search upper bound to handle Scottish PA taper zone with Advanced Rate (67.5% effective)
    let high = Math.min(totalCombinedPension, remShortfall * 4.0);`;

code = code.replace(targetSearch, repSearch);

fs.writeFileSync(file, code);
console.log('Issue 20 fixed: Tax optimizer search bound increased');
