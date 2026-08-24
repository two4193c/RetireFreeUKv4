const fs = require('fs');
const file = 'src/utils/historicModelingEngine.ts';
let code = fs.readFileSync(file, 'utf8');

const setupTarget = `    let cumulativeInflationFactor = 1.0;
    const trajectory: HistoricYearSnapshot[] = [];`;

const setupRep = `    let cumulativeInflationFactor = 1.0;
    let primaryCommencementInflation = 1.0;
    let partnerCommencementInflation = 1.0;
    const trajectory: HistoricYearSnapshot[] = [];`;

code = code.replace(setupTarget, setupRep);

const inflationUpdateTarget = `      const hInf = hData.inflation / 100;
      cumulativeInflationFactor *= (1 + hInf);`;

const inflationUpdateRep = `      const hInf = hData.inflation / 100;
      cumulativeInflationFactor *= (1 + hInf);
      if (age === (profile.statePensionAge || 67)) primaryCommencementInflation = cumulativeInflationFactor;
      if (partnerAge === (profile.partnerStatePensionAge || 67)) partnerCommencementInflation = cumulativeInflationFactor;`;

code = code.replace(inflationUpdateTarget, inflationUpdateRep);

const primarySpTarget = `          const spAmount = profile.statePensionAmountAnnual ?? primaryAnnualCalculated;
          const primaryTripleLock = profile.enableTripleLock ?? true;
          statePensionThisYr += spAmount * (primaryTripleLock ? cumulativeInflationFactor : 1);`;

const primarySpRep = `          const spAmount = profile.statePensionAmountAnnual ?? primaryAnnualCalculated;
          const primaryTripleLock = profile.enableTripleLock ?? true;
          const indexFactor = primaryTripleLock ? cumulativeInflationFactor : primaryCommencementInflation;
          statePensionThisYr += spAmount * indexFactor;`;

code = code.replace(primarySpTarget, primarySpRep);

const partnerSpTarget = `          const pSpAmount = profile.partnerStatePensionAmountAnnual ?? partnerAnnualCalculated;
          statePensionThisYr += pSpAmount * (partnerTripleLock ? cumulativeInflationFactor : 1);`;

const partnerSpRep = `          const pSpAmount = profile.partnerStatePensionAmountAnnual ?? partnerAnnualCalculated;
          const partnerIndexFactor = partnerTripleLock ? cumulativeInflationFactor : partnerCommencementInflation;
          statePensionThisYr += pSpAmount * partnerIndexFactor;`;

code = code.replace(partnerSpTarget, partnerSpRep);

fs.writeFileSync(file, code);
