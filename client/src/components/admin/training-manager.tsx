import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { PlusCircle, Pencil, Trash2, FileText, Video, BookOpen, PlayCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Define the schema for training module form
const trainingModuleSchema = z.object({
  title: z.string().min(3, {
    message: "Title must be at least 3 characters long",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters long",
  }),
  moduleType: z.enum(["video", "reading", "interactive", "quiz"]),
  category: z.string().min(3, {
    message: "Category must be at least 3 characters long",
  }),
  content: z.string().optional(),
  videoUrl: z.string().url().optional(),
  estimatedDuration: z.coerce.number().min(1, {
    message: "Duration must be at least 1 minute",
  }),
  isActive: z.boolean().default(true),
  requiredForCertification: z.boolean().default(false),
  sortOrder: z.coerce.number().default(0),
});

type TrainingModuleForm = z.infer<typeof trainingModuleSchema>;

interface TrainingManagerProps {
  userId?: number;
}

export function TrainingManager({ userId }: TrainingManagerProps) {
  const [activeTab, setActiveTab] = useState("modules");
  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any | null>(null);
  const { toast } = useToast();

  // Fetch training modules
  const { data: modules, isLoading: isModulesLoading } = useQuery({
    queryKey: ['/api/admin/training-modules'],
  });

  // Fetch user progress (for reports)
  const { data: userProgress, isLoading: isProgressLoading } = useQuery({
    queryKey: ['/api/admin/training-progress'],
  });

  // Form setup
  const form = useForm<TrainingModuleForm>({
    resolver: zodResolver(trainingModuleSchema),
    defaultValues: {
      title: "",
      description: "",
      moduleType: "reading",
      category: "Core Training",
      content: "",
      videoUrl: "",
      estimatedDuration: 15,
      isActive: true,
      requiredForCertification: true,
      sortOrder: 0,
    },
  });

  // Create module mutation
  const createModuleMutation = useMutation({
    mutationFn: async (data: TrainingModuleForm) => {
      // In a real implementation, this would call an API endpoint
      return fetch('/api/admin/training-modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Training module created",
        description: "The training module has been successfully created.",
      });
      setIsAddModuleOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/training-modules'] });
    },
    onError: (error) => {
      toast({
        title: "Error creating module",
        description: "There was an error creating the training module. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating module:", error);
    },
  });

  // Update module mutation
  const updateModuleMutation = useMutation({
    mutationFn: async (data: TrainingModuleForm & { id: number }) => {
      // In a real implementation, this would call an API endpoint
      return fetch(`/api/admin/training-modules/${data.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Training module updated",
        description: "The training module has been successfully updated.",
      });
      setIsAddModuleOpen(false);
      setEditingModule(null);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/training-modules'] });
    },
    onError: (error) => {
      toast({
        title: "Error updating module",
        description: "There was an error updating the training module. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating module:", error);
    },
  });

  // Delete module mutation
  const deleteModuleMutation = useMutation({
    mutationFn: async (id: number) => {
      // In a real implementation, this would call an API endpoint
      return fetch(`/api/admin/training-modules/${id}`, {
        method: 'DELETE',
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Training module deleted",
        description: "The training module has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/training-modules'] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting module",
        description: "There was an error deleting the training module. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting module:", error);
    },
  });

  // Handle form submission
  const onSubmit = (data: TrainingModuleForm) => {
    if (editingModule) {
      updateModuleMutation.mutate({ ...data, id: editingModule.id });
    } else {
      createModuleMutation.mutate(data);
    }
  };

  // Handle edit module
  const handleEditModule = (module: any) => {
    setEditingModule(module);
    
    // Populate form with module data
    form.reset({
      title: module.title,
      description: module.description,
      moduleType: module.moduleType,
      category: module.category,
      content: module.content || "",
      videoUrl: module.videoUrl || "",
      estimatedDuration: module.estimatedDuration,
      isActive: module.isActive,
      requiredForCertification: module.requiredForCertification,
      sortOrder: module.sortOrder || 0,
    });
    
    setIsAddModuleOpen(true);
  };

  // Handle delete module
  const handleDeleteModule = (moduleId: number) => {
    if (confirm("Are you sure you want to delete this training module? This action cannot be undone.")) {
      deleteModuleMutation.mutate(moduleId);
    }
  };

  // Handle add module button
  const handleAddModule = () => {
    setEditingModule(null);
    form.reset({
      title: "",
      description: "",
      moduleType: "reading",
      category: "Core Training",
      content: "",
      videoUrl: "",
      estimatedDuration: 15,
      isActive: true,
      requiredForCertification: true,
      sortOrder: 0,
    });
    setIsAddModuleOpen(true);
  };

  // Get module type icon
  const getModuleTypeIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Video className="h-4 w-4" />;
      case "reading":
        return <FileText className="h-4 w-4" />;
      case "interactive":
        return <PlayCircle className="h-4 w-4" />;
      case "quiz":
        return <BookOpen className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Mock data if API is not yet implemented
  const mockModules = [
    {
      id: 1,
      title: "Observer Fundamentals",
      description: "Introduction to the role and responsibilities of election observers",
      moduleType: "reading",
      category: "Core Training",
      estimatedDuration: 15,
      isActive: true,
      requiredForCertification: true,
      completionCount: 45,
      createdAt: "2023-04-15T10:30:00Z",
      sortOrder: 1,
    },
    {
      id: 2,
      title: "Election Day Procedures",
      description: "Detailed walkthrough of election day protocols and procedures",
      moduleType: "video",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      category: "Core Training",
      estimatedDuration: 25,
      isActive: true,
      requiredForCertification: true,
      completionCount: 38,
      createdAt: "2023-04-18T14:20:00Z",
      sortOrder: 2,
    },
    {
      id: 3,
      title: "Reporting Incidents",
      description: "How to document and report election irregularities",
      moduleType: "interactive",
      category: "Specialization",
      estimatedDuration: 20,
      isActive: true,
      requiredForCertification: false,
      completionCount: 27,
      createdAt: "2023-04-22T09:15:00Z",
      sortOrder: 3,
    },
    {
      id: 4,
      title: "Observer Assessment",
      description: "Final assessment to test knowledge of election observation procedures",
      moduleType: "quiz",
      category: "Assessment",
      estimatedDuration: 30,
      isActive: true,
      requiredForCertification: true,
      completionCount: 31,
      createdAt: "2023-04-25T11:45:00Z",
      sortOrder: 4,
    },
  ];

  // Use mock data if API data is not available
  const displayModules = modules || mockModules;

  // Mock user progress data
  const mockUserProgress = [
    { 
      userId: 1, 
      userName: "John Doe", 
      email: "john@example.com",
      completedModules: 3,
      totalModules: 4,
      progressPercentage: 75,
      certificationStatus: "In Progress",
      lastActivityDate: "2023-05-10T15:20:00Z"
    },
    { 
      userId: 2, 
      userName: "Jane Smith", 
      email: "jane@example.com",
      completedModules: 4,
      totalModules: 4,
      progressPercentage: 100,
      certificationStatus: "Certified",
      lastActivityDate: "2023-05-12T10:45:00Z"
    },
    { 
      userId: 3, 
      userName: "Bob Johnson", 
      email: "bob@example.com",
      completedModules: 1,
      totalModules: 4,
      progressPercentage: 25,
      certificationStatus: "In Progress",
      lastActivityDate: "2023-05-08T09:30:00Z"
    },
  ];

  // Use mock data if API data is not available
  const displayUserProgress = userProgress || mockUserProgress;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Training Management</CardTitle>
        <CardDescription>
          Create, edit, and manage training modules for election observers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="modules">Training Modules</TabsTrigger>
            <TabsTrigger value="reports">Progress Reports</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="modules">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium">All Training Modules</h3>
              <Button onClick={handleAddModule}>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Module
              </Button>
            </div>
            
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Completions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayModules.map((module: any) => (
                    <TableRow key={module.id}>
                      <TableCell className="font-medium">{module.title}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          {getModuleTypeIcon(module.moduleType)}
                          <span className="ml-2 capitalize">{module.moduleType}</span>
                        </div>
                      </TableCell>
                      <TableCell>{module.category}</TableCell>
                      <TableCell>{module.estimatedDuration} min</TableCell>
                      <TableCell>
                        <Badge variant={module.isActive ? "outline" : "secondary"} className={module.isActive ? "bg-green-50 text-green-700" : ""}>
                          {module.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {module.requiredForCertification ? "Yes" : "No"}
                      </TableCell>
                      <TableCell>{module.completionCount || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditModule(module)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleDeleteModule(module.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="reports">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Training Progress Overview</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold mb-1">
                        {displayUserProgress.filter(u => u.progressPercentage === 100).length}
                      </div>
                      <p className="text-sm text-gray-500">Fully Certified Observers</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold mb-1">
                        {displayUserProgress.filter(u => u.progressPercentage > 0 && u.progressPercentage < 100).length}
                      </div>
                      <p className="text-sm text-gray-500">Observers In Progress</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-3xl font-bold mb-1">
                        {displayUserProgress.reduce((sum, user) => sum + user.completedModules, 0)}
                      </div>
                      <p className="text-sm text-gray-500">Total Modules Completed</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium mb-4">Observer Training Progress</h3>
                
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Observer</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Completed</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayUserProgress.map((user: any) => (
                        <TableRow key={user.userId}>
                          <TableCell className="font-medium">{user.userName}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-full max-w-[100px] h-2 bg-gray-200 rounded-full overflow-hidden mr-2">
                                <div 
                                  className="h-2 bg-primary" 
                                  style={{ width: `${user.progressPercentage}%` }}
                                />
                              </div>
                              <span>{user.progressPercentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.completedModules} / {user.totalModules}</TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={user.certificationStatus === 'Certified' 
                                ? "bg-green-50 text-green-700" 
                                : "bg-yellow-50 text-yellow-700"
                              }
                            >
                              {user.certificationStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(user.lastActivityDate).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Training Program Settings</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-4 border rounded-md">
                    <div className="flex-1">
                      <h4 className="font-medium">Certification Requirements</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Specify which modules are required for observer certification
                      </p>
                    </div>
                    <Button variant="outline">Configure</Button>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 border rounded-md">
                    <div className="flex-1">
                      <h4 className="font-medium">Notification Settings</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Configure email notifications for training progress and completion
                      </p>
                    </div>
                    <Button variant="outline">Configure</Button>
                  </div>
                  
                  <div className="flex items-start space-x-4 p-4 border rounded-md">
                    <div className="flex-1">
                      <h4 className="font-medium">Certificate Design</h4>
                      <p className="text-sm text-gray-500 mt-1">
                        Customize the appearance of observer certification documents
                      </p>
                    </div>
                    <Button variant="outline">Customize</Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Add/Edit Module Dialog */}
      <Dialog open={isAddModuleOpen} onOpenChange={setIsAddModuleOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingModule ? "Edit Training Module" : "Add New Training Module"}</DialogTitle>
            <DialogDescription>
              {editingModule
                ? "Update the details of this training module"
                : "Create a new training module for observers"
              }
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Module Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter module title" {...field} />
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
                          <Textarea 
                            placeholder="Enter module description" 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="moduleType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Module Type</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="reading">Reading</SelectItem>
                              <SelectItem value="video">Video</SelectItem>
                              <SelectItem value="interactive">Interactive</SelectItem>
                              <SelectItem value="quiz">Quiz</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Core Training">Core Training</SelectItem>
                              <SelectItem value="Specialization">Specialization</SelectItem>
                              <SelectItem value="Assessment">Assessment</SelectItem>
                              <SelectItem value="Reference">Reference</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="estimatedDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="space-y-6">
                  {form.watch('moduleType') === 'video' && (
                    <FormField
                      control={form.control}
                      name="videoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Video URL</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter YouTube video URL" {...field} />
                          </FormControl>
                          <FormDescription>
                            Enter a YouTube video URL
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  {(form.watch('moduleType') === 'reading' || form.watch('moduleType') === 'quiz') && (
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Content</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder={
                                form.watch('moduleType') === 'reading' 
                                  ? "Enter module content (supports HTML)" 
                                  : "Enter quiz questions in JSON format"
                              }
                              className="min-h-[200px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            {form.watch('moduleType') === 'reading' 
                              ? "For reading modules, you can use HTML to format the content" 
                              : "For quiz modules, enter questions and answers in JSON format"
                            }
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active</FormLabel>
                            <FormDescription>
                              Make this module available to observers
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="requiredForCertification"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Required for Certification</FormLabel>
                            <FormDescription>
                              Make this module required for observer certification
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="sortOrder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sort Order</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormDescription>
                          Order in which this module appears (lower numbers appear first)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddModuleOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createModuleMutation.isPending || updateModuleMutation.isPending}
                >
                  {createModuleMutation.isPending || updateModuleMutation.isPending
                    ? "Saving..."
                    : editingModule ? "Update Module" : "Create Module"
                  }
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}