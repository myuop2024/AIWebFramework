import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart2, 
  Users, 
  Activity, 
  FileText, 
  AlertTriangle, 
  Check, 
  Clock, 
  Server,
  HardDrive,
  Database,
  Cpu,
  MapPin
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from "recharts";

// Type definitions for dashboard statistics
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

// Helper functions for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
const RISK_COLORS = {
  highRisk: '#ef4444',
  mediumRisk: '#f97316',
  lowRisk: '#facc15',
  noRisk: '#22c55e'
};

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery<SystemStats>({
    queryKey: ['/api/admin/system-stats'],
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <Activity className="h-12 w-12 animate-pulse text-primary" />
          <p className="text-lg">Loading dashboard statistics...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load dashboard statistics. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  // Prepare data for charts
  const roleData = Object.entries(stats.users.byRole).map(([name, value]) => ({ name, value }));
  const reportTypeData = Object.entries(stats.reports.byType).map(([name, value]) => ({ name, value }));
  const reportStatusData = Object.entries(stats.reports.byStatus).map(([name, value]) => ({ name, value }));
  const riskData = Object.entries(stats.pollingStations.riskAssessment).map(([name, value]) => ({ 
    name: name
      .replace('highRisk', 'High Risk')
      .replace('mediumRisk', 'Medium Risk')
      .replace('lowRisk', 'Low Risk')
      .replace('noRisk', 'No Risk'),
    value, 
    fill: RISK_COLORS[name as keyof typeof RISK_COLORS]
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={stats.users.total.toString()}
          description="Registered platform users"
          icon={<Users className="h-8 w-8 text-blue-500" />}
        />
        
        <StatCard
          title="Active Observers"
          value={stats.users.activeObservers.toString()}
          description="Verified & trained observers"
          icon={<Users className="h-8 w-8 text-green-500" />}
        />
        
        <StatCard
          title="Active Assignments"
          value={stats.assignments.active.toString()}
          description="Current and scheduled assignments"
          icon={<Clock className="h-8 w-8 text-orange-500" />}
        />
        
        <StatCard
          title="Pending Reports"
          value={stats.reports.pending.toString()}
          description="Reports waiting for review"
          icon={<FileText className="h-8 w-8 text-yellow-500" />}
          badge={stats.reports.pending > 10 ? "High" : "Normal"}
          badgeColor={stats.reports.pending > 10 ? "destructive" : "secondary"}
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              User Distribution
            </CardTitle>
            <CardDescription>Breakdown of users by role</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {roleData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MapPin className="mr-2 h-5 w-5" />
              Polling Station Risk Assessment
            </CardTitle>
            <CardDescription>Stations categorized by reported issues</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" nameKey="name">
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Report Types
            </CardTitle>
            <CardDescription>Distribution of reports by type</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {reportTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="mr-2 h-5 w-5" />
              Report Status
            </CardTitle>
            <CardDescription>Breakdown of reports by current status</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportStatusData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {reportStatusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Server className="mr-2 h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>Current system resource utilization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <ResourceMeter 
                label="Database Usage" 
                value={stats.system.databaseUsage} 
                icon={<Database className="h-4 w-4" />} 
              />
              <ResourceMeter 
                label="Media Storage" 
                value={stats.system.mediaStorageUsage} 
                icon={<HardDrive className="h-4 w-4" />} 
              />
              <ResourceMeter 
                label="System Memory" 
                value={stats.system.systemMemoryUsage} 
                icon={<Cpu className="h-4 w-4" />} 
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                <div className="flex flex-col space-y-2 bg-muted/50 p-4 rounded-lg">
                  <div className="text-lg font-semibold">{stats.system.apiRequestsLast24h.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">API Requests (24h)</div>
                </div>
                <div className="flex flex-col space-y-2 bg-muted/50 p-4 rounded-lg">
                  <div className="text-lg font-semibold">{stats.system.activeSessions}</div>
                  <div className="text-sm text-muted-foreground">Active Sessions</div>
                </div>
                <div className="flex flex-col space-y-2 bg-muted/50 p-4 rounded-lg">
                  <div className="text-lg font-semibold">{stats.system.systemUptime.toFixed(1)}%</div>
                  <div className="text-sm text-muted-foreground">System Uptime</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Utility components
function StatCard({ title, value, description, icon, badge, badgeColor }: { 
  title: string; 
  value: string; 
  description: string; 
  icon: React.ReactNode;
  badge?: string;
  badgeColor?: "default" | "secondary" | "destructive" | "outline";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {badge && (
          <div className="mt-2">
            <Badge variant={badgeColor || "default"}>{badge}</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ResourceMeter({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <div className="flex items-center">
          <span className="mr-2">{icon}</span>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm font-medium">{value}%</span>
      </div>
      <Progress 
        value={value} 
        className={`h-2 ${
          value > 90 ? 'bg-red-100' : 
          value > 70 ? 'bg-amber-100' : 
          'bg-slate-100'
        }`}
        indicatorClassName={
          value > 90 ? 'bg-red-500' : 
          value > 70 ? 'bg-amber-500' : 
          'bg-green-500'
        }
      />
    </div>
  );
}