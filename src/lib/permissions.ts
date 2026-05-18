import type { UserRole, RFQStatus } from './types';

/** 财务可见的 RFQ 状态白名单 */
export const FINANCE_VISIBLE_STATUSES: RFQStatus[] = [
  'Quotation Completed',
  'Sent',
  'Closed',
  'Archived',
];

/** 哪些角色可以看到「人民币成本价 (salesCostPriceRMB)」 */
export const ROLES_THAT_CAN_SEE_RMB: UserRole[] = ['Purchasing', 'Finance', 'Admin'];

/** 哪些角色可以看到「财务专属仪表盘 / 导出 Excel」 */
export const ROLES_THAT_CAN_EXPORT_FINANCE: UserRole[] = ['Finance', 'Admin'];

export const canSeeRMB = (role?: UserRole) =>
  !!role && ROLES_THAT_CAN_SEE_RMB.includes(role);

export const canExportFinance = (role?: UserRole) =>
  !!role && ROLES_THAT_CAN_EXPORT_FINANCE.includes(role);

/** 财务可见 RFQ 过滤器 */
export const isVisibleToFinance = (status?: RFQStatus) =>
  !!status && FINANCE_VISIBLE_STATUSES.includes(status);