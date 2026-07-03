'use client';

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAuthStore } from '@/lib/authStore';

export type AdminRole = 'super_admin' | 'admin' | 'moderator';

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
}

interface PermissionContextValue {
  user: AdminUser | null;
  role: AdminRole | null;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: AdminRole | AdminRole[]) => boolean;
  canPerformAction: (action: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

// Permission matrix matching backend config
const PERMISSION_MATRIX: Record<string, AdminRole[]> = {
  // Dashboard
  'dashboard.view': ['moderator', 'admin', 'super_admin'],
  'dashboard.analytics': ['admin', 'super_admin'],
  'dashboard.system_health': ['super_admin'],

  // Users
  'users.view': ['moderator', 'admin', 'super_admin'],
  'users.ban': ['super_admin'],
  'users.unban': ['super_admin'],

  // Companies
  'companies.view': ['moderator', 'admin', 'super_admin'],
  'companies.verify': ['admin', 'super_admin'],
  'companies.reject_verification': ['admin', 'super_admin'],
  'companies.suspend': ['super_admin'],
  'companies.unsuspend': ['super_admin'],

  // Jobs
  'jobs.view': ['moderator', 'admin', 'super_admin'],
  'jobs.flag': ['admin', 'super_admin'],
  'jobs.unflag': ['admin', 'super_admin'],
  'jobs.close': ['admin', 'super_admin'],
  'jobs.delete': ['super_admin'],

  // Reviews
  'reviews.view': ['moderator', 'admin', 'super_admin'],
  'reviews.unflag': ['admin', 'super_admin'],
  'reviews.remove': ['admin', 'super_admin'],

  // Subscriptions
  'subscriptions.view': ['moderator', 'admin', 'super_admin'],
  'subscriptions.cancel': ['super_admin'],

  // IAP
  'iap.view': ['moderator', 'admin', 'super_admin'],
  'iap.retry_webhook': ['super_admin'],

  // Trust
  'trust.view': ['moderator', 'admin', 'super_admin'],
  'trust.recalculate': ['admin', 'super_admin'],
  'trust.adjust': ['super_admin'],

  // Matches
  'matches.view': ['moderator', 'admin', 'super_admin'],

  // Applications
  'applications.view': ['moderator', 'admin', 'super_admin'],

  // Admin Users
  'admin_users.view': ['super_admin'],
  'admin_users.create': ['super_admin'],
  'admin_users.update': ['super_admin'],
  'admin_users.deactivate': ['super_admin'],
  'admin_users.reactivate': ['super_admin'],

  // Audit Logs
  'audit.view_own': ['super_admin', 'admin'],
  'audit.view_all': ['super_admin'],
  'audit.export': ['super_admin'],
};

interface PermissionProviderProps {
  children: ReactNode;
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const { user } = useAuthStore();

  const adminUser: AdminUser | null = useMemo(() => {
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.email,
      role: user.role as AdminRole,
      is_active: user.is_active ?? true,
    };
  }, [user]);

  const hasPermission = (permission: string): boolean => {
    if (!adminUser || !adminUser.is_active) return false;

    const allowedRoles = PERMISSION_MATRIX[permission];
    if (!allowedRoles) return false;

    return allowedRoles.includes(adminUser.role);
  };

  const hasRole = (roles: AdminRole | AdminRole[]): boolean => {
    if (!adminUser || !adminUser.is_active) return false;

    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(adminUser.role);
  };

  const canPerformAction = (action: string): boolean => {
    return hasPermission(action);
  };

  const refreshPermissions = async (): Promise<void> => {
    // Permissions are derived from user role, so just refresh user data
    // This would typically call the auth service to refresh user data
    // For now, it's a no-op as permissions are computed from role
  };

  const value: PermissionContextValue = {
    user: adminUser,
    role: adminUser?.role ?? null,
    hasPermission,
    hasRole,
    canPerformAction,
    refreshPermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = (): PermissionContextValue => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
};
