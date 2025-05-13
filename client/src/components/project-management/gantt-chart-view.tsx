import React, { useState, useEffect } from 'react';
import {
  Chart,
  ArgumentAxis,
  ValueAxis,
  BarSeries,
  Legend
} from '@devexpress/dx-react-chart';
import { EventTracker } from '@devexpress/dx-react-core';
import { Card } from "@/components/ui/card";
import { CardContent } from "@/components/ui/card";
import { CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { format, addDays, differenceInDays } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

// Type definitions for projects and tasks
interface Task {
  id: number;
  title: string;
  startDate: string;
  dueDate: string;
  status: string;
  priority: string;
  assigneeId?: number;
  progress?: number;
}

interface Project {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  tasks: Task[];
}

// Type for Gantt chart data 
interface GanttChartItem {
  task: string;
  startDate: Date;
  endDate: Date;
  type: 'task' | 'milestone';
  progress: number;
  color?: string;
}

// Function to transform project tasks into Gantt chart data
function transformToGanttData(project: Project): GanttChartItem[] {
  if (!project.tasks) return [];
  
  return project.tasks.map(task => {
    // Calculate progress based on status
    let progress = 0;
    switch(task.status) {
      case 'done':
        progress = 100;
        break;
      case 'in_review':
        progress = 80;
        break;
      case 'in_progress':
        progress = 50;
        break;
      case 'to_do':
        progress = 10;
        break;
      default:
        progress = 0;
    }

    // Set color based on priority
    let color;
    switch(task.priority) {
      case 'urgent':
        color = 'rgba(220, 38, 38, 0.6)'; // red
        break;
      case 'high':
        color = 'rgba(234, 88, 12, 0.6)'; // orange
        break;
      case 'medium':
        color = 'rgba(59, 130, 246, 0.6)'; // blue
        break;
      case 'low':
        color = 'rgba(34, 197, 94, 0.6)'; // green
        break;
      default:
        color = 'rgba(100, 116, 139, 0.6)'; // slate
    }

    return {
      task: task.title,
      startDate: new Date(task.startDate || project.startDate),
      endDate: new Date(task.dueDate || task.startDate || project.endDate),
      type: 'task' as const,
      progress: task.progress || progress,
      color
    };
  });
}

// Function to prepare data for the chart
function prepareChartData(items: GanttChartItem[]) {
  return items.map((item, index) => ({
    task: item.task,
    start: index,
    duration: differenceInDays(item.endDate, item.startDate) || 1,
    progress: item.progress / 100,
    color: item.color
  }));
}

const BarWithLabel = (props: Record<string, any>) => {
  const { color, value, style, ...restProps } = props;
  return (
    <BarSeries.Point 
      {...restProps} 
      color={color || '#4f46e5'}
      style={Object.assign({}, style || {}, {
        opacity: 0.8,
        borderRadius: '4px'
      })}
    />
  );
};

export default function GanttChartView({ projectId }: { projectId: number }) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({
    start: '',
    end: ''
  });
  
  // Fetch project data including tasks
  const { data: project, isLoading } = useQuery({
    queryKey: ['/api/project-management/projects', projectId],
    select: (data) => ({
      ...data,
      tasks: data.tasks || []
    })
  });
  
  useEffect(() => {
    if (project) {
      const ganttData = transformToGanttData(project);
      setChartData(prepareChartData(ganttData));
      
      // Set date range for the project
      setDateRange({
        start: project.startDate ? format(new Date(project.startDate), 'yyyy-MM-dd') : '',
        end: project.endDate ? format(new Date(project.endDate), 'yyyy-MM-dd') : ''
      });
    }
  }, [project]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading project timeline...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="card-modern">
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Project Timeline</h3>
            <div className="flex gap-2">
              <Button variant="outline" className="text-xs">
                Export
              </Button>
              <Select defaultValue="weeks">
                <SelectTrigger className="w-24 h-8 text-xs">
                  <SelectValue placeholder="Zoom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="weeks">Weeks</SelectItem>
                  <SelectItem value="months">Months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-[400px]">
              <Chart data={chartData}>
                <ArgumentAxis />
                <ValueAxis />

                <BarSeries
                  valueField="duration"
                  argumentField="task"
                  pointComponent={BarWithLabel}
                />

                <Stack />
                <EventTracker />
                <HoverState />
                <Tooltip />
                <Legend />
              </Chart>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No tasks scheduled for this project yet.
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4 mt-4">
            <FormControl className="flex-1">
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <Input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                />
              </FormItem>
            </FormControl>
            <FormControl className="flex-1">
              <FormItem>
                <FormLabel>End Date</FormLabel>
                <Input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                />
              </FormItem>
            </FormControl>
          </div>
        </CardContent>
      </Card>
      
      <Card className="card-modern">
        <CardHeader>
          <h3 className="text-lg font-medium">Task Timeline Legend</h3>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded bg-red-500 opacity-60 mr-2"></div>
              <span className="text-sm">Urgent Priority</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded bg-orange-500 opacity-60 mr-2"></div>
              <span className="text-sm">High Priority</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded bg-blue-500 opacity-60 mr-2"></div>
              <span className="text-sm">Medium Priority</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded bg-green-500 opacity-60 mr-2"></div>
              <span className="text-sm">Low Priority</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}