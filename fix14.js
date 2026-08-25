const fs = require('fs');
const file = 'src/utils/monteCarloEngine.ts';
let code = fs.readFileSync(file, 'utf8');

// Issue 14: Reorder LSA increment to AFTER approximateNetFromGrossForOwner
const target14 = `             const draw = Math.min(pPot, grossDrawNeeded);
             executeDeduct('pension', draw, owner);
             if (isPrimary && primaryCumulativeTaxFreeDrawn < maxLsa) {
                primaryCumulativeTaxFreeDrawn += Math.min(draw * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
             } else if (!isPrimary && partnerCumulativeTaxFreeDrawn < partnerMaxLsa) {
                partnerCumulativeTaxFreeDrawn += Math.min(draw * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
             }
             const netDraw = approximateNetFromGrossForOwner(draw, owner);
             remaining = Math.max(0, remaining - netDraw);
             netAchieved += netDraw;`;

const rep14 = `             const draw = Math.min(pPot, grossDrawNeeded);
             executeDeduct('pension', draw, owner);
             const netDraw = approximateNetFromGrossForOwner(draw, owner);
             // Update LSA AFTER tax calc so the current draw's tax-free portion is correctly computed
             if (isPrimary && primaryCumulativeTaxFreeDrawn < maxLsa) {
                primaryCumulativeTaxFreeDrawn += Math.min(draw * 0.25, Math.max(0, maxLsa - primaryCumulativeTaxFreeDrawn));
             } else if (!isPrimary && partnerCumulativeTaxFreeDrawn < partnerMaxLsa) {
                partnerCumulativeTaxFreeDrawn += Math.min(draw * 0.25, Math.max(0, partnerMaxLsa - partnerCumulativeTaxFreeDrawn));
             }
             remaining = Math.max(0, remaining - netDraw);
             netAchieved += netDraw;`;

code = code.replace(target14, rep14);

fs.writeFileSync(file, code);
console.log('Issue 14 fixed: LSA counter now incremented after tax calculation');
