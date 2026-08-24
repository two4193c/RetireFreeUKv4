require('ts-node/register');
const { DEFAULT_PROFILE, DEFAULT_POTS } = require('./src/utils/defaultData');
const { generateProjections } = require('./src/utils/projectionEngine');

const profile = {
  ...DEFAULT_PROFILE,
  propertyDownsizeAge: 65,
  propertyDownsizeEquityReleased: 150000,
  targetRetirementAge: 65
};
const p = generateProjections(profile, DEFAULT_POTS);
const at65 = p.find(r => r.age === 65);
console.log('at65 downsize:', at65 ? at65.propertyDownsizeEquityReleased : 'not found');
