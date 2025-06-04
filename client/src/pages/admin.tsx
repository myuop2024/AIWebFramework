import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdminModal } from "@/components/admin/admin-modal";
import AdminDashboard from "@/components/admin/admin-dashboard";
import AdminLayout from "@/components/layout/admin-layout";
import { 
  Users, Settings, Lock, Database, AlertTriangle, BarChart, 
  FileText, CalendarClock, MapPin, Bell, Mail, Shield, Server, BookOpen
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import TopNavigation from "@/components/layout/top-navigation";

// Define structure for system stats for this page, similar to AdminDashboard
interface AdminPageSystemStats {
  users?: {
    total?: number;
    byRole?: Record<string, number>;
    pending_documents?: number;
    pending_verification?: number;
    rejected?: number;
  };
  reports?: {
    byType?: Record<string, number>;
    byStatus?: Record<string, number>; // Added based on usage for total reports calculation
    pending?: number;
    flagged?: number;
  };
  pollingStations?: {
    total?: number;
    active?: number;
    riskAssessment?: {
      highRisk?: number;
      mediumRisk?: number;
      lowRisk?: number;
      noRisk?: number;
    };
  };
  assignments?: {
    active?: number;
  };
  system?: {
    version?: string;
    uptime?: number;
    database?: { // Nested database object
      status?: string;
      size?: number;
    };
    lastUpdated?: string;
    status?: string;
  };
}

export default function Admin() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [broadcastAll, setBroadcastAll] = useState(true);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  // Mock queries for various admin data
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: !!user && user.role === 'admin',
  });

  const { data: systemStats, isLoading: statsLoading } = useQuery<AdminPageSystemStats>({
    queryKey: ['/api/admin/system-stats'],
    enabled: !!user && user.role === 'admin',
    // Remove onSuccess from useQuery; handle side effects in useEffect or via direct data usage
    // onSuccess: (data: any) => {
    //   console.log('System stats:', data);
    // }
    initialData: { // Provide initialData to prevent undefined access issues
      users: { total: 0, byRole: {}, pending_documents: 0, pending_verification: 0, rejected: 0 },
      reports: { byType: {}, byStatus: {}, pending: 0, flagged: 0 },
      pollingStations: { total: 0, active: 0, riskAssessment: { highRisk: 0, mediumRisk: 0, lowRisk: 0, noRisk: 0 } },
      assignments: { active: 0 },
      system: { version: 'N/A', uptime: 0, database: { status: 'N/A', size: 0 }, lastUpdated: 'N/A', status: 'N/A' }
    }
  });

  // State for managing user data
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedStation, setSelectedStation] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<number | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<React.ReactNode | string>('');
  const [modalTitle, setModalTitle] = useState<string>('');

  const queryClient = useQueryClient();

  // Fetch notifications for the current user
  const { data: userNotifications = [], refetch } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
  });

  // Mutation to send notification
  const sendNotificationMutation = useMutation({
    mutationFn: async (payload: { title: string; message: string; userId?: string }) => {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload }),
      });
      if (!res.ok) throw new Error("Failed to send notification");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["/api/notifications"]);
      refetch();
    },
  });

  // Function to open a modal with specific content
  const openModal = (title: string, content: React.ReactNode | string) => {
    setModalTitle(title);
    setModalContent(content);
    setIsModalOpen(true);
  };

  // Handler for saving settings
  const handleSaveSettings = (section: string) => {
    setIsActionLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsActionLoading(false);
      toast({
        title: "Settings Updated",
        description: `${section} settings have been saved successfully.`,
        variant: "default",
      });
    }, 800);
  };

  // Handler for toggling maintenance mode
  const handleToggleMaintenance = () => {
    setIsActionLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsActionLoading(false);
      toast({
        title: "Maintenance Mode Toggled",
        description: "System maintenance mode has been updated.",
        variant: "default",
      });
    }, 800);
  };
  
  // Handler for user management
  const handleManageUsers = () => {
    setIsActionLoading(true);
    
    // Import dynamically to avoid circular dependencies
    import('@/components/admin/user-management').then(({ UserManagement }) => {
      setIsActionLoading(false);
      openModal(
        "User Management", 
        <UserManagement />
      );
    }).catch(error => {
      console.error('Error loading UserManagement component:', error);
      setIsActionLoading(false);
      toast({
        title: "Error",
        description: "Failed to load user management component",
        variant: "destructive",
      });
    });
  };
  
  // Handler for processing verifications
  const handleProcessVerifications = () => {
    setIsActionLoading(true);
    
    import('@/components/admin/verification-queue').then((module) => {
      // Make sure we get the component correctly regardless of export style
      const VerificationQueue = module.default || module.VerificationQueue;
      setIsActionLoading(false);
      openModal(
        "User Verification", 
        <VerificationQueue />
      );
    }).catch(error => {
      console.error('Error loading VerificationQueue component:', error);
      setIsActionLoading(false);
      toast({
        title: "Error",
        description: "Failed to load verification queue component",
        variant: "destructive",
      });
    });
  };
  
  // Handler for editing roles
  const handleEditRoles = () => {
    setIsActionLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsActionLoading(false);
      openModal(
        "Edit User Roles", 
        `
        <div>
          <h3 class="text-lg font-medium mb-4">User Roles Management</h3>
          <div class="space-y-4">
            <div class="p-3 bg-gray-50 rounded border">
              <h4 class="font-medium mb-2">Administrator</h4>
              <p class="text-sm text-gray-600 mb-2">Full access to all system functions and settings</p>
              <div class="flex gap-2">
                <button class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Edit Permissions</button>
                <button class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">Rename</button>
              </div>
            </div>
            
            <div class="p-3 bg-gray-50 rounded border">
              <h4 class="font-medium mb-2">Observer</h4>
              <p class="text-sm text-gray-600 mb-2">Can submit reports and view assigned polling stations</p>
              <div class="flex gap-2">
                <button class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Edit Permissions</button>
                <button class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">Rename</button>
              </div>
            </div>
            
            <div class="p-3 bg-gray-50 rounded border">
              <h4 class="font-medium mb-2">Supervisor</h4>
              <p class="text-sm text-gray-600 mb-2">Can review reports and manage observers</p>
              <div class="flex gap-2">
                <button class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Edit Permissions</button>
                <button class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">Rename</button>
              </div>
            </div>
            
            <div class="p-3 bg-gray-50 rounded border">
              <h4 class="font-medium mb-2">Analyst</h4>
              <p class="text-sm text-gray-600 mb-2">View-only access to reports and analytics</p>
              <div class="flex gap-2">
                <button class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Edit Permissions</button>
                <button class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">Rename</button>
              </div>
            </div>
            
            <button class="w-full mt-4 px-4 py-2 bg-primary text-white rounded">Add New Role</button>
          </div>
        </div>
        `
      );
    }, 800);
  };
  
  // Handler for managing stations
  const handleManageStations = () => {
    setIsActionLoading(true);
    
    // Import dynamically to avoid circular dependencies
    import('@/components/admin/polling-station-management').then(({ PollingStationManagement }) => {
      setIsActionLoading(false);
      openModal(
        "Polling Station Management", 
        <PollingStationManagement />
      );
    }).catch(error => {
      console.error('Error loading PollingStationManagement component:', error);
      setIsActionLoading(false);
      toast({
        title: "Error",
        description: "Failed to load polling station management component",
        variant: "destructive",
      });
    });
  };
  
  // Handler for managing assignments
  const handleManageAssignments = () => {
    setIsActionLoading(true);
    
    // Import dynamically to avoid circular dependencies
    import('@/components/admin/assignment-management').then(({ AssignmentManagement }) => {
      setIsActionLoading(false);
      openModal(
        "Station Assignments", 
        <AssignmentManagement />
      );
    }).catch(error => {
      console.error('Error loading AssignmentManagement component:', error);
      setIsActionLoading(false);
      toast({
        title: "Error",
        description: "Failed to load assignment management component",
        variant: "destructive",
      });
    });
  };
  
  // Handler for viewing station analytics
  const handleViewStationAnalytics = () => {
    setIsActionLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsActionLoading(false);
      openModal(
        "Station Analytics", 
        `
        <div>
          <h3 class="text-lg font-medium mb-4">Polling Station Analytics</h3>
          
          <div class="grid grid-cols-3 gap-4 mb-6">
            <div class="p-3 bg-gray-50 rounded border text-center">
              <div class="text-2xl font-bold text-red-600">14</div>
              <div class="text-sm">High Risk Stations</div>
            </div>
            <div class="p-3 bg-gray-50 rounded border text-center">
              <div class="text-2xl font-bold text-amber-600">32</div>
              <div class="text-sm">Medium Risk Stations</div>
            </div>
            <div class="p-3 bg-gray-50 rounded border text-center">
              <div class="text-2xl font-bold text-green-600">78</div>
              <div class="text-sm">Low Risk Stations</div>
            </div>
          </div>
          
          <div class="space-y-3 mb-6">
            <h4 class="font-medium">Station Coverage</h4>
            <div class="w-full h-8 bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full bg-primary" style="width: 82%"></div>
            </div>
            <div class="flex justify-between text-sm">
              <span>0%</span>
              <span>82% Coverage</span>
              <span>100%</span>
            </div>
          </div>
          
          <div class="space-y-4">
            <h4 class="font-medium">High Risk Stations</h4>
            
            <div class="p-3 bg-red-50 rounded border">
              <div class="flex justify-between items-center">
                <div>
                  <div class="font-medium">Central High School</div>
                  <div class="text-sm text-gray-500">Risk Score: 8.7/10</div>
                </div>
                <div>
                  <button class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">View Details</button>
                </div>
              </div>
            </div>
            
            <div class="p-3 bg-red-50 rounded border">
              <div class="flex justify-between items-center">
                <div>
                  <div class="font-medium">West Side Elementary</div>
                  <div class="text-sm text-gray-500">Risk Score: 8.2/10</div>
                </div>
                <div>
                  <button class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">View Details</button>
                </div>
              </div>
            </div>
            
            <div class="p-3 bg-red-50 rounded border">
              <div class="flex justify-between items-center">
                <div>
                  <div class="font-medium">Memorial Stadium</div>
                  <div class="text-sm text-gray-500">Risk Score: 7.9/10</div>
                </div>
                <div>
                  <button class="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">View Details</button>
                </div>
              </div>
            </div>
            
            <button class="w-full mt-2 px-4 py-2 bg-gray-100 text-gray-800 rounded">View All High Risk Stations</button>
          </div>
        </div>
        `
      );
    }, 800);
  };
  
  // Handler for sending notification
  const handleSendNotification = () => {
    setIsActionLoading(true);
    sendNotificationMutation.mutate(
      {
        title: notificationTitle || "Notification",
        message: notificationMessage || "You have a new notification.",
        ...(broadcastAll ? {} : { userId: user?.id }),
      },
      {
        onSettled: () => {
          setIsActionLoading(false);
          toast({
            title: "Notification Sent",
            description: broadcastAll ? "Your notification has been sent to all users." : "Your notification has been sent.",
            variant: "default",
          });
        },
      }
    );
  };
  
  // Let's restart from a clean function definition
  const handleManageEvents = () => {
    setIsActionLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsActionLoading(false);
      openModal(
        "Event Management", 
        `
        <div>
          <h3 class="text-lg font-medium mb-4">Upcoming Events</h3>
            
          <div class="space-y-3">
            <div class="p-3 border rounded">
              <div class="flex justify-between mb-1">
                <div class="font-medium">Election Day</div>
                <div class="text-sm text-green-600 bg-green-50 px-2 py-0.5 rounded">Active</div>
              </div>
              <div class="text-sm text-gray-500 mb-2">May 5, 2025</div>
              <div class="flex gap-2">
                <button class="px-3 py-1 bg-blue-600 text-white rounded text-sm">Edit</button>
                <button class="px-3 py-1 bg-amber-600 text-white rounded text-sm">Assignments</button>
                <button class="px-3 py-1 bg-green-600 text-white rounded text-sm">View Reports</button>
              </div>
            </div>
            
            <div class="p-3 border rounded">
              <div class="flex justify-between mb-1">
                <div class="font-medium">Observer Training Session</div>
                <div class="text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Upcoming</div>
              </div>
              <div class="text-sm text-gray-500 mb-2">April 20, 2025</div>
              <div class="flex gap-2">
                <button class="px-3 py-1 bg-blue-600 text-white rounded text-sm">Edit</button>
                <button class="px-3 py-1 bg-amber-600 text-white rounded text-sm">Participants</button>
                <button class="px-3 py-1 bg-red-600 text-white rounded text-sm">Cancel</button>
              </div>
            </div>
          </div>
            
          <button class="w-full px-3 py-2 bg-primary text-white rounded text-sm mt-4">Add New Event</button>
        </div>
        `
      );
    }, 800);
  };
  
  // Handler for analytics
  const handleViewAnalytics = () => {
    setIsActionLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsActionLoading(false);
      openModal(
        "Analytics Dashboard", 
        `
        <div>
          <h3 class="text-lg font-medium mb-4">Risk Assessment Analytics</h3>
          <div>
            <div class="flex justify-between mb-1">
              <div class="font-medium">Medium Risk Stations (32)</div>
              <button class="text-xs text-blue-600">View All</button>
            </div>
            <ul class="space-y-2">
              <li class="flex justify-between p-2 bg-amber-50 rounded">
                <div>Central District #4</div>
                <div class="text-sm text-amber-600">56% Risk Score</div>
              </li>
              <li class="flex justify-between p-2 bg-amber-50 rounded">
                <div>Southern Zone #9</div>
                <div class="text-sm text-amber-600">48% Risk Score</div>
              </li>
            </ul>
          </div>
          
          <div class="mt-4 p-3 border rounded bg-gray-50">
            <div class="font-medium mb-2">Risk Assessment Criteria</div>
            <ul class="list-disc pl-5 text-sm space-y-1">
              <li>Previous incidents reported</li>
              <li>Observer coverage gaps</li>
              <li>Accessibility issues</li>
              <li>Historical voter turnout</li>
              <li>Security concerns</li>
            </ul>
          </div>
        </div>
        `
      );
    }, 800);
  };
  
  // Handler for review reports
  const handleReviewReports = () => {
    setIsActionLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsActionLoading(false);
      openModal(
        "Report Management", 
        `
        <div>
          <div class="flex justify-between mb-4">
            <h3 class="text-lg font-medium">Reports Requiring Review (18)</h3>
            <div>
              <select class="text-sm border rounded p-1">
                <option>All Reports</option>
                <option>Pending Review</option>
                <option>Flagged Issues</option>
                <option>Approved</option>
              </select>
            </div>
          </div>
          <ul class="space-y-3">
            <li class="p-3 border rounded">
              <div class="flex justify-between mb-1">
                <div class="font-medium">Incident Report #143</div>
                <div class="text-sm text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Pending Review</div>
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Station:</span> Main City Hall
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Submitted by:</span> John Smith
              </div>
              <div class="text-sm mb-2">
                <span class="font-medium">Date:</span> May 4, 2025 (2:34 PM)
              </div>
              <div class="flex gap-2">
                <button class="px-3 py-1 bg-green-600 text-white rounded text-sm">Approve</button>
                <button class="px-3 py-1 bg-red-600 text-white rounded text-sm">Reject</button>
                <button class="px-3 py-1 bg-blue-600 text-white rounded text-sm">Review Details</button>
              </div>
            </li>
            <li class="p-3 border rounded">
              <div class="flex justify-between mb-1">
                <div class="font-medium">Observer Report #144</div>
                <div class="text-sm text-red-600 bg-red-50 px-2 py-0.5 rounded">Flagged</div>
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Station:</span> Central Community Center
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Submitted by:</span> Sarah Wilson
              </div>
              <div class="text-sm mb-2">
                <span class="font-medium">Date:</span> May 4, 2025 (3:15 PM)
              </div>
              <div class="flex gap-2">
                <button class="px-3 py-1 bg-green-600 text-white rounded text-sm">Approve</button>
                <button class="px-3 py-1 bg-red-600 text-white rounded text-sm">Reject</button>
                <button class="px-3 py-1 bg-blue-600 text-white rounded text-sm">Review Details</button>
              </div>
            </li>
          </ul>
        </div>
        `
      );
    }, 800);
  };
  
  // Note: handleManageEvents function is already defined above
  
  // Handler for sending event notification
  const handleSendEventNotification = () => {
    setIsActionLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsActionLoading(false);
      toast({
        title: "Event Notification Sent",
        description: "Your event notification has been sent to all participants.",
        variant: "default",
      });
    }, 800);
  };
  
  // Handler for managing training
  const handleManageTraining = () => {
    setIsActionLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsActionLoading(false);
      openModal(
        "Training Management", 
        `
        <div>
          <div class="flex justify-between mb-4">
            <h3 class="text-lg font-medium">Training Modules</h3>
            <button class="px-3 py-1 bg-primary text-white rounded text-sm">Add New Module</button>
          </div>
          <ul class="space-y-3">
            <li class="p-3 border rounded">
              <div class="flex justify-between mb-1">
                <div class="font-medium">Observer Fundamentals</div>
                <div class="text-sm text-green-600 bg-green-50 px-2 py-0.5 rounded">Active</div>
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Completion rate:</span> 87%
              </div>
              <div class="text-sm mb-2">
                <span class="font-medium">Last updated:</span> April 15, 2025
              </div>
              <div class="flex gap-2">
                <button class="px-3 py-1 bg-blue-600 text-white rounded text-sm">Edit</button>
                <button class="px-3 py-1 bg-gray-600 text-white rounded text-sm">Disable</button>
                <button class="px-3 py-1 bg-green-600 text-white rounded text-sm">View Completions</button>
              </div>
            </li>
            <li class="p-3 border rounded">
              <div class="flex justify-between mb-1">
                <div class="font-medium">Reporting Procedures</div>
                <div class="text-sm text-green-600 bg-green-50 px-2 py-0.5 rounded">Active</div>
              </div>
              <div class="text-sm mb-1">
                <span class="font-medium">Completion rate:</span> 76%
              </div>
              <div class="text-sm mb-2">
                <span class="font-medium">Last updated:</span> April 20, 2025
              </div>
              <div class="flex gap-2">
                <button class="px-3 py-1 bg-blue-600 text-white rounded text-sm">Edit</button>
                <button class="px-3 py-1 bg-gray-600 text-white rounded text-sm">Disable</button>
                <button class="px-3 py-1 bg-green-600 text-white rounded text-sm">View Completions</button>
              </div>
            </li>
          </ul>
        </div>
        `
      );
    }, 800);
  };
  
  // Handler for viewing system logs
  const handleViewLogs = () => {
    setIsActionLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsActionLoading(false);
      openModal(
        "System Logs", 
        `
        <div>
          <div class="flex justify-between mb-4">
            <h3 class="text-lg font-medium">System Logs</h3>
            <div>
              <select class="text-sm border rounded p-1">
                <option>All Logs</option>
                <option>Error Logs</option>
                <option>Authentication Logs</option>
                <option>API Requests</option>
              </select>
            </div>
          </div>
          <div class="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm h-64 overflow-y-auto">
            <div>[2025-05-05 08:24:32] INFO: System startup completed</div>
            <div>[2025-05-05 08:25:47] INFO: User login successful: admin</div>
            <div>[2025-05-05 08:26:13] INFO: Database connection pool initialized</div>
            <div>[2025-05-05 08:30:21] INFO: API request: GET /api/polling-stations</div>
            <div>[2025-05-05 08:31:05] INFO: User login successful: observer1</div>
            <div>[2025-05-05 08:32:17] INFO: New report submitted: id=145</div>
            <div>[2025-05-05 08:33:42] WARN: Rate limit reached for IP: 192.168.1.42</div>
            <div>[2025-05-05 08:35:19] INFO: API request: POST /api/users/profile</div>
            <div>[2025-05-05 08:37:45] ERROR: Database query error: timeout</div>
            <div>[2025-05-05 08:38:12] INFO: Database connection reestablished</div>
            <div>[2025-05-05 08:40:27] INFO: User login successful: coordinator2</div>
            <div>[2025-05-05 08:41:53] INFO: Assignment updated: id=87</div>
            <div>[2025-05-05 08:45:11] INFO: API request: GET /api/reports?status=pending</div>
            <div>[2025-05-05 08:47:32] INFO: Report status updated: id=142, status=approved</div>
          </div>
        </div>
        `
      );
    }, 800);
  };
  
  // Handler for running backup
  const handleRunBackup = () => {
    setIsActionLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsActionLoading(false);
      toast({
        title: "Backup Initiated",
        description: "System backup process has started. You'll be notified when complete.",
        variant: "default",
      });
    }, 800);
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <AdminLayout title="Admin Dashboard">
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Manage your election observer system settings and users</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            System Status
          </Button>
          <Button variant="default" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Global Settings
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mb-8">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            <span className="hidden sm:inline">Permissions</span>
          </TabsTrigger>
          <TabsTrigger value="stations" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Polling Stations</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Reports</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            <span className="hidden sm:inline">Events</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  User Management
                </CardTitle>
                <CardDescription>
                  Manage observers, coordinators, and administrators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Users</span>
                  <Badge variant="secondary">{statsLoading ? "..." : systemStats?.users?.total || "0"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Pending Verification</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {statsLoading ? "..." : systemStats?.users?.byRole?.pending || "0"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Admin Users</span>
                  <Badge>{statsLoading ? "..." : systemStats?.users?.byRole?.admin || "0"}</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={handleManageUsers}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Manage Users"}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  User Verification
                </CardTitle>
                <CardDescription>
                  Review and approve new observer registrations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Pending Documents</span>
                  <Badge variant="secondary">{statsLoading ? "..." : systemStats?.users?.byRole?.pending_documents || "0"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">ID Verifications</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {statsLoading ? "..." : systemStats?.users?.byRole?.pending_verification || "0"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Rejected</span>
                  <Badge variant="destructive">{statsLoading ? "..." : systemStats?.users?.byRole?.rejected || "0"}</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={handleProcessVerifications}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Process Verifications"}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notifications
                </CardTitle>
                <CardDescription>
                  Send alerts and messages to observers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notification-title">Notification Title</Label>
                  <Input 
                    id="notification-title" 
                    placeholder="Enter notification title"
                    value={notificationTitle}
                    onChange={(e) => setNotificationTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification-message">Message</Label>
                  <Input 
                    id="notification-message" 
                    placeholder="Enter message"
                    value={notificationMessage}
                    onChange={(e) => setNotificationMessage(e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="urgent" />
                  <Label htmlFor="urgent">Mark as urgent</Label>
                </div>
                <label className="flex items-center gap-2 mt-2">
                  <input type="checkbox" checked={broadcastAll} onChange={e => setBroadcastAll(e.target.checked)} />
                  Send to all users
                </label>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={handleSendNotification}
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Notification"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Role Management
                </CardTitle>
                <CardDescription>
                  Manage user roles and permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium">Administrator</span>
                    <Badge>Full Access</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium">Coordinator</span>
                    <Badge variant="outline">Limited Access</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium">Observer</span>
                    <Badge variant="outline">Restricted Access</Badge>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="font-medium">Guest</span>
                    <Badge variant="secondary">View Only</Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={handleEditRoles}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Edit Roles"}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Permission Settings
                </CardTitle>
                <CardDescription>
                  Configure access controls for each role
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Reports Access</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="view-reports" defaultChecked />
                        <Label htmlFor="view-reports">View</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="edit-reports" defaultChecked />
                        <Label htmlFor="edit-reports">Edit</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="delete-reports" />
                        <Label htmlFor="delete-reports">Delete</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="approve-reports" />
                        <Label htmlFor="approve-reports">Approve</Label>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>User Management</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="view-users" defaultChecked />
                        <Label htmlFor="view-users">View</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="edit-users" />
                        <Label htmlFor="edit-users">Edit</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="create-users" />
                        <Label htmlFor="create-users">Create</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="delete-users" />
                        <Label htmlFor="delete-users">Delete</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleSaveSettings("Permission")}>
                  Save Permissions
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Polling Stations Tab */}
        <TabsContent value="stations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Polling Stations
                </CardTitle>
                <CardDescription>
                  Manage election polling stations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Stations</span>
                  <Badge variant="secondary">{statsLoading ? "..." : systemStats?.pollingStations?.total || "0"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active Stations</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {statsLoading ? "..." : 
                      // Calculate active stations by subtracting high-risk (inactive) stations from total
                      (systemStats?.pollingStations?.total || 0) - (systemStats?.pollingStations?.riskAssessment?.highRisk || 0)
                    }
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Observer Coverage</span>
                  <Badge>{statsLoading ? "..." : 
                    // Calculate percentage of stations that have observer coverage
                    systemStats?.pollingStations?.total && systemStats.assignments?.active
                      ? Math.round((systemStats.assignments.active / systemStats.pollingStations.total) * 100) + "%"
                      : "0%"
                  }</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={handleManageStations}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Manage Stations"}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Station Assignments
                </CardTitle>
                <CardDescription>
                  Assign observers to polling stations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Assignments</span>
                  <Badge variant="secondary">{statsLoading ? "..." : systemStats?.assignments?.active || "0"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Unassigned Stations</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {statsLoading ? "..." : 
                      // Calculate unassigned stations
                      Math.max(0, (systemStats?.pollingStations?.total || 0) - (systemStats?.assignments?.active || 0))
                    }
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Coverage Rate</span>
                  <Badge>{statsLoading ? "..." : 
                    systemStats?.pollingStations?.total && systemStats?.assignments?.active
                      ? Math.round((systemStats.assignments.active / systemStats.pollingStations.total) * 100) + "%"
                      : "0%"
                  }</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={handleManageAssignments}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Manage Assignments"}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-primary" />
                  Station Analytics
                </CardTitle>
                <CardDescription>
                  View station coverage and statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">High Risk Stations</span>
                  <Badge variant="destructive">{statsLoading ? "..." : systemStats?.pollingStations?.riskAssessment?.highRisk || "0"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Medium Risk</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {statsLoading ? "..." : systemStats?.pollingStations?.riskAssessment?.mediumRisk || "0"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Low Risk</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {statsLoading ? "..." : systemStats?.pollingStations?.riskAssessment?.lowRisk || "0"}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={handleViewStationAnalytics}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "View Analytics"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Report Management
                </CardTitle>
                <CardDescription>
                  Manage observer reports and data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Total Reports</span>
                  <Badge variant="secondary">
                    {statsLoading ? "..." : 
                      // Sum all report counts from all statuses
                      Object.values(systemStats?.reports?.byStatus || {}).reduce((sum: number, count: number) => sum + count, 0)
                    }
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Pending Review</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {statsLoading ? "..." : systemStats?.reports?.pending || "0"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Flagged Issues</span>
                  <Badge variant="destructive">
                    {statsLoading ? "..." : systemStats?.reports?.byType?.flagged || "0"}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="default" 
                  onClick={handleReviewReports}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Review Reports"}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Form Templates
                </CardTitle>
                <CardDescription>
                  Manage report templates and fields
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active Templates</span>
                  <Badge variant="secondary">{statsLoading ? "..." : "8"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Draft Templates</span>
                  <Badge variant="outline">{statsLoading ? "..." : "3"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Required Fields</span>
                  <Badge>{statsLoading ? "..." : "12"}</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="default" 
                  onClick={() => navigate("/form-templates")}
                >
                  Edit Templates
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart className="h-5 w-5 text-primary" />
                  Report Analytics
                </CardTitle>
                <CardDescription>
                  View reporting statistics and trends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Issues Reported</span>
                  <Badge variant="destructive">{statsLoading ? "..." : "86"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Incident Rate</span>
                  <Badge variant="outline">{statsLoading ? "..." : "5.8%"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Reporting Rate</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {statsLoading ? "..." : "93%"}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="default" 
                  onClick={handleViewAnalytics}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "View Analytics"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-primary" />
                  Event Management
                </CardTitle>
                <CardDescription>
                  Manage training and observer events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Upcoming Events</span>
                  <Badge variant="secondary">{statsLoading ? "..." : "8"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Current Attendance</span>
                  <Badge variant="outline">{statsLoading ? "..." : "87%"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Training Completion</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {statsLoading ? "..." : "92%"}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={() => {
                    setIsActionLoading(true);
                    setTimeout(() => {
                      setIsActionLoading(false);
                      openModal(
                        "Event Management",
                        `
                        <div>
                          <div class="flex justify-between mb-4">
                            <h3 class="text-lg font-medium">Upcoming Events</h3>
                            <button class="px-3 py-1 bg-primary text-white rounded text-sm">Create Event</button>
                          </div>
                          <ul class="space-y-3">
                            <li class="p-3 border rounded">
                              <div class="flex justify-between mb-1">
                                <div class="font-medium">Observer Training Workshop</div>
                                <div class="text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Upcoming</div>
                              </div>
                              <div class="text-sm text-gray-500 mb-2">May 10, 2025 (9:00 AM - 2:00 PM)</div>
                              <div class="text-sm text-gray-500 mb-2">Central Community Center</div>
                              <div class="flex gap-2">
                                <button class="px-3 py-1 bg-blue-600 text-white rounded text-sm">Edit</button>
                                <button class="px-3 py-1 bg-amber-600 text-white rounded text-sm">Attendance</button>
                                <button class="px-3 py-1 bg-red-600 text-white rounded text-sm">Cancel</button>
                              </div>
                            </li>
                            
                            <li class="p-3 border rounded">
                              <div class="flex justify-between mb-1">
                                <div class="font-medium">Election Day Briefing</div>
                                <div class="text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Upcoming</div>
                              </div>
                              <div class="text-sm text-gray-500 mb-2">May 15, 2025 (6:00 PM - 8:00 PM)</div>
                              <div class="text-sm text-gray-500 mb-2">Virtual (Zoom)</div>
                              <div class="flex gap-2">
                                <button class="px-3 py-1 bg-blue-600 text-white rounded text-sm">Edit</button>
                                <button class="px-3 py-1 bg-amber-600 text-white rounded text-sm">Attendance</button>
                                <button class="px-3 py-1 bg-red-600 text-white rounded text-sm">Cancel</button>
                              </div>
                            </li>
                          </ul>
                        </div>
                        `
                      );
                    }, 800);
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Manage Events"}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Event Communication
                </CardTitle>
                <CardDescription>
                  Send notifications for events and training
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="event-title">Event Title</Label>
                  <Input id="event-title" placeholder="Select event" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="event-message">Message</Label>
                  <Input id="event-message" placeholder="Enter message" />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="send-sms" />
                  <Label htmlFor="send-sms">Also send SMS</Label>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="default" 
                  onClick={handleSendNotification}
                  disabled={isLoading}
                >
                  {isLoading ? "Sending..." : "Send Event Notification"}
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Training Management
                </CardTitle>
                <CardDescription>
                  Manage observer training programs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Training Modules</span>
                  <Badge variant="secondary">{statsLoading ? "..." : "12"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Certified Observers</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {statsLoading ? "..." : "189"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Pending Certification</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {statsLoading ? "..." : "45"}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={() => {
                    setIsActionLoading(true);
                    setTimeout(() => {
                      setIsActionLoading(false);
                      openModal(
                        "Training Management",
                        `
                        <div>
                          <div class="flex justify-between mb-4">
                            <h3 class="text-lg font-medium">Training Modules</h3>
                            <button class="px-3 py-1 bg-primary text-white rounded text-sm">Create Module</button>
                          </div>
                          <ul class="space-y-3">
                            <li class="p-3 border rounded">
                              <div class="flex justify-between mb-1">
                                <div class="font-medium">Election Observation Basics</div>
                                <div class="text-sm text-green-600 bg-green-50 px-2 py-0.5 rounded">Active</div>
                              </div>
                              <div class="text-sm text-gray-500 mb-2">Required for all observers</div>
                              <div class="flex items-center justify-between mb-2">
                                <span class="text-sm">Completion Rate:</span>
                                <span class="text-sm font-medium">95%</span>
                              </div>
                              <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                                <div class="h-full bg-green-500" style={{width: "95%"}}></div>
                              </div>
                              <div class="flex gap-2">
                                <button class="px-3 py-1 bg-blue-600 text-white rounded text-sm">Edit</button>
                                <button class="px-3 py-1 bg-amber-600 text-white rounded text-sm">View Results</button>
                              </div>
                            </li>
                            
                            <li class="p-3 border rounded">
                              <div class="flex justify-between mb-1">
                                <div class="font-medium">Reporting & Documentation</div>
                                <div class="text-sm text-green-600 bg-green-50 px-2 py-0.5 rounded">Active</div>
                              </div>
                              <div class="text-sm text-gray-500 mb-2">Required for all observers</div>
                              <div class="flex items-center justify-between mb-2">
                                <span class="text-sm">Completion Rate:</span>
                                <span class="text-sm font-medium">87%</span>
                              </div>
                              <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                                <div class="h-full bg-green-500" style={{width: "87%"}}></div>
                              </div>
                              <div class="flex gap-2">
                                <button class="px-3 py-1 bg-blue-600 text-white rounded text-sm">Edit</button>
                                <button class="px-3 py-1 bg-amber-600 text-white rounded text-sm">View Results</button>
                              </div>
                            </li>
                            
                            <li class="p-3 border rounded">
                              <div class="flex justify-between mb-1">
                                <div class="font-medium">Conflict Resolution</div>
                                <div class="text-sm text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Optional</div>
                              </div>
                              <div class="text-sm text-gray-500 mb-2">Recommended for supervisors</div>
                              <div class="flex items-center justify-between mb-2">
                                <span class="text-sm">Completion Rate:</span>
                                <span class="text-sm font-medium">62%</span>
                              </div>
                              <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                                <div class="h-full bg-amber-500" style={{width: "62%"}}></div>
                              </div>
                              <div class="flex gap-2">
                                <button class="px-3 py-1 bg-blue-600 text-white rounded text-sm">Edit</button>
                                <button class="px-3 py-1 bg-amber-600 text-white rounded text-sm">View Results</button>
                              </div>
                            </li>
                          </ul>
                        </div>
                        `
                      );
                    }, 800);
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Manage Training"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* System Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  System Settings
                </CardTitle>
                <CardDescription>
                  Configure system-wide settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="system-name">System Name</Label>
                  <Input id="system-name" defaultValue="CAFFE - Election Observer System" />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timezone">Default Timezone</Label>
                  <Input id="timezone" defaultValue="UTC-05:00 Eastern Time" />
                </div>

                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                      <p className="text-xs text-gray-500">Temporarily disable user access</p>
                    </div>
                    <Switch 
                      id="maintenance-mode" 
                      onCheckedChange={handleToggleMaintenance} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="two-factor">Require Two-Factor Auth</Label>
                      <p className="text-xs text-gray-500">For admin accounts</p>
                    </div>
                    <Switch id="two-factor" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-logout">Auto Logout (Inactivity)</Label>
                      <p className="text-xs text-gray-500">After 30 minutes</p>
                    </div>
                    <Switch id="auto-logout" defaultChecked />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant="default"
                  onClick={() => handleSaveSettings("System")}
                >
                  Save System Settings
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5 text-primary" />
                  System Status
                </CardTitle>
                <CardDescription>
                  View system health and statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Database Storage</span>
                      <span className="text-sm text-gray-500">68% used</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: "68%" }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Media Storage</span>
                      <span className="text-sm text-gray-500">42% used</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: "42%" }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">System Memory</span>
                      <span className="text-sm text-gray-500">54% used</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: "54%" }}></div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-2 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">API Requests (24h)</span>
                    <Badge variant="outline">14,382</Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Active Sessions</span>
                    <Badge variant="outline">87</Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">System Uptime</span>
                    <Badge variant="outline">99.8%</Badge>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Last Backup</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      4 hours ago
                    </Badge>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleRunBackup} disabled={isLoading}>
                  {isLoading ? "Processing..." : "Run Backup"}
                </Button>
                <Button variant="default" className="flex-1" onClick={handleViewLogs} disabled={isLoading}>
                  {isLoading ? "Loading..." : "System Logs"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal for displaying content */}
      <AdminModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalTitle}
        content={modalContent}
      />

      <TopNavigation toggleSidebar={toggleSidebar} notifications={userNotifications} />
    </AdminLayout>
  );
}