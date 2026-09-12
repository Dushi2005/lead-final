/**
 * Resourcely AI-Powered RevOps & Lead Intelligence Types
 */

export type LeadCategory = 'HOT' | 'HIGH_PRIORITY' | 'QUALIFIED' | 'NURTURE' | 'LOW_FIT';

export type LeadStatus =
  | 'NEW'
  | 'ENRICHED'
  | 'RESEARCHED'
  | 'CONTACTED'
  | 'REPLIED'
  | 'MEETING_BOOKED'
  | 'OPPORTUNITY'
  | 'WON'
  | 'LOST'
  | 'NURTURE';

export type LeadOutcome =
  | 'WON'
  | 'LOST_COMPETITOR'
  | 'LOST_BUDGET'
  | 'LOST_TIMING'
  | 'NOT_ICP'
  | 'NO_RESPONSE'
  | 'BAD_DATA'
  | 'USING_ANOTHER_SYSTEM';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'SDR' | 'AE' | 'MANAGER' | 'REVOPS_ADMIN';
  team: string;
  timezone: string;
  calendar_provider: 'google' | 'microsoft' | 'none';
  calendar_connected: boolean;
  avatar?: string;
}

export interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string;
  employee_count: number;
  location: string;
  description: string;
  funding_stage: 'Bootstrapped' | 'Seed' | 'Series A' | 'Series B' | 'Series C+' | 'IPO/Public';
  total_funding: string;
  recent_funding_date?: string;
  recent_funding_amount?: string;
  open_positions_count: number;
  recruiter_hiring_count: number;
  hiring_growth_rate: string; // e.g. "+35% YoY"
  recruitment_complexity: 'High' | 'Medium' | 'Low';
  ats_usage: string; // e.g. "Greenhouse", "Lever", "Workday", "Ashby", "None"
  existing_recruitment_tech: string[];
  ai_adoption: 'High' | 'Medium' | 'Low' | 'Exploring';
  ICP_score: number; // 0-100
  data_quality_score: number; // 0-100
  last_enriched_at: string;
}

export interface Contact {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  title: string;
  email: string;
  phone: string;
  linkedin_url: string;
  location: string;
  persona_tier: 'Tier 1 - Decision Maker' | 'Tier 2 - Champion' | 'Tier 3 - Influencer' | 'Other';
  persona_score: number; // 0-100
}

export interface LeadScoreBreakdown {
  total_score: number; // 0-100
  icp_fit_score: number; // max 30
  company_fit_score?: number;
  hiring_activity_score: number; // max 20
  hiring_velocity_score?: number;
  persona_score: number; // max 15
  persona_fit_score?: number;
  company_growth_score: number; // max 15
  intent_score: number; // max 10
  engagement_score: number; // max 10
  tech_stack_score: number; // max 10
  data_confidence_score: number; // 0-100%
  negative_signals_penalty: number; // <= 0
  reasons: any[];
  deductions?: any[];
  last_calculated_at: string;
}

export interface ScoreHistoryEntry {
  previous_score: number;
  new_score: number;
  change: number; // e.g. +16
  reasons: string[]; // e.g. ["+8 Funding detected", "+5 Hiring growth"]
  timestamp: string;
}

export interface Activity {
  id: string;
  lead_id: string;
  timestamp: string;
  user_id: string;
  user_name: string;
  activity_type:
    | 'LEAD_CREATED'
    | 'ENRICHMENT_COMPLETED'
    | 'AI_RESEARCH_COMPLETED'
    | 'SCORE_CHANGED'
    | 'SIGNAL_DETECTED'
    | 'EMAIL_SENT'
    | 'LINKEDIN_SENT'
    | 'CALL_MADE'
    | 'REMARK_ADDED'
    | 'MEETING_BOOKED'
    | 'STATUS_CHANGED'
    | 'WORKFLOW_TRIGGERED'
    | 'OUTCOME_LOGGED';
  source: string;
  description: string;
  ai_context?: string;
  metadata?: Record<string, any>;
}

export interface QuickRemark {
  id: string;
  lead_id: string;
  key: 'INTERESTED' | 'FOLLOWUP_REQUIRED' | 'NOT_INTERESTED' | 'NOT_NOW' | 'MEETING_NEXT_STEP' | 'CUSTOM';
  label: string;
  icon: string;
  note: string;
  created_at: string;
  user_name: string;
}

export interface Signal {
  id: string;
  company_id: string;
  company_name: string;
  signal_type:
    | 'FUNDING_ANNOUNCEMENT'
    | 'HIRING_SPIKE'
    | 'RECRUITER_HIRING'
    | 'TA_LEADERSHIP_CHANGE'
    | 'EXPANSION'
    | 'ATS_IMPLEMENTATION'
    | 'NEWS_MENTION'
    | 'ENGAGEMENT_SPIKE';
  title: string;
  description: string;
  source_name: string;
  source_url: string;
  detected_at: string;
  confidence: 'Verified' | 'Likely' | 'Unverified';
  score_impact: number; // e.g. +8
  impact_category: 'funding' | 'growth' | 'intent' | 'persona';
  processed: boolean;
}

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger_type: 'SCORE_ABOVE' | 'SIGNAL_DETECTED' | 'REMARK_APPLIED' | 'LEAD_CREATED' | 'STATUS_CHANGED';
  trigger_value: string | number;
  actions: {
    type:
      | 'ASSIGN_SDR'
      | 'ASSIGN_AE'
      | 'NOTIFY_SDR'
      | 'NOTIFY_AE'
      | 'RUN_AI_RESEARCH'
      | 'GENERATE_OUTREACH'
      | 'CHANGE_STATUS'
      | 'ADD_FOLLOWUP_TASK'
      | 'FIND_CALENDAR_SLOTS'
      | 'ADD_TO_CAMPAIGN';
    parameters?: Record<string, any>;
  }[];
  last_triggered_at?: string;
  execution_count: number;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  workflow_name: string;
  lead_id: string;
  lead_company: string;
  executed_at: string;
  actions_taken: string[];
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
}

export interface CalendarSlot {
  id: string;
  day_label: string; // e.g. "Tuesday, Sep 15"
  time_label: string; // e.g. "10:30 AM - 11:00 AM EDT"
  start_iso: string;
  end_iso: string;
  sdr_available: boolean;
  ae_available: boolean;
  recommended: boolean;
}

export interface BookedMeeting {
  id: string;
  lead_id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  sdr_name: string;
  ae_name: string;
  start_iso: string;
  end_iso: string;
  title: string;
  meeting_url: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
}

export interface ResearchFinding {
  category: 'overview' | 'funding' | 'hiring' | 'leadership' | 'technology' | 'expansion';
  information: string;
  source: string;
  source_url: string;
  date_discovered: string;
  confidence: 'Verified' | 'Likely' | 'Unverified';
}

export interface AILeadAnalysis {
  lead_summary: string;
  buying_hypothesis: string;
  recommended_pitch: string;
  recommended_next_action: string;
  recommended_next_action_reason: string;
  risk: string;
  generated_at: string;
  ai_provider_used: 'gemini' | 'groq' | 'fallback' | string;
}

export interface Lead {
  id: string;
  company_id: string;
  contact_id: string;
  company?: Company;
  contact?: Contact;
  owner_sdr_id: string;
  owner_sdr_name: string;
  owner_ae_id: string;
  owner_ae_name: string;
  score: number;
  category: LeadCategory;
  status: LeadStatus;
  source: 'Inbound Demo' | 'Website Visitor' | 'Outbound Signal' | 'LinkedIn' | 'Referral' | 'Webinar' | 'CSV Import';
  created_at: string;
  updated_at: string;
  next_action: string;
  next_action_reason: string;
  next_followup_at: string;
  score_breakdown: LeadScoreBreakdown;
  score_history: ScoreHistoryEntry[];
  ai_analysis?: AILeadAnalysis;
  research_report?: {
    summary: string;
    findings: ResearchFinding[];
    last_researched_at: string;
  };
  data_quality: {
    score: number; // 0-100
    missing_fields: string[];
    stale_fields: string[];
  };
  outcome?: LeadOutcome;
  outcome_notes?: string;
  outcome_date?: string;
}

export interface ICPConfig {
  weights: {
    icp_fit_max: number; // default 30
    hiring_activity_max: number; // default 20
    persona_max: number; // default 15
    company_growth_max: number; // default 15
    intent_max: number; // default 10
    engagement_max: number; // default 10
    tech_stack_max: number; // default 10
  };
  target_industries: { name: string; multiplier: number }[];
  target_company_sizes: { min: number; max: number; label: string; score: number }[];
  target_geographies: { name: string; tier: 1 | 2 | 3 }[];
  persona_scores: Record<string, number>;
  intent_signal_weights: Record<string, number>;
  category_thresholds: {
    hot_min: number; // 90
    high_priority_min: number; // 75
    qualified_min: number; // 60
    nurture_min: number; // 40
  };
}

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  condition: {
    field: 'score' | 'company_size' | 'geography' | 'industry' | 'recruiting_complexity';
    operator: '>=' | '<=' | '==' | 'contains';
    value: any;
  }[];
  assignment: {
    sdr_id: string;
    ae_id: string;
    notify_ae: boolean;
  };
  enabled: boolean;
}

export interface RevOpsKPIs {
  total_leads: number;
  hot_leads: number;
  high_priority_leads: number;
  leads_requiring_action: number;
  meetings_booked: number;
  conversion_rate: number;
  avg_lead_score: number;
  leads_added_this_week: number;
  overdue_followups_count: number;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  lead_id?: string;
}

export interface SystemTestResult {
  id: string;
  title: string;
  passed: boolean;
  execution_time_ms: number;
  expected: string;
  actual: string;
  details: string;
}

export interface EnvVariableItem {
  key: string;
  value: string;
  rawLength: number;
  isSet: boolean;
  category: 'AI & Intelligence' | 'Database & Storage' | 'OAuth & Integrations' | 'App & Runtime' | 'Custom';
  description: string;
  required: boolean;
  defaultValue?: string;
  isSecret?: boolean;
  lastUpdated?: string;
}

export interface EnvTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
  error?: string;
}

