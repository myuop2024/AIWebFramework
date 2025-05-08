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
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  MapPin, 
  Calendar,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Route
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InteractiveMap } from '@/components/mapping/interactive-map';

// Polling Station interface
interface PollingStation {
  id: number;
  name: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  latitude: number;
  longitude: number;
  isActive: boolean;
  capacity: number;
  assignedObservers: number;
  status: 'normal' | 'issue_reported' | 'needs_attention';
  issues?: number;
  lastVisited?: string;
  nextVisit?: string;
}

// Roving schedule interface
interface RovingSchedule {
  id: number;
  date: string;
  stationId: number;
  stationName: string;
  visitTime: string;
  duration: number; // in minutes
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
}

export default function StationSchedulePage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTab, setSelectedTab] = useState('stations');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Fetch polling stations in area
  const { data: stations, isLoading: stationsLoading } = useQuery<PollingStation[]>({
    queryKey: ['/api/polling-stations/area'],
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error fetching stations',
        description: error.message
      });
    }
  });

  // Fetch roving schedule
  const { data: schedule, isLoading: scheduleLoading } = useQuery<RovingSchedule[]>({
    queryKey: ['/api/roving/schedule', selectedDate],
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error fetching schedule',
        description: error.message
      });
    }
  });

  // Check-in at station mutation
  const checkInMutation = useMutation({
    mutationFn: async (stationId: number) => {
      const res = await apiRequest('POST', `/api/roving/check-in/${stationId}`, {
        date: new Date().toISOString()
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Check-in successful',
        description: 'You have successfully checked in at this station'
      });
      // Refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/polling-stations/area'] });
      queryClient.invalidateQueries({ queryKey: ['/api/roving/schedule'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Check-in failed',
        description: error.message
      });
    }
  });

  // Generate optimal route mutation
  const generateRouteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/roving/generate-route', {
        date: selectedDate
      });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Route generated',
        description: `Optimal route created with ${data.stations.length} stations`
      });
      // Refetch schedule with new route
      queryClient.invalidateQueries({ queryKey: ['/api/roving/schedule'] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Route generation failed',
        description: error.message
      });
    }
  });

  // Filter stations based on search term, region, and status
  const filteredStations = stations?.filter(station => {
    const matchesSearch = 
      station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      station.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRegion = regionFilter === 'all' || station.region === regionFilter;
    const matchesStatus = statusFilter === 'all' || station.status === statusFilter;
    
    return matchesSearch && matchesRegion && matchesStatus;
  });

  // Get unique regions for filter
  const regions = stations ? [...new Set(stations.map(station => station.region))] : [];

  // Function to handle check-in
  const handleCheckIn = (stationId: number) => {
    checkInMutation.mutate(stationId);
  };

  // Function to get status badge color
  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'issue_reported':
        return 'bg-red-500';
      case 'needs_attention':
        return 'bg-yellow-500';
      case 'normal':
      default:
        return 'bg-green-500';
    }
  };

  // Function to get priority badge color
  const getPriorityBadgeColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
      default:
        return 'bg-blue-500';
    }
  };

  if (stationsLoading || scheduleLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Station Schedule</h1>
        <Button
          onClick={() => generateRouteMutation.mutate()}
          disabled={generateRouteMutation.isPending}
        >
          {generateRouteMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Route className="mr-2 h-4 w-4" />
          )}
          Generate Optimal Route
        </Button>
      </div>

      <Tabs defaultValue="stations" onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stations">Polling Stations</TabsTrigger>
          <TabsTrigger value="schedule">Today's Schedule</TabsTrigger>
          <TabsTrigger value="map">Map View</TabsTrigger>
        </TabsList>

        <TabsContent value="stations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Area Polling Stations</CardTitle>
              <CardDescription>
                View all polling stations in your assigned area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Input
                      placeholder="Search stations..."
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
                    value={regionFilter}
                    onValueChange={setRegionFilter}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      {regions.map(region => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="issue_reported">Issue Reported</SelectItem>
                      <SelectItem value="needs_attention">Needs Attention</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Station Name</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Observers</TableHead>
                      <TableHead>Last Visited</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStations && filteredStations.length > 0 ? (
                      filteredStations.map((station) => (
                        <TableRow key={station.id}>
                          <TableCell className="font-medium">{station.name}</TableCell>
                          <TableCell>
                            <div>
                              <p>{station.address}</p>
                              <p className="text-sm text-gray-500">{station.city}, {station.region}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${getStatusBadgeColor(station.status)}`}>
                              {station.status.replace('_', ' ')}
                            </Badge>
                            {station.issues && station.issues > 0 && (
                              <p className="text-sm text-red-500 mt-1">
                                {station.issues} issue{station.issues > 1 ? 's' : ''} reported
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <p>{station.assignedObservers} / {station.capacity}</p>
                          </TableCell>
                          <TableCell>
                            {station.lastVisited ? (
                              <div>
                                <p>{new Date(station.lastVisited).toLocaleDateString()}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(station.lastVisited).toLocaleTimeString()}
                                </p>
                              </div>
                            ) : (
                              <p className="text-gray-500">Never</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleCheckIn(station.id)}
                              disabled={checkInMutation.isPending}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Check In
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6">
                          {searchTerm || regionFilter !== 'all' || statusFilter !== 'all' ? (
                            <p>No stations match your filters</p>
                          ) : (
                            <p>No polling stations found in your area</p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                  <CardTitle>Visit Schedule</CardTitle>
                  <CardDescription>
                    Your optimized schedule for visiting polling stations
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Date:</label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-[180px]"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {schedule && schedule.length > 0 ? (
                <div className="space-y-4">
                  {schedule.map((visit) => (
                    <Card key={visit.id} className="overflow-hidden">
                      <div className={`h-2 ${getPriorityBadgeColor(visit.priority)}`} />
                      <div className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div className="flex items-start gap-4">
                          <div className="bg-muted rounded-full p-2">
                            <Calendar className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-medium">{visit.stationName}</h3>
                            <p className="text-sm text-gray-500">
                              {new Date(visit.visitTime).toLocaleTimeString()} - Duration: {visit.duration} minutes
                            </p>
                            {visit.notes && (
                              <p className="text-sm mt-1 italic">"{visit.notes}"</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityBadgeColor(visit.priority)}>
                            {visit.priority.charAt(0).toUpperCase() + visit.priority.slice(1)} Priority
                          </Badge>
                          <Badge variant={visit.status === 'completed' ? 'outline' : 'default'}>
                            {visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant={visit.status === 'completed' ? 'outline' : 'default'}
                            disabled={visit.status === 'completed' || visit.status === 'cancelled'}
                          >
                            {visit.status === 'completed' ? 'Completed' : 'Mark Complete'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Route className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium">No Schedule Available</h3>
                  <p className="text-gray-500 mt-2 mb-4">
                    You don't have any scheduled visits for this date
                  </p>
                  <Button onClick={() => generateRouteMutation.mutate()}>
                    Generate Route
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <p className="text-sm text-gray-500">
                {schedule?.length || 0} stations scheduled
              </p>
              <Button variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Station Statistics
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Map View</CardTitle>
              <CardDescription>
                Interactive map of polling stations in your area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] rounded-md overflow-hidden border">
                {stations && (
                  <InteractiveMap 
                    stations={stations.map(station => ({
                      id: station.id,
                      name: station.name,
                      latitude: station.latitude,
                      longitude: station.longitude,
                      status: station.status,
                      address: station.address
                    }))}
                    onStationClick={(stationId) => {
                      const station = stations.find(s => s.id === stationId);
                      if (station) {
                        toast({
                          title: station.name,
                          description: `${station.address}, ${station.city}`,
                          variant: 'default'
                        });
                      }
                    }}
                  />
                )}
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Normal</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-sm">Needs Attention</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-sm">Issue Reported</span>
                </div>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}