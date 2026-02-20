export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  primaryColor: string;
  status: "active" | "suspended" | "trial";
  plan: "starter" | "business" | "enterprise";
  entitiesCount: number;
  usersCount: number;
  createdAt: string;
}

export interface Entity {
  id: string;
  tenantId: string;
  name: string;
  budget: number;
  budgetUsed: number;
  usersCount: number;
}

export interface User {
  id: string;
  tenantId: string;
  entityId: string;
  name: string;
  email: string;
  role: "super_admin" | "shop_manager" | "dept_manager" | "employee";
  avatar?: string;
  monthlyBudgetCap: number;
  monthlySpent: number;
  status: "active" | "inactive";
}

export interface Order {
  id: string;
  tenantId: string;
  entityId: string;
  userId: string;
  userName: string;
  type: "staff" | "bulk";
  status: "pending" | "approved" | "rejected" | "processing" | "shipped" | "delivered";
  total: number;
  itemsCount: number;
  createdAt: string;
  approvedBy?: string;
}

export interface Address {
  id: string;
  label: string;
  type: "delivery" | "billing";
  line1: string;
  city: string;
  country: string;
}

export const mockTenants: Tenant[] = [
  { id: "t1", name: "Acme Corporation", slug: "acme", primaryColor: "#0ea5e9", status: "active", plan: "enterprise", entitiesCount: 12, usersCount: 340, createdAt: "2024-01-15" },
  { id: "t2", name: "GlobalTech Industries", slug: "globaltech", primaryColor: "#8b5cf6", status: "active", plan: "business", entitiesCount: 5, usersCount: 89, createdAt: "2024-03-22" },
  { id: "t3", name: "Nordic Supply Co", slug: "nordic", primaryColor: "#10b981", status: "trial", plan: "starter", entitiesCount: 2, usersCount: 15, createdAt: "2025-01-10" },
  { id: "t4", name: "Meridian Group", slug: "meridian", primaryColor: "#f59e0b", status: "active", plan: "business", entitiesCount: 8, usersCount: 156, createdAt: "2024-06-01" },
  { id: "t5", name: "Zenith Logistics", slug: "zenith", primaryColor: "#ef4444", status: "suspended", plan: "enterprise", entitiesCount: 15, usersCount: 420, createdAt: "2023-11-20" },
];

export const mockUsers: User[] = [
  { id: "u1", tenantId: "t1", entityId: "e1", name: "Sarah Chen", email: "sarah@acme.com", role: "shop_manager", monthlyBudgetCap: 5000, monthlySpent: 1200, status: "active" },
  { id: "u2", tenantId: "t1", entityId: "e1", name: "James Wilson", email: "james@acme.com", role: "dept_manager", monthlyBudgetCap: 3000, monthlySpent: 2800, status: "active" },
  { id: "u3", tenantId: "t1", entityId: "e2", name: "Maria Garcia", email: "maria@acme.com", role: "employee", monthlyBudgetCap: 500, monthlySpent: 320, status: "active" },
  { id: "u4", tenantId: "t2", entityId: "e3", name: "David Kim", email: "david@globaltech.com", role: "shop_manager", monthlyBudgetCap: 10000, monthlySpent: 4500, status: "active" },
  { id: "u5", tenantId: "t2", entityId: "e3", name: "Lisa Johnson", email: "lisa@globaltech.com", role: "employee", monthlyBudgetCap: 800, monthlySpent: 0, status: "inactive" },
  { id: "u6", tenantId: "t3", entityId: "e4", name: "Tom Brown", email: "tom@nordic.com", role: "dept_manager", monthlyBudgetCap: 2000, monthlySpent: 980, status: "active" },
];

export const mockOrders: Order[] = [
  { id: "ORD-001", tenantId: "t1", entityId: "e1", userId: "u3", userName: "Maria Garcia", type: "staff", status: "delivered", total: 89.99, itemsCount: 3, createdAt: "2025-02-15" },
  { id: "ORD-002", tenantId: "t1", entityId: "e1", userId: "u2", userName: "James Wilson", type: "bulk", status: "pending", total: 12500, itemsCount: 250, createdAt: "2025-02-18" },
  { id: "ORD-003", tenantId: "t2", entityId: "e3", userId: "u4", userName: "David Kim", type: "bulk", status: "approved", total: 8750, itemsCount: 120, createdAt: "2025-02-17" },
  { id: "ORD-004", tenantId: "t1", entityId: "e2", userId: "u3", userName: "Maria Garcia", type: "staff", status: "processing", total: 45.50, itemsCount: 1, createdAt: "2025-02-19" },
  { id: "ORD-005", tenantId: "t3", entityId: "e4", userId: "u6", userName: "Tom Brown", type: "bulk", status: "rejected", total: 3200, itemsCount: 50, createdAt: "2025-02-14" },
  { id: "ORD-006", tenantId: "t2", entityId: "e3", userId: "u5", userName: "Lisa Johnson", type: "staff", status: "shipped", total: 156.00, itemsCount: 4, createdAt: "2025-02-16" },
  { id: "ORD-007", tenantId: "t4", entityId: "e5", userId: "u7", userName: "Alex Turner", type: "bulk", status: "pending", total: 22000, itemsCount: 500, createdAt: "2025-02-19" },
  { id: "ORD-008", tenantId: "t1", entityId: "e1", userId: "u1", userName: "Sarah Chen", type: "staff", status: "delivered", total: 234.00, itemsCount: 6, createdAt: "2025-02-10" },
];

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(amount);

export const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: "bg-success/10 text-success",
    trial: "bg-warning/10 text-warning",
    suspended: "bg-destructive/10 text-destructive",
    inactive: "bg-muted text-muted-foreground",
    pending: "bg-warning/10 text-warning",
    approved: "bg-primary/10 text-primary",
    rejected: "bg-destructive/10 text-destructive",
    processing: "bg-primary/10 text-primary",
    shipped: "bg-accent/10 text-accent",
    delivered: "bg-success/10 text-success",
  };
  return colors[status] || "bg-muted text-muted-foreground";
};
