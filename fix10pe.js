const fs = require('fs');
const file = 'src/utils/projectionEngine.ts';
let code = fs.readFileSync(file, 'utf8');

const targetDecl = `        const approximateNetFromGrossForOwner = (grossDraw: number, owner: 'primary' | 'partner'): number => {`;
const repDecl = `        let primaryTaxableDrawnThisYear = 0;
        let partnerTaxableDrawnThisYear = 0;

        const approximateNetFromGrossForOwner = (grossDraw: number, owner: 'primary' | 'partner'): number => {`;
code = code.replace(targetDecl, repDecl);

const targetTax = `          const taxableDrawdown = grossDraw - taxFree;
          const guaranteedTaxable = owner === 'primary' ? primaryGuaranteedIncome : partnerGuaranteedIncome;
          const totalTaxable = guaranteedTaxable + taxableDrawdown;`;
const repTax = `          const taxableDrawdown = grossDraw - taxFree;
          const guaranteedTaxable = owner === 'primary' ? primaryGuaranteedIncome : partnerGuaranteedIncome;
          const previousDraws = owner === 'primary' ? primaryTaxableDrawnThisYear : partnerTaxableDrawnThisYear;
          const totalTaxable = guaranteedTaxable + previousDraws + taxableDrawdown;`;
code = code.replace(targetTax, repTax);

const targetBase = `          const totalTax = computeIncomeTax(totalTaxable, inflationFactor, isScot);
          const baseTax = computeIncomeTax(guaranteedTaxable, inflationFactor, isScot);`;
const repBase = `          const totalTax = computeIncomeTax(totalTaxable, inflationFactor, isScot);
          const baseTax = computeIncomeTax(guaranteedTaxable + previousDraws, inflationFactor, isScot);`;
code = code.replace(targetBase, repBase);

fs.writeFileSync(file, code);
console.log('Issue 10 (PE) fixed: cumulative tax tracking within same year');
