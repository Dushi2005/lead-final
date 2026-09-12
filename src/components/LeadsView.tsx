import React, { useMemo, useState } from 'react';
import {
  ArrowUpDown,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileSpreadsheet,
  Filter,
  Flame,
  MessageSquare,
  PhoneCall,
  Plus,
  Search,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import { Lead, LeadCategory, User as UserType } from '../types/index.ts';

interface LeadsViewProps {
  leads: Lead[];
  users: UserType[];
  onSelectLead: (lead: Lead) => void;
  onApplyRemark: (leadId: string, remarkKey: any) => void;
  onOpenImportModal?: () => void;
  onOpenNewLeadModal?: () => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  leads,
  users,
  onSelectLead,
  onApplyRemark,
  onOpenImportModal,
  onOpenNewLeadModal,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedSdr, setSelectedSdr] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortField, setSortField] = useState<'score_desc' | 'score_asc' | 'updated_desc'>('score_desc');
  const [activeRemarkMenuLeadId, setActiveRemarkMenuLeadId] = useState<string | null>(null);

  // Filter & Search Logic
  const filteredLeads = useMemo(() => {
    let list = [...leads];

    if (selectedCategory !== 'ALL') {
      list = list.filter((l) => l.category === selectedCategory);
    }

    if (selectedStatus !== 'ALL') {
      list = list.filter((l) => l.status === selectedStatus);
    }

    if (selectedSdr !== 'ALL') {
      list = list.filter((l) => l.owner_sdr_id === selectedSdr);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.company?.name.toLowerCase().includes(q) ||
          l.contact?.first_name.toLowerCase().includes(q) ||
          l.contact?.last_name.toLowerCase().includes(q) ||
          l.company?.industry.toLowerCase().includes(q) ||
          l.contact?.title.toLowerCase().includes(q) ||
          l.company?.ats_usage.toLowerCase().includes(q)
      );
    }

    if (sortField === 'score_desc') {
      list.sort((a, b) => b.score - a.score);
    } else if (sortField === 'score_asc') {
      list.sort((a, b) => a.score - b.score);
    } else if (sortField === 'updated_desc') {
      list.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }

    return list;
  }, [leads, selectedCategory, selectedStatus, selectedSdr, searchQuery, sortField]);

  const categories = [
    { id: 'ALL', label: 'All Leads', count: leads.length },
    { id: 'HOT', label: '🔥 HOT (90+)', count: leads.filter((l) => l.category === 'HOT').length, pillColor: 'text-rose-400 bg-rose-950/40 border-rose-800/60' },
    { id: 'HIGH_PRIORITY', label: '⚡ High Priority (75-89)', count: leads.filter((l) => l.category === 'HIGH_PRIORITY').length, pillColor: 'text-amber-400 bg-amber-950/40 border-amber-800/60' },
    { id: 'QUALIFIED', label: 'Qualified (60-74)', count: leads.filter((l) => l.category === 'QUALIFIED').length, pillColor: 'text-blue-400 bg-blue-950/40 border-blue-800/60' },
    { id: 'NURTURE', label: 'Nurture (45-59)', count: leads.filter((l) => l.category === 'NURTURE').length, pillColor: 'text-purple-400 bg-purple-950/40 border-purple-800/60' },
    { id: 'LOW_FIT', label: 'Low Fit (<45)', count: leads.filter((l) => l.category === 'LOW_FIT').length, pillColor: 'text-slate-400 bg-slate-800 border-slate-700' },
  ];

  const quickRemarkOptions = [
    { key: 'INTERESTED', label: '🔥 Interested', icon: '🔥', desc: 'Positive reply / wants info (+5)' },
    { key: 'MEETING_NEXT_STEP', label: '🎯 Meeting / Demo', icon: '🎯', desc: 'Booked discovery demo (+8)' },
    { key: 'FOLLOWUP_REQUIRED', label: '📞 Follow-up Required', icon: '📞', desc: 'Questions pending reply' },
    { key: 'NOT_NOW', label: '⏳ Not Now', icon: '⏳', desc: 'Revisit in 60-90 days (-5)' },
    { key: 'NOT_INTERESTED', label: '❌ Not Interested', icon: '❌', desc: 'Satisfied / competitor (-15)' },
  ];

  return (
    <div className="space-y-4">
      {/* Category Pills Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                  : cat.pillColor || 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters, Search & Sort Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery || ''}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search company, contact, ATS, industry..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-[10px] text-slate-400 absolute right-2.5 top-2.5 hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Secondary Selectors */}
        <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
          {/* Status Filter */}
          <select
            value={selectedStatus || 'ALL'}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="ENRICHED">Enriched</option>
            <option value="RESEARCHED">Researched</option>
            <option value="CONTACTED">Contacted</option>
            <option value="REPLIED">Replied</option>
            <option value="MEETING_BOOKED">Meeting Booked</option>
            <option value="NURTURE">Nurture</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
          </select>

          {/* SDR Owner Filter */}
          <select
            value={selectedSdr || 'ALL'}
            onChange={(e) => setSelectedSdr(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All SDR Owners</option>
            {users
              .filter((u) => u.role === 'SDR')
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </select>

          {/* Sort Field */}
          <select
            value={sortField || 'score_desc'}
            onChange={(e: any) => setSortField(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="score_desc">Highest Score (0-100)</option>
            <option value="score_asc">Lowest Score</option>
            <option value="updated_desc">Recently Updated</option>
          </select>

          {/* Import CSV Action */}
          {onOpenImportModal && (
            <button
              onClick={onOpenImportModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition shrink-0"
              title="Import leads from CSV file or spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import CSV</span>
            </button>
          )}

          {/* Add Lead Action */}
          {onOpenNewLeadModal && (
            <button
              onClick={onOpenNewLeadModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Lead</span>
            </button>
          )}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-mono text-[11px]">
                <th className="py-3 px-4 font-medium">Lead & Prospect</th>
                <th className="py-3 px-3 font-medium">ICP Score</th>
                <th className="py-3 px-3 font-medium hidden lg:table-cell">Dimension Breakdown</th>
                <th className="py-3 px-3 font-medium">Recommended Next Action</th>
                <th className="py-3 px-3 font-medium">Quick Remark</th>
                <th className="py-3 px-3 font-medium hidden md:table-cell">SDR / AE</th>
                <th className="py-3 px-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No leads matching criteria. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const bd = lead.score_breakdown;
                  const isHot = lead.category === 'HOT';
                  const isHigh = lead.category === 'HIGH_PRIORITY';

                  return (
                    <tr
                      key={lead.id}
                      onClick={() => onSelectLead(lead)}
                      className="hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      {/* Lead & Company */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-100 group-hover:text-indigo-400 transition text-sm">
                              {lead.company?.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                              {lead.company?.ats_usage}
                            </span>
                          </div>
                          <div className="text-slate-300 font-medium">
                            {lead.contact?.first_name} {lead.contact?.last_name}
                            <span className="text-slate-400 font-normal"> • {lead.contact?.title}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center space-x-2">
                            <span>{lead.company?.employee_count} emp</span>
                            <span>•</span>
                            <span>{lead.company?.open_positions_count} open roles</span>
                            {lead.company?.recruiter_hiring_count > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-400 font-medium">
                                  Hiring {lead.company.recruiter_hiring_count} recruiters
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* ICP Score */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm shadow-inner ${
                              isHot
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : isHigh
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                : lead.category === 'QUALIFIED'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {lead.score}
                          </div>
                          <div>
                            <div
                              className={`text-[10px] font-bold uppercase tracking-wider ${
                                isHot
                                  ? 'text-rose-400'
                                  : isHigh
                                  ? 'text-amber-400'
                                  : lead.category === 'QUALIFIED'
                                  ? 'text-blue-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {lead.category.replace('_', ' ')}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {lead.status}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 5-Dimension Mini Score Bars */}
                      <td className="py-3 px-3 hidden lg:table-cell">
                        <div className="space-y-1 w-36">
                          <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                            <span>Co: {bd?.company_fit_score || 0}</span>
                            <span>Hire: {bd?.hiring_velocity_score || 0}</span>
                            <span>Tech: {bd?.tech_stack_score || 0}</span>
                            <span>Per: {bd?.persona_fit_score || 0}</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex">
                            <div
                              className="bg-indigo-500 h-full"
                              style={{ width: `${Math.min(100, (bd?.company_fit_score || 0) * 4)}%` }}
                              title="Company Fit"
                            />
                            <div
                              className="bg-amber-500 h-full"
                              style={{ width: `${Math.min(100, (bd?.hiring_velocity_score || 0) * 4)}%` }}
                              title="Hiring Velocity"
                            />
                            <div
                              className="bg-blue-500 h-full"
                              style={{ width: `${Math.min(100, (bd?.tech_stack_score || 0) * 4)}%` }}
                              title="Tech Fit"
                            />
                            <div
                              className="bg-emerald-500 h-full"
                              style={{ width: `${Math.min(100, (bd?.persona_fit_score || 0) * 4)}%` }}
                              title="Persona Fit"
                            />
                          </div>
                        </div>
                      </td>

                      {/* Next Action */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="space-y-0.5">
                          <div className="text-xs font-medium text-slate-200 flex items-center space-x-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                            <span className="truncate">{lead.next_action}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {lead.next_action_reason}
                          </p>
                        </div>
                      </td>

                      {/* Quick Remark Dropdown */}
                      <td className="py-3 px-3 relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() =>
                            setActiveRemarkMenuLeadId(activeRemarkMenuLeadId === lead.id ? null : lead.id)
                          }
                          className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center space-x-1 transition"
                        >
                          <Zap className="w-3 h-3 text-amber-400" />
                          <span>Quick Remark</span>
                        </button>

                        {activeRemarkMenuLeadId === lead.id && (
                          <div className="absolute left-0 mt-1 w-52 rounded-lg bg-slate-900 border border-slate-800 shadow-2xl p-1 z-50">
                            <div className="px-2.5 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                              5-Choice SDR Remark
                            </div>
                            {quickRemarkOptions.map((opt) => (
                              <button
                                key={opt.key}
                                onClick={() => {
                                  onApplyRemark(lead.id, opt.key);
                                  setActiveRemarkMenuLeadId(null);
                                }}
                                className="w-full text-left px-2.5 py-1.5 rounded hover:bg-slate-800 transition text-xs text-slate-200 hover:text-white"
                              >
                                <div className="font-semibold">{opt.label}</div>
                                <div className="text-[10px] text-slate-400 font-mono">{opt.desc}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* SDR / AE */}
                      <td className="py-3 px-3 whitespace-nowrap hidden md:table-cell">
                        <div className="text-xs text-slate-300">{lead.owner_sdr_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">AE: {lead.owner_ae_name}</div>
                      </td>

                      {/* Action Button */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectLead(lead);
                          }}
                          className="px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600/80 hover:bg-indigo-600 text-white transition shadow-sm"
                        >
                          Open Dossier
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
