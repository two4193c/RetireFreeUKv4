const fs = require('fs');
const file = 'src/utils/historicModelingEngine.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Primary Annuity
code = code.replace(
  /historicAnnuityStreams\.push\(\{\s*baseNominal,\s*isInflationLinked: \(profile\.annuityType \|\| ''\)\.includes\('inflation_linked'\),\s*durationOption: profile\.annuityDurationOption \|\| 'lifetime',\s*durationUntilAge: profile\.annuityDurationUntilAge \|\| 75,\s*owner: 'primary',\s*purchaseInflationFactor: cumulativeInflationFactor,\s*\}\);/,
  `const parseAnnuityTypeConfig = (typeStr = '') => {
          const isInflationLinked = typeStr.includes('inflation_linked');
          let fixedEscalationRate = undefined;
          if (typeStr.includes('_3')) fixedEscalationRate = 0.03;
          else if (typeStr.includes('_5')) fixedEscalationRate = 0.05;
          return { isInflationLinked, fixedEscalationRate };
        };
        const cfgPrimary = parseAnnuityTypeConfig(profile.annuityType);
        historicAnnuityStreams.push({
          baseNominal,
          isInflationLinked: cfgPrimary.isInflationLinked,
          fixedEscalationRate: cfgPrimary.fixedEscalationRate,
          durationOption: profile.annuityDurationOption || 'lifetime',
          durationUntilAge: profile.annuityDurationUntilAge || 75,
          owner: 'primary',
          purchaseInflationFactor: cumulativeInflationFactor,
          purchaseYearOffset: yr,
        });`
);

// 2. Partner Annuity
code = code.replace(
  /historicAnnuityStreams\.push\(\{\s*baseNominal,\s*isInflationLinked: \(profile\.partnerAnnuityType \|\| ''\)\.includes\('inflation_linked'\),\s*durationOption: profile\.partnerAnnuityDurationOption \|\| 'lifetime',\s*durationUntilAge: profile\.partnerAnnuityDurationUntilAge \|\| 75,\s*owner: 'partner',\s*purchaseInflationFactor: cumulativeInflationFactor,\s*\}\);/,
  `const cfgPartner = parseAnnuityTypeConfig(profile.partnerAnnuityType || profile.annuityType);
        historicAnnuityStreams.push({
          baseNominal,
          isInflationLinked: cfgPartner.isInflationLinked,
          fixedEscalationRate: cfgPartner.fixedEscalationRate,
          durationOption: profile.partnerAnnuityDurationOption || 'lifetime',
          durationUntilAge: profile.partnerAnnuityDurationUntilAge || 75,
          owner: 'partner',
          purchaseInflationFactor: cumulativeInflationFactor,
          purchaseYearOffset: yr,
        });`
);

// 3. Evaluation
code = code.replace(
  /const streamNominal = stream\.isInflationLinked\s*\?\s*stream\.baseNominal \* \(cumulativeInflationFactor \/ \(stream\.purchaseInflationFactor \|\| 1\)\)\s*:\s*stream\.baseNominal;/,
  `let streamNominal = stream.baseNominal;
        if (stream.isInflationLinked) {
          streamNominal = stream.baseNominal * (cumulativeInflationFactor / (stream.purchaseInflationFactor || 1));
        } else if (stream.fixedEscalationRate) {
          const yearsSincePurchase = Math.max(0, yr - (stream.purchaseYearOffset || 0));
          streamNominal = stream.baseNominal * Math.pow(1 + stream.fixedEscalationRate, yearsSincePurchase);
        }`
);

fs.writeFileSync(file, code);
