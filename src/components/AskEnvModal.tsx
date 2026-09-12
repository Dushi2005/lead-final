import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Play,
  Sparkles,
  Table,
  X,
} from 'lucide-react';
import { EnvTestResult } from '../types/index.ts';

interface AskEnvModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (key: string) => void;
  onNavigateToFullTable?: () => void;
  initialKey?: string;
}

export const AskEnvModal: React.FC<AskEnvModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  onNavigateToFullTable,
  initialKey = 'GEMINI_API_KEY',
}) => {
  const [key, setKey] = useState(initialKey);
  const [value, setValue] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<EnvTestResult | null>(null);

  const handleTest = async () => {
    if (!value.trim()) return;
    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await fetch('/api/env/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: 'Test failed',
        error: err.message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    try {
      setIsSaving(true);
      const res = await fetch('/api/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      const data = await res.json();
      if (res.ok) {
        if (onSaved) onSaved(key);
        onClose();
      } else {
        alert(data.error || 'Failed to save environment variable.');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const commonVars = [
    { key: 'GEMINI_API_KEY', desc: 'Google Gemini API key for real-time lead research & AI scoring' },
    { key: 'AI_PROVIDER', desc: 'Primary AI backend ("gemini" or "fallback")' },
    { key: 'AI_MODEL', desc: 'Gemini model identifier ("gemini-3.8-flash")' },
    { key: 'DATABASE_URL', desc: 'PostgreSQL or SQL connection URI' },
    { key: 'APP_URL', desc: 'Application base URL' },
    { key: 'GOOGLE_CLIENT_ID', desc: 'Google Workspace Client ID for Calendar sync' },
    { key: 'GROQ_API_KEY', desc: 'Optional secondary Groq inference key' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Direct Environment Variable Configuration
              </h2>
              <p className="text-xs text-slate-400">
                Ask and inject environment variables directly into active runtime
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 pt-0 space-y-4">
          {/* Quick Selector */}
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1.5">
              Select Variable Key:
            </label>
            <select
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setTestResult(null);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {commonVars.map((cv) => (
                <option key={cv.key} value={cv.key}>
                  {cv.key} - {cv.desc}
                </option>
              ))}
              <option value="CUSTOM">+ Custom Variable Key...</option>
            </select>
          </div>

          {key === 'CUSTOM' && (
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-1">
                Custom Variable Name (e.g. STRIPE_KEY):
              </label>
              <input
                type="text"
                required
                placeholder="VARIABLE_NAME"
                onChange={(e) => setKey(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Value Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-300 font-medium">
                Variable Value <span className="text-rose-400">*</span>:
              </label>
              <button
                type="button"
                onClick={() => setShowValue(!showValue)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
              >
                {showValue ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showValue ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type={showValue ? 'text' : 'password'}
                required
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setTestResult(null);
                }}
                placeholder={`Paste ${key} here...`}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-20 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting || !value.trim()}
                className="absolute right-1.5 top-1.5 px-2.5 py-1 rounded text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-800/60 disabled:opacity-40 transition flex items-center space-x-1"
              >
                {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                <span>Test</span>
              </button>
            </div>
          </div>

          {/* Test Feedback */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs font-mono border flex items-start space-x-2.5 ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold">
                  {testResult.success ? 'Verification Successful' : 'Verification Failed'}
                  {testResult.latencyMs && ` (${testResult.latencyMs}ms)`}
                </p>
                <p className="text-[11px] opacity-90 mt-0.5">
                  {testResult.message || testResult.error}
                </p>
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            {onNavigateToFullTable ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToFullTable();
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-medium"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Open Full Env Table</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !key.trim() || !value.trim()}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md disabled:opacity-40 transition flex items-center space-x-1.5"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save to Runtime</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
