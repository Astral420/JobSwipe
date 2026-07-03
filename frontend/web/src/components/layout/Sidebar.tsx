'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/contexts/PermissionContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  MessageSquare,
  CreditCard,
  ShoppingCart,
  Shield,
  UserCheck,
  Settings,
  CheckCircle,
  Webhook,
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  FileText,
  UsersRound,
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
  permission: string;
  children?: { name: string; href: string; permission?: string }[];
}

const allNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard.view' },
  { name: 'Users', href: '/users', icon: Users, permission: 'users.view' },
  {
    name: 'Companies',
    href: '/companies',
    icon: Building2,
    permission: 'companies.view',
    children: [
      { name: 'All Companies', href: '/companies', permission: 'companies.view' },
      { name: 'Verifications', href: '/companies/verifications', permission: 'companies.verify' },
    ],
  },
  { name: 'Jobs', href: '/jobs', icon: Briefcase, permission: 'jobs.view' },
  { name: 'Reviews', href: '/reviews', icon: MessageSquare, permission: 'reviews.view' },
  { name: 'Subscriptions', href: '/subscriptions', icon: CreditCard, permission: 'subscriptions.view' },
  {
    name: 'IAP',
    href: '/iap/transactions',
    icon: ShoppingCart,
    permission: 'iap.view',
    children: [
      { name: 'Transactions', href: '/iap/transactions', permission: 'iap.view' },
      { name: 'Webhooks', href: '/iap/webhooks', permission: 'iap.view' },
    ],
  },
  {
    name: 'Trust System',
    href: '/trust/events',
    icon: Shield,
    permission: 'trust.view',
    children: [
      { name: 'Events', href: '/trust/events', permission: 'trust.view' },
      { name: 'Low Trust Companies', href: '/trust/low-trust', permission: 'trust.view' },
    ],
  },
  { name: 'Matches', href: '/matches', icon: UserCheck, permission: 'matches.view' },
  { name: 'Admin Users', href: '/admin-users', icon: UsersRound, permission: 'admin_users.view' },
  { name: 'Audit Logs', href: '/audit', icon: FileText, permission: 'audit.view_all' },
  { name: 'Settings', href: '/settings', icon: Settings, permission: 'dashboard.view' },
];

interface PopoverState {
  itemName: string;
  position: { top: number; left: number };
}

export function Sidebar({ onCollapse }: { onCollapse?: (collapsed: boolean) => void }) {
  const pathname = usePathname();
  const { hasPermission } = usePermissions();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [popoverState, setPopoverState] = useState<PopoverState | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Filter navigation based on permissions
  const navigation = useMemo(() => {
    return allNavigation
      .filter((item) => hasPermission(item.permission))
      .map((item) => {
        if (item.children) {
          const filteredChildren = item.children.filter((child) =>
            child.permission ? hasPermission(child.permission) : true
          );
          return { ...item, children: filteredChildren.length > 0 ? filteredChildren : undefined };
        }
        return item;
      });
  }, [hasPermission]);

  // Initialize expanded items based on current path
  useEffect(() => {
    const expanded = new Set<string>();
    navigation.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some((child) => pathname === child.href);
        if (isChildActive) {
          expanded.add(item.name);
        }
      }
    });
    setExpandedItems(expanded);
  }, [pathname]);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopoverState(null);
      }
    };

    if (popoverState) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [popoverState]);

  const handleToggle = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    setPopoverState(null); // Close any open popovers
    onCollapse?.(newState);
  };

  const toggleAccordion = (itemName: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemName)) {
        next.delete(itemName);
      } else {
        next.add(itemName);
      }
      return next;
    });
  };

  const handleIconHover = (event: React.MouseEvent<HTMLDivElement>, itemName: string) => {
    if (!isCollapsed) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    setPopoverState({
      itemName,
      position: {
        top: rect.top,
        left: rect.right + 8,
      },
    });
  };

  const handleIconLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setPopoverState(null);
    }, 200);
  };

  const handlePopoverEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handlePopoverLeave = () => {
    setPopoverState(null);
  };

  const isItemActive = (item: NavItem) => {
    if (item.children) {
      return item.children.some((child) => pathname === child.href);
    }
    return pathname === item.href;
  };

  return (
    <aside 
      className={cn(
        "fixed inset-y-0 left-0 z-40 border-r border-zinc-800 bg-zinc-950 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-zinc-800 px-4">
          {!isCollapsed && (
            <>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-zinc-100">JobSwipe</span>
            </>
          )}
          {isCollapsed && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Activity className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-hidden px-2 py-4">
          <div className="sidebar-nav overflow-y-auto h-full pr-2">
            {navigation.map((item) => (
              <div key={item.name} className="mb-1">
                {item.children ? (
                  <div className="space-y-1">
                    {/* Parent item with children */}
                    {isCollapsed ? (
                      // Collapsed: Show icon with popover on hover
                      <div
                        className={cn(
                          'flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer relative',
                          isItemActive(item)
                            ? 'bg-blue-600/10 text-blue-400'
                            : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                        )}
                        onMouseEnter={(e) => handleIconHover(e, item.name)}
                        onMouseLeave={handleIconLeave}
                        title={item.name}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {/* Indicator dot for items with children */}
                        <span className="absolute bottom-1 right-1 h-1 w-1 rounded-full bg-blue-500" />
                      </div>
                    ) : (
                      // Expanded: Show accordion
                      <>
                        <button
                          onClick={() => toggleAccordion(item.name)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            isItemActive(item)
                              ? 'bg-blue-600/10 text-blue-400'
                              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                          )}
                        >
                          <item.icon className="h-5 w-5 flex-shrink-0" />
                          <span className="flex-1 text-left">{item.name}</span>
                          {expandedItems.has(item.name) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        {/* Accordion children */}
                        <div
                          className={cn(
                            'overflow-hidden transition-all duration-200',
                            expandedItems.has(item.name) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                          )}
                        >
                          <div className="ml-4 space-y-1 pl-4 pt-1 border-l border-zinc-800">
                            {item.children.map((child) => {
                              const isActive = pathname === child.href;
                              return (
                                <Link
                                  key={child.name}
                                  href={child.href}
                                  className={cn(
                                    'block rounded-lg px-3 py-2 text-sm transition-colors',
                                    isActive
                                      ? 'bg-blue-600/10 text-blue-400 font-medium'
                                      : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                  )}
                                >
                                  {child.name}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  // Simple link item without children
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      pathname === item.href
                        ? 'bg-blue-600/10 text-blue-400'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200',
                      isCollapsed && 'justify-center'
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && item.name}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </nav>

        {/* Popover for collapsed sidebar */}
        {isCollapsed && popoverState && (
          <div
            ref={popoverRef}
            className="fixed z-50 min-w-[200px] rounded-lg border border-zinc-800 bg-zinc-900 shadow-xl"
            style={{
              top: `${popoverState.position.top}px`,
              left: `${popoverState.position.left}px`,
            }}
            onMouseEnter={handlePopoverEnter}
            onMouseLeave={handlePopoverLeave}
          >
            {navigation
              .find((item) => item.name === popoverState.itemName)
              ?.children?.map((child) => {
                const isActive = pathname === child.href;
                return (
                  <Link
                    key={child.name}
                    href={child.href}
                    className={cn(
                      'block px-4 py-2.5 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg',
                      isActive
                        ? 'bg-blue-600/10 text-blue-400 font-medium'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                    )}
                    onClick={() => setPopoverState(null)}
                  >
                    {child.name}
                  </Link>
                );
              })}
            {/* Arrow pointing to sidebar */}
            <div
              className="absolute top-3 -left-2 h-4 w-4 rotate-45 border-l border-t border-zinc-800 bg-zinc-900"
              style={{ transform: 'translateY(-50%) rotate(45deg)' }}
            />
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-zinc-800 p-4">
          {!isCollapsed ? (
            <div className="flex items-center gap-3 rounded-lg bg-zinc-900 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700">
                <AlertTriangle className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-zinc-300">System Status</p>
                <p className="text-xs text-emerald-400">All systems operational</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-700">
                <AlertTriangle className="h-4 w-4 text-zinc-400" />
              </div>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <button
          onClick={handleToggle}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
