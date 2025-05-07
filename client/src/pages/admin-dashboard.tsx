import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, UsersRound, FileText, MapPin, Calendar, ShieldCheck, BarChart3, AlertTriangle 
} from "lucide-react";
import { UserManagement } from "@/components/admin/user-management";
import { BackgroundAnimation } from "@/components/three/BackgroundAnimation";
import { ThreeBarChart } from "@/components/three/ThreeBarChart";
import { ElectoralMapViewer } from "@/components/three/ElectoralMapViewer";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { usePerformanceSettings } from "@/components/ui/performance-toggle";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const [performanceSettings] = usePerformanceSettings();

  // Fetch system stats
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ['/api/admin/system-stats'],
  });

  // Dummy data for stations to visualize on the map
  const sampleStations = [
    {
      id: 1,
      name: "Kingston Central #24",
      coordinates: { lat: 18.0179, lng: -76.8099 },
      status: "active",
      issueCount: 0
    },
    {
      id: 2,
      name: "St. Andrew Eastern #16",
      coordinates: { lat: 18.0278, lng: -76.7573 },
      status: "issue",
      issueCount: 3
    },
    {
      id: 3,
      name: "Portmore North #8",
      coordinates: { lat: 17.9721, lng: -76.8630 },
      status: "active",
      issueCount: 1
    }
  ];
  
  // Prepare data for the ThreeBarChart
  const getReportTypeData = () => {
    if (!stats?.reports?.byType) return [];
    
    return Object.entries(stats.reports.byType).map(([type, count]) => ({
      label: type.charAt(0).toUpperCase() + type.slice(1),
      value: count as number,
      color: type === 'incident' ? '#EF4444' : 
             type === 'observation' ? '#10B981' : 
             type === 'process' ? '#3B82F6' : '#8B5CF6'
    }));
  };
  
  const getReportStatusData = () => {
    if (!stats?.reports?.byStatus) return [];
    
    return Object.entries(stats.reports.byStatus).map(([status, count]) => ({
      label: status.charAt(0).toUpperCase() + status.slice(1),
      value: count as number,
      color: status === 'pending' ? '#F59E0B' : 
             status === 'approved' ? '#10B981' : 
             status === 'rejected' ? '#EF4444' : '#8B5CF6'
    }));
  };
  
  const getUserRoleData = () => {
    if (!stats?.users?.byRole) return [];
    
    return Object.entries(stats.users.byRole).map(([role, count]) => ({
      label: role.charAt(0).toUpperCase() + role.slice(1),
      value: count as number,
      color: role === 'admin' ? '#8B5CF6' : 
             role === 'supervisor' ? '#3B82F6' : '#10B981'
    }));
  };
  
  const getStationRiskData = () => {
    if (!stats?.pollingStations?.riskAssessment) return [];
    
    return Object.entries(stats.pollingStations.riskAssessment).map(([risk, count]) => ({
      label: risk
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace('Risk', ' Risk'),
      value: count as number,
      color: risk === 'highRisk' ? '#EF4444' : 
             risk === 'mediumRisk' ? '#F59E0B' : 
             risk === 'lowRisk' ? '#FBBF24' : '#10B981'
    }));
  };

  // For demo stations on the map
  const getStationsWithGeoData = () => {
    // In a real app, this would come from the database with proper coordinates
    return sampleStations;
  };

  return (
    <AdminLayout title="Admin Dashboard">
      {/* Background animation - only show if enabled in performance settings */}
      <BackgroundAnimation 
        color="#4F46E5" 
        enabled={performanceSettings.enable3D && performanceSettings.enableAnimations}
        count={performanceSettings.lowPerformanceMode ? 15 : 25}
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="stations">Polling Stations</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                    <h3 className="text-3xl font-bold mt-1">{stats?.users?.total || '...'}</h3>
                  </div>
                  <div className="bg-primary/10 p-2 rounded-full">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Active observers: {stats?.users?.activeObservers || '...'}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Reports</p>
                    <h3 className="text-3xl font-bold mt-1">{
                      stats?.reports?.byStatus ? 
                      Object.values(stats.reports.byStatus).reduce((a, b) => (a as number) + (b as number), 0) : 
                      '...'
                    }</h3>
                  </div>
                  <div className="bg-blue-100 p-2 rounded-full">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Pending review: {stats?.reports?.pending || '...'}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Polling Stations</p>
                    <h3 className="text-3xl font-bold mt-1">{stats?.pollingStations?.total || '...'}</h3>
                  </div>
                  <div className="bg-green-100 p-2 rounded-full">
                    <MapPin className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  With issues: {
                    stats?.pollingStations?.riskAssessment ? 
                    stats.pollingStations.total - (stats.pollingStations.riskAssessment.noRisk as number) : 
                    '...'
                  }
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Assignments</p>
                    <h3 className="text-3xl font-bold mt-1">{stats?.assignments?.active || '...'}</h3>
                  </div>
                  <div className="bg-amber-100 p-2 rounded-full">
                    <Calendar className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Observers currently deployed</p>
              </CardContent>
            </Card>
          </div>
          
          {/* 3D Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Observer Distribution</CardTitle>
                <CardDescription>Number of users by role</CardDescription>
              </CardHeader>
              <CardContent>
                <ThreeBarChart 
                  data={getUserRoleData()}
                  height={250}
                  width={450}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Reports by Type</CardTitle>
                <CardDescription>Distribution of submitted reports</CardDescription>
              </CardHeader>
              <CardContent>
                <ThreeBarChart 
                  data={getReportTypeData()}
                  height={250}
                  width={450}
                />
              </CardContent>
            </Card>
          </div>
          
          {/* Map View */}
          <Card>
            <CardHeader>
              <CardTitle>Polling Station Map</CardTitle>
              <CardDescription>Geographic distribution of polling stations and active incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <ElectoralMapViewer 
                stationData={getStationsWithGeoData()}
                height={400}
                width={900}
              />
            </CardContent>
          </Card>
          
          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Current system performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500">Database Usage</p>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full" 
                      style={{ width: `${stats?.system?.databaseUsage || 0}%` }} 
                    />
                  </div>
                  <p className="text-xs text-right">{stats?.system?.databaseUsage || 0}%</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500">Media Storage</p>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-600 rounded-full" 
                      style={{ width: `${stats?.system?.mediaStorageUsage || 0}%` }} 
                    />
                  </div>
                  <p className="text-xs text-right">{stats?.system?.mediaStorageUsage || 0}%</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500">Memory Usage</p>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-600 rounded-full" 
                      style={{ width: `${stats?.system?.systemMemoryUsage || 0}%` }} 
                    />
                  </div>
                  <p className="text-xs text-right">{stats?.system?.systemMemoryUsage || 0}%</p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500">System Uptime</p>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-600 rounded-full" 
                      style={{ width: `${stats?.system?.systemUptime || 0}%` }} 
                    />
                  </div>
                  <p className="text-xs text-right">{stats?.system?.systemUptime || 0}%</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <UsersRound className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Active Sessions</p>
                    <p className="text-xl font-bold">{stats?.system?.activeSessions || 0}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="bg-green-100 p-2 rounded-full">
                    <BarChart3 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">API Requests (24h)</p>
                    <p className="text-xl font-bold">{stats?.system?.apiRequestsLast24h?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Reports Management</CardTitle>
              <CardDescription>Manage and review observer reports</CardDescription>
            </CardHeader>
            <CardContent>
              <ThreeBarChart 
                data={getReportStatusData()}
                height={300}
                width={800}
                title="Reports by Status"
              />
              <p className="text-center mt-4 text-gray-500">Select a tab to manage reports by status</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="stations">
          <Card>
            <CardHeader>
              <CardTitle>Polling Stations Management</CardTitle>
              <CardDescription>Manage polling stations and view risk assessments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ThreeBarChart 
                  data={getStationRiskData()}
                  height={300}
                  width={450}
                  title="Stations by Risk Level"
                />
                
                <div className="flex items-center justify-center">
                  <ElectoralMapViewer 
                    stationData={getStationsWithGeoData()}
                    height={300}
                    width={450}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}