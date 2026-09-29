const fs = require('fs');

let c = fs.readFileSync('src/types.ts', 'utf8');

const dynamicRulesInterface = `
export interface DynamicSpendingRules {
  enabled: boolean;
  capitalPreservationThresholdPercent: number; // e.g. 20 (withdraw rate rises 20% above initial)
  capitalPreservationCutPercent: number; // e.g. 10 (cut spending 10%)
  prosperityThresholdPercent: number; // e.g. 20 (withdraw rate drops 20% below initial)
  prosperityIncreasePercent: number; // e.g. 10 (increase spending 10%)
  skipInflationOnNegativeReturn: boolean;
}
`;

if (!c.includes('DynamicSpendingRules')) {
  c = c.replace('export interface UserProfile {', dynamicRulesInterface + '\nexport interface UserProfile {');
}

if (!c.includes('dynamicSpendingRules?: DynamicSpendingRules;')) {
  c = c.replace('drawdownStrategy: DrawdownStrategy;', 'dynamicSpendingRules?: DynamicSpendingRules;\n  drawdownStrategy: DrawdownStrategy;');
}

fs.writeFileSync('src/types.ts', c);
console.log('Added DynamicSpendingRules to types');
