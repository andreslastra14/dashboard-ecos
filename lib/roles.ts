export type Role = "admin" | "supervisor" | "operador" | "tecnico" | "maestro";

export interface RolePermissions {
  label: string;
  description: string;
  canManageUsers: boolean;
  canViewAllZones: boolean;
  canManageTickets: boolean;
  canGenerateReports: boolean;
  scopeLabel: string;
}

export const ROLES: Record<Role, RolePermissions> = {
  admin: {
    label: "Administrador",
    description: "Acceso total al sistema. Gestiona usuarios, zonas, tickets y reportes.",
    canManageUsers: true,
    canViewAllZones: true,
    canManageTickets: true,
    canGenerateReports: true,
    scopeLabel: "Todas las zonas y sondas",
  },
  supervisor: {
    label: "Supervisor",
    description: "Supervisa una zona asignada. Gestiona tickets y genera reportes de su departamento.",
    canManageUsers: false,
    canViewAllZones: false,
    canManageTickets: true,
    canGenerateReports: true,
    scopeLabel: "Un departamento asignado",
  },
  operador: {
    label: "Operador",
    description: "Visualiza el estado general de toda la red. Solo lectura, sin gestión de tickets.",
    canManageUsers: false,
    canViewAllZones: true,
    canManageTickets: false,
    canGenerateReports: true,
    scopeLabel: "Todas las zonas (solo lectura)",
  },
  tecnico: {
    label: "Técnico",
    description: "Acceso a toda la red con capacidad de gestionar tickets de soporte técnico.",
    canManageUsers: false,
    canViewAllZones: true,
    canManageTickets: true,
    canGenerateReports: true,
    scopeLabel: "Todas las zonas",
  },
  maestro: {
    label: "Maestro",
    description: "Ve únicamente la sonda de su escuela. Acceso limitado al estado de su centro educativo.",
    canManageUsers: false,
    canViewAllZones: false,
    canManageTickets: false,
    canGenerateReports: true,
    scopeLabel: "Solo su escuela (una sonda)",
  },
};
