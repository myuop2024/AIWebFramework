import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ListTodo, BarChart2, Calendar, Kanban, Folder, Columns } from 'lucide-react';
import ProjectsList from '@/components/project-management/projects-list';
import ProjectsKanban from '@/components/project-management/projects-kanban';
import TasksCalendar from '@/components/project-management/tasks-calendar';
import ProjectAnalytics from '@/components/project-management/project-analytics';

type ViewType = 'list' | 'kanban' | 'calendar' | 'analytics';

const ProjectManagement: React.FC = () => {
  const [location, setLocation] = useLocation();
  const [view, setView] = useState<ViewType>('list');
  
  const handleNewProject = () => {
    setLocation('/project-management/new');
  };
  
  return (
    <div className="container p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Project Management</h1>
        <Button onClick={handleNewProject}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>
      
      <Tabs defaultValue="list" value={view} onValueChange={(v) => setView(v as ViewType)} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="list" className="flex items-center justify-center">
            <ListTodo className="h-4 w-4 mr-2" />
            List View
          </TabsTrigger>
          <TabsTrigger value="kanban" className="flex items-center justify-center">
            <Kanban className="h-4 w-4 mr-2" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center justify-center">
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center justify-center">
            <BarChart2 className="h-4 w-4 mr-2" />
            Analytics
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="list">
          <ProjectsList />
        </TabsContent>
        
        <TabsContent value="kanban">
          <ProjectsKanban />
        </TabsContent>
        
        <TabsContent value="calendar">
          <TasksCalendar />
        </TabsContent>
        
        <TabsContent value="analytics">
          <ProjectAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProjectManagement;