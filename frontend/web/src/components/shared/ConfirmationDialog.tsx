'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading: externalIsLoading = false,
}: ConfirmationDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  const isLoading = externalIsLoading || internalLoading;

  const handleConfirm = async () => {
    setInternalLoading(true);
    try {
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  if (!isOpen) return null;

  const variantStyles = {
    danger: 'bg-red-500/10 text-red-400 ring-red-500/20',
    warning: 'bg-amber-500/10 text-amber-400 ring-amber-500/20',
    info: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  };

  const buttonStyles = {
    danger: 'bg-red-600 hover:bg-red-500 focus:ring-red-500/20',
    warning: 'bg-amber-600 hover:bg-amber-500 focus:ring-amber-500/20',
    info: 'bg-blue-600 hover:bg-blue-500 focus:ring-blue-500/20',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-description"
      >
        <div className="flex items-start gap-4">
          <div
            className={cn(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ring-1 ring-inset',
              variantStyles[variant]
            )}
          >
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h3 id="dialog-title" className="text-base font-semibold text-zinc-100">
              {title}
            </h3>
            <p id="dialog-description" className="mt-2 text-sm text-zinc-400">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg border border-zinc-700 bg-transparent px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-inset disabled:opacity-50',
              buttonStyles[variant]
            )}
          >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
