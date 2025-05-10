import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RefreshCw, Edit, Calendar, Plus, AlertTriangle, CheckSquare, XSquare } from "lucide-react";

// Types
interface Assignment {
  id: number;
  userId: number;
  stationId: number;
  startDate: string;
  endDate: string;
  status?: string;
  isActive?: boolean;
  checkedIn?: boolean;
  checkedOut?: boolean;
  checkinTime?: string;
  checkoutTime?: string;
  notes?: string;
  
  // Joined fields from related entities
  stationName?: string;
  stationCode?: string;
  userFullName?: string;
  observerId?: string;
}

interface PollingStation {
  id: number;
  name: string;
  code?: string;
}

export function AssignmentManagement() {
  const [stationFilter, setStationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch assignments
  const { data: assignments = [], isLoading: isLoadingAssignments, refetch: refetchAssignments } = useQuery<Assignment[]>({
    queryKey: ['/api/admin/assignments']
  });

  // Fetch polling stations for filter
  const { data: stations = [] } = useQuery<PollingStation[]>({
    queryKey: ['/api/admin/polling-stations']
  });

  // Update assignment status
  const updateAssignment = useMutation({
    mutationFn: async ({ 
      assignmentId, 
      data 
    }: { 
      assignmentId: number, 
      data: Partial<Pick<Assignment, 'status' | 'isActive' | 'checkedIn' | 'checkedOut'>> 
    }) => {
      return apiRequest(
        'PATCH',
        `/api/admin/assignments/${assignmentId}`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-stats'] });
      toast({
        title: "Assignment updated",
        description: "The assignment has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating assignment:', error);
      toast({
        title: "Failed to update assignment",
        description: "There was an error updating the assignment.",
        variant: "destructive",
      });
    }
  });

  // Filter assignments based on selection
  const filteredAssignments = assignments.filter(assignment => {
    const matchesStation = stationFilter === "all" || assignment.stationId.toString() === stationFilter;
    
    let matchesStatus = true;
    if (statusFilter === "active") {
      matchesStatus = assignment.status === "active" || assignment.isActive === true;
    } else if (statusFilter === "scheduled") {
      matchesStatus = assignment.status === "scheduled" || assignment.isActive === false;
    } else if (statusFilter === "checked-in") {
      matchesStatus = assignment.checkedIn === true;
    } else if (statusFilter === "checked-out") {
      matchesStatus = assignment.checkedOut === true;
    }
    
    return matchesStation && matchesStatus;
  });

  // Handle check-in and check-out
  const handleCheckIn = (assignmentId: number) => {
    updateAssignment.mutate({ 
      assignmentId, 
      data: { 
        checkedIn: true,
        status: "active"
      } 
    });
  };

  const handleCheckOut = (assignmentId: number) => {
    updateAssignment.mutate({ 
      assignmentId, 
      data: { 
        checkedOut: true,
        status: "completed"
      } 
    });
  };

  // Handle cancel assignment
  const handleCancelAssignment = (assignmentId: number) => {
    updateAssignment.mutate({ 
      assignmentId, 
      data: { 
        status: "cancelled",
        isActive: false
      } 
    });
  };

  // Format date display
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const dateOptions: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    };
    
    const timeOptions: Intl.DateTimeFormatOptions = { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    };
    
    const startDateStr = start.toLocaleDateString('en-US', dateOptions);
    const startTimeStr = start.toLocaleTimeString('en-US', timeOptions);
    const endTimeStr = end.toLocaleTimeString('en-US', timeOptions);
    
    return `${startDateStr} ${startTimeStr} - ${endTimeStr}`;
  };

  // Get status badge
  const getStatusBadge = (assignment: Assignment) => {
    if (assignment.checkedOut) {
      return <Badge className="bg-blue-600">Completed</Badge>;
    } else if (assignment.checkedIn) {
      return <Badge className="bg-green-600">Checked In</Badge>;
    } else if (assignment.status === "cancelled") {
      return <Badge variant="destructive">Cancelled</Badge>;
    } else if (assignment.status === "active" || assignment.isActive) {
      return <Badge className="bg-green-600">Active</Badge>;
    } else {
      return <Badge variant="outline" className="text-gray-500">Scheduled</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Observer Assignments</CardTitle>
            <CardDescription>
              Manage observer assignments to polling stations
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => refetchAssignments()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <div className="flex flex-1 gap-4">
            <Select value={stationFilter} onValueChange={setStationFilter}>
              <SelectTrigger className="w-full sm:w-[220px]">
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
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="checked-in">Checked In</SelectItem>
                <SelectItem value="checked-out">Checked Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Assignment
          </Button>
        </div>

        {isLoadingAssignments ? (
          <div className="flex flex-col items-center justify-center py-10">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mb-3" />
            <p className="text-gray-500">Loading assignments...</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-3">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-medium mb-1">No assignments found</h3>
            <p className="text-gray-500 mb-4">
              {stationFilter !== "all" || statusFilter !== "all" 
                ? "Try changing your filters or create a new assignment" 
                : "There are no assignments scheduled yet"}
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Assignment
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Station</TableHead>
                  <TableHead>Observer</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.map((assignment) => (
                  <TableRow key={assignment.id}>
                    <TableCell className="font-medium">
                      {assignment.stationName || `Station #${assignment.stationId}`}
                      <div className="text-xs text-gray-500 font-mono">
                        {assignment.stationCode || `STA${assignment.stationId.toString().padStart(3, '0')}`}
                      </div>
                    </TableCell>
                    <TableCell>
                      {assignment.userFullName || `Observer #${assignment.userId}`}
                      <div className="text-xs text-gray-500 font-mono">
                        {assignment.observerId || `OBS${assignment.userId.toString().padStart(3, '0')}`}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
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
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        
                        {!assignment.checkedIn && assignment.status !== "cancelled" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-red-600 text-red-600 hover:bg-red-50"
                            onClick={() => handleCancelAssignment(assignment.id)}
                          >
                            <XSquare className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                        
                        {!assignment.checkedIn && !assignment.checkedOut && assignment.status !== "cancelled" && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-green-600 text-green-600 hover:bg-green-50"
                            onClick={() => handleCheckIn(assignment.id)}
                          >
                            <CheckSquare className="h-4 w-4 mr-1" />
                            Check-in
                          </Button>
                        )}
                        
                        {assignment.checkedIn && !assignment.checkedOut && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            onClick={() => handleCheckOut(assignment.id)}
                          >
                            <AlertTriangle className="h-4 w-4 mr-1" />
                            Check-out
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
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
          Showing {filteredAssignments.length} of {assignments.length} assignments
        </div>
      </CardFooter>
    </Card>
  );
}