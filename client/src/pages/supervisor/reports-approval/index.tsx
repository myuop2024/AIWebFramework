import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  FileText, 
  CheckSquare,
  XCircle,
  AlertTriangle,
  FileSearch,
  MessageSquare,
  ImageIcon,
  Clock,
  Filter
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Report interface
interface Report {
  id: number;
  reporterId: number;
  reporterName: string;
  stationId: number;
  stationName: string;
  type: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'requires_update';
  createdAt: string;
  attachments?: number;
  reporterAvatar?: string;
}

export default function ReportsApprovalPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [reportViewOpen, setReportViewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);

  // Fetch pending reports
  const { data: reports, isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ['/api/supervisor/pending-reports'],
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error fetching reports',
        description: error.message
      });
    }
  });

  // Approve report mutation
  const approveReportMutation = useMutation({
    mutationFn: async (reportId: number) => {
      const res = await apiRequest('PATCH', `/api/reports/${reportId}/approve`, {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Report approved',
        description: 'The report has been approved successfully'
      });
      // Refetch reports list
      queryClient.invalidateQueries({ queryKey: ['/api/supervisor/pending-reports'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error approving report',
        description: error.message
      });
    }
  });

  // Reject report mutation
  const rejectReportMutation = useMutation({
    mutationFn: async ({ reportId, feedback }: { reportId: number; feedback: string }) => {
      const res = await apiRequest('PATCH', `/api/reports/${reportId}/reject`, { feedback });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Report rejected',
        description: 'The report has been rejected with feedback'
      });
      // Refetch reports list
      queryClient.invalidateQueries({ queryKey: ['/api/supervisor/pending-reports'] });
      setFeedbackDialogOpen(false);
      setFeedbackText('');
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error rejecting report',
        description: error.message
      });
    }
  });

  // Request update mutation
  const requestUpdateMutation = useMutation({
    mutationFn: async ({ reportId, feedback }: { reportId: number; feedback: string }) => {
      const res = await apiRequest('PATCH', `/api/reports/${reportId}/request-update`, { feedback });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Update requested',
        description: 'The observer has been asked to update the report'
      });
      // Refetch reports list
      queryClient.invalidateQueries({ queryKey: ['/api/supervisor/pending-reports'] });
      setFeedbackDialogOpen(false);
      setFeedbackText('');
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error requesting update',
        description: error.message
      });
    }
  });

  // Open the report view dialog
  const viewReport = (report: Report) => {
    setSelectedReport(report);
    setReportViewOpen(true);
  };

  // Open the feedback dialog
  const openFeedbackDialog = (report: Report, actionType: 'reject' | 'update') => {
    setSelectedReport(report);
    setFeedbackText('');
    setFeedbackDialogOpen(true);
  };

  // Approve report
  const handleApproveReport = (reportId: number) => {
    approveReportMutation.mutate(reportId);
  };

  // Submit feedback
  const submitFeedback = (actionType: 'reject' | 'update') => {
    if (!selectedReport) return;

    if (!feedbackText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Feedback required',
        description: 'Please provide feedback before submitting'
      });
      return;
    }

    if (actionType === 'reject') {
      rejectReportMutation.mutate({ 
        reportId: selectedReport.id, 
        feedback: feedbackText 
      });
    } else {
      requestUpdateMutation.mutate({ 
        reportId: selectedReport.id, 
        feedback: feedbackText 
      });
    }
  };

  // Filter reports based on search term and priority filter
  const filteredReports = reports?.filter(report => {
    const matchesSearch = 
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.stationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = priorityFilter === 'all' || report.priority === priorityFilter;
    
    return matchesSearch && matchesPriority;
  });

  // Function to get priority badge color
  const getPriorityBadgeColor = (priority: string): string => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
      default:
        return 'bg-green-500';
    }
  };

  if (reportsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Report Approvals</h1>
        <Button variant="outline">
          <CheckSquare className="mr-2 h-4 w-4" />
          Bulk Approve
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Reports</CardTitle>
          <CardDescription>
            Review and approve reports submitted by your team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Input
                  placeholder="Search reports..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={priorityFilter}
                onValueChange={setPriorityFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Polling Station</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports && filteredReports.length > 0 ? (
                  filteredReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={report.reporterAvatar} />
                            <AvatarFallback>{report.reporterName.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{report.reporterName}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium truncate max-w-[200px]">
                          {report.title}
                        </div>
                      </TableCell>
                      <TableCell>{report.stationName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{report.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityBadgeColor(report.priority)}>
                          {report.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(report.createdAt), "PP")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => viewReport(report)}
                                >
                                  <FileSearch className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>View Details</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openFeedbackDialog(report, 'update')}
                                >
                                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Request Update</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openFeedbackDialog(report, 'reject')}
                                >
                                  <XCircle className="h-4 w-4 text-red-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Reject Report</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleApproveReport(report.id)}
                                >
                                  <CheckSquare className="h-4 w-4 text-green-500" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Approve Report</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6">
                      {searchTerm || priorityFilter !== 'all' ? (
                        <p>No reports match your filters</p>
                      ) : (
                        <div className="flex flex-col items-center">
                          <FileText className="h-12 w-12 text-gray-300 mb-2" />
                          <p>No pending reports found</p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Report View Dialog */}
      <Dialog open={reportViewOpen} onOpenChange={setReportViewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedReport?.title}</DialogTitle>
            <DialogDescription>
              Report submitted by {selectedReport?.reporterName} on {selectedReport?.createdAt ? format(new Date(selectedReport.createdAt), "PPP p") : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Tabs defaultValue="details">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="attachments">Attachments</TabsTrigger>
                <TabsTrigger value="activity">Activity Log</TabsTrigger>
              </TabsList>
              <TabsContent value="details" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Report Type</h3>
                    <p className="mt-1">{selectedReport?.type}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Priority</h3>
                    <p className="mt-1">
                      <Badge className={selectedReport?.priority ? getPriorityBadgeColor(selectedReport?.priority) : ''}>
                        {selectedReport?.priority}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Polling Station</h3>
                    <p className="mt-1">{selectedReport?.stationName}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Report ID</h3>
                    <p className="mt-1">{selectedReport?.id}</p>
                  </div>
                </div>
                
                <div className="pt-2">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Report Content</h3>
                  <div className="border rounded-md p-4 bg-gray-50 whitespace-pre-wrap">
                    {selectedReport?.content}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="attachments">
                <div className="py-4 text-center">
                  <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">
                    {selectedReport?.attachments ? 
                      `This report has ${selectedReport.attachments} attachments` : 
                      'No attachments for this report'}
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="activity">
                <div className="py-4 text-center">
                  <Clock className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Activity log not available for this report</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
          <DialogFooter>
            <div className="flex space-x-2 w-full justify-between">
              <Button 
                variant="outline" 
                onClick={() => setReportViewOpen(false)}
              >
                Close
              </Button>
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setReportViewOpen(false);
                    openFeedbackDialog(selectedReport!, 'reject');
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4 text-red-500" />
                  Reject
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setReportViewOpen(false);
                    openFeedbackDialog(selectedReport!, 'update');
                  }}
                >
                  <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" />
                  Request Update
                </Button>
                <Button 
                  onClick={() => {
                    handleApproveReport(selectedReport!.id);
                    setReportViewOpen(false);
                  }}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Approve
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Provide Feedback</DialogTitle>
            <DialogDescription>
              Explain why this report needs attention or changes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Textarea
              placeholder="Enter your feedback here..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setFeedbackDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => submitFeedback(selectedReport?.status === 'rejected' ? 'reject' : 'update')}
              disabled={rejectReportMutation.isPending || requestUpdateMutation.isPending}
            >
              {(rejectReportMutation.isPending || requestUpdateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}