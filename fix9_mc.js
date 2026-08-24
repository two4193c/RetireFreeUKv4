const fs = require('fs');
const file = 'src/utils/monteCarloEngine.ts';
let code = fs.readFileSync(file, 'utf8');

const targetPrimary = `            const primaryTripleLock = profile.enableTripleLock ?? true;
            const primaryIndexFactor = primaryTripleLock ? inflationFactor : 1;
            const primaryFull = profile.fullStatePensionAmount ?? 12547.60;
            const primaryAnnualCalculated = Math.round((primaryYears / 35) * primaryFull * 100) / 100;
            const primaryBaseAmount = profile.statePensionAmountAnnual ?? primaryAnnualCalculated;
            primaryStatePension = primaryBaseAmount * primaryIndexFactor;`;

const repPrimary = `            const primaryTripleLock = profile.enableTripleLock ?? true;
            const commencementYearOffset = Math.max(0, (profile.statePensionAge || 67) - profile.currentAge);
            const commencementInflationFactor = adjustInflationPref ? Math.pow(1 + inflationRate, commencementYearOffset) : 1;
            const postCommencementInflationFactor = primaryTripleLock ? (inflationFactor / commencementInflationFactor) : 1;
            const primaryIndexFactor = commencementInflationFactor * postCommencementInflationFactor;
            const primaryFull = profile.fullStatePensionAmount ?? 12547.60;
            const primaryAnnualCalculated = Math.round((primaryYears / 35) * primaryFull * 100) / 100;
            const primaryBaseAmount = profile.statePensionAmountAnnual ?? primaryAnnualCalculated;
            primaryStatePension = primaryBaseAmount * primaryIndexFactor;`;
            
code = code.replace(targetPrimary, repPrimary);

const targetPartner = `              const partnerTripleLock = profile.partnerEnableTripleLock ?? true;
              const partnerIndexFactor = partnerTripleLock ? inflationFactor : 1;
              const partnerFull = profile.partnerFullStatePensionAmount ?? 12547.60;
              const partnerAnnualCalculated = Math.round((partnerYears / 35) * partnerFull * 100) / 100;
              const partnerBaseAmount = profile.partnerStatePensionAmountAnnual ?? partnerAnnualCalculated;
              partnerStatePension = partnerBaseAmount * partnerIndexFactor;`;

const repPartner = `              const partnerTripleLock = profile.partnerEnableTripleLock ?? true;
              const partnerCurrentAge = profile.partnerCurrentAge ?? profile.currentAge;
              const partnerCommencementOffset = Math.max(0, (profile.partnerStatePensionAge || 67) - partnerCurrentAge);
              const partnerCommencementInflation = adjustInflationPref ? Math.pow(1 + inflationRate, partnerCommencementOffset) : 1;
              const partnerPostCommencement = partnerTripleLock ? (inflationFactor / partnerCommencementInflation) : 1;
              const partnerIndexFactor = partnerCommencementInflation * partnerPostCommencement;
              const partnerFull = profile.partnerFullStatePensionAmount ?? 12547.60;
              const partnerAnnualCalculated = Math.round((partnerYears / 35) * partnerFull * 100) / 100;
              const partnerBaseAmount = profile.partnerStatePensionAmountAnnual ?? partnerAnnualCalculated;
              partnerStatePension = partnerBaseAmount * partnerIndexFactor;`;

code = code.replace(targetPartner, repPartner);

const targetPrimary2 = `        const primaryTripleLock = profile.enableTripleLock ?? true;
        const primaryIndexFactor = primaryTripleLock ? inflationFactor : 1;
        const primaryFull = profile.fullStatePensionAmount ?? 12547.60;
        const primaryAnnualCalculated = Math.round((primaryYears / 35) * primaryFull * 100) / 100;
        const primaryBaseAmount = profile.statePensionAmountAnnual ?? primaryAnnualCalculated;
        statePension += primaryBaseAmount * primaryIndexFactor;`;

const repPrimary2 = `        const primaryTripleLock = profile.enableTripleLock ?? true;
        const commencementYearOffset = Math.max(0, (profile.statePensionAge || 67) - profile.currentAge);
        const commencementInflationFactor = Math.pow(1 + inflationRate, commencementYearOffset);
        const postCommencementInflationFactor = primaryTripleLock ? (inflationFactor / commencementInflationFactor) : 1;
        const primaryIndexFactor = commencementInflationFactor * postCommencementInflationFactor;
        const primaryFull = profile.fullStatePensionAmount ?? 12547.60;
        const primaryAnnualCalculated = Math.round((primaryYears / 35) * primaryFull * 100) / 100;
        const primaryBaseAmount = profile.statePensionAmountAnnual ?? primaryAnnualCalculated;
        statePension += primaryBaseAmount * primaryIndexFactor;`;

code = code.replace(targetPrimary2, repPrimary2);

const targetPartner2 = `          const partnerTripleLock = profile.partnerEnableTripleLock ?? true;
          const partnerIndexFactor = partnerTripleLock ? inflationFactor : 1;
          const partnerFull = profile.partnerFullStatePensionAmount ?? 12547.60;
          const partnerAnnualCalculated = Math.round((partnerYears / 35) * partnerFull * 100) / 100;
          const partnerBaseAmount = profile.partnerStatePensionAmountAnnual ?? partnerAnnualCalculated;
          statePension += partnerBaseAmount * partnerIndexFactor;`;

const repPartner2 = `          const partnerTripleLock = profile.partnerEnableTripleLock ?? true;
          const partnerCurrentAge = profile.partnerCurrentAge ?? profile.currentAge;
          const partnerCommencementOffset = Math.max(0, (profile.partnerStatePensionAge || 67) - partnerCurrentAge);
          const partnerCommencementInflation = Math.pow(1 + inflationRate, partnerCommencementOffset);
          const partnerPostCommencement = partnerTripleLock ? (inflationFactor / partnerCommencementInflation) : 1;
          const partnerIndexFactor = partnerCommencementInflation * partnerPostCommencement;
          const partnerFull = profile.partnerFullStatePensionAmount ?? 12547.60;
          const partnerAnnualCalculated = Math.round((partnerYears / 35) * partnerFull * 100) / 100;
          const partnerBaseAmount = profile.partnerStatePensionAmountAnnual ?? partnerAnnualCalculated;
          statePension += partnerBaseAmount * partnerIndexFactor;`;

code = code.replace(targetPartner2, repPartner2);

fs.writeFileSync(file, code);
