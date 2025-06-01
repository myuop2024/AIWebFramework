import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from '@/hooks/usePermissions';
import { 
  Home, User, MapPin, FileText, BookOpen, 
  HelpCircle, MessageSquare, LogOut, 
  FileEdit, ClipboardList, Settings, BarChart,
  UserCheck, GraduationCap, Navigation, ChevronDown,
  Users, Shield, CalendarRange, PanelTop, Cog,
  Map as MapIcon, Phone, Video, Headphones,
  Kanban, Trello, X, Sparkles, Upload, Trophy
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      const menuToggle = document.getElementById('menu-toggle');
      
      if (window.innerWidth < 1024 && isOpen) {
        if (sidebar && !sidebar.contains(event.target as Node) && 
            menuToggle && !menuToggle.contains(event.target as Node)) {
          toggleSidebar();
        }
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen, toggleSidebar]);

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (window.innerWidth < 1024 && isOpen) {
      toggleSidebar();
    }
  }, [location]);

  // Navigation links
  const allNavLinks = [
    // Main Navigation (potentially for all authenticated users)
    { path: "/dashboard", label: "Dashboard", icon: <Home className="h-5 w-5" /> }, // Common, no specific permission
    { path: "/profile", label: "My Profile", icon: <User className="h-5 w-5" /> }, // Common, no specific permission
    { path: "/polling-stations", label: "Polling Stations", icon: <MapPin className="h-5 w-5" />, requiredPermission: "polling-stations:view" },
    { path: "/route-planning", label: "Route Planning", icon: <Navigation className="h-5 w-5" />, requiredPermission: "routes:plan" },
    { path: "/observer-route-planning", label: "Geolocation Routing", icon: <MapIcon className="h-5 w-5" />, requiredPermission: "routes:view-observer-geolocation" },
    { path: "/reports", label: "Reports", icon: <FileText className="h-5 w-5" />, requiredPermission: "reports:submit" }, // Users submit their own
    { path: "/chat", label: "Communications", icon: <Headphones className="h-5 w-5" /> }, // Common, no specific permission
    { path: "/training", label: "Training Portal", icon: <GraduationCap className="h-5 w-5" /> }, // Common, no specific permission
    { path: "/gamification", label: "Achievements", icon: <Trophy className="h-5 w-5" /> }, // Common, no specific permission
    { path: "/project-management", label: "Project Management", icon: <Kanban className="h-5 w-5" />, requiredPermission: "projects:view" },
    { path: "/advanced-features", label: "Advanced Features", icon: <Sparkles className="h-5 w-5" />, requiredPermission: "system:access-advanced-features" },

    // Admin Section Links
    { category: "Administration", path: "/admin", label: "Admin Panel", icon: <PanelTop className="h-5 w-5" />, requiredPermission: "admin:access-panel" },
    { category: "Administration", path: "/admin-dashboard", label: "Statistics Dashboard", icon: <BarChart className="h-5 w-5" />, requiredPermission: "analytics:view-dashboard" },
    { category: "Administration", path: "/form-templates", label: "Form Templates", icon: <ClipboardList className="h-5 w-5" />, requiredPermission: "forms:manage-templates" },
    { category: "Administration", path: "/admin/verification", label: "Observer Verification", icon: <UserCheck className="h-5 w-5" />, requiredPermission: "users:verify" },
    { category: "Administration", path: "/admin/training-integrations", label: "Training Integrations", icon: <BookOpen className="h-5 w-5" />, requiredPermission: "system:manage-training-integrations" },
    { category: "Administration", path: "/admin/permissions", label: "Permission Management", icon: <Shield className="h-5 w-5" />, requiredPermission: "roles:view" }, // Assuming view roles implies permission management access
    { category: "Administration", path: "/admin/user-imports", label: "User Import", icon: <Upload className="h-5 w-5" />, requiredPermission: "users:import" },

    // Supervisor Section Links
    { category: "Supervision", path: "/supervisor/team-management", label: "Team Management", icon: <Users className="h-5 w-5" />, requiredPermission: "supervisor-tasks:view-team" },
    { category: "Supervision", path: "/supervisor/assignments", label: "Observer Assignments", icon: <ClipboardList className="h-5 w-5" />, requiredPermission: "supervisor-tasks:view-assignments" },
    { category: "Supervision", path: "/supervisor/reports-approval", label: "Report Approvals", icon: <FileEdit className="h-5 w-5" />, requiredPermission: "supervisor-tasks:approve-report" },
    { category: "Supervision", path: "/supervisor/schedule-meeting", label: "Schedule Team Meeting", icon: <CalendarRange className="h-5 w-5" />, requiredPermission: "supervisor-tasks:schedule-meetings" },

    // Roving Observer Section Links (Example - these permissions might need to be created)
    { category: "Roving Observer", path: "/roving/station-schedule", label: "Station Schedule", icon: <CalendarRange className="h-5 w-5" />, requiredPermission: "roving-observer:view-schedule" },
    { category: "Roving Observer", path: "/roving/area-reports", label: "Area Reports", icon: <FileText className="h-5 w-5" />, requiredPermission: "roving-observer:view-area-reports" },

    // Support Links (Common)
    { path: "/faq", label: "FAQ & Help", icon: <HelpCircle className="h-5 w-5" /> },
  ];

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      navigate("/login"); // Redirect to login page after successful logout
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const renderNavLink = (link: any, isActive: boolean) => (
    <Link 
      key={link.path}
      href={link.path}
      className={cn(
        "flex items-center py-3 px-4 mb-1 rounded-lg transition-all duration-200 touch-target",
        isActive
          ? 'bg-primary/10 text-primary border-r-2 border-primary' 
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
      )}
    >
      <span className="mr-3">{link.icon}</span>
      <span className="font-medium">{link.label}</span>
    </Link>
  );

  const renderDropdownNavLink = (link: any, isActive: boolean, dropdownItems: any[]) => (
    <div key={link.path}>
      <div 
        className={cn(
          "flex items-center justify-between py-3 px-4 mb-1 rounded-lg transition-all duration-200",
          isActive
            ? 'bg-primary/10 text-primary' 
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
        )}
      >
        <Link 
          href={link.path}
          className="flex items-center flex-1 touch-target"
        >
          <span className="mr-3">{link.icon}</span>
          <span className="font-medium">{link.label}</span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger className="focus:outline-none p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
            <ChevronDown className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {dropdownItems.map((item, index) => (
              <DropdownMenuItem key={index} asChild>
                <Link href={item.path} className="w-full">
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="mobile-nav-overlay"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <aside 
        id="sidebar" 
        className={cn(
          "w-80 lg:w-64 bg-white/80 dark:bg-gray-900/80 border-r border-gray-200 dark:border-gray-800 overflow-y-auto transition-transform duration-300 ease-in-out backdrop-blur-md shadow-xl lg:shadow-none",
          "fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto",
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-6">
          {/* Modern CAFFE Branding */}
          <div className="flex flex-col items-start mb-8 rounded-xl bg-white/60 dark:bg-gray-800/60 shadow-lg p-4 backdrop-blur-md border border-slate-200">
            <div className="flex items-center mb-2">
              <div className="h-12 w-12 flex items-center justify-center rounded-full bg-primary text-white font-bold text-2xl shadow-md">
                C
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight">CAFFE</h1>
                <span className="text-xs font-semibold text-primary/80 tracking-wider uppercase">Election Observation System</span>
              </div>
            </div>
          </div>
          <div className="border-b border-slate-200 dark:border-gray-700 mb-6" />
          
          {/* User Profile Summary */}
          {user && (
            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  <User className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="ml-3">
                  <p className="font-medium text-gray-800 dark:text-white">{user.username || "User"}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Role: <span className="font-medium capitalize">{user.role || "observer"}</span>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Navigation Links */}
          <nav className="space-y-1">
            {/* Main Links */}
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 px-4">Main</p>
            {allNavLinks.filter(link => !link.category && (!link.requiredPermission || hasPermission(link.requiredPermission))).map((link) => {
              const isActive = location === link.path || location.startsWith(link.path + '/');
              // Placeholder for dropdown logic - adapt as needed or simplify for non-dropdown links
              if (link.path === "/polling-stations") { // Example dropdown
                const dropdownItems = [
                  { path: "/polling-stations/create", label: "Create New Station", requiredPermission: "polling-stations:create" },
                  { path: "/polling-stations/import", label: "Import Stations", requiredPermission: "polling-stations:import" },
                  { path: "/polling-stations/map", label: "Station Map" }, // Assuming view is covered by main link
                  { path: "/polling-stations/export", label: "Export Stations", requiredPermission: "polling-stations:export" },
                ].filter(item => !item.requiredPermission || hasPermission(item.requiredPermission));
                if (dropdownItems.length > 0 || !link.requiredPermission || hasPermission(link.requiredPermission) ) { // Show main link if it has permission OR if it has visible dropdown items
                   return renderDropdownNavLink(link, isActive, dropdownItems);
                }
                return null;
              }
               if (link.path === "/project-management") {
                const dropdownItems = [
                  { path: "/project-management/dashboard", label: "Dashboard", requiredPermission: "projects:view-dashboard" },
                  { path: "/project-management/new", label: "New Project", requiredPermission: "projects:create" },
                  { path: "/project-management/kanban", label: "Kanban Board", requiredPermission: "projects:view-kanban" },
                  { path: "/project-management/calendar", label: "Calendar", requiredPermission: "projects:view-calendar" },
                  { path: "/project-management/analytics", label: "Analytics", requiredPermission: "projects:view-analytics" },
                  { path: "/project-management/tasks", label: "Tasks", requiredPermission: "projects:view-tasks" },
                  { path: "/project-management/milestones", label: "Milestones", requiredPermission: "projects:view-milestones" },
                ].filter(item => !item.requiredPermission || hasPermission(item.requiredPermission));
                 if (dropdownItems.length > 0 || !link.requiredPermission || hasPermission(link.requiredPermission) ) {
                    return renderDropdownNavLink(link, isActive, dropdownItems);
                 }
                 return null;
              }
              return renderNavLink(link, isActive);
            })}

            {/* Dynamically Rendered Sections based on Permissions */}
            {['Administration', 'Supervision', 'Roving Observer'].map(categoryName => {
              const categoryLinks = allNavLinks.filter(link => link.category === categoryName && (!link.requiredPermission || hasPermission(link.requiredPermission)));
              if (!permissionsLoading && categoryLinks.length > 0) {
                return (
                  <div key={categoryName}>
                    <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 mt-6 px-4">{categoryName}</p>
                    {categoryLinks.map((link) => {
                      const isActive = location === link.path || location.startsWith(link.path + '/');
                      // Add dropdown logic here if any categorized links are dropdowns
                      return renderNavLink(link, isActive);
                    })}
                  </div>
                );
              }
              return null;
            })}
            
            {/* Support Section (Common) */}
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 mt-6 px-4">Support</p>
            {allNavLinks.filter(link => link.path === "/faq").map((link) => { // Assuming FAQ is always visible
              const isActive = location === link.path || location.startsWith(link.path + '/');
              return renderNavLink(link, isActive);
            })}
            
            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center w-full py-3 px-4 mt-4 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-all duration-200 touch-target"
            >
              <LogOut className="h-5 w-5 mr-3" />
              <span className="font-medium">Logout</span>
            </button>
          </nav>
        </div>
      </aside>
    </>
  );
}
