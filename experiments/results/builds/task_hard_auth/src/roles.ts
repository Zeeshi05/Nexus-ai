export enum Role {
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  USER = 'USER',
  GUEST = 'GUEST',
}

export enum Permission {
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE',
  MANAGE_USERS = 'MANAGE_USERS',
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: [Permission.READ, Permission.WRITE, Permission.DELETE, Permission.MANAGE_USERS],
  [Role.MODERATOR]: [Permission.READ, Permission.WRITE, Permission.DELETE],
  [Role.USER]: [Permission.READ, Permission.WRITE],
  [Role.GUEST]: [Permission.READ],
};

const ROLE_HIERARCHY: Role[] = [Role.GUEST, Role.USER, Role.MODERATOR, Role.ADMIN];

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  const userRank = ROLE_HIERARCHY.indexOf(userRole);
  const requiredRank = ROLE_HIERARCHY.indexOf(requiredRole);
  return userRank >= requiredRank;
}