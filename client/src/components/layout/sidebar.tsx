import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { 
  Home, User, MapPin, FileText, BookOpen, 
  HelpCircle, MessageSquare, LogOut, 
  FileEdit, ClipboardList, Settings, BarChart,
  UserCheck, GraduationCap, Navigation, ChevronDown,
  Users, Shield, CalendarRange, PanelTop, Cog,
  Map as MapIcon, Phone, Video, Headphones
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

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
      
      if (window.innerWidth < 768 && isOpen) {
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

  // Navigation links
  const navLinks = [
    { path: "/dashboard", label: "Dashboard", icon: <Home className="h-5 w-5 mr-3" /> },
    { path: "/profile", label: "My Profile", icon: <User className="h-5 w-5 mr-3" /> },
    { path: "/polling-stations", label: "Polling Stations", icon: <MapPin className="h-5 w-5 mr-3" /> },
    { path: "/route-planning", label: "Route Planning", icon: <Navigation className="h-5 w-5 mr-3" /> },
    { path: "/observer-route-planning", label: "Geolocation Routing", icon: <MapIcon className="h-5 w-5 mr-3" /> },
    { path: "/reports", label: "Reports", icon: <FileText className="h-5 w-5 mr-3" /> },
    { path: "/communications", label: "Communications", icon: <Headphones className="h-5 w-5 mr-3" /> },
    { path: "/training", label: "Training Portal", icon: <GraduationCap className="h-5 w-5 mr-3" /> },
  ];
  
  // Define role-based permissions
  const isAdmin = ['admin', 'director'].includes(user?.role || '');
  const isSupervisor = ['supervisor', 'admin', 'director'].includes(user?.role || '');
  const isRovingObserver = ['roving_observer', 'supervisor', 'admin', 'director'].includes(user?.role || '');
  
  // Admin links (only shown to users with admin or director role)
  const adminLinks = isAdmin ? [
    { path: "/admin", label: "Admin Panel", icon: <PanelTop className="h-5 w-5 mr-3" /> },
    { path: "/admin-dashboard", label: "Statistics Dashboard", icon: <BarChart className="h-5 w-5 mr-3" /> },
    { path: "/form-templates", label: "Form Templates", icon: <ClipboardList className="h-5 w-5 mr-3" /> },
    { path: "/admin/verification", label: "Observer Verification", icon: <UserCheck className="h-5 w-5 mr-3" /> },
    { path: "/admin/training-integrations", label: "Training Integrations", icon: <BookOpen className="h-5 w-5 mr-3" /> },
    { path: "/admin/permissions", label: "Permission Management", icon: <Shield className="h-5 w-5 mr-3" /> },
  ] : [];
  
  // Supervisor links (only shown to supervisor, admin, or director)
  const supervisorLinks = isSupervisor ? [
    { path: "/supervisor/team-management", label: "Team Management", icon: <Users className="h-5 w-5 mr-3" /> },
    { path: "/supervisor/assignments", label: "Observer Assignments", icon: <ClipboardList className="h-5 w-5 mr-3" /> },
    { path: "/supervisor/reports-approval", label: "Report Approvals", icon: <FileEdit className="h-5 w-5 mr-3" /> },
    { path: "/supervisor/schedule-meeting", label: "Schedule Team Meeting", icon: <CalendarRange className="h-5 w-5 mr-3" /> },
  ] : [];
  
  // Roving observer links
  const rovingObserverLinks = isRovingObserver ? [
    { path: "/roving/station-schedule", label: "Station Schedule", icon: <CalendarRange className="h-5 w-5 mr-3" /> },
    { path: "/roving/area-reports", label: "Area Reports", icon: <FileText className="h-5 w-5 mr-3" /> },
  ] : [];

  const supportLinks = [
    { path: "/faq", label: "FAQ & Help", icon: <HelpCircle className="h-5 w-5 mr-3" /> },
  ];

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      navigate("/login"); // Redirect to login page after successful logout
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <aside 
      id="sidebar" 
      className={`w-64 md:shadow transform fixed md:relative inset-y-0 left-0 z-40 md:translate-x-0 bg-white border-r border-gray-200 overflow-y-auto transition-transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}
    >
      <div className="p-6">
        <div className="flex items-center mb-8">
          <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary text-white font-bold text-xl">
            C
          </div>
          <h1 className="ml-3 text-2xl font-heading font-bold text-gray-800">CAFFE</h1>
        </div>
        
        {/* User Profile Summary */}
        {user && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center">
              <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                <User className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="font-medium text-gray-800">{user.username || "User"}</p>
                <p className="text-sm text-gray-500">Observer Role: <span className="font-medium">{user.role || "observer"}</span></p>
              </div>
            </div>
          </div>
        )}
        
        {/* Navigation Links */}
        <nav>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Main</p>
          
          {navLinks.map((link) => {
            // Special case for Polling Stations - show dropdown
            if (link.path === "/polling-stations") {
              const isActive = location.startsWith("/polling-stations");
              return (
                <div key={link.path}>
                  <div 
                    className={`flex items-center justify-between py-2 px-3 mb-1 rounded-lg ${
                      isActive
                        ? 'bg-primary-light/10 text-primary' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Link 
                      href={link.path}
                      className="flex items-center flex-1"
                    >
                      {link.icon}
                      {link.label}
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="focus:outline-none">
                        <ChevronDown className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href="/polling-stations/create">Create New Station</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/polling-stations/import">Import Stations</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/polling-stations/map">Station Map</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/polling-stations/export">Export Stations</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            }
            
            // Regular links
            return (
              <Link 
                key={link.path} 
                href={link.path}
                className={`flex items-center py-2 px-3 mb-1 rounded-lg ${
                  location === link.path 
                    ? 'bg-primary-light/10 text-primary' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {link.icon}
                {link.label}
              </Link>
            );
          })}
          
          {/* Supervisor section */}
          {supervisorLinks.length > 0 && (
            <>
              <p className="text-xs uppercase tracking-wider text-gray-500 mt-6 mb-2">Supervisor</p>
              {supervisorLinks.map((link) => (
                <Link 
                  key={link.path} 
                  href={link.path}
                  className={`flex items-center py-2 px-3 mb-1 rounded-lg ${
                    location === link.path 
                      ? 'bg-primary-light/10 text-primary' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </>
          )}
          
          {/* Roving Observer section */}
          {rovingObserverLinks.length > 0 && (
            <>
              <p className="text-xs uppercase tracking-wider text-gray-500 mt-6 mb-2">Roving Observer</p>
              {rovingObserverLinks.map((link) => (
                <Link 
                  key={link.path} 
                  href={link.path}
                  className={`flex items-center py-2 px-3 mb-1 rounded-lg ${
                    location === link.path 
                      ? 'bg-primary-light/10 text-primary' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </>
          )}
          
          {/* Admin section - only visible to admin users */}
          {adminLinks.length > 0 && (
            <>
              <p className="text-xs uppercase tracking-wider text-gray-500 mt-6 mb-2">Admin</p>
              {adminLinks.map((link) => (
                <Link 
                  key={link.path} 
                  href={link.path}
                  className={`flex items-center py-2 px-3 mb-1 rounded-lg ${
                    location === link.path 
                      ? 'bg-primary-light/10 text-primary' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
            </>
          )}
          
          <p className="text-xs uppercase tracking-wider text-gray-500 mt-6 mb-2">Support</p>
          
          {supportLinks.map((link) => (
            <Link 
              key={link.path} 
              href={link.path}
              className={`flex items-center py-2 px-3 mb-1 rounded-lg ${
                location === link.path 
                  ? 'bg-primary-light/10 text-primary' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {link.icon}
              {link.label}
            </Link>
          ))}
          
          <div className="mt-10 pt-6 border-t border-gray-200">
            <button 
              onClick={handleLogout}
              className="flex items-center py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </nav>
      </div>
    </aside>
  );
}
