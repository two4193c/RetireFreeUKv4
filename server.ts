import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

// Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 10; // max requests per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

/** Sanitise user-provided string values before interpolation into LLM prompts */
function sanitiseForPrompt(value: unknown, maxLength = 500): string {
  if (value === null || value === undefined) return 'N/A';
  const str = String(value)
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .replace(/[<>]/g, '')    // strip remaining angle brackets
    .trim();
  return str.slice(0, maxLength);
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'uk-retirement-planner' });
  });

  // Gemini AI Analysis Endpoint
  app.post('/api/gemini/analyze', async (req, res) => {
    try {
      // Rate limiting
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      if (isRateLimited(clientIp)) {
        return res.status(429).json({
          error: 'Rate limit exceeded. Please wait a minute before trying again.',
        });
      }

      // Use custom API key from request body if provided, otherwise fall back to env
      const apiKey = req.body.customApiKey || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: 'No API key available. Please set GEMINI_API_KEY environment variable or provide a custom API key.',
        });
      }

      const { profile, pots, taxResult, projectedAtRetirement, depletionAge } = req.body;

      const ai = new GoogleGenAI({ apiKey });

      // Sanitise all user-provided values before interpolating into the prompt
      const s = sanitiseForPrompt;

      const prompt = `You are a top UK Chartered Financial Planner and UK Tax Advisor.
Analyze the following UK retirement plan and provide an actionable, highly practical summary with tax efficiency advice based on UK 2024/25 & 2025/26 tax rules.

User Profile:
- Planning Mode: ${profile?.isCouplePlanning ? 'COUPLE / JOINT HOUSEHOLD' : 'SINGLE INDIVIDUAL'}
- Age: ${s(profile?.currentAge)} | Target Retirement Age: ${s(profile?.targetRetirementAge)}
- Gross Salary: £${s(profile?.grossAnnualSalary)}
- UK Tax Region: ${s(profile?.taxRegion)}
- Pension Method: ${s(profile?.pensionContributionMethod)}
- Target Annual Retirement Income: £${s(profile?.targetRetirementIncomeAnnual)} (today's value)
- State Pension Included: ${profile?.includeStatePension ? 'Yes (£11,541.40/yr at age ' + s(profile?.statePensionAge) + ')' : 'No'}
${profile?.isCouplePlanning ? `- Partner: ${s(profile?.partnerName) || 'Partner'} (Age ${s(profile?.partnerCurrentAge)}, Retire Age ${s(profile?.partnerTargetRetirementAge)}, Salary £${s(profile?.partnerGrossAnnualSalary)}, Partner State Pension: £${s(profile?.partnerStatePensionAmountAnnual)}/yr)
- Dual Household Personal Allowance in Drawdown: £25,140/yr tax-free` : ''}

Current Balances & Contributions:
- Pension Pot: £${s(pots ? (pots.workplacePensionBalance + pots.sippBalance + (profile?.isCouplePlanning ? (profile?.partnerWorkplacePensionBalance || 0) + (profile?.partnerSippBalance || 0) : 0)) : 'N/A')} (Contrib: £${s(taxResult?.totalPensionContributionsAnnual)}/yr including employer match)
- ISA Pot: £${s(pots ? (pots.stocksAndSharesIsaBalance + pots.cashIsaBalance + pots.lisaBalance + (profile?.isCouplePlanning ? (profile?.partnerIsaBalance || 0) : 0)) : 'N/A')} (Contrib: £${s(taxResult?.totalIsaContributionsAnnual)}/yr)
- Cash/GIA Pot: £${s(pots ? (pots.giaBalance + pots.cashSavingsBalance) : 'N/A')}

Tax Calculations:
- Marginal Tax Rate: ${s(taxResult?.marginalTaxRate)}%
- Total Tax Relief Gained: £${s(taxResult?.totalPensionTaxRelief)}/yr
- 60% Tax Trap Active (£100k-£125k): ${taxResult?.is60PercentTaxTrap ? 'YES (Amount in trap: £' + s(taxResult?.taxTrapAmountInBracket) + ')' : 'NO'}
- Pension Annual Allowance Used: £${s(taxResult?.pensionAnnualAllowanceUsed)} / £60,000

Projections:
- Estimated Total Pot at Retirement (Age ${s(profile?.targetRetirementAge)}): £${s(projectedAtRetirement?.totalPot)}
- Pot Depletion Status: ${depletionAge ? 'Pot runs out at age ' + s(depletionAge) : 'Sustained past age 95!'}

Return ONLY a valid JSON object matching this TypeScript format:
{
  "summary": "2-3 sentence overview of the plan's current trajectory.",
  "taxEfficiencyScore": 85,
  "keyOpportunities": ["point 1", "point 2", "point 3"],
  "taxTrapAdvice": "Specific advice on 60% tax trap or salary sacrifice optimizations if relevant.",
  "pensionVsIsaRecommendation": "Clear guidance on whether to lean more towards Pension vs ISA based on tax band.",
  "drawdownStrategyTips": "Advice on withdrawal sequence and taking the 25% tax-free lump sum.",
  "nextSteps": ["Actionable step 1", "Actionable step 2"]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const responseText = response.text || '{}';
      const parsedData = JSON.parse(responseText);

      return res.json(parsedData);
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      return res.status(500).json({ error: err.message || 'Failed to analyze retirement plan with Gemini AI.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
