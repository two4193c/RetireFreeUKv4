import React, { useState } from 'react';
import { UserProfile, DecumulationLifeEvent, LifeEventType, LifeEventPotTarget, ItemOwner } from '../types';
import {
  Sparkles,
  Calendar,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Home,
  Gift,
  Car,
  Plane,
  Wrench,
  User,
  Users,
  Info,
  Banknote,
  DollarSign,
  Heart,
  HelpCircle,
} from 'lucide-react';

interface LifeEventsDecumulationCardProps {
  profile: UserProfile;
  onChange: (updatedProfile: UserProfile) => void;
}

const POT_TARGET_OPTIONS: { value: LifeEventPotTarget; label: string }[] = [
  { value: 'cash_savings', label: 'Cash Savings Account' },
  { value: 'stocks_and_shares_isa', label: 'Stocks & Shares ISA' },
  { value: 'cash_isa', label: 'Cash ISA' },
  { value: 'sipp', label: 'SIPP / Pension Pot' },
  { value: 'gia', label: 'General Investment Account (GIA)' },
];

export const LifeEventsDecumulationCard: React.FC<LifeEventsDecumulationCardProps> = ({
  profile,
  onChange,
}) => {
  const events = profile.decumulationLifeEvents || [];
  const isCouple = Boolean(profile.isCouplePlanning);
  const [activeOwnerFilter, setActiveOwnerFilter] = useState<'all' | 'primary' | 'partner'>('all');

  const handleAddPreset = (
    presetType: 'downsizing' | 'inheritance' | 'car' | 'trip' | 'renovation' | 'gift' | 'custom'
  ) => {
    const ownerToAssign: ItemOwner = isCouple
      ? activeOwnerFilter === 'partner'
        ? 'partner'
        : 'primary'
      : 'primary';

    const defaultRetAge = profile.targetRetirementAge || 60;
    let newEvent: DecumulationLifeEvent;

    switch (presetType) {
      case 'downsizing':
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'Property Downsizing Lump Sum',
          owner: ownerToAssign,
          type: 'income',
          amount: 100000,
          age: Math.min(85, defaultRetAge + 8),
          targetPot: 'cash_savings',
          inflationLinked: true,
          enabled: true,
          description: 'Equity released from downsizing primary residence in mid-retirement',
        };
        break;
      case 'inheritance':
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'Inheritance Received',
          owner: ownerToAssign,
          type: 'income',
          amount: 50000,
          age: Math.min(85, defaultRetAge + 10),
          targetPot: 'stocks_and_shares_isa',
          inflationLinked: true,
          enabled: true,
          description: 'Expected inheritance legacy payment',
        };
        break;
      case 'car':
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'New Vehicle Purchase',
          owner: ownerToAssign,
          type: 'expense',
          amount: 25000,
          age: Math.min(85, defaultRetAge + 2),
          targetPot: 'cash_savings',
          inflationLinked: true,
          enabled: true,
          description: 'One-off car replacement or electric vehicle upgrade',
        };
        break;
      case 'trip':
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'World Trip / Bucket List Holiday',
          owner: ownerToAssign,
          type: 'expense',
          amount: 15000,
          age: Math.min(85, defaultRetAge + 1),
          targetPot: 'cash_savings',
          inflationLinked: true,
          enabled: true,
          description: 'Special celebratory retirement travel or extended cruise',
        };
        break;
      case 'renovation':
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'Home Improvement / Adaptations',
          owner: ownerToAssign,
          type: 'expense',
          amount: 20000,
          age: Math.min(85, defaultRetAge + 5),
          targetPot: 'cash_savings',
          inflationLinked: true,
          enabled: true,
          description: 'Kitchen/bathroom renovation or accessibility adaptations',
        };
        break;
      case 'gift':
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'Gift to Children / Family Support',
          owner: ownerToAssign,
          type: 'expense',
          amount: 30000,
          age: Math.min(85, defaultRetAge + 7),
          targetPot: 'cash_savings',
          inflationLinked: true,
          enabled: true,
          description: 'House deposit contribution or grandchild education support',
        };
        break;
      default:
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'Planned Life Event',
          owner: ownerToAssign,
          type: 'expense',
          amount: 10000,
          age: Math.min(85, defaultRetAge + 3),
          targetPot: 'cash_savings',
          inflationLinked: true,
          enabled: true,
          description: 'One-off financial inflow or outlay during retirement',
        };
    }

    onChange({
      ...profile,
      decumulationLifeEvents: [...events, newEvent],
    });
  };

  const handleUpdateEvent = (id: string, updates: Partial<DecumulationLifeEvent>) => {
    const updated = events.map((e) => (e.id === id ? { ...e, ...updates } : e));
    onChange({
      ...profile,
      decumulationLifeEvents: updated,
    });
  };

  const handleDeleteEvent = (id: string) => {
    const updated = events.filter((e) => e.id !== id);
    onChange({
      ...profile,
      decumulationLifeEvents: updated,
    });
  };

  // Filtered view
  const filteredEvents = events.filter((e) => {
    if (!isCouple || activeOwnerFilter === 'all') return true;
    return (e.owner || 'primary') === activeOwnerFilter;
  });

  const activeEvents = events.filter((e) => e.enabled);
  const totalInflows = activeEvents
    .filter((e) => e.type === 'income')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalOutflows = activeEvents
    .filter((e) => e.type === 'expense')
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netImpact = totalInflows - totalOutflows;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Calendar className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Life Events in Decumulation
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {activeEvents.length} Active {activeEvents.length === 1 ? 'Event' : 'Events'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">
            Model one-off planned expenses or income in retirement—such as property downsizing lump sums, inheritances, buying a vehicle, world trips, home renovations, or gifting to family—and see their direct impact on your lifetime projection graph.
          </p>
        </div>

        {/* Couple Owner Filter */}
        {isCouple && (
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl self-start sm:self-auto border border-slate-200/60 dark:border-slate-700/60">
            <button
              onClick={() => setActiveOwnerFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeOwnerFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveOwnerFilter('primary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeOwnerFilter === 'primary'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{profile.name || 'Primary'}</span>
            </button>
            <button
              onClick={() => setActiveOwnerFilter('partner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                activeOwnerFilter === 'partner'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{profile.partnerName || 'Partner'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Preset Action Buttons */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          Quick-Add Planned Life Events
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
          <button
            onClick={() => handleAddPreset('downsizing')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full text-emerald-600 dark:text-emerald-400">
              <Home className="w-4 h-4" />
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 block">
                Downsizing
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                +£100k (Income)
              </span>
            </div>
          </button>

          <button
            onClick={() => handleAddPreset('inheritance')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full text-emerald-600 dark:text-emerald-400">
              <Gift className="w-4 h-4" />
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 block">
                Inheritance
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                +£50k (Income)
              </span>
            </div>
          </button>

          <button
            onClick={() => handleAddPreset('car')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full text-rose-600 dark:text-rose-400">
              <Car className="w-4 h-4" />
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-700 dark:group-hover:text-rose-300 block">
                New Vehicle
              </span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                -£25k (Expense)
              </span>
            </div>
          </button>

          <button
            onClick={() => handleAddPreset('trip')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full text-rose-600 dark:text-rose-400">
              <Plane className="w-4 h-4" />
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-700 dark:group-hover:text-rose-300 block">
                World Trip
              </span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                -£15k (Expense)
              </span>
            </div>
          </button>

          <button
            onClick={() => handleAddPreset('renovation')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full text-rose-600 dark:text-rose-400">
              <Wrench className="w-4 h-4" />
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-700 dark:group-hover:text-rose-300 block">
                Renovation
              </span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                -£20k (Expense)
              </span>
            </div>
          </button>

          <button
            onClick={() => handleAddPreset('gift')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full text-rose-600 dark:text-rose-400">
              <Gift className="w-4 h-4" />
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-700 dark:group-hover:text-rose-300 block">
                Gift to Family
              </span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                -£30k (Expense)
              </span>
            </div>
          </button>

          <button
            onClick={() => handleAddPreset('custom')}
            className="p-2.5 rounded-xl border border-dashed border-purple-300 dark:border-purple-800/80 bg-purple-50/40 dark:bg-purple-950/20 hover:bg-purple-100/60 dark:hover:bg-purple-900/40 transition-all text-left flex flex-col justify-between group cursor-pointer col-span-2 sm:col-span-1"
          >
            <div className="flex items-center justify-between w-full text-purple-600 dark:text-purple-400">
              <Plus className="w-4 h-4" />
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-purple-900 dark:text-purple-200 block">
                Custom Event
              </span>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                Add Event
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* KPI Summary Banner */}
      {activeEvents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-800">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              Total Decumulation Inflows
            </span>
            <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
              +£{totalInflows.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              Total Decumulation Outflows
            </span>
            <div className="text-base font-extrabold text-rose-600 dark:text-rose-400">
              -£{totalOutflows.toLocaleString()}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Banknote className="w-3.5 h-3.5 text-purple-500" />
              Net Portfolio Lifetime Impact
            </span>
            <div
              className={`text-base font-extrabold ${
                netImpact >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {netImpact >= 0 ? `+£${netImpact.toLocaleString()}` : `-£${Math.abs(netImpact).toLocaleString()}`}
            </div>
          </div>
        </div>
      )}

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <Calendar className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            No Life Events Planned Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Click one of the quick-add presets above to model property downsizing, inheritance, car purchases, or world trips.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const isIncome = event.type === 'income';

            return (
              <div
                key={event.id}
                className={`p-4 rounded-2xl border transition-all space-y-4 ${
                  event.enabled
                    ? isIncome
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/80 dark:border-emerald-900/60'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80'
                    : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/40 dark:border-slate-800/40 opacity-60'
                }`}
              >
                {/* Event Row Header Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={event.enabled}
                        onChange={(e) => handleUpdateEvent(event.id, { enabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-600 peer-checked:bg-purple-600 rounded-full"></div>
                    </label>

                    {/* Name Input */}
                    <input
                      type="text"
                      value={event.name}
                      onChange={(e) => handleUpdateEvent(event.id, { name: e.target.value })}
                      placeholder="e.g. Property Downsizing"
                      className="text-sm font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500 w-full sm:w-64"
                    />

                    {/* Income vs Expense Badge */}
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateEvent(event.id, { type: isIncome ? 'expense' : 'income' })
                      }
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-all shrink-0 ${
                        isIncome
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-rose-600 text-white shadow-xs'
                      }`}
                      title="Click to toggle between Income and Expense"
                    >
                      {isIncome ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span>{isIncome ? 'Inflow (Income)' : 'Outflow (Expense)'}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      title="Remove event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
                  {/* Amount (£) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Banknote className="w-3.5 h-3.5 text-slate-400" />
                      Amount (£)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">£</span>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={event.amount || ''}
                        onChange={(e) =>
                          handleUpdateEvent(event.id, { amount: Math.max(0, Number(e.target.value)) })
                        }
                        className="w-full pl-7 pr-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Age when event occurs */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Target Age
                      </label>
                      <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400">
                        Age {event.age}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={profile.currentAge}
                        max={profile.lifeExpectancyAge || 90}
                        value={event.age}
                        onChange={(e) =>
                          handleUpdateEvent(event.id, { age: Number(e.target.value) })
                        }
                        className="w-full accent-purple-600 cursor-pointer"
                      />
                      <input
                        type="number"
                        min={profile.currentAge}
                        max={100}
                        value={event.age}
                        onChange={(e) =>
                          handleUpdateEvent(event.id, { age: Number(e.target.value) })
                        }
                        className="w-16 px-2 py-1 text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-center"
                      />
                    </div>
                  </div>

                  {/* Target / Source Pot */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      {isIncome ? 'Target Pot (Inflow)' : 'Primary Pot (Outflow)'}
                    </label>
                    <select
                      value={event.targetPot || 'cash_savings'}
                      onChange={(e) =>
                        handleUpdateEvent(event.id, {
                          targetPot: e.target.value as LifeEventPotTarget,
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 cursor-pointer"
                    >
                      {POT_TARGET_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Owner (if couple) */}
                  {isCouple ? (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Owner
                      </label>
                      <select
                        value={event.owner || 'primary'}
                        onChange={(e) =>
                          handleUpdateEvent(event.id, {
                            owner: e.target.value as ItemOwner,
                          })
                        }
                        className="w-full px-3 py-1.5 text-xs font-bold bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 cursor-pointer"
                      >
                        <option value="primary">{profile.name || 'Primary Person'}</option>
                        <option value="partner">{profile.partnerName || 'Partner'}</option>
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-1 flex items-center pt-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={event.inflationLinked ?? true}
                          onChange={(e) =>
                            handleUpdateEvent(event.id, { inflationLinked: e.target.checked })
                          }
                          className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Scale with CPI Inflation</span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Additional Settings & Notes Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center gap-4">
                    {isCouple && (
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={event.inflationLinked ?? true}
                          onChange={(e) =>
                            handleUpdateEvent(event.id, { inflationLinked: e.target.checked })
                          }
                          className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                        />
                        <span>Scale with CPI Inflation</span>
                      </label>
                    )}
                  </div>

                  <input
                    type="text"
                    value={event.description || ''}
                    onChange={(e) => handleUpdateEvent(event.id, { description: e.target.value })}
                    placeholder="Add notes or details (e.g. expected sale price, model name)..."
                    className="text-xs text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 rounded-xl px-3 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500 flex-1 max-w-xl"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
