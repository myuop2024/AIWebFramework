import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { Calendar } from '@/components/ui/calendar';
import { Task } from '@shared/schema';

// Define an interface for tasks with project info
interface TaskWithProject extends Task {
  project: {
    name: string;
    color: string;
  }
}

const TasksCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Load tasks from API with the current month
  const { data: tasks = [], isLoading } = useQuery<TaskWithProject[]>({
    queryKey: ['/api/tasks', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // JavaScript months are 0-indexed
      const response = await fetch(`/api/tasks?month=${year}-${month.toString().padStart(2, '0')}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return response.json();
    }
  });

  // Navigation functions
  const previousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const nextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Group tasks by date for calendar view
  const tasksByDate = tasks.reduce((acc, task) => {
    // Skip tasks without dates
    if (!task.dueDate) return acc;
    
    const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, (Task & { project: { name: string, color: string } })[]>);

  // Get all dates in the current month for rendering
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  return (
    <Card className="w-full">
      <CardHeader className="px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
        <div>
          <CardTitle className="text-2xl">Task Calendar</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage upcoming tasks and deadlines
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="px-2">
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-bold">{format(currentDate, 'MMMM yyyy')}</h2>
          </div>
          
          <div className="hidden md:block">
            {/* Calendar grid for larger screens */}
            <div className="grid grid-cols-7 gap-px border rounded-lg overflow-hidden">
              {/* Day headers */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-muted p-2 text-center font-medium text-sm">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {daysInMonth.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayTasks = tasksByDate[dateKey] || [];
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);
                
                return (
                  <div 
                    key={day.toString()}
                    className={`
                      min-h-[100px] p-2 border-t 
                      ${isCurrentMonth ? 'bg-background' : 'bg-muted/50 text-muted-foreground'} 
                      ${isCurrentDay ? 'ring-2 ring-primary ring-inset' : ''}
                    `}
                  >
                    <div className="font-medium text-sm mb-1">{format(day, 'd')}</div>
                    <div className="space-y-1">
                      {dayTasks.slice(0, 3).map(task => (
                        <div 
                          key={task.id}
                          className="text-xs p-1 rounded bg-primary/10 truncate cursor-pointer hover:bg-primary/20"
                          style={{ borderLeft: `3px solid ${task.project.color || '#888'}` }}
                        >
                          {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{dayTasks.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Simple calendar for mobile */}
          <div className="md:hidden">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => date && setCurrentDate(date)}
              className="mx-auto"
              disabled={date => !isSameMonth(date, currentDate)}
            />
            
            <div className="mt-4 space-y-2">
              <h3 className="font-medium">Tasks for {format(currentDate, 'MMMM d, yyyy')}</h3>
              <div className="space-y-2">
                {tasksByDate[format(currentDate, 'yyyy-MM-dd')]?.map(task => (
                  <div 
                    key={task.id}
                    className="p-2 border rounded-md flex justify-between items-center"
                    style={{ borderLeft: `4px solid ${task.project.color || '#888'}` }}
                  >
                    <div>
                      <div className="font-medium">{task.title}</div>
                      <div className="text-xs text-muted-foreground">{task.project.name}</div>
                    </div>
                    <Badge className="ml-2" variant={
                      task.status === 'backlog' ? 'outline' :
                      task.status === 'to_do' ? 'secondary' :
                      task.status === 'in_progress' ? 'default' :
                      task.status === 'in_review' ? 'secondary' :
                      'success'
                    }>
                      {task.status.replace('_', ' ')}
                    </Badge>
                  </div>
                )) || (
                  <div className="text-center p-4 text-muted-foreground">
                    No tasks scheduled for this day
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TasksCalendar;