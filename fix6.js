const fs = require('fs');
const file = 'src/utils/historicModelingEngine.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  'isInflationLinked: boolean;',
  'isInflationLinked: boolean;\n      fixedEscalationRate?: number;\n      purchaseYearOffset: number;'
);

const pTarget = `        historicAnnuityStreams.push({
          baseNominal,
          isInflationLinked: (profile.annuityType || '').includes('inflation_linked'),
          durationOption: profile.annuityDurationOption || 'lifetime',
          durationUntilAge: profile.annuityDurationUntilAge || 75,
          owner: 'primary',
          purchaseInflationFactor: cumulativeInflationFactor,
        });`;

const pRep = `        const parseAnnuityTypeConfig = (typeStr = '') => {
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
        });`;

code = code.replace(pTarget, pRep);

const partTarget = `        historicAnnuityStreams.push({
          baseNominal,
          isInflationLinked: (profile.partnerAnnuityType || '').includes('inflation_linked'),
          durationOption: profile.partnerAnnuityDurationOption || 'lifetime',
          durationUntilAge: profile.partnerAnnuityDurationUntilAge || 75,
          owner: 'partner',
          purchaseInflationFactor: cumulativeInflationFactor,
        });`;

const partRep = `        const cfgPartner = parseAnnuityTypeConfig(profile.partnerAnnuityType || profile.annuityType);
        historicAnnuityStreams.push({
          baseNominal,
          isInflationLinked: cfgPartner.isInflationLinked,
          fixedEscalationRate: cfgPartner.fixedEscalationRate,
          durationOption: profile.partnerAnnuityDurationOption || 'lifetime',
          durationUntilAge: profile.partnerAnnuityDurationUntilAge || 75,
          owner: 'partner',
          purchaseInflationFactor: cumulativeInflationFactor,
          purchaseYearOffset: yr,
        });`;

code = code.replace(partTarget, partRep);

const evalT = `        const streamNominal = stream.isInflationLinked
          ? stream.baseNominal * (cumulativeInflationFactor / (stream.purchaseInflationFactor || 1))
          : stream.baseNominal;`;

const evalR = `        let streamNominal = stream.baseNominal;
        if (stream.isInflationLinked) {
          streamNominal = stream.baseNominal * (cumulativeInflationFactor / (stream.purchaseInflationFactor || 1));
        } else if (stream.fixedEscalationRate) {
          const yearsSincePurchase = Math.max(0, yr - (stream.purchaseYearOffset || 0));
          streamNominal = stream.baseNominal * Math.pow(1 + stream.fixedEscalationRate, yearsSincePurchase);
        }`;

code = code.replace(evalT, evalR);

fs.writeFileSync(file, code);
