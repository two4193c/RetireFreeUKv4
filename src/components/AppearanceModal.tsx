import React from 'react';
import { X, Palette, Type, Monitor, Sun, Moon } from 'lucide-react';

export type ColorTheme = 'emerald' | 'blue' | 'indigo' | 'rose' | 'amber';
export type UiScale = 'compact' | 'normal' | 'large';

interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  colorTheme: ColorTheme;
  onColorThemeChange: (theme: ColorTheme) => void;
  uiScale: UiScale;
  onUiScaleChange: (scale: UiScale) => void;
  theme: 'light' | 'dark';
  onThemeChange: () => void;
  appName?: string;
  onAppNameChange?: (name: string) => void;
}

export const AppearanceModal: React.FC<AppearanceModalProps> = ({
  isOpen,
  onClose,
  colorTheme,
  onColorThemeChange,
  uiScale,
  onUiScaleChange,
  theme,
  onThemeChange,
  appName = "RetireFree UK",
  onAppNameChange = (name: string) => {},
}) => {
  if (!isOpen) return null;

  const themes: { id: ColorTheme; name: string; colorClass: string }[] = [
    { id: 'emerald', name: 'Emerald', colorClass: 'bg-[#10b981]' },
    { id: 'blue', name: 'Blue', colorClass: 'bg-[#3b82f6]' },
    { id: 'indigo', name: 'Indigo', colorClass: 'bg-[#6366f1]' },
    { id: 'rose', name: 'Rose', colorClass: 'bg-[#f43f5e]' },
    { id: 'amber', name: 'Amber', colorClass: 'bg-[#f59e0b]' },
  ];

  const scales: { id: UiScale; name: string; desc: string }[] = [
    { id: 'compact', name: 'Compact', desc: 'Smaller text, denser UI' },
    { id: 'normal', name: 'Comfortable', desc: 'Default layout' },
    { id: 'large', name: 'Large', desc: 'Larger text and spacing' },
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/50 rounded-xl text-primary-600 dark:text-primary-400">
              <Monitor className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight">Appearance Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          
          {/* App Branding Picker */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              <Monitor className="w-4 h-4 text-slate-400" />
              <span>Application Branding</span>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <input
                type="text"
                value={appName}
                onChange={(e) => onAppNameChange(e.target.value)}
                placeholder="RetireFree UK"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50"
              />
            </div>
          </div>

          {/* Dark Mode Picker */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-slate-400" /> : <Sun className="w-4 h-4 text-slate-400" />}
              <span>Color Mode</span>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => theme === 'dark' && onThemeChange()}
                className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${theme === 'light' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-300'}`}
              >
                <Sun className="w-4 h-4" /> Light
              </button>
              <button
                onClick={() => theme === 'light' && onThemeChange()}
                className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${theme === 'dark' ? 'bg-slate-700 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Moon className="w-4 h-4" /> Dark
              </button>
            </div>
          </div>

          {/* Accent Color Picker */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              <Palette className="w-4 h-4 text-slate-400" />
              <span>Accent Color</span>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => onColorThemeChange(t.id)}
                  title={t.name}
                  className={`w-full aspect-square rounded-full flex items-center justify-center transition-all shadow-sm border-2 ${colorTheme === t.id ? 'border-primary-500 scale-110 ring-4 ring-primary-500/20' : 'border-transparent hover:scale-105'}`}
                >
                  <div className={`w-full h-full rounded-full ${t.colorClass}`}></div>
                </button>
              ))}
            </div>
          </div>

          {/* UI Scale Picker */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
              <Type className="w-4 h-4 text-slate-400" />
              <span>Interface Density</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {scales.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onUiScaleChange(s.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${uiScale === s.id ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-600 dark:text-slate-400'}`}
                >
                  <span className="font-bold">{s.name}</span>
                  <span className="text-[10px] opacity-70 uppercase tracking-wider">{s.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors"
        >
          Done
        </button>

      </div>
    </div>
  );
};