import React, { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { 
  Settings, Users, FileText, BarChart, 
  ShieldCheck, Bell, Home, BookOpen, 
  Server
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const [location] = useLocation();
  const { user } = useAuth();

  // If not admin, redirect or show unauthorized message
  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-2 text-lg font-medium text-gray-900">Unauthorized Access</h2>
          <p className="mt-1 text-sm text-gray-500">You do not have permission to view this page.</p>
          <div className="mt-6">
            <Link href="/dashboard" className="text-sm font-medium text-primary hover:text-primary-dark">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const adminNavLinks = [
    { href: '/admin', label: 'Overview', icon: <Home className="w-5 h-5" /> },
    { href: '/admin-dashboard', label: 'Statistics', icon: <BarChart className="w-5 h-5" /> },
    { href: '/admin/users', label: 'Users', icon: <Users className="w-5 h-5" /> },
    { href: '/admin/verification', label: 'Verification', icon: <ShieldCheck className="w-5 h-5" /> },
    { href: '/form-templates', label: 'Form Templates', icon: <FileText className="w-5 h-5" /> },
    { href: '/admin/notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
    { href: '/admin/training-integrations', label: 'Training Integrations', icon: <BookOpen className="w-5 h-5" /> },
    { href: '/admin/system', label: 'System', icon: <Server className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
            <div>
              <Link href="/dashboard" className="text-sm font-medium text-primary hover:text-primary-dark">
                Back to Main Dashboard
              </Link>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <nav className="space-y-1 bg-white p-4 rounded-lg shadow">
                {adminNavLinks.map((link) => (
                  <div key={link.href}>
                    <Link
                      href={link.href}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        location === link.href
                          ? 'bg-primary text-white'
                          : 'text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <span className="mr-3">{link.icon}</span>
                      {link.label}
                    </Link>
                  </div>
                ))}
              </nav>
            </div>
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}