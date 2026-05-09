export interface RoutingRule {
  role: string;
  user: string;
  criteria: string;
}

export const APPROVAL_ROLES = {
  FINANCE_CONTROLLER: { name: 'Madhan (FC)', role: 'Finance Controller' },
  OPS_MANAGER: { name: 'Karthik (Ops)', role: 'Operations Manager' },
  FINANCE_HEAD: { name: 'Srinivasan (VP Finance)', role: 'Finance Head' },
  LEGAL: { name: 'Anjali (Legal)', role: 'Contracts Lead' }
};

export const ROUTING_RULES: Record<string, RoutingRule> = {
  INVOICE_VALIDATION: {
    role: 'Finance Controller',
    user: 'Madhan (FC)',
    criteria: 'Standard monthly invoice verification'
  },
  LD_EXPOSURE: {
    role: 'Operations Manager',
    user: 'Karthik (Ops)',
    criteria: 'Availability shortfall requiring technical sign-off'
  },
  HIGH_VARIANCE: {
    role: 'Finance Head',
    user: 'Srinivasan (VP)',
    criteria: 'Invoice variance exceeds 10% or ₹10 Lakhs'
  },
  LOW_CONFIDENCE: {
    role: 'Legal / Contracts',
    user: 'Anjali (Legal)',
    criteria: 'AI extraction confidence below 85% or manual override required'
  },
  AUDIT_REVIEW: {
    role: 'IT Observer',
    user: 'John (IT)',
    criteria: 'System audit and integration monitoring'
  }
};

export function getRouteForFinding(finding: any): RoutingRule {
  if (finding.check_id === 'AVAILABILITY_CHECK' || finding.check_id === 'CURTAILMENT_CHECK') {
    return ROUTING_RULES.LD_EXPOSURE;
  }
  if (finding.gap_amount > 1000000) {
    return ROUTING_RULES.HIGH_VARIANCE;
  }
  if (finding.verdict === 'AMBIGUOUS' || (finding.confidence_score && finding.confidence_score < 0.85)) {
    return ROUTING_RULES.LOW_CONFIDENCE;
  }
  return ROUTING_RULES.INVOICE_VALIDATION;
}
