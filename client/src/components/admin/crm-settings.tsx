import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Settings,
  Save,
  Calendar,
  MapPin,
  Users,
  Bell,
  Mail,
  Phone,
  Clock,
  Shield,
  Key,
  Database,
  Download,
  Upload,
  AlertCircle,
  CheckCircle,
  Info,
  Globe,
  Smartphone
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CRMSettingsProps {
  isAdmin: boolean;
}

const CRMSettings: React.FC<CRMSettingsProps> = ({ isAdmin }) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('election');

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['crm-settings'],
    queryFn: async () => {
      const res = await fetch('/api/crm/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: any) => {
      const res = await fetch('/api/crm/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) throw new Error('Failed to update settings');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-settings'] });
      toast.success('Settings updated successfully!');
    },
    onError: () => toast.error('Failed to update settings'),
  });

  // Mock settings data
  const mockSettings = {
    election: {
      name: 'General Election 2024',
      date: '2024-12-15',
      timezone: 'America/Jamaica',
      pollingHours: {
        start: '06:00',
        end: '18:00'
      },
      regions: ['St. Andrew', 'St. Catherine', 'St. Mary', 'Kingston', 'Portland'],
      phases: ['Registration', 'Training', 'Deployment', 'Election Day', 'Post-Election']
    },
    notifications: {
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      assignmentReminders: true,
      trainingReminders: true,
      checkInReminders: true,
      reportDeadlines: true,
      systemUpdates: false
    },
    system: {
      autoAssign: false,
      requireTraining: true,
      allowSelfCheckIn: true,
      enableGPS: true,
      dataRetention: 365,
      backupFrequency: 'daily',
      maintenanceMode: false
    },
    communication: {
      emailProvider: 'smtp',
      smsProvider: 'twilio',
      defaultEmailTemplate: 'standard',
      emergencyContact: '+1-876-555-0123',
      supportEmail: 'support@electionobserver.com'
    },
    security: {
      passwordMinLength: 8,
      requireTwoFactor: false,
      sessionTimeout: 120,
      maxLoginAttempts: 5,
      auditLogging: true,
      encryptData: true
    }
  };

  const currentSettings = settings || mockSettings;

  const handleSave = (section: string, data: any) => {
    const updatedSettings = {
      ...currentSettings,
      [section]: { ...currentSettings[section], ...data }
    };
    updateSettingsMutation.mutate(updatedSettings);
  };

  const tabs = [
    { id: 'election', label: 'Election Config', icon: <Calendar className="h-4 w-4" /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
    { id: 'system', label: 'System', icon: <Settings className="h-4 w-4" /> },
    { id: 'communication', label: 'Communication', icon: <Mail className="h-4 w-4" /> },
    { id: 'security', label: 'Security', icon: <Shield className="h-4 w-4" /> }
  ];

  const ElectionSettings = () => {
    const [electionData, setElectionData] = useState(currentSettings.election);

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Election Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Election Name
              </label>
              <input
                type="text"
                value={electionData.name}
                onChange={(e) => setElectionData({...electionData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Election Date
              </label>
              <input
                type="date"
                value={electionData.date}
                onChange={(e) => setElectionData({...electionData, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={electionData.timezone}
                onChange={(e) => setElectionData({...electionData, timezone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="America/Jamaica">Jamaica Time (UTC-5)</option>
                <option value="America/New_York">Eastern Time (UTC-5)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Polling Hours
              </label>
              <div className="flex space-x-2">
                <input
                  type="time"
                  value={electionData.pollingHours.start}
                  onChange={(e) => setElectionData({
                    ...electionData,
                    pollingHours: {...electionData.pollingHours, start: e.target.value}
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="self-center text-gray-500">to</span>
                <input
                  type="time"
                  value={electionData.pollingHours.end}
                  onChange={(e) => setElectionData({
                    ...electionData,
                    pollingHours: {...electionData.pollingHours, end: e.target.value}
                  })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Active Regions
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {['St. Andrew', 'St. Catherine', 'St. Mary', 'Kingston', 'Portland', 'Manchester', 'Clarendon', 'St. Elizabeth'].map((region) => (
                <label key={region} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={electionData.regions.includes(region)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setElectionData({
                          ...electionData,
                          regions: [...electionData.regions, region]
                        });
                      } else {
                        setElectionData({
                          ...electionData,
                          regions: electionData.regions.filter(r => r !== region)
                        });
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{region}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => handleSave('election', electionData)}
              disabled={updateSettingsMutation.isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const NotificationSettings = () => {
    const [notificationData, setNotificationData] = useState(currentSettings.notifications);

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
          
          <div className="space-y-4">
            <div className="border-b border-gray-200 pb-4">
              <h4 className="font-medium text-gray-900 mb-3">Communication Channels</h4>
              <div className="space-y-3">
                {[
                  { key: 'emailEnabled', label: 'Email Notifications', icon: <Mail className="h-4 w-4" /> },
                  { key: 'smsEnabled', label: 'SMS Notifications', icon: <Smartphone className="h-4 w-4" /> },
                  { key: 'pushEnabled', label: 'Push Notifications', icon: <Bell className="h-4 w-4" /> }
                ].map((channel) => (
                  <label key={channel.key} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={notificationData[channel.key]}
                      onChange={(e) => setNotificationData({
                        ...notificationData,
                        [channel.key]: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    <div className="flex items-center space-x-2">
                      {channel.icon}
                      <span className="text-sm text-gray-700">{channel.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Notification Types</h4>
              <div className="space-y-3">
                {[
                  { key: 'assignmentReminders', label: 'Assignment Reminders' },
                  { key: 'trainingReminders', label: 'Training Reminders' },
                  { key: 'checkInReminders', label: 'Check-in Reminders' },
                  { key: 'reportDeadlines', label: 'Report Deadlines' },
                  { key: 'systemUpdates', label: 'System Updates' }
                ].map((type) => (
                  <label key={type.key} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={notificationData[type.key]}
                      onChange={(e) => setNotificationData({
                        ...notificationData,
                        [type.key]: e.target.checked
                      })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => handleSave('notifications', notificationData)}
              disabled={updateSettingsMutation.isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const SystemSettings = () => {
    const [systemData, setSystemData] = useState(currentSettings.system);

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Configuration</h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Retention (days)
                </label>
                <input
                  type="number"
                  value={systemData.dataRetention}
                  onChange={(e) => setSystemData({...systemData, dataRetention: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Number of days to retain historical data</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Backup Frequency
                </label>
                <select
                  value={systemData.backupFrequency}
                  onChange={(e) => setSystemData({...systemData, backupFrequency: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">System Features</h4>
              {[
                { key: 'autoAssign', label: 'Auto-assign observers to stations', description: 'Automatically assign available observers to uncovered stations' },
                { key: 'requireTraining', label: 'Require training completion', description: 'Only allow trained observers to be assigned' },
                { key: 'allowSelfCheckIn', label: 'Allow self check-in', description: 'Let observers check themselves in/out' },
                { key: 'enableGPS', label: 'Enable GPS tracking', description: 'Track observer locations for verification' },
                { key: 'maintenanceMode', label: 'Maintenance mode', description: 'Put system in maintenance mode (read-only)' }
              ].map((feature) => (
                <div key={feature.key} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox"
                    checked={systemData[feature.key]}
                    onChange={(e) => setSystemData({
                      ...systemData,
                      [feature.key]: e.target.checked
                    })}
                    className="mt-1 rounded border-gray-300"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-900">
                      {feature.label}
                    </label>
                    <p className="text-xs text-gray-500">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => handleSave('system', systemData)}
              disabled={updateSettingsMutation.isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const SecuritySettings = () => {
    const [securityData, setSecurityData] = useState(currentSettings.security);

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Configuration</h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Password Length
                </label>
                <input
                  type="number"
                  min="6"
                  max="128"
                  value={securityData.passwordMinLength}
                  onChange={(e) => setSecurityData({...securityData, passwordMinLength: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  min="15"
                  max="480"
                  value={securityData.sessionTimeout}
                  onChange={(e) => setSecurityData({...securityData, sessionTimeout: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Login Attempts
                </label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={securityData.maxLoginAttempts}
                  onChange={(e) => setSecurityData({...securityData, maxLoginAttempts: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Security Features</h4>
              {[
                { key: 'requireTwoFactor', label: 'Require Two-Factor Authentication', description: 'Require 2FA for all user accounts' },
                { key: 'auditLogging', label: 'Enable Audit Logging', description: 'Log all user actions for security audits' },
                { key: 'encryptData', label: 'Encrypt Sensitive Data', description: 'Encrypt personal information and sensitive data' }
              ].map((feature) => (
                <div key={feature.key} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg">
                  <input
                    type="checkbox"
                    checked={securityData[feature.key]}
                    onChange={(e) => setSecurityData({
                      ...securityData,
                      [feature.key]: e.target.checked
                    })}
                    className="mt-1 rounded border-gray-300"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-900">
                      {feature.label}
                    </label>
                    <p className="text-xs text-gray-500">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => handleSave('security', securityData)}
              disabled={updateSettingsMutation.isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'election':
        return <ElectionSettings />;
      case 'notifications':
        return <NotificationSettings />;
      case 'system':
        return <SystemSettings />;
      case 'security':
        return <SecuritySettings />;
      default:
        return <ElectionSettings />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
        <p className="text-gray-600">Configure election and system preferences</p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Admin Tools */}
      {isAdmin && (
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">Admin Tools</h3>
              <p className="text-sm text-yellow-700 mt-1">
                These tools should be used with caution as they can affect system-wide operations.
              </p>
              <div className="mt-4 flex space-x-3">
                <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm transition-colors">
                  <Download className="h-4 w-4 inline mr-1" />
                  Export Settings
                </button>
                <button className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors">
                  <Upload className="h-4 w-4 inline mr-1" />
                  Import Settings
                </button>
                <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors">
                  <Database className="h-4 w-4 inline mr-1" />
                  Reset to Defaults
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMSettings; 