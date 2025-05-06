import React from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  BarChart, 
  ClipboardCheck, 
  FileText, 
  Settings, 
  BookOpen,
  Pencil,
  UserPlus,
  LineChart,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const [location] = useLocation();
  const { data: userData } = useQuery({
    queryKey: ['/api/users/profile'],
  });

  const isAdmin = userData?.user?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="mb-4">You don't have permission to access this area.</p>
          <Link href="/dashboard">
            <a className="text-primary hover:underline">Return to Dashboard</a>
          </Link>
        </div>
      </div>
    );
  }

  const navigationItems = [
    { 
      name: 'Dashboard', 
      href: '/admin-dashboard', 
      icon: BarChart 
    },
    { 
      name: 'Observer Management', 
      href: '/admin/verification', 
      icon: Users 
    },
    { 
      name: 'Reports Management', 
      href: '/admin/reports', 
      icon: FileText 
    },
    { 
      name: 'Analytics', 
      href: '/admin/analytics', 
      icon: LineChart 
    },
    { 
      name: 'Registration Forms', 
      href: '/admin/registration-forms', 
      icon: Pencil
    },
    { 
      name: 'Training Integrations', 
      href: '/admin/training-integrations', 
      icon: BookOpen 
    },
    { 
      name: 'User Import', 
      href: '/admin/user-import', 
      icon: UserPlus
    },
    { 
      name: 'ID Card Management', 
      href: '/admin/id-cards', 
      icon: CreditCard
    },
    { 
      name: 'System Settings', 
      href: '/admin/settings', 
      icon: Settings 
    },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md fixed h-full overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Admin Panel</h2>
        </div>
        <nav className="mt-6">
          <ul>
            {navigationItems.map((item) => {
              const isActive = location.startsWith(item.href);
              return (
                <li key={item.name} className="px-2 py-1">
                  <Link href={item.href}>
                    <a
                      className={cn(
                        "flex items-center p-3 rounded-md transition-colors",
                        isActive
                          ? "bg-primary text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <item.icon className="w-5 h-5 mr-3" />
                      <span>{item.name}</span>
                    </a>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;