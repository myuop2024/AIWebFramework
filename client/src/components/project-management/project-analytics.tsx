import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  PieChart, 
  Pie, 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  CheckCircle, 
  Clock, 
  FileText, 
  Users
} from 'lucide-react';

// Placeholder data for charts
const mockStatusData = [
  { name: 'Backlog', value: 5, color: '#94a3b8' },
  { name: 'To Do', value: 8, color: '#60a5fa' },
  { name: 'In Progress', value: 3, color: '#f59e0b' },
  { name: 'In Review', value: 2, color: '#a78bfa' },
  { name: 'Done', value: 12, color: '#10b981' },
];

const mockPriorityData = [
  { name: 'Low', value: 7, color: '#94a3b8' },
  { name: 'Medium', value: 12, color: '#60a5fa' },
  { name: 'High', value: 6, color: '#f59e0b' },
  { name: 'Urgent', value: 5, color: '#ef4444' },
];

const mockProjectProgressData = [
  { name: 'Week 1', tasks: 5, completed: 2 },
  { name: 'Week 2', tasks: 8, completed: 5 },
  { name: 'Week 3', tasks: 10, completed: 7 },
  { name: 'Week 4', tasks: 12, completed: 6 },
  { name: 'Week 5', tasks: 15, completed: 10 },
  { name: 'Week 6', tasks: 18, completed: 13 },
];

const mockUserAssignmentData = [
  { name: 'John D.', completed: 8, inProgress: 2, todo: 3 },
  { name: 'Emma S.', completed: 12, inProgress: 1, todo: 4 },
  { name: 'Michael T.', completed: 6, inProgress: 3, todo: 2 },
  { name: 'Sophia R.', completed: 9, inProgress: 2, todo: 1 },
  { name: 'David K.', completed: 7, inProgress: 1, todo: 5 },
];

const StatsCard = ({ title, value, icon, description }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </CardContent>
  </Card>
);

const ProjectAnalytics: React.FC = () => {
  // Define analytics data interface
  interface AnalyticsData {
    totalProjects: number;
    completedProjects: number;
    totalTasks: number;
    completedTasks: number;
    activeUsers: number;
    statusData: typeof mockStatusData;
    priorityData: typeof mockPriorityData;
    progressData: typeof mockProjectProgressData;
    userAssignmentData: typeof mockUserAssignmentData;
  }

  // Fetch real analytics data from the API
  const { data: analyticsData, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics/projects'],
    // The API will return real data from the database
    // For now, we'll fall back to some placeholder data if the API doesn't provide everything
    // This will be replaced with real data once the API is fully implemented
    select: (data) => ({
      totalProjects: data?.totalProjects ?? 0,
      completedProjects: data?.completedProjects ?? 0,
      totalTasks: data?.totalTasks ?? 0,
      completedTasks: data?.completedTasks ?? 0,
      activeUsers: data?.activeUsers ?? 0,
      statusData: data?.statusData ?? mockStatusData,
      priorityData: data?.priorityData ?? mockPriorityData,
      progressData: data?.progressData ?? mockProjectProgressData,
      userAssignmentData: data?.userAssignmentData ?? mockUserAssignmentData
    })
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full" />
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Projects"
          value={analyticsData?.totalProjects || 0}
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        />
        <StatsCard
          title="Completed Projects"
          value={analyticsData?.completedProjects || 0}
          icon={<CheckCircle className="h-4 w-4 text-muted-foreground" />}
          description={`${Math.round(((analyticsData?.completedProjects || 0) / (analyticsData?.totalProjects || 1)) * 100)}% completion rate`}
        />
        <StatsCard
          title="Total Tasks"
          value={analyticsData?.totalTasks || 0}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
        <StatsCard
          title="Active Users"
          value={analyticsData?.activeUsers || 0}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="tasks">Task Distribution</TabsTrigger>
          <TabsTrigger value="progress">Project Progress</TabsTrigger>
          <TabsTrigger value="users">User Assignments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Task Distribution by Status and Priority</CardTitle>
              <CardDescription>Overview of all tasks in the system categorized by status and priority</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-sm font-medium mb-4 text-center">Tasks by Status</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData?.statusData || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {(analyticsData?.statusData || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium mb-4 text-center">Tasks by Priority</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={analyticsData?.priorityData || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {(analyticsData?.priorityData || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="progress">
          <Card>
            <CardHeader>
              <CardTitle>Project Progress Over Time</CardTitle>
              <CardDescription>Tracking of tasks created vs. completed over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={analyticsData?.progressData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="tasks" 
                    stroke="#60a5fa" 
                    name="Tasks Created"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="#10b981" 
                    name="Tasks Completed"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Task Assignments</CardTitle>
              <CardDescription>Distribution of tasks across team members by status</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData?.userAssignmentData || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" />
                  <Bar dataKey="inProgress" stackId="a" fill="#f59e0b" name="In Progress" />
                  <Bar dataKey="todo" stackId="a" fill="#60a5fa" name="To Do" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectAnalytics;