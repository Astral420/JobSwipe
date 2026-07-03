'use client';

import { useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/shared/Button';
import { Select } from '@/components/shared/Input';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { formatDateTime } from '@/lib/utils';
import { Download, Eye, Filter, Shield, User, Building, Briefcase, MessageSquare } from 'lucide-react';
import { usePermissions } from '@/contexts/PermissionContext';
import { useAuditLogs, useExportAuditLogs } from '@/lib/hooks';
import type { AuditLog, AuditLogFilters } from '@/services/auditService';

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { hasPermission } = usePermissions();
  const canExport = hasPermission('audit.export');

  const { data, isLoading } = useAuditLogs(filters, page, 20);
  const exportLogs = useExportAuditLogs();

  const getActionIcon = (actionType: string) => {
    const lowerAction = actionType.toLowerCase();
    if (lowerAction.includes('user')) return <User className="h-4 w-4" />;
    if (lowerAction.includes('company')) return <Building className="h-4 w-4" />;
    if (lowerAction.includes('job')) return <Briefcase className="h-4 w-4" />;
    if (lowerAction.includes('review')) return <MessageSquare className="h-4 w-4" />;
    return <Shield className="h-4 w-4" />;
  };

  const getActionColor = (actionType: string) => {
    const lowerAction = actionType.toLowerCase();
    if (lowerAction.includes('create')) return 'text-emerald-400';
    if (lowerAction.includes('delete') || lowerAction.includes('ban') || lowerAction.includes('suspend')) return 'text-red-400';
    if (lowerAction.includes('update') || lowerAction.includes('approve')) return 'text-blue-400';
    return 'text-zinc-400';
  };

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'actionType',
      header: 'Action',
      cell: ({ row }) => {
        const log = row.original;
        return (
          <div className="flex items-center gap-2">
            <div className={getActionColor(log.actionType)}>
              {getActionIcon(log.actionType)}
            </div>
            <span className="font-medium text-zinc-200">
              {log.actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'resourceType',
      header: 'Resource',
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-zinc-300">{row.original.resourceType}</p>
          <p className="text-xs text-zinc-500 font-mono">{row.original.resourceId.slice(0, 8)}...</p>
        </div>
      ),
    },
    {
      accessorKey: 'actorEmail',
      header: 'Actor',
      cell: ({ row }) => {
        const log = row.original;
        return (
          <div>
            <p className="text-sm text-zinc-300">{log.actorEmail || 'Unknown'}</p>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
              log.actorRole === 'super_admin' 
                ? 'bg-purple-600/10 text-purple-400' 
                : log.actorRole === 'admin'
                ? 'bg-blue-600/10 text-blue-400'
                : 'bg-emerald-600/10 text-emerald-400'
            }`}>
              {log.actorRole.replace('_', ' ')}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP Address',
      cell: ({ row }) => (
        <span className="text-zinc-400 font-mono text-sm">
          {row.original.ipAddress || 'N/A'}
        </span>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Timestamp',
      cell: ({ row }) => (
        <span className="text-zinc-400">{formatDateTime(row.original.createdAt)}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const log = row.original;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedLog(log)}
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </Button>
        );
      },
    },
  ];

  const actionTypeOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Actions' },
    { value: 'user_ban', label: 'User Ban' },
    { value: 'user_unban', label: 'User Unban' },
    { value: 'company_suspend', label: 'Company Suspend' },
    { value: 'company_unsuspend', label: 'Company Unsuspend' },
    { value: 'company_verification_approve', label: 'Company Approve' },
    { value: 'company_verification_reject', label: 'Company Reject' },
    { value: 'job_flag', label: 'Job Flag' },
    { value: 'job_unflag', label: 'Job Unflag' },
    { value: 'admin_user_create', label: 'Admin User Create' },
    { value: 'admin_role_change', label: 'Admin Role Change' },
    { value: 'review_flag', label: 'Review Flag' },
    { value: 'review_unflag', label: 'Review Unflag' },
  ];

  const resourceTypeOptions: { value: string; label: string }[] = [
    { value: '', label: 'All Resources' },
    { value: 'user', label: 'User' },
    { value: 'company', label: 'Company' },
    { value: 'job', label: 'Job' },
    { value: 'review', label: 'Review' },
    { value: 'subscription', label: 'Subscription' },
  ];

  const handleExport = async () => {
    try {
      const result = await exportLogs.mutateAsync(filters);
      // Trigger download
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Failed to export audit logs:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Audit Logs</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Track all administrative actions and system events
          </p>
        </div>
        <PermissionGate permission="audit.export">
          <Button 
            onClick={handleExport} 
            variant="secondary"
            disabled={exportLogs.isPending}
          >
            <Download className="mr-2 h-4 w-4" />
            {exportLogs.isPending ? 'Exporting...' : 'Export CSV'}
          </Button>
        </PermissionGate>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={filters.actionType || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, actionType: e.target.value || undefined }))}
          options={actionTypeOptions}
          className="w-48"
        />
        <Select
          value={filters.resourceType || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, resourceType: e.target.value || undefined }))}
          options={resourceTypeOptions}
          className="w-40"
        />
        <input
          type="date"
          value={filters.dateFrom || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value || undefined }))}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="From date"
        />
        <input
          type="date"
          value={filters.dateTo || ''}
          onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value || undefined }))}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="To date"
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
          title: 'No audit logs found',
          description: 'Try adjusting your filters to see more results.',
        }}
      />

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedLog(null)}>
          <div className="w-full max-w-2xl rounded-lg border border-zinc-800 bg-zinc-900 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-zinc-100">Audit Log Details</h2>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>
                ✕
              </Button>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-zinc-500">Action Type</p>
                <p className="text-zinc-200">{selectedLog.actionType}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Resource</p>
                <p className="text-zinc-200">{selectedLog.resourceType} ({selectedLog.resourceId})</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Actor</p>
                <p className="text-zinc-200">{selectedLog.actorEmail} ({selectedLog.actorRole})</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">IP Address</p>
                <p className="text-zinc-200 font-mono">{selectedLog.ipAddress || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-500">Timestamp</p>
                <p className="text-zinc-200">{formatDateTime(selectedLog.createdAt)}</p>
              </div>
              {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                <div>
                  <p className="text-sm text-zinc-500 mb-2">Metadata</p>
                  <pre className="rounded-lg bg-zinc-950 p-4 text-xs text-zinc-300 overflow-auto">
                    {JSON.stringify(selectedLog.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
