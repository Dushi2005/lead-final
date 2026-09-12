import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Key,
  Layers,
  PhoneCall,
  Radio,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Lead, Signal, User } from '../types/index.ts';

interface DashboardViewProps {
  leads: Lead[];
  signals: Signal[];
  users: User[];
  onSelectLead: (lead: Lead) => void;
  onNavigateToTab: (tab: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  leads,
  signals,
  users,
  onSelectLead,
  onNavigateToTab,
}) => {
  // Aggregate KPIs
  const totalLeads = leads.length;
  const hotLeads = leads.filter((l) => l.category === 'HOT');
  const highPriorityLeads = leads.filter((l) => l.category === 'HIGH_PRIORITY');
  const qualifiedLeads = leads.filter((l) => l.category === 'QUALIFIED');
  const nurtureLeads = leads.filter((l) => l.category === 'NURTURE');
  const lowFitLeads = leads.filter((l) => l.category === 'LOW_FIT');

  const actionQueue = leads
    .filter((l) => l.score >= 80 && (l.status === 'NEW' || l.status === 'ENRICHED' || l.status === 'RESEARCHED' || l.status === 'REPLIED'))
    .slice(0, 5);

  const meetingsBooked = leads.filter((l) => l.status === 'MEETING_BOOKED').length;
  const avgScore = Math.round(leads.reduce((sum, l) => sum + l.score, 0) / (totalLeads || 1));

  // Category distribution for chart
  const categoryData = [
    { name: 'HOT (90+)', count: hotLeads.length, color: '#ef4444' },
    { name: 'High Priority (75-89)', count: highPriorityLeads.length, color: '#f97316' },
    { name: 'Qualified (60-74)', count: qualifiedLeads.length, color: '#3b82f6' },
    { name: 'Nurture (45-59)', count: nurtureLeads.length, color: '#8b5cf6' },
    { name: 'Low Fit (<45)', count: lowFitLeads.length, color: '#64748b' },
  ];

  // Industry distribution
  const industryCounts: Record<string, number> = {};
  leads.forEach((l) => {
    const ind = l.company?.industry?.split('/')[0].trim() || 'Tech';
    industryCounts[ind] = (industryCounts[ind] || 0) + 1;
  });
  const industryData = Object.entries(industryCounts).map(([name, count]) => ({ name, count }));

  // SDR performance calculations
  const [conversionMetric, setConversionMetric] = useState<'conversion' | 'booked_rate' | 'hot_win'>('conversion');

  const sdrUsers = users.filter((u) => u.role === 'SDR');
  const sdrColors = ['#6366f1', '#10b981', '#06b6d4', '#f59e0b', '#ec4899'];

  const sdrStats = sdrUsers.map((sdr, index) => {
    const assignedLeads = leads.filter((l) => l.owner_sdr_id === sdr.id);
    const hotCount = assignedLeads.filter((l) => l.category === 'HOT').length;
    const bookedCount = assignedLeads.filter((l) => l.status === 'MEETING_BOOKED').length;
    const repliedCount = assignedLeads.filter((l) => l.status === 'REPLIED' || l.status === 'MEETING_BOOKED').length;
    const conversion = assignedLeads.length > 0 ? Math.round((repliedCount / assignedLeads.length) * 100) : 0;
    const bookedRate = assignedLeads.length > 0 ? Math.round((bookedCount / assignedLeads.length) * 100) : 0;
    const hotWinRate = hotCount > 0 ? Math.round((bookedCount / hotCount) * 100) : 0;

    return {
      sdr,
      total: assignedLeads.length,
      hot: hotCount,
      booked: bookedCount,
      replied: repliedCount,
      conversion,
      bookedRate,
      hotWinRate,
      color: sdrColors[index % sdrColors.length],
      avgSpeed: sdr.name.includes('Sarah') ? '8m' : sdr.name.includes('Marcus') ? '14m' : '11m',
    };
  });

  const sdrChartData = sdrStats.map((item) => {
    let displayValue = item.conversion;
    if (conversionMetric === 'booked_rate') displayValue = item.bookedRate;
    if (conversionMetric === 'hot_win') displayValue = item.hotWinRate;

    return {
      id: item.sdr.id,
      name: item.sdr.name.split(' ')[0], // e.g. "Sarah"
      fullName: item.sdr.name,
      team: item.sdr.team,
      avatar: item.sdr.avatar,
      conversion: item.conversion,
      bookedRate: item.bookedRate,
      hotWinRate: item.hotWinRate,
      displayValue,
      total: item.total,
      hot: item.hot,
      booked: item.booked,
      replied: item.replied,
      color: item.color,
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Banner: Primary Optimization Goal */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-indigo-900/40 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 font-mono">
                Active RevOps Pipeline • Resourcely Intelligence
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-display">
              "What Should the SDR Do Next?" Intelligence Cockpit
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time scoring across 5 ICP dimensions, automated signal ingestion, calendar slot synthesis, and zero-fabrication AI research.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigateToTab('leads')}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition"
            >
              <Flame className="w-4 h-4 text-orange-300" />
              <span>Review {hotLeads.length} Hot Leads</span>
            </button>
            <button
              onClick={() => onNavigateToTab('signals')}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            >
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Live Signals ({signals.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Environment Variables & AI Runtime Quick Prompt Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Key className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold text-slate-200 mr-2">Runtime Environment & Secrets Table:</span>
            <span className="text-slate-400">
              Configure or ask for <code className="text-indigo-300 font-mono">GEMINI_API_KEY</code>, database URLs, and OAuth credentials directly in the application.
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => onNavigateToTab('env')}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition font-medium flex items-center space-x-1.5"
          >
            <span>Open Variables Table</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm hover:border-slate-700 transition">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Active Leads</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-bold text-white font-mono">{totalLeads}</span>
            <span className="text-xs text-emerald-400 font-medium flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" /> +14 this wk
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Average score: <strong className="text-slate-200 font-mono">{avgScore}/100</strong></span>
            <span className="text-indigo-400">100% Enriched</span>
          </div>
        </div>

        {/* Hot Leads */}
        <div className="bg-slate-900/90 border border-rose-900/30 rounded-xl p-4 shadow-sm hover:border-rose-700/50 transition relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-rose-300 text-xs font-medium">
            <span className="flex items-center">
              <Flame className="w-3.5 h-3.5 text-rose-500 mr-1" /> HOT Leads (Score 90+)
            </span>
            <span className="text-[10px] bg-rose-950/80 text-rose-300 px-1.5 py-0.5 rounded border border-rose-800/60 font-mono">
              SLA: &lt;15m
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-bold text-rose-400 font-mono">{hotLeads.length}</span>
            <span className="text-xs text-slate-400">({Math.round((hotLeads.length / totalLeads) * 100)}% of pipeline)</span>
          </div>
          <div className="mt-2 text-[11px] text-rose-300/80 flex items-center justify-between">
            <span>High conversion probability</span>
            <span className="font-semibold text-rose-400">Top Priority</span>
          </div>
        </div>

        {/* Action Required */}
        <div className="bg-slate-900/90 border border-amber-900/30 rounded-xl p-4 shadow-sm hover:border-amber-700/50 transition">
          <div className="flex items-center justify-between text-amber-300 text-xs font-medium">
            <span className="flex items-center">
              <Zap className="w-3.5 h-3.5 text-amber-400 mr-1" /> Urgent Action Queue
            </span>
            <span className="text-[10px] bg-amber-950/80 text-amber-300 px-1.5 py-0.5 rounded border border-amber-800/60 font-mono">
              Immediate
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono">{actionQueue.length}</span>
            <span className="text-xs text-slate-400">leads pending contact</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-200/80 flex items-center justify-between">
            <span>Signal triggers active</span>
            <span className="text-amber-400 font-medium">Ready for SDR</span>
          </div>
        </div>

        {/* Meetings Booked */}
        <div className="bg-slate-900/90 border border-emerald-900/30 rounded-xl p-4 shadow-sm hover:border-emerald-700/50 transition">
          <div className="flex items-center justify-between text-emerald-300 text-xs font-medium">
            <span className="flex items-center">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 mr-1" /> Meetings Scheduled
            </span>
            <span className="text-[10px] bg-emerald-950/80 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800/60 font-mono">
              AE Demos
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">{meetingsBooked}</span>
            <span className="text-xs text-emerald-400 font-medium">+2 this week</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>SDR to AE Handover</span>
            <span className="text-emerald-400 font-medium">100% Calendar Synced</span>
          </div>
        </div>
      </div>

      {/* Main Split: Urgent Action Stream & Visual Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Urgent Action Stream */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  SDR Next-Action Execution Queue
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Sorted by AI Priority & Intent Score
              </span>
            </div>

            <div className="divide-y divide-slate-800">
              {actionQueue.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-800/40 px-2 rounded-lg transition cursor-pointer group"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-semibold text-slate-100 group-hover:text-indigo-400 transition text-sm">
                        {lead.company?.name}
                      </span>
                      <span className="text-slate-400 text-xs">
                        • {lead.contact?.first_name} {lead.contact?.last_name} ({lead.contact?.title})
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                          lead.category === 'HOT'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {lead.score} PTS
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-indigo-300 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      <span>Next Action: {lead.next_action}</span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-1">
                      {lead.next_action_reason}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                    <div className="text-right hidden md:block">
                      <div className="text-[11px] font-medium text-slate-300">{lead.owner_sdr_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Assigned SDR</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectLead(lead);
                      }}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center space-x-1"
                    >
                      <span>Execute</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Conversion Rates by SDR (Recharts Bar Chart Card) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Lead Conversion Rates by SDR
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Live Performance
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Percentage of assigned pipeline converted to meetings booked & qualified responses vs 25% target.
                </p>
              </div>

              {/* Metric Toggle */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setConversionMetric('conversion')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    conversionMetric === 'conversion'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Overall Conv %
                </button>
                <button
                  type="button"
                  onClick={() => setConversionMetric('booked_rate')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    conversionMetric === 'booked_rate'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Demo Booked Rate %
                </button>
                <button
                  type="button"
                  onClick={() => setConversionMetric('hot_win')}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    conversionMetric === 'hot_win'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  HOT Lead Win %
                </button>
              </div>
            </div>

            {/* Recharts Bar Chart */}
            <div className="h-60 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={sdrChartData}
                  margin={{ top: 15, right: 25, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    unit="%"
                    domain={[0, (dataMax: number) => Math.max(35, Math.ceil((dataMax + 5) / 5) * 5)]}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: '#1e293b', opacity: 0.4 }}
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-700 rounded-xl p-3 shadow-xl text-xs space-y-2 min-w-48">
                          <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
                            <img
                              src={data.avatar}
                              alt={data.fullName}
                              className="w-6 h-6 rounded-full object-cover border border-slate-700"
                            />
                            <div>
                              <div className="font-bold text-white text-xs">{data.fullName}</div>
                              <div className="text-[10px] text-indigo-400 font-mono">{data.team}</div>
                            </div>
                          </div>
                          <div className="space-y-1 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">
                                {conversionMetric === 'conversion'
                                  ? 'Overall Conversion:'
                                  : conversionMetric === 'booked_rate'
                                  ? 'Demo Booked Rate:'
                                  : 'HOT Lead Win Rate:'}
                              </span>
                              <strong className="text-white font-mono text-xs">{data.displayValue}%</strong>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Total Leads Assigned:</span>
                              <span className="font-mono text-slate-200">{data.total}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Demos Booked:</span>
                              <span className="font-mono text-emerald-400 font-semibold">{data.booked}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400">Replies & Engaged:</span>
                              <span className="font-mono text-indigo-300">{data.replied}</span>
                            </div>
                          </div>
                          <div className="pt-1.5 border-t border-slate-800 text-[10px] flex items-center justify-between">
                            <span className="text-slate-500">Benchmark Target: 25%</span>
                            <span
                              className={`font-semibold ${
                                data.displayValue >= 25 ? 'text-emerald-400' : 'text-amber-400'
                              }`}
                            >
                              {data.displayValue >= 25 ? '✓ Exceeding' : 'Developing'}
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    y={25}
                    stroke="#eab308"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: 'Target: 25%',
                      fill: '#eab308',
                      fontSize: 10,
                      position: 'insideTopRight',
                    }}
                  />
                  <Bar
                    dataKey="displayValue"
                    name={
                      conversionMetric === 'conversion'
                        ? 'Conversion Rate (%)'
                        : conversionMetric === 'booked_rate'
                        ? 'Booked Rate (%)'
                        : 'HOT Win Rate (%)'
                    }
                    radius={[6, 6, 0, 0]}
                    maxBarSize={55}
                  >
                    {sdrChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* SDR Performance Metric Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
              {sdrChartData.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-950/60 border border-slate-800 hover:border-slate-700 rounded-lg p-2.5 transition flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <img
                        src={item.avatar}
                        alt={item.fullName}
                        className="w-5 h-5 rounded-full object-cover border border-slate-700"
                      />
                      <span className="text-xs font-semibold text-slate-200">{item.name}</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        item.displayValue >= 25
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {item.displayValue}%
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                    <span>
                      {item.replied} of {item.total} converted
                    </span>
                    <span className="text-emerald-400 font-mono font-semibold">{item.booked} booked</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SDR Performance Leaderboard */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                  SDR RevOps Workload & Speed-to-Lead
                </h2>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 hidden sm:inline">Target response: &lt;15 mins</span>
                <button
                  onClick={() => onNavigateToTab('assignment')}
                  className="px-2.5 py-1 text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 rounded-lg transition flex items-center space-x-1"
                >
                  <span>Assign & Balance Leads</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="pb-2.5 font-medium">SDR Representative</th>
                    <th className="pb-2.5 font-medium">Assigned Leads</th>
                    <th className="pb-2.5 font-medium">HOT Leads</th>
                    <th className="pb-2.5 font-medium">Avg Speed</th>
                    <th className="pb-2.5 font-medium">Demos Booked</th>
                    <th className="pb-2.5 font-medium">Conv %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sdrStats.map((item) => (
                    <tr key={item.sdr.id} className="hover:bg-slate-800/30">
                      <td className="py-3 font-semibold text-slate-200 flex items-center space-x-2.5">
                        <img
                          src={item.sdr.avatar}
                          alt={item.sdr.name}
                          className="w-6 h-6 rounded-full object-cover border border-slate-700"
                        />
                        <span>{item.sdr.name}</span>
                      </td>
                      <td className="py-3 font-mono text-slate-300">{item.total}</td>
                      <td className="py-3 font-mono text-rose-400 font-bold">{item.hot}</td>
                      <td className="py-3 font-mono text-emerald-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" /> {item.avgSpeed}
                      </td>
                      <td className="py-3 font-mono text-slate-200 font-semibold">{item.booked}</td>
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-medium text-slate-200">{item.conversion}%</span>
                          <div className="w-14 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, item.conversion * 2)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Analytics & Signals Radar */}
        <div className="space-y-6">
          {/* Category Distribution Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono mb-3">
              Lead Breakdown by Score Tier
            </h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={10} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={10} width={90} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-400">
              <div>High Fit (HOT + High): <strong className="text-white font-mono">{hotLeads.length + highPriorityLeads.length}</strong></div>
              <div>Low Fit / Nurture: <strong className="text-white font-mono">{nurtureLeads.length + lowFitLeads.length}</strong></div>
            </div>
          </div>

          {/* Recent Signals Ticker */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Live Market Signals
                </h3>
              </div>
              <button
                onClick={() => onNavigateToTab('signals')}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
              >
                View all ({signals.length})
              </button>
            </div>

            <div className="space-y-3">
              {signals.slice(0, 4).map((sig) => (
                <div
                  key={sig.id}
                  className="p-2.5 rounded-lg bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{sig.company_name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      +{sig.score_impact} PTS
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
                    {sig.title}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>{sig.source_name}</span>
                    <span className="font-mono">{new Date(sig.detected_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
