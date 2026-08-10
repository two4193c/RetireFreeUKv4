import { runMonteCarloSimulation } from './utils/monteCarloEngine';
import { calculateUKTax } from './utils/ukTaxEngine';

const profile = {
  "dateOfBirth": "1989-06-15",
  "currentAge": 35,
  "targetRetirementAge": 60,
  "targetRetirementIncomeAnnual": 32000,
  "expectedInflationRate": 2.5,
  "expectedInvestmentReturn": 7.14,
  "postRetirementReturn": 6.24,
  "isCouplePlanning": false,
  "taxRegion": "england_ni_wales",
  "drawdownStrategy": "isa_first",
  "incomeProductOption": "flexi_drawdown"
};

const pots = {
  "workplacePensionBalance": 45000,
  "sippBalance": 15000,
  "stocksAndSharesIsaBalance": 25000,
  "cashIsaBalance": 80000,
  "lisaBalance": 4000,
  "cashSavingsBalance": 120000,
  "giaBalance": 0
};

const taxResult = calculateUKTax(profile as any, pots as any, false, 35);

const paramsBase = {
  numSimulations: 1,
  accumulationVolatility: 0,
  decumulationVolatility: 0,
  marketScenario: 'early_crash' as any,
  crashStartAge: 60,
  crashDurationYears: 1, // 1 year crash
  useCashBuffer: false
};

const paramsBuffer = {
  ...paramsBase,
  useCashBuffer: true,
  cashBufferYears: 1
};

const resBase = runMonteCarloSimulation(profile as any, pots as any, taxResult as any, paramsBase);
const resBuffer = runMonteCarloSimulation(profile as any, pots as any, taxResult as any, paramsBuffer);

console.log('--- 1 YEAR CRASH ---');
console.log('Base Success Rate at 90:', resBase.successRateAge90);
console.log('Buffer Success Rate at 90:', resBuffer.successRateAge90);

console.log('Base Total at 65:', resBase.agePercentiles.find(p => p.age === 65)?.p50TotalPot);
console.log('Buffer Total at 65:', resBuffer.agePercentiles.find(p => p.age === 65)?.p50TotalPot);
