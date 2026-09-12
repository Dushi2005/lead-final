import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  TestTube2,
  X,
  XCircle,
} from 'lucide-react';
import { SystemTestResult } from '../types/index.ts';

interface TestSuiteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestSuiteModal: React.FC<TestSuiteModalProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<SystemTestResult[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const handleRunAllTests = async () => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/test-runner/run-all');
      const data = await res.json();
      setTestResults(data.results || []);
      setHasRun(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const passCount = testResults.filter((t) => t.passed).length;
  const failCount = testResults.filter((t) => !t.passed).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <TestTube2 className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white font-mono uppercase tracking-wider">
                System Verification & RevOps Test Suite
              </h2>
              <p className="text-xs text-slate-400">
                Executes all 8 core test specifications covering scoring, signals, routing, calendars, and remarks.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Control Bar */}
        <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
          <div className="flex items-center space-x-3 text-xs">
            <span className="font-mono text-slate-400">Total Specs: 8</span>
            {hasRun && (
              <>
                <span>•</span>
                <span className="font-mono font-bold text-emerald-400">{passCount} PASSED</span>
                {failCount > 0 && (
                  <>
                    <span>•</span>
                    <span className="font-mono font-bold text-rose-400">{failCount} FAILED</span>
                  </>
                )}
              </>
            )}
          </div>

          <button
            onClick={handleRunAllTests}
            disabled={isRunning}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running 8 Tests...' : 'Execute Test Suite'}</span>
          </button>
        </div>

        {/* Tests List */}
        <div className="space-y-3">
          {!hasRun && !isRunning && (
            <div className="py-16 text-center text-xs text-slate-500 space-y-2">
              <TestTube2 className="w-8 h-8 mx-auto text-slate-600" />
              <p>Click "Execute Test Suite" to run automated end-to-end assertions against the RevOps engine.</p>
            </div>
          )}

          {testResults.map((test, idx) => (
            <div
              key={test.id}
              className={`p-4 rounded-xl border text-xs space-y-2 transition ${
                test.passed
                  ? 'bg-slate-950 border-slate-800/80 hover:border-slate-700'
                  : 'bg-rose-950/20 border-rose-900/60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2.5">
                  {test.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <div className="font-semibold text-slate-100 flex items-center space-x-2">
                      <span className="font-mono text-cyan-400 text-[11px]">{idx + 1}.</span>
                      <span>{test.title}</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">{test.details}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      test.passed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {test.passed ? 'PASS' : 'FAIL'}
                  </span>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">
                    {test.execution_time_ms}ms
                  </div>
                </div>
              </div>

              {/* Expected vs Actual Diff */}
              <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2.5 rounded-lg font-mono text-[11px] text-slate-300">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">Expected:</span>
                  <div className="truncate">{test.expected}</div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase">Actual:</span>
                  <div className="truncate text-emerald-400">{test.actual}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
