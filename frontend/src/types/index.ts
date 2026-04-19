// ---- shared ----
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
}

// ---- resellers ----
export interface ResellerSummary {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  managerId: string;
  managerName: string;
  status: "active" | "inactive" | "blocked";
  openConsignments: number;
  openValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface Reseller extends ResellerSummary {
  cpf: string | null;
  birthDate: string | null;
  phone2: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressNeighborhood: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZip: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  reference1Name: string | null;
  reference1Phone: string | null;
  reference2Name: string | null;
  reference2Phone: string | null;
  notes: string | null;
  openConsignments: number;
  openValue: number;
}

export interface ResellerBalance {
  resellerId: string;
  resellerName: string;
  openConsignmentsCount: number;
  totalSentValue: number;
  totalSoldValue: number;
  totalCommissionDue: number;
  netToReceive: number;
  totalSettlementsCount: number;
  lastSettlementDate: string | null;
}

// ---- products ----
export interface ProductImage {
  id: string;
  storagePath: string;
  publicUrl: string | null;
  displayOrder: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface ProductSummary {
  id: string;
  code: string | null;
  name: string;
  category: string;
  salePrice: number;
  commissionRate: number;
  stockTotal: number;
  stockAvailable: number;
  active: boolean;
  primaryImageUrl: string | null;
  createdAt: string;
}

export interface Product extends ProductSummary {
  description: string | null;
  costPrice: number | null;
  images: ProductImage[];
  updatedAt: string;
}

export interface ProductTracking {
  id: string;
  code: string | null;
  name: string;
  stockTotal: number;
  stockAvailable: number;
  stockOnConsignment: number;
  totalConsignedValue: number;
}

// ---- consignments ----
export interface ConsignmentItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string | null;
  quantitySent: number;
  quantitySold: number;
  quantityReturned: number;
  quantityLost: number;
  salePrice: number;
  commissionRate: number;
  status: "pending" | "partially_settled" | "settled";
  soldValue: number;
  commissionValue: number;
}

export interface ConsignmentSummary {
  id: string;
  resellerId: string;
  resellerName: string;
  managerId: string;
  managerName: string;
  deliveredAt: string;
  expectedReturnAt: string | null;
  status: "open" | "partially_settled" | "settled" | "overdue";
  totalItems: number;
  totalValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface Consignment extends ConsignmentSummary {
  notes: string | null;
  items: ConsignmentItem[];
  totalSentValue: number;
  totalSoldValue: number;
}

// ---- settlements ----
export interface Settlement {
  id: string;
  resellerId: string;
  resellerName: string;
  managerId: string;
  managerName: string;
  consignmentId: string | null;
  settlementDate: string;
  totalSoldValue: number;
  totalCommission: number;
  netToReceive: number;
  paymentMethod: string;
  notes: string | null;
  createdAt: string;
}

export interface SettlementsSummary {
  totalSettlements: number;
  totalSoldValue: number;
  totalCommission: number;
  totalNetReceived: number;
}

// ---- dashboard ----
export interface DashboardSummary {
  activeResellers: number;
  openConsignments: number;
  overdueConsignments: number;
  totalItemsOnConsignment: number;
  totalOpenValue: number;
  totalSettledThisMonth: number;
}

export interface DashboardAlert {
  type: "overdue" | "pending_return";
  consignmentId: string;
  resellerId: string;
  resellerName: string;
  message: string;
  expectedReturnAt: string;
  daysOverdue: number;
}

export interface DashboardChartPoint {
  month: string;
  totalValue: number;
  totalCommission: number;
  netReceived: number;
}

export interface DashboardChartData {
  monthlySales: DashboardChartPoint[];
}

export interface DashboardResellerNode {
  id: string;
  name: string;
  status: string;
  openConsignments: number;
}

export interface DashboardManagerNode {
  id: string;
  name: string;
  resellers: DashboardResellerNode[];
}

export interface DashboardTree {
  managers: DashboardManagerNode[];
}

// ---- settings ----
export interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  plan: string;
  defaultCommissionRate: number;
  defaultReturnDays: number;
  blockNewLotIfOverdue: boolean;
  trialEndsAt: string | null;
  createdAt: string;
}

export interface Manager {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  createdAt: string;
}
