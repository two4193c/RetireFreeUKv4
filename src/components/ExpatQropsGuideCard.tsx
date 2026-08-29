import React from 'react';
import { 
  Globe, 
  Plane, 
  ShieldAlert, 
  CheckCircle2, 
  Coins, 
  Landmark, 
  FileText, 
  AlertTriangle, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export const ExpatQropsGuideCard: React.FC = () => {
  return (
    <div id="card-doc-expatqropsguide" className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-8 transition-colors">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 rounded-2xl border border-cyan-200/60 dark:border-cyan-800/60">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Expat, Overseas & QROPS Pension Guide</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 px-2.5 py-1 rounded-full border border-cyan-200 dark:border-cyan-800">
                International Retirement
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Managing UK pensions when retiring overseas, Double Taxation Agreements (DTAs), NT tax codes, QROPS transfers, and currency risk.
            </p>
          </div>
        </div>
      </div>

      {/* Core Tax Rule: Double Taxation Agreements (DTAs) & NT Tax Codes */}
      <div className="p-6 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200/80 dark:border-cyan-800/80 space-y-4 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-cyan-950 dark:text-cyan-300 text-sm flex items-center gap-2">
            <Landmark className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Double Taxation Agreements (DTAs) & HMRC 'NT' Tax Codes
          </span>
          <span className="text-[10px] font-bold uppercase bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 px-2 py-0.5 rounded">
            Tax Relief Protocol
          </span>
        </div>

        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          The UK has bilateral <strong>Double Taxation Agreements (DTAs)</strong> with over 130 countries. Under most standard DTAs (such as with Spain, France, Portugal, Australia, and the US), private pension and SIPP drawdown income is taxed <strong>exclusively in your country of tax residence</strong>, not in the UK.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-cyan-200/60 dark:border-cyan-900/60 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-600" />
              Claiming an 'NT' (No Tax) Code
            </span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Submit HMRC Form <strong>DT-Individual</strong> certified by your local foreign tax authority. HMRC will instruct your UK pension provider to issue an <strong>NT Tax Code</strong>, paying 100% gross drawdown without UK PAYE deductions.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-cyan-200/60 dark:border-cyan-900/60 space-y-1">
            <span className="font-bold text-slate-900 dark:text-white">UK State Pension Overseas</span>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              UK State Pension is paid gross anywhere in the world. However, annual Triple Lock increases only apply if you reside in the UK, EEA, Gibraltar, Switzerland, or countries with a reciprocal social security agreement (e.g. USA).
            </p>
          </div>
        </div>
      </div>

      {/* QROPS Transfers: Benefits vs Overseas Transfer Charge (OTC) */}
      <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-indigo-500" />
          <span>QROPS (Qualifying Recognised Overseas Pension Scheme) Transfers</span>
        </h3>

        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          A QROPS allows you to consolidate and transfer your UK registered pension scheme into an approved overseas pension scheme in your new jurisdiction.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="font-bold text-primary-700 dark:text-primary-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>Potential Advantages of QROPS</span>
            </div>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
              <li>• Option to hold funds in local currency (€ EUR, $ USD) eliminating exchange rate volatility.</li>
              <li>• Avoids future restrictive UK tax legislation changes.</li>
              <li>• Potential estate planning / local inheritance tax advantages in certain host countries.</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-900/80 bg-rose-50/20 dark:bg-rose-950/10 space-y-2">
            <div className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              <span>The 25% Overseas Transfer Charge (OTC) Hazard</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              HMRC levies a <strong>25% tax penalty (OTC)</strong> on QROPS transfers UNLESS you reside in the EEA/Gibraltar and the QROPS is based in the EEA/Gibraltar, or the QROPS is an occupational scheme provided by your employer.
            </p>
          </div>
        </div>
      </div>

      {/* Currency Risk & Dual Currency Cash Buffers */}
      <div className="p-6 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 space-y-4 text-xs">
        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>Managing Foreign Exchange (FX) Currency Volatility</span>
        </h3>

        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          If your pension investments and State Pension are denominated in UK Sterling (£ GBP), but your living expenses are in Euros (€ EUR) or Dollars ($ USD), a 15% drop in GBP exchange rate reduces your real foreign purchasing power by 15%.
        </p>

        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/60 text-slate-800 dark:text-slate-200 font-medium">
          Expat Defense Rule: Maintain <strong>1 to 2 years of local currency cash buffer</strong> (e.g. in a Euro bank account) to avoid converting Sterling at unfavorable currency exchange dips.
        </div>
      </div>

      {/* RetireFree UK Integration Note */}
      <div className="p-5 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/30 border border-cyan-200/60 dark:border-cyan-800/60 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs">
          <p className="font-bold text-cyan-900 dark:text-cyan-300">Modelling Overseas Tax in RetireFree UK v4</p>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            If you have an HMRC 'NT' code or reside in an overseas tax jurisdiction, you can adjust the <strong>Income Tax Rates & Allowances</strong> inside Advanced Settings to model your local host country's effective tax rates accurately.
          </p>
        </div>
      </div>

    </div>
  );
};
