'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/shared/Button';
import { Select } from '@/components/shared/Input';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { formatDateTime, getInitials, formatRole } from '@/lib/utils';
import { Eye, UserPlus, Shield, ShieldOff, Mail } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';
import {
  useAdminUsers,
  useDeactivateAdminUser,
  useReactivateAdminUser,
  useResendAdminInvitation,
} from '@/lib/hooks';
import type { AdminUser, AdminUserFilters } from '@/services/adminUserService';

export default function AdminUsersPage() {
  const [filters, setFilters] = useState<AdminUserFilters>({});
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<{ user: AdminUser; action: 'deactivate' | 'reactivate' | 'resend' } | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [viewingUser, setViewingUser] = useState<AdminUser | null>(null);

  const { hasPermission } = usePermissions();
  const { data, isLoading } = useAdminUsers(filters, page, 20);
  const deactivateUser = useDeactivateAdminUser();
  const reactivateUser = useReactivateAdminUser();
  const resendInvitation = useResendAdminInvitation();

  const columns: ColumnDef<AdminUser>[] = [
    {
      accessorKey: 'name',
      header: 'Admin User',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
              {getInitials(user.name || user.email)}
            </div>
            <div>
              <p className="font-medium text-zinc-200">{user.name || user.email}</p>
              <p className="text-xs text-zinc-500">{user.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.original.role;
        const roleColors = {
          super_admin: 'bg-purple-600/10 text-purple-400 border-purple-600/20',
          admin: 'bg-blue-600/10 text-blue-400 border-blue-600/20',
          moderator: 'bg-emerald-600/10 text-emerald-400 border-emerald-600/20',
        };
        return (
          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleColors[role]}`}>
            <Shield className="h-3 w-3" />
            {formatRole(role)}
          </span>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge status={row.original.isActive ? 'active' : 'inactive'} />
      ),
    },
    {
      accessorKey: 'lastLoginAt',
      header: 'Last Login',
      cell: ({ row }) => (
        <span className="text-zinc-400">
          {row.original.lastLoginAt ? formatDateTime(row.original.lastLoginAt) : 'Never'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-zinc-400">{formatDateTime(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original;
        const canManage = hasPermission('admin_users.manage');
        
        return (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setViewingUser(user)}
              title="View details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            {canManage && (
              <>
                {user.isActive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUser({ user, action: 'deactivate' })}
                    title="Deactivate admin user"
                  >
                    <ShieldOff className="h-4 w-4 text-orange-500" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedUser({ user, action: 'reactivate' })}
                    title="Reactivate admin user"
                  >
                    <Shield className="h-4 w-4 text-emerald-500" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser({ user, action: 'resend' })}
                  title="Resend invitation"
                >
                  <Mail className="h-4 w-4 text-blue-500" />
                </Button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const roleOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Roles' },
    { value: 'super_admin', label: 'Super Admin' },
    { value: 'admin', label: 'Admin' },
    { value: 'moderator', label: 'Moderator' },
  ];

  const statusOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'true', label: 'Active' },
    { value: 'false', label: 'Inactive' },
  ];

  const handleConfirmAction = async () => {
    if (!selectedUser) return;
    try {
      if (selectedUser.action === 'deactivate') {
        await deactivateUser.mutateAsync(selectedUser.user.id);
      } else if (selectedUser.action === 'reactivate') {
        await reactivateUser.mutateAsync(selectedUser.user.id);
      } else if (selectedUser.action === 'resend') {
        await resendInvitation.mutateAsync(selectedUser.user.id);
      }
    } finally {
      setSelectedUser(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Admin Users</h1>
          <p className="mt-1 text-sm text-zinc-400">Manage admin and moderator accounts</p>
        </div>
        <PermissionGate permission="admin_users.manage">
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Admin User
          </Button>
        </PermissionGate>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.role || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value || undefined }))}
          options={roleOptions}
          className="w-40"
        />
        <Select
          value={filters.isActive !== undefined ? String(filters.isActive) : ''}
          onChange={(e) => setFilters((prev) => ({ 
            ...prev, 
            isActive: e.target.value ? e.target.value === 'true' : undefined 
          }))}
          options={statusOptions}
          className="w-40"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        pagination={
          data
            ? {
                pageIndex: page,
                pageSize: 20,
                totalItems: data.total,
                onPageChange: setPage,
              }
            : undefined
        }
        emptyState={{
          title: 'No admin users found',
          description: 'Try adjusting your filters or invite a new admin user.',
        }}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onConfirm={handleConfirmAction}
        title={
          selectedUser?.action === 'deactivate'
            ? 'Deactivate Admin User'
            : selectedUser?.action === 'reactivate'
            ? 'Reactivate Admin User'
            : 'Resend Invitation'
        }
        description={
          selectedUser?.action === 'deactivate'
            ? `Are you sure you want to deactivate ${selectedUser?.user?.name}? They will lose access to the admin dashboard.`
            : selectedUser?.action === 'reactivate'
            ? `Are you sure you want to reactivate ${selectedUser?.user?.name}? They will regain access to the admin dashboard.`
            : `Resend invitation email to ${selectedUser?.user?.email}?`
        }
        variant={selectedUser?.action === 'deactivate' ? 'danger' : 'info'}
        confirmText={
          selectedUser?.action === 'deactivate'
            ? 'Deactivate'
            : selectedUser?.action === 'reactivate'
            ? 'Reactivate'
            : 'Resend'
        }
        isLoading={deactivateUser.isPending || reactivateUser.isPending || resendInvitation.isPending}
      />

      {/* TODO: Add Invite Dialog */}

      {/* Detail Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setViewingUser(null)}>
          <div className="w-full max-w-2xl rounded-lg border border-zinc-800 bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-100">Admin User Details</h2>
              <Button variant="ghost" size="sm" onClick={() => setViewingUser(null)}>
                ✕
              </Button>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-medium text-white">
                  {getInitials(viewingUser.name || viewingUser.email)}
                </div>
                <div>
                  <p className="text-lg font-medium text-zinc-200">{viewingUser.name || 'No name set'}</p>
                  <p className="text-sm text-zinc-400">{viewingUser.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-500">Role</p>
                  <p className="text-zinc-200">{formatRole(viewingUser.role)}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Status</p>
                  <StatusBadge status={viewingUser.isActive ? 'active' : 'inactive'} />
                </div>
                <div>
                  <p className="text-sm text-zinc-500">User ID</p>
                  <p className="text-zinc-200 font-mono text-sm">{viewingUser.id}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Last Login</p>
                  <p className="text-zinc-200">
                    {viewingUser.lastLoginAt ? formatDateTime(viewingUser.lastLoginAt) : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Created</p>
                  <p className="text-zinc-200">{formatDateTime(viewingUser.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-500">Updated</p>
                  <p className="text-zinc-200">{formatDateTime(viewingUser.updatedAt)}</p>
                </div>
              </div>

              {viewingUser.invitedBy && (
                <div>
                  <p className="text-sm text-zinc-500">Invited By</p>
                  <p className="text-zinc-200">{viewingUser.invitedBy}</p>
                </div>
              )}

              {viewingUser.invitationAcceptedAt && (
                <div>
                  <p className="text-sm text-zinc-500">Invitation Accepted</p>
                  <p className="text-zinc-200">{formatDateTime(viewingUser.invitationAcceptedAt)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
