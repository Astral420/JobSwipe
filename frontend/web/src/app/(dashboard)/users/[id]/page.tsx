'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useUser, useBanUser, useUnbanUser } from '@/lib/hooks';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/shared/Button';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { Skeleton } from '@/components/shared/Skeleton';
import { formatDateTime, getInitials, formatRole } from '@/lib/utils';
import { ArrowLeft, Ban, CheckCircle, User as UserIcon, Mail, Calendar, Shield } from 'lucide-react';
import Link from 'next/link';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const [showBanDialog, setShowBanDialog] = useState(false);

  const { data: user, isLoading } = useUser(userId);
  const banUser = useBanUser();
  const unbanUser = useUnbanUser();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-400">User not found</p>
      </div>
    );
  }

  const handleConfirmAction = async () => {
    try {
      if (user.status === 'banned') {
        await unbanUser.mutateAsync(userId);
      } else {
        await banUser.mutateAsync({ userId, reason: 'Admin action' });
      }
      setShowBanDialog(false);
    } catch (error) {
      console.error('Failed to update user status:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/users">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">User Details</h1>
          <p className="text-sm text-zinc-400">{user.name}</p>
        </div>
      </div>

      {/* Profile Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-start gap-6">
          <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-xl font-bold text-white">
            {getInitials(user.name)}
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">{user.name}</h2>
                <p className="text-zinc-400">{user.email}</p>
              </div>
              <StatusBadge status={user.status} />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-lg bg-zinc-800/50 p-3">
                <UserIcon className="h-5 w-5 text-zinc-500" />
                <div>
                  <p className="text-xs text-zinc-500">Role</p>
                  <p className="text-sm font-medium text-zinc-200">{formatRole(user.role)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-zinc-800/50 p-3">
                <Mail className="h-5 w-5 text-zinc-500" />
                <div>
                  <p className="text-xs text-zinc-500">Email</p>
                  <p className="text-sm font-medium text-zinc-200">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-zinc-800/50 p-3">
                <Calendar className="h-5 w-5 text-zinc-500" />
                <div>
                  <p className="text-xs text-zinc-500">Joined</p>
                  <p className="text-sm font-medium text-zinc-200">{formatDateTime(user.createdAt)}</p>
                </div>
              </div>
            </div>

            {user.banReason && (
              <div className="mt-4 rounded-lg bg-red-500/10 p-3 ring-1 ring-inset ring-red-500/20">
                <p className="text-sm text-red-400">
                  <span className="font-medium">Ban reason:</span> {user.banReason}
                </p>
                {user.bannedAt && (
                  <p className="mt-1 text-xs text-red-500">Banned on {formatDateTime(user.bannedAt)}</p>
                )}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              {user.status === 'banned' ? (
                <Button
                  variant="primary"
                  onClick={() => setShowBanDialog(true)}
                  isLoading={unbanUser.isPending}
                >
                  <CheckCircle className="h-4 w-4" />
                  Unban User
                </Button>
              ) : (
                <Button
                  variant="danger"
                  onClick={() => setShowBanDialog(true)}
                  isLoading={banUser.isPending}
                >
                  <Ban className="h-4 w-4" />
                  Ban User
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity History */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="text-lg font-semibold text-zinc-100">Account Activity</h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-zinc-500" />
              <span className="text-sm text-zinc-300">Account created</span>
            </div>
            <span className="text-sm text-zinc-500">{formatDateTime(user.createdAt)}</span>
          </div>
          {user.lastLoginAt && (
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <UserIcon className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-300">Last login</span>
              </div>
              <span className="text-sm text-zinc-500">{formatDateTime(user.lastLoginAt)}</span>
            </div>
          )}
          {user.updatedAt && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4 text-zinc-500" />
                <span className="text-sm text-zinc-300">Last updated</span>
              </div>
              <span className="text-sm text-zinc-500">{formatDateTime(user.updatedAt)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showBanDialog}
        onClose={() => setShowBanDialog(false)}
        onConfirm={handleConfirmAction}
        title={user.status === 'banned' ? 'Unban User' : 'Ban User'}
        description={
          user.status === 'banned'
            ? `Are you sure you want to unban ${user.name}? They will regain full access to the platform.`
            : `Are you sure you want to ban ${user.name}? This will prevent them from accessing the platform.`
        }
        variant={user.status === 'banned' ? 'info' : 'danger'}
        confirmText={user.status === 'banned' ? 'Unban User' : 'Ban User'}
        isLoading={banUser.isPending || unbanUser.isPending}
      />
    </div>
  );
}
