// client/src/components/admin/training-management-panel.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type TrainingModuleStatusType = "default" | "destructive" | "outline" | "secondary" | "success";

const TrainingModuleCard: React.FC<{ title: string, status: string, completionRate: number, lastUpdated: string, statusType?: TrainingModuleStatusType, description?: string }> =
({ title, status, completionRate, lastUpdated, statusType = "success", description }) => (
  <Card className="mb-4">
    <CardHeader className="pb-3">
      <div className="flex justify-between items-start">
        <CardTitle className="text-lg">{title}</CardTitle>
        <Badge variant={statusType === "success" ? "default" : statusType} className={statusType === "success" ? "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600" : ""}>{status}</Badge>
      </div>
      {description && <CardDescription>{description}</CardDescription>}
      <CardDescription>Last updated: {lastUpdated}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="mb-3">
        <div className="flex justify-between text-sm text-muted-foreground mb-1">
          <span>Completion Rate</span>
          <span>{completionRate}%</span>
        </div>
        <Progress value={completionRate} className="h-2" />
      </div>
      <div className="flex flex-wrap gap-2"> {/* Use flex-wrap for better responsiveness */}
        <Button size="sm">Edit</Button>
        <Button size="sm" variant="outline">
          {status === "Active" ? "Disable" : "Enable"}
        </Button>
        <Button size="sm" variant="default" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white">
            View Completions
        </Button>
      </div>
    </CardContent>
  </Card>
);

export function TrainingManagementPanel() { // Named export
  // TODO: Replace with actual data
  const modules = [
    { title: "Observer Fundamentals", status: "Active", completionRate: 87, lastUpdated: "April 15, 2025", statusType: "success" as TrainingModuleStatusType, description: "Required for all observers." },
    { title: "Reporting Procedures", status: "Active", completionRate: 76, lastUpdated: "April 20, 2025", statusType: "success" as TrainingModuleStatusType, description: "Covers all report types and submission guidelines." },
    { title: "Conflict Resolution", status: "Optional", completionRate: 62, lastUpdated: "March 10, 2025", statusType: "outline" as TrainingModuleStatusType, description: "Recommended for supervisors and team leads." },
    { title: "Advanced Techniques", status: "Draft", completionRate: 0, lastUpdated: "May 1, 2025", statusType: "secondary" as TrainingModuleStatusType, description: "For experienced observers." },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Training Modules</h2>
        <Button>Add New Module</Button>
      </div>
      <div className="space-y-4">
        {modules.map((module, index) => (
          <TrainingModuleCard key={index} {...module} />
        ))}
      </div>
    </div>
  );
}
