import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Report } from "@shared/schema";

export default function RecentReports() {
  const { data: reports, isLoading, error } = useQuery<Report[]>({
    queryKey: ['/api/reports'],
    queryFn: async () => {
      // It's good practice to fetch a limited number of reports for the dashboard view.
      // The API should support a limit, e.g., /api/reports?limit=5&sortBy=submittedAt&order=desc
      // For now, assuming the API returns all reports and we slice later, or it defaults to recent ones.
      const response = await fetch('/api/reports?limit=3&sortBy=submittedAt&order=desc'); // Added limit and sorting
      if (!response.ok) {
        throw new Error('Network response was not ok when fetching recent reports');
      }
      return response.json();
    },
    // Optional: Add staleTime, e.g., staleTime: 5 * 60 * 1000 (5 minutes)
  });

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Generate report ID
  const generateReportId = (id: number) => {
    return `#RPT-${id.toString().padStart(4, '0')}`;
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{status}</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{status}</Badge>;
      case 'under review':
      case 'submitted':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">{status === 'submitted' ? 'Under Review' : status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report ID</TableHead>
                  <TableHead>Polling Station</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3].map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <Skeleton className="h-4 w-32" />
        </CardFooter>
      </Card>
    );
  }

  if (error) {
    const axiosError = error as any;
    const errorMsg = axiosError?.response?.data?.error || axiosError?.data?.error || axiosError?.message || "Please try again later.";
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Recent Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading reports: {errorMsg}</p>
        </CardContent>
      </Card>
    );
  }

  // No reports
  if (!reports || reports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Recent Reports</CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center">
          <p className="text-gray-500">No reports submitted yet.</p>
        </CardContent>
        <CardFooter className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <Link href="/reports/new" className="text-sm font-medium text-primary hover:text-primary-dark">
            Submit New Report
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-6 py-4 border-b border-gray-200">
        <CardTitle className="text-lg font-medium">Recent Reports</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 py-3">Report ID</TableHead>
                <TableHead className="px-6 py-3">Polling Station</TableHead>
                <TableHead className="px-6 py-3">Date</TableHead>
                <TableHead className="px-6 py-3">Status</TableHead>
                <TableHead className="px-6 py-3">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.isArray(reports) && reports.slice(0, 3).map((report: Report) => (
                <TableRow key={report.id}>
                  <TableCell className="px-6 py-4 whitespace-nowrap font-medium">
                    {generateReportId(report.id)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    {report.station?.name || `Station #${report.stationId}`}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    {formatDate(report.submittedAt)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(report.status)}
                  </TableCell>
                  <TableCell className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/reports/${report.id}`} className="text-primary hover:text-primary-dark">
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <CardFooter className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <Link href="/reports" className="text-sm font-medium text-primary hover:text-primary-dark">
          View all reports
        </Link>
      </CardFooter>
    </Card>
  );
}
