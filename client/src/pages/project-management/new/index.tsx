import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';

// Fix the circular reference error with a proper type definition first
interface ProjectFormSchema {
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  startDate?: Date;
  endDate?: Date;
  ownerId?: number;
}

// Form schema for new project
const formSchema = z.object({
  name: z.string().min(3, {
    message: "Project name must be at least 3 characters long",
  }),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']),
  startDate: z.date().optional(),
  endDate: z.date().optional().refine(
    (date, ctx) => {
      // Get the start date from context
      const startDate = ctx.parent.startDate;
      // If no end date or no start date, validation passes
      if (!date || !startDate) return true;
      // Otherwise, check that end date is after start date
      return date > startDate;
    }, {
    message: "End date must be after start date",
  }).optional(),
  ownerId: z.number().optional(), // Allow for owner selection but don't require it
});

type FormValues = z.infer<typeof formSchema>;

// Type for users returned from API
interface User {
  id: number;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
}

const NewProjectPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch users for project owner selection
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ['/api/project-management/users'],
    onError: (error) => {
      console.error('Failed to fetch users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users. Please try refreshing the page.',
        variant: 'destructive',
      });
    }
  });
  
  // Form setup with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'planning',
      startDate: new Date(),
      endDate: undefined,
      ownerId: undefined,
    },
  });
  
  // Mutation for creating a new project
  const createProject = useMutation({
    mutationFn: async (data: FormValues) => {
      // Make sure we log the data being sent
      console.log('Creating project with data:', JSON.stringify(data, null, 2));
      
      // Make a POST request to the project creation endpoint
      const response = await fetch('/api/project-management/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      // Capture the raw response text for debugging
      const responseText = await response.text();
      
      if (!response.ok) {
        // Try to parse the error response
        let errorMessage = 'Failed to create project';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
          
          // Check for validation errors from Zod
          if (errorData.errors && Array.isArray(errorData.errors)) {
            const validationErrors = errorData.errors.map((err: any) => 
              `${err.path.join('.')} - ${err.message}`
            ).join(', ');
            errorMessage = `Validation errors: ${validationErrors}`;
          }
        } catch (e) {
          console.error('Failed to parse error response:', responseText);
        }
        throw new Error(errorMessage);
      }
      
      // Parse the successful response
      try {
        return JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse successful response:', responseText);
        throw new Error('Received invalid response from server');
      }
    },
    onSuccess: (data: any) => {
      // Log success for debugging
      console.log('Project created successfully:', data);
      
      // Invalidate queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      queryClient.invalidateQueries({ queryKey: ['/api/project-management/projects'] });
      
      toast({
        title: "Project created",
        description: "The project has been created successfully.",
      });
      
      // Navigate to project management dashboard
      setLocation(`/project-management`);
    },
    onError: (error: any) => {
      console.error("Project creation error:", error);
      toast({
        title: "Error creating project",
        description: error.message || "Failed to create the project. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: FormValues) => {
    createProject.mutate(data);
  };
  
  const handleBack = () => {
    setLocation('/project-management');
  };
  
  return (
    <div className="container p-4 space-y-6">
      <div className="flex items-center">
        <Button variant="outline" size="icon" onClick={handleBack} className="mr-4">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Create New Project</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>Enter the information for your new project</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter project name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe the project" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="ownerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project Owner</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                        disabled={isLoadingUsers}
                      >
                        <FormControl>
                          <SelectTrigger>
                            {isLoadingUsers ? (
                              <div className="flex items-center">
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                <span>Loading users...</span>
                              </div>
                            ) : (
                              <SelectValue placeholder="Select project owner" />
                            )}
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users && users.length > 0 ? (
                            users.map((user) => (
                              <SelectItem key={user.id} value={user.id.toString()}>
                                {user.firstName && user.lastName 
                                  ? `${user.firstName} ${user.lastName} (${user.username})`
                                  : user.username}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="" disabled>No users available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
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
                  name="endDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < (form.getValues().startDate || new Date())}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleBack}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProject.isPending}>
                  {createProject.isPending ? (
                    "Creating..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Project
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewProjectPage;