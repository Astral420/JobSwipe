'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/authStore';
import { DashboardLayout } from '@/components/layout';
import { Skeleton } from '@/components/shared/Skeleton';

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // Restore session on mount
  useEffect(() => {
    restoreSession();
    setIsHydrated(true);
  }, [restoreSession]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isHydrated && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isHydrated, isLoading, isAuthenticated, router]);

  // Show loading state while checking auth
  if (!isHydrated || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  // Don't render anything if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
