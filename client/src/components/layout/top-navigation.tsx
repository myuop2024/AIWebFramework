import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Menu, Search, Bell, MessageSquare, User } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface TopNavigationProps {
  toggleSidebar: () => void;
}

export default function TopNavigation({ toggleSidebar }: TopNavigationProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [pageTitle, setPageTitle] = useState("Dashboard");
  
  // Set page title based on location
  useEffect(() => {
    const path = location.split("/")[1];
    switch (path) {
      case "profile":
        setPageTitle("My Profile");
        break;
      case "polling-stations":
        setPageTitle("Polling Stations");
        break;
      case "reports":
        setPageTitle("Reports");
        break;
      case "training":
        setPageTitle("Training");
        break;
      case "faq":
        setPageTitle("FAQ & Help");
        break;
      case "chat":
        setPageTitle("Chat Support");
        break;
      default:
        setPageTitle("Dashboard");
    }
  }, [location]);
  
  const [, navigate] = useLocation();
  
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login"); // Redirect to login page after successful logout
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };
  
  return (
    <header className="bg-white shadow-sm sticky top-0 z-30">
      <div className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center">
          <button 
            id="menu-toggle" 
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="ml-2 md:ml-0">
            <h2 className="text-lg font-medium text-gray-800">{pageTitle}</h2>
            {user && (
              <p className="text-sm text-gray-500">Welcome back, <span>{user.firstName}</span></p>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="hidden md:block relative">
            <Input 
              type="text" 
              placeholder="Search..." 
              className="pl-9 pr-4 py-2"
            />
            <Search className="h-5 w-5 text-gray-400 absolute left-2.5 top-2.5" />
          </div>
          
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-full text-gray-600 hover:bg-gray-100 relative">
                <Bell className="h-6 w-6" />
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-secondary"></span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-auto">
                <DropdownMenuItem>
                  <div className="flex flex-col">
                    <span className="font-medium">New Task Assigned</span>
                    <span className="text-sm text-gray-500">You have been assigned to Kingston Central #24</span>
                    <span className="text-xs text-gray-400 mt-1">5 minutes ago</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <div className="flex flex-col">
                    <span className="font-medium">Training Reminder</span>
                    <span className="text-sm text-gray-500">Observer Training Session starts in 2 hours</span>
                    <span className="text-xs text-gray-400 mt-1">2 hours ago</span>
                  </div>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center text-primary font-medium cursor-pointer">
                View All Notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Chat */}
          <Link href="/chat">
            <button className="p-1.5 rounded-full text-gray-600 hover:bg-gray-100">
              <MessageSquare className="h-6 w-6" />
            </button>
          </Link>
          
          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {user?.profilePhoto ? (
                  <img 
                    src={user.profilePhoto} 
                    alt={`${user.firstName} ${user.lastName}`} 
                    className="h-full w-full object-cover" 
                  />
                ) : (
                  <User className="h-5 w-5 text-gray-600" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/documents">Documents</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard">Dashboard</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
