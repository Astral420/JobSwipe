'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Select } from '@/components/shared/Input';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { AdminActionButton } from '@/components/shared/AdminActionButton';
import { useUsers, useBanUser, useUnbanUser } from '@/lib/hooks';
import { User, UserFilters, UserRole, UserStatus } from '@/types';
import { formatDateTime, getInitials, formatRole } from '@/lib/utils';
import { MoreHorizontal, Eye, Ban, CheckCircle, Search } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';

export default function UsersPage() {
  const [filters, setFilters] = useState<UserFilters>({});
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ user: User; action: 'ban' | 'unban' } | null>(null);

  const { hasPermission } = usePermissions();
  const { data, isLoading } = useUsers(filters, page, 20);
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
    setFilters((prev) => ({ ...prev, search: debouncedSearchTerm || undefined }));
  }, [debouncedSearchTerm]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
              {getInitials(user.name)}
            </div>
            <div>
              <p className="font-medium text-zinc-200">{user.name || 'Unknown User'}</p>
              <p className="text-xs text-zinc-500">{user.email || 'No email provided'}</p>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <span className="text-zinc-300">{formatRole(row.original.role)}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'createdAt',
      header: 'Joined',
      cell: ({ row }) => (
        <span className="text-zinc-400">{formatDateTime(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original;
        const canBan = hasPermission('users.ban');
        const canUnban = hasPermission('users.unban');
        
        return (
          <div className="flex items-center gap-2">
            <Link href={`/users/${user.id}`}>
              <Button variant="ghost" size="sm">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
            {user.status === 'banned' ? (
              canUnban ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser({ user, action: 'unban' })}
                  title="Unban user"
                >
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  title="Requires users.unban permission"
                >
                  <CheckCircle className="h-4 w-4 text-zinc-600" />
                </Button>
              )
            ) : (
              canBan ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser({ user, action: 'ban' })}
                  title="Ban user"
                >
                  <Ban className="h-4 w-4 text-red-500" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled
                  title="Requires users.ban permission"
                >
                  <Ban className="h-4 w-4 text-zinc-600" />
                </Button>
              )
            )}
          </div>
        );
      },
    },
  ];

  const roleOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'moderator', label: 'Moderator' },
    { value: 'user', label: 'User' },
  ];

  const statusOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'banned', label: 'Banned' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'pending', label: 'Pending' },
  ];

  const handleConfirmAction = async () => {
    if (!selectedUser) return;
    try {
      if (selectedUser.action === 'ban') {
        await banUser.mutateAsync({ userId: selectedUser.user.id, reason: 'Admin action' });
      } else {
        await unbanUser.mutateAsync(selectedUser.user.id);
      }
    } finally {
      setSelectedUser(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Users</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage platform users and permissions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:min-w-[300px] md:min-w-[400px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Select
          value={filters.role || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, role: e.target.value as UserRole || undefined }))}
          options={roleOptions}
          className="w-full sm:w-40"
        />
        <Select
          value={filters.status || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as UserStatus || undefined }))}
          options={statusOptions}
          className="w-full sm:w-40"
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
          title: 'No users found',
          description: 'Try adjusting your search or filters.',
        }}
      />

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        onConfirm={handleConfirmAction}
        title={
          selectedUser?.action === 'ban'
            ? 'Ban User'
            : 'Unban User'
        }
        description={
          selectedUser?.action === 'ban'
            ? `Are you sure you want to ban ${selectedUser?.user?.name}? This will prevent them from accessing the platform.`
            : `Are you sure you want to unban ${selectedUser?.user?.name}? They will regain access to the platform.`
        }
        variant={selectedUser?.action === 'ban' ? 'danger' : 'info'}
        confirmText={selectedUser?.action === 'ban' ? 'Ban User' : 'Unban User'}
        isLoading={banUser.isPending || unbanUser.isPending}
      />
    </div>
  );
}
