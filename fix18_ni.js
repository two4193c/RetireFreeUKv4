const fs = require('fs');
const file = 'src/utils/taxEfficientSavingsEngine.ts';
let code = fs.readFileSync(file, 'utf8');

const targetNi = `  // NI Savings under Salary Sacrifice
  if (method === 'salary_sacrifice') {
    if (salary > RUK_BASIC_THRESHOLD) {
      niSavingsRate = 0.02; // 2% NI above higher rate threshold
    } else if (salary > PERSONAL_ALLOWANCE) {
      niSavingsRate = 0.08; // 8% NI basic rate
    }
  }`;

const repNi = `  // NI Savings under Salary Sacrifice
  if (method === 'salary_sacrifice') {
    const { employeeNi: baseNi } = computeIncomeTaxOnAmount(salary, isScottish, undefined);
    const { employeeNi: upNi } = computeIncomeTaxOnAmount(salary + 1000, isScottish, undefined);
    niSavingsRate = (upNi - baseNi) / 1000;
    niSavingsRate = Math.round(niSavingsRate * 100) / 100;
  }`;

code = code.replace(targetNi, repNi);

fs.writeFileSync(file, code);
console.log('Issue 18 fixed: NI savings rate also updated');
