'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/authStore';
import { usePathname } from 'next/navigation';
import { Menu, ChevronDown, LogOut, User, Search } from 'lucide-react';
import { cn, formatRole } from '@/lib/utils';
import { Button } from '@/components/shared/Button';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const breadcrumbs = pathname
    .split('/')
    .filter(Boolean)
    .map((segment, index, array) => ({
      name: segment.charAt(0).toUpperCase() + segment.slice(1),
      href: '/' + array.slice(0, index + 1).join('/'),
    }));

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-6 backdrop-blur">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Breadcrumbs */}
        <nav className="hidden items-center gap-2 text-sm text-zinc-400 md:flex">
          <span className="text-zinc-500">Admin</span>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center gap-2">
              <ChevronDown className="h-4 w-4 -rotate-90 text-zinc-600" />
              {index === breadcrumbs.length - 1 ? (
                <span className="font-medium text-zinc-200">{crumb.name}</span>
              ) : (
                <a href={crumb.href} className="transition-colors hover:text-zinc-200">
                  {crumb.name}
                </a>
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="hidden items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 md:flex">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-48 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none"
          />
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 rounded-lg p-2 transition-colors hover:bg-zinc-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden text-left md:block">
              <p className="text-sm font-medium text-zinc-200">{user?.name || 'User'}</p>
              <p className="text-xs text-zinc-500">{formatRole(user?.role || '')}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          </button>

          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
              <div className="absolute right-0 mt-2 w-48 rounded-lg border border-zinc-800 bg-zinc-900 py-1 shadow-lg z-20">
                <div className="px-4 py-2 text-sm text-zinc-400">
                  Signed in as <span className="text-zinc-200">{user?.email}</span>
                </div>
                <div className="border-t border-zinc-800" />
                <button
                  onClick={() => {}}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    logout();
                    setIsDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-zinc-800"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
