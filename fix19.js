const fs = require('fs');
const file = 'src/utils/maximizedSpendSolver.ts';
let code = fs.readFileSync(file, 'utf8');

const targetRemap = `    evalProfile.dbPensions = (profileInput.dbPensions || []).filter((p) => p.owner === 'partner').map((p) => ({ ...p, owner: 'primary' as const }));
  }`;

const repRemap = `    evalProfile.dbPensions = (profileInput.dbPensions || []).filter((p) => p.owner === 'partner').map((p) => ({ ...p, owner: 'primary' as const }));
    evalProfile.fixedIncomeStreams = (profileInput.fixedIncomeStreams || []).filter((p) => p.owner === 'partner').map((p) => ({ ...p, owner: 'primary' as const }));
    evalProfile.oneOffContributions = (profileInput.oneOffContributions || []).filter((p) => p.owner === 'partner').map((p) => ({ ...p, owner: 'primary' as const }));
    evalProfile.potTransfers = (profileInput.potTransfers || []).filter((p) => p.owner === 'partner').map((p) => ({ ...p, owner: 'primary' as const }));
  }`;

code = code.replace(targetRemap, repRemap);

fs.writeFileSync(file, code);
console.log('Issue 19 fixed: partner fixed income and contributions remapped in MaxSpend solver');
