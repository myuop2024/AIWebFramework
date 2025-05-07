import React, { useState, useEffect, useCallback } from "react";
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
  ChevronLeft,
  ChevronRight,
  LucideIcon,
  LogOut,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(true);
  const { data: userData, isFetching } = useQuery({
    queryKey: ['/api/users/profile'],
  });

  const isAdmin = userData?.user?.role === 'admin';

  // Store collapsed state in localStorage
  useEffect(() => {
    const storedCollapsed = localStorage.getItem('adminSidebarCollapsed');
    if (storedCollapsed !== null) {
      setCollapsed(JSON.parse(storedCollapsed)); //Parse JSON for boolean
    }
  }, []);

  // Update localStorage when collapsed state changes
  useEffect(() => {
    localStorage.setItem('adminSidebarCollapsed', JSON.stringify(collapsed)); //Stringify for localStorage
  }, [collapsed]);

  if (!isAdmin || isFetching) { //Handle loading state
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          {isFetching ? (
            <p>Loading...</p>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
              <p className="mb-4">You don't have permission to access this area.</p>
              <Link href="/dashboard" className="text-primary hover:underline">
                Return to Dashboard
              </Link>
            </>
          )}
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
      icon: Settings,
      highlight: true
    },
  ];

  const quickLinks = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Logout', href: '/logout', icon: LogOut }
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div
        className={cn(
          "bg-white shadow-lg fixed h-full overflow-y-auto z-30 transition-all duration-300 ease-in-out",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className={cn(
          "flex items-center p-4 border-b",
          collapsed ? "justify-center" : "justify-between"
        )}>
          {!collapsed && <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-gray-100"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </Button>
        </div>

        {userData?.user && (
          <div className={cn(
            "border-b py-4",
            collapsed ? "px-2 flex justify-center" : "px-4"
          )}>
            {collapsed ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{userData.user.firstName?.charAt(0)}{userData.user.lastName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{userData.user.firstName} {userData.user.lastName}</p>
                    <p className="text-xs text-gray-500">{userData.user.email}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{userData.user.firstName?.charAt(0)}{userData.user.lastName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">{userData.user.firstName} {userData.user.lastName}</h3>
                  <p className="text-xs text-gray-500 truncate max-w-[160px]">{userData.user.email}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <nav className="mt-6">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const isActive = location.startsWith(item.href);
              return (
                <li key={item.name} className={collapsed ? "px-1" : "px-2"}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link 
                            href={item.href} 
                            className={cn(
                              "flex items-center rounded-md transition-colors",
                              collapsed ? "p-2 justify-center" : "p-3",
                              isActive
                                ? "bg-primary text-white"
                                : "text-gray-600 hover:bg-gray-100",
                              item.highlight && !isActive && "border border-primary text-primary"
                            )}
                          >
                            <item.icon className={cn("w-5 h-5", !collapsed && "mr-3")} />
                            {!collapsed && <span>{item.name}</span>}
                          </Link>
                      </TooltipTrigger>
                      {collapsed && <TooltipContent side="right">{item.name}</TooltipContent>}
                    </Tooltip>
                  </TooltipProvider>
                </li>
              );
            })}
          </ul>

          <div className="pt-6 mt-6 border-t">
            <ul className="space-y-1">
              {quickLinks.map((item) => (
                <li key={item.name} className={collapsed ? "px-1" : "px-2"}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Link 
                            href={item.href} 
                            className={cn(
                              "flex items-center rounded-md transition-colors text-gray-600 hover:bg-gray-100",
                              collapsed ? "p-2 justify-center" : "p-3",
                            )}
                          >
                            <item.icon className={cn("w-5 h-5", !collapsed && "mr-3")} />
                            {!collapsed && <span>{item.name}</span>}
                          </Link>
                        </div>
                      </TooltipTrigger>
                      {collapsed && <TooltipContent side="right">{item.name}</TooltipContent>}
                    </Tooltip>
                  </TooltipProvider>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <div className={cn(
        "flex-1 transition-all duration-300 ease-in-out",
        collapsed ? "ml-16" : "ml-64"
      )}>
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? "Show Menu" : "Hide Menu"}
            </Button>
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