import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ModernCard } from "@/components/ui/modern-card";
import AdminDashboard from "@/components/admin/admin-dashboard";
import { 
  Users, Settings, Lock, Database, AlertTriangle, BarChart, 
  FileText, CalendarClock, MapPin, Bell, Mail, Shield, Server
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ModernCard } from "@/components/ui/modern-card";
import AdminDashboard from "@/components/admin/admin-dashboard";
import { 
  Users, Settings, Lock, Database, AlertTriangle, BarChart, 
  FileText, CalendarClock, MapPin, Bell, Mail, Shield, Server
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function AdminPage() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  // Fetch system statistics
  const { data: systemStats = {
    users: { total: 0, byRole: {} },
    reports: { total: 0, byStatus: {}, byType: {} },
    pollingStations: { total: 0, active: 0 },
    assignments: { total: 0, active: 0 },
    system: { version: '', uptime: 0, database: { status: '', size: 0 } }
  }, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/system-stats'],
    enabled: !!user && user.role === 'admin',
  });

  // Fetch user data
  const { data: usersData = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    enabled: !!user && user.role === 'admin',
  });

  // State for managing modal dialogs
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<string>('');
  const [modalTitle, setModalTitle] = useState<string>('');

  // Function to handle various admin actions
  const handleAction = (action: string) => {
    // Implementation for different actions will go here
    toast({
      title: "Action Processed",
      description: `The ${action} action has been processed`,
      variant: "default",
    });
  };

  return (
    <PageWrapper 
      title="Admin Control Panel"
      subtitle="Manage users, polling stations, system settings, and monitor platform activity."
      actions={
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="status-badge-primary">
            System Online
          </Badge>
        </div>
      }
    >
      <div className="w-full">
        <div className="flex overflow-x-auto mb-8 space-x-2 pb-2">
          <Button 
            variant={activeTab === "dashboard" ? "default" : "outline"}
            onClick={() => setActiveTab("dashboard")}
            className="btn-modern flex items-center whitespace-nowrap"
          >
            <BarChart className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button 
            variant={activeTab === "users" ? "default" : "outline"}
            onClick={() => setActiveTab("users")}
            className="btn-modern flex items-center whitespace-nowrap"
          >
            <Users className="mr-2 h-4 w-4" />
            User Management
          </Button>
          <Button 
            variant={activeTab === "stations" ? "default" : "outline"}
            onClick={() => setActiveTab("stations")}
            className="btn-modern flex items-center whitespace-nowrap"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Polling Stations
          </Button>
          <Button 
            variant={activeTab === "forms" ? "default" : "outline"}
            onClick={() => setActiveTab("forms")}
            className="btn-modern flex items-center whitespace-nowrap"
          >
            <FileText className="mr-2 h-4 w-4" />
            Form Templates
          </Button>
          <Button 
            variant={activeTab === "settings" ? "default" : "outline"}
            onClick={() => setActiveTab("settings")}
            className="btn-modern flex items-center whitespace-nowrap"
          >
            <Settings className="mr-2 h-4 w-4" />
            System Settings
          </Button>
        </div>
        
        {activeTab === "dashboard" && (
          <div className="mt-6">
            <AdminDashboard />
          </div>
        )}
        
        {activeTab === "users" && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <ModernCard variant="elevated" padding="lg">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">User Management</h3>
                    <p className="text-muted-foreground">Manage all registered users in the system</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Total Users:</span>
                      <Badge className="status-badge-primary">{systemStats?.users?.total || "-"}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>New This Week:</span>
                      <Badge className="status-badge-info">18</Badge>
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleAction('manage-users')} 
                    disabled={isActionLoading}
                    className="btn-gradient w-full"
                  >
                    {isActionLoading ? "Loading..." : "Manage Users"}
                  </Button>
                </div>
              </ModernCard>
              
              <Card>
                <CardHeader>
                  <CardTitle>Verification Requests</CardTitle>
                  <CardDescription>Process pending verification requests</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p>Pending Verifications: <Badge variant="destructive">18</Badge></p>
                  <p>Completed Today: <Badge variant="secondary">7</Badge></p>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => handleAction('process-verifications')} disabled={isActionLoading}>
                    {isActionLoading ? "Loading..." : "Process Verifications"}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Role Management</CardTitle>
                  <CardDescription>Manage user roles and permissions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p>Total Roles: <Badge>{systemStats?.users?.byRole ? Object.keys(systemStats.users.byRole).length : "-"}</Badge></p>
                  <p>Custom Roles: <Badge variant="secondary">1</Badge></p>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => handleAction('edit-roles')} disabled={isActionLoading}>
                    {isActionLoading ? "Loading..." : "Edit Roles"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
        
        {activeTab === "stations" && (
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Station Management</CardTitle>
                  <CardDescription>Manage polling stations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p>Total Stations: <Badge>{systemStats?.pollingStations?.total || "-"}</Badge></p>
                  <p>Active Stations: <Badge variant="secondary">
                    {systemStats?.pollingStations?.total - 
                     (systemStats?.pollingStations?.riskAssessment?.highRisk || 0) || "-"}
                  </Badge></p>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => handleAction('manage-stations')} disabled={isActionLoading}>
                    {isActionLoading ? "Loading..." : "Manage Stations"}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Assignment Management</CardTitle>
                  <CardDescription>Assign observers to polling stations</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p>Active Assignments: <Badge>{systemStats?.assignments?.active || "-"}</Badge></p>
                  <p>Unassigned Observers: <Badge variant="secondary">
                    {statsLoading ? "-" : 
                     ((systemStats?.users?.byRole?.observer || 0) - (systemStats?.assignments?.active || 0))}
                  </Badge></p>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => handleAction('manage-assignments')} disabled={isActionLoading}>
                    {isActionLoading ? "Loading..." : "Manage Assignments"}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Risk Assessment</CardTitle>
                  <CardDescription>View stations with reported issues</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p>High Risk Stations: <Badge variant="destructive">
                    {systemStats?.pollingStations?.riskAssessment?.highRisk || "-"}
                  </Badge></p>
                  <p>Medium Risk Stations: <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                    {systemStats?.pollingStations?.riskAssessment?.mediumRisk || "-"}
                  </Badge></p>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => handleAction('view-risk-assessment')} disabled={isActionLoading}>
                    {isActionLoading ? "Loading..." : "View Risk Map"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
        
        {activeTab === "forms" && (
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Form Templates</CardTitle>
                  <CardDescription>Manage report form templates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p>Active Templates: <Badge>8</Badge></p>
                  <p>Draft Templates: <Badge variant="secondary">3</Badge></p>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => handleAction('manage-templates')} disabled={isActionLoading}>
                    {isActionLoading ? "Loading..." : "Manage Templates"}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Report Management</CardTitle>
                  <CardDescription>Manage submitted reports</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p>Total Reports: <Badge>{
                    systemStats?.reports?.byType ? 
                    Object.values(systemStats.reports.byType).reduce((a: number, b: number) => a + b, 0) : 
                    "-"
                  }</Badge></p>
                  <p>Pending Review: <Badge variant="destructive">{systemStats?.reports?.pending || "-"}</Badge></p>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => handleAction('manage-reports')} disabled={isActionLoading}>
                    {isActionLoading ? "Loading..." : "Manage Reports"}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Data Export</CardTitle>
                  <CardDescription>Export report data for analysis</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p>Available Formats: <Badge>CSV, JSON, PDF</Badge></p>
                  <p>Last Export: <Badge variant="secondary">Today, 10:25 AM</Badge></p>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => handleAction('export-data')} disabled={isActionLoading}>
                    {isActionLoading ? "Loading..." : "Export Data"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
        
        {activeTab === "settings" && (
          <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>Configure global system settings</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                      <p className="text-sm text-muted-foreground">Take the site offline for maintenance</p>
                    </div>
                    <Switch id="maintenance-mode" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="user-registration">Allow New Registrations</Label>
                      <p className="text-sm text-muted-foreground">Enable or disable new user signups</p>
                    </div>
                    <Switch id="user-registration" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="two-factor">Require Two-Factor Auth</Label>
                      <p className="text-sm text-muted-foreground">Require 2FA for administrative users</p>
                    </div>
                    <Switch id="two-factor" defaultChecked />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => handleAction('save-system-settings')} disabled={isActionLoading}>
                    {isActionLoading ? "Saving..." : "Save Settings"}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>Configure system notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">Send email alerts for important events</p>
                    </div>
                    <Switch id="email-notifications" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sms-notifications">SMS Notifications</Label>
                      <p className="text-sm text-muted-foreground">Send SMS alerts for critical events</p>
                    </div>
                    <Switch id="sms-notifications" />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="in-app-notifications">In-App Notifications</Label>
                      <p className="text-sm text-muted-foreground">Show notification popups in the app</p>
                    </div>
                    <Switch id="in-app-notifications" defaultChecked />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={() => handleAction('save-notification-settings')} disabled={isActionLoading}>
                    {isActionLoading ? "Saving..." : "Save Settings"}
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>View system resource metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Database Usage</span>
                      <Badge variant="outline">{systemStats?.system?.database?.size || "0"} MB</Badge>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full" 
                        style={{ width: `${Math.min((systemStats?.system?.database?.size || 0) / 10, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Server Uptime</span>
                      <Badge variant="outline">
                        {Math.floor((systemStats?.system?.uptime || 0) / 86400)}d {Math.floor(((systemStats?.system?.uptime || 0) % 86400) / 3600)}h
                      </Badge>
                    </div>
                    <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-green-500 h-full" 
                        style={{ width: `${Math.min((systemStats?.system?.uptime || 0) / 864, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">System Status</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                        {systemStats?.system?.status || "Operational"}
                      </Badge>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="pt-2">
                    <p className="text-xs text-muted-foreground">
                      System Version: {systemStats?.system?.version || "1.0.0"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Last Updated: {systemStats?.system?.lastUpdated || "Today, 08:45 AM"}
                    </p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    onClick={() => handleAction('view-system-logs')} 
                    disabled={isActionLoading}
                  >
                    View System Logs
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal for various actions */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{modalTitle}</DialogTitle>
            <DialogDescription>
              {modalContent}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}