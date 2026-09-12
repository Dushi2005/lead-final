import { Company, Contact, Lead, RoutingRule, User } from '../types/index.ts';

export const defaultRoutingRules: RoutingRule[] = [
  {
    id: 'rule-enterprise',
    name: 'Enterprise High-Score to Senior SDR & AE',
    priority: 1,
    condition: [
      { field: 'score', operator: '>=', value: 85 },
      { field: 'company_size', operator: '>=', value: 500 },
    ],
    assignment: {
      sdr_id: 'user-sdr-1', // Sarah Jenkins
      ae_id: 'user-ae-1',  // Rahul Sharma
      notify_ae: true,
    },
    enabled: true,
  },
  {
    id: 'rule-india-apac',
    name: 'APAC & India Territory Routing',
    priority: 2,
    condition: [
      { field: 'geography', operator: 'contains', value: 'India' },
      { field: 'score', operator: '>=', value: 70 },
    ],
    assignment: {
      sdr_id: 'user-sdr-2', // Marcus Vance
      ae_id: 'user-ae-2',  // Elena Rostova
      notify_ae: true,
    },
    enabled: true,
  },
  {
    id: 'rule-mid-market',
    name: 'Mid-Market Fast Response',
    priority: 3,
    condition: [
      { field: 'company_size', operator: '>=', value: 100 },
      { field: 'score', operator: '>=', value: 65 },
    ],
    assignment: {
      sdr_id: 'user-sdr-3', // Chloe Chen
      ae_id: 'user-ae-1',  // Rahul Sharma
      notify_ae: false,
    },
    enabled: true,
  },
  {
    id: 'rule-standard-catchall',
    name: 'Standard Round-Robin Routing',
    priority: 99,
    condition: [
      { field: 'score', operator: '>=', value: 0 },
    ],
    assignment: {
      sdr_id: 'user-sdr-1',
      ae_id: 'user-ae-2',
      notify_ae: false,
    },
    enabled: true,
  },
];

export function routeLead(
  company: Company,
  contact: Contact,
  score: number,
  rules: RoutingRule[] = defaultRoutingRules,
  allUsers: User[] = []
): { sdr: User; ae: User; matchedRule?: RoutingRule; reason: string } {
  const activeRules = rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);

  for (const rule of activeRules) {
    const allConditionsMet = rule.condition.every((cond) => {
      let fieldValue: any;
      if (cond.field === 'score') fieldValue = score;
      else if (cond.field === 'company_size') fieldValue = company.employee_count;
      else if (cond.field === 'geography') fieldValue = company.location;
      else if (cond.field === 'industry') fieldValue = company.industry;
      else if (cond.field === 'recruiting_complexity') fieldValue = company.recruitment_complexity;

      if (cond.operator === '>=') return fieldValue >= cond.value;
      if (cond.operator === '<=') return fieldValue <= cond.value;
      if (cond.operator === '==') return fieldValue === cond.value;
      if (cond.operator === 'contains') return String(fieldValue).toLowerCase().includes(String(cond.value).toLowerCase());
      return false;
    });

    if (allConditionsMet) {
      const sdr = allUsers.find((u) => u.id === rule.assignment.sdr_id) || allUsers.find((u) => u.role === 'SDR') || {
        id: 'user-sdr-1',
        name: 'Sarah Jenkins',
        email: 'sarah@resourcely.ai',
        role: 'SDR',
        team: 'Enterprise Outbound',
        timezone: 'America/New_York',
        calendar_provider: 'google',
        calendar_connected: true,
      };

      const ae = allUsers.find((u) => u.id === rule.assignment.ae_id) || allUsers.find((u) => u.role === 'AE') || {
        id: 'user-ae-1',
        name: 'Rahul Sharma',
        email: 'rahul@resourcely.ai',
        role: 'AE',
        team: 'Strategic Accounts',
        timezone: 'America/New_York',
        calendar_provider: 'google',
        calendar_connected: true,
      };

      return {
        sdr,
        ae,
        matchedRule: rule,
        reason: `Matched routing rule "${rule.name}" based on score (${score}) and company criteria (${company.location}, ${company.employee_count} emp).`,
      };
    }
  }

  // Default fallback
  const defaultSdr = allUsers.find((u) => u.role === 'SDR') || {
    id: 'user-sdr-1',
    name: 'Sarah Jenkins',
    email: 'sarah@resourcely.ai',
    role: 'SDR',
    team: 'Enterprise Outbound',
    timezone: 'America/New_York',
    calendar_provider: 'google',
    calendar_connected: true,
  };
  const defaultAe = allUsers.find((u) => u.role === 'AE') || {
    id: 'user-ae-1',
    name: 'Rahul Sharma',
    email: 'rahul@resourcely.ai',
    role: 'AE',
    team: 'Strategic Accounts',
    timezone: 'America/New_York',
    calendar_provider: 'google',
    calendar_connected: true,
  };

  return {
    sdr: defaultSdr,
    ae: defaultAe,
    reason: 'Assigned via default round-robin workload distribution.',
  };
}
