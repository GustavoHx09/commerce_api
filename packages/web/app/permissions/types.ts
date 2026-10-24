// Tipos compartilhados do painel de permissões.

export interface PermissionPreset {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  tenantId: string | null;
  isActive: boolean;
}

export interface PanelUser {
  _id: string;
  name: string;
  email: string;
  role: 'master' | 'admin' | 'user';
  isActive: boolean;
  permissionPresetId: string | null;
  permissions: string[];
  revokedPermissions: string[];
}
