const fs = require('fs');
const file = 'src/utils/monteCarloEngine.ts';
let code = fs.readFileSync(file, 'utf8');

// Issue 10 (MC): Add a running accumulator for taxable pension drawn this year
// First, add the accumulator declaration right before approximateNetFromGrossForOwner
const targetDecl = `        const approximateNetFromGrossForOwner = (grossDraw: number, owner: 'primary' | 'partner'): number => {`;
const repDecl = `        let primaryTaxableDrawnThisYear = 0;
        let partnerTaxableDrawnThisYear = 0;

        const approximateNetFromGrossForOwner = (grossDraw: number, owner: 'primary' | 'partner'): number => {`;
code = code.replace(targetDecl, repDecl);

// Now update the tax calculation to include previous draws
const targetTax = `          const taxableDrawdown = grossDraw - taxFree;
          const guaranteedTaxable = owner === 'primary' ? primaryTaxableGuaranteed : partnerTaxableGuaranteed;
          const totalTaxable = guaranteedTaxable + taxableDrawdown;`;
const repTax = `          const taxableDrawdown = grossDraw - taxFree;
          const guaranteedTaxable = owner === 'primary' ? primaryTaxableGuaranteed : partnerTaxableGuaranteed;
          const previousDraws = owner === 'primary' ? primaryTaxableDrawnThisYear : partnerTaxableDrawnThisYear;
          const totalTaxable = guaranteedTaxable + previousDraws + taxableDrawdown;`;
code = code.replace(targetTax, repTax);

// Update the baseTax to include previous draws
const targetBase = `          const totalTax = computeIncomeTax(totalTaxable, inflationFactor, isScot);
          const baseTax = computeIncomeTax(guaranteedTaxable, inflationFactor, isScot);`;
const repBase = `          const totalTax = computeIncomeTax(totalTaxable, inflationFactor, isScot);
          const baseTax = computeIncomeTax(guaranteedTaxable + previousDraws, inflationFactor, isScot);`;
code = code.replace(targetBase, repBase);

// After approximateNetFromGrossForOwner returns, update the accumulator in executePensionDeduct
// Find the executePensionDeduct block and add accumulator update after netDraw calculation
const targetAccum = `             remaining = Math.max(0, remaining - netDraw);
             netAchieved += netDraw;`;
const repAccum = `             // Track cumulative taxable pension draws for accurate marginal tax
             const taxFreeThisDraw = owner === 'primary'
               ? (primaryCumulativeTaxFreeDrawn < maxLsa ? Math.min(draw * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn)) : 0)
               : (partnerCumulativeTaxFreeDrawn < partnerMaxLsa ? Math.min(draw * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn)) : 0);
             if (owner === 'primary') primaryTaxableDrawnThisYear += (draw - taxFreeThisDraw);
             else partnerTaxableDrawnThisYear += (draw - taxFreeThisDraw);
             remaining = Math.max(0, remaining - netDraw);
             netAchieved += netDraw;`;
code = code.replace(targetAccum, repAccum);

fs.writeFileSync(file, code);
console.log('Issue 10 (MC) fixed: cumulative tax tracking within same year');
