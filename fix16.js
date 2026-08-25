const fs = require('fs');
const file = 'src/utils/historicModelingEngine.ts';
let code = fs.readFileSync(file, 'utf8');

// Fix primary phased crystallisation - remove maxGrossForLsa from grossCrystallised
code = code.replace(
  `          const remainingLsa = Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn);
          const maxGrossForLsa = pclsPct > 0 ? Math.floor(remainingLsa / pclsPct) : primaryUncrystallisedPot;
          const grossCrystallised = Math.min(primaryUncrystallisedPot, tranche.amount, maxGrossForLsa);`,
  `          const remainingLsa = Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn);
          const grossCrystallised = Math.min(primaryUncrystallisedPot, tranche.amount);`
);

// Fix partner phased crystallisation
code = code.replace(
  `          const remainingLsa = Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn);
          const maxGrossForLsa = pclsPct > 0 ? Math.floor(remainingLsa / pclsPct) : partnerUncrystallisedPot;
          const grossCrystallised = Math.min(partnerUncrystallisedPot, tranche.amount, maxGrossForLsa);`,
  `          const remainingLsa = Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn);
          const grossCrystallised = Math.min(partnerUncrystallisedPot, tranche.amount);`
);

fs.writeFileSync(file, code);
console.log('Issue 16 fixed: LSA exhaustion no longer blocks crystallisation');
