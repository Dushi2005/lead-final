import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  Flame,
  RefreshCw,
  RotateCcw,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import { ICPConfig } from '../types/index.ts';
import { defaultICPConfig } from '../lib/scoringEngine.ts';

interface ICPConfigModalProps {
  config: ICPConfig;
  isOpen: boolean;
  onClose: () => void;
  onSaveConfig: (newConfig: ICPConfig) => Promise<{ updatedCount: number }>;
}

export const ICPConfigModal: React.FC<ICPConfigModalProps> = ({
  config,
  isOpen,
  onClose,
  onSaveConfig,
}) => {
  const [weights, setWeights] = useState<ICPConfig['weights']>(() => ({
    ...defaultICPConfig.weights,
    ...(config?.weights || {}),
  }));
  const [thresholds, setThresholds] = useState<ICPConfig['category_thresholds']>(() => ({
    ...defaultICPConfig.category_thresholds,
    ...(config?.category_thresholds || {}),
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  React.useEffect(() => {
    if (config && isOpen) {
      setWeights({
        ...defaultICPConfig.weights,
        ...(config.weights || {}),
      });
      setThresholds({
        ...defaultICPConfig.category_thresholds,
        ...(config.category_thresholds || {}),
      });
    }
  }, [config, isOpen]);

  const totalWeight =
    Number(weights.icp_fit_max ?? 30) +
    Number(weights.hiring_activity_max ?? 20) +
    Number(weights.persona_max ?? 15) +
    Number(weights.company_growth_max ?? 15) +
    Number(weights.tech_stack_max ?? 10) +
    Number(weights.intent_max ?? 10);

  const handleResetToDefault = () => {
    setWeights(defaultICPConfig.weights);
    setThresholds(defaultICPConfig.category_thresholds);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSavedCount(null);
    try {
      const res = await onSaveConfig({
        ...config,
        weights,
        category_thresholds: thresholds,
      });
      setSavedCount(res.updatedCount);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                RevOps ICP Scoring Configuration Center
              </h2>
              <p className="text-xs text-slate-400">
                Transparent framework weights & category thresholds. No hardcoded logic.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {savedCount !== null && (
          <div className="p-3.5 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between">
            <span className="flex items-center space-x-2 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                Successfully saved framework weights and re-scored <strong>{savedCount}</strong> leads across the system!
              </span>
            </span>
          </div>
        )}

        {/* 5 Core Dimension Weights */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
              1. Five Core Dimension Weights
            </span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                totalWeight === 100
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              Sum: {totalWeight} / 100%
            </span>
          </div>

          <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            {[
              { key: 'icp_fit_max', label: 'Company Fit (Industry, Size, Geography, Complexity)', max: 40, defaultVal: 30 },
              { key: 'hiring_activity_max', label: 'Hiring Velocity (Active Jobs, Recruiter Requisitions, Growth)', max: 40, defaultVal: 20 },
              { key: 'tech_stack_max', label: 'Technology Stack (Enterprise ATS, Sourcing Tools, AI Adoption)', max: 30, defaultVal: 10 },
              { key: 'persona_max', label: 'Persona Fit (CPO, VP TA, Head of TA vs Junior Roles)', max: 25, defaultVal: 15 },
              { key: 'company_growth_max', label: 'Company Growth & Funding (Series B+, Headcount Velocity)', max: 25, defaultVal: 15 },
              { key: 'intent_max', label: 'Intent & Signals (Funding, News, Leadership Changes)', max: 25, defaultVal: 10 },
            ].map((field) => {
              const currentVal = Number((weights as any)[field.key] ?? field.defaultVal);
              return (
                <div key={field.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">{field.label}</span>
                    <span className="font-mono font-bold text-indigo-400">
                      {currentVal}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={field.max}
                    value={currentVal}
                    onChange={(e) =>
                      setWeights({
                        ...weights,
                        [field.key]: Number(e.target.value),
                      })
                    }
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Thresholds */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
            2. Category Classification Cutoffs (0 - 100)
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { key: 'hot_min', label: 'HOT Cutoff', color: 'text-rose-400 border-rose-800', defaultVal: 90 },
              { key: 'high_priority_min', label: 'High Priority', color: 'text-amber-400 border-amber-800', defaultVal: 75 },
              { key: 'qualified_min', label: 'Qualified', color: 'text-blue-400 border-blue-800', defaultVal: 60 },
              { key: 'nurture_min', label: 'Nurture', color: 'text-purple-400 border-purple-800', defaultVal: 40 },
            ].map((thresh) => {
              const currentVal = Number((thresholds as any)[thresh.key] ?? thresh.defaultVal);
              return (
                <div key={thresh.key} className={`bg-slate-950 p-3 rounded-xl border ${thresh.color}`}>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">{thresh.label}</label>
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-slate-500 font-mono">&gt;=</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={currentVal}
                      onChange={(e) =>
                        setThresholds({
                          ...thresholds,
                          [thresh.key]: Number(e.target.value),
                        })
                      }
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={handleResetToDefault}
            className="flex items-center space-x-1 text-xs text-slate-400 hover:text-slate-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Resourcely Defaults</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || totalWeight !== 100}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Re-scoring pipeline...' : 'Save & Re-Score All Leads'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
