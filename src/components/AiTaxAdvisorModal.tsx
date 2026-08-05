import React, { useState } from 'react';
import { UserProfile, InvestmentPots, TaxCalculationResult, YearProjection, GeminiAnalysisResponse } from '../types';
import { Sparkles, CheckCircle2, AlertCircle, ArrowRight, X, RefreshCw, Award, Lightbulb, Key, ShieldCheck } from 'lucide-react';

interface AiTaxAdvisorModalProps {
  profile: UserProfile;
  pots: InvestmentPots;
  taxResult: TaxCalculationResult;
  projections: YearProjection[];
  onClose: () => void;
}

export const AiTaxAdvisorModal: React.FC<AiTaxAdvisorModalProps> = ({
  profile,
  pots,
  taxResult,
  projections,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<GeminiAnalysisResponse | null>(null);
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem('user_gemini_api_key') || '';
  });
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);

  const projectedAtRetirement = projections.find((p) => p.age === profile.targetRetirementAge);
  const depletedYear = projections.find((p) => p.potDepleted);

  // Deterministic local UK Tax Audit engine fallback
  const generateLocalTaxAudit = (): GeminiAnalysisResponse => {
    let score = 100;
    const opportunities: string[] = [];
    const nextSteps: string[] = [];

    // 1. Check 60% Tax Trap (£100,000 - £125,140)
    let taxTrapAdvice = '';
    if (taxResult?.is60PercentTaxTrap) {
      score -= 15;
      const amountInBracket = taxResult.taxTrapAmountInBracket || 0;
      taxTrapAdvice = `You are currently in the UK 60% effective tax trap on £${(amountInBracket || 0).toLocaleString()} of earnings between £100,000 and £125,140. Contributing £${(taxResult.recommendedTaxTrapPensionContribution || amountInBracket || 0).toLocaleString()}/yr to your pension via Salary Sacrifice or SIPP will reclaim your Personal Allowance and save you £${Math.round(amountInBracket * 0.6).toLocaleString()} in direct tax!`;
      opportunities.push(`Reclaim 60% tax trap by making a £${(taxResult.recommendedTaxTrapPensionContribution || amountInBracket || 0).toLocaleString()} gross pension contribution.`);
      nextSteps.push(`Increase monthly pension contribution by £${Math.ceil((amountInBracket / 12) || 0).toLocaleString()}/mo to eliminate 60% tax trap.`);
    } else {
      taxTrapAdvice = 'You are currently outside the 60% tax trap bracket (£100,000–£125,140). Your Personal Allowance is 100% intact.';
    }

    // 2. Pension Contribution Method & Higher Rate Relief
    let pensionVsIsa = '';
    if ((taxResult?.marginalTaxRate || 20) >= 40) {
      pensionVsIsa = `As a Higher Rate tax payer (${taxResult?.marginalTaxRate || 40}%), pension contributions provide 40% to 45% tax relief vs non-deductible ISA contributions. Prioritize Workplace Pension / SIPP to max tax relief before filling ISAs.`;
      if (profile.pensionContributionMethod === 'relief_at_source') {
        score -= 5;
        opportunities.push('Submit a HMRC Self-Assessment or call HMRC to claim your extra 20% higher-rate pension tax relief!');
        nextSteps.push('Claim higher-rate tax relief on SIPP contributions via HMRC Self Assessment.');
      }
    } else {
      pensionVsIsa = 'As a Basic Rate tax payer (20%), balance your £20,000/yr ISA allowance for tax-free flexibility with workplace pension for employer match.';
    }

    // 3. Salary Sacrifice NIC Savings
    if (profile.pensionContributionMethod !== 'salary_sacrifice' && profile.grossAnnualSalary > 0) {
      opportunities.push('Switch to Salary Sacrifice with your employer to save 8% or 2% National Insurance on all pension contributions.');
      nextSteps.push('Ask your employer HR if Salary Sacrifice pension contributions are available.');
    }

    // 4. Household Allowance Utilization
    if (profile.isCouplePlanning) {
      opportunities.push(`Utilize dual tax-free Personal Allowances in retirement (£25,140/yr combined tax-free income floor).`);
    }

    // 5. Fund Longevity Check
    if (depletedYear) {
      score -= 20;
      nextSteps.push(`Adjust target retirement age or increase monthly savings by £150/mo to avoid capital depletion at age ${depletedYear.age}.`);
    } else {
      opportunities.push(`Portfolio capital is sustained past age 95! Projected wealth at retirement: £${(projectedAtRetirement?.totalPot || (0) || 0).toLocaleString()}.`);
    }

    if (nextSteps.length < 2) {
      nextSteps.push('Review drawdown asset sequence to draw ISA tax-free bridge before accessing taxable pension pots.');
    }

    return {
      summary: `Your retirement plan is projected to reach £${(projectedAtRetirement?.totalPot || 0).toLocaleString()} at age ${profile.targetRetirementAge}. Marginal tax rate is ${taxResult?.marginalTaxRate || 20}%. Total annual tax relief gained: £${(taxResult?.totalTaxReliefGained || 0).toLocaleString()}/yr.`,
      taxEfficiencyScore: Math.max(40, score),
      keyOpportunities: opportunities,
      taxTrapAdvice,
      pensionVsIsaRecommendation: pensionVsIsa,
      drawdownStrategyTips: `Using ${profile.drawdownStrategy || 'ISA First'} drawdown strategy. Taking tax-free lump sum (PCLS) ${profile.takeLumpSumAtStart ? 'upfront' : 'via phased UFPLS'} optimizes lifetime tax exposure.`,
      nextSteps: nextSteps.slice(0, 4),
    };
  };

  const saveCustomApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem('user_gemini_api_key', key);
  };

  const runAiAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile,
          pots,
          taxResult,
          projectedAtRetirement,
          depletionAge: depletedYear?.age,
          customApiKey: customApiKey || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data && data.taxEfficiencyScore) {
          setAnalysis(data);
          setLoading(false);
          return;
        }
      }
    } catch (err: any) {
      console.warn('Backend Gemini endpoint unavailable, running deterministic UK Tax Audit local engine...');
    }

    // Fallback to local deterministic UK Tax Audit engine
    const localAudit = generateLocalTaxAudit();
    setAnalysis(localAudit);
    setLoading(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-tax-advisor-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 relative my-8 text-slate-800 dark:text-slate-100 transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 shadow-md">
              <Sparkles className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <h2 id="ai-tax-advisor-title" className="font-extrabold text-slate-900 dark:text-white text-base">Gemini AI UK Tax Advisor</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Personalized UK retirement & tax relief report</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close AI advisor"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Generate Trigger if no analysis yet */}
        {!analysis && !loading && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200/50 dark:border-emerald-800/50">
              <Sparkles className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="font-bold text-slate-900 dark:text-white text-base">Ready to review your UK tax efficiency</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Analyzes your salary (£{(profile.grossAnnualSalary || 0).toLocaleString()}), pension tax relief, 60% tax trap status, and drawdown sequence.
              </p>
            </div>

            {/* Custom Gemini API Key input toggle */}
            <div className="pt-2 max-w-md mx-auto">
              <button
                type="button"
                onClick={() => setShowApiKeyInput(!showApiKeyInput)}
                className="text-xs font-bold text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{showApiKeyInput ? 'Hide API Key Settings' : 'Optional: Set Custom Gemini API Key'}</span>
              </button>

              {showApiKeyInput && (
                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-left space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Gemini API Key</label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={customApiKey}
                    onChange={(e) => saveCustomApiKey(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white"
                  />
                  <p className="text-[10px] text-slate-400">Saved locally in your browser. If empty, uses server key or deterministic UK Tax Audit engine.</p>
                </div>
              )}
            </div>

            <button
              onClick={runAiAnalysis}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 mx-auto cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate AI Tax Efficiency Audit</span>
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="text-center py-12 space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Evaluating UK 2024/25 tax bands, allowances & retirement drawdown...
            </p>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && !loading && (
          <div className="space-y-5 text-slate-800 dark:text-slate-200 text-xs">
            
            {/* Score & Summary */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 text-white p-4.5 rounded-2xl border border-slate-800">
              <div className="space-y-1 shrink-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Tax Efficiency Score</span>
                <div className="text-3xl font-extrabold text-emerald-400 flex items-center gap-2">
                  <span>{analysis.taxEfficiencyScore}</span>
                  <span className="text-sm text-slate-400 font-bold">/ 100</span>
                </div>
              </div>
              <div className="text-xs text-slate-300 font-medium leading-relaxed sm:text-right">
                {analysis.summary}
              </div>
            </div>

            {/* Key Opportunities */}
            {analysis.keyOpportunities && analysis.keyOpportunities.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Key Tax Opportunities</span>
                </h4>
                <ul className="space-y-1.5">
                  {analysis.keyOpportunities.map((op, i) => (
                    <li key={i} className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{op}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tax Trap Advice */}
            {analysis.taxTrapAdvice && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 p-3.5 rounded-2xl space-y-1 text-amber-950 dark:text-amber-200">
                <h5 className="font-bold flex items-center gap-1.5 text-amber-900 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>60% Tax Trap Advice</span>
                </h5>
                <p className="leading-relaxed">{analysis.taxTrapAdvice}</p>
              </div>
            )}

            {/* Pension vs ISA Guidance */}
            {analysis.pensionVsIsaRecommendation && (
              <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 p-3.5 rounded-2xl space-y-1 text-indigo-950 dark:text-indigo-200">
                <h5 className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Pension vs ISA Allocation Strategy</span>
                </h5>
                <p className="leading-relaxed">{analysis.pensionVsIsaRecommendation}</p>
              </div>
            )}

            {/* Next Action Steps */}
            {analysis.nextSteps && analysis.nextSteps.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="font-extrabold text-slate-900 dark:text-white">Recommended Next Steps</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analysis.nextSteps.map((step, idx) => (
                    <div key={idx} className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-extrabold text-[10px] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 text-center">
              <button
                onClick={runAiAnalysis}
                className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Re-run AI Tax Efficiency Audit
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
