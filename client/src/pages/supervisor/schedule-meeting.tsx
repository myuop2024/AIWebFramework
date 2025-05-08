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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, CalendarClock, Users, Clock, Check } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

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

// Meeting form validation schema
const meetingFormSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters' }),
  date: z.date({ required_error: 'Please select a date' }),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Please enter a valid time in 24 hour format (HH:MM)',
  }),
  duration: z.string().min(1, { message: 'Please select a duration' }),
  location: z.string().min(3, { message: 'Location must be at least 3 characters' }),
  virtual: z.boolean().default(false),
  meetingUrl: z.string().url({ message: 'Please enter a valid URL' }).optional().or(z.literal('')),
  attendees: z
    .array(z.number())
    .min(1, { message: 'Please select at least one attendee' }),
  agenda: z.string().min(10, { message: 'Agenda must be at least 10 characters' }),
  sendReminders: z.boolean().default(true),
});

// Meeting form type
type MeetingFormValues = z.infer<typeof meetingFormSchema>;

export default function ScheduleMeetingPage() {
  const { toast } = useToast();
  const [selectedObservers, setSelectedObservers] = useState<number[]>([]);
  const [isVirtual, setIsVirtual] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  // Fetch team observers
  const { data: observers, isLoading: observersLoading } = useQuery<Observer[]>({
    queryKey: ['/api/supervisor/team']
  });

  // Form setup
  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(meetingFormSchema),
    defaultValues: {
      title: '',
      description: '',
      startTime: '09:00',
      duration: '60',
      location: '',
      virtual: false,
      meetingUrl: '',
      attendees: [],
      agenda: '',
      sendReminders: true,
    },
  });

  const { watch, setValue } = form;
  const watchVirtual = watch('virtual');

  // Handle virtual meeting toggle
  if (watchVirtual !== isVirtual) {
    setIsVirtual(watchVirtual);
    if (!watchVirtual) {
      setValue('meetingUrl', '');
    }
  }

  // Create meeting mutation (mock since there's no backend endpoint)
  const createMeetingMutation = useMutation({
    mutationFn: async (data: MeetingFormValues) => {
      // In a real app, this would call the API
      // For demo purposes, we'll just return a mock success
      return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true }), 1000);
      });
    },
    onSuccess: () => {
      toast({
        title: 'Meeting scheduled',
        description: 'Team meeting has been scheduled successfully',
      });
      setSubmissionSuccess(true);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error scheduling meeting',
        description: error.message,
      });
    },
  });

  // Form submission handler
  const onSubmit = (data: MeetingFormValues) => {
    createMeetingMutation.mutate(data);
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
        <h1 className="text-3xl font-bold">Schedule Team Meeting</h1>
      </div>

      {submissionSuccess ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-10">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Meeting Scheduled</h2>
            <p className="text-gray-500 mb-6 text-center max-w-md">
              Your team meeting has been scheduled successfully. Invitations have been sent to all attendees.
            </p>
            <Button onClick={() => {
              setSubmissionSuccess(false);
              form.reset();
            }}>
              Schedule Another Meeting
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Team Meeting Details</CardTitle>
            <CardDescription>
              Schedule a meeting with your team of observers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Team Briefing" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Meeting Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={'outline'}
                                className={`w-full pl-3 text-left font-normal ${
                                  !field.value && 'text-muted-foreground'
                                }`}
                              >
                                {field.value ? (
                                  format(field.value, 'PPP')
                                ) : (
                                  <span>Select a date</span>
                                )}
                                <CalendarClock className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
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
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (minutes)</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="90">1.5 hours</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="virtual"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 py-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Virtual Meeting</FormLabel>
                          <FormDescription>
                            Check if this meeting will be held virtually
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {isVirtual && (
                    <FormField
                      control={form.control}
                      name="meetingUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meeting URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://meet.google.com/..." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {!isVirtual && (
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Meeting Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Office Conference Room" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Brief description of the meeting purpose..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="agenda"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Agenda</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="1. Review of previous assignments
2. Upcoming election day preparations
3. New training opportunities"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="attendees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <div className="flex items-center mb-2">
                          <Users className="h-5 w-5 mr-2" />
                          <span>Attendees</span>
                        </div>
                      </FormLabel>
                      <FormControl>
                        <div className="border rounded-md p-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {observers?.map((observer) => (
                              <div
                                key={observer.id}
                                className={`flex items-center space-x-2 p-2 rounded-md cursor-pointer border ${
                                  field.value.includes(observer.id)
                                    ? 'border-primary bg-primary/5'
                                    : 'border-gray-200'
                                }`}
                                onClick={() => {
                                  const currentValues = [...field.value];
                                  if (currentValues.includes(observer.id)) {
                                    setValue(
                                      'attendees',
                                      currentValues.filter((id) => id !== observer.id)
                                    );
                                  } else {
                                    setValue('attendees', [...currentValues, observer.id]);
                                  }
                                }}
                              >
                                <Checkbox
                                  checked={field.value.includes(observer.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = [...field.value];
                                    if (checked) {
                                      setValue('attendees', [...currentValues, observer.id]);
                                    } else {
                                      setValue(
                                        'attendees',
                                        currentValues.filter((id) => id !== observer.id)
                                      );
                                    }
                                  }}
                                />
                                <div>
                                  <p className="font-medium text-sm">
                                    {observer.fullName || observer.username}
                                  </p>
                                  <p className="text-xs text-gray-500">{observer.email}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          {observers?.length === 0 && (
                            <p className="text-gray-500 text-center">No observers found in your team</p>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sendReminders"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Send Reminders</FormLabel>
                        <FormDescription>
                          Send email reminders to all attendees 24 hours before the meeting
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    className="w-full md:w-auto"
                    disabled={createMeetingMutation.isPending}
                  >
                    {createMeetingMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Schedule Meeting
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}