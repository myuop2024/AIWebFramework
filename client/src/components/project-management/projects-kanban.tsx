import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Clock, ArrowRightCircle, CheckCircle } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { projects as projectsTableSchema } from '@shared/schema';
import { InferSelectModel } from 'drizzle-orm';

// Define the Project type from the Drizzle schema
type Project = InferSelectModel<typeof projectsTableSchema>;

const projectStatusColumns = [
  { id: 'planning', name: 'Planning', icon: <Clock className="h-4 w-4" /> },
  { id: 'active', name: 'Active', icon: <ArrowRightCircle className="h-4 w-4" /> },
  { id: 'on_hold', name: 'On Hold', icon: <Clock className="h-4 w-4" /> },
  { id: 'completed', name: 'Completed', icon: <CheckCircle className="h-4 w-4" /> }
];

const ProjectsKanban: React.FC = () => {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Fetch projects data
  const { data: projects, isLoading, error } = useQuery<Project[]>({
    queryKey: ['/api/project-management/projects'],
    queryFn: async () => {
      const response = await fetch('/api/project-management/projects');
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      return response.json();
    }
  });

  const handleViewProject = (projectId: number) => {
    setLocation(`/project-management/${projectId}`);
  };

  const handleNewProject = () => {
    setLocation('/project-management/new');
  };

  const handleEditProject = (projectId: number) => {
    setLocation(`/project-management/edit/${projectId}`);
  };

  const handleDeleteProject = async (projectId: number) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    setDeletingId(projectId);
    try {
      const response = await fetch(`/api/project-management/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete project');
      await queryClient.invalidateQueries({ queryKey: ['/api/project-management/projects'] });
    } catch (err) {
      alert('Error deleting project.');
    } finally {
      setDeletingId(null);
    }
  };

  // Group projects by status
  const groupedProjects = (projects || []).reduce((acc: Record<string, Project[]>, project: Project) => {
    if (!acc[project.status]) {
      acc[project.status] = [];
    }
    acc[project.status].push(project);
    return acc;
  }, {} as Record<string, Project[]>);

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {projectStatusColumns.map(column => (
          <div key={column.id} className="flex flex-col">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center space-x-2">
                {column.icon}
                <h3 className="text-sm font-medium">{column.name}</h3>
                <Badge variant="outline" className="ml-2">
                  {groupedProjects[column.id]?.length || 0}
                </Badge>
              </div>
              {column.id === 'planning' && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleNewProject}>
                  <Plus className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {isLoading ? (
                Array(3).fill(0).map((_, i) => (
                  <Card key={i} className="shadow-sm">
                    <CardContent className="p-4">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </CardContent>
                  </Card>
                ))
              ) : error ? (
                <Card>
                  <CardContent className="p-4 text-sm text-red-500">
                    Error loading projects
                  </CardContent>
                </Card>
              ) : groupedProjects[column.id]?.length ? (
                groupedProjects[column.id].map((project: Project) => (
                  <Card 
                    key={project.id} 
                    className="shadow-sm hover:shadow cursor-pointer"
                    onClick={() => handleViewProject(project.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">{project.name}</h4>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleViewProject(project.id);
                            }}>
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleEditProject(project.id);
                            }}>
                              Edit Project
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await handleDeleteProject(project.id);
                              }}
                              disabled={deletingId === project.id}
                            >
                              {deletingId === project.id ? 'Deleting...' : 'Delete Project'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {project.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {project.description.length > 100 
                            ? `${project.description.substring(0, 100)}...` 
                            : project.description}
                        </p>
                      )}
                      <div className="flex justify-between items-center mt-3">
                        <div className="text-xs text-muted-foreground">
                          Tasks: 0/0
                        </div>
                        <div className="flex -space-x-2">
                          {/* Placeholder for user avatars */}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="shadow-sm border-dashed">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <p className="text-xs text-muted-foreground">No projects in this status</p>
                    {column.id === 'planning' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2"
                        onClick={handleNewProject}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Project
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectsKanban;