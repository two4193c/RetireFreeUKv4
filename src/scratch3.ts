import { runMonteCarloSimulation } from './utils/monteCarloEngine';
import { calculateUKTax } from './utils/ukTaxEngine';

const profile = {
  "dateOfBirth": "1989-06-15",
  "currentAge": 35,
  "targetRetirementAge": 60,
  "lifeExpectancyAge": 90,
  "statePensionAge": 67,
  "includeStatePension": true,
  "enableTripleLock": true,
  "statePensionAmountAnnual": 12547.6,
  "fullStatePensionAmount": 12547.6,
  "qualifyingYears": 35,
  "grossAnnualSalary": 65000,
  "isCouplePlanning": true,
  "partnerName": "Partner",
  "partnerCurrentAge": 35,
  "partnerTargetRetirementAge": 60,
  "partnerStatePensionAge": 67,
  "partnerIncludeStatePension": true,
  "partnerEnableTripleLock": true,
  "partnerStatePensionAmountAnnual": 12547.6,
  "partnerFullStatePensionAmount": 12547.6,
  "partnerQualifyingYears": 35,
  "partnerGrossAnnualSalary": 35000,
  "partnerPots": {
    "workplacePensionBalance": 25000,
    "sippBalance": 10000,
    "stocksAndSharesIsaBalance": 15000,
    "cashIsaBalance": 0,
    "cashSavingsBalance": 0,
    "giaBalance": 0
  },
  "taxRegion": "england_ni_wales",
  "pensionContributionMethod": "salary_sacrifice",
  "targetRetirementIncomeAnnual": 32000,
  "expectedInflationRate": 2.5,
  "expectedInvestmentReturn": 7.14,
  "postRetirementReturn": 6.24,
  "pclsLumpSumPercent": 25,
  "takeLumpSumAtStart": false,
  "lumpSumTiming": "access_age",
  "drawdownStrategy": "isa_first",
  "incomeProductOption": "flexi_drawdown",
  "partnerIncomeProductOption": "flexi_drawdown",
  "dbPensions": [],
  "fixedIncomeStreams": [],
  "oneOffContributions": [],
  "decumulationLifeEvents": [],
  "mortgage": { "enabled": false },
  "assetAllocationSplit": { "enabled": false }
};

const pots = {
  "workplacePensionBalance": 45000,
  "sippBalance": 15000,
  "stocksAndSharesIsaBalance": 25000,
  "cashIsaBalance": 0,
  "lisaBalance": 4000,
  "cashSavingsBalance": 0,
  "giaBalance": 0
};

const taxResult = calculateUKTax(profile as any, pots as any, false, 35);

const paramsBase = {
  numSimulations: 1,
  accumulationVolatility: 0,
  decumulationVolatility: 0,
  marketScenario: 'early_crash' as any,
  crashStartAge: 60,
  crashDurationYears: 2,
  useCashBuffer: false
};

const paramsBuffer = {
  ...paramsBase,
  useCashBuffer: true,
  cashBufferYears: 2
};

const resBase = runMonteCarloSimulation(profile as any, pots as any, taxResult as any, paramsBase);
const resBuffer = runMonteCarloSimulation(profile as any, pots as any, taxResult as any, paramsBuffer);

console.log('Base Success Rate at 90:', resBase.successRateAge90);
console.log('Buffer Success Rate at 90:', resBuffer.successRateAge90);

console.log('\n--- Base Run (No Buffer) ---');
resBase.agePercentiles.filter(p => p.age >= 58 && p.age <= 65).forEach(p => {
  console.log(`Age ${p.age}: Total=${p.p50TotalPot}, Pen=${p.p50PensionPot}, ISA=${p.p50IsaPot}, Cash=${p.p50CashGiaPot}`);
});

console.log('\n--- Buffer Run ---');
resBuffer.agePercentiles.filter(p => p.age >= 58 && p.age <= 65).forEach(p => {
  console.log(`Age ${p.age}: Total=${p.p50TotalPot}, Pen=${p.p50PensionPot}, ISA=${p.p50IsaPot}, Cash=${p.p50CashGiaPot}`);
});
