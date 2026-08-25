const fs = require('fs');
const file = 'src/utils/taxEfficientSavingsEngine.ts';
let code = fs.readFileSync(file, 'utf8');

const targetTaxCalc = `  let contributionMarginalTaxRate = 0.20;
  if (isScottish) {
    if (salary > SCOT_ADVANCED_THRESHOLD) {
      contributionMarginalTaxRate = 0.48;
    } else if (salary > SCOT_HIGHER_THRESHOLD) {
      contributionMarginalTaxRate = 0.42;
    } else if (salary > SCOT_INTERMEDIATE_THRESHOLD) {
      contributionMarginalTaxRate = 0.21;
    } else if (salary > SCOT_BASIC_THRESHOLD) {
      contributionMarginalTaxRate = 0.20;
    } else if (salary > SCOT_STARTER_THRESHOLD) {
      contributionMarginalTaxRate = 0.19;
    } else {
      contributionMarginalTaxRate = 0.0;
    }
  } else {
    if (salary > RUK_ADDITIONAL_THRESHOLD) {
      contributionMarginalTaxRate = 0.45;
    } else if (salary > RUK_BASIC_THRESHOLD) {
      contributionMarginalTaxRate = 0.40;
    } else if (salary > PERSONAL_ALLOWANCE) {
      contributionMarginalTaxRate = 0.20;
    } else {
      contributionMarginalTaxRate = 0.0;
    }
  }`;

const repTaxCalc = `  // Issue 18: Use the actual tax engine to find the true marginal tax rate, rather than comparing gross to taxable thresholds
  const { tax: baseTax } = computeIncomeTaxOnAmount(salary, isScottish, undefined);
  const { tax: upTax } = computeIncomeTaxOnAmount(salary + 1000, isScottish, undefined);
  let contributionMarginalTaxRate = (upTax - baseTax) / 1000;
  // Snap to known rates to avoid floating point weirdness (e.g., 0.199999 -> 0.20),
  // but allow for the 60% / 63% PA taper marginal rates!
  contributionMarginalTaxRate = Math.round(contributionMarginalTaxRate * 100) / 100;`;

code = code.replace(targetTaxCalc, repTaxCalc);

// I also need to make sure computeIncomeTaxOnAmount is imported!
const targetImport = `import { PERSONAL_ALLOWANCE, RUK_BASIC_THRESHOLD, RUK_ADDITIONAL_THRESHOLD, SCOT_STARTER_THRESHOLD, SCOT_BASIC_THRESHOLD, SCOT_INTERMEDIATE_THRESHOLD, SCOT_HIGHER_THRESHOLD, SCOT_ADVANCED_THRESHOLD } from '../config/ukTaxRates';`;
const repImport = `import { PERSONAL_ALLOWANCE, RUK_BASIC_THRESHOLD, RUK_ADDITIONAL_THRESHOLD, SCOT_STARTER_THRESHOLD, SCOT_BASIC_THRESHOLD, SCOT_INTERMEDIATE_THRESHOLD, SCOT_HIGHER_THRESHOLD, SCOT_ADVANCED_THRESHOLD } from '../config/ukTaxRates';
import { computeIncomeTaxOnAmount } from './ukTaxEngine';`;

code = code.replace(targetImport, repImport);

fs.writeFileSync(file, code);
console.log('Issue 18 fixed: used computeIncomeTaxOnAmount to find accurate marginal rate');
