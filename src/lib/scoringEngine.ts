import { Company, Contact, ICPConfig, LeadCategory, LeadScoreBreakdown, Signal } from '../types/index.ts';

export const defaultICPConfig: ICPConfig = {
  weights: {
    icp_fit_max: 30,
    hiring_activity_max: 20,
    persona_max: 15,
    company_growth_max: 15,
    intent_max: 10,
    engagement_max: 10,
    tech_stack_max: 10,
  },
  target_industries: [
    { name: 'Software / SaaS / Tech', multiplier: 1.0 },
    { name: 'Financial Services & FinTech', multiplier: 0.95 },
    { name: 'Healthcare & HealthTech', multiplier: 0.9 },
    { name: 'E-commerce & Retail', multiplier: 0.85 },
    { name: 'Staffing & Recruiting Agencies', multiplier: 1.0 },
    { name: 'Logistics & Supply Chain', multiplier: 0.8 },
    { name: 'Manufacturing / Industrial', multiplier: 0.65 },
    { name: 'Other', multiplier: 0.5 },
  ],
  target_company_sizes: [
    { min: 500, max: 100000, label: '500+ employees (Enterprise)', score: 30 },
    { min: 200, max: 499, label: '200-499 employees (Upper Mid-Market)', score: 26 },
    { min: 50, max: 199, label: '50-199 employees (Mid-Market)', score: 20 },
    { min: 20, max: 49, label: '20-49 employees (Growth Startup)', score: 14 },
    { min: 1, max: 19, label: '<20 employees (Early Stage)', score: 6 },
  ],
  target_geographies: [
    { name: 'United States', tier: 1 },
    { name: 'Canada', tier: 1 },
    { name: 'United Kingdom', tier: 1 },
    { name: 'European Union', tier: 1 },
    { name: 'India', tier: 2 },
    { name: 'Australia / Singapore', tier: 2 },
    { name: 'Latin America', tier: 3 },
    { name: 'Other', tier: 3 },
  ],
  persona_scores: {
    'Head of Talent Acquisition': 15,
    'VP of Talent Acquisition': 15,
    'Talent Acquisition Director': 14,
    'Chief People Officer (CPO)': 14,
    'Chief Human Resources Officer (CHRO)': 13,
    'Head of People': 13,
    'Head of HR': 12,
    'Recruiting Operations Lead': 12,
    'TA Manager': 11,
    'Recruitment Manager': 10,
    'HR Operations Manager': 9,
    'Founder & CEO': 10, // high impact in smaller companies
    'COO': 9,
    'Senior Recruiter': 7,
    'Other': 3,
  },
  intent_signal_weights: {
    'actively_hiring_10_plus': 8,
    'hiring_recruiters': 7,
    'recent_funding': 8,
    'ta_leadership_change': 6,
    'rapid_hiring_growth': 6,
    'ats_implementation': 6,
    'website_visit_high_intent': 5,
    'inbound_demo_request': 9,
  },
  category_thresholds: {
    hot_min: 90,
    high_priority_min: 75,
    qualified_min: 60,
    nurture_min: 40,
  },
};

/**
 * Calculates a transparent, explainable 0-100 lead score based on the Resourcely ICP framework.
 */
export function calculateLeadScore(
  company: Company,
  contact: Contact,
  signals: Signal[] = [],
  customConfig: ICPConfig = defaultICPConfig,
  engagementCount: number = 2
): LeadScoreBreakdown {
  const reasons: string[] = [];
  let negativeSignalsPenalty = 0;

  // 1. ICP Fit Score (max ~30)
  // Evaluates company size, employee count, industry fit, recruitment complexity
  let icpScore = 0;
  const sizeMatch = customConfig.target_company_sizes.find(
    (s) => company.employee_count >= s.min && company.employee_count <= s.max
  );
  if (sizeMatch) {
    icpScore += (sizeMatch.score / 30) * 16;
    if (company.employee_count >= 500) {
      reasons.push(`${company.employee_count}+ employees (high-volume hiring pool)`);
    } else if (company.employee_count >= 100) {
      reasons.push(`${company.employee_count} employees (sweet-spot mid-market)`);
    }
  }

  // Industry multiplier
  const indMatch = customConfig.target_industries.find((i) =>
    company.industry.toLowerCase().includes(i.name.toLowerCase())
  );
  const indMult = indMatch ? indMatch.multiplier : 0.8;
  icpScore += 8 * indMult;
  if (indMult >= 0.9) {
    reasons.push(`High ICP industry fit: ${company.industry}`);
  }

  // Recruitment complexity
  if (company.recruitment_complexity === 'High') {
    icpScore += 6;
    reasons.push('High recruitment workflow complexity');
  } else if (company.recruitment_complexity === 'Medium') {
    icpScore += 4;
  } else {
    icpScore += 2;
  }
  const icpFitScore = Math.min(customConfig.weights.icp_fit_max, Math.round(icpScore));

  // 2. Hiring Activity Score (max ~20)
  let hiringScore = 0;
  if (company.open_positions_count >= 20) {
    hiringScore += 12;
    reasons.push(`Actively hiring ${company.open_positions_count} open roles`);
  } else if (company.open_positions_count >= 10) {
    hiringScore += 9;
    reasons.push(`Actively hiring ${company.open_positions_count} open roles`);
  } else if (company.open_positions_count >= 4) {
    hiringScore += 6;
    reasons.push(`Hiring ${company.open_positions_count} open roles`);
  } else {
    hiringScore += 2;
  }

  if (company.recruiter_hiring_count >= 2) {
    hiringScore += 8;
    reasons.push(`Hiring ${company.recruiter_hiring_count} recruiters (TA team scaling)`);
  } else if (company.recruiter_hiring_count === 1) {
    hiringScore += 5;
    reasons.push('Actively recruiting for TA roles');
  }
  const hiringActivityScore = Math.min(customConfig.weights.hiring_activity_max, Math.round(hiringScore));

  // 3. Persona Score (max ~15)
  let pScore = 4;
  const titleLower = contact.title.toLowerCase();
  for (const [personaTitle, weight] of Object.entries(customConfig.persona_scores)) {
    if (titleLower.includes(personaTitle.toLowerCase())) {
      pScore = weight;
      reasons.push(`Target persona identified: ${contact.title}`);
      break;
    }
  }
  if (pScore === 4) {
    if (titleLower.includes('talent') || titleLower.includes('people') || titleLower.includes('recruiting')) {
      pScore = 11;
      reasons.push(`Talent / People leadership role: ${contact.title}`);
    } else if (titleLower.includes('hr') || titleLower.includes('human resources')) {
      pScore = 10;
      reasons.push(`HR decision maker: ${contact.title}`);
    }
  }
  const personaScore = Math.min(customConfig.weights.persona_max, Math.round(pScore));

  // 4. Company Growth & Funding Score (max ~15)
  let growthScore = 3;
  if (company.funding_stage === 'Series B' || company.funding_stage === 'Series C+' || company.funding_stage === 'IPO/Public') {
    growthScore += 8;
    reasons.push(`Well-capitalized (${company.funding_stage}, ${company.total_funding})`);
  } else if (company.funding_stage === 'Series A') {
    growthScore += 6;
    reasons.push(`Funded Series A (${company.total_funding})`);
  } else if (company.funding_stage === 'Seed') {
    growthScore += 4;
  }

  if (company.hiring_growth_rate.includes('+') && !company.hiring_growth_rate.includes('+0')) {
    growthScore += 4;
    reasons.push(`Rapid headcount velocity (${company.hiring_growth_rate})`);
  }
  const companyGrowthScore = Math.min(customConfig.weights.company_growth_max, Math.round(growthScore));

  // 5. Intent Score (max ~10)
  let intentScore = 3;
  const companySignals = signals.filter((s) => s.company_id === company.id);
  const hasFundingSignal = companySignals.some((s) => s.signal_type === 'FUNDING_ANNOUNCEMENT');
  const hasHiringSpike = companySignals.some((s) => s.signal_type === 'HIRING_SPIKE' || s.signal_type === 'RECRUITER_HIRING');
  const hasLeadershipChange = companySignals.some((s) => s.signal_type === 'TA_LEADERSHIP_CHANGE');

  if (hasFundingSignal) {
    intentScore += 4;
    reasons.push('Recent funding signal detected in last 30 days');
  }
  if (hasHiringSpike) {
    intentScore += 3;
    reasons.push('Significant hiring spike detected');
  }
  if (hasLeadershipChange) {
    intentScore += 3;
    reasons.push('New Talent Acquisition leadership appointed');
  }
  const intentScoreCalculated = Math.min(customConfig.weights.intent_max, Math.round(intentScore));

  // 6. Engagement Score (max ~10)
  let engScore = Math.min(customConfig.weights.engagement_max, engagementCount * 3 + 2);
  if (engScore >= 7) {
    reasons.push(`High engagement: ${engagementCount} recent interactions`);
  }

  // 7. Technology / Stack Score (max ~10)
  let techScore = 2;
  if (company.ats_usage && company.ats_usage !== 'None') {
    techScore += 4;
    reasons.push(`Uses modern ATS (${company.ats_usage}) - integration ready`);
  }
  if (company.ai_adoption === 'Exploring' || company.ai_adoption === 'High') {
    techScore += 3;
    reasons.push(`Open to AI recruitment tech (${company.ai_adoption} adoption)`);
  }
  const techStackScore = Math.min(customConfig.weights.tech_stack_max, Math.round(techScore));

  // 8. Negative signals / penalties
  if (company.open_positions_count === 0) {
    negativeSignalsPenalty -= 10;
    reasons.push('⚠️ Zero active open positions detected (-10)');
  }
  if (company.employee_count < 15 && company.funding_stage === 'Bootstrapped') {
    negativeSignalsPenalty -= 5;
    reasons.push('⚠️ Very small team size without venture backing (-5)');
  }

  // Calculate raw sum
  const rawTotal =
    icpFitScore +
    hiringActivityScore +
    personaScore +
    companyGrowthScore +
    intentScoreCalculated +
    engScore +
    techStackScore +
    negativeSignalsPenalty;

  const totalScore = Math.max(0, Math.min(100, rawTotal));

  // Data Confidence Score (based on completeness of contact info and company enrichment)
  let conf = 100;
  if (!contact.phone) conf -= 15;
  if (!contact.linkedin_url) conf -= 10;
  if (!company.ats_usage || company.ats_usage === 'None') conf -= 10;
  if (!company.recent_funding_date && company.funding_stage !== 'Bootstrapped') conf -= 8;
  const dataConfidenceScore = Math.max(40, conf);

  return {
    total_score: totalScore,
    icp_fit_score: icpFitScore,
    hiring_activity_score: hiringActivityScore,
    persona_score: personaScore,
    company_growth_score: companyGrowthScore,
    intent_score: intentScoreCalculated,
    engagement_score: engScore,
    tech_stack_score: techStackScore,
    data_confidence_score: dataConfidenceScore,
    negative_signals_penalty: negativeSignalsPenalty,
    reasons,
    last_calculated_at: new Date().toISOString(),
  };
}

/**
 * Maps numeric score to category based on configurable thresholds
 */
export function determineLeadCategory(
  score: number,
  thresholds = defaultICPConfig.category_thresholds
): { category: LeadCategory; action: string; label: string; color: string; badgeColor: string } {
  if (score >= thresholds.hot_min) {
    return {
      category: 'HOT',
      label: '🔥 HOT',
      action: 'Immediate SDR action',
      color: 'text-rose-600',
      badgeColor: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    };
  }
  if (score >= thresholds.high_priority_min) {
    return {
      category: 'HIGH_PRIORITY',
      label: '🟢 HIGH PRIORITY',
      action: 'Contact within 24h',
      color: 'text-emerald-600',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    };
  }
  if (score >= thresholds.qualified_min) {
    return {
      category: 'QUALIFIED',
      label: '🟡 QUALIFIED',
      action: 'Add to active sequence',
      color: 'text-amber-600',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    };
  }
  if (score >= thresholds.nurture_min) {
    return {
      category: 'NURTURE',
      label: '🔵 NURTURE',
      action: 'Monitor and nurture',
      color: 'text-sky-600',
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    };
  }
  return {
    category: 'LOW_FIT',
    label: '⚪ LOW FIT',
    action: 'Deprioritize',
    color: 'text-slate-500',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };
}
