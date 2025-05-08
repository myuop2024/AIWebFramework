import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import {
  Calendar,
  Clock,
  Download,
  ExternalLink,
  Filter,
  MapPin,
  BarChart2,
  PieChart as PieChartIcon,
  Users,
  AreaChart as AreaChartIcon,
  Flag,
  CheckCircle,
  AlertTriangle,
  HelpCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define types for the analytics data
interface AnalyticsSummary {
  userCount: number;
  activeObservers: number;
  completedAssignments: number;
  pendingAssignments: number;
  reportCount: number;
  stationsWithIssues: number;
  criticalIssues: number;
  resolvedIssuesRate: number;
}

interface UserStats {
  role: string;
  count: number;
  color: string;
}

interface ReportTypeStats {
  type: string;
  count: number;
  color: string;
}

interface ReportStatusStats {
  status: string;
  count: number;
  color: string;
}

interface StationIssue {
  id: number;
  name: string;
  issueCount: number;
  criticalCount: number;
  lastReportedTime: string;
}

interface DailyActivity {
  date: string;
  newUsers: number;
  newReports: number;
  activeObservers: number;
}

// Color schemes
const ROLE_COLORS = {
  admin: "#4F46E5",
  supervisor: "#8B5CF6",
  observer: "#10B981",
  coordinator: "#EC4899",
  staff: "#F59E0B",
  guest: "#6B7280",
};

const STATUS_COLORS = {
  submitted: "#F59E0B",
  in_progress: "#3B82F6",
  resolved: "#10B981",
  flagged: "#EF4444",
  closed: "#6B7280",
};

const TYPE_COLORS = {
  incident: "#EF4444",
  observation: "#3B82F6",
  process: "#10B981",
  security: "#F59E0B",
  infrastructure: "#8B5CF6",
  other: "#6B7280",
};

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("7d");
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");

  // Query for analytics summary data
  const { data: summary, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/admin/analytics/summary", { timeRange, key: refreshKey }],
  });

  // Query for user statistics
  const { data: userStats, isLoading: userStatsLoading } = useQuery<UserStats[]>({
    queryKey: ["/api/admin/analytics/users", { timeRange, key: refreshKey }],
  });

  // Query for report type statistics
  const { data: reportTypeStats, isLoading: reportTypeLoading } = useQuery<
    ReportTypeStats[]
  >({
    queryKey: ["/api/admin/analytics/reports/types", { timeRange, key: refreshKey }],
  });

  // Query for report status statistics
  const { data: reportStatusStats, isLoading: reportStatusLoading } = useQuery<
    ReportStatusStats[]
  >({
    queryKey: [
      "/api/admin/analytics/reports/status",
      { timeRange, key: refreshKey },
    ],
  });

  // Query for stations with issues
  const { data: stationIssues, isLoading: stationIssuesLoading } = useQuery<
    StationIssue[]
  >({
    queryKey: [
      "/api/admin/analytics/stations/issues",
      { timeRange, key: refreshKey },
    ],
  });

  // Query for daily activity data
  const { data: dailyActivity, isLoading: dailyActivityLoading } = useQuery<
    DailyActivity[]
  >({
    queryKey: [
      "/api/admin/analytics/daily-activity",
      { timeRange, key: refreshKey },
    ],
  });

  // Process user stats data for pie chart
  const userStatsData = useMemo(() => {
    if (!userStats) return [];
    
    return userStats.map((stat) => ({
      name: stat.role.charAt(0).toUpperCase() + stat.role.slice(1),
      value: stat.count,
      color: stat.color || ROLE_COLORS[stat.role as keyof typeof ROLE_COLORS] || "#6B7280",
    }));
  }, [userStats]);

  // Process report type stats data for pie chart
  const reportTypeData = useMemo(() => {
    if (!reportTypeStats) return [];
    
    return reportTypeStats.map((stat) => ({
      name: stat.type.charAt(0).toUpperCase() + stat.type.slice(1),
      value: stat.count,
      color: stat.color || TYPE_COLORS[stat.type as keyof typeof TYPE_COLORS] || "#6B7280",
    }));
  }, [reportTypeStats]);

  // Process report status stats data for pie chart
  const reportStatusData = useMemo(() => {
    if (!reportStatusStats) return [];
    
    return reportStatusStats.map((stat) => ({
      name: stat.status.charAt(0).toUpperCase() + stat.status.slice(1).replace('_', ' '),
      value: stat.count,
      color: stat.color || STATUS_COLORS[stat.status as keyof typeof STATUS_COLORS] || "#6B7280",
    }));
  }, [reportStatusStats]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handle refresh of all data
  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Handle export analytics data
  const handleExport = () => {
    // Implementation for exporting analytics data
    window.alert("Export functionality will be implemented");
  };

  // Get loading status for the entire dashboard
  const isLoading =
    summaryLoading ||
    userStatsLoading ||
    reportTypeLoading ||
    reportStatusLoading ||
    stationIssuesLoading ||
    dailyActivityLoading;

  // If loading, show skeleton UI
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-32" />
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Skeleton className="h-64 rounded-md" />
              <Skeleton className="h-64 rounded-md" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-80 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with title and action buttons */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of election observation activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleRefresh} title="Refresh data">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleExport} title="Export data">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Users
                </p>
                <h3 className="text-3xl font-bold mt-1">{summary?.userCount || 0}</h3>
              </div>
              <div className="bg-primary/10 p-2 rounded-full">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <Progress 
              value={100} 
              className="h-1 mt-4 [&>div]:bg-primary"
            />
            <div className="mt-2 text-xs text-muted-foreground flex items-center">
              <span className="font-medium">
                {userStatsData.find(stat => stat.name === 'Observer')?.value || 0}
              </span>
              <span className="mx-1">active observers</span>
            </div>
          </CardContent>
        </Card>

        {/* Active Assignments Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Assignments
                </p>
                <h3 className="text-3xl font-bold mt-1">
                  {(summary?.completedAssignments || 0) + (summary?.pendingAssignments || 0)}
                </h3>
              </div>
              <div className="bg-blue-100 p-2 rounded-full">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <Progress 
              value={summary?.completedAssignments ? 
                (summary.completedAssignments / 
                  (summary.completedAssignments + summary.pendingAssignments)) * 100 : 0} 
              className="h-1 mt-4 [&>div]:bg-blue-600"
            />
            <div className="mt-2 text-xs text-muted-foreground flex items-center">
              <Badge 
                variant="outline" 
                className="text-xs font-normal mr-2 bg-green-50 text-green-700 border-green-200"
              >
                {summary?.completedAssignments || 0} completed
              </Badge>
              <Badge 
                variant="outline" 
                className="text-xs font-normal bg-amber-50 text-amber-700 border-amber-200"
              >
                {summary?.pendingAssignments || 0} pending
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Reports Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Reports Submitted
                </p>
                <h3 className="text-3xl font-bold mt-1">{summary?.reportCount || 0}</h3>
              </div>
              <div className="bg-amber-100 p-2 rounded-full">
                <Flag className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <Progress 
              value={summary?.resolvedIssuesRate || 0} 
              className="h-1 mt-4 [&>div]:bg-amber-600"
            />
            <div className="mt-2 text-xs text-muted-foreground flex items-center">
              <Badge 
                variant="outline" 
                className="text-xs font-normal mr-2 bg-red-50 text-red-700 border-red-200"
              >
                {summary?.criticalIssues || 0} critical
              </Badge>
              <span className="ml-1">
                {summary?.resolvedIssuesRate || 0}% resolution rate
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Stations with Issues Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Stations with Issues
                </p>
                <h3 className="text-3xl font-bold mt-1">{summary?.stationsWithIssues || 0}</h3>
              </div>
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <Progress 
              value={70} 
              className="h-1 mt-4 [&>div]:bg-red-600"
            />
            <div className="mt-2 text-xs text-muted-foreground">
              {stationIssues && stationIssues.length > 0 ? (
                <span>Highest issue count: <span className="font-medium">{stationIssues[0]?.name}</span> ({stationIssues[0]?.issueCount})</span>
              ) : (
                <span>No station issues reported</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different analytics views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview">
            <BarChart2 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="reports">
            <Flag className="h-4 w-4 mr-2" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="stations">
            <MapPin className="h-4 w-4 mr-2" />
            Stations
          </TabsTrigger>
          <TabsTrigger value="trends">
            <AreaChartIcon className="h-4 w-4 mr-2" />
            Trends
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* User Distribution and Report Types */}
          <Card>
            <CardHeader>
              <CardTitle>User Distribution & Report Types</CardTitle>
              <CardDescription>
                Breakdown of users by role and reports by type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* User Distribution */}
                <div>
                  <h3 className="text-sm font-medium mb-4 text-center">User Distribution by Role</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={userStatsData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {userStatsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`${value} users`, 'Count']}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Report Types */}
                <div>
                  <h3 className="text-sm font-medium mb-4 text-center">Report Distribution by Type</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportTypeData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {reportTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`${value} reports`, 'Count']}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Over Time</CardTitle>
              <CardDescription>
                New users, reports, and active observers over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={dailyActivity}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={formatDate} />
                    <YAxis />
                    <Tooltip
                      labelFormatter={(label) => `Date: ${formatDate(label)}`}
                      formatter={(value, name) => {
                        const formattedName = name === 'newUsers' ? 'New Users' :
                          name === 'newReports' ? 'New Reports' : 'Active Observers';
                        return [value, formattedName];
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="activeObservers"
                      stroke="#10B981"
                      activeDot={{ r: 8 }}
                      name="Active Observers"
                    />
                    <Line
                      type="monotone"
                      dataKey="newReports"
                      stroke="#F59E0B"
                      name="New Reports"
                    />
                    <Line
                      type="monotone"
                      dataKey="newUsers"
                      stroke="#4F46E5"
                      name="New Users"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Report Status & Critical Issues */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Report Status */}
            <Card>
              <CardHeader>
                <CardTitle>Report Status Distribution</CardTitle>
                <CardDescription>
                  Current status of all reports
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reportStatusData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {reportStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value} reports`, 'Count']}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Critical Issues Table */}
            <Card>
              <CardHeader>
                <CardTitle>Top Stations with Issues</CardTitle>
                <CardDescription>
                  Polling stations requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Station</th>
                        <th className="text-center py-3 px-4 font-medium">Issues</th>
                        <th className="text-center py-3 px-4 font-medium">Critical</th>
                        <th className="text-right py-3 px-4 font-medium">Last Reported</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stationIssues && stationIssues.length > 0 ? (
                        stationIssues.slice(0, 5).map((station) => (
                          <tr key={station.id} className="border-b">
                            <td className="py-3 px-4">{station.name}</td>
                            <td className="py-3 px-4 text-center">{station.issueCount}</td>
                            <td className="py-3 px-4 text-center">
                              {station.criticalCount > 0 ? (
                                <Badge variant="destructive" className="font-normal">
                                  {station.criticalCount}
                                </Badge>
                              ) : (
                                <span>0</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right text-muted-foreground">
                              {formatTime(station.lastReportedTime)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-6 text-center text-muted-foreground">
                            No stations with issues reported
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Analytics</CardTitle>
              <CardDescription>
                Detailed breakdown of user activities and demographics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-medium mb-4">User Distribution by Role</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={userStatsData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={70}
                        />
                        <Tooltip
                          formatter={(value) => [`${value} users`, 'Count']}
                        />
                        <Legend />
                        <Bar 
                          dataKey="value" 
                          name="Users" 
                          fill="#4F46E5"
                          radius={[0, 4, 4, 0]}
                        >
                          {userStatsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-4">New User Registration Trend</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={dailyActivity}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={formatDate} />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(label) => `Date: ${formatDate(label)}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="newUsers"
                          name="New Users"
                          stroke="#4F46E5"
                          fill="#4F46E520"
                          activeDot={{ r: 8 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2 rounded-full border">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Users</p>
                        <p className="text-2xl font-bold">{summary?.userCount || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2 rounded-full border">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Verified Users</p>
                        <p className="text-2xl font-bold">
                          {userStatsData.reduce((acc, curr) => 
                            curr.name === 'Observer' || curr.name === 'Supervisor' ? 
                            acc + curr.value : acc, 0)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2 rounded-full border">
                        <HelpCircle className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Training Completion</p>
                        <p className="text-2xl font-bold">78%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-8">
                <h3 className="text-sm font-medium mb-4">User Activity by Time of Day</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { hour: '00:00', count: 12 },
                        { hour: '03:00', count: 8 },
                        { hour: '06:00', count: 15 },
                        { hour: '09:00', count: 45 },
                        { hour: '12:00', count: 53 },
                        { hour: '15:00', count: 62 },
                        { hour: '18:00', count: 38 },
                        { hour: '21:00', count: 25 },
                      ]}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [`${value} active users`, 'Count']}
                      />
                      <Bar
                        dataKey="count"
                        name="Active Users"
                        fill="#8B5CF6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Report Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of reports submitted
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-medium mb-4">Reports by Type</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={reportTypeData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={70}
                        />
                        <Tooltip
                          formatter={(value) => [`${value} reports`, 'Count']}
                        />
                        <Legend />
                        <Bar 
                          dataKey="value" 
                          name="Reports" 
                          fill="#F59E0B"
                          radius={[0, 4, 4, 0]}
                        >
                          {reportTypeData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-4">Report Status</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={reportStatusData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 70, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={70}
                        />
                        <Tooltip
                          formatter={(value) => [`${value} reports`, 'Count']}
                        />
                        <Legend />
                        <Bar 
                          dataKey="value" 
                          name="Reports" 
                          fill="#3B82F6"
                          radius={[0, 4, 4, 0]}
                        >
                          {reportStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2 rounded-full border">
                        <Flag className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Reports</p>
                        <p className="text-2xl font-bold">{summary?.reportCount || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2 rounded-full border">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Critical Issues</p>
                        <p className="text-2xl font-bold">{summary?.criticalIssues || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2 rounded-full border">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Resolution Rate</p>
                        <p className="text-2xl font-bold">{summary?.resolvedIssuesRate || 0}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="mt-8">
                <h3 className="text-sm font-medium mb-4">Report Submission Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dailyActivity}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={formatDate} />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(label) => `Date: ${formatDate(label)}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="newReports"
                        name="New Reports"
                        stroke="#F59E0B"
                        fill="#F59E0B20"
                        activeDot={{ r: 8 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stations Tab */}
        <TabsContent value="stations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Polling Station Analysis</CardTitle>
              <CardDescription>
                Overview of polling station activities and issues
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-8">
                <h3 className="text-sm font-medium mb-4">Top Stations with Issues</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Station</th>
                        <th className="text-left py-3 px-4 font-medium">Total Issues</th>
                        <th className="text-left py-3 px-4 font-medium">Critical Issues</th>
                        <th className="text-left py-3 px-4 font-medium">Last Reported</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stationIssues && stationIssues.length > 0 ? (
                        stationIssues.map((station) => (
                          <tr key={station.id} className="border-b">
                            <td className="py-3 px-4">{station.name}</td>
                            <td className="py-3 px-4">{station.issueCount}</td>
                            <td className="py-3 px-4">
                              {station.criticalCount > 0 ? (
                                <Badge variant="destructive" className="font-normal">
                                  {station.criticalCount}
                                </Badge>
                              ) : (
                                <span className="text-gray-500">None</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {formatTime(station.lastReportedTime)}
                            </td>
                            <td className="py-3 px-4">
                              <Badge 
                                variant="outline"
                                className={
                                  station.criticalCount > 0 
                                    ? "bg-red-50 text-red-700 border-red-200"
                                    : station.issueCount > 5
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-green-50 text-green-700 border-green-200"
                                }
                              >
                                {station.criticalCount > 0 
                                  ? "Critical" 
                                  : station.issueCount > 5 
                                  ? "Attention Needed" 
                                  : "Stable"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Button variant="ghost" size="sm" className="h-8 px-2">
                                <ExternalLink className="h-4 w-4" />
                                <span className="sr-only">View Details</span>
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-muted-foreground">
                            No stations with issues reported
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div>
                  <h3 className="text-sm font-medium mb-4">Issue Distribution by Station Type</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { type: 'Urban', issues: 42, color: '#4F46E5' },
                          { type: 'Suburban', issues: 28, color: '#8B5CF6' },
                          { type: 'Rural', issues: 15, color: '#EC4899' },
                          { type: 'Remote', issues: 8, color: '#F59E0B' },
                        ]}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar 
                          dataKey="issues" 
                          name="Issues" 
                          radius={[4, 4, 0, 0]}
                        >
                          {[
                            { type: 'Urban', issues: 42, color: '#4F46E5' },
                            { type: 'Suburban', issues: 28, color: '#8B5CF6' },
                            { type: 'Rural', issues: 15, color: '#EC4899' },
                            { type: 'Remote', issues: 8, color: '#F59E0B' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-4">Observer Coverage</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Full Coverage', value: 68, color: '#10B981' },
                            { name: 'Partial Coverage', value: 22, color: '#F59E0B' },
                            { name: 'No Coverage', value: 10, color: '#EF4444' },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {[
                            { name: 'Full Coverage', value: 68, color: '#10B981' },
                            { name: 'Partial Coverage', value: 22, color: '#F59E0B' },
                            { name: 'No Coverage', value: 10, color: '#EF4444' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`${value} stations`, 'Count']}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Trends Over Time</CardTitle>
              <CardDescription>
                Long-term analysis of observation activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-8">
                <h3 className="text-sm font-medium mb-4">Combined Activity Metrics</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={dailyActivity}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={formatDate} />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(label) => `Date: ${formatDate(label)}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="activeObservers"
                        stroke="#10B981"
                        activeDot={{ r: 8 }}
                        name="Active Observers"
                      />
                      <Line
                        type="monotone"
                        dataKey="newReports"
                        stroke="#F59E0B"
                        name="New Reports"
                      />
                      <Line
                        type="monotone"
                        dataKey="newUsers"
                        stroke="#4F46E5"
                        name="New Users"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-medium mb-4">Observer Activity Trend</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={dailyActivity}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={formatDate} />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(label) => `Date: ${formatDate(label)}`}
                        />
                        <Area
                          type="monotone"
                          dataKey="activeObservers"
                          name="Active Observers"
                          stroke="#10B981"
                          fill="#10B98120"
                          activeDot={{ r: 8 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-4">Report Activity by Hour</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { hour: '00', count: 5 },
                          { hour: '02', count: 3 },
                          { hour: '04', count: 2 },
                          { hour: '06', count: 8 },
                          { hour: '08', count: 15 },
                          { hour: '10', count: 24 },
                          { hour: '12', count: 30 },
                          { hour: '14', count: 29 },
                          { hour: '16', count: 35 },
                          { hour: '18', count: 32 },
                          { hour: '20', count: 20 },
                          { hour: '22', count: 12 },
                        ]}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => [`${value} reports`, 'Count']}
                          labelFormatter={(label) => `Hour: ${label}:00`}
                        />
                        <Bar
                          dataKey="count"
                          name="Reports Submitted"
                          fill="#F59E0B"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="text-sm font-medium mb-4">Issue Resolution Time Trend</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { date: "2025-04-01", avgResolutionHours: 48 },
                        { date: "2025-04-02", avgResolutionHours: 42 },
                        { date: "2025-04-03", avgResolutionHours: 36 },
                        { date: "2025-04-04", avgResolutionHours: 30 },
                        { date: "2025-04-05", avgResolutionHours: 24 },
                        { date: "2025-04-06", avgResolutionHours: 18 },
                        { date: "2025-04-07", avgResolutionHours: 12 },
                        { date: "2025-04-08", avgResolutionHours: 10 },
                      ]}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={formatDate} />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(label) => `Date: ${formatDate(label)}`}
                        formatter={(value) => [`${value} hours`, 'Avg. Resolution Time']}
                      />
                      <Line
                        type="monotone"
                        dataKey="avgResolutionHours"
                        stroke="#8B5CF6"
                        activeDot={{ r: 8 }}
                        name="Avg. Resolution Time"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}