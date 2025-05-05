import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { 
  Home, User, MapPin, FileText, BookOpen, 
  HelpCircle, MessageSquare, LogOut, 
  FileEdit, ClipboardList, Settings
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  
  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      const menuToggle = document.getElementById('menu-toggle');
      
      if (window.innerWidth < 768 && isOpen) {
        if (sidebar && !sidebar.contains(event.target as Node) && 
            menuToggle && event.target !== menuToggle) {
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
    { path: "/reports", label: "Reports", icon: <FileText className="h-5 w-5 mr-3" /> },
    { path: "/training", label: "Training", icon: <BookOpen className="h-5 w-5 mr-3" /> },
  ];
  
  // Admin links (only shown to users with admin role)
  const adminLinks = user?.role === 'admin' ? [
    { path: "/admin", label: "Admin Dashboard", icon: <Settings className="h-5 w-5 mr-3" /> },
    { path: "/form-templates", label: "Form Templates", icon: <ClipboardList className="h-5 w-5 mr-3" /> },
  ] : [];

  const supportLinks = [
    { path: "/faq", label: "FAQ & Help", icon: <HelpCircle className="h-5 w-5 mr-3" /> },
    { path: "/chat", label: "Chat Support", icon: <MessageSquare className="h-5 w-5 mr-3" /> },
  ];

  const handleLogout = async () => {
    try {
      await logout();
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
                {/* If user has profile photo, display it */}
                {user.profilePhoto ? (
                  <img 
                    src={user.profilePhoto} 
                    alt={`${user.firstName} ${user.lastName}`} 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <User className="h-6 w-6 text-gray-600" />
                )}
              </div>
              <div className="ml-3">
                <p className="font-medium text-gray-800">{`${user.firstName} ${user.lastName}`}</p>
                <p className="text-sm text-gray-500">Observer ID: <span className="font-medium">{user.observerId}</span></p>
              </div>
            </div>
          </div>
        )}
        
        {/* Navigation Links */}
        <nav>
          <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Main</p>
          
          {navLinks.map((link) => (
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
