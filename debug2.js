const { DEFAULT_PROFILE, DEFAULT_POTS } = require('./src/utils/defaultData');
const { generateProjections } = require('./src/utils/projectionEngine');

const profile = {
  ...DEFAULT_PROFILE,
  propertyDownsizeAge: 65,
  propertyDownsizeEquityReleased: 150000,
  targetRetirementAge: 65,
  lifeEventsAge: 70,
  lifeEventsIncome: 50000,
  lifeEventsExpense: 30000,
};
const p = generateProjections(profile, DEFAULT_POTS);
const at65 = p.find(r => r.age === 65);
const at70 = p.find(r => r.age === 70);

console.log('at65:', at65 ? at65.propertyDownsizeEquityReleased : 'not found');
console.log('at70 inc:', at70 ? at70.lifeEventsIncome : 'not found');
console.log('at70 exp:', at70 ? at70.lifeEventsExpense : 'not found');
