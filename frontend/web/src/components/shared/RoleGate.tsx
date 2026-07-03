'use client';

import React, { ReactNode } from 'react';
import { usePermissions, AdminRole } from '@/contexts/PermissionContext';

interface RoleGateProps {
  roles: AdminRole | AdminRole[];
  fallback?: ReactNode;
  children: ReactNode;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  roles,
  fallback = null,
  children,
}) => {
  const { hasRole } = usePermissions();

  if (!hasRole(roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
