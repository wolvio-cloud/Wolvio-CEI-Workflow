export type Role = 
  | 'FINANCE_CONTROLLER' 
  | 'OPS_MANAGER' 
  | 'FINANCE_HEAD' 
  | 'LEGAL' 
  | 'IT_OBSERVER' 
  | 'CEI_ADMIN';

export interface UserProfile {
  id: string;
  name: string;
  role: Role;
  roleLabel: string;
}

export const USERS: Record<Role, UserProfile> = {
  FINANCE_CONTROLLER: { id: 'user_fc', name: 'Madhan (FC)', role: 'FINANCE_CONTROLLER', roleLabel: 'Finance Controller' },
  OPS_MANAGER: { id: 'user_ops', name: 'Karthik (Ops)', role: 'OPS_MANAGER', roleLabel: 'Operations Manager' },
  FINANCE_HEAD: { id: 'user_fh', name: 'Srinivasan (VP)', role: 'FINANCE_HEAD', roleLabel: 'Finance Head' },
  LEGAL: { id: 'user_legal', name: 'Anjali (Legal)', role: 'LEGAL', roleLabel: 'Legal / Contracts' },
  IT_OBSERVER: { id: 'user_it', name: 'John (IT)', role: 'IT_OBSERVER', roleLabel: 'IT Observer' },
  CEI_ADMIN: { id: 'user_admin', name: 'System Admin', role: 'CEI_ADMIN', roleLabel: 'CEI Admin' },
};

export const PERMISSIONS = {
  APPROVE_INVOICE: ['FINANCE_CONTROLLER', 'FINANCE_HEAD', 'CEI_ADMIN'],
  APPROVE_LD: ['OPS_MANAGER', 'FINANCE_CONTROLLER', 'CEI_ADMIN'],
  APPROVE_HIGH_IMPACT: ['FINANCE_HEAD', 'CEI_ADMIN'],
  GENERATE_INVOICE: ['FINANCE_CONTROLLER', 'FINANCE_HEAD', 'CEI_ADMIN'],
  OVERRIDE_PARAM: ['FINANCE_HEAD', 'LEGAL', 'CEI_ADMIN'],
  VIEW_AUDIT: ['FINANCE_CONTROLLER', 'OPS_MANAGER', 'FINANCE_HEAD', 'LEGAL', 'IT_OBSERVER', 'CEI_ADMIN'],
  MANAGE_ROUTING: ['CEI_ADMIN'],
  RESET_DEMO: ['CEI_ADMIN'],
  UPLOAD_CONTRACT: ['CEI_ADMIN'],
};

export function hasPermission(role: Role, action: keyof typeof PERMISSIONS): boolean {
  return PERMISSIONS[action].includes(role);
}
