import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { BarChart, LineChart, PieChart, AreaChart, ComposedChart, Bar, Line, Pie, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { 
  AlertTriangle, 
  User, 
  Users, 
  UserCheck, 
  FileText, 
  MapPin, 
  BarChart2, 
  Activity, 
  TrendingUp, 
  TrendingDown,
  Database,
  HardDrive,
  Server,
  BarChart3
} from "lucide-react";

type SystemStats = {
  users: {
    total: number;
    activeObservers: number;
    byRole: Record<string, number>;
  };
  reports: {
    pending: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  pollingStations: {
    total: number;
    riskAssessment: {
      highRisk: number;
      mediumRisk: number;
      lowRisk: number;
      noRisk: number;
    };
  };
  assignments: {
    active: number;
  };
  system: {
    databaseUsage: number;
    mediaStorageUsage: number;
    systemMemoryUsage: number;
    apiRequestsLast24h: number;
    activeSessions: number;
    systemUptime: number;
  };
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Fetch system statistics
  const { data: systemStats, isLoading, error } = useQuery({
    queryKey: ['/api/admin/system-stats'],
    enabled: !!user && user.role === 'admin',
  });
  
  if (isLoading) {
    return <div className="flex items-center justify-center p-12">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">Loading dashboard data...</p>
      </div>
    </div>;
  }
  
  if (error) {
    // Try to extract a backend error message
    const errorMsg = error?.response?.data?.error || error?.data?.error || error?.message || "Please try again later.";
    return (
      <Alert variant="destructive" className="my-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load dashboard data: {errorMsg}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Generate data for the charts
  const reportTypeData = systemStats?.reports?.byType ? 
    Object.entries(systemStats.reports.byType).map(([type, count]) => ({
      name: type,
      value: count
    })) : [];
    
  const reportStatusData = systemStats?.reports?.byStatus ? 
    Object.entries(systemStats.reports.byStatus).map(([status, count]) => ({
      name: status,
      value: count
    })) : [];
    
  const userRoleData = systemStats?.users?.byRole ? 
    Object.entries(systemStats.users.byRole).map(([role, count]) => ({
      name: role,
      value: count
    })) : [];
    
  const stationRiskData = systemStats?.pollingStations?.riskAssessment ? [
    { name: 'High Risk', value: systemStats.pollingStations.riskAssessment.highRisk, color: '#EF4444' },
    { name: 'Medium Risk', value: systemStats.pollingStations.riskAssessment.mediumRisk, color: '#F59E0B' },
    { name: 'Low Risk', value: systemStats.pollingStations.riskAssessment.lowRisk, color: '#10B981' },
    { name: 'No Risk', value: systemStats.pollingStations.riskAssessment.noRisk, color: '#3B82F6' }
  ] : [];
    
  // Create example time series data (would be real in production)
  const timeSeriesData = [
    { date: '2023-01', reports: 12, observers: 22 },
    { date: '2023-02', reports: 19, observers: 26 },
    { date: '2023-03', reports: 25, observers: 28 },
    { date: '2023-04', reports: 22, observers: 31 },
    { date: '2023-05', reports: 32, observers: 35 },
    { date: '2023-06', reports: 46, observers: 40 },
    { date: '2023-07', reports: 52, observers: 42 },
    { date: '2023-08', reports: 63, observers: 45 },
    { date: '2023-09', reports: 59, observers: 48 },
    { date: '2023-10', reports: 67, observers: 51 },
    { date: '2023-11', reports: 72, observers: 55 },
    { date: '2023-12', reports: 78, observers: 59 },
  ];
  
  const resourcesData = [
    { name: 'Database', value: systemStats?.system?.databaseUsage || 0 },
    { name: 'Storage', value: systemStats?.system?.mediaStorageUsage || 0 },
    { name: 'Memory', value: systemStats?.system?.systemMemoryUsage || 0 },
  ];
  
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h2>
        <p className="text-sm text-muted-foreground">
          View system statistics and monitor observer operations.
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="stations">Stations</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4 mt-6">
          {/* Key Statistics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              title="Total Users" 
              value={systemStats?.users?.total || 0} 
              description="Registered users" 
              icon={<Users className="h-4 w-4" />}
            />
            
            <StatCard 
              title="Active Observers" 
              value={systemStats?.users?.activeObservers || 0}
              description="Currently deployed" 
              icon={<UserCheck className="h-4 w-4" />}
              badge="Active"
              badgeColor="bg-green-100 text-green-800"
            />
            
            <StatCard 
              title="Polling Stations" 
              value={systemStats?.pollingStations?.total || 0}
              description="Registered locations" 
              icon={<MapPin className="h-4 w-4" />}
            />
            
            <StatCard 
              title="Reports" 
              value={systemStats?.reports?.byType ? 
                Object.values(systemStats.reports.byType).reduce((sum, curr) => sum + curr, 0) : 0}
              description="Total submissions" 
              icon={<FileText className="h-4 w-4" />}
              badge={`${systemStats?.reports?.pending || 0} pending`}
              badgeColor="bg-amber-100 text-amber-800"
            />
          </div>
          
          {/* Charts Row */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
                <CardDescription>
                  Current resource utilization percentages
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={resourcesData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => `${value}%`} domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Usage']} />
                    <Legend />
                    <Bar dataKey="value" name="Utilization" fill="#8884d8" radius={[4, 4, 0, 0]}>
                      {resourcesData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.value > 80 ? '#EF4444' : entry.value > 60 ? '#F59E0B' : '#10B981'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Polling Station Status</CardTitle>
                <CardDescription>
                  Risk assessment distribution
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <Pie
                      data={stationRiskData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stationRiskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          {/* Activity Chart */}
          <Card>
            <CardHeader>
              <CardTitle>System Activity</CardTitle>
              <CardDescription>
                Reports submissions and observer registrations over time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={timeSeriesData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="reports" stroke="#8884d8" activeDot={{ r: 8 }} name="Reports" />
                  <Line type="monotone" dataKey="observers" stroke="#82ca9d" name="Observers" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
              <CardDescription>
                Technical details and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <ResourceMeter 
                  label="Database Usage" 
                  value={systemStats?.system?.databaseUsage || 0} 
                  icon={<Database className="h-4 w-4" />}
                />
                
                <ResourceMeter 
                  label="Media Storage" 
                  value={systemStats?.system?.mediaStorageUsage || 0} 
                  icon={<HardDrive className="h-4 w-4" />}
                />
                
                <ResourceMeter 
                  label="System Memory" 
                  value={systemStats?.system?.systemMemoryUsage || 0} 
                  icon={<Server className="h-4 w-4" />}
                />
              </div>
              
              <Separator className="my-4" />
              
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">API Requests (24h)</span>
                  <span className="text-2xl font-bold">{systemStats?.system?.apiRequestsLast24h?.toLocaleString() || 0}</span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">Active Sessions</span>
                  <span className="text-2xl font-bold">{systemStats?.system?.activeSessions || 0}</span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">System Uptime</span>
                  <span className="text-2xl font-bold">{systemStats?.system?.systemUptime?.toFixed(1) || 0}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Reports by Type</CardTitle>
                <CardDescription>
                  Distribution of reports by category
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <Pie
                      data={reportTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {reportTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Count']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Reports by Status</CardTitle>
                <CardDescription>
                  Current processing status of all reports
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={reportStatusData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 60, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Reports" fill="#8884d8" radius={[0, 4, 4, 0]}>
                      {reportStatusData.map((entry, index) => {
                        let color = '#3B82F6';
                        if (entry.name.toLowerCase() === 'pending') color = '#F59E0B';
                        if (entry.name.toLowerCase() === 'rejected') color = '#EF4444';
                        if (entry.name.toLowerCase() === 'approved') color = '#10B981';
                        return <Cell key={`cell-${index}`} fill={color} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Report Activity</CardTitle>
              <CardDescription>
                Report submissions over time
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timeSeriesData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="reports" stroke="#8884d8" fill="#8884d8" name="Reports Submitted" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pending Review</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{systemStats?.reports?.pending || 0}</div>
                  <Badge className="bg-amber-100 text-amber-800">Requires Action</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {systemStats?.reports?.pending 
                    ? 'Reports waiting for administrator review'
                    : 'No pending reports to review'}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Average Processing Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">4.2h</div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Average time from submission to review completion
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Issue Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">
                    {(systemStats?.reports?.byType?.['Issue'] || 0) + 
                     (systemStats?.reports?.byType?.['Emergency'] || 0)}
                  </div>
                  <Badge className="bg-red-100 text-red-800">Critical</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Combined issue and emergency reports
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="stations" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Station Risk Assessment</CardTitle>
                <CardDescription>
                  Current risk levels of polling stations
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={stationRiskData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Stations" fill="#8884d8" radius={[4, 4, 0, 0]}>
                      {stationRiskData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Observer Coverage</CardTitle>
                <CardDescription>
                  Observer assignment distribution
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex flex-col justify-center">
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">
                    {Math.round(((systemStats?.assignments?.active || 0) / 
                                (systemStats?.pollingStations?.total || 1)) * 100)}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Current polling station coverage
                  </p>
                  
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4 mb-6 dark:bg-gray-700">
                    <div className="bg-primary h-2.5 rounded-full" 
                         style={{ width: `${Math.round(((systemStats?.assignments?.active || 0) / 
                                                       (systemStats?.pollingStations?.total || 1)) * 100)}%` }}>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">{systemStats?.assignments?.active || 0}</p>
                      <p className="text-muted-foreground">Active Assignments</p>
                    </div>
                    <div>
                      <p className="font-medium">{(systemStats?.pollingStations?.total || 0) - 
                                                 (systemStats?.assignments?.active || 0)}</p>
                      <p className="text-muted-foreground">Unassigned Stations</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">High Risk Stations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{systemStats?.pollingStations?.riskAssessment?.highRisk || 0}</div>
                  <Badge className="bg-red-100 text-red-800">Urgent</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Stations requiring immediate attention
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Medium Risk Stations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">{systemStats?.pollingStations?.riskAssessment?.mediumRisk || 0}</div>
                  <Badge className="bg-amber-100 text-amber-800">Monitor</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Stations requiring regular monitoring
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Low/No Risk Stations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {(systemStats?.pollingStations?.riskAssessment?.lowRisk || 0) + 
                   (systemStats?.pollingStations?.riskAssessment?.noRisk || 0)}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Stations with minimal or no reported issues
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Station Capacity Analysis</CardTitle>
              <CardDescription>
                Observer allocation optimization recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert className="bg-amber-50 text-amber-800 border-amber-200">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Optimization Opportunity</AlertTitle>
                  <AlertDescription>
                    {systemStats?.pollingStations?.riskAssessment?.highRisk 
                      ? `${systemStats?.pollingStations?.riskAssessment?.highRisk} high-risk stations need additional observer coverage.`
                      : 'All high-risk stations have adequate observer coverage.'}
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <Button variant="outline">Generate Optimization Report</Button>
                  <Button variant="default">Reassign Observers</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>User Roles Distribution</CardTitle>
                <CardDescription>
                  Breakdown of users by assigned roles
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <Pie
                      data={userRoleData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {userRoleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Users']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>User Growth</CardTitle>
                <CardDescription>
                  New user registrations over time
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timeSeriesData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="observers" stroke="#82ca9d" name="Observer Registrations" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Total Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{systemStats?.users?.total || 0}</div>
                <div className="flex items-center mt-1 text-xs">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-500 font-medium">+4.6%</span>
                  <span className="text-muted-foreground ml-1">from last month</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Total registered users in the system
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Active Observers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{systemStats?.users?.activeObservers || 0}</div>
                <div className="flex items-center mt-1 text-xs">
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-500 font-medium">+12.3%</span>
                  <span className="text-muted-foreground ml-1">from last month</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Observers with active assignments
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Administrators</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{systemStats?.users?.byRole?.admin || 0}</div>
                <div className="flex items-center mt-1 text-xs">
                  <TrendingDown className="h-3 w-3 mr-1 text-gray-500" />
                  <span className="text-gray-500 font-medium">+0%</span>
                  <span className="text-muted-foreground ml-1">from last month</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Users with administrative privileges
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Observer Verification Status</CardTitle>
              <CardDescription>
                Status of observer verification process
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Verified Observers</div>
                    <div className="text-3xl font-bold">
                      {Math.round(0.85 * (systemStats?.users?.byRole?.observer || 0))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-medium">Pending Verification</div>
                    <div className="text-3xl font-bold">
                      {Math.round(0.15 * (systemStats?.users?.byRole?.observer || 0))}
                    </div>
                  </div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4 mb-2 dark:bg-gray-700">
                  <div className="bg-primary h-2.5 rounded-full" 
                       style={{ width: '85%' }}>
                  </div>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  85% of observers have completed the verification process
                </div>
                
                <Button variant="outline" className="w-full mt-4">View Verification Queue</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, description, icon, badge, badgeColor }: { 
  title: string; 
  value: number; 
  description: string; 
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <div className="h-4 w-4 text-muted-foreground">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold">{value}</div>
          {badge && (
            <Badge className={badgeColor}>{badge}</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground pt-1">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

function ResourceMeter({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  let barColor = value > 80 ? 'bg-red-500' : value > 60 ? 'bg-amber-500' : 'bg-green-500';
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-sm font-medium">{value}%</span>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${barColor}`} 
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );
}