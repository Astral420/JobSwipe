'use client';

import { useState } from 'react';
import { useCompanyVerifications, useApproveVerification, useRejectVerification } from '@/lib/hooks';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/shared/Button';
import { TextArea } from '@/components/shared/Input';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { Building, CheckCircle, XCircle, FileText, Clock } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function VerificationsPage() {
  const { data, isLoading } = useCompanyVerifications();
  const approveVerification = useApproveVerification();
  const rejectVerification = useRejectVerification();
  const [selectedVerification, setSelectedVerification] = useState<{ id: string; action: 'approve' | 'reject'; companyName: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleApprove = async (id: string) => {
    setSelectedVerification({ id, action: 'approve', companyName: '' });
  };

  const handleRejectClick = (id: string, companyName: string) => {
    setSelectedVerification({ id, action: 'reject', companyName });
    setShowRejectForm(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedVerification) return;
    await rejectVerification.mutateAsync({
      verificationId: selectedVerification.id,
      reason: rejectionReason || 'No reason provided',
    });
    setShowRejectForm(false);
    setRejectionReason('');
    setSelectedVerification(null);
  };

  const handleConfirm = async () => {
    if (!selectedVerification) return;
    if (selectedVerification.action === 'approve') {
      await approveVerification.mutateAsync(selectedVerification.id);
    }
    setSelectedVerification(null);
  };

  const pendingVerifications = data?.data.filter((v) => v.status === 'pending') ?? [];
  const reviewedVerifications = data?.data.filter((v) => v.status !== 'pending') ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Company Verifications</h1>
        <p className="mt-1 text-sm text-zinc-400">Review and approve company verification requests</p>
      </div>

      {/* Pending Verifications */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-200 flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Pending Review
          {pendingVerifications.length > 0 && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
              {pendingVerifications.length}
            </span>
          )}
        </h2>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-3/4 bg-zinc-800 rounded" />
                  <div className="h-3 w-1/2 bg-zinc-800 rounded" />
                  <div className="h-20 w-full bg-zinc-800 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : pendingVerifications.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
            <p className="mt-4 text-lg font-medium text-zinc-200">All caught up!</p>
            <p className="text-sm text-zinc-400">No pending verification requests</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingVerifications.map((verification) => {
              const companyName = verification.company?.name ?? 'Unknown company';
              const companyIndustry = verification.company?.industry || 'No industry';
              const companyLogoUrl = verification.company?.logoUrl;

              return (
                <div key={verification.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-zinc-800">
                      {companyLogoUrl ? (
                        <img src={companyLogoUrl} alt={companyName} className="h-full w-full object-cover rounded-lg" />
                      ) : (
                        <Building className="h-6 w-6 text-zinc-500" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-zinc-100">{companyName}</h3>
                      <p className="text-sm text-zinc-400">{companyIndustry}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Documents</span>
                      <span className="text-zinc-200">{verification.documents.length} files</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Submitted</span>
                      <span className="text-zinc-200">{formatDateTime(verification.submittedAt)}</span>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="mt-4 space-y-2">
                    {verification.documents.slice(0, 3).map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg bg-zinc-800/50 p-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
                      >
                        <FileText className="h-4 w-4" />
                        <span className="truncate">{doc.type.replace('_', ' ')}</span>
                      </a>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleApprove(verification.id)}
                      isLoading={approveVerification.isPending}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleRejectClick(verification.id, companyName)}
                      isLoading={rejectVerification.isPending}
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reviewed Verifications */}
      {reviewedVerifications.length > 0 && (
        <div>
          <h2 className="mb-4 text-lg font-semibold text-zinc-200">Recently Reviewed</h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-400">Reviewed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {reviewedVerifications.slice(0, 10).map((verification) => {
                  const companyName = verification.company?.name ?? 'Unknown company';

                  return (
                    <tr key={verification.id} className="hover:bg-zinc-800/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Building className="h-5 w-5 text-zinc-500" />
                          <span className="text-sm text-zinc-200">{companyName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={verification.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {verification.reviewedAt ? formatDateTime(verification.reviewedAt) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approve Confirmation */}
      <ConfirmationDialog
        isOpen={!!selectedVerification && selectedVerification.action === 'approve' && !showRejectForm}
        onClose={() => setSelectedVerification(null)}
        onConfirm={handleConfirm}
        title="Approve Verification"
        description="Are you sure you want to approve this company verification? This will grant them verified status."
        variant="info"
        confirmText="Approve"
        isLoading={approveVerification.isPending}
      />

      {/* Reject Dialog */}
      {showRejectForm && selectedVerification?.action === 'reject' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowRejectForm(false); setSelectedVerification(null); setRejectionReason(''); }} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-100">Reject Verification</h3>
            <p className="mt-1 text-sm text-zinc-400">Provide a reason for rejection</p>
            <TextArea
              label="Rejection Reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this verification is being rejected..."
              className="mt-4"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowRejectForm(false); setSelectedVerification(null); setRejectionReason(''); }}
                className="rounded-lg border border-zinc-700 bg-transparent px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                Cancel
              </button>
              <Button
                variant="danger"
                onClick={handleConfirmReject}
                isLoading={rejectVerification.isPending}
              >
                Reject Verification
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
