import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle, BugOff, Check, ChevronDown, ChevronUp, Clock, Code, FileText,
  Filter, RotateCcw, Search, Server, Smartphone, Trash2, User
} from 'lucide-react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { queryClient, apiRequest } from '@/lib/queryClient';
import TestErrorLogger from '@/components/error/test-error-logger';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { type ErrorLog } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

// Types for filtering
interface FilterOptions {
  source?: string;
  level?: string;
  userId?: number;
  resolved?: boolean | string; // Allow string type for API query parameters
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

function ErrorLogsPage() {
  // State for filtering and pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [filters, setFilters] = useState<FilterOptions>({});
  const [showTestComponent, setShowTestComponent] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const { toast } = useToast();

  // Handle tab changes
  React.useEffect(() => {
    // Update filters based on active tab
    if (activeTab === 'resolved') {
      setFilters(f => ({ ...f, resolved: 'true' as string }));
    } else if (activeTab === 'unresolved') {
      setFilters(f => ({ ...f, resolved: 'false' as string }));
    } else {
      // For 'all' tab, remove resolved filter
      setFilters(f => {
        const newFilters = { ...f };
        delete newFilters.resolved;
        return newFilters;
      });
    }
    // Reset to page 1 when changing tabs
    setPage(1);
  }, [activeTab]);

  // Fetch error logs
  const { data, isLoading, error, refetch } = useQuery<{data: ErrorLog[], pagination: any}>({
    queryKey: ['/api/admin/error-logs', page, limit, filters],
    queryFn: async () => {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== undefined)
        )
      });

      try {
        const res = await apiRequest('GET', `/api/admin/error-logs?${queryParams.toString()}`);
        return await res.json();
      } catch (error) {
        console.error('Error fetching error logs:', error);
        throw error;
      }
    }
  });

  // Mutation for resolving an error log
  const resolveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      try {
        const res = await apiRequest('POST', `/api/admin/error-logs/${id}/resolve`, {
          notes
        });
        return await res.json();
      } catch (error) {
        console.error('Error resolving log:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/error-logs'] });
      setIsDialogOpen(false);
      setResolutionNotes('');
    },
    onError: (error) => {
      console.error('Failed to resolve error log:', error);
      // Display an error toast
      toast({
        title: "Error",
        description: "Failed to mark error as resolved. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Mutation for deleting error logs
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      try {
        await apiRequest('DELETE', `/api/admin/error-logs/${id}`);
      } catch (error) {
        console.error('Error deleting log:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/error-logs'] });
    },
    onError: (error) => {
      console.error('Failed to delete error log:', error);
      // Display an error toast
      toast({
        title: "Error",
        description: "Failed to delete error log. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Helper function for formatting dates
  const formatDate = (dateStr: string | Date) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', 
      month: 'short', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    }).format(date);
  };

  // Helper for level badge coloring
  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return <Badge variant="destructive">{level}</Badge>;
      case 'warning':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">{level}</Badge>;
      case 'info':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">{level}</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  // Helper for source icon
  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'client':
      case 'react-error-boundary':
      case 'window-onerror':
        return <Smartphone className="h-4 w-4" />;
      case 'server':
      case 'express':
        return <Server className="h-4 w-4" />;
      case 'websocket':
        return <Code className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Pagination component
  const renderPagination = () => {
    if (!data || !data.data || data.data.length === 0) return null;

    const totalPages = data.pagination?.totalPages || Math.ceil((data.data.length || 10) / limit);

    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <Button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              variant="outline"
              size="icon"
              className="h-8 w-8"
            >
              <ChevronDown className="h-4 w-4 rotate-90" />
            </Button>
          </PaginationItem>

          {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
            const pageNum = i + 1;
            return (
              <PaginationItem key={i}>
                <PaginationLink 
                  isActive={page === pageNum}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          {totalPages > 5 && (
            <>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>

              <PaginationItem>
                <PaginationLink onClick={() => setPage(totalPages)}>
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}

          <PaginationItem>
            <Button 
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
              variant="outline"
              size="icon"
              className="h-8 w-8"
            >
              <ChevronDown className="h-4 w-4 -rotate-90" />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

    // Handle dialog close
    const handleDialogClose = () => {
        setIsDialogOpen(false);
        setSelectedLog(null);
        setResolutionNotes('');
    };

  // Handle viewing error details
  const handleViewDetails = (log: ErrorLog) => {
    try {
      setSelectedLog(log);
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error viewing log details:', error);
      toast({
        title: "Error",
        description: "Failed to open error details. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load error logs. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Error Logs</h1>
            <p className="text-muted-foreground">Monitor and manage system errors</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              className="flex items-center"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            <Button 
              variant="outline" 
              onClick={() => setShowTestComponent(!showTestComponent)}
              className="flex items-center"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              {showTestComponent ? 'Hide Test Tool' : 'Test Error Logger'}
            </Button>
          </div>
        </div>

        {showTestComponent && (
          <div className="mb-6">
            <TestErrorLogger />
          </div>
        )}

        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <TabsList className="mb-4 md:mb-0">
              <TabsTrigger value="all">All Errors</TabsTrigger>
              <TabsTrigger value="unresolved">Unresolved</TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Input 
                placeholder="Search error logs..." 
                className="max-w-xs"
                value={filters.searchTerm || ''}
                onChange={(e) => setFilters(f => ({ ...f, searchTerm: e.target.value }))}
              />

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Filter Error Logs</DialogTitle>
                    <DialogDescription>
                      Apply filters to narrow down the error logs.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="error-level" className="text-right">
                        Level
                      </Label>
                      <Select 
                        value={filters.level || ''} 
                        onValueChange={(value) => setFilters(f => ({ ...f, level: value || undefined }))}
                      >
                        <SelectTrigger id="error-level" className="col-span-3">
                          <SelectValue placeholder="All levels" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_levels">All levels</SelectItem>
                          <SelectItem value="error">Error</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="info">Info</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="error-source" className="text-right">
                        Source
                      </Label>
                      <Select 
                        value={filters.source || ''} 
                        onValueChange={(value) => setFilters(f => ({ ...f, source: value || undefined }))}
                      >
                        <SelectTrigger id="error-source" className="col-span-3">
                          <SelectValue placeholder="All sources" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_sources">All sources</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="server">Server</SelectItem>
                          <SelectItem value="express">Express</SelectItem>
                          <SelectItem value="websocket">WebSocket</SelectItem>
                          <SelectItem value="react-error-boundary">React Error Boundary</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="date-from" className="text-right">
                        From Date
                      </Label>
                      <Input
                        id="date-from"
                        type="date"
                        className="col-span-3"
                        value={filters.startDate || ''}
                        onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value || undefined }))}
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="date-to" className="text-right">
                        To Date
                      </Label>
                      <Input
                        id="date-to"
                        type="date"
                        className="col-span-3"
                        value={filters.endDate || ''}
                        onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value || undefined }))}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setFilters({})}
                    >
                      Reset
                    </Button>
                    <Button type="submit">Apply Filters</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-[100px]">Level</TableHead>
                    <TableHead className="w-[100px]">Source</TableHead>
                    <TableHead className="w-[80px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        Loading error logs...
                      </TableCell>
                    </TableRow>
                  ) : data && data.data && data.data.length > 0 ? (
                    data.data.map((log: ErrorLog) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          <span className="flex items-center">
                            <Clock className="mr-2 h-4 w-4 text-gray-400" />
                            {formatDate(log.timestamp || new Date())}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium truncate max-w-[400px]" title={log.message}>
                            {log.message}
                          </div>
                          {log.resolved && (
                            <div className="text-xs flex items-center text-green-600 mt-1">
                              <Check className="h-3 w-3 mr-1" />
                              Resolved
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{getLevelBadge(log.level)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getSourceIcon((log.metadata as any)?.source || 'unknown')}
                            <span className="text-xs">{(log.metadata as any)?.source || 'unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewDetails(log)}
                              title="View Details"
                            >
                              <Search className="h-4 w-4" />
                            </Button>

                            {!log.resolved && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedLog(log);
                                  setIsDialogOpen(true);
                                }}
                                title="Mark as Resolved"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                try {
                                  if (window.confirm('Are you sure you want to delete this error log?')) {
                                    deleteMutation.mutate(log.id);
                                  }
                                } catch (error) {
                                  console.error('Error during delete operation:', error);
                                  toast({
                                    title: "Error",
                                    description: "Failed to delete error log. Please try again.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              title="Delete Log"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <BugOff className="h-8 w-8 text-muted-foreground mb-2" />
                          <p>No error logs found</p>
                          <p className="text-sm text-muted-foreground">
                            {Object.keys(filters).length > 0 
                              ? 'Try adjusting your filters' 
                              : 'Error logs will appear here when they occur'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-between pt-4">
              <Select 
                value={limit.toString()} 
                onValueChange={(value) => {
                  setLimit(parseInt(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="10 per page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>

              {renderPagination()}
            </CardFooter>
          </Card>
        </Tabs>
      </div>,

      {/* Error Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Error Details
            </DialogTitle>
            <DialogDescription>
              Detailed information about this error log
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <ScrollArea className="max-h-[600px] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">ID</Label>
                    <p className="font-mono">{selectedLog.id}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Level</Label>
                    <p>{getLevelBadge(selectedLog.level)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Source</Label>
                    <p className="flex items-center gap-1">
                      {getSourceIcon((selectedLog.metadata as any)?.source || 'unknown')}
                      {(selectedLog.metadata as any)?.source || 'unknown'}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="text-xs text-muted-foreground">Timestamp</Label>
                  <p>{formatDate(selectedLog.timestamp || new Date())}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Message</Label>
                  <p className="font-medium">{selectedLog.message}</p>
                </div>

                {(selectedLog.metadata as any)?.code && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Error Code</Label>
                    <p className="font-mono">{(selectedLog.metadata as any)?.code}</p>
                  </div>
                )}

                {selectedLog.userId && (
                  <div>
                    <Label className="text-xs text-muted-foreground">User ID</Label>
                    <p className="flex items-center">
                      <User className="h-4 w-4 mr-1" /> {selectedLog.userId}
                    </p>
                  </div>
                )}

                {selectedLog.path && (
                  <div>
                    <Label className="text-xs text-muted-foreground">URL/Path</Label>
                    <p className="break-all font-mono text-xs">{selectedLog.path}</p>
                  </div>
                )}

                {(selectedLog.metadata as any)?.method && (
                  <div>
                    <Label className="text-xs text-muted-foreground">HTTP Method</Label>
                    <Badge variant="outline">{(selectedLog.metadata as any)?.method}</Badge>
                  </div>
                )}

                <Accordion type="single" collapsible className="w-full">
                  {selectedLog.stack && (
                    <AccordionItem value="stack">
                      <AccordionTrigger>
                        <span className="font-medium flex items-center">
                          <Code className="h-4 w-4 mr-2" /> Stack Trace
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <pre className="bg-slate-50 p-4 rounded-md overflow-x-auto text-xs font-mono whitespace-pre-wrap">
                          {selectedLog.stack}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {typeof selectedLog.metadata !== 'undefined' && selectedLog.metadata !== null && Object.keys(selectedLog.metadata).length > 0 && (
                    <AccordionItem value="context">
                      <AccordionTrigger>
                        <span className="font-medium flex items-center">
                          <FileText className="h-4 w-4 mr-2" /> Context Data (Metadata)
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <pre className="bg-slate-50 p-4 rounded-md overflow-x-auto text-xs font-mono">
                          {JSON.stringify(selectedLog.metadata, null, 2)}
                        </pre>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {selectedLog.userAgent && (
                    <AccordionItem value="userAgent">
                      <AccordionTrigger>
                        <span className="font-medium flex items-center">
                          <Smartphone className="h-4 w-4 mr-2" /> User Agent
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-xs break-all font-mono">{selectedLog.userAgent}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {selectedLog.resolved && (
                    <AccordionItem value="resolution">
                      <AccordionTrigger>
                        <span className="font-medium flex items-center">
                          <Check className="h-4 w-4 mr-2" /> Resolution Details
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Resolved At</Label>
                            <p>{selectedLog.resolvedAt ? formatDate(selectedLog.resolvedAt) : 'Unknown'}</p>
                          </div>

                          {selectedLog.resolvedBy && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Resolved By</Label>
                              <p className="flex items-center">
                                <User className="h-4 w-4 mr-1" /> User #{selectedLog.resolvedBy}
                              </p>
                            </div>
                          )}

                          {(selectedLog.metadata as any)?.resolutionNotes && (
                            <div>
                              <Label className="text-xs text-muted-foreground">Resolution Notes</Label>
                              <p className="text-sm">{(selectedLog.metadata as any)?.resolutionNotes}</p>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>

                {!selectedLog.resolved && (
                  <div className="pt-4">
                    <h4 className="font-medium mb-2">Mark as Resolved</h4>
                    <div className="space-y-2">
                      <Label htmlFor="resolution-notes">Resolution Notes</Label>
                      <Input
                        id="resolution-notes"
                        placeholder="Enter notes about how this error was resolved..."
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            {selectedLog && !selectedLog.resolved ? (
              <>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    try {
                      if (!selectedLog) {
                        throw new Error('No error log selected');
                      }

                      resolveMutation.mutate({
                        id: selectedLog.id,
                        notes: resolutionNotes
                      });
                    } catch (error) {
                      console.error('Error resolving log:', error);
                      toast({
                        title: "Error",
                        description: "Failed to mark error as resolved. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={resolveMutation.isPending}
                >
                  {resolveMutation.isPending ? 'Saving...' : 'Mark as Resolved'}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsDialogOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default ErrorLogsPage;