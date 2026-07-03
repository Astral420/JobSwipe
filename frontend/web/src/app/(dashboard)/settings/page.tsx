'use client';

import { useAuthStore } from '@/lib/authStore';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Select } from '@/components/shared/Input';
import { User, Mail, Shield, Bell, Lock, Globe } from 'lucide-react';
import { formatRole } from '@/lib/utils';

export default function SettingsPage() {
  const { user } = useAuthStore();

  const notificationOptions = [
    { value: 'all', label: 'All notifications' },
    { value: 'important', label: 'Important only' },
    { value: 'none', label: 'None' },
  ];

  const themeOptions = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
    { value: 'system', label: 'System' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">Manage your account and preferences</p>
      </div>

      {/* Profile Section */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={user?.name || ''} disabled />
          <Input label="Email" value={user?.email || ''} disabled />
          <div className="sm:col-span-2">
            <div className="flex items-center gap-3 rounded-lg bg-zinc-800/50 p-3">
              <Shield className="h-5 w-5 text-zinc-500" />
              <div>
                <p className="text-xs text-zinc-500">Role</p>
                <p className="text-sm font-medium text-zinc-200">{formatRole(user?.role || '')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </h2>
        <div className="mt-4 space-y-4">
          <Select
            label="Email Notifications"
            options={notificationOptions}
            defaultValue="all"
          />
          <Select
            label="Push Notifications"
            options={notificationOptions}
            defaultValue="important"
          />
        </div>
      </div>

      {/* Appearance */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Appearance
        </h2>
        <div className="mt-4">
          <Select
            label="Theme"
            options={themeOptions}
            defaultValue="dark"
          />
        </div>
      </div>

      {/* Security */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Security
        </h2>
        <div className="mt-4 space-y-4">
          <Button variant="outline" className="w-full sm:w-auto">
            Change Password
          </Button>
          <div className="text-sm text-zinc-400">
            <p>Last login: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button variant="primary">
          Save Changes
        </Button>
      </div>
    </div>
  );
}
