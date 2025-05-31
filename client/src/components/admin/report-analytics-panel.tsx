// client/src/components/admin/report-analytics-panel.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from '@/components/ui/badge';

const ListItem: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
  <li className={`flex justify-between items-center p-3 rounded-md ${className}`}>
    {children}
  </li>
);

export function ReportAnalyticsPanel() { // Named export
  // TODO: Replace with actual data fetching and dynamic rendering
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Risk Assessment Analytics</CardTitle>
          <CardDescription>Overview of risk levels based on reports and station data.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-lg text-gray-800 dark:text-gray-200">Medium Risk Stations (32)</h3> {/* Placeholder */}
              <Button variant="link" size="sm">View All</Button>
            </div>
            <ul className="space-y-2">
              <ListItem className="bg-amber-50 dark:bg-amber-900/30">
                <span className="text-gray-700 dark:text-amber-200">Central District #4</span>
                <Badge variant="outline" className="text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-600">56% Risk Score</Badge>
              </ListItem>
              <ListItem className="bg-amber-50 dark:bg-amber-900/30">
                <span className="text-gray-700 dark:text-amber-200">Southern Zone #9</span>
                <Badge variant="outline" className="text-amber-700 border-amber-300 dark:text-amber-300 dark:border-amber-600">48% Risk Score</Badge>
              </ListItem>
              {/* Add more items or map over data */}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Risk Assessment Criteria</CardTitle>
          <CardDescription>Factors contributing to risk scores.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
            <li>Previous incidents reported</li>
            <li>Observer coverage gaps</li>
            <li>Accessibility issues</li>
            <li>Historical voter turnout</li>
            <li>Security concerns</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
