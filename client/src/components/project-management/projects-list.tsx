import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  PlayCircle, 
  PauseCircle 
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { type Project } from '@shared/schema';

const ProjectsList: React.FC = () => {
  const [location, setLocation] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Real data fetching from the API
  const { data: projects, isLoading, error } = useQuery({
    queryKey: ['/api/projects', statusFilter, searchTerm],
    queryFn: async () => {
      // Build query params
      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const queryString = params.toString();
      const url = `/api/projects${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      return response.json();
    }
  });
  
  const handleViewProject = (projectId: number) => {
    setLocation(`/project-management/${projectId}`);
  };
  
  const handleEditProject = (projectId: number) => {
    setLocation(`/project-management/${projectId}/edit`);
  };
  
  // The API now handles filtering, so we just use the returned projects directly
  const filteredProjects = projects || [];
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Projects</CardTitle>
        <CardDescription>Manage your current projects and their status</CardDescription>
        
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="flex-1">
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center p-4 text-red-500 flex items-center justify-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            <span>Failed to load projects. Please try again.</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <p>No projects found. Create your first project to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="hidden md:table-cell">Start Date</TableHead>
                  <TableHead className="hidden md:table-cell">End Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map(project => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          project.status === 'planning' ? 'outline' :
                          project.status === 'active' ? 'default' :
                          project.status === 'on_hold' ? 'secondary' :
                          project.status === 'completed' ? 'success' :
                          'destructive'
                        }
                        className="flex w-fit items-center gap-1"
                      >
                        {project.status === 'planning' && <Clock className="h-3 w-3" />}
                        {project.status === 'active' && <PlayCircle className="h-3 w-3" />}
                        {project.status === 'on_hold' && <PauseCircle className="h-3 w-3" />}
                        {project.status === 'completed' && <CheckCircle2 className="h-3 w-3" />}
                        {project.status === 'cancelled' && <AlertTriangle className="h-3 w-3" />}
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>Owner Name</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewProject(project.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleEditProject(project.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectsList;