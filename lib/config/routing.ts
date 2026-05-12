import { CLIENT_ASSUMPTIONS } from './client-assumptions';

export interface RoutingRule {
  role: string;
  user: string;
  criteria: string;
}

export const ROUTING_RULES: Record<string, RoutingRule> = {
  INVOICE_VARIANCE: {
    role: 'FINANCE_CONTROLLER',
    user: 'Madhan (FC)',
    criteria: 'Standard monthly invoice verification'
  },
  LD_EXPOSURE: {
    role: 'OPERATIONS_MANAGER',
    user: 'Karthik (Ops)',
    criteria: 'Availability shortfall requiring technical sign-off'
  },
  HIGH_VARIANCE: {
    role: 'FINANCE_HEAD',
    user: 'Srinivasan (VP)',
    criteria: `Invoice variance exceeds ${CLIENT_ASSUMPTIONS.thresholds.highVariancePct}% or ₹${(CLIENT_ASSUMPTIONS.thresholds.highVarianceAmount/100000).toFixed(0)} Lakhs`
  },
  LOW_CONFIDENCE: {
    role: 'LEGAL',
    user: 'Anjali (Legal)',
    criteria: `AI extraction confidence below ${(CLIENT_ASSUMPTIONS.thresholds.lowConfidenceScore * 100).toFixed(0)}% or manual override required`
  },
  AUDIT_REVIEW: {
    role: 'IT_OBSERVER',
    user: 'John (IT)',
    criteria: 'System audit and integration monitoring'
  },
  SYSTEM_CONFIG: {
    role: 'CEI_ADMIN',
    user: 'Admin',
    criteria: 'System level configuration and demo reset'
  }
};

export function getRouteForFinding(finding: any): RoutingRule {
  if (finding.check_id === 'LD_EXPOSURE' || finding.check_id === 'CURTAILMENT_ISSUE' || finding.check_id === 'EVIDENCE_GAP') {
    return ROUTING_RULES.LD_EXPOSURE;
  }
  if (finding.check_id === 'HIGH_VARIANCE' || finding.financial_impact > CLIENT_ASSUMPTIONS.thresholds.highVarianceAmount) {
    return ROUTING_RULES.HIGH_VARIANCE;
  }
  if (finding.check_id === 'LOW_CONFIDENCE_CLAUSE' || (finding.confidence_score && finding.confidence_score < CLIENT_ASSUMPTIONS.thresholds.lowConfidenceScore)) {
    return ROUTING_RULES.LOW_CONFIDENCE;
  }
  return ROUTING_RULES.INVOICE_VARIANCE;
}
