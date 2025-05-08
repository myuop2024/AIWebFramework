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
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  UserCheck, 
  CalendarClock, 
  MapPin, 
  ClipboardCheck, 
  AlertTriangle,
  Check,
  X
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";

// Observer interface
interface Observer {
  id: number;
  username: string;
  email: string;
  observerId: string;
  fullName: string;
  role: string;
  status: 'active' | 'inactive' | 'training' | 'on_assignment';
  phoneNumber?: string;
  profileImage?: string;
}

// Assignment interface
interface Assignment {
  id: number;
  userId: number;
  stationId: number;
  stationName: string;
  observerName: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  observerImage?: string;
  observerStatus?: string;
}

// Polling Station interface
interface PollingStation {
  id: number;
  name: string;
  address: string;
  city: string;
  district: string;
  constituency: string;
}

export default function AssignmentsPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedObserver, setSelectedObserver] = useState<string>('');
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  // Format for API
  const formatDateForApi = (date: Date | undefined, time: string) => {
    if (!date) return '';
    const [hours, minutes] = time.split(':');
    const newDate = new Date(date);
    newDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    return newDate.toISOString();
  };

  // Fetch assignments
  const { data: assignments, isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ['/api/supervisor/assignments'],
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error fetching assignments',
        description: error.message
      });
    }
  });

  // Fetch team observers
  const { data: observers, isLoading: observersLoading } = useQuery<Observer[]>({
    queryKey: ['/api/supervisor/team'],
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error fetching team data',
        description: error.message
      });
    }
  });

  // Fetch available polling stations
  const { data: stations, isLoading: stationsLoading } = useQuery<PollingStation[]>({
    queryKey: ['/api/polling-stations/available'],
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error fetching available stations',
        description: error.message
      });
    }
  });

  // Create assignment mutation
  const createAssignmentMutation = useMutation({
    mutationFn: async (assignment: { 
      observerId: number; 
      stationId: number; 
      startTime: string; 
      endTime: string 
    }) => {
      const res = await apiRequest('POST', '/api/assignments', assignment);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Assignment created',
        description: 'Observer has been assigned to the polling station'
      });
      // Refetch assignments to get updated list
      queryClient.invalidateQueries({ queryKey: ['/api/supervisor/assignments'] });
      setAssignmentDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error creating assignment',
        description: error.message
      });
    }
  });

  // Cancel assignment mutation
  const cancelAssignmentMutation = useMutation({
    mutationFn: async (assignmentId: number) => {
      const res = await apiRequest('PATCH', `/api/assignments/${assignmentId}/cancel`, {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Assignment cancelled',
        description: 'The assignment has been cancelled successfully'
      });
      // Refetch assignments to get updated list
      queryClient.invalidateQueries({ queryKey: ['/api/supervisor/assignments'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error cancelling assignment',
        description: error.message
      });
    }
  });

  // Function to handle assignment creation
  const handleCreateAssignment = () => {
    if (!selectedObserver || !selectedStation || !startDate || !endDate) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please fill in all fields'
      });
      return;
    }

    createAssignmentMutation.mutate({
      observerId: parseInt(selectedObserver),
      stationId: parseInt(selectedStation),
      startTime: formatDateForApi(startDate, startTime),
      endTime: formatDateForApi(endDate, endTime)
    });
  };

  // Function to handle assignment cancellation
  const handleCancelAssignment = (assignmentId: number) => {
    if (confirm('Are you sure you want to cancel this assignment?')) {
      cancelAssignmentMutation.mutate(assignmentId);
    }
  };

  // Open assignment dialog
  const openAssignmentDialog = () => {
    setSelectedObserver('');
    setSelectedStation('');
    setStartDate(new Date());
    setEndDate(new Date());
    setStartTime('09:00');
    setEndTime('17:00');
    setAssignmentDialogOpen(true);
  };

  // Filter assignments based on search term, status filter, and date
  const filteredAssignments = assignments?.filter(assignment => {
    const matchesSearch = 
      assignment.observerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.stationName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || assignment.status === statusFilter;
    
    const assignmentDate = new Date(assignment.startDate);
    const matchesDate = !selectedDate || 
      (assignmentDate.getDate() === selectedDate.getDate() &&
       assignmentDate.getMonth() === selectedDate.getMonth() &&
       assignmentDate.getFullYear() === selectedDate.getFullYear());
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Function to get status badge color
  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      case 'cancelled':
      default:
        return 'bg-gray-500';
    }
  };

  if (assignmentsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Observer Assignments</h1>
        <Button onClick={openAssignmentDialog}>
          <CalendarClock className="mr-2 h-4 w-4" />
          Create Assignment
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment Management</CardTitle>
          <CardDescription>
            View and manage polling station assignments for your team
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Input
                  placeholder="Search assignments..."
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
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start text-left font-normal">
                    <CalendarClock className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Observer</TableHead>
                  <TableHead>Polling Station</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments && filteredAssignments.length > 0 ? (
                  filteredAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={assignment.observerImage} />
                            <AvatarFallback>{assignment.observerName?.substring(0, 2).toUpperCase() || 'OB'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{assignment.observerName}</p>
                            {assignment.observerStatus && (
                              <Badge className="mt-1" variant="outline">{assignment.observerStatus}</Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{assignment.stationName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{format(new Date(assignment.startDate), "PPP")}</p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(assignment.startDate), "p")} - 
                            {format(new Date(assignment.endDate), "p")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusBadgeColor(assignment.status)}`}>
                          {assignment.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {assignment.status === 'pending' && (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleCancelAssignment(assignment.id)}
                              >
                                <X className="h-4 w-4 text-red-500" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                              >
                                <Check className="h-4 w-4 text-green-500" />
                              </Button>
                            </>
                          )}
                          {assignment.status === 'active' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCancelAssignment(assignment.id)}
                            >
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              Cancel
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      {searchTerm || statusFilter !== 'all' ? (
                        <p>No assignments match your filters</p>
                      ) : (
                        <div className="flex flex-col items-center">
                          <CalendarClock className="h-12 w-12 text-gray-300 mb-2" />
                          <p>No assignments found</p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={openAssignmentDialog}
                          >
                            Create an assignment
                          </Button>
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

      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Assignment</DialogTitle>
            <DialogDescription>
              Assign an observer to a polling station
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Observer</label>
              <Select
                value={selectedObserver}
                onValueChange={setSelectedObserver}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an observer" />
                </SelectTrigger>
                <SelectContent>
                  {observers?.filter(o => o.status === 'active').map(observer => (
                    <SelectItem key={observer.id} value={observer.id.toString()}>
                      {observer.fullName || observer.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Polling Station</label>
              <Select
                value={selectedStation}
                onValueChange={setSelectedStation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a polling station" />
                </SelectTrigger>
                <SelectContent>
                  {stations?.map(station => (
                    <SelectItem key={station.id} value={station.id.toString()}>
                      {station.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <div className="flex space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {startDate ? format(startDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-[120px]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <div className="flex space-x-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      {endDate ? format(endDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-[120px]"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setAssignmentDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateAssignment}
              disabled={createAssignmentMutation.isPending}
            >
              {createAssignmentMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}