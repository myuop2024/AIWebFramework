import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  AlertCircle, 
  BarChart2, 
  Clock, 
  FileCheck2, 
  Loader2, 
  PieChart as PieChartIcon,
  RefreshCw, 
  Settings,
  User,
  Users,
  CalendarClock,
  CircleAlert,
  MessageCircle,
  UserPlus
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';

// Project status colors
const STATUS_COLORS = {
  planning: '#6366f1', // indigo-500
  active: '#10b981', // emerald-500
  on_hold: '#f59e0b', // amber-500
  completed: '#0ea5e9', // sky-500
  cancelled: '#ef4444', // red-500
};

// Task priority colors
const PRIORITY_COLORS = {
  low: '#22c55e', // green-500
  medium: '#3b82f6', // blue-500
  high: '#f97316', // orange-500
  urgent: '#ef4444', // red-500
};

// Task status colors
const TASK_STATUS_COLORS = {
  backlog: '#64748b', // slate-500
  to_do: '#94a3b8', // slate-400
  in_progress: '#3b82f6', // blue-500
  in_review: '#8b5cf6', // violet-500
  done: '#10b981', // emerald-500
};

const CHART_COLORS = [
  '#4f46e5', // indigo-600
  '#0284c7', // sky-600
  '#0891b2', // cyan-600
  '#059669', // emerald-600
  '#16a34a', // green-600
  '#ca8a04', // yellow-600
  '#ea580c', // orange-600
  '#dc2626', // red-600
  '#9333ea', // purple-600
  '#c026d3', // fuchsia-600
];

interface ProjectStatusData {
  name: string;
  value: number;
  color?: string;
}

// Project Status Chart Widget
export function ProjectStatusWidget() {
  const { data, isLoading, error, refetch } = useQuery<ProjectStatusData[]>({
    queryKey: ['/api/project-management/analytics/projects'],
  });

  if (isLoading) {
    return (
      <Card className="h-[400px]">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle>Project Status</CardTitle>
          <CardDescription>Distribution of projects by status</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load project statistics.
              <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Example data
  const chartData = data || [
    { name: 'Planning', value: 5, color: STATUS_COLORS.planning },
    { name: 'Active', value: 8, color: STATUS_COLORS.active },
    { name: 'On Hold', value: 3, color: STATUS_COLORS.on_hold },
    { name: 'Completed', value: 12, color: STATUS_COLORS.completed },
    { name: 'Cancelled', value: 2, color: STATUS_COLORS.cancelled },
  ];

  return (
    <Card className="h-[400px]">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Project Status</CardTitle>
            <CardDescription>Distribution of projects by status</CardDescription>
          </div>
          <PieChartIcon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface TaskPriorityData {
  name: string;
  value: number;
  color?: string;
}

// Task Priority Widget
export function TaskPriorityWidget() {
  const { data = [], isLoading, error, refetch } = useQuery<TaskPriorityData[]>({
    queryKey: ['/api/project-management/stats/tasks-by-priority'],
  });

  if (isLoading) {
    return (
      <Card className="h-[400px]">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[400px]">
        <CardHeader>
          <CardTitle>Task Priority</CardTitle>
          <CardDescription>Distribution of tasks by priority level</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load task statistics.
              <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Example data
  const chartData = data || [
    { name: 'Low', value: 10, color: PRIORITY_COLORS.low },
    { name: 'Medium', value: 25, color: PRIORITY_COLORS.medium },
    { name: 'High', value: 15, color: PRIORITY_COLORS.high },
    { name: 'Urgent', value: 5, color: PRIORITY_COLORS.urgent },
  ];

  return (
    <Card className="h-[400px]">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Task Priority</CardTitle>
            <CardDescription>Distribution of tasks by priority level</CardDescription>
          </div>
          <CircleAlert className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="Tasks">
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface ActivityData {
  id: number;
  activityType: string;
  user: { name: string; avatar: string | null };
  description: string;
  projectName: string;
  timestamp: string;
}

// Recent Activity Widget
export function RecentActivityWidget() {
  const { data = [], isLoading, error, refetch } = useQuery<ActivityData[]>({
    queryKey: ['/api/project-management/activities/recent'],
  });

  if (isLoading) {
    return (
      <Card className="h-[400px]">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="w-full">
                <Skeleton className="h-5 w-3/4 mb-1" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[400px] overflow-hidden">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions across projects</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load recent activities.
              <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Example data
  const activities = data || [
    {
      id: 1,
      activityType: 'task_created',
      user: { name: 'Jane Smith', avatar: null },
      description: 'Created a new task "Update observer documentation"',
      projectName: 'Election Day Preparation',
      timestamp: '2025-05-12T14:30:00.000Z',
    },
    {
      id: 2,
      activityType: 'project_updated',
      user: { name: 'Michael Johnson', avatar: null },
      description: 'Updated project timeline',
      projectName: 'Volunteer Training',
      timestamp: '2025-05-12T13:15:00.000Z',
    },
    {
      id: 3,
      activityType: 'comment_added',
      user: { name: 'Lisa Wong', avatar: null },
      description: 'Added a comment on "Create ID cards for new volunteers"',
      projectName: 'Onboarding Process',
      timestamp: '2025-05-12T11:45:00.000Z',
    },
    {
      id: 4,
      activityType: 'task_completed',
      user: { name: 'Robert Brown', avatar: null },
      description: 'Marked task "Setup polling station map" as complete',
      projectName: 'Polling Station Logistics',
      timestamp: '2025-05-12T10:20:00.000Z',
    },
    {
      id: 5,
      activityType: 'member_added',
      user: { name: 'Emma Wilson', avatar: null },
      description: 'Added Sarah Jackson to the project',
      projectName: 'Communication Protocols',
      timestamp: '2025-05-12T09:10:00.000Z',
    },
  ];

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'task_created':
        return <FileCheck2 className="h-5 w-5 text-blue-500" />;
      case 'task_completed':
        return <FileCheck2 className="h-5 w-5 text-green-500" />;
      case 'project_updated':
        return <Settings className="h-5 w-5 text-indigo-500" />;
      case 'comment_added':
        return <MessageCircle className="h-5 w-5 text-amber-500" />;
      case 'member_added':
        return <UserPlus className="h-5 w-5 text-violet-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <Card className="h-[400px] overflow-hidden">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions across projects</CardDescription>
          </div>
          <Clock className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="overflow-auto h-[300px] pt-0">
        <div className="space-y-4">
          {data.map((activity) => (
            <div key={activity.id} className="flex gap-3">
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.activityType)}
              </div>
              <div>
                <p className="text-sm font-medium">
                  {activity.user.name}{' '}
                  <span className="font-normal text-muted-foreground">
                    {activity.description}
                  </span>
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {activity.projectName}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface TaskDeadlineData {
  id: number;
  title: string;
  projectName: string;
  dueDate: string;
  priority: string;
  assignee: { name: string; avatar: string | null };
}

// Upcoming Deadlines Widget
export function UpcomingDeadlinesWidget() {
  const { data = [], isLoading, error, refetch } = useQuery<TaskDeadlineData[]>({
    queryKey: ['/api/project-management/tasks/upcoming-deadlines'],
  });

  if (isLoading) {
    return (
      <Card className="h-[400px]">
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="w-full">
                <Skeleton className="h-5 w-3/4 mb-1" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[400px] overflow-hidden">
        <CardHeader>
          <CardTitle>Upcoming Deadlines</CardTitle>
          <CardDescription>Tasks due in the next 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              Failed to load upcoming deadlines.
              <Button variant="outline" size="sm" className="mt-2" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Example data
  const upcomingDeadlines = data || [
    {
      id: 1,
      title: 'Finalize observer training materials',
      projectName: 'Training Program',
      dueDate: '2025-05-14T17:00:00.000Z',
      priority: 'high',
      assignee: { name: 'Jane Smith', avatar: null },
    },
    {
      id: 2,
      title: 'Review polling station assignments',
      projectName: 'Polling Station Logistics',
      dueDate: '2025-05-15T14:00:00.000Z',
      priority: 'medium',
      assignee: { name: 'Michael Johnson', avatar: null },
    },
    {
      id: 3,
      title: 'Create emergency contact list',
      projectName: 'Communication Protocols',
      dueDate: '2025-05-17T15:30:00.000Z',
      priority: 'urgent',
      assignee: { name: 'Sarah Jackson', avatar: null },
    },
    {
      id: 4,
      title: 'Print ID cards for new volunteers',
      projectName: 'Onboarding Process',
      dueDate: '2025-05-18T12:00:00.000Z',
      priority: 'low',
      assignee: { name: 'Robert Brown', avatar: null },
    },
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">High</Badge>;
      case 'medium':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Medium</Badge>;
      case 'low':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Low</Badge>;
      default:
        return <Badge variant="outline">Unspecified</Badge>;
    }
  };

  const formatDueDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + 
        ` at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  return (
    <Card className="h-[400px] overflow-hidden">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Tasks due in the next 7 days</CardDescription>
          </div>
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="overflow-auto h-[300px] pt-0">
        <div className="space-y-4">
          {data.map((task) => (
            <div key={task.id} className="p-3 border rounded-lg">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">{task.title}</h3>
                  <p className="text-xs text-muted-foreground">{task.projectName}</p>
                </div>
                {getPriorityBadge(task.priority)}
              </div>
              <div className="flex justify-between items-center mt-2">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs">{task.assignee.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">{formatDueDate(task.dueDate)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Combined Dashboard Widgets Component
export default function ProjectDashboardWidgets() {
  const [period, setPeriod] = useState('week');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Project Dashboard</h2>
        <div className="flex items-center gap-2">
          <Select 
            defaultValue={period} 
            onValueChange={setPeriod}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProjectStatusWidget />
        <TaskPriorityWidget />
        <RecentActivityWidget />
        <UpcomingDeadlinesWidget />
      </div>
    </div>
  );
}