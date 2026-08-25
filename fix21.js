const fs = require('fs');
const file = 'src/utils/projectionEngine.ts';
let code = fs.readFileSync(file, 'utf8');

const targetFallback = `                if (remainingToDeduct > 0) remainingToDeduct = deductFromPrimaryCash(remainingToDeduct);
                if (remainingToDeduct > 0 && profile.isCouplePlanning) remainingToDeduct = deductFromPartnerCash(remainingToDeduct);
                if (remainingToDeduct > 0) remainingToDeduct = deductFromPrimaryGia(remainingToDeduct);
                if (remainingToDeduct > 0 && profile.isCouplePlanning) remainingToDeduct = deductFromPartnerGia(remainingToDeduct);
                if (remainingToDeduct > 0) remainingToDeduct = deductFromPrimaryIsa(remainingToDeduct);
                if (remainingToDeduct > 0 && profile.isCouplePlanning) remainingToDeduct = deductFromPartnerIsa(remainingToDeduct);`;

const repFallback = `                if (remainingToDeduct > 0) {
                  if (isPartnerEvent) {
                    remainingToDeduct = deductFromPartnerCash(remainingToDeduct);
                    remainingToDeduct = deductFromPartnerGia(remainingToDeduct);
                    remainingToDeduct = deductFromPartnerIsa(remainingToDeduct);
                    // Fallback to primary if household
                    if (remainingToDeduct > 0) {
                      remainingToDeduct = deductFromPrimaryCash(remainingToDeduct);
                      remainingToDeduct = deductFromPrimaryGia(remainingToDeduct);
                      remainingToDeduct = deductFromPrimaryIsa(remainingToDeduct);
                    }
                  } else {
                    remainingToDeduct = deductFromPrimaryCash(remainingToDeduct);
                    remainingToDeduct = deductFromPrimaryGia(remainingToDeduct);
                    remainingToDeduct = deductFromPrimaryIsa(remainingToDeduct);
                    // Fallback to partner if household
                    if (remainingToDeduct > 0 && profile.isCouplePlanning) {
                      remainingToDeduct = deductFromPartnerCash(remainingToDeduct);
                      remainingToDeduct = deductFromPartnerGia(remainingToDeduct);
                      remainingToDeduct = deductFromPartnerIsa(remainingToDeduct);
                    }
                  }
                }`;

code = code.replace(targetFallback, repFallback);

fs.writeFileSync(file, code);
console.log('Issue 21 fixed: PE life events drain correct pots');
