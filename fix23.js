const fs = require('fs');
const file = 'src/utils/sankeyEngine.ts';
let code = fs.readFileSync(file, 'utf8');

const targetAlloc = `      const annualExcess = (p.annualIncomeExcess || 0) + (p.propertyDownsizeEquityReleased || 0);
      const reinvestSurplus = Math.min(totalSpendable, annualExcess);
      const priReinvest = totalSpendable > 0 ? (priSpendable / totalSpendable) * reinvestSurplus : 0;
      const partReinvest = totalSpendable > 0 ? (partSpendable / totalSpendable) * reinvestSurplus : 0;

      const lifeEventsExpense = p.lifeEventsExpense || 0;
      const availableLiving = Math.max(0, totalSpendable - reinvestSurplus - lifeEventsExpense);
      const priLifeEventsAlloc = totalSpendable > 0 ? (priSpendable / totalSpendable) * lifeEventsExpense : 0;
      const partLifeEventsAlloc = totalSpendable > 0 ? (partSpendable / totalSpendable) * lifeEventsExpense : 0;`;

const repAlloc = `      const annualExcess = (p.annualIncomeExcess || 0) + (p.propertyDownsizeEquityReleased || 0);
      
      const lifeEventsExpense = Math.min(totalSpendable, p.lifeEventsExpense || 0);
      const priLifeEventsAlloc = totalSpendable > 0 ? (priSpendable / totalSpendable) * lifeEventsExpense : 0;
      const partLifeEventsAlloc = totalSpendable > 0 ? (partSpendable / totalSpendable) * lifeEventsExpense : 0;
      
      const reinvestSurplus = Math.min(Math.max(0, totalSpendable - lifeEventsExpense), annualExcess);
      const priReinvest = totalSpendable > 0 ? (priSpendable / totalSpendable) * reinvestSurplus : 0;
      const partReinvest = totalSpendable > 0 ? (partSpendable / totalSpendable) * reinvestSurplus : 0;

      const availableLiving = Math.max(0, totalSpendable - reinvestSurplus - lifeEventsExpense);`;

code = code.replace(targetAlloc, repAlloc);

fs.writeFileSync(file, code);
console.log('Issue 23 fixed: Sankey flow balance violation on excess reinvestment');
