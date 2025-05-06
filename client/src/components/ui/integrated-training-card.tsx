import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, BookOpenCheck, Layers } from 'lucide-react';

export const IntegratedTrainingCard: React.FC = () => {
  return (
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-all border-accent/40">
      <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/5 pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center">
              <Layers className="h-5 w-5 mr-2 text-primary" />
              Integrated Training Portal
            </CardTitle>
            <CardDescription>Access all your training in one place</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-2">
        <div className="space-y-3">
          <div className="flex items-start">
            <BookOpen className="h-5 w-5 mr-2 text-muted-foreground" />
            <div>
              <h4 className="text-sm font-medium">External Courses</h4>
              <p className="text-sm text-muted-foreground">
                Connect to Moodle LMS courses directly
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <BookOpenCheck className="h-5 w-5 mr-2 text-muted-foreground" />
            <div>
              <h4 className="text-sm font-medium">Zoom Integration</h4>
              <p className="text-sm text-muted-foreground">
                Join live training sessions with a single click
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0 flex justify-end">
        <Button asChild variant="default" size="sm">
          <a href="#/integrated-training">
            Open Integrated Portal <ArrowRight className="ml-1 h-4 w-4" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
};