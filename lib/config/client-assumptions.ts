/**
 * Wolvio CEI — Client Assumptions & Configurable Defaults
 * 
 * These are demo defaults based on renewable-energy-sector standards.
 * Replace with client-confirmed values after discovery phase.
 */

export const CLIENT_ASSUMPTIONS = {
  // 1. Contract / Billing Defaults
  billing: {
    frequency: 'monthly',
    baseFeeType: 'fixed_om_fee',
    escalationType: 'wpi_annual',
    escalationEffectiveMonth: 4, // April
    escalationBaseMonth: 1,      // January
    paymentTermsDays: 45,
    taxRate: 0.18,               // 18% GST default
    currency: 'INR'
  },

  // 2. Operational Data Defaults
  operational: {
    availabilityGuaranteePct: 96.0,
    maintenanceHoursAllowance: 168, // Annual
    downtimeCategories: [
      'turbine_fault',
      'grid_curtailment',
      'planned_maintenance',
      'force_majeure',
      'customer_caused',
      'unknown'
    ],
    exclusionEligibility: {
      grid_curtailment: true,
      planned_maintenance: true,
      force_majeure: true,
      customer_caused: true
    }
  },

  // 3. Workflow Routing Matrix
  // Maps exception types to assigned roles
  routing: {
    INVOICE_VARIANCE: ['FINANCE_CONTROLLER'],
    HIGH_VARIANCE: ['FINANCE_HEAD'],
    LD_EXPOSURE: ['OPERATIONS_MANAGER', 'FINANCE_CONTROLLER'],
    CURTAILMENT_ISSUE: ['OPERATIONS_MANAGER'],
    EVIDENCE_GAP: ['OPERATIONS_MANAGER'],
    SAP_DATA_GAP: ['FINANCE_CONTROLLER'],
    LOW_CONFIDENCE_CLAUSE: ['LEGAL_CONTRACTS'],
    MANUAL_OVERRIDE: ['FINANCE_HEAD', 'LEGAL_CONTRACTS'],
    INTEGRATION_ERROR: ['IT_OBSERVER'],
    SYSTEM_CONFIG: ['CEI_ADMIN']
  },

  // 4. Thresholds
  thresholds: {
    highVarianceAmount: 500000, // ₹5 Lakhs
    highVariancePct: 5,         // 5%
    lowConfidenceScore: 0.7     // Below 70%
  },

  // 5. Reminder Timings (Days)
  reminders: {
    invoiceApprovalPending: 2,
    ldEvidenceReviewPending: 2,
    sapEntryPending: 3,
    correctionRequested: 3,
    followUpRequired: 7
  },

  // 6. Integration Modes (Phase 1 Boundaries)
  modes: {
    sap: 'mock',               // mock | export | read-only-odata
    contracts: 'upload',        // upload | sharepoint | folder
    scada: 'seeded',           // seeded | csv-upload | api
    curtailment: 'seeded',      // seeded | csv-upload | document
    ai: 'cloud',               // seeded | cloud | self-hosted
    communication: 'draft_only' // disabled | draft_only | approved_external
  }
};

export type ClientConfig = typeof CLIENT_ASSUMPTIONS;
