import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  Plus, 
  Search, 
  Calendar, 
  ClipboardList,
  FileBarChart,
  CheckCircle,
  AlertTriangle,
  Clock,
  Filter
} from "lucide-react";

export default function Reports() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !isLoading) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  // Fetch reports
  const { data: reports, isLoading: isReportsLoading } = useQuery({
    queryKey: ['/api/reports'],
  });

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

  // Format report type
  const formatReportType = (type: string) => {
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

  // Filter reports
  const filteredReports = reports?.filter(report => {
    // Status filter
    if (statusFilter !== 'all' && report.status.toLowerCase() !== statusFilter) {
      return false;
    }
    
    // Type filter
    if (typeFilter !== 'all' && report.reportType !== typeFilter) {
      return false;
    }
    
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const reportId = generateReportId(report.id).toLowerCase();
      const stationName = report.station?.name?.toLowerCase() || '';
      const reportType = report.reportType?.toLowerCase() || '';
      
      return (
        reportId.includes(query) ||
        stationName.includes(query) ||
        reportType.includes(query)
      );
    }
    
    return true;
  });

  if (isLoading || isReportsLoading) {
    return (
      <MainLayout>
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-10 w-32" />
            </div>
            <Skeleton className="h-4 w-full mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Observer Reports</CardTitle>
              <CardDescription>
                Manage and view your submitted reports
              </CardDescription>
            </div>
            <Button onClick={() => navigate("/reports/new")}>
              <Plus className="h-4 w-4 mr-2" />
              New Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
              <TabsList>
                <TabsTrigger value="all">All Reports</TabsTrigger>
                <TabsTrigger value="drafts">Drafts</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              
              <div className="flex w-full md:w-auto flex-col md:flex-row gap-2">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="search"
                    placeholder="Search reports..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px]">
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        <span>Status</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="submitted">Under Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[130px]">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2" />
                        <span>Type</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="standardObservation">Standard</SelectItem>
                      <SelectItem value="incidentReport">Incident</SelectItem>
                      <SelectItem value="openingProcedures">Opening</SelectItem>
                      <SelectItem value="closingProcedures">Closing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <TabsContent value="all">
              {!reports || reports.length === 0 ? (
                <div className="rounded-md border py-16 text-center">
                  <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Reports Found</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-6">
                    You haven't submitted any reports yet. Create your first observation report by 
                    clicking the button below.
                  </p>
                  <Button onClick={() => navigate("/reports/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Report
                  </Button>
                </div>
              ) : !filteredReports || filteredReports.length === 0 ? (
                <div className="rounded-md border py-16 text-center">
                  <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Matching Reports</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-4">
                    No reports match your current filters or search query.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setTypeFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report ID</TableHead>
                        <TableHead>Polling Station</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                        <TableHead className="hidden md:table-cell">Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium">
                            {generateReportId(report.id)}
                          </TableCell>
                          <TableCell>
                            {report.station?.name || `Station #${report.stationId}`}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatDate(report.submittedAt)}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {formatReportType(report.reportType)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(report.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/reports/${report.id}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="drafts">
              <div className="rounded-md border py-16 text-center">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No Draft Reports</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  The draft reports feature will be available in a future update.
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="analytics">
              <div className="rounded-md border py-16 text-center">
                <FileBarChart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">Report Analytics</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Report analytics and visualization features will be available in a future update.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
