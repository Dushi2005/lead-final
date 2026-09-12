import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Layers,
  Play,
  Settings2,
  Sliders,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Zap,
} from 'lucide-react';
import { WorkflowExecution, WorkflowRule } from '../types/index.ts';

interface WorkflowsViewProps {
  workflows: WorkflowRule[];
  executions: WorkflowExecution[];
  onToggleWorkflow: (id: string) => void;
}

export const WorkflowsView: React.FC<WorkflowsViewProps> = ({
  workflows,
  executions,
  onToggleWorkflow,
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'executions'>('rules');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h1 className="text-lg font-bold text-white font-mono uppercase tracking-wider">
                RevOps Automation & Workflow Engine
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Deterministic rule execution: automatically assigns SDRs, triggers deep AI research, generates personalized outreach angles, and adjusts lead priority based on market triggers.
            </p>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === 'rules' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Active Rules ({workflows.length})
            </button>
            <button
              onClick={() => setActiveTab('executions')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                activeTab === 'executions'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Execution Logs ({executions.length})
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'rules' ? (
        /* Workflow Rules List */
        <div className="space-y-4">
          {workflows.map((rule) => (
            <div
              key={rule.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-white text-base">{rule.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        rule.enabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {rule.enabled ? 'Active' : 'Disabled'}
                    </span>
                    <span className="text-xs text-indigo-400 font-mono">
                      Trigger: {rule.trigger_type} ({rule.trigger_value || 'ANY'})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{rule.description}</p>
                </div>

                <button
                  onClick={() => onToggleWorkflow(rule.id)}
                  className={`p-1 text-slate-400 hover:text-white transition ${
                    rule.enabled ? 'text-indigo-400' : 'text-slate-600'
                  }`}
                  title={rule.enabled ? 'Click to Disable' : 'Click to Enable'}
                >
                  {rule.enabled ? (
                    <ToggleRight className="w-8 h-8 text-indigo-400" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-600" />
                  )}
                </button>
              </div>

              {/* Action Pipeline Steps */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-2">
                  Configured Action Pipeline ({rule.actions.length} Steps)
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {rule.actions.map((act, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono"
                    >
                      <span className="text-indigo-400 font-bold">{idx + 1}.</span>
                      <span>{act.type}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats Footer */}
              <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Total Executions: <strong className="text-slate-300">{rule.execution_count}</strong></span>
                <span>
                  Last Triggered: {rule.last_triggered_at ? new Date(rule.last_triggered_at).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Execution Logs Table */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-mono text-[11px]">
                  <th className="py-3 px-4 font-medium">Rule Name</th>
                  <th className="py-3 px-4 font-medium">Triggered On Lead</th>
                  <th className="py-3 px-4 font-medium">Actions Executed</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {executions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-xs text-slate-500">
                      No automated executions logged yet. Triggers fire upon scoring changes or signal ingestion.
                    </td>
                  </tr>
                ) : (
                  executions.map((exec) => (
                    <tr key={exec.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-semibold text-slate-200">{exec.workflow_name}</td>
                      <td className="py-3 px-4 font-mono text-indigo-300">{exec.lead_company}</td>
                      <td className="py-3 px-4 text-slate-400">
                        <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                          {exec.actions_taken.slice(0, 2).map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {exec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500 text-[11px]">
                        {new Date(exec.executed_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
