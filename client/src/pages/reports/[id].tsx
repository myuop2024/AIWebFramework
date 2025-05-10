import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useAuth } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  ArrowLeft, 
  FileEdit, 
  Trash2,
  MapPin,
  Calendar,
  Clock,
  User,
  CheckCircle,
  AlertTriangle,
  X,
} from "lucide-react";

export default function ReportDetail() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams();
  const reportId = params.id ? parseInt(params.id) : undefined;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !authLoading) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  // Fetch report detail
  const { data: report, isLoading: isReportLoading } = useQuery({
    queryKey: [`/api/reports/${reportId}`],
    enabled: !!reportId,
  });

  // Generate report ID string
  const generateReportId = (id: number) => {
    return `#RPT-${id.toString().padStart(4, '0')}`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time
  const formatTime = (dateString: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format report type
  const formatReportType = (type: string) => {
    if (!type) return "—";
    switch (type) {
      case 'standardObservation':
        return 'Standard Observation';
      case 'incidentReport':
        return 'Incident Report';
      case 'openingProcedures':
        return 'Opening Procedures';
      case 'closingProcedures':
        return 'Closing Procedures';
      default:
        return type.replace(/([A-Z])/g, ' $1').trim();
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    if (!status) return <Badge variant="outline">Unknown</Badge>;
    switch (status.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      case 'under review':
      case 'submitted':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          {status === 'submitted' ? 'Under Review' : status}
        </Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format voter turnout
  const formatVoterTurnout = (turnout: string) => {
    if (!turnout) return "—";
    const labels: Record<string, string> = {
      veryLow: "Very Low",
      low: "Low",
      medium: "Medium",
      high: "High",
      veryHigh: "Very High"
    };
    return labels[turnout] || turnout;
  };

  // Format queue length
  const formatQueueLength = (length: string) => {
    if (!length) return "—";
    const labels: Record<string, string> = {
      none: "No Queue",
      short: "Short (1-5 people)",
      moderate: "Moderate (6-15 people)",
      long: "Long (16-30 people)",
      veryLong: "Very Long (30+ people)"
    };
    return labels[length] || length;
  };

  // Format accessibility
  const formatAccessibility = (access: string) => {
    if (!access) return "—";
    const labels: Record<string, string> = {
      poor: "Poor - Significant barriers for disabled voters",
      fair: "Fair - Some barriers but mostly accessible",
      good: "Good - Easily accessible for all voters",
      excellent: "Excellent - Complete accessibility with additional accommodations"
    };
    return labels[access] || access;
  };

  if (authLoading || isReportLoading || !reportId) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-9 w-20" />
          </div>
          <Skeleton className="h-4 w-full mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Mock report data if report is not found
  const reportData = report || {
    id: reportId,
    reportType: "standardObservation",
    stationId: 1,
    station: {
      name: "Unknown Station",
      address: "Address not available",
      city: "Unknown",
      state: "Unknown"
    },
    status: "submitted",
    submittedAt: new Date().toISOString(),
    content: {
      observationTime: new Date().toISOString(),
      voterTurnout: "medium",
      queueLength: "short",
      stationAccessibility: "good",
      issuesObserved: [],
      additionalNotes: "No additional notes available"
    },
    mileageTraveled: 0
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center mb-1">
              <Button 
                variant="ghost" 
                size="sm" 
                className="p-0 mr-2 h-8 w-8"
                onClick={() => navigate("/reports")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-2xl">
                {generateReportId(reportData.id)}
              </CardTitle>
              <div className="ml-4">
                {getStatusBadge(reportData.status)}
              </div>
            </div>
            <CardDescription>
              Submitted on {formatDate(reportData.submittedAt)} at {formatTime(reportData.submittedAt)}
            </CardDescription>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <FileEdit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Report Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-4">Report Details</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-primary mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Report Type</p>
                    <p className="font-medium">{formatReportType(reportData.reportType)}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Polling Station</p>
                    <p className="font-medium">{reportData.station?.name || `Station #${reportData.stationId}`}</p>
                    <p className="text-sm text-gray-500">
                      {reportData.station?.address}, {reportData.station?.city}, {reportData.station?.state}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-primary mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Observation Date & Time</p>
                    <p className="font-medium">
                      {formatDate(reportData.content?.observationTime)} at {formatTime(reportData.content?.observationTime)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <User className="h-5 w-5 text-primary mt-0.5 mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Observer</p>
                    <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                    <p className="text-sm text-gray-500">ID: {user?.observerId}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4">Observation Details</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Voter Turnout</p>
                    <p className="font-medium">{formatVoterTurnout(reportData.content?.voterTurnout)}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Queue Length</p>
                    <p className="font-medium">{formatQueueLength(reportData.content?.queueLength)}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Station Accessibility</p>
                  <p className="font-medium">{formatAccessibility(reportData.content?.stationAccessibility)}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Distance Traveled</p>
                  <p className="font-medium">{reportData.mileageTraveled ? `${reportData.mileageTraveled} miles` : 'Not recorded'}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Check-in/Check-out</p>
                  <div className="flex items-center mt-1">
                    <div className="flex items-center mr-4">
                      <Clock className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm">
                        {reportData.checkinTime ? formatTime(reportData.checkinTime) : 'Not checked in'}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm">
                        {reportData.checkoutTime ? formatTime(reportData.checkoutTime) : 'Not checked out'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <Separator />
          
          {/* Issues Observed */}
          <div>
            <h3 className="text-lg font-medium mb-4">Issues Observed</h3>
            
            {!reportData.content?.issuesObserved || reportData.content.issuesObserved.length === 0 ? (
              <div className="flex items-center p-4 border rounded-md bg-gray-50">
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                <p className="text-gray-600">No issues were reported during this observation.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportData.content.issuesObserved.map((issue: string, index: number) => (
                    <div key={index} className="flex items-start p-3 border rounded-md">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 mt-0.5" />
                      <div>
                        <p className="font-medium">{issue}</p>
                        {issue === 'other' && reportData.content.otherIssuesDetails && (
                          <p className="text-sm text-gray-600 mt-1">{reportData.content.otherIssuesDetails}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Additional Notes */}
          {reportData.content?.additionalNotes && (
            <div>
              <h3 className="text-lg font-medium mb-4">Additional Notes</h3>
              <div className="p-4 border rounded-md bg-gray-50">
                <p className="text-gray-600 whitespace-pre-line">{reportData.content.additionalNotes}</p>
              </div>
            </div>
          )}
          
          {/* Report Status History */}
          <div>
            <h3 className="text-lg font-medium mb-4">Status History</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>{formatDate(reportData.submittedAt)}</TableCell>
                  <TableCell>
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Submitted</Badge>
                  </TableCell>
                  <TableCell>{user?.firstName} {user?.lastName}</TableCell>
                  <TableCell>Initial submission</TableCell>
                </TableRow>
                {reportData.status !== 'submitted' && (
                  <TableRow>
                    <TableCell>{formatDate(reportData.reviewedAt || new Date().toISOString())}</TableCell>
                    <TableCell>
                      {getStatusBadge(reportData.status)}
                    </TableCell>
                    <TableCell>Admin</TableCell>
                    <TableCell>Status updated after review</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between border-t p-6">
          <Button 
            variant="outline" 
            onClick={() => navigate("/reports")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reports
          </Button>
          <Button 
            onClick={() => navigate("/reports/new")}
          >
            <FileText className="h-4 w-4 mr-2" />
            Submit New Report
          </Button>
        </CardFooter>
      </Card>
    </MainLayout>
  );
}
