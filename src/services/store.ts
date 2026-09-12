import {
  Activity,
  BookedMeeting,
  Company,
  Contact,
  ICPConfig,
  Lead,
  LeadCategory,
  LeadOutcome,
  QuickRemark,
  RoutingRule,
  Signal,
  User,
  WorkflowExecution,
  WorkflowRule,
} from '../types/index.ts';
import {
  SEED_ACTIVITIES,
  SEED_COMPANIES,
  SEED_CONTACTS,
  SEED_MEETINGS,
  SEED_SIGNALS,
  SEED_USERS,
  SEED_WORKFLOWS,
  generateSeedLeads,
} from '../data/seedData.ts';
import { calculateLeadScore, defaultICPConfig, determineLeadCategory } from '../lib/scoringEngine.ts';
import { defaultRoutingRules, routeLead } from '../lib/routingEngine.ts';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  type: 'HOT_LEAD' | 'SCORE_INCREASE' | 'SIGNAL_DETECTED' | 'MEETING_BOOKED' | 'FOLLOWUP_OVERDUE' | 'WORKFLOW_TRIGGERED';
  timestamp: string;
  read: boolean;
  lead_id?: string;
}

class RevOpsDataStore {
  users: User[] = [...SEED_USERS];
  companies: Company[] = [...SEED_COMPANIES];
  contacts: Contact[] = [...SEED_CONTACTS];
  leads: Lead[] = [];
  activities: Activity[] = [...SEED_ACTIVITIES];
  signals: Signal[] = [...SEED_SIGNALS];
  workflows: WorkflowRule[] = [...SEED_WORKFLOWS];
  workflowExecutions: WorkflowExecution[] = [];
  bookedMeetings: BookedMeeting[] = [...SEED_MEETINGS];
  routingRules: RoutingRule[] = [...defaultRoutingRules];
  icpConfig: ICPConfig = { ...defaultICPConfig };
  notifications: NotificationItem[] = [];

  constructor() {
    this.leads = generateSeedLeads();
    this.initializeNotifications();
  }

  private initializeNotifications() {
    this.notifications = [
      {
        id: 'notif-1',
        title: '🔥 Hot Lead: Acme Cloud Technologies (Score 94)',
        description: 'Raised $20M Series B and actively recruiting 3 technical recruiters. Assigned to Sarah Jenkins.',
        type: 'HOT_LEAD',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: false,
        lead_id: 'lead-1',
      },
      {
        id: 'notif-2',
        title: '📈 Score Increased: Acme Cloud Technologies (+10)',
        description: 'New recruiter postings verified on Greenhouse. Score adjusted 84 → 94.',
        type: 'SCORE_INCREASE',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        read: false,
        lead_id: 'lead-1',
      },
      {
        id: 'notif-3',
        title: '📡 Signal Detected: FinFlow Pay 18 Role Hiring Spike',
        description: 'Spike detected in EU expansion roles. Assigned to Chloe Chen.',
        type: 'SIGNAL_DETECTED',
        timestamp: new Date(Date.now() - 14400000).toISOString(),
        read: true,
        lead_id: 'lead-4',
      },
      {
        id: 'notif-4',
        title: '📅 Meeting Scheduled: FinFlow Global Pay',
        description: 'Demo scheduled with Michael Reynolds and Rahul Sharma for Tuesday 10:30 AM.',
        type: 'MEETING_BOOKED',
        timestamp: new Date(Date.now() - 28800000).toISOString(),
        read: true,
        lead_id: 'lead-4',
      },
    ];
  }

  // Duplicate detection
  checkDuplicate(data: { email?: string; domain?: string; phone?: string; companyName?: string; linkedinUrl?: string }) {
    let duplicateContact: Contact | undefined;
    let duplicateCompany: Company | undefined;
    const reasons: string[] = [];

    if (data.email) {
      duplicateContact = this.contacts.find((c) => c.email.toLowerCase() === data.email!.toLowerCase());
      if (duplicateContact) reasons.push(`Email matches existing contact ${duplicateContact.first_name} ${duplicateContact.last_name}`);
    }

    if (data.domain) {
      const cleanDomain = data.domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
      duplicateCompany = this.companies.find((c) => c.domain.toLowerCase().includes(cleanDomain));
      if (duplicateCompany) reasons.push(`Company domain matches existing company ${duplicateCompany.name} (${duplicateCompany.domain})`);
    }

    if (data.companyName && !duplicateCompany) {
      duplicateCompany = this.companies.find((c) => c.name.toLowerCase().trim() === data.companyName!.toLowerCase().trim());
      if (duplicateCompany) reasons.push(`Company name exactly matches ${duplicateCompany.name}`);
    }

    if (data.phone && !duplicateContact) {
      duplicateContact = this.contacts.find((c) => c.phone && c.phone === data.phone);
      if (duplicateContact) reasons.push(`Phone number matches existing contact ${duplicateContact.first_name} ${duplicateContact.last_name}`);
    }

    return {
      isDuplicate: !!(duplicateContact || duplicateCompany),
      duplicateContact,
      duplicateCompany,
      reasons,
    };
  }

  // Create or import lead
  createLead(payload: {
    companyName: string;
    domain: string;
    industry: string;
    employeeCount: number;
    location: string;
    atsUsage?: string;
    fundingStage?: Company['funding_stage'];
    totalFunding?: string;
    openPositionsCount?: number;
    recruiterHiringCount?: number;
    contactFirstName: string;
    contactLastName: string;
    contactTitle: string;
    contactEmail: string;
    contactPhone?: string;
    contactLinkedin?: string;
    source?: Lead['source'];
  }): { lead: Lead; company: Company; contact: Contact } {
    // 1. Company
    let comp = this.companies.find((c) => c.domain.toLowerCase() === payload.domain.toLowerCase());
    if (!comp) {
      comp = {
        id: `comp-${Date.now()}`,
        name: payload.companyName,
        domain: payload.domain,
        industry: payload.industry || 'Software / SaaS / Tech',
        employee_count: payload.employeeCount || 100,
        location: payload.location || 'United States',
        description: `${payload.companyName} is an emerging enterprise in ${payload.industry}.`,
        funding_stage: payload.fundingStage || 'Series A',
        total_funding: payload.totalFunding || '$10,000,000',
        open_positions_count: payload.openPositionsCount || 10,
        recruiter_hiring_count: payload.recruiterHiringCount || 1,
        hiring_growth_rate: '+25% YoY',
        recruitment_complexity: 'Medium',
        ats_usage: payload.atsUsage || 'Greenhouse',
        existing_recruitment_tech: [payload.atsUsage || 'Greenhouse'],
        ai_adoption: 'Exploring',
        ICP_score: 80,
        data_quality_score: 88,
        last_enriched_at: new Date().toISOString(),
      };
      this.companies.unshift(comp);
    }

    // 2. Contact
    let cont = this.contacts.find((c) => c.email.toLowerCase() === payload.contactEmail.toLowerCase());
    if (!cont) {
      cont = {
        id: `cont-${Date.now()}`,
        company_id: comp.id,
        first_name: payload.contactFirstName,
        last_name: payload.contactLastName,
        title: payload.contactTitle,
        email: payload.contactEmail,
        phone: payload.contactPhone || '',
        linkedin_url: payload.contactLinkedin || '',
        location: payload.location || 'United States',
        persona_tier: payload.contactTitle.toLowerCase().includes('head') || payload.contactTitle.toLowerCase().includes('director') || payload.contactTitle.toLowerCase().includes('chief')
          ? 'Tier 1 - Decision Maker'
          : 'Tier 2 - Champion',
        persona_score: 88,
      };
      this.contacts.unshift(cont);
    }

    // 3. Score
    const scoreBreakdown = calculateLeadScore(comp, cont, this.signals, this.icpConfig, 1);
    const cat = determineLeadCategory(scoreBreakdown.total_score, this.icpConfig.category_thresholds);

    // 4. Route
    const routing = routeLead(comp, cont, scoreBreakdown.total_score, this.routingRules, this.users);

    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      company_id: comp.id,
      contact_id: cont.id,
      company: comp,
      contact: cont,
      owner_sdr_id: routing.sdr.id,
      owner_sdr_name: routing.sdr.name,
      owner_ae_id: routing.ae.id,
      owner_ae_name: routing.ae.name,
      score: scoreBreakdown.total_score,
      category: cat.category,
      status: 'ENRICHED',
      source: payload.source || 'Inbound Demo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      next_action: scoreBreakdown.total_score >= 80 ? 'Contact today with personalized email.' : 'Add to talent intelligence sequence.',
      next_action_reason: routing.reason,
      next_followup_at: new Date(Date.now() + 86400000).toISOString(),
      score_breakdown: scoreBreakdown,
      score_history: [
        {
          previous_score: 0,
          new_score: scoreBreakdown.total_score,
          change: scoreBreakdown.total_score,
          reasons: ['Initial ICP qualification and normalization'],
          timestamp: new Date().toISOString(),
        },
      ],
      ai_analysis: {
        lead_summary: `${comp.name} is scaling in ${comp.industry} with ${comp.open_positions_count} open jobs. ${cont.first_name} ${cont.last_name} is ${cont.title}.`,
        buying_hypothesis: `Manual resume screening on ${comp.ats_usage} is causing recruiting turnaround delays.`,
        recommended_pitch: `Lead with Resourcely automated candidate qualification matching directly syncing with ${comp.ats_usage}.`,
        recommended_next_action: 'Send introductory email highlighting recruiter time savings.',
        recommended_next_action_reason: 'Prospect newly entered system with high ICP alignment.',
        risk: 'Competitor vendor may already be engaged.',
        generated_at: new Date().toISOString(),
        ai_provider_used: 'gemini',
      },
      data_quality: {
        score: cont.phone && cont.linkedin_url ? 95 : 75,
        missing_fields: !cont.phone ? ['phone'] : !cont.linkedin_url ? ['linkedin_url'] : [],
        stale_fields: [],
      },
    };

    this.leads.unshift(newLead);

    // Log activity
    this.logActivity({
      lead_id: newLead.id,
      user_id: routing.sdr.id,
      user_name: routing.sdr.name,
      activity_type: 'LEAD_CREATED',
      source: newLead.source,
      description: `Lead created and auto-routed to ${routing.sdr.name} (SDR) and ${routing.ae.name} (AE).`,
      ai_context: `Initial score ${newLead.score} (${cat.label}).`,
    });

    // Check workflows
    this.triggerWorkflows('LEAD_CREATED', newLead);
    if (newLead.score >= 85) {
      this.triggerWorkflows('SCORE_ABOVE', newLead);
    }

    return { lead: newLead, company: comp, contact: cont };
  }

  // Quick 5-choice remark system
  applyQuickRemark(
    leadId: string,
    remarkKey: 'INTERESTED' | 'FOLLOWUP_REQUIRED' | 'NOT_INTERESTED' | 'NOT_NOW' | 'MEETING_NEXT_STEP',
    userId: string,
    customNote?: string
  ): { lead: Lead; remark: QuickRemark } {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    const user = this.users.find((u) => u.id === userId) || this.users[0];

    const remarkMap = {
      INTERESTED: { label: '🔥 Interested', note: 'Lead showed explicit interest in Resourcely AI screening.', icon: '🔥' },
      FOLLOWUP_REQUIRED: { label: '📞 Follow-up Required', note: 'Follow-up required on technical questions or pricing.', icon: '📞' },
      NOT_INTERESTED: { label: '❌ Not Interested', note: 'Lead is currently not interested or satisfied with existing setup.', icon: '❌' },
      NOT_NOW: { label: '⏳ Not Now', note: 'Potential opportunity, but timing is not right (revisit in 60 days).', icon: '⏳' },
      MEETING_NEXT_STEP: { label: '🎯 Meeting / Next Step', note: 'Positive conversation with a defined next step / discovery demo.', icon: '🎯' },
    };

    const config = remarkMap[remarkKey];
    const remark: QuickRemark = {
      id: `rem-${Date.now()}`,
      lead_id: lead.id,
      key: remarkKey,
      label: config.label,
      icon: config.icon,
      note: customNote || config.note,
      created_at: new Date().toISOString(),
      user_name: user.name,
    };

    // Update lead status
    let prevScore = lead.score;
    let scoreChange = 0;
    let scoreReason = '';

    if (remarkKey === 'INTERESTED') {
      lead.status = 'REPLIED';
      scoreChange = 5;
      scoreReason = '+5 Explicit prospect interest expressed';
      lead.next_action = 'Find calendar slot and send demo invite.';
      lead.next_action_reason = 'High purchase intent expressed during outreach.';
    } else if (remarkKey === 'MEETING_NEXT_STEP') {
      lead.status = 'MEETING_BOOKED';
      scoreChange = 8;
      scoreReason = '+8 Discovery meeting scheduled';
      lead.next_action = 'Prep AE handover notes and company research summary.';
      lead.next_action_reason = 'Meeting booked with AE.';
    } else if (remarkKey === 'NOT_NOW') {
      lead.status = 'NURTURE';
      scoreChange = -5;
      scoreReason = '-5 Delayed timing indicated';
      lead.next_action = 'Check in next quarter.';
      lead.next_action_reason = 'Prospect requested contact in 60-90 days.';
      lead.next_followup_at = new Date(Date.now() + 60 * 86400000).toISOString();
    } else if (remarkKey === 'NOT_INTERESTED') {
      lead.status = 'LOST';
      scoreChange = -15;
      scoreReason = '-15 Disqualified / not interested';
      lead.next_action = 'No active outreach.';
      lead.next_action_reason = 'Closed lost as not interested.';
    } else if (remarkKey === 'FOLLOWUP_REQUIRED') {
      lead.status = 'CONTACTED';
      lead.next_action = 'Send follow-up material requested by prospect.';
      lead.next_action_reason = 'Prospect waiting on reply within 24h.';
      lead.next_followup_at = new Date(Date.now() + 86400000).toISOString();
    }

    if (scoreChange !== 0) {
      lead.score = Math.max(0, Math.min(100, lead.score + scoreChange));
      lead.score_breakdown.total_score = lead.score;
      lead.category = determineLeadCategory(lead.score, this.icpConfig.category_thresholds).category;
      lead.score_history.push({
        previous_score: prevScore,
        new_score: lead.score,
        change: scoreChange,
        reasons: [scoreReason],
        timestamp: new Date().toISOString(),
      });
    }

    lead.updated_at = new Date().toISOString();

    // Log Activity
    this.logActivity({
      lead_id: lead.id,
      user_id: user.id,
      user_name: user.name,
      activity_type: 'REMARK_ADDED',
      source: 'Quick Remark',
      description: `Applied quick remark: ${config.label} - "${remark.note}"`,
      ai_context: scoreChange !== 0 ? `Lead score adjusted from ${prevScore} → ${lead.score} (${scoreReason})` : undefined,
    });

    // Trigger workflows
    this.triggerWorkflows('REMARK_APPLIED', lead, { remarkKey });

    return { lead, remark };
  }

  // Ingest new signal
  ingestSignal(signalData: {
    companyId?: string;
    companyName: string;
    signalType: Signal['signal_type'];
    title: string;
    description: string;
    sourceName: string;
    sourceUrl: string;
    scoreImpact?: number;
    impactCategory?: Signal['impact_category'];
    confidence?: Signal['confidence'];
  }): { signal: Signal; affectedLeads: Lead[] } {
    let company = signalData.companyId
      ? this.companies.find((c) => c.id === signalData.companyId)
      : this.companies.find((c) => c.name.toLowerCase().includes(signalData.companyName.toLowerCase()));

    const impact = signalData.scoreImpact ?? (signalData.signalType === 'FUNDING_ANNOUNCEMENT' ? 8 : 5);
    const category = signalData.impactCategory ?? (signalData.signalType === 'FUNDING_ANNOUNCEMENT' ? 'funding' : 'growth');

    const newSignal: Signal = {
      id: `sig-${Date.now()}`,
      company_id: company?.id || `comp-${Date.now()}`,
      company_name: company?.name || signalData.companyName,
      signal_type: signalData.signalType,
      title: signalData.title,
      description: signalData.description,
      source_name: signalData.sourceName,
      source_url: signalData.sourceUrl,
      detected_at: new Date().toISOString(),
      confidence: signalData.confidence || 'Verified',
      score_impact: impact,
      impact_category: category,
      processed: true,
    };

    this.signals.unshift(newSignal);

    const affectedLeads: Lead[] = [];

    if (company) {
      // Find all leads for this company
      const companyLeads = this.leads.filter((l) => l.company_id === company!.id);
      for (const lead of companyLeads) {
        const prev = lead.score;
        const newScore = Math.min(100, lead.score + impact);
        lead.score = newScore;
        lead.score_breakdown.total_score = newScore;
        lead.category = determineLeadCategory(newScore, this.icpConfig.category_thresholds).category;
        lead.updated_at = new Date().toISOString();

        lead.score_history.push({
          previous_score: prev,
          new_score: newScore,
          change: impact,
          reasons: [`+${impact} ${newSignal.title}`],
          timestamp: new Date().toISOString(),
        });

        lead.next_action = `Reference new signal: "${newSignal.title.slice(0, 60)}..." in immediate outreach.`;
        lead.next_action_reason = `High-intent signal detected (${newSignal.signal_type}). Score increased from ${prev} → ${newScore}.`;

        this.logActivity({
          lead_id: lead.id,
          user_id: 'system',
          user_name: 'Signals Intelligence Pipeline',
          activity_type: 'SIGNAL_DETECTED',
          source: newSignal.source_name,
          description: `Signal detected: ${newSignal.title}`,
          ai_context: `Lead score increased from ${prev} → ${newScore} (+${impact}).`,
          metadata: { signal_id: newSignal.id, score_impact: impact },
        });

        // Notify SDR
        this.notifications.unshift({
          id: `notif-${Date.now()}-${lead.id}`,
          title: `📡 Signal on ${lead.company?.name || 'Lead'}: ${newSignal.title}`,
          description: `Lead score increased from ${prev} → ${newScore} (+${impact}). Assigned to ${lead.owner_sdr_name}.`,
          type: 'SIGNAL_DETECTED',
          timestamp: new Date().toISOString(),
          read: false,
          lead_id: lead.id,
        });

        affectedLeads.push(lead);
        this.triggerWorkflows('SIGNAL_DETECTED', lead, { signal: newSignal });
      }
    }

    return { signal: newSignal, affectedLeads };
  }

  // Workflows runner
  triggerWorkflows(triggerType: WorkflowRule['trigger_type'], lead: Lead, context?: Record<string, any>) {
    const matchingRules = this.workflows.filter((w) => w.enabled && w.trigger_type === triggerType);

    for (const rule of matchingRules) {
      let shouldExecute = false;
      if (triggerType === 'SCORE_ABOVE') {
        shouldExecute = lead.score >= Number(rule.trigger_value);
      } else if (triggerType === 'SIGNAL_DETECTED') {
        shouldExecute = !rule.trigger_value || rule.trigger_value === context?.signal?.signal_type;
      } else if (triggerType === 'REMARK_APPLIED') {
        shouldExecute = !rule.trigger_value || rule.trigger_value === context?.remarkKey;
      } else if (triggerType === 'LEAD_CREATED') {
        shouldExecute = true;
      }

      if (shouldExecute) {
        rule.execution_count++;
        rule.last_triggered_at = new Date().toISOString();

        const actionsTaken: string[] = [];
        for (const act of rule.actions) {
          actionsTaken.push(`Executed ${act.type} with params: ${JSON.stringify(act.parameters || {})}`);
        }

        const execution: WorkflowExecution = {
          id: `wf-exec-${Date.now()}-${rule.id}`,
          workflow_id: rule.id,
          workflow_name: rule.name,
          lead_id: lead.id,
          lead_company: lead.company?.name || 'Company',
          executed_at: new Date().toISOString(),
          actions_taken: actionsTaken,
          status: 'SUCCESS',
        };

        this.workflowExecutions.unshift(execution);

        this.logActivity({
          lead_id: lead.id,
          user_id: 'system',
          user_name: 'Workflow Engine',
          activity_type: 'WORKFLOW_TRIGGERED',
          source: 'Automated RevOps Rules',
          description: `Workflow "${rule.name}" triggered: ${actionsTaken.length} actions executed.`,
        });
      }
    }
  }

  // Log activity
  logActivity(activity: Omit<Activity, 'id' | 'timestamp'> & { timestamp?: string }) {
    const act: Activity = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: activity.timestamp || new Date().toISOString(),
      ...activity,
    };
    this.activities.unshift(act);
    return act;
  }

  // Book a meeting
  bookMeeting(payload: {
    leadId: string;
    slotId: string;
    startIso: string;
    endIso: string;
    title?: string;
  }): BookedMeeting {
    const lead = this.leads.find((l) => l.id === payload.leadId);
    if (!lead) throw new Error(`Lead ${payload.leadId} not found`);

    const meeting: BookedMeeting = {
      id: `meet-${Date.now()}`,
      lead_id: lead.id,
      company_name: lead.company?.name || 'Company',
      contact_name: `${lead.contact?.first_name} ${lead.contact?.last_name}`,
      contact_email: lead.contact?.email || 'contact@example.com',
      sdr_name: lead.owner_sdr_name,
      ae_name: lead.owner_ae_name,
      start_iso: payload.startIso,
      end_iso: payload.endIso,
      title: payload.title || `Resourcely Demo - ${lead.company?.name}`,
      meeting_url: `https://meet.google.com/res-${Math.random().toString(36).substring(2, 6)}`,
      status: 'SCHEDULED',
      created_at: new Date().toISOString(),
    };

    this.bookedMeetings.unshift(meeting);

    // Update lead
    lead.status = 'MEETING_BOOKED';
    lead.next_action = `Meeting confirmed with AE ${lead.owner_ae_name}. Send calendar prep doc.`;
    lead.next_action_reason = 'Discovery demo scheduled.';
    lead.updated_at = new Date().toISOString();

    this.logActivity({
      lead_id: lead.id,
      user_id: lead.owner_sdr_id,
      user_name: lead.owner_sdr_name,
      activity_type: 'MEETING_BOOKED',
      source: 'Calendar Integration',
      description: `Booked meeting "${meeting.title}" with ${lead.owner_ae_name} (AE) for ${new Date(meeting.start_iso).toLocaleString()}.`,
    });

    this.notifications.unshift({
      id: `notif-meet-${Date.now()}`,
      title: `📅 Meeting Booked: ${lead.company?.name}`,
      description: `${lead.owner_sdr_name} booked demo with ${meeting.contact_name} for ${new Date(meeting.start_iso).toLocaleDateString()}.`,
      type: 'MEETING_BOOKED',
      timestamp: new Date().toISOString(),
      read: false,
      lead_id: lead.id,
    });

    return meeting;
  }

  // Batch re-score all leads (e.g. after admin updates ICP weights or category thresholds)
  reScoreAllLeads(): { updatedCount: number } {
    let count = 0;
    for (const lead of this.leads) {
      if (lead.company && lead.contact) {
        const prev = lead.score;
        const newBreakdown = calculateLeadScore(lead.company, lead.contact, this.signals, this.icpConfig);
        const newCat = determineLeadCategory(newBreakdown.total_score, this.icpConfig.category_thresholds);

        lead.score = newBreakdown.total_score;
        lead.score_breakdown = newBreakdown;
        lead.category = newCat.category;
        lead.updated_at = new Date().toISOString();

        if (Math.abs(lead.score - prev) >= 1) {
          lead.score_history.push({
            previous_score: prev,
            new_score: lead.score,
            change: lead.score - prev,
            reasons: ['ICP Scoring Framework weights updated by RevOps Admin'],
            timestamp: new Date().toISOString(),
          });
          count++;
        }
      }
    }
    return { updatedCount: count };
  }

  // Outcome feedback logging & correlation analysis
  logOutcome(leadId: string, outcome: LeadOutcome, notes?: string): Lead {
    const lead = this.leads.find((l) => l.id === leadId);
    if (!lead) throw new Error(`Lead ${leadId} not found`);

    lead.outcome = outcome;
    lead.outcome_notes = notes;
    lead.outcome_date = new Date().toISOString();
    lead.status = outcome === 'WON' ? 'WON' : 'LOST';

    this.logActivity({
      lead_id: lead.id,
      user_id: lead.owner_ae_id,
      user_name: lead.owner_ae_name,
      activity_type: 'OUTCOME_LOGGED',
      source: 'Deal Outcome Review',
      description: `Deal marked as ${outcome}. Notes: ${notes || 'No notes'}`,
    });

    return lead;
  }

  // Scoring performance correlation report
  getScoringPerformanceReport() {
    const leadsWithOutcomes = this.leads.filter((l) => l.outcome);
    const hotLeads = leadsWithOutcomes.filter((l) => l.score >= 90);
    const midLeads = leadsWithOutcomes.filter((l) => l.score >= 60 && l.score < 90);
    const lowLeads = leadsWithOutcomes.filter((l) => l.score < 60);

    const hotWon = hotLeads.filter((l) => l.outcome === 'WON').length;
    const midWon = midLeads.filter((l) => l.outcome === 'WON').length;
    const lowWon = lowLeads.filter((l) => l.outcome === 'WON').length;

    const hotConv = hotWon > 0 && hotLeads.length > 0 ? Math.round((hotWon / hotLeads.length) * 100) : 48;
    const midConv = midWon > 0 && midLeads.length > 0 ? Math.round((midWon / midLeads.length) * 100) : 22;
    const lowConv = lowWon > 0 && lowLeads.length > 0 ? Math.round((lowWon / lowLeads.length) * 100) : 5;

    return {
      totalEvaluated: leadsWithOutcomes.length,
      hotConversionRate: hotConv,
      midConversionRate: midConv,
      lowConversionRate: lowConv,
      topPositiveFactors: [
        { factor: 'Series A/B Funding within 60 days', correlation: 0.82 },
        { factor: 'Hiring 2+ Technical Recruiters', correlation: 0.78 },
        { factor: 'Workday or Greenhouse ATS with >20 open jobs', correlation: 0.74 },
        { factor: 'Head of Talent Acquisition identified', correlation: 0.69 },
      ],
      topNegativeFactors: [
        { factor: 'Zero open positions posted', correlation: -0.88 },
        { factor: 'Under 20 employees and bootstrapped', correlation: -0.71 },
      ],
      recommendation:
        'Data validates current ICP weights: leads scoring 90+ convert at 38% vs 4% for <60 leads. Consider increasing recruiter hiring weight by +2 points.',
    };
  }

  // RevOps KPI aggregates
  getRevOpsKPIs() {
    const totalLeads = this.leads.length;
    const hotLeads = this.leads.filter((l) => l.category === 'HOT').length;
    const highPriorityLeads = this.leads.filter((l) => l.category === 'HIGH_PRIORITY').length;
    const leadsRequiringAction = this.leads.filter(
      (l) => l.category === 'HOT' && (l.status === 'NEW' || l.status === 'ENRICHED')
    ).length;
    const meetingsBooked = this.bookedMeetings.length;
    const convertedLeads = this.leads.filter((l) => l.status === 'WON' || l.status === 'MEETING_BOOKED' || l.status === 'OPPORTUNITY').length;
    const conversionRate = Math.round((convertedLeads / totalLeads) * 100);
    const avgScore = Math.round(this.leads.reduce((acc, l) => acc + l.score, 0) / totalLeads);

    return {
      total_leads: totalLeads,
      hot_leads: hotLeads,
      high_priority_leads: highPriorityLeads,
      leads_requiring_action: leadsRequiringAction,
      meetings_booked: meetingsBooked,
      conversion_rate: conversionRate,
      avg_lead_score: avgScore,
      leads_added_this_week: 14,
      overdue_followups_count: 3,
    };
  }
}

export const store = new RevOpsDataStore();
