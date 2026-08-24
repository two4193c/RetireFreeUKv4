const { generateProjections } = require('./dist/utils/projectionEngine');
const { DEFAULT_PROFILE } = require('./dist/utils/defaultData');
const { DEFAULT_POTS } = require('./dist/utils/defaultData');

const profile = {
  ...DEFAULT_PROFILE,
  currentAge: 60,
  targetRetirementAge: 60,
  isCouplePlanning: true,
  partnerCurrentAge: 60,
  partnerTargetRetirementAge: 60,
  takeLumpSumAtStart: true,
  lumpSumTiming: 'upfront',
  partnerLumpSumTiming: 'upfront',
  pclsLumpSumPercent: 25,
  partnerPclsLumpSumPercent: 25,
  lumpSumTakeAge: 60,
  partnerLumpSumTakeAge: 60,
  crystallisationMode: 'uncrystallised_drawdown'
};

const pots = { 
  ...DEFAULT_POTS, 
  primaryUncrystallisedPot: 100000, 
  partnerUncrystallisedPot: 100000,
  workplacePensionBalance: 100000,
  partnerWorkplacePensionBalance: 100000
};

const res = generateProjections(profile, pots);
const row60 = res.find(r => r.age === 60);
console.log('pensionPot:', row60.pensionPot);
console.log('primaryPclsDrawnThisYear (if returned? No):', row60.totalWithdrawal); // something indicating PCLS was drawn
