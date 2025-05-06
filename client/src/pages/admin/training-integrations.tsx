import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { TrainingIntegrationManager } from '@/components/admin/training-integration-manager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TrainingIntegrationsAdminPage: React.FC = () => {
  // Check for admin access
  const { data: userProfile, isLoading, error } = useQuery({
    queryKey: ['/api/users/profile'],
    queryFn: () => apiRequest('/api/users/profile'),
  });

  // Check if the user is an admin
  const isAdmin = userProfile?.user?.role === 'admin';

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // Access denied for non-admins
  if (!isAdmin) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <Button variant="ghost" asChild className="mb-6">
          <a href="#/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </a>
        </Button>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to access this page. This area is restricted to administrators only.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <Button variant="ghost" asChild className="mb-6">
        <a href="#/integrated-training">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Training Portal
        </a>
      </Button>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Training Integrations Administration</CardTitle>
          <CardDescription>
            Manage connections to external training systems like Moodle LMS and Zoom.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            From this page, you can set up and configure integrations with external learning management systems 
            and virtual meeting platforms. These integrations allow observers to access all their training materials
            in one centralized location.
          </p>
        </CardContent>
      </Card>
      
      <TrainingIntegrationManager />
    </div>
  );
};

export default TrainingIntegrationsAdminPage;