// client/src/components/admin/station-analytics-panel.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const RiskStationItem: React.FC<{ name: string, riskScore: string }> = ({ name, riskScore }) => (
  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-700 mb-2">
    <div className="flex justify-between items-center">
      <div>
        <div className="font-medium text-gray-800 dark:text-red-100">{name}</div>
        <div className="text-sm text-red-600 dark:text-red-300">Risk Score: {riskScore}</div>
      </div>
      <div>
        <Button variant="outline" size="sm">View Details</Button>
      </div>
    </div>
  </div>
);

export function StationAnalyticsPanel() { // Named export
  // TODO: Replace with actual data fetching and dynamic rendering
  return (
    <div>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Polling Station Analytics Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">14</div> {/* Placeholder */}
              <div className="text-sm text-gray-600 dark:text-gray-400">High Risk Stations</div>
            </div>
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">32</div> {/* Placeholder */}
              <div className="text-sm text-gray-600 dark:text-gray-400">Medium Risk Stations</div>
            </div>
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">78</div> {/* Placeholder */}
              <div className="text-sm text-gray-600 dark:text-gray-400">Low Risk Stations</div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <h4 className="font-medium text-lg text-gray-800 dark:text-gray-200">Station Coverage</h4>
            <div className="w-full h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: "82%" }}></div> {/* Placeholder */}
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>0%</span>
              <span>82% Coverage</span> {/* Placeholder */}
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>High Risk Stations</CardTitle>
          <CardDescription>Details for stations identified as high risk.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder Data - map over actual data in a real implementation */}
          <RiskStationItem name="Central High School" riskScore="8.7/10" />
          <RiskStationItem name="West Side Elementary" riskScore="8.2/10" />
          <RiskStationItem name="Memorial Stadium" riskScore="7.9/10" />
          <Button variant="secondary" className="w-full mt-4">View All High Risk Stations</Button>
        </CardContent>
      </Card>
    </div>
  );
}
