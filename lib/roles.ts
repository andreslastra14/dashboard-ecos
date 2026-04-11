export type Role = "admin" | "supervisor" | "operador" | "tecnico";

export interface RolePermissions {
  label: string;
  canManageUsers: boolean;
  canViewAllZones: boolean;
  canManageTickets: boolean;
  canGenerateReports: boolean;
}

export const ROLES: Record<Role, RolePermissions> = {
  admin: {
    label: "Administrador",
    canManageUsers: true,
    canViewAllZones: true,
    canManageTickets: true,
    canGenerateReports: true,
  },
  supervisor: {
    label: "Supervisor",
    canManageUsers: false,
    canViewAllZones: false,
    canManageTickets: true,
    canGenerateReports: true,
  },
  operador: {
    label: "Operador",
    canManageUsers: false,
    canViewAllZones: true,
    canManageTickets: false,
    canGenerateReports: false,
  },
  tecnico: {
    label: "Técnico",
    canManageUsers: false,
    canViewAllZones: true,
    canManageTickets: true,
    canGenerateReports: false,
  },
};
