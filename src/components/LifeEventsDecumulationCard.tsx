import React, { useState } from 'react';
import { UserProfile, DecumulationLifeEvent, LifeEventType, LifeEventPotTarget, ItemOwner, InvestmentPots, YearProjection } from '../types';
import { MilestoneTimelineCard } from './MilestoneTimelineCard';
import { ModalShell } from './ModalShell';
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
  Pencil,
  CreditCard,
} from 'lucide-react';

interface LifeEventsDecumulationCardProps {
  isStudioMode?: boolean;
  profile: UserProfile;
  pots?: InvestmentPots;
  projections?: YearProjection[];
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
  pots,
  projections,
  onChange,

  isStudioMode}) => {
  const events = profile.decumulationLifeEvents || [];
  const isCouple = Boolean(profile.isCouplePlanning);
  const [activeOwnerFilter, setActiveOwnerFilter] = useState<'all' | 'primary' | 'partner'>('all');
  const [editItem, setEditItem] = useState<DecumulationLifeEvent | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const openAddModal = (
    presetType: 'downsizing' | 'inheritance' | 'car' | 'trip' | 'renovation' | 'gift' | 'debt' | 'custom'
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
      case 'debt':
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'Debt/Mortgage Payoff',
          owner: ownerToAssign,
          type: 'expense',
          amount: 50000,
          age: defaultRetAge,
          targetPot: 'cash_savings',
          inflationLinked: false,
          enabled: true,
          description: 'Lump sum payoff of remaining mortgage or debt balance at retirement',
        };
        break;
      case 'custom':
      default:
        newEvent = {
          id: `life_${Date.now()}`,
          name: 'Custom Life Event',
          owner: ownerToAssign,
          type: 'expense',
          amount: 10000,
          age: defaultRetAge,
          targetPot: 'cash_savings',
          inflationLinked: true,
          enabled: true,
          description: '',
        };
    }

    setEditItem(newEvent);
    setIsAdding(true);
  };

  const handleSaveModal = () => {
    if (!editItem) return;
    let updated: DecumulationLifeEvent[];
    if (isAdding) {
      updated = [...events, editItem];
    } else {
      updated = events.map((e) => (e.id === editItem.id ? editItem : e));
    }
    onChange({
      ...profile,
      decumulationLifeEvents: updated,
    });
    setEditItem(null);
    setIsAdding(false);
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
              Life Events
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
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
          <button
            onClick={() => openAddModal('downsizing')}
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
            onClick={() => openAddModal('inheritance')}
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
            onClick={() => openAddModal('car')}
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
            onClick={() => openAddModal('trip')}
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
            onClick={() => openAddModal('debt')}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 transition-all text-left flex flex-col justify-between group cursor-pointer"
          >
            <div className="flex items-center justify-between w-full text-rose-600 dark:text-rose-400">
              <CreditCard className="w-4 h-4" />
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
            <div className="mt-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-rose-700 dark:group-hover:text-rose-300 block">
                Debt Payoff
              </span>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
                -£50k (Expense)
              </span>
            </div>
          </button>

          <button
            onClick={() => openAddModal('renovation')}
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
            onClick={() => openAddModal('gift')}
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
            onClick={() => openAddModal('custom')}
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
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                  event.enabled
                    ? isIncome
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200/80 dark:border-emerald-900/60'
                      : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80'
                    : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/40 dark:border-slate-800/40 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${isIncome ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400'}`}>
                    {isIncome ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{event.name}</h4>
                      {!event.enabled && (
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 bg-slate-200 dark:bg-slate-700 px-1.5 rounded">Disabled</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                      Age {event.age} • £{Number(event.amount).toLocaleString()} {isCouple && `• ${event.owner === 'partner' ? profile.partnerName || 'Partner' : profile.name || 'Primary'}`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditItem({ ...event });
                      setIsAdding(false);
                    }}
                    className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-xl transition-colors cursor-pointer"
                    title="Edit event"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
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
            );
          })}
        </div>
      )}

      {/* Edit / Add Modal */}
      {editItem && (
        <ModalShell
          title={isAdding ? 'Add Life Event' : 'Edit Life Event'}
          onSave={handleSaveModal}
          onCancel={() => {
            setEditItem(null);
            setIsAdding(false);
          }}
          saveLabel={isAdding ? 'Add Event' : 'Save Changes'}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Enabled</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={editItem.enabled}
                  onChange={(e) => setEditItem({ ...editItem, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-600 peer-checked:bg-purple-600 rounded-full"></div>
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Event Name</label>
              <input
                type="text"
                value={editItem.name}
                onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                className="w-full text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditItem({ ...editItem, type: 'income' })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      editItem.type === 'income'
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-300'
                        : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditItem({ ...editItem, type: 'expense' })}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      editItem.type === 'expense'
                        ? 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-900/40 dark:border-rose-700 dark:text-rose-300'
                        : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                    }`}
                  >
                    Expense
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Amount (£)</label>
                <input
                  type="number"
                  min="0"
                  value={editItem.amount}
                  onChange={(e) => setEditItem({ ...editItem, amount: Math.max(0, Number(e.target.value)) })}
                  className="w-full text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Target Age</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={profile.currentAge || 0}
                  max={profile.lifeExpectancyAge || 90}
                  value={editItem.age}
                  onChange={(e) => setEditItem({ ...editItem, age: Number(e.target.value) })}
                  className="flex-1 accent-purple-600 cursor-pointer"
                />
                <span className="text-sm font-bold w-12 text-center">{editItem.age}</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Target Pot</label>
              <select
                value={editItem.targetPot || 'cash_savings'}
                onChange={(e) => setEditItem({ ...editItem, targetPot: e.target.value as LifeEventPotTarget })}
                className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500"
              >
                {POT_TARGET_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {isCouple && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Owner</label>
                <select
                  value={editItem.owner || 'primary'}
                  onChange={(e) => setEditItem({ ...editItem, owner: e.target.value as ItemOwner })}
                  className="w-full px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500"
                >
                  <option value="primary">{profile.name || 'Primary Person'}</option>
                  <option value="partner">{profile.partnerName || 'Partner'}</option>
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editItem.inflationLinked ?? true}
                  onChange={(e) => setEditItem({ ...editItem, inflationLinked: e.target.checked })}
                  className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                />
                <span>Scale with CPI Inflation</span>
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Description</label>
              <textarea
                value={editItem.description || ''}
                onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-purple-500 min-h-[80px]"
                placeholder="Add notes or details..."
              />
            </div>
          </div>
        </ModalShell>
      )}

      {pots && projections && (
        <MilestoneTimelineCard 
          profile={profile} 
          pots={pots} 
          projections={projections} 
          onChange={onChange} 
          isEmbedded={true}
          onEditEvent={(id) => {
            const ev = profile.decumulationLifeEvents?.find(e => e.id === id);
            if (ev) {
              setEditItem(ev);
              setIsAdding(false);
            }
          }}
        />
      )}
    </div>
  );
};
