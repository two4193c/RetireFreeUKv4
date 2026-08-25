const fs = require('fs');
const file = 'src/utils/monteCarloEngine.ts';
let code = fs.readFileSync(file, 'utf8');

const targetAccumContribs = `        if (profile.isCouplePlanning && partnerTaxThisYr) {
          const partnerRetireAge = profile.partnerTargetRetirementAge ?? 60;
          if (partnerAge < partnerRetireAge) {
            primaryPensionContrib += partnerTaxThisYr.regularPensionContributionsAnnual ?? partnerTaxThisYr.totalPensionContributionsAnnual;
            primaryIsaContrib += (partnerTaxThisYr.regularSsIsaContributionsAnnual ?? partnerTaxThisYr.regularIsaContributionsAnnual ?? 0) + (partnerTaxThisYr.regularLisaContributionsAnnual ?? 0) + partnerTaxThisYr.lisaGovernmentBonusAnnual;
            primaryCashGiaContrib += (partnerTaxThisYr.regularCashGiaContributionsAnnual ?? partnerTaxThisYr.totalCashGiaContributionsAnnual ?? 0) + (partnerTaxThisYr.regularCashIsaContributionsAnnual ?? 0);
          }
        }`;

const repAccumContribs = `        let partnerPensionContrib = 0;
        let partnerIsaContrib = 0;
        let partnerCashGiaContrib = 0;
        if (profile.isCouplePlanning && partnerTaxThisYr) {
          const partnerRetireAge = profile.partnerTargetRetirementAge ?? 60;
          if (partnerAge < partnerRetireAge) {
            partnerPensionContrib = partnerTaxThisYr.regularPensionContributionsAnnual ?? partnerTaxThisYr.totalPensionContributionsAnnual;
            partnerIsaContrib = (partnerTaxThisYr.regularSsIsaContributionsAnnual ?? partnerTaxThisYr.regularIsaContributionsAnnual ?? 0) + (partnerTaxThisYr.regularLisaContributionsAnnual ?? 0) + partnerTaxThisYr.lisaGovernmentBonusAnnual;
            partnerCashGiaContrib = (partnerTaxThisYr.regularCashGiaContributionsAnnual ?? partnerTaxThisYr.totalCashGiaContributionsAnnual ?? 0) + (partnerTaxThisYr.regularCashIsaContributionsAnnual ?? 0);
          }
        }`;

code = code.replace(targetAccumContribs, repAccumContribs);

const targetApplyContribs = `        growPots(randomReturn, randomReturn, randomReturn * accCashGiaMult);
        addProRata('pension', primaryPensionContrib * inflationFactor * (1 + randomReturn / 2), false);
        addProRata('isa', primaryIsaContrib * inflationFactor * (1 + randomReturn / 2), false);
        addProRata('cashGia', primaryCashGiaContrib * inflationFactor * (1 + (randomReturn * 0.85) / 2), false);`;

const repApplyContribs = `        growPots(randomReturn, randomReturn, randomReturn * accCashGiaMult);
        addProRata('pension', primaryPensionContrib * inflationFactor * (1 + randomReturn / 2), false);
        addProRata('isa', primaryIsaContrib * inflationFactor * (1 + randomReturn / 2), false);
        addProRata('cashGia', primaryCashGiaContrib * inflationFactor * (1 + (randomReturn * 0.85) / 2), false);
        if (partnerPensionContrib > 0) addProRata('pension', partnerPensionContrib * inflationFactor * (1 + randomReturn / 2), true);
        if (partnerIsaContrib > 0) addProRata('isa', partnerIsaContrib * inflationFactor * (1 + randomReturn / 2), true);
        if (partnerCashGiaContrib > 0) addProRata('cashGia', partnerCashGiaContrib * inflationFactor * (1 + (randomReturn * 0.85) / 2), true);`;

code = code.replace(targetApplyContribs, repApplyContribs);

fs.writeFileSync(file, code);
console.log('Fixed MC partner accumulation contributions accidentally credited to primary');
