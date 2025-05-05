import React, { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { format, isAfter, isBefore, parseISO } from 'date-fns';

import { Assignment, PollingStation, User } from '@shared/schema';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { BadgeCheck, Calendar as CalendarIcon, Clock, MapPin, UserCheck } from "lucide-react";
import { assignmentStatusColors } from '@/lib/utils';

interface AssignmentSchedulerProps {
  userId?: number; // Optional - if admin is assigning someone else
  stationId?: number; // Optional - if pre-selecting a station
  onSuccess?: () => void;
}

interface FormData {
  stationId: number | null;
  startDate: Date | null;
  startTime: string;
  endDate: Date | null;
  endTime: string;
  notes: string;
  role: string;
}

export function AssignmentScheduler({ userId, stationId, onSuccess }: AssignmentSchedulerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<FormData>({
    stationId: stationId || null,
    startDate: new Date(),
    startTime: '09:00',
    endDate: new Date(),
    endTime: '17:00',
    notes: '',
    role: 'observer'
  });

  const [showStartCalendar, setShowStartCalendar] = useState(false);
  const [showEndCalendar, setShowEndCalendar] = useState(false);

  // Fetch polling stations
  const { data: stations, isLoading: stationsLoading } = useQuery<PollingStation[]>({
    queryKey: ['/api/polling-stations']
  });

  // Create assignment mutation
  const createAssignment = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/assignments', data);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/users/assignments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/assignments/active'] });
      if (stationId) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/stations', stationId, 'assignments'] 
        });
      }
      
      // Show success toast
      toast({
        title: "Assignment scheduled",
        description: "The assignment was successfully scheduled.",
      });
      
      // Call success callback if provided
      if (onSuccess) onSuccess();
      
      // Reset form
      setFormData({
        stationId: stationId || null,
        startDate: new Date(),
        startTime: '09:00',
        endDate: new Date(),
        endTime: '17:00',
        notes: '',
        role: 'observer'
      });
    },
    onError: (error: any) => {
      // Show error toast
      toast({
        title: "Assignment scheduling failed",
        description: error.message || "There was an error scheduling the assignment.",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.stationId) {
      toast({
        title: "Missing information",
        description: "Please select a polling station.",
        variant: "destructive"
      });
      return;
    }
    
    if (!formData.startDate || !formData.endDate) {
      toast({
        title: "Missing information",
        description: "Please select start and end dates.",
        variant: "destructive"
      });
      return;
    }
    
    // Create ISO dates with time
    const startDateTime = new Date(
      formData.startDate.getFullYear(),
      formData.startDate.getMonth(),
      formData.startDate.getDate(),
      parseInt(formData.startTime.split(':')[0]),
      parseInt(formData.startTime.split(':')[1])
    );
    
    const endDateTime = new Date(
      formData.endDate.getFullYear(),
      formData.endDate.getMonth(),
      formData.endDate.getDate(),
      parseInt(formData.endTime.split(':')[0]),
      parseInt(formData.endTime.split(':')[1])
    );
    
    // Validate dates
    if (isAfter(startDateTime, endDateTime)) {
      toast({
        title: "Invalid dates",
        description: "End date must be after start date.",
        variant: "destructive"
      });
      return;
    }
    
    // Prepare data for API
    const assignmentData = {
      stationId: formData.stationId,
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
      notes: formData.notes || undefined,
      role: formData.role,
      userId: userId // This will be ignored by the API if not an admin
    };
    
    // Submit the assignment
    createAssignment.mutate(assignmentData);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Schedule Assignment</CardTitle>
        <CardDescription>
          Schedule a new assignment at a polling station
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="station" className="block text-sm font-medium">
              Polling Station
            </label>
            <Select
              value={formData.stationId?.toString() || ""}
              onValueChange={(value) => setFormData({...formData, stationId: parseInt(value)})}
              disabled={stationId !== undefined || stationsLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a polling station" />
              </SelectTrigger>
              <SelectContent>
                {stations?.map((station) => (
                  <SelectItem key={station.id} value={station.id.toString()}>
                    {station.name} ({station.stationCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Start Date</label>
              <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? format(formData.startDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.startDate || undefined}
                    onSelect={(date) => {
                      setFormData({...formData, startDate: date || null});
                      setShowStartCalendar(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Start Time</label>
              <Select
                value={formData.startTime}
                onValueChange={(value) => setFormData({...formData, startTime: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <React.Fragment key={hour}>
                      <SelectItem value={`${hour.toString().padStart(2, '0')}:00`}>
                        {`${hour.toString().padStart(2, '0')}:00`}
                      </SelectItem>
                      <SelectItem value={`${hour.toString().padStart(2, '0')}:30`}>
                        {`${hour.toString().padStart(2, '0')}:30`}
                      </SelectItem>
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">End Date</label>
              <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.endDate ? format(formData.endDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.endDate || undefined}
                    onSelect={(date) => {
                      setFormData({...formData, endDate: date || null});
                      setShowEndCalendar(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">End Time</label>
              <Select
                value={formData.endTime}
                onValueChange={(value) => setFormData({...formData, endTime: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }).map((_, hour) => (
                    <React.Fragment key={hour}>
                      <SelectItem value={`${hour.toString().padStart(2, '0')}:00`}>
                        {`${hour.toString().padStart(2, '0')}:00`}
                      </SelectItem>
                      <SelectItem value={`${hour.toString().padStart(2, '0')}:30`}>
                        {`${hour.toString().padStart(2, '0')}:30`}
                      </SelectItem>
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="role" className="block text-sm font-medium">
              Role
            </label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({...formData, role: value})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="observer">Observer</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="coordinator">Coordinator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="block text-sm font-medium">
              Notes
            </label>
            <Textarea
              id="notes"
              placeholder="Add any special instructions or notes about this assignment"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="min-h-[100px]"
            />
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-between">
        {onSuccess && (
          <Button variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleSubmit} 
          disabled={createAssignment.isPending}
          className="ml-auto"
        >
          {createAssignment.isPending ? "Scheduling..." : "Schedule Assignment"}
        </Button>
      </CardFooter>
    </Card>
  );
}

interface AssignmentCardProps {
  assignment: Assignment & { station?: PollingStation };
  onCheckIn?: () => void;
  onCheckOut?: () => void;
}

export function AssignmentCard({ assignment, onCheckIn, onCheckOut }: AssignmentCardProps) {
  const startDate = new Date(assignment.startDate);
  const endDate = new Date(assignment.endDate);
  const now = new Date();
  const isActive = assignment.status === 'active';
  const isScheduled = assignment.status === 'scheduled';
  const hasStarted = isAfter(now, startDate);
  const hasEnded = isAfter(now, endDate);
  
  // Determine if check-in/check-out should be enabled
  const canCheckIn = isScheduled && hasStarted && !hasEnded;
  const canCheckOut = isActive && hasStarted;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{assignment.station?.name || `Station #${assignment.stationId}`}</CardTitle>
          <div 
            className={`px-2 py-1 rounded-full text-xs font-medium ${assignmentStatusColors[assignment.status] || 'bg-gray-100 text-gray-800'}`}
          >
            {assignment.status.charAt(0).toUpperCase() + assignment.status.slice(1)}
          </div>
        </div>
        <CardDescription className="flex items-center mt-1">
          <MapPin className="h-3.5 w-3.5 mr-1" />
          {assignment.station?.address}, {assignment.station?.city}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <div className="flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <span>Start:</span>
            </div>
            <span className="font-medium">
              {format(startDate, 'MMM d, yyyy h:mm a')}
            </span>
          </div>
          
          <div className="flex justify-between">
            <div className="flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <span>End:</span>
            </div>
            <span className="font-medium">
              {format(endDate, 'MMM d, yyyy h:mm a')}
            </span>
          </div>
          
          {assignment.role && (
            <div className="flex justify-between">
              <div className="flex items-center">
                <UserCheck className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <span>Role:</span>
              </div>
              <span className="font-medium capitalize">{assignment.role}</span>
            </div>
          )}
          
          {assignment.lastCheckIn && (
            <div className="flex justify-between">
              <div className="flex items-center">
                <BadgeCheck className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                <span>Checked in:</span>
              </div>
              <span className="font-medium">
                {format(new Date(assignment.lastCheckIn), 'MMM d, h:mm a')}
              </span>
            </div>
          )}
          
          {assignment.lastCheckOut && (
            <div className="flex justify-between">
              <div className="flex items-center">
                <BadgeCheck className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                <span>Checked out:</span>
              </div>
              <span className="font-medium">
                {format(new Date(assignment.lastCheckOut), 'MMM d, h:mm a')}
              </span>
            </div>
          )}
          
          {assignment.notes && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-sm text-muted-foreground">{assignment.notes}</p>
            </div>
          )}
        </div>
      </CardContent>
      
      {(canCheckIn || canCheckOut) && (
        <CardFooter className="pt-2">
          <div className="flex w-full gap-2">
            {canCheckIn && onCheckIn && (
              <Button 
                onClick={onCheckIn} 
                variant="outline"
                className="flex-1"
              >
                Check In
              </Button>
            )}
            
            {canCheckOut && onCheckOut && (
              <Button 
                onClick={onCheckOut}
                variant="outline"
                className="flex-1"
              >
                Check Out
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}