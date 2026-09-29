const fs = require('fs');
let c = fs.readFileSync('src/components/MortgageDebtCard.tsx', 'utf8');

const messyEnd = `                  )}
                </div>           </p>
              </div>
            </div>`;

const fixedEnd = `                  )}
                </div>
              </div>
            </div>`;

c = c.replace(messyEnd, fixedEnd);
fs.writeFileSync('src/components/MortgageDebtCard.tsx', c);
console.log('Fixed syntax error in MortgageDebtCard.tsx');
