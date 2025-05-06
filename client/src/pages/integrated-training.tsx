import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { IntegratedTrainingList } from '@/components/training/integrated-training-list';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { CalendarDays, BookOpen, School, MessageCircle } from 'lucide-react';

const IntegratedTrainingPage: React.FC = () => {
  // Fetch user profile to check role for admin options
  const { data: profileData, isLoading: loadingProfile } = useQuery({
    queryKey: ['/api/users/profile'],
    queryFn: () => apiRequest('/api/users/profile'),
  });
  
  const isAdmin = profileData?.user?.role === 'admin';

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Training Portal</h1>
          <p className="text-muted-foreground">
            Access all your training materials and courses in one place
          </p>
        </div>
        
        {isAdmin && (
          <Button asChild className="self-start">
            <a href="#/admin/training-integrations">
              Manage Integrations
            </a>
          </Button>
        )}
      </div>
      
      {/* Training Quick Info Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14</div>
            <p className="text-xs text-muted-foreground">From Moodle and internal sources</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">Scheduled for this week</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68%</div>
            <p className="text-xs text-muted-foreground">+5.2% from last month</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Support</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24/7</div>
            <p className="text-xs text-muted-foreground">Training support available</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content */}
      {loadingProfile ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : (
        <IntegratedTrainingList />
      )}
    </div>
  );
};

export default IntegratedTrainingPage;