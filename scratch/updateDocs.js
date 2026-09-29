const fs = require('fs');
let c = fs.readFileSync('README.md', 'utf8');

const docs = `

## Key Features

### Overpay vs Invest Arbitrage Strategy
RetireFreeUK v4 introduces an advanced, interactive Mortgage Arbitrage engine to help you mathematically decide whether to overpay your mortgage or invest your monthly surplus. 

**Features include:**
- **Dynamic Yield Spread Heatmap:** A visual matrix showing the exact absolute pound sterling (£) gain or loss over your remaining mortgage term by investing at various rates vs overpaying at various mortgage rates.
- **Future Value Projection:** Projects your actual monthly overpayments (and scheduled lump sums) over the remaining term of your mortgage using compound interest (Future Value of an Annuity).
- **Early Repayment Charge (ERC) Integration:** Automatically detects if your planned overpayments exceed your penalty-free threshold and calculates the true effective cost of your mortgage.
- **PDF Export Integration:** Generates a comprehensive summary table in Appendix 4 of your PDF report, detailing the net gain of investing across Low, Expected, and High return scenarios against the overpayment baseline.
- **Risk Disclaimer:** Clearly delineates that while the math may heavily favor investing your surplus, mortgage overpayments provide a 100% guaranteed tax-free return, whereas market investments carry inherent volatility and risk.
`;

c = c + docs;

fs.writeFileSync('README.md', c);
console.log('Updated README.md with Arbitrage Documentation');
