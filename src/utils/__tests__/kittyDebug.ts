import { solveMaximizedSpend } from '../maximizedSpendSolver';
import { generateProjections } from '../projectionEngine';
import { calculateUKTax } from '../ukTaxEngine';
import * as fs from 'fs';

const dataStr = fs.readFileSync('data.json', 'utf8');
const data = JSON.parse(dataStr);
const kittyPlan = data.scenarios.find((s: any) => s.name === "Freedom Kitty - Kitty Plan");

console.log("Found plan:", kittyPlan.name);

const res = solveMaximizedSpend({
  profile: kittyPlan.profile,
  pots: kittyPlan.pots,
  targetEndAge: 76,
  targetLegacyBuffer: 0,
  spendingPattern: 'uniform'
});

console.log("Max Annual Income:", res.maxAnnualIncome);
console.log("Feasible:", res.feasible);
console.log("Depleted Age:", res.depletedAge);
