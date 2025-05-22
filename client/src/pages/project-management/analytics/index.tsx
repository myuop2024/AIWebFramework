import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import ProjectAnalytics from '@/components/project-management/project-analytics';

const AnalyticsPage: React.FC = () => {
  return (
    <div className="container p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <Link href="/project-management">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Project Analytics</h1>
        </div>
        <Link href="/project-management/new">
          <Button>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      </div>
      
      <ProjectAnalytics />
    </div>
  );
};

export default AnalyticsPage; 