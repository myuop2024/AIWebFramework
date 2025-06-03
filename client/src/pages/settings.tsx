import React from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Database,
  Key,
  Smartphone,
  Mail,
  ArrowRight,
  Lock
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  
  const settingsCategories = [
    {
      title: 'Account Settings',
      description: 'Manage your personal account settings',
      icon: <User className="h-6 w-6" />,
      items: [
        { label: 'Profile Settings', path: '/profile', description: 'Update your profile information' },
        { label: 'Security', path: '/profile#security', description: 'Password and two-factor authentication' },
        { label: 'Notifications', path: '/profile#notifications', description: 'Email and push notification preferences' }
      ]
    },
    {
      title: 'System Settings',
      description: 'Configure system-wide settings',
      icon: <SettingsIcon className="h-6 w-6" />,
      items: [
        { 
          label: 'Admin Settings', 
          path: '/admin/settings', 
          description: 'System configuration and preferences',
          requiresPermission: 'admin:access-panel'
        },
        { 
          label: 'Security Dashboard', 
          path: '/admin/security', 
          description: 'Security monitoring and controls',
          requiresPermission: 'admin:access-panel'
        },
        { 
          label: 'Error Logs', 
          path: '/admin/error-logs', 
          description: 'View system error logs',
          requiresPermission: 'admin:access-panel'
        }
      ]
    },
    {
      title: 'Accessibility',
      description: 'Customize your accessibility preferences',
      icon: <Globe className="h-6 w-6" />,
      items: [
        { label: 'Accessibility Options', path: '/accessibility', description: 'Visual, audio, and interaction settings' },
        { label: 'Language & Region', path: '/profile#language', description: 'Language and regional preferences' }
      ]
    },
    {
      title: 'Privacy & Security',
      description: 'Control your privacy and security settings',
      icon: <Shield className="h-6 w-6" />,
      items: [
        { label: 'Privacy Settings', path: '/profile#privacy', description: 'Data sharing and visibility' },
        { label: 'Two-Factor Auth', path: '/profile#2fa', description: 'Enable additional security' },
        { 
          label: 'Permissions', 
          path: '/admin/permissions', 
          description: 'User roles and permissions',
          requiresPermission: 'roles:view'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account and system preferences</p>
        </div>

        {/* Settings Categories */}
        <div className="space-y-6">
          {settingsCategories.map((category, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {category.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{category.title}</h2>
                    <p className="text-sm text-gray-600">{category.description}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {category.items.map((item, itemIndex) => {
                    const hasAccess = !item.requiresPermission || hasPermission(item.requiresPermission);
                    
                    if (!hasAccess) {
                      return (
                        <div key={itemIndex} className="p-4 border border-gray-200 rounded-lg opacity-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-gray-500">{item.label}</h3>
                              <p className="text-sm text-gray-400">{item.description}</p>
                            </div>
                            <Lock className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <Link key={itemIndex} href={item.path}>
                        <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900 group-hover:text-blue-600">{item.label}</h3>
                              <p className="text-sm text-gray-600">{item.description}</p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Need Help?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/faq">
              <div className="bg-white p-4 rounded-lg hover:shadow-sm transition-shadow cursor-pointer">
                <h4 className="font-medium text-gray-900">FAQ</h4>
                <p className="text-sm text-gray-600">Find answers to common questions</p>
              </div>
            </Link>
            <Link href="/chat">
              <div className="bg-white p-4 rounded-lg hover:shadow-sm transition-shadow cursor-pointer">
                <h4 className="font-medium text-gray-900">Support Chat</h4>
                <p className="text-sm text-gray-600">Get help from our support team</p>
              </div>
            </Link>
            <a href="mailto:support@election-observer.com">
              <div className="bg-white p-4 rounded-lg hover:shadow-sm transition-shadow cursor-pointer">
                <h4 className="font-medium text-gray-900">Email Support</h4>
                <p className="text-sm text-gray-600">Send us an email</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 