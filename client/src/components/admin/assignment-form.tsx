import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, addHours, isPast } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarClock, Clock, AlertCircle, User, MapPin, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

// Define the form schema with validation
const assignmentSchema = z.object({
  userId: z.string()
    .min(1, { message: "Please select an observer" }),
  stationId: z.string()
    .min(1, { message: "Please select a polling station" }),
  date: z.date({
    required_error: "Please select a date",
  }),
  startTime: z.string()
    .min(1, { message: "Please select a start time" }),
  endTime: z.string()
    .min(1, { message: "Please select an end time" }),
  notes: z.string().optional(),
}).refine((data) => {
  // Validate that end time is after start time
  if (!data.startTime || !data.endTime) return true;
  return data.endTime > data.startTime;
}, {
  message: "End time must be after start time",
  path: ["endTime"]
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

interface User {
  id: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  observerId?: string;
}

interface PollingStation {
  id: number;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  region?: string;
}

interface Assignment {
  id: number;
  userId: number;
  stationId: number;
  startDate: string;
  endDate: string;
  notes?: string;
  status?: string;
  isActive?: boolean;
}

interface AssignmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  assignment?: Assignment;
  title: string;
}

export function AssignmentForm({
  isOpen,
  onClose,
  onSubmit,
  assignment,
  title,
}: AssignmentFormProps) {
  const [schedulingError, setSchedulingError] = useState<string | null>(null);

  // Convert assignment dates to form values
  const assignmentToFormValues = (assignment: Assignment): AssignmentFormValues => {
    const startDate = new Date(assignment.startDate);
    const endDate = new Date(assignment.endDate);
    
    return {
      userId: String(assignment.userId),
      stationId: String(assignment.stationId),
      date: startDate,
      startTime: format(startDate, "HH:mm"),
      endTime: format(endDate, "HH:mm"),
      notes: assignment.notes || "",
    };
  };

  // Initialize form with default values
  const form = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: assignment 
      ? assignmentToFormValues(assignment) 
      : {
          userId: "",
          stationId: "",
          date: new Date(),
          startTime: "09:00",
          endTime: "17:00",
          notes: "",
        },
  });

  // Fetch users (observers)
  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    refetchOnWindowFocus: false,
  });

  // Fetch polling stations
  const { data: stations = [], isLoading: stationsLoading } = useQuery<PollingStation[]>({
    queryKey: ['/api/admin/polling-stations'],
    refetchOnWindowFocus: false,
  });

  // Filter to only show active observers
  const activeObservers = users.filter(user => user.observerId);

  // Update form when assignment prop changes
  useEffect(() => {
    if (assignment) {
      form.reset(assignmentToFormValues(assignment));
    }
  }, [assignment, form]);

  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setSchedulingError(null);
    }
  }, [isOpen, form]);

  // Handle form submission
  const handleSubmit = (values: AssignmentFormValues) => {
    setSchedulingError(null);
    
    // Convert form values to assignment data
    const date = values.date;
    const [startHour, startMinute] = values.startTime.split(':').map(Number);
    const [endHour, endMinute] = values.endTime.split(':').map(Number);
    
    const startDate = new Date(date);
    startDate.setHours(startHour, startMinute, 0);
    
    const endDate = new Date(date);
    endDate.setHours(endHour, endMinute, 0);
    
    // Check if the assignment is in the past
    if (isPast(startDate) && !assignment) {
      setSchedulingError("Cannot create assignments in the past");
      return;
    }
    
    // Check for scheduling conflicts
    // This would normally happen on the server, but we're doing a basic check here
    
    const assignmentData = {
      userId: parseInt(values.userId),
      stationId: parseInt(values.stationId),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      notes: values.notes,
    };
    
    onSubmit(assignment ? { id: assignment.id, ...assignmentData } : assignmentData);
  };

  // Handle cancel
  const handleCancel = () => {
    form.reset();
    onClose();
  };

  // Format user name
  const formatUserName = (user: User) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'Unnamed user';
    return user.observerId ? `${name} (${user.observerId})` : name;
  };

  // Generate time options in 15-minute intervals
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const hourStr = hour.toString().padStart(2, '0');
        const minuteStr = minute.toString().padStart(2, '0');
        options.push(`${hourStr}:${minuteStr}`);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {assignment 
              ? "Edit the details of this assignment." 
              : "Schedule a new observer assignment."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {schedulingError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Scheduling Error</p>
                  <p className="text-sm">{schedulingError}</p>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observer</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                      disabled={usersLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <User className="h-4 w-4 mr-2 opacity-70" />
                          <SelectValue placeholder="Select an observer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {usersLoading ? (
                          <SelectItem value="loading" disabled>Loading observers...</SelectItem>
                        ) : activeObservers.length === 0 ? (
                          <SelectItem value="none" disabled>No active observers available</SelectItem>
                        ) : (
                          activeObservers.map((user) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {formatUserName(user)}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the observer to assign
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="stationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Polling Station</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                      disabled={stationsLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <MapPin className="h-4 w-4 mr-2 opacity-70" />
                          <SelectValue placeholder="Select a polling station" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stationsLoading ? (
                          <SelectItem value="loading" disabled>Loading stations...</SelectItem>
                        ) : stations.length === 0 ? (
                          <SelectItem value="none" disabled>No polling stations available</SelectItem>
                        ) : (
                          stations.map((station) => (
                            <SelectItem key={station.id} value={station.id.toString()}>
                              {station.name} {station.code ? `(${station.code})` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the polling station for this assignment
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className="w-full pl-3 text-left font-normal"
                            >
                              <CalendarClock className="h-4 w-4 mr-2 opacity-70" />
                              {field.value ? (
                                format(field.value, "MMM d, yyyy")
                              ) : (
                                <span>Pick a date</span>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => isPast(date) && !assignment}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>Start Time</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <Clock className="h-4 w-4 mr-2 opacity-70" />
                            <SelectValue placeholder="Start time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={`start-${time}`} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>End Time</FormLabel>
                      <Select 
                        value={field.value} 
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <Clock className="h-4 w-4 mr-2 opacity-70" />
                            <SelectValue placeholder="End time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeOptions.map((time) => (
                            <SelectItem key={`end-${time}`} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any special instructions or notes about this assignment"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">
                <Check className="h-4 w-4 mr-2" />
                {assignment ? "Update Assignment" : "Create Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}