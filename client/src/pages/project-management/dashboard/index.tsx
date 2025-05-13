import React from 'react';
import { useLocation } from 'wouter';
import { AuthGuard } from '@/components/auth/auth-guard';
import ProjectDashboardWidgets from '@/components/project-management/dashboard-widgets';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid } from 'lucide-react';

// Dashboard content component
const ProjectDashboardContent: React.FC = () => {
  const [, setLocation] = useLocation();

  const handleCreateProject = () => {
    setLocation('/project-management/new');
  };

  return (
    <div className="container p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <LayoutGrid className="mr-2 h-8 w-8 text-primary" />
            Project Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor project health, track progress, and manage resources
          </p>
        </div>
        <Button onClick={handleCreateProject}>
          <Plus className="h-4 w-4 mr-2" />
          Create Project
        </Button>
      </div>

      <ProjectDashboardWidgets />
    </div>
  );
};

// Wrap the dashboard component in AuthGuard
const ProjectDashboard: React.FC = () => {
  return (
    <AuthGuard>
      <ProjectDashboardContent />
    </AuthGuard>
  );
};

export default ProjectDashboard;