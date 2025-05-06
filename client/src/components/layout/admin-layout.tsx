import React from 'react';
import { useLocation, Link } from 'wouter';
import { 
  LayoutGrid, 
  Users, 
  FileText, 
  MapPin, 
  FileBarChart, 
  MessageSquare, 
  Settings, 
  BookOpen,
  GraduationCap
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  
  const navigation = [
    { name: 'Dashboard', href: '/admin-dashboard', icon: LayoutGrid },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Verification', href: '/admin/verification', icon: FileText },
    { name: 'Training Manager', href: '/admin/training', icon: BookOpen },
    { name: 'Training Integrations', href: '/admin/training-integrations', icon: GraduationCap },
    { name: 'Polling Stations', href: '/admin/stations', icon: MapPin },
    { name: 'Reports', href: '/admin/reports', icon: FileBarChart },
    { name: 'Communications', href: '/admin/communications', icon: MessageSquare },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50/50">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto border-r bg-white">
          <div className="flex items-center flex-shrink-0 px-4">
            <img
              className="h-8 w-auto"
              src="https://placehold.co/120x40/3b82f6/FFFFFF.png?text=CAFFE"
              alt="CAFFE Observer"
            />
          </div>
          <div className="mt-8 flex-grow flex flex-col">
            <nav className="flex-1 px-2 pb-4 space-y-1">
              {navigation.map((item) => {
                const IconComponent = item.icon;
                const isActive = location === item.href;
                
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                  >
                    <a
                      className={`
                        group flex items-center px-4 py-2 text-sm font-medium rounded-md 
                        ${isActive 
                          ? 'bg-primary text-white' 
                          : 'text-gray-600 hover:bg-gray-100'
                        }
                      `}
                    >
                      <IconComponent 
                        className={`
                          mr-3 flex-shrink-0 h-5 w-5 
                          ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-600'}
                        `}
                      />
                      {item.name}
                    </a>
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <a href="#/profile" className="flex-shrink-0 w-full group block">
              <div className="flex items-center">
                <div className="mr-3 h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                  A
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Admin User</p>
                  <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                    View profile
                  </p>
                </div>
              </div>
            </a>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex flex-col flex-1">
        <div className="sticky top-0 z-10 flex-shrink-0 h-16 bg-white border-b flex items-center px-6">
          <h1 className="text-xl font-semibold text-gray-800 md:hidden">CAFFE Admin</h1>
          
          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden px-4 text-gray-500 focus:outline-none"
          >
            <span className="sr-only">Open sidebar</span>
            <svg
              className="h-6 w-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          
          <div className="flex-1 flex justify-end px-4">
            <div className="ml-4 flex items-center md:ml-6">
              <button
                type="button"
                className="p-1 rounded-full text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <span className="sr-only">View notifications</span>
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}