'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Sidebar */}
      <Sidebar onCollapse={setIsSidebarCollapsed} />

      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-zinc-800 bg-zinc-950 transition-transform duration-300 lg:hidden',
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar onCollapse={() => {}} />
      </div>

      {/* Main content */}
      <div 
        className={cn(
          "pl-0 transition-all duration-300",
          isSidebarCollapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <Header onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
