const fs = require('fs');
const file = 'src/utils/historicModelingEngine.ts';
let code = fs.readFileSync(file, 'utf8');

const target = `        const guaranteedIncome = statePensionThisYr + annuityIncomeThisYear + dbIncomeThisYr + fixedIncomeThisYr;
        let remainingNeeded = Math.max(0, drawdownNetTarget - guaranteedIncome);`;

const rep = `        const guaranteedIncome = statePensionThisYr + annuityIncomeThisYear + dbIncomeThisYr + fixedIncomeThisYr;
        // Net down the guaranteed income by approximate income tax before subtracting from net target
        const indexTaxBandsForGI = profile.indexTaxBands ?? true;
        const inflMultGI = indexTaxBandsForGI ? cumulativeInflationFactor : 1;
        const isScotPri = profile.taxRegion === 'scotland';
        const { tax: giTax } = computeIncomeTaxOnAmount(guaranteedIncome / inflMultGI, isScotPri, profile.customTaxBands);
        const netGuaranteedIncome = guaranteedIncome - (giTax * inflMultGI);
        let remainingNeeded = Math.max(0, drawdownNetTarget - netGuaranteedIncome);`;

code = code.replace(target, rep);

fs.writeFileSync(file, code);
console.log('Issue 11 fixed: net guaranteed income used in drawdown target calculation');
