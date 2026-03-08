'use client';

import React, { useEffect, useState } from 'react';
 
import {
  Settings,
  Building2,
  RefreshCw,
  Bell,
  Shield,
  Save,
  ToggleLeft,
  ToggleRight,
  Check,
  X,
  Loader,
} from 'lucide-react';

import { toast } from "sonner";

interface CompanySettings {
  company_name: string;
  company_gst: string;
  company_address: string;
  company_email: string;
  company_phone: string;
  currency: 'INR' | 'USD' | 'EUR';
  fiscal_year_start: string;
}

interface SystemSettings {
  low_stock_threshold: number;
  order_auto_number: boolean;
  notification_email_enabled: boolean;
  notification_sms_enabled: boolean;
  notification_whatsapp_enabled: boolean;
  zoho_sync_enabled: boolean;
}

interface SyncLog {
  id: string;
  entity: string;
  zoho_module: string;
  action: string;
  status: 'success' | 'failed' | 'pending';
  synced_count: number;
  total_count: number;
  created_at: string;
}

interface Notification {
  id: string;
  type: 'email' | 'sms' | 'whatsapp';
  message: string;
  status: 'sent' | 'failed' | 'pending';
  created_at: string;
}

export default function SettingsPage() {
  //const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<{ [key: string]: boolean }>({});

  // Company Info State
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    company_name: '',
    company_gst: '',
    company_address: '',
    company_email: '',
    company_phone: '',
    currency: 'INR',
    fiscal_year_start: '04',
  });

  // System Settings State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    low_stock_threshold: 10,
    order_auto_number: true,
    notification_email_enabled: false,
    notification_sms_enabled: false,
    notification_whatsapp_enabled: false,
    zoho_sync_enabled: false,
  });

  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [appVersion] = useState('1.0.0');
  const [environment] = useState(process.env.NODE_ENV || 'development');

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
    if (activeTab === 'zoho') {
      fetchSyncLogs();
    } else if (activeTab === 'notifications') {
      fetchNotifications();
    }
  }, []);

  // Fetch sync logs when zoho tab is active
  useEffect(() => {
    if (activeTab === 'zoho') {
      fetchSyncLogs();
    }
  }, [activeTab]);

  // Fetch notifications when notifications tab is active
  useEffect(() => {
    if (activeTab === 'notifications') {
      fetchNotifications();
    }
  }, [activeTab]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();

      const s = data.settings || {};
      const company = s.company || {};
      const system = s.system || {};
      const notifications = s.notifications || {};
      const zoho = s.zoho || {};

      setCompanySettings({
        company_name: company.company_name || '',
        company_gst: company.company_gst || '',
        company_address: company.company_address || '',
        company_email: company.company_email || '',
        company_phone: company.company_phone || '',
        currency: system.currency || 'INR',
        fiscal_year_start: system.fiscal_year_start || '04',
      });

      setSystemSettings({
        low_stock_threshold: parseInt(system.low_stock_threshold || '10') || 10,
        order_auto_number: system.order_auto_number !== 'false',
        notification_email_enabled: notifications.notification_email_enabled === 'true',
        notification_sms_enabled: notifications.notification_sms_enabled === 'true',
        notification_whatsapp_enabled: notifications.notification_whatsapp_enabled === 'true',
        zoho_sync_enabled: zoho.zoho_sync_enabled === 'true',
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncLogs = async () => {
    try {
      const response = await fetch('/api/zoho/sync');
      if (!response.ok) throw new Error('Failed to fetch sync logs');
      const data = await response.json();
      setSyncLogs(data.logs || []);
    } catch (error) {
      console.error('Error fetching sync logs:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=20');
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleSaveCompanySettings = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: companySettings }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      toast.success('Company settings saved successfully');

    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSystemSettings = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: systemSettings }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      toast.success('System settings saved successfully');

    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');

    } finally {
      setSaving(false);
    }
  };

  const handleSync = async (entityType: string, action: string = 'bulk') => {
    try {
      setSyncing((prev) => ({ ...prev, [entityType]: true }));
      const response = await fetch('/api/zoho/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, action }),
      });

      if (!response.ok) throw new Error('Sync failed');

      toast.success('Sync completed successfully');

      fetchSyncLogs();
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error('Sync failed');

    } finally {
      setSyncing((prev) => ({ ...prev, [entityType]: false }));
    }
  };

  const handleTestNotification = async (type: 'email' | 'sms' | 'whatsapp') => {
    toast.error(`Test ${type} notification is not configured yet`);
  };

  const handleClearAuditLog = async () => {
    toast.error('Clear audit log is not available');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-8 h-8 text-blue-600" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('company')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'company'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Company Info
          </button>
          <button
            onClick={() => setActiveTab('zoho')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'zoho'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <RefreshCw className="w-4 h-4 inline mr-2" />
            Zoho Integration
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'notifications'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bell className="w-4 h-4 inline mr-2" />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'system'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            System
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        {/* Company Info Tab */}
        {activeTab === 'company' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Company Information</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={companySettings.company_name}
                  onChange={(e) =>
                    setCompanySettings({
                      ...companySettings,
                      company_name: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Number
                </label>
                <input
                  type="text"
                  value={companySettings.company_gst}
                  onChange={(e) =>
                    setCompanySettings({
                      ...companySettings,
                      company_gst: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={companySettings.company_email}
                  onChange={(e) =>
                    setCompanySettings({
                      ...companySettings,
                      company_email: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={companySettings.company_phone}
                  onChange={(e) =>
                    setCompanySettings({
                      ...companySettings,
                      company_phone: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Currency
                </label>
                <select
                  value={companySettings.currency}
                  onChange={(e) =>
                    setCompanySettings({
                      ...companySettings,
                      currency: e.target.value as 'INR' | 'USD' | 'EUR',
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="INR">INR (Indian Rupee)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fiscal Year Start Month
                </label>
                <select
                  value={companySettings.fiscal_year_start}
                  onChange={(e) =>
                    setCompanySettings({
                      ...companySettings,
                      fiscal_year_start: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: 12 }, (_, i) => ({
                    value: String(i + 1).padStart(2, '0'),
                    label: new Date(2024, i).toLocaleString('default', {
                      month: 'long',
                    }),
                  })).map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.value} - {month.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                value={companySettings.company_address}
                onChange={(e) =>
                  setCompanySettings({
                    ...companySettings,
                    company_address: e.target.value,
                  })
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleSaveCompanySettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Zoho Integration Tab */}
        {activeTab === 'zoho' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Zoho Integration</h2>

            {/* Status Section */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Sync Status</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    IBPM pushes data one-way to Zoho Books. Configure credentials in .env
                    file.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      systemSettings.zoho_sync_enabled
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {systemSettings.zoho_sync_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            {/* Manual Sync Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Manual Sync Operations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { label: 'Sync All Customers', key: 'customers' },
                  { label: 'Sync All Vendors', key: 'vendors' },
                  { label: 'Sync All Products', key: 'products' },
                  { label: 'Sync All Invoices', key: 'invoices' },
                  { label: 'Sync All Payments', key: 'payments' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => handleSync(item.key)}
                    disabled={syncing[item.key]}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                  >
                    {syncing[item.key] ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {syncing[item.key] ? 'Syncing...' : item.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => handleSync('all')}
                disabled={syncing['all']}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {syncing['all'] ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {syncing['all'] ? 'Syncing Everything...' : 'Sync Everything'}
              </button>
            </div>

            {/* Recent Sync Logs */}
            {syncLogs.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Recent Sync Logs</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                          Entity
                        </th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                          Module
                        </th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                          Action
                        </th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                          Records
                        </th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncLogs.map((log) => (
                        <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-900">{log.entity}</td>
                          <td className="px-4 py-2 text-gray-600">{log.zoho_module}</td>
                          <td className="px-4 py-2 text-gray-600">{log.action}</td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                log.status === 'success'
                                  ? 'bg-green-100 text-green-800'
                                  : log.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-600">
                            {log.synced_count}/{log.total_count}
                          </td>
                          <td className="px-4 py-2 text-gray-600">
                            {new Date(log.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Notifications</h2>

            {/* Email Notifications */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Email Notifications</h3>
                <button
                  onClick={() => {
                    setSystemSettings({
                      ...systemSettings,
                      notification_email_enabled: !systemSettings.notification_email_enabled,
                    });
                  }}
                  className="focus:outline-none"
                >
                  {systemSettings.notification_email_enabled ? (
                    <ToggleRight className="w-6 h-6 text-blue-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Email notifications require SendGrid. Configure credentials in .env file.
              </p>
              <button
                onClick={() => handleTestNotification('email')}
                disabled={syncing['email'] || !systemSettings.notification_email_enabled}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {syncing['email'] ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Send Test Email
              </button>
            </div>

            {/* SMS Notifications */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">SMS Notifications</h3>
                <button
                  onClick={() => {
                    setSystemSettings({
                      ...systemSettings,
                      notification_sms_enabled: !systemSettings.notification_sms_enabled,
                    });
                  }}
                  className="focus:outline-none"
                >
                  {systemSettings.notification_sms_enabled ? (
                    <ToggleRight className="w-6 h-6 text-blue-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                SMS notifications require SMSStriker. Configure credentials in .env file.
              </p>
              <button
                onClick={() => handleTestNotification('sms')}
                disabled={syncing['sms'] || !systemSettings.notification_sms_enabled}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {syncing['sms'] ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Send Test SMS
              </button>
            </div>

            {/* WhatsApp Notifications */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">WhatsApp Notifications</h3>
                <button
                  onClick={() => {
                    setSystemSettings({
                      ...systemSettings,
                      notification_whatsapp_enabled: !systemSettings.notification_whatsapp_enabled,
                    });
                  }}
                  className="focus:outline-none"
                >
                  {systemSettings.notification_whatsapp_enabled ? (
                    <ToggleRight className="w-6 h-6 text-blue-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                WhatsApp notifications require WATI. Configure credentials in .env file.
              </p>
              <button
                onClick={() => handleTestNotification('whatsapp')}
                disabled={syncing['whatsapp'] || !systemSettings.notification_whatsapp_enabled}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {syncing['whatsapp'] ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Send Test WhatsApp
              </button>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveSystemSettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            {/* Recent Notifications Log */}
            {notifications.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Recent Notifications</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                          Type
                        </th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                          Message
                        </th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                          Status
                        </th>
                        <th className="px-4 py-2 text-left font-semibold text-gray-700">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {notifications.map((notif) => (
                        <tr key={notif.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-900 capitalize">{notif.type}</td>
                          <td className="px-4 py-2 text-gray-600 max-w-xs truncate">
                            {notif.message}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                notif.status === 'sent'
                                  ? 'bg-green-100 text-green-800'
                                  : notif.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {notif.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-gray-600">
                            {new Date(notif.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">System Settings</h2>

            {/* Low Stock Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Low Stock Threshold
              </label>
              <input
                type="number"
                value={systemSettings.low_stock_threshold}
                onChange={(e) =>
                  setSystemSettings({
                    ...systemSettings,
                    low_stock_threshold: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Products below this quantity will be marked as low stock
              </p>
            </div>

            {/* Order Auto Number */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Auto-Generate Order Numbers</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Automatically generate sequential order numbers
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSystemSettings({
                      ...systemSettings,
                      order_auto_number: !systemSettings.order_auto_number,
                    });
                  }}
                  className="focus:outline-none"
                >
                  {systemSettings.order_auto_number ? (
                    <ToggleRight className="w-6 h-6 text-blue-600" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveSystemSettings}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>

            {/* Application Info */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-3">Application Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Version:</span>
                  <span className="text-gray-900 font-medium">{appVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700">Environment:</span>
                  <span className="text-gray-900 font-medium capitalize">{environment}</span>
                </div>
              </div>
            </div>

            {/* Clear Audit Log */}
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <h3 className="font-semibold text-gray-900 mb-2">Danger Zone</h3>
              <p className="text-sm text-gray-600 mb-4">
                Clear all audit logs. This action cannot be undone.
              </p>
              <button
                onClick={handleClearAuditLog}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                Clear Audit Log
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
