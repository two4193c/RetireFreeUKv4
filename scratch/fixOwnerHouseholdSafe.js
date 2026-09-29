const fs = require('fs');
let c = fs.readFileSync('src/utils/planInsightsEngine.ts', 'utf8');

const helpers = [
  'evaluateTaxTrap',
  'evaluateSalarySacrifice',
  'evaluateStatePensionGap'
];

helpers.forEach(h => {
  const start = c.indexOf(`const ${h} =`);
  if (start !== -1) {
    let nextHelper = c.length;
    helpers.forEach(h2 => {
      if (h !== h2) {
        const idx = c.indexOf(`const ${h2} =`, start + 1);
        if (idx !== -1 && idx < nextHelper) nextHelper = idx;
      }
    });
    const opp4 = c.indexOf('// Opportunity 4:');
    if (opp4 !== -1 && opp4 < nextHelper) nextHelper = opp4;

    const block = c.substring(start, nextHelper);
    const newBlock = block.replace(/owner:\s*'Household',/g, "owner: ownerPrefix === 'primary' ? 'Primary' : 'Partner',");
    c = c.substring(0, start) + newBlock + c.substring(nextHelper);
  }
});

fs.writeFileSync('src/utils/planInsightsEngine.ts', c);
console.log('Done');
