'use client';

import React from 'react';
import { usePermissions } from '@/contexts/PermissionContext';

interface AdminActionButtonProps {
  permission: string;
  onClick: () => void;
  label: string;
  variant?: 'primary' | 'danger' | 'secondary';
  disabled?: boolean;
  className?: string;
}

export const AdminActionButton: React.FC<AdminActionButtonProps> = ({
  permission,
  onClick,
  label,
  variant = 'primary',
  disabled = false,
  className = '',
}) => {
  const { hasPermission } = usePermissions();
  const canPerform = hasPermission(permission);

  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors';
  
  const variantClasses = {
    primary: canPerform && !disabled
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'bg-gray-300 text-gray-500 cursor-not-allowed',
    danger: canPerform && !disabled
      ? 'bg-red-600 text-white hover:bg-red-700'
      : 'bg-gray-300 text-gray-500 cursor-not-allowed',
    secondary: canPerform && !disabled
      ? 'bg-gray-600 text-white hover:bg-gray-700'
      : 'bg-gray-300 text-gray-500 cursor-not-allowed',
  };

  const buttonClasses = `${baseClasses} ${variantClasses[variant]} ${className}`;

  if (!canPerform) {
    return (
      <div className="relative inline-block group">
        <button
          type="button"
          className={buttonClasses}
          disabled
          title={`Requires ${permission} permission`}
        >
          {label}
        </button>
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          Requires {permission} permission
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};
