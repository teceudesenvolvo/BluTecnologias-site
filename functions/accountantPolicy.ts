export type ContextualAccess = {
  status?: string;
  role?: string;
  permissions?: Record<string, Record<string, boolean>>;
};

const administratorRoles = new Set(['administrador', 'administrator', 'proprietário', 'proprietario', 'owner']);

export const isCompanyActionAllowed = (access: ContextualAccess | null | undefined, module: string, action: string, owner = false) => {
  if (owner) return true;
  if (!access || access.status !== 'active') return false;
  if (administratorRoles.has(String(access.role || '').trim().toLowerCase())) return true;
  return access.permissions?.[module]?.[action] === true;
};
