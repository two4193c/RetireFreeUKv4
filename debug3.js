const { DEFAULT_PROFILE, DEFAULT_POTS } = require('./src/utils/defaultData');
const { generateProjections } = require('./src/utils/projectionEngine');

const profile = {
  ...DEFAULT_PROFILE,
  propertyDownsizing: {
    enabled: true,
    currentPropertyValue: 650000,
    expectedAnnualGrowthRate: 0,
    downsizeAge: 65,
    targetNewPropertyCostToday: 100000,
    sellingCostsPercent: 0,
    stampDutySecondHomeSurcharge: false,
    destinationPot: 'isa'
  },
  targetRetirementAge: 65
};
const p = generateProjections(profile, DEFAULT_POTS);
const at65 = p.find(r => r.age === 65);
console.log('at 65:', at65 ? at65.propertyDownsizeEquityReleased : 'not found');
