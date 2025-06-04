import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { User as SharedUserType } from "@shared/schema";
import { Menu, Search, Bell, MessageSquare, User, Sun, Moon, LogOut, FileText, Home, Trash2, Info, CheckCircle, AlertTriangle, XCircle, BellRing, Settings } from "lucide-react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface TopNavigationProps {
  toggleSidebar: () => void;
  notifications?: { id: number; title: string; message: string; createdAt: string; read?: boolean }[];
}

const NOTIF_TYPE_ICON = {
  info: <Info className="h-4 w-4 text-blue-500" />,
  success: <CheckCircle className="h-4 w-4 text-green-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  urgent: <BellRing className="h-4 w-4 text-pink-600 animate-pulse" />,
  default: <Bell className="h-4 w-4 text-gray-400" />,
};

const PAGE_SIZE = 10;

const NOTIF_TYPES = ["info", "success", "warning", "error", "urgent"];
const NOTIF_SOUND_URL = "/assets/sounds/notification.mp3";

export default function TopNavigation({ toggleSidebar, notifications: propNotifications = [] }: TopNavigationProps) {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [pageTitle, setPageTitle] = useState("Dashboard");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const notifications = propNotifications;
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Create a safe user object that's properly typed
  const userData = user as SharedUserType | null;

  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Pagination state
  const [notifPage, setNotifPage] = useState(1);
  const pagedNotifications = notifications.slice(0, notifPage * PAGE_SIZE);
  const hasMore = notifications.length > pagedNotifications.length;
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  // Confirmation dialog state
  const [confirmDeleteId, setConfirmDeleteId] = useState<number|null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  // Notification settings state
  const [mute, setMute] = useState(false);
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(false);
  // Track previous notification IDs to detect new ones
  const [prevNotifIds, setPrevNotifIds] = useState<number[]>([]);

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to mark as read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/notifications"]);
      toast({ title: "Marked as read", variant: "success" });
    },
    onError: () => toast({ title: "Failed to mark as read", variant: "destructive" }),
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/read-all', { method: 'PATCH' });
      if (!res.ok) throw new Error('Failed to mark all as read');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/notifications"]);
      toast({ title: "All notifications marked as read", variant: "success" });
    },
    onError: () => toast({ title: "Failed to mark all as read", variant: "destructive" }),
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete notification');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/notifications"]);
      toast({ title: "Notification deleted", variant: "success" });
    },
    onError: () => toast({ title: "Failed to delete notification", variant: "destructive" }),
  });

  const deleteAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications', { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete all notifications');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/notifications"]);
      toast({ title: "All notifications deleted", variant: "success" });
    },
    onError: () => toast({ title: "Failed to delete all notifications", variant: "destructive" }),
  });

  // Load/save settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notifSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMute(!!parsed.mute);
        setShowOnlyUnread(!!parsed.showOnlyUnread);
        setFilterTypes(Array.isArray(parsed.filterTypes) ? parsed.filterTypes : []);
        setSoundEnabled(parsed.soundEnabled !== false); // default true
        setPushEnabled(!!parsed.pushEnabled);
      } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem('notifSettings', JSON.stringify({ mute, showOnlyUnread, filterTypes, soundEnabled, pushEnabled }));
  }, [mute, showOnlyUnread, filterTypes, soundEnabled, pushEnabled]);

  // Track previous notification IDs to detect new ones
  useEffect(() => {
    const ids = notifications.map(n => n.id);
    // Find new notifications
    const newNotifs = notifications.filter(n => !prevNotifIds.includes(n.id));
    if (!mute && newNotifs.length > 0) {
      if (soundEnabled) {
        const audio = new Audio(NOTIF_SOUND_URL);
        audio.play();
      }
      if (pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
        newNotifs.forEach(n => {
          new Notification(n.title, {
            body: n.message,
            icon: '/assets/icon.png',
            tag: `notif-${n.id}`,
          });
        });
      }
    }
    setPrevNotifIds(ids);
  }, [notifications, mute, soundEnabled, pushEnabled]);

  // Request push permission if enabled
  useEffect(() => {
    if (pushEnabled && 'Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }, [pushEnabled]);

  // Apply settings to notifications
  let filteredNotifications = notifications;
  if (showOnlyUnread) filteredNotifications = filteredNotifications.filter(n => !n.read);
  if (filterTypes.length > 0) filteredNotifications = filteredNotifications.filter(n => filterTypes.includes(n.type));

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
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 text-xs"></span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 sm:w-96">
              <div className="flex items-center justify-between px-4 pt-2 pb-1">
                <span className="font-semibold">Notifications</span>
                <button onClick={() => setShowSettings(true)} className="text-gray-500 hover:text-primary">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
              {unreadCount > 0 && (
                <button
                  className="block w-full text-xs text-blue-600 hover:underline text-left px-4 py-1 bg-transparent border-0"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isLoading}
                >
                  {markAllAsReadMutation.isLoading ? 'Marking all...' : 'Mark all as read'}
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  className="block w-full text-xs text-red-600 hover:underline text-left px-4 py-1 bg-transparent border-0"
                  onClick={() => setConfirmDeleteAll(true)}
                  disabled={deleteAllNotificationsMutation.isLoading}
                >
                  {deleteAllNotificationsMutation.isLoading ? 'Deleting all...' : 'Delete all'}
                </button>
              )}
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-auto">
                {mute ? (
                  <DropdownMenuItem className="p-4 text-center text-gray-400 italic">Notifications are muted</DropdownMenuItem>
                ) : (
                  filteredNotifications.length === 0 ? (
                    <DropdownMenuItem className="p-4 text-center text-gray-500">No notifications</DropdownMenuItem>
                  ) : (
                    filteredNotifications.slice(0, notifPage * PAGE_SIZE).map((notif) => {
                      const icon = NOTIF_TYPE_ICON[notif.type] || NOTIF_TYPE_ICON.default;
                      return (
                        <DropdownMenuItem key={notif.id} className="p-4 flex flex-col space-y-1 group">
                          <div className="flex items-start justify-between w-full">
                            <div className="flex items-center gap-2">
                              {icon}
                              <div>
                                <span className="font-medium text-sm">{notif.title}</span>
                                <span className="block text-sm text-gray-500">{notif.message}</span>
                                <span className="block text-xs text-gray-400">{new Date(notif.createdAt).toLocaleString()}</span>
                                {notif.action && notif.action.label && notif.action.url && (
                                  <button
                                    className="mt-2 text-xs text-primary underline hover:no-underline"
                                    onClick={e => {
                                      e.stopPropagation();
                                      window.open(notif.action.url, '_blank');
                                    }}
                                  >
                                    {notif.action.label}
                                  </button>
                                )}
                              </div>
                            </div>
                            <button
                              className="ml-2 text-red-500 opacity-60 hover:opacity-100 group-hover:opacity-100"
                              title="Delete notification"
                              onClick={e => {
                                e.stopPropagation();
                                setConfirmDeleteId(notif.id);
                              }}
                              disabled={deleteNotificationMutation.isLoading}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {!notif.read && (
                            <button
                              className="mt-2 text-xs text-blue-600 hover:underline self-start"
                              onClick={e => {
                                e.stopPropagation();
                                markAsReadMutation.mutate(notif.id);
                              }}
                              disabled={markAsReadMutation.isLoading}
                            >
                              Mark as read
                            </button>
                          )}
                        </DropdownMenuItem>
                      );
                    })
                  )
                )}
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

      {/* Confirmation dialogs */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded shadow-lg p-6 w-80">
            <p className="mb-4">Are you sure you want to delete this notification?</p>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button
                className="px-3 py-1 rounded bg-red-600 text-white"
                onClick={() => {
                  deleteNotificationMutation.mutate(confirmDeleteId!);
                  setConfirmDeleteId(null);
                }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}
      {confirmDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded shadow-lg p-6 w-80">
            <p className="mb-4">Are you sure you want to delete all notifications?</p>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700" onClick={() => setConfirmDeleteAll(false)}>Cancel</button>
              <button
                className="px-3 py-1 rounded bg-red-600 text-white"
                onClick={() => {
                  deleteAllNotificationsMutation.mutate();
                  setConfirmDeleteAll(false);
                }}
              >Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings modal (placeholder) */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded shadow-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">Notification Settings</h3>
            <div className="mb-4">
              <label className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={mute} onChange={e => setMute(e.target.checked)} />
                Mute all notifications
              </label>
              <label className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={soundEnabled} onChange={e => setSoundEnabled(e.target.checked)} />
                Play sound on new notification
              </label>
              <label className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={pushEnabled} onChange={e => setPushEnabled(e.target.checked)} />
                Show browser push notifications
              </label>
              <label className="flex items-center gap-2 mb-2">
                <input type="checkbox" checked={showOnlyUnread} onChange={e => setShowOnlyUnread(e.target.checked)} />
                Show only unread
              </label>
              <div className="mb-2">
                <span className="block mb-1">Filter by type:</span>
                {NOTIF_TYPES.map(type => (
                  <label key={type} className="inline-flex items-center gap-1 mr-3">
                    <input
                      type="checkbox"
                      checked={filterTypes.includes(type)}
                      onChange={e => {
                        if (e.target.checked) setFilterTypes([...filterTypes, type]);
                        else setFilterTypes(filterTypes.filter(t => t !== type));
                      }}
                    />
                    {NOTIF_TYPE_ICON[type]}
                    <span className="capitalize text-xs">{type}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700" onClick={() => setShowSettings(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Load more button */}
      {hasMore && (
        <button
          className="block w-full text-xs text-primary hover:underline text-center px-4 py-2 bg-transparent border-0"
          onClick={() => setNotifPage(p => p + 1)}
        >
          Load more
        </button>
      )}
    </header>
  );
}