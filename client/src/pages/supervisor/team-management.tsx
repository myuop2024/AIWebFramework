import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  MessageSquare 
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  assignedStations?: ObserverAssignment[];
  completedReports?: number;
  lastActive?: string;
  trainingCompleted?: boolean;
}

// Assignment interface
interface ObserverAssignment {
  id: number;
  stationName: string;
  stationId: number;
  startTime: string;
  endTime: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
}

export default function TeamManagementPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [selectedObserver, setSelectedObserver] = useState<Observer | null>(null);
  const [selectedStation, setSelectedStation] = useState<string>('');
  const [selectedTab, setSelectedTab] = useState('observers');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

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
  const { data: stations } = useQuery<{ id: number; name: string }[]>({
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
      // Refetch observers to get updated assignments
      queryClient.invalidateQueries({ queryKey: ['/api/supervisor/team'] });
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

  // Function to handle assignment creation
  const handleCreateAssignment = () => {
    if (!selectedObserver || !selectedStation || !startTime || !endTime) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please fill in all fields'
      });
      return;
    }

    createAssignmentMutation.mutate({
      observerId: selectedObserver.id,
      stationId: parseInt(selectedStation),
      startTime,
      endTime
    });
  };

  // Open assignment dialog
  const openAssignmentDialog = (observer: Observer) => {
    setSelectedObserver(observer);
    setSelectedStation('');
    setStartTime('');
    setEndTime('');
    setAssignmentDialogOpen(true);
  };

  // Filter observers based on search term and status filter
  const filteredObservers = observers?.filter(observer => {
    const matchesSearch = 
      observer.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      observer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (observer.fullName && observer.fullName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || observer.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Function to get status badge color
  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'on_assignment':
        return 'bg-blue-500';
      case 'training':
        return 'bg-yellow-500';
      case 'inactive':
      default:
        return 'bg-gray-500';
    }
  };

  if (observersLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Team Management</h1>
        <Button>
          <MessageSquare className="mr-2 h-4 w-4" />
          Message Team
        </Button>
      </div>

      <Tabs defaultValue="observers" onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="observers">Team Observers</TabsTrigger>
          <TabsTrigger value="assignments">Current Assignments</TabsTrigger>
          <TabsTrigger value="reports">Reports Approval</TabsTrigger>
        </TabsList>

        <TabsContent value="observers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Observer Team</CardTitle>
              <CardDescription>
                Manage your team of observers and their assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Input
                      placeholder="Search observers..."
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
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="on_assignment">On Assignment</SelectItem>
                      <SelectItem value="training">In Training</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Observer</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Current Assignment</TableHead>
                      <TableHead>Reports</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredObservers && filteredObservers.length > 0 ? (
                      filteredObservers.map((observer) => (
                        <TableRow key={observer.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={observer.profileImage} />
                                <AvatarFallback>{observer.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{observer.fullName || observer.username}</p>
                                <p className="text-sm text-gray-500">{observer.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{observer.observerId}</TableCell>
                          <TableCell>
                            <Badge className={`${getStatusBadgeColor(observer.status)}`}>
                              {observer.status.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {observer.assignedStations && observer.assignedStations.length > 0 ? (
                              <div>
                                <p className="font-medium">{observer.assignedStations[0].stationName}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(observer.assignedStations[0].startTime).toLocaleTimeString()} - 
                                  {new Date(observer.assignedStations[0].endTime).toLocaleTimeString()}
                                </p>
                              </div>
                            ) : (
                              <p className="text-gray-500">No active assignment</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <ClipboardCheck className="h-4 w-4 text-green-500" />
                              <span>{observer.completedReports || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openAssignmentDialog(observer)}
                              disabled={observer.status === 'inactive'}
                            >
                              <MapPin className="mr-2 h-4 w-4" />
                              Assign
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6">
                          {searchTerm || statusFilter !== 'all' ? (
                            <p>No observers match your filters</p>
                          ) : (
                            <p>No observers found in your team</p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Export Team Data</Button>
              <Button>
                <UserCheck className="mr-2 h-4 w-4" />
                Schedule Team Meeting
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Assignments</CardTitle>
              <CardDescription>
                View and manage your team's current polling station assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CalendarClock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium">Assignment Management</h3>
                <p className="text-gray-500 mt-2 mb-4">
                  This section will display active and upcoming assignments for your team
                </p>
                <Button>View Assignment Schedule</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Reports Approval</CardTitle>
              <CardDescription>
                Review and approve reports submitted by your team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium">Report Approval Queue</h3>
                <p className="text-gray-500 mt-2 mb-4">
                  This section will display reports pending approval from your team
                </p>
                <Button>View Pending Reports</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Observer to Polling Station</DialogTitle>
            <DialogDescription>
              Create a new assignment for {selectedObserver?.fullName || selectedObserver?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <Input 
                  type="datetime-local" 
                  value={startTime} 
                  onChange={(e) => setStartTime(e.target.value)} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Time</label>
                <Input 
                  type="datetime-local" 
                  value={endTime} 
                  onChange={(e) => setEndTime(e.target.value)} 
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignmentDialogOpen(false)}>
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