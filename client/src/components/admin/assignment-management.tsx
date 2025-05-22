import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  CalendarClock, Edit, RefreshCw, Search, Plus, X, 
  CheckCircle2, Clock, Filter, CheckSquare, AlertTriangle, MapPin 
} from "lucide-react";
import { format } from "date-fns";
import { AssignmentForm } from "./assignment-form";
import { type Assignment } from '@shared/schema';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Types
interface PollingStation {
  id: number;
  name: string;
  code?: string;
}

export function AssignmentManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stationFilter, setStationFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  // Fetch assignments
  const { data: assignments = [], isLoading: assignmentsLoading, refetch: refetchAssignments } = useQuery<Assignment[]>({
    queryKey: ['/api/admin/assignments']
  });

  // Fetch polling stations for filter
  const { data: stations = [] } = useQuery<PollingStation[]>({
    queryKey: ['/api/admin/polling-stations']
  });

  // Filter assignments based on search query and filters
  const filteredAssignments = assignments.filter(assignment => {
    const searchTerm = searchQuery.toLowerCase();
    const matchesSearch = (
      (assignment.userFullName && assignment.userFullName.toLowerCase().includes(searchTerm)) ||
      (assignment.stationName && assignment.stationName.toLowerCase().includes(searchTerm)) ||
      (assignment.observerId && assignment.observerId.toLowerCase().includes(searchTerm))
    );

    // Status filter
    let matchesStatus = true;
    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        matchesStatus = assignment.status === "active" || assignment.isActive === true;
      } else if (statusFilter === "scheduled") {
        matchesStatus = assignment.status === "scheduled" || (!assignment.isActive && assignment.status !== "completed");
      } else if (statusFilter === "completed") {
        matchesStatus = assignment.status === "completed" || assignment.checkedOut === true;
      }
    }

    // Station filter
    let matchesStation = true;
    if (stationFilter !== "all") {
      matchesStation = assignment.stationId === parseInt(stationFilter);
    }

    return matchesSearch && matchesStatus && matchesStation;
  });

  // Cancel an assignment
  const cancelAssignment = useMutation({
    mutationFn: async (assignmentId: number) => {
      return apiRequest(
        'PATCH',
        `/api/admin/assignments/${assignmentId}/cancel`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-stats'] });
      toast({
        title: "Assignment Cancelled",
        description: "The assignment has been cancelled successfully.",
      });
    },
    onError: (error: Error) => {
      console.error('Error cancelling assignment:', error);
      const isStubError = error.message && error.message.includes('STUB:');
      toast({
        title: isStubError ? "Feature Incomplete" : "Failed to cancel assignment",
        description: isStubError 
          ? "This feature (Cancel Assignment) is not yet fully implemented. Our team has been notified." 
          : "There was an error cancelling the assignment.",
        variant: "destructive",
      });
    }
  });

  // Check-in an observer
  const checkInObserver = useMutation({
    mutationFn: async (assignmentId: number) => {
      return apiRequest(
        'POST',
        `/api/admin/assignments/${assignmentId}/check-in`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-stats'] });
      toast({
        title: "Observer Checked In",
        description: "The observer has been checked in successfully.",
      });
    },
    onError: (error: Error) => {
      console.error('Error checking in observer:', error);
      const isStubError = error.message && error.message.includes('STUB:');
      toast({
        title: isStubError ? "Feature Incomplete" : "Failed to check in",
        description: isStubError
          ? "This feature (Check-In Observer) is not yet fully implemented. Our team has been notified."
          : "There was an error checking in the observer.",
        variant: "destructive",
      });
    }
  });

  // Check-out an observer
  const checkOutObserver = useMutation({
    mutationFn: async (assignmentId: number) => {
      return apiRequest(
        'POST',
        `/api/admin/assignments/${assignmentId}/check-out`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-stats'] });
      toast({
        title: "Observer Checked Out",
        description: "The observer has been checked out successfully.",
      });
    },
    onError: (error: Error) => {
      console.error('Error checking out observer:', error);
      const isStubError = error.message && error.message.includes('STUB:');
      toast({
        title: isStubError ? "Feature Incomplete" : "Failed to check out",
        description: isStubError
          ? "This feature (Check-Out Observer) is not yet fully implemented. Our team has been notified."
          : "There was an error checking out the observer.",
        variant: "destructive",
      });
    }
  });

  // Handle cancelling an assignment
  const handleCancelAssignment = (id: number) => {
    if (window.confirm("Are you sure you want to cancel this assignment?")) {
      cancelAssignment.mutate(id);
    }
  };

  // Handle check-in
  const handleCheckIn = (id: number) => {
    checkInObserver.mutate(id);
  };

  // Handle check-out
  const handleCheckOut = (id: number) => {
    checkOutObserver.mutate(id);
  };

  // Create a new assignment
  const createAssignment = useMutation({
    mutationFn: async (assignmentData: Omit<Assignment, 'id'>) => {
      return apiRequest(
        'POST',
        '/api/admin/assignments',
        assignmentData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-stats'] });
      toast({
        title: "Assignment Created",
        description: "The observer assignment has been created successfully.",
      });
      setFormOpen(false);
    },
    onError: (error: Error) => {
      console.error('Error creating assignment:', error);
      const isStubError = error.message && error.message.includes('STUB:');
      toast({
        title: isStubError ? "Feature Incomplete" : "Failed to create assignment",
        description: isStubError
          ? "This feature (Create Assignment) is not yet fully implemented. Our team has been notified."
          : "There was an error creating the assignment. Please check for scheduling conflicts.",
        variant: "destructive",
      });
    }
  });

  // Update an existing assignment
  const updateAssignment = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Assignment> }) => {
      return apiRequest(
        'PATCH',
        `/api/admin/assignments/${id}`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-stats'] });
      toast({
        title: "Assignment Updated",
        description: "The observer assignment has been updated successfully.",
      });
      setFormOpen(false);
    },
    onError: (error: Error) => {
      console.error('Error updating assignment:', error);
      const isStubError = error.message && error.message.includes('STUB:');
      toast({
        title: isStubError ? "Feature Incomplete" : "Failed to update assignment",
        description: isStubError
          ? "This feature (Update Assignment) is not yet fully implemented. Our team has been notified."
          : "There was an error updating the assignment. Please check for scheduling conflicts.",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const handleFormSubmit = (data: Assignment) => {
    if (selectedAssignment) {
      // Update existing assignment
      updateAssignment.mutate({ id: selectedAssignment.id, data });
    } else {
      // Create new assignment
      createAssignment.mutate(data);
    }
  };

  // Handle edit assignment
  const handleEditAssignment = (id: number) => {
    const assignment = assignments.find(a => a.id === id);
    if (assignment) {
      setSelectedAssignment(assignment);
      setFormOpen(true);
    }
  };

  // Handle add new assignment
  const handleAddAssignment = () => {
    setSelectedAssignment(null);
    setFormOpen(true);
  };

  // Format dates for display
  const formatDateRange = (startDate: string, endDate: string) => {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const dateStr = format(start, "MMM d, yyyy");
      const startTimeStr = format(start, "HH:mm");
      const endTimeStr = format(end, "HH:mm");
      
      return `${dateStr} ${startTimeStr} - ${endTimeStr}`;
    } catch (error) {
      return "Invalid date";
    }
  };

  // Get status badge
  const getStatusBadge = (assignment: Assignment) => {
    if (assignment.checkedOut) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckSquare className="h-3 w-3 mr-1" /> Completed
        </Badge>
      );
    } else if (assignment.checkedIn) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Checked In
        </Badge>
      );
    } else if (assignment.status === "active" || assignment.isActive) {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <Clock className="h-3 w-3 mr-1" /> Active
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          <CalendarClock className="h-3 w-3 mr-1" /> Scheduled
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      <Alert variant="warning">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Feature Under Development</AlertTitle>
        <AlertDescription>
          The assignments management module is currently under active development. 
          Some functionalities might not be fully implemented or may behave unexpectedly.
        </AlertDescription>
      </Alert>

    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Assignment Management</CardTitle>
            <CardDescription>
              Manage observer assignments to polling stations
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchAssignments()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search assignments..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={handleAddAssignment}>
              <Plus className="h-4 w-4 mr-2" />
              New Assignment
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2">
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-1/2">
              <Select 
                value={stationFilter} 
                onValueChange={setStationFilter}
              >
                <SelectTrigger>
                  <MapPin className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stations</SelectItem>
                  {stations.map(station => (
                    <SelectItem key={station.id} value={station.id.toString()}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {assignmentsLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mb-3" />
              <p className="text-gray-500">Loading assignments...</p>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                <CalendarClock className="h-6 w-6 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium mb-1">No assignments found</h3>
              <p className="text-gray-500">
                {searchQuery || statusFilter !== "all" || stationFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "No assignments have been created yet"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Station</TableHead>
                    <TableHead>Observer</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div className="font-medium">{assignment.stationName}</div>
                        {assignment.stationCode && (
                          <div className="text-gray-500 text-xs font-mono">{assignment.stationCode}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{assignment.userFullName}</div>
                        <div className="text-gray-500 text-xs">{assignment.observerId}</div>
                      </TableCell>
                      <TableCell>
                        {formatDateRange(assignment.startDate, assignment.endDate)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(assignment)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditAssignment(assignment.id)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          
                          {!assignment.checkedIn && !assignment.checkedOut && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-red-600 text-red-600 hover:bg-red-50"
                              onClick={() => handleCancelAssignment(assignment.id)}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Cancel</span>
                            </Button>
                          )}
                          
                          {assignment.status === "active" && !assignment.checkedIn && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-blue-600 text-blue-600 hover:bg-blue-50"
                              onClick={() => handleCheckIn(assignment.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="sr-only">Check In</span>
                            </Button>
                          )}
                          
                          {assignment.checkedIn && !assignment.checkedOut && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-green-600 text-green-600 hover:bg-green-50"
                              onClick={() => handleCheckOut(assignment.id)}
                            >
                              <CheckSquare className="h-4 w-4" />
                              <span className="sr-only">Check Out</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
          {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''}
        </div>
        {filteredAssignments.length > 10 && (
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <span className="text-sm">Page 1 of 1</span>
            <Button variant="outline" size="sm" disabled>Next</Button>
          </div>
        )}
      </CardFooter>

      {/* Assignment Form Modal */}
      <AssignmentForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        assignment={selectedAssignment || undefined}
        title={selectedAssignment ? "Edit Assignment" : "Create New Assignment"}
      />
    </Card>
    </div>
  );
}