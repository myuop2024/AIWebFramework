import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  Home, User, MapPin, FileText,
  HelpCircle, MessageSquare, LogOut, 
  FileEdit, ClipboardList, Settings,
  GraduationCap, Navigation, ChevronDown,
  Users, CalendarRange, PanelTop, Cog,
  Map as MapIcon, Phone, Video, Headphones,
  Kanban, Trello, X, Sparkles
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
  const navLinks = [
    { path: "/dashboard", label: "Dashboard", icon: <Home className="h-5 w-5" /> },
    { path: "/profile", label: "My Profile", icon: <User className="h-5 w-5" /> },
    { path: "/polling-stations", label: "Polling Stations", icon: <MapPin className="h-5 w-5" /> },
    { path: "/route-planning", label: "Route Planning", icon: <Navigation className="h-5 w-5" /> },
    { path: "/observer-route-planning", label: "Geolocation Routing", icon: <MapIcon className="h-5 w-5" /> },
    { path: "/reports", label: "Reports", icon: <FileText className="h-5 w-5" /> },
    { path: "/chat", label: "Communications", icon: <Headphones className="h-5 w-5" /> },
    { path: "/training", label: "Training Portal", icon: <GraduationCap className="h-5 w-5" /> },
    { path: "/project-management", label: "Project Management", icon: <Kanban className="h-5 w-5" /> },
    { path: "/advanced-features", label: "Advanced Features", icon: <Sparkles className="h-5 w-5" /> },
  ];
  
  // Define role-based permissions
  const isAdmin = ['admin', 'director'].includes(user?.role || '');
  const isSupervisor = ['supervisor', 'admin', 'director'].includes(user?.role || '');
  const isRovingObserver = ['roving_observer', 'supervisor', 'admin', 'director'].includes(user?.role || '');
  
  // Admin links (only shown to users with admin or director role)
  const adminLinks = isAdmin ? [
    { path: "/admin", label: "Admin Panel", icon: <PanelTop className="h-5 w-5" /> },
  ] : [];
  
  // Supervisor links (only shown to supervisor, admin, or director)
  const supervisorLinks = isSupervisor ? [
    { path: "/supervisor/team-management", label: "Team Management", icon: <Users className="h-5 w-5" /> },
    { path: "/supervisor/assignments", label: "Observer Assignments", icon: <ClipboardList className="h-5 w-5" /> },
    { path: "/supervisor/reports-approval", label: "Report Approvals", icon: <FileEdit className="h-5 w-5" /> },
    { path: "/supervisor/schedule-meeting", label: "Schedule Team Meeting", icon: <CalendarRange className="h-5 w-5" /> },
  ] : [];
  
  // Roving observer links
  const rovingObserverLinks = isRovingObserver ? [
    { path: "/roving/station-schedule", label: "Station Schedule", icon: <CalendarRange className="h-5 w-5" /> },
    { path: "/roving/area-reports", label: "Area Reports", icon: <FileText className="h-5 w-5" /> },
  ] : [];

  const supportLinks = [
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
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 px-4">Main</p>
            
            {navLinks.map((link) => {
              const isActive = location === link.path || location.startsWith(link.path + '/');
              
              // Special case for Polling Stations - show dropdown
              if (link.path === "/polling-stations") {
                const dropdownItems = [
                  { path: "/polling-stations/create", label: "Create New Station" },
                  { path: "/polling-stations/import", label: "Import Stations" },
                  { path: "/polling-stations/map", label: "Station Map" },
                  { path: "/polling-stations/export", label: "Export Stations" },
                ];
                return renderDropdownNavLink(link, isActive, dropdownItems);
              }
              
              // Special case for Project Management - show dropdown
              if (link.path === "/project-management") {
                const dropdownItems = [
                  { path: "/project-management/dashboard", label: "Dashboard" },
                  { path: "/project-management/new", label: "New Project" },
                  { path: "/project-management/kanban", label: "Kanban Board" },
                  { path: "/project-management/calendar", label: "Calendar" },
                  { path: "/project-management/analytics", label: "Analytics" },
                  { path: "/project-management/tasks", label: "Tasks" },
                  { path: "/project-management/milestones", label: "Milestones" },
                ];
                return renderDropdownNavLink(link, isActive, dropdownItems);
              }
              
              return renderNavLink(link, isActive);
            })}
            
            {/* Admin Section */}
            {adminLinks.length > 0 && (
              <>
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 mt-6 px-4">Administration</p>
                {adminLinks.map((link) => {
                  const isActive = location === link.path || location.startsWith(link.path + '/');
                  return renderNavLink(link, isActive);
                })}
              </>
            )}
            
            {/* Supervisor Section */}
            {supervisorLinks.length > 0 && (
              <>
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 mt-6 px-4">Supervision</p>
                {supervisorLinks.map((link) => {
                  const isActive = location === link.path || location.startsWith(link.path + '/');
                  return renderNavLink(link, isActive);
                })}
              </>
            )}
            
            {/* Roving Observer Section */}
            {rovingObserverLinks.length > 0 && (
              <>
                <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 mt-6 px-4">Roving Observer</p>
                {rovingObserverLinks.map((link) => {
                  const isActive = location === link.path || location.startsWith(link.path + '/');
                  return renderNavLink(link, isActive);
                })}
              </>
            )}
            
            {/* Support Section */}
            <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 mt-6 px-4">Support</p>
            {supportLinks.map((link) => {
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
