import React from 'react';
import { UserProfile, InvestmentPots, CustomTaxBandOverrides } from '../types';
import { getPensionAccessAge, getPartnerPensionAccessAge } from '../utils/ukTaxEngine';
import { DEFAULT_CUSTOM_TAX_BANDS } from '../utils/defaultData';
import { User, Heart, Users, HelpCircle, AlertTriangle, ShieldCheck, Sliders, RotateCcw, Receipt, Percent, Sparkles, CheckCircle2 } from 'lucide-react';

interface ProfileInputsProps {
  isStudioMode?: boolean;
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
  pots?: InvestmentPots;
}

export const ProfileInputs: React.FC<ProfileInputsProps> = ({ profile, onChange, pots, isStudioMode }) => {
  const isCouple = Boolean(profile.isCouplePlanning);

  const updateField = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) => {
    onChange({
      ...profile,
      [key]: value,
    });
  };

  // Compute current age from DOB if DOB changes for Primary
  const handleDobChange = (dobStr: string) => {
    if (!dobStr) return;
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return;
    
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    const computedAge = Math.max(18, age);

    onChange({
      ...profile,
      dateOfBirth: dobStr,
      currentAge: computedAge,
    });
  };

  // Compute partner current age from DOB if DOB changes for Partner
  const handlePartnerDobChange = (dobStr: string) => {
    if (!dobStr) return;
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return;
    
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    const computedAge = Math.max(18, age);

    onChange({
      ...profile,
      partnerDateOfBirth: dobStr,
      partnerCurrentAge: computedAge,
    });
  };

  const primaryAccessAge = getPensionAccessAge(profile);
  const isPrimaryEarlyRetirement = profile.targetRetirementAge < primaryAccessAge;

  const partnerAccessAge = isCouple ? getPartnerPensionAccessAge(profile) : 57;
  const partnerAge = profile.partnerCurrentAge ?? 35;
  const partnerRetireAge = profile.partnerTargetRetirementAge ?? 60;
  const isPartnerEarlyRetirement = isCouple && partnerRetireAge < partnerAccessAge;

  return (
    <div className={`bg-white dark:bg-slate-900 shadow-xs border border-slate-200 dark:border-slate-800 transition-colors ${
      isStudioMode ? 'rounded-2xl p-4 sm:p-5 space-y-4' : 'rounded-3xl p-6 space-y-6'
    }`}>
      {/* SECTION HEADER & NMPA BADGES */}
      <div className={`flex flex-col justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800 ${isStudioMode ? "" : "sm:flex-row sm:items-center"}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/50 shrink-0">
            <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm sm:text-base">
              Personal Profile & NMPA Timeline
            </h2>
            {!isStudioMode && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {isCouple
                  ? 'Primary & Partner ages, earnings, NMPA pension access rules & tax parameters'
                  : 'Date of birth, salary, target retirement age, pension access & tax parameters'}
              </p>
            )}
          </div>
        </div>

        {/* NMPA Access Age Badges */}
        {isStudioMode ? (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 px-2.5 py-1 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                {isCouple ? `${profile.name || 'Primary'}:` : 'NMPA Access:'}
              </span>
              <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400">
                {profile.pensionAccessAge ?? profile.protectedPensionAccessAge ?? primaryAccessAge}
              </span>
            </div>
            {isCouple && (
              <div className="flex items-center gap-1.5 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 px-2.5 py-1 rounded-xl">
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500/20 shrink-0" />
                <span className="text-[11px] text-indigo-900 dark:text-indigo-300 font-medium">
                  {profile.partnerName || 'Partner'}:
                </span>
                <span className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-400">
                  {profile.partnerPensionAccessAge ?? profile.partnerProtectedPensionAccessAge ?? partnerAccessAge}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 px-3 py-1.5 rounded-2xl">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <div className="text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">
                  {isCouple ? `${profile.name || 'Primary'}: ` : 'Pension Access Age: '}
                </span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                  {primaryAccessAge}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1">
                  ({primaryAccessAge === 57 ? 'Born ≥ 6 Apr 1971' : 'Born < 6 Apr 1971'})
                </span>
              </div>
            </div>

            {isCouple && (
              <div className="flex items-center gap-2 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 px-3 py-1.5 rounded-2xl">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20" />
                <div className="text-xs">
                  <span className="text-indigo-900 dark:text-indigo-300 font-medium">
                    {profile.partnerName || 'Partner'}:{' '}
                  </span>
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-400">
                    {partnerAccessAge}
                  </span>
                  <span className="text-[10px] text-indigo-400 dark:text-indigo-400/80 ml-1">
                    ({partnerAccessAge === 57 ? 'Born ≥ 6 Apr 1971' : 'Born < 6 Apr 1971'})
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PRIMARY & PARTNER PROFILE INPUTS */}
      {isCouple ? (
        <div className={`grid grid-cols-1 gap-4 ${isStudioMode ? "" : "lg:grid-cols-2"}`}>
          {/* PRIMARY USER CARD */}
          <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                  Primary Profile & NMPA Timeline
                </h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                Primary
              </span>
            </div>

            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2`}>
              {/* Primary Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Primary Name</label>
                <input
                  type="text"
                  value={profile.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Alex"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Primary DOB */}
              <div className="space-y-1.5">
                <label htmlFor="primary-dob" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Date of Birth</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">Age {profile.currentAge}</span>
                </label>
                <input
                  id="primary-dob"
                  type="date"
                  value={profile.dateOfBirth || ''}
                  onChange={(e) => handleDobChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Primary Gross Annual Salary */}
              <div className="space-y-1.5">
                <label htmlFor="primary-salary" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Gross Annual Salary</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Pre-tax</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 dark:text-slate-500 font-bold text-xs">£</span>
                  <input
                    id="primary-salary"
                    type="number"
                    step="1000"
                    min="0"
                    value={profile.grossAnnualSalary}
                    onChange={(e) => updateField('grossAnnualSalary', Math.max(0, Number(e.target.value)))}
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Primary Target Retirement Age */}
              <div className="space-y-1.5">
                <label htmlFor="primary-retire-age" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>Target Retire Age</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                    {profile.targetRetirementAge || ''} yrs ({(profile.targetRetirementAge || 60) - profile.currentAge}y away)
                  </span>
                </label>
                <input
                  id="primary-retire-age"
                  type="number"
                  min={profile.currentAge + 1}
                  max="90"
                  value={profile.targetRetirementAge || ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      updateField('targetRetirementAge', '' as any);
                    } else {
                      const val = Number(raw);
                      if (!isNaN(val)) updateField('targetRetirementAge', val);
                    }
                  }}
                  onBlur={(e) => {
                    let val = Number(e.target.value);
                    if (isNaN(val) || e.target.value === '' || val <= profile.currentAge) {
                      val = profile.currentAge + 1;
                    }
                    val = Math.min(90, val);
                    updateField('targetRetirementAge', val);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Primary Private Pension Access Age Input */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Private Pension Access Age (NMPA / Scheme Age)</span>
                  <div className="group relative cursor-pointer">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                    <div className="absolute right-0 top-5 hidden group-hover:block w-72 p-3 bg-slate-900 text-white text-[11px] rounded-xl shadow-xl z-20 font-normal leading-relaxed border border-slate-800">
                      Standard UK NMPA is <strong>55</strong> (born &lt; 6 Apr 1971) or <strong>57</strong> (born ≥ 6 Apr 1971).
                      You can enter any custom age if your scheme permits or if you hold a protected pension age (e.g. 50, 55, 56, 58, 60).
                    </div>
                  </div>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="50"
                    max="75"
                    value={profile.pensionAccessAge ?? profile.protectedPensionAccessAge ?? primaryAccessAge}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateField('pensionAccessAge', val > 0 ? val : undefined);
                      updateField('protectedPensionAccessAge', val > 0 ? val : undefined);
                    }}
                    placeholder={`e.g. ${primaryAccessAge}`}
                    className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-1">
                    {[55, 57, 58, 60].map((age) => (
                      <button
                        key={age}
                        type="button"
                        onClick={() => {
                          updateField('pensionAccessAge', age);
                          updateField('protectedPensionAccessAge', age);
                        }}
                        className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          (profile.pensionAccessAge ?? profile.protectedPensionAccessAge ?? primaryAccessAge) === age
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {age}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    (Standard NMPA: Age {primaryAccessAge})
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Early Retirement Access Notice */}
            {isPrimaryEarlyRetirement && (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200 mt-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Early Retirement Access Notice ({profile.name || 'Primary User'})</p>
                  <p className="mt-0.5 text-amber-800 dark:text-amber-300 leading-relaxed">
                    You plan to retire at age <strong>{profile.targetRetirementAge}</strong>, but under UK Normal Minimum Pension Age (NMPA) rules, private pensions cannot be drawn until age <strong>{primaryAccessAge}</strong>.
                    In years {profile.targetRetirementAge} to {primaryAccessAge - 1}, your income will be drawn exclusively from <strong>ISAs and Cash pots</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* PARTNER USER CARD */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl p-4 sm:p-5 border border-indigo-100 dark:border-indigo-900/50 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-indigo-100 dark:border-indigo-900/50">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />
                <h3 className="font-extrabold text-indigo-950 dark:text-indigo-100 text-sm">
                  Partner Profile & Earnings
                </h3>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-full">
                Partner
              </span>
            </div>

            <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2`}>
              {/* Partner Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Partner Name</label>
                <input
                  type="text"
                  value={profile.partnerName || 'Partner'}
                  onChange={(e) => updateField('partnerName', e.target.value)}
                  placeholder="e.g. Sarah"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Partner Date of Birth */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Partner Date of Birth</span>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60">Age {partnerAge}</span>
                </label>
                <input
                  type="date"
                  value={profile.partnerDateOfBirth || ''}
                  onChange={(e) => handlePartnerDobChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Partner Gross Annual Salary */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>Partner Annual Salary</span>
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-semibold">Pre-tax</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 dark:text-slate-500 font-bold text-xs">£</span>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={profile.partnerGrossAnnualSalary ?? 35000}
                    onChange={(e) => updateField('partnerGrossAnnualSalary', Math.max(0, Number(e.target.value)))}
                    className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Partner Target Retirement Age */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>Partner Target Retire Age</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-extrabold text-[10px] bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60">
                    {profile.partnerTargetRetirementAge || ''} yrs ({((profile.partnerTargetRetirementAge ?? 60) - partnerAge)}y away)
                  </span>
                </label>
                <input
                  type="number"
                  min={(profile.partnerCurrentAge ?? 35) + 1}
                  max="90"
                  value={profile.partnerTargetRetirementAge ?? ''}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === '') {
                      updateField('partnerTargetRetirementAge', '' as any);
                    } else {
                      const val = Number(raw);
                      if (!isNaN(val)) updateField('partnerTargetRetirementAge', val);
                    }
                  }}
                  onBlur={(e) => {
                    const pAge = profile.partnerCurrentAge ?? 35;
                    let val = Number(e.target.value);
                    if (isNaN(val) || e.target.value === '' || val <= pAge) {
                      val = pAge + 1;
                    }
                    val = Math.min(90, val);
                    updateField('partnerTargetRetirementAge', val);
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Partner Private Pension Access Age Input */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>Partner Private Pension Access Age (NMPA / Scheme Age)</span>
                  <div className="group relative cursor-pointer">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                    <div className="absolute right-0 top-5 hidden group-hover:block w-72 p-3 bg-slate-900 text-white text-[11px] rounded-xl shadow-xl z-20 font-normal leading-relaxed border border-slate-800">
                      Standard UK NMPA is <strong>55</strong> or <strong>57</strong>.
                      Enter any custom age if partner holds a scheme protected age (e.g. 50, 55, 56, 58, 60).
                    </div>
                  </div>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="number"
                    min="50"
                    max="75"
                    value={profile.partnerPensionAccessAge ?? profile.partnerProtectedPensionAccessAge ?? partnerAccessAge}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateField('partnerPensionAccessAge', val > 0 ? val : undefined);
                      updateField('partnerProtectedPensionAccessAge', val > 0 ? val : undefined);
                    }}
                    placeholder={`e.g. ${partnerAccessAge}`}
                    className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <div className="flex items-center gap-1">
                    {[55, 57, 58, 60].map((age) => (
                      <button
                        key={age}
                        type="button"
                        onClick={() => {
                          updateField('partnerPensionAccessAge', age);
                          updateField('partnerProtectedPensionAccessAge', age);
                        }}
                        className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          (profile.partnerPensionAccessAge ?? profile.partnerProtectedPensionAccessAge ?? partnerAccessAge) === age
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {age}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    (Standard NMPA: Age {partnerAccessAge})
                  </span>
                </div>
              </div>
            </div>

            {/* Partner Early Retirement Access Notice */}
            {isPartnerEarlyRetirement && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-rose-900 dark:text-rose-200 mt-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Partner Early Retirement Access Notice ({profile.partnerName || 'Partner'})</p>
                  <p className="mt-0.5 text-rose-800 dark:text-rose-300 leading-relaxed">
                    Partner plans to retire at age <strong>{partnerRetireAge}</strong>, but under UK NMPA rules, partner private pensions cannot be accessed until age <strong>{partnerAccessAge}</strong>.
                    In partner ages {partnerRetireAge} to {partnerAccessAge - 1}, partner income will rely on partner tax-free <strong>ISAs and Cash reserves</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* SINGLE PLANNER DEMOGRAPHICS */
        <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">
                Personal Profile & Demographics
              </h3>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
              Single Planner
            </span>
          </div>

          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2`}>
            {/* Full Name */}
            <div className="space-y-1.5">
              <label htmlFor="single-name" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Full Name / Preferred Name
              </label>
              <input
                id="single-name"
                type="text"
                value={profile.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="e.g. Alex"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Date of Birth & Derived Age */}
            <div className="space-y-1.5">
              <label htmlFor="single-dob" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Date of Birth</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                  Age {profile.currentAge}
                </span>
              </label>
              <input
                id="single-dob"
                type="date"
                value={profile.dateOfBirth || ''}
                onChange={(e) => handleDobChange(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Gross Annual Salary */}
            <div className="space-y-1.5">
              <label htmlFor="single-salary" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Gross Annual Salary</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold">Pre-tax</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 dark:text-slate-500 font-bold text-xs">£</span>
                <input
                  id="single-salary"
                  type="number"
                  step="1000"
                  min="0"
                  value={profile.grossAnnualSalary}
                  onChange={(e) => updateField('grossAnnualSalary', Math.max(0, Number(e.target.value)))}
                  className="w-full pl-7 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Target Retirement Age */}
            <div className="space-y-1.5">
              <label htmlFor="single-retire-age" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                <span>Target Retire Age</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] bg-emerald-50 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                  {profile.targetRetirementAge || 60} yrs ({(profile.targetRetirementAge || 60) - profile.currentAge}y away)
                </span>
              </label>
              <input
                id="single-retire-age"
                type="number"
                min={profile.currentAge + 1}
                max="90"
                value={profile.targetRetirementAge || ''}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') {
                    updateField('targetRetirementAge', '' as any);
                  } else {
                    const val = Number(raw);
                    if (!isNaN(val)) updateField('targetRetirementAge', val);
                  }
                }}
                onBlur={(e) => {
                  let val = Number(e.target.value);
                  if (isNaN(val) || e.target.value === '' || val <= profile.currentAge) {
                    val = profile.currentAge + 1;
                  }
                  val = Math.min(90, val);
                  updateField('targetRetirementAge', val);
                }}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Private Pension Access Age Input */}
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Private Pension Access Age (NMPA / Scheme Age)</span>
                <div className="group relative cursor-pointer">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                  <div className="absolute right-0 top-5 hidden group-hover:block w-72 p-3 bg-slate-900 text-white text-[11px] rounded-xl shadow-xl z-20 font-normal leading-relaxed border border-slate-800">
                    Standard UK NMPA is <strong>55</strong> (born &lt; 6 Apr 1971) or <strong>57</strong> (born ≥ 6 Apr 1971).
                    You can enter any custom age if your scheme permits or if you hold a protected pension age (e.g. 50, 55, 56, 58, 60).
                  </div>
                </div>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min="50"
                  max="75"
                  value={profile.pensionAccessAge ?? profile.protectedPensionAccessAge ?? primaryAccessAge}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateField('pensionAccessAge', val > 0 ? val : undefined);
                    updateField('protectedPensionAccessAge', val > 0 ? val : undefined);
                  }}
                  placeholder={`e.g. ${primaryAccessAge}`}
                  className="w-24 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-extrabold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <div className="flex items-center gap-1">
                  {[55, 57, 58, 60].map((age) => (
                    <button
                      key={age}
                      type="button"
                      onClick={() => {
                        updateField('pensionAccessAge', age);
                        updateField('protectedPensionAccessAge', age);
                      }}
                      className={`px-2.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                        (profile.pensionAccessAge ?? profile.protectedPensionAccessAge ?? primaryAccessAge) === age
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {age}
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                  (Standard NMPA: Age {primaryAccessAge})
                </span>
              </div>
            </div>
          </div>

          {/* Primary Early Retirement Access Notice for Single Mode */}
          {isPrimaryEarlyRetirement && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200 mt-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Early Retirement Access Notice ({profile.name || 'Primary User'})</p>
                <p className="mt-0.5 text-amber-800 dark:text-amber-300 leading-relaxed">
                  You plan to retire at age <strong>{profile.targetRetirementAge}</strong>, but under UK Normal Minimum Pension Age (NMPA) rules, private pensions cannot be drawn until age <strong>{primaryAccessAge}</strong>.
                  In years {profile.targetRetirementAge} to {primaryAccessAge - 1}, your income will be drawn exclusively from <strong>ISAs and Cash pots</strong>.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAX REGION & TAX RELIEF METHOD */}
      <div className={`grid grid-cols-1 gap-4 pt-3 border-t border-slate-100 dark:border-slate-800 sm:grid-cols-2`}>
        {/* UK Tax Region */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>UK Tax Region</span>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Rates</span>
          </label>
          <select
            value={profile.taxRegion}
            onChange={(e) => updateField('taxRegion', e.target.value as any)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
          >
            <option value="england_ni_wales">England, NI & Wales (20/40/45%)</option>
            <option value="scotland">Scotland (19/20/21/42/45/48%)</option>
          </select>
        </div>

        {/* Tax Relief Method */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Tax Relief Method</span>
            <div className="group relative cursor-pointer">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
              <div className="absolute right-0 top-5 hidden group-hover:block w-64 p-3 bg-slate-900 text-white text-[11px] rounded-xl shadow-xl z-20 font-normal leading-relaxed border border-slate-800">
                <strong>Salary Sacrifice:</strong> Deducted before Tax & NI (saves 8% or 2% NI!).
                <br />
                <strong>Relief at Source:</strong> Net pay after tax; basic 20% added automatically, higher rate claimed via HMRC.
              </div>
            </div>
          </label>
          <select
            value={profile.pensionContributionMethod}
            onChange={(e) => updateField('pensionContributionMethod', e.target.value as any)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
          >
            <option value="salary_sacrifice">Salary Sacrifice (Tax + NI Saved)</option>
            <option value="relief_at_source">Relief at Source (SIPP / Personal)</option>
            <option value="net_pay">Net Pay Arrangement</option>
          </select>
        </div>
      </div>
    </div>
  );
};


