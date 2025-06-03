import React, { useState, useEffect } from 'react';
// Temporarily comment out timeline import due to package issues
// import Timeline from 'react-calendar-timeline';
import moment from 'moment';
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { useQuery } from '@tanstack/react-query';
import { Loader2, Calendar, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Type definitions for projects and tasks
interface Task {
  id: number;
  title: string;
  startDate?: string;
  dueDate?: string;
  status: string;
  priority: string;
  assigneeId?: number;
  completed?: boolean;
}

interface Project {
  id: number;
  name: string;
  startDate?: string;
  endDate?: string;
  status: string;
  tasks?: Task[];
}

// Type for Timeline data
interface TimelineItem {
  id: number;
  group: number;
  title: string;
  start_time: number;
  end_time: number;
  itemProps?: {
    className?: string;
    style?: React.CSSProperties;
  };
}

interface TimelineGroup {
  id: number;
  title: string;
}

// Define GanttChartData interface if not already present
type GanttChartData = Project;

// Get color for task priority
const getPriorityColor = (priority: string): string => {
  switch(priority) {
    case 'urgent':
      return '#ef4444'; // red-500
    case 'high':
      return '#f97316'; // orange-500
    case 'medium':
      return '#3b82f6'; // blue-500
    case 'low':
      return '#22c55e'; // green-500
    default:
      return '#64748b'; // slate-500
  }
};

// Get className for task status
const getStatusClassName = (status: string): string => {
  switch(status) {
    case 'done':
      return 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-400';
    case 'in_review':
      return 'bg-violet-100 dark:bg-violet-900/30 border-violet-400';
    case 'in_progress':
      return 'bg-blue-100 dark:bg-blue-900/30 border-blue-400';
    case 'to_do':
      return 'bg-slate-100 dark:bg-slate-800/50 border-slate-400';
    case 'backlog':
    default:
      return 'bg-gray-100 dark:bg-gray-800/50 border-gray-400';
  }
};

// Function to transform project tasks into Timeline items
function transformToTimelineData(project: Project): { items: TimelineItem[], groups: TimelineGroup[] } {
  const items: TimelineItem[] = [];
  const groups: TimelineGroup[] = [
    { id: 1, title: 'Project Tasks' }
  ];
  
  if (!project.tasks || project.tasks.length === 0) {
    return { items, groups };
  }
  
  // Add items for each task
  project.tasks.forEach((task) => {
    // Make sure we have dates - use project dates as fallback
    const startDate = task.startDate 
      ? moment(task.startDate).valueOf() 
      : (project.startDate ? moment(project.startDate).valueOf() : moment().valueOf());
    
    const endDate = task.dueDate 
      ? moment(task.dueDate).valueOf() 
      : (task.startDate 
          ? moment(task.startDate).add(1, 'day').valueOf() 
          : moment(startDate).add(1, 'day').valueOf());
    
    items.push({
      id: task.id,
      group: 1,
      title: task.title,
      start_time: startDate,
      end_time: endDate,
      itemProps: {
        className: `border-l-4 border-l-[${getPriorityColor(task.priority)}] ${getStatusClassName(task.status)}`,
        style: {
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          fontSize: '13px',
          padding: '3px 8px',
        }
      }
    });
  });
  
  return { items, groups };
}

export default function GanttChartView({ projectId }: { projectId: number }) {
  const [timelineData, setTimelineData] = useState<{
    items: TimelineItem[];
    groups: TimelineGroup[];
  }>({ items: [], groups: [] });
  
  const [timelineProps, setTimelineProps] = useState({
    visibleTimeStart: moment().add(-1, 'month').valueOf(),
    visibleTimeEnd: moment().add(2, 'month').valueOf(),
  });
  
  // Fetch project data including tasks
  const { data: project, isLoading, error } = useQuery<Project, Error, Project, [string, number]>({
    queryKey: ['/api/project-management/projects', projectId],
    select: (data: GanttChartData) => ({
      ...data,
      tasks: data.tasks || []
    })
  });
  
  // Update timeline data when project changes
  useEffect(() => {
    if (project) {
      const { items, groups } = transformToTimelineData(project);
      setTimelineData({ items, groups });
      
      // Adjust visible time range based on project start/end dates
      if (project.startDate || project.endDate) {
        const start = project.startDate 
          ? moment(project.startDate).add(-1, 'week') 
          : moment().add(-1, 'month');
        
        const end = project.endDate 
          ? moment(project.endDate).add(1, 'week') 
          : moment(start).add(3, 'month');
        
        setTimelineProps({
          visibleTimeStart: start.valueOf(),
          visibleTimeEnd: end.valueOf()
        });
      }
    }
  }, [project]);

  const handleTimeChange = (visibleTimeStart: number, visibleTimeEnd: number) => {
    setTimelineProps({ visibleTimeStart, visibleTimeEnd });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading project timeline...</span>
      </div>
    );
  }
  
  if (error) {
    const axiosError = error as any;
    const errorMsg = axiosError?.response?.data?.error || axiosError?.data?.error || axiosError?.message || "Please try again later.";
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load project timeline data: {errorMsg}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Project Timeline</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs">
                Export
              </Button>
              <Select defaultValue="week">
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue placeholder="Zoom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {timelineData.items.length > 0 ? (
            <div className="h-[400px] border rounded">
              {/* Temporarily replaced with placeholder due to package issues */}
              <div className="flex flex-col items-center justify-center h-full">
                <p className="text-muted-foreground">Timeline visualization temporarily unavailable</p>
                <p className="text-sm text-muted-foreground mt-2">
                  The project has {timelineData.items.length} scheduled tasks
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-2" />
              <p>No tasks scheduled for this project yet.</p>
              <Button variant="outline" className="mt-4">Add Tasks</Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <h3 className="text-lg font-medium">Task Priority Legend</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded bg-red-500 mr-2"></div>
              <span className="text-sm">Urgent Priority</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded bg-orange-500 mr-2"></div>
              <span className="text-sm">High Priority</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded bg-blue-500 mr-2"></div>
              <span className="text-sm">Medium Priority</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded bg-green-500 mr-2"></div>
              <span className="text-sm">Low Priority</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}