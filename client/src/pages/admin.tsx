import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Users, Settings, Lock, Database, AlertTriangle, BarChart, 
  FileText, CalendarClock, MapPin, Bell, Mail, Shield, Server
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Admin() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Mock queries for various admin data
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: !!user && user.role === 'admin',
  });

  const { data: systemStats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/system-stats'],
    enabled: !!user && user.role === 'admin',
  });

  // Handler for saving settings
  const handleSaveSettings = (section: string) => {
    toast({
      title: "Settings Updated",
      description: `${section} settings have been saved successfully.`,
      variant: "default",
    });
  };

  // Handler for toggling maintenance mode
  const handleToggleMaintenance = () => {
    toast({
      title: "Maintenance Mode Toggled",
      description: "System maintenance mode has been updated.",
      variant: "default",
    });
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
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
                  <Badge variant="secondary">{usersLoading ? "..." : "234"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Pending Verification</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {usersLoading ? "..." : "12"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Admin Users</span>
                  <Badge>{usersLoading ? "..." : "8"}</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="default">Manage Users</Button>
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
                  <Badge variant="secondary">{usersLoading ? "..." : "18"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">ID Verifications</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {usersLoading ? "..." : "7"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Rejected</span>
                  <Badge variant="destructive">{usersLoading ? "..." : "3"}</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="default">Process Verifications</Button>
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
                  <Input id="notification-title" placeholder="Enter notification title" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notification-message">Message</Label>
                  <Input id="notification-message" placeholder="Enter message" />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="urgent" />
                  <Label htmlFor="urgent">Mark as urgent</Label>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="default">Send Notification</Button>
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
                <Button className="w-full" variant="default">Edit Roles</Button>
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
                  <Badge variant="secondary">{statsLoading ? "..." : "124"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Active Stations</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {statsLoading ? "..." : "118"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Observer Coverage</span>
                  <Badge>{statsLoading ? "..." : "82%"}</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="default">Manage Stations</Button>
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
                  <Badge variant="secondary">{statsLoading ? "..." : "211"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Unassigned Stations</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {statsLoading ? "..." : "22"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Scheduling Conflicts</span>
                  <Badge variant="destructive">{statsLoading ? "..." : "5"}</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="default">Manage Assignments</Button>
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
                  <Badge variant="destructive">{statsLoading ? "..." : "14"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Medium Risk</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {statsLoading ? "..." : "32"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Low Risk</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {statsLoading ? "..." : "78"}
                  </Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="default">View Analytics</Button>
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
                  <Badge variant="secondary">{statsLoading ? "..." : "342"}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Pending Review</span>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    {statsLoading ? "..." : "18"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Flagged Issues</span>
                  <Badge variant="destructive">{statsLoading ? "..." : "7"}</Badge>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="default">Review Reports</Button>
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
                <Button className="w-full" variant="default">View Analytics</Button>
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
                <Button className="w-full" variant="default">Manage Events</Button>
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
                <Button className="w-full" variant="default">Send Event Notification</Button>
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
                <Button className="w-full" variant="default">Manage Training</Button>
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
                <Button variant="outline" className="flex-1">Run Backup</Button>
                <Button variant="default" className="flex-1">System Logs</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}