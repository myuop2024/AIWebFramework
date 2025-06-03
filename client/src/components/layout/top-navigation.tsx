import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { User as SharedUserType } from "@shared/schema";
import { Menu, Search, Bell, MessageSquare, User, Sun, Moon, LogOut, FileText, Home } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PerformanceToggle } from "@/components/ui/performance-toggle";
import { cn } from "@/lib/utils";

interface TopNavigationProps {
  toggleSidebar: () => void;
}

export default function TopNavigation({ toggleSidebar }: TopNavigationProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Create a safe user object that's properly typed
  const userData = user as SharedUserType | null;

  // Check for dark mode preference
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Set page title based on location
  useEffect(() => {
    const pathSegments = location.split("/");
    const mainPath = pathSegments[1];
    const subPath = pathSegments[2];
    
    switch (mainPath) {
      case "profile":
        setPageTitle("My Profile");
        break;
      case "polling-stations":
        if (subPath === "create") setPageTitle("Create Polling Station");
        else if (subPath === "import") setPageTitle("Import Polling Stations");
        else if (subPath === "map") setPageTitle("Polling Stations Map");
        else if (subPath === "export") setPageTitle("Export Polling Stations");
        else setPageTitle("Polling Stations");
        break;
      case "route-planning":
        setPageTitle("Route Planning");
        break;
      case "observer-route-planning":
        setPageTitle("Geolocation Routing");
        break;
      case "reports":
        if (subPath === "new") setPageTitle("New Report");
        else setPageTitle("Reports");
        break;
      case "training":
        setPageTitle("Training Portal");
        break;
      case "project-management":
        if (subPath === "dashboard") setPageTitle("Project Dashboard");
        else if (subPath === "new") setPageTitle("New Project");
        else if (subPath === "kanban") setPageTitle("Kanban Board");
        else if (subPath === "calendar") setPageTitle("Project Calendar");
        else if (subPath === "analytics") setPageTitle("Project Analytics");
        else if (subPath === "tasks") setPageTitle("Tasks");
        else if (subPath === "milestones") setPageTitle("Milestones");
        else setPageTitle("Project Management");
        break;
      case "admin":
        if (subPath === "verification") setPageTitle("Observer Verification");
        else if (subPath === "training-integrations") setPageTitle("Training Integrations");
        else if (subPath === "permissions") setPageTitle("Permission Management");
        else setPageTitle("Admin Panel");
        break;
      case "supervisor":
        if (subPath === "team-management") setPageTitle("Team Management");
        else if (subPath === "assignments") setPageTitle("Observer Assignments");
        else if (subPath === "reports-approval") setPageTitle("Report Approvals");
        else if (subPath === "schedule-meeting") setPageTitle("Schedule Meeting");
        else setPageTitle("Supervisor Panel");
        break;
      case "roving":
        if (subPath === "station-schedule") setPageTitle("Station Schedule");
        else if (subPath === "area-reports") setPageTitle("Area Reports");
        else setPageTitle("Roving Observer");
        break;
      case "faq":
        setPageTitle("FAQ & Help");
        break;
      case "chat":
        setPageTitle("Communications");
        break;
      default:
        setPageTitle("Dashboard");
    }
  }, [location]);

  const [, navigate] = useLocation();

  const handleLogout = () => {
    try {
      logoutMutation.mutate();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
      <div className="flex justify-between items-center px-4 sm:px-6 py-3">
        <div className="flex items-center min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            id="menu-toggle" 
            onClick={(e) => {
              e.stopPropagation();
              toggleSidebar();
            }}
            className="lg:hidden p-2 mr-2 touch-target"
          >
            <Menu className="h-6 w-6" />
          </Button>
          
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white truncate">
              {pageTitle}
            </h2>
            {userData && (
              <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                Welcome back, <span className="font-medium">{userData.firstName || userData.email || 'Observer'}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Search - Hidden on mobile, shown on tablet+ */}
          <div className="hidden md:block relative">
            <Input 
              type="text" 
              placeholder="Search..." 
              className="pl-9 pr-4 py-2 w-64 form-input-mobile"
            />
            <Search className="h-5 w-5 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Mobile search button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden touch-target"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleDarkMode}
            className="touch-target"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          {/* Performance Settings - Hidden on mobile */}
          <div className="hidden sm:block">
            <PerformanceToggle />
          </div>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative touch-target">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 text-xs"></span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 sm:w-96">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <span className="text-xs text-gray-500">2 new</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-auto">
                <DropdownMenuItem className="p-4">
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-sm">New Task Assigned</span>
                    <span className="text-sm text-gray-500">You have been assigned to Kingston Central #24</span>
                    <span className="text-xs text-gray-400">5 minutes ago</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-4">
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-sm">Training Reminder</span>
                    <span className="text-sm text-gray-500">Observer Training Session starts in 2 hours</span>
                    <span className="text-xs text-gray-400">2 hours ago</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="p-4">
                  <div className="flex flex-col space-y-1">
                    <span className="font-medium text-sm">Report Approved</span>
                    <span className="text-sm text-gray-500">Your report for Station #15 has been approved</span>
                    <span className="text-xs text-gray-400">1 hour ago</span>
                  </div>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-center text-primary font-medium cursor-pointer p-3">
                View All Notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Chat */}
          <Button variant="ghost" size="sm" asChild className="touch-target">
            <Link href="/chat">
              <MessageSquare className="h-5 w-5" />
            </Link>
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="touch-target">
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                  <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <span className="font-medium">{userData?.firstName || userData?.email || 'User'}</span>
                  <span className="text-xs text-gray-500 capitalize">{userData?.role || 'observer'}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="w-full">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/documents" className="w-full">
                  <FileText className="mr-2 h-4 w-4" />
                  Documents
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Performance Settings for mobile */}
              <div className="sm:hidden">
                <DropdownMenuItem>
                  <div className="flex items-center justify-between w-full">
                    <span>Performance Mode</span>
                    <PerformanceToggle />
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </div>
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}