import React, { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { AuthGuard } from '@/components/auth/auth-guard';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Clock, 
  Calendar, 
  Users, 
  BarChart2,
  FileText,
  Download,
  Filter,
  Plus,
  RefreshCw,
  Shield
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import GanttChartView from '@/components/project-management/gantt-chart-view';
import PermissionsManager from '@/components/project-management/permissions-manager';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const ProjectDetailContent: React.FC = () => {
  const [match, params] = useRoute<{ id: string }>('/project-management/:id');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // Real data fetching from API
  const { data: project, isLoading, error } = useQuery<{
    id: number;
    name: string;
    description?: string;
    status: string;
    startDate?: string;
    endDate?: string;
    ownerId: number;
    tasks?: any[];
  }>({
    queryKey: ['/api/project-management/projects', params?.id],
    enabled: !!params?.id
  });
  
  const handleBack = () => {
    setLocation('/project-management');
  };
  
  const handleEdit = () => {
    setLocation(`/project-management/${params?.id}/edit`);
  };
  
  if (isLoading) {
    return (
      <div className="container p-4 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-[500px]" />
      </div>
    );
  }
  
  return (
    <div className="container p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{project?.name}</h1>
          <Badge
            variant={
              project?.status === 'planning' ? 'outline' :
              project?.status === 'active' ? 'default' :
              project?.status === 'on_hold' ? 'secondary' :
              project?.status === 'completed' ? 'success' :
              'destructive'
            }
          >
            {project?.status?.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            {project?.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            This is a placeholder for the project detail view.
            <br />
            The full implementation will be completed soon.
          </p>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="overview" className="flex items-center justify-center">
            <FileText className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tasks" className="flex items-center justify-center">
            <Clock className="h-4 w-4 mr-2" />
            Tasks
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center justify-center">
            <Calendar className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="team" className="flex items-center justify-center">
            <Users className="h-4 w-4 mr-2" />
            Team
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center justify-center">
            <Shield className="h-4 w-4 mr-2" />
            Permissions
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Project Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">Project overview will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Project Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">Project tasks will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeline">
          {project && (
            <GanttChartView projectId={parseInt(params?.id || '0')} />
          )}
        </TabsContent>
        
        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle>Project Team</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center text-muted-foreground">Project team members will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="permissions">
          {project && (
            <PermissionsManager projectId={parseInt(params?.id || '0')} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Wrap the project detail page in an auth guard to ensure only authenticated users can access
const ProjectDetail: React.FC = () => {
  return (
    <AuthGuard>
      <ProjectDetailContent />
    </AuthGuard>
  );
};

export default ProjectDetail;