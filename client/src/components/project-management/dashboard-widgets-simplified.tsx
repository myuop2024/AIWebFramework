import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart3,
  Clock,
  RefreshCw,
  Loader2,
  AlertCircle,
  CalendarClock,
  MessageCircle,
  UserPlus,
  Check,
  RotateCcw,
  CalendarDays,
  Users
} from 'lucide-react';

// Color constants
const STATUS_COLORS = {
  planning: '#3B82F6',
  active: '#10B981',
  on_hold: '#F59E0B',
  completed: '#6366F1',
  cancelled: '#EF4444',
};

const PRIORITY_COLORS = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#EF4444',
  urgent: '#7C3AED',
};

const CHART_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#6366F1',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
];

interface TaskPriorityData {
  name: string;
  value: number;
  color?: string;
}

interface ActivityData {
  id: number;
  activityType: string;
  user: { name: string; avatar: string | null };
  description: string;
  projectName: string;
  timestamp: string;
}

interface TaskDeadlineData {
  id: number;
  title: string;
  projectName: string;
  dueDate: string;
  priority: string;
  assignee: { name: string; avatar: string | null };
}

// Project Status Widget - Shows a pie chart of projects by status
export function ProjectStatusWidget() {
  // Sample data, would normally come from API
  const sampleData = [
    { name: 'Planning', value: 4, color: STATUS_COLORS.planning },
    { name: 'Active', value: 7, color: STATUS_COLORS.active },
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
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={sampleData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {sampleData.map((entry, index) => (
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

// Task Priority Widget - Shows a pie chart of tasks by priority
export function TaskPriorityWidget() {
  // Sample data, would normally come from API
  const sampleData = [
    { name: 'Low', value: 8, color: PRIORITY_COLORS.low },
    { name: 'Medium', value: 15, color: PRIORITY_COLORS.medium },
    { name: 'High', value: 10, color: PRIORITY_COLORS.high },
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
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={sampleData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {sampleData.map((entry, index) => (
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

// Recent Activity Widget - Shows a list of recent activities
export function RecentActivityWidget() {
  // Sample data, would normally come from API
  const sampleActivities: ActivityData[] = [
    {
      id: 1,
      activityType: 'task_completed',
      user: { name: 'Jane Smith', avatar: null },
      description: 'completed task "Update security protocols"',
      projectName: 'System Security Upgrade',
      timestamp: '2 hours ago'
    },
    {
      id: 2,
      activityType: 'comment_added',
      user: { name: 'John Doe', avatar: null },
      description: 'commented on "Database migration plan"',
      projectName: 'Database Optimization',
      timestamp: '4 hours ago'
    },
    {
      id: 3,
      activityType: 'task_created',
      user: { name: 'Alex Johnson', avatar: null },
      description: 'created task "Final verification of observer stations"',
      projectName: 'Election Day Preparation',
      timestamp: 'Yesterday'
    },
    {
      id: 4,
      activityType: 'member_added',
      user: { name: 'Lisa Rodriguez', avatar: null },
      description: 'added Thomas Wilson to the project',
      projectName: 'Mobile App Development',
      timestamp: '2 days ago'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'task_created':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'task_updated':
        return <RotateCcw className="h-5 w-5 text-blue-500" />;
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
          {sampleActivities.map((activity) => (
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
                <div className="flex items-center mt-1 text-xs text-muted-foreground">
                  <span>{activity.projectName}</span>
                  <span className="mx-2">•</span>
                  <span>{activity.timestamp}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Upcoming Deadlines Widget - Shows a list of upcoming task deadlines
export function UpcomingDeadlinesWidget() {
  // Sample data, would normally come from API
  const sampleDeadlines: TaskDeadlineData[] = [
    {
      id: 1,
      title: 'Complete observer training materials',
      projectName: 'Training Update 2025',
      dueDate: 'Tomorrow, 5:00 PM',
      priority: 'high',
      assignee: { name: 'Jane Smith', avatar: null }
    },
    {
      id: 2,
      title: 'Review security protocols for polling stations',
      projectName: 'Election Security',
      dueDate: 'In 2 days',
      priority: 'urgent',
      assignee: { name: 'Michael Brown', avatar: null }
    },
    {
      id: 3,
      title: 'Finalize volunteer schedule',
      projectName: 'Volunteer Management',
      dueDate: 'May 15, 2025',
      priority: 'medium',
      assignee: { name: 'Sarah Jones', avatar: null }
    },
    {
      id: 4,
      title: 'Update mobile app for observers',
      projectName: 'Mobile App Update',
      dueDate: 'May 18, 2025',
      priority: 'low',
      assignee: { name: 'Alex Johnson', avatar: null }
    }
  ];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge className="bg-purple-600">Urgent</Badge>;
      case 'high':
        return <Badge className="bg-red-500">High</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500">Medium</Badge>;
      case 'low':
        return <Badge className="bg-green-500">Low</Badge>;
      default:
        return <Badge>Unspecified</Badge>;
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
          {sampleDeadlines.map((task) => (
            <div key={task.id} className="p-3 border rounded-lg">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="font-medium text-sm">{task.title}</h3>
                  <p className="text-xs text-muted-foreground">{task.projectName}</p>
                </div>
                {getPriorityBadge(task.priority)}
              </div>
              <div className="flex justify-between items-center mt-3">
                <div className="flex items-center text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5 mr-1" />
                  <span>{task.dueDate}</span>
                </div>
                <div className="flex items-center text-xs">
                  <Users className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                  <span>{task.assignee.name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Combined Dashboard Widget Grid
export function DashboardWidgetGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      <ProjectStatusWidget />
      <TaskPriorityWidget />
      <RecentActivityWidget />
      <UpcomingDeadlinesWidget />
    </div>
  );
}