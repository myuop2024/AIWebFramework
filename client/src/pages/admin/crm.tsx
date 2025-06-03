import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePermissions } from '@/hooks/usePermissions';
import { Link } from 'wouter';
import { 
  Users, 
  Building2, 
  TrendingUp, 
  Calendar, 
  Mail, 
  Phone, 
  BarChart3, 
  Filter, 
  Plus, 
  Search,
  MapPin,
  Target,
  Clock,
  Activity,
  Settings,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
  Star,
  Tag,
  FileText,
  Bell,
  CheckSquare,
  Shield,
  UserCheck,
  Map,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

// Define the expected structure for user data
interface CrmUserData {
  user?: {
    role?: string | null;
    // Add other user properties if needed by this component
  };
  // Add other top-level properties from /api/users/profile if any
}

const AdminCRMPage = () => {
  const { data: userData } = useQuery<CrmUserData>({ queryKey: ['/api/users/profile'] });
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  const userRole = userData?.user?.role;
  const isAdmin = userRole === 'admin' || userRole === 'director';

  // Check if user has access to CRM features
  const canAccessCRM = hasPermission('admin:access-panel') || isAdmin;
  const canManageUsers = hasPermission('users:view');
  const canViewReports = hasPermission('reports:submit');
  const canManageStations = hasPermission('polling-stations:view');
  const canViewAnalytics = hasPermission('analytics:view');

  if (permissionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading permissions...</p>
        </div>
      </div>
    );
  }

  if (!canAccessCRM) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the CRM system.</p>
        </div>
      </div>
    );
  }

  // Quick action cards that link to existing functionality
  const quickActions = [
    {
      title: 'Manage Users',
      description: 'View and manage observer accounts',
      icon: <Users className="h-8 w-8 text-blue-600" />,
      link: '/admin',
      permission: 'users:view',
      color: 'bg-blue-100 text-blue-600',
      enabled: canManageUsers
    },
    {
      title: 'Polling Stations',
      description: 'Manage polling station assignments',
      icon: <MapPin className="h-8 w-8 text-green-600" />,
      link: '/polling-stations',
      permission: 'polling-stations:view',
      color: 'bg-green-100 text-green-600',
      enabled: canManageStations
    },
    {
      title: 'Assignments',
      description: 'Create and manage observer assignments',
      icon: <Target className="h-8 w-8 text-purple-600" />,
      link: '/assignments',
      permission: 'assignments:view',
      color: 'bg-purple-100 text-purple-600',
      enabled: true // Available to all CRM users
    },
    {
      title: 'Reports & Analytics',
      description: 'View reports and system analytics',
      icon: <BarChart3 className="h-8 w-8 text-orange-600" />,
      link: '/analytics',
      permission: 'analytics:view',
      color: 'bg-orange-100 text-orange-600',
      enabled: canViewAnalytics
    },
    {
      title: 'Communications',
      description: 'Send messages and notifications',
      icon: <MessageSquare className="h-8 w-8 text-indigo-600" />,
      link: '/chat',
      permission: 'communications:send',
      color: 'bg-indigo-100 text-indigo-600',
      enabled: true
    },
    {
      title: 'Training Management',
      description: 'Manage observer training programs',
      icon: <Calendar className="h-8 w-8 text-red-600" />,
      link: '/training',
      permission: 'training:manage',
      color: 'bg-red-100 text-red-600',
      enabled: hasPermission('training:manage')
    }
  ];

  // System overview stats
  const systemStats = [
    { label: 'Total Observers', value: '1,247', trend: '+12%', link: '/admin' },
    { label: 'Active Assignments', value: '156', trend: '+8%', link: '/assignments' },
    { label: 'Polling Stations', value: '89', trend: 'No change', link: '/polling-stations' },
    { label: 'Recent Reports', value: '43', trend: '+15%', link: '/reports' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Election Observer CRM</h1>
            <p className="text-gray-600 mt-1">Centralized management dashboard for election observer operations</p>
          </div>
          <div className="flex items-center space-x-3">
            {canViewAnalytics && (
              <Link href="/analytics">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
                  <BarChart3 className="h-4 w-4" />
                  <span>View Analytics</span>
                  <ExternalLink className="h-4 w-4" />
                </button>
              </Link>
            )}
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {systemStats.map((stat, index) => (
            <Link key={index} href={stat.link}>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                    <p className="text-sm text-green-600">{stat.trend}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action, index) => (
              action.enabled ? (
                <Link key={index} href={action.link}>
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer group">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-lg ${action.color}`}>
                        {action.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-600">{action.description}</p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                </Link>
              ) : (
                <div key={index} className="bg-gray-50 p-6 rounded-lg border border-gray-200 opacity-50">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-lg bg-gray-200">
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-500">{action.title}</h3>
                      <p className="text-sm text-gray-400">Access restricted</p>
                    </div>
                    <Shield className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              )
            ))}
          </div>
        </div>

        {/* Recent Activity Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
              <Link href="/admin">
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </button>
              </Link>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserCheck className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">New observer verified</p>
                  <p className="text-xs text-gray-500">2 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Target className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Assignment created</p>
                  <p className="text-xs text-gray-500">15 minutes ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <FileText className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Report submitted</p>
                  <p className="text-xs text-gray-500">1 hour ago</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
              <span className="text-green-600 text-sm font-medium">All Systems Normal</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Database</span>
                <span className="text-green-600 text-sm font-medium">Healthy</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">API Response</span>
                <span className="text-green-600 text-sm font-medium">127ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Active Users</span>
                <span className="text-blue-600 text-sm font-medium">234</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Storage Used</span>
                <span className="text-orange-600 text-sm font-medium">72%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCRMPage; 