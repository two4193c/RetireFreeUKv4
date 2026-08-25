const fs = require('fs');
const file = 'src/utils/projectionEngine.ts';
let code = fs.readFileSync(file, 'utf8');

const targetAccum = `          const executePensionDeduct = (grossDrawNeeded: number) => {
             const draw = Math.min(pPot, grossDrawNeeded);
             const netDraw = approximateNetFromGrossForOwner(draw, owner);
             executeDeduct('pension', draw, owner); if (age === 60) console.log('DEBUG PENSION DEDUCT:', {draw, netDraw, remaining});
             
             const uncrystDrawn = isPrimary 
               ? Math.min(primaryUncrystallisedPot, Math.max(0, draw - primaryCrystallisedPot)) 
               : Math.min(partnerUncrystallisedPot, Math.max(0, draw - partnerCrystallisedPot));
             const taxFreeThisDraw = isPrimary
               ? Math.min(uncrystDrawn * 0.25, Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn))
               : Math.min(uncrystDrawn * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
             if (isPrimary) primaryTaxableDrawnThisYear += (draw - taxFreeThisDraw);
             else partnerTaxableDrawnThisYear += (draw - taxFreeThisDraw);
             
             remaining = Math.max(0, remaining - netDraw);
             netAchieved += netDraw;
          };`;

const repAccum = `          const executePensionDeduct = (grossDrawNeeded: number) => {
             const draw = Math.min(pPot, grossDrawNeeded);
             const netDraw = approximateNetFromGrossForOwner(draw, owner);
             
             const uncrystDrawn = isPrimary 
               ? Math.min(primaryUncrystallisedPot, Math.max(0, draw - primaryCrystallisedPot)) 
               : Math.min(partnerUncrystallisedPot, Math.max(0, draw - partnerCrystallisedPot));
             const taxFreeThisDraw = isPrimary
               ? Math.min(uncrystDrawn * 0.25, Math.max(0, primaryMaxLsa - primaryCumulativeTaxFreeDrawn))
               : Math.min(uncrystDrawn * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
             if (isPrimary) primaryTaxableDrawnThisYear += (draw - taxFreeThisDraw);
             else partnerTaxableDrawnThisYear += (draw - taxFreeThisDraw);

             executeDeduct('pension', draw, owner);
             remaining = Math.max(0, remaining - netDraw);
             netAchieved += netDraw;
          };`;

code = code.replace(targetAccum, repAccum);

fs.writeFileSync(file, code);
console.log('Issue 10 (PE) fixed: executePensionDeduct tax calc order fixed');
