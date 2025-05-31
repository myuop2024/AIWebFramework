// client/src/components/admin/report-management-panel.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type ReportStatusType = "default" | "destructive" | "outline" | "secondary" | "warning" | "success";

const ReportItemCard: React.FC<{title: string, station: string, submittedBy: string, date: string, status: string, statusType?: ReportStatusType }> =
({ title, station, submittedBy, date, status, statusType = "outline" }) => {
  let badgeVariant: ReportStatusType = statusType;
  // Map semantic statusType to actual Badge variants if needed, or rely on direct mapping
  // For example, 'warning' might map to 'destructive' if 'warning' isn't a direct Badge variant.
  // The provided example uses 'destructive' for 'warning' (amber color), and 'default' for 'success' (green color).
  // Let's adjust based on typical Badge variants or assume custom styling is handled by these variant names.
  // Shadcn typically has: default, secondary, destructive, outline.
  // We might need to use specific background/text color classes for "warning" (amber) and "success" (green) if variants don't match.

  let computedClassName = "";
  switch (statusType) {
    case "warning": // Typically amber/yellow
      badgeVariant = "outline"; // Or 'default' and then add custom color classes
      computedClassName = "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-700/30 dark:text-amber-300 dark:border-amber-600";
      break;
    case "success": // Typically green
      badgeVariant = "outline"; // Or 'default'
      computedClassName = "bg-green-100 text-green-800 border-green-300 dark:bg-green-700/30 dark:text-green-300 dark:border-green-600";
      break;
    case "destructive": // Typically red
      badgeVariant = "destructive"; // This should apply red styling by default
      break;
    default:
      badgeVariant = "outline";
      break;
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant={badgeVariant} className={computedClassName}>{status}</Badge>
        </div>
        <CardDescription>
          Station: {station} | Submitted by: {submittedBy} | Date: {date}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          {/* Assuming Button has a 'success' variant or similar, or we use default + custom styling */}
          <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700 text-white">Approve</Button>
          <Button size="sm" variant="destructive">Reject</Button>
          <Button size="sm">Review Details</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export function ReportManagementPanel() { // Named export
  // TODO: Replace with actual data and filtering logic
  const reports = [
    { title: "Incident Report #143", station: "Main City Hall", submittedBy: "John Smith", date: "May 4, 2025 (2:34 PM)", status: "Pending Review", statusType: "warning" as ReportStatusType },
    { title: "Observer Report #144", station: "Central Community Center", submittedBy: "Sarah Wilson", date: "May 4, 2025 (3:15 PM)", status: "Flagged", statusType: "destructive" as ReportStatusType },
    { title: "Routine Check #145", station: "East Suburb Library", submittedBy: "Alice Brown", date: "May 4, 2025 (4:00 PM)", status: "Approved", statusType: "success" as ReportStatusType },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Reports Requiring Review (18)</h2> {/* Placeholder count */}
        <div>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter reports" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
              <SelectItem value="flagged">Flagged Issues</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {reports.map((report, index) => (
        <ReportItemCard key={index} {...report} />
      ))}
      {/* TODO: Add pagination if necessary */}
    </div>
  );
}
