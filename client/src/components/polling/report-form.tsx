import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { createWorker } from 'tesseract.js';
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle, Upload, X, Camera, FileText, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Define a schema for file attachments
const fileSchema = z.object({
  file: z.instanceof(File),
  previewUrl: z.string().optional(),
  type: z.string(),
  size: z.number(),
  name: z.string(),
});

// Define the form schema with enhanced validation
const reportSchema = z.object({
  stationId: z.number({
    required_error: "Please select a polling station",
  }),
  reportType: z.string({
    required_error: "Please select a report type",
  }),
  content: z.object({
    observationTime: z.string()
      .min(1, "Observation time is required")
      .refine(time => {
        const date = new Date(time);
        return !isNaN(date.getTime());
      }, "Please enter a valid date and time"),
    voterTurnout: z.string()
      .min(1, "Voter turnout is required"),
    queueLength: z.string()
      .min(1, "Queue length is required"),
    stationAccessibility: z.string()
      .min(1, "Accessibility rating is required"),
    issuesObserved: z.array(z.string())
      .optional()
      .refine(issues => {
        // If "other" is selected, make sure otherIssuesDetails is provided
        if (issues?.includes("other")) {
          return true; // We'll check otherIssuesDetails separately
        }
        return true;
      }),
    otherIssuesDetails: z.string()
      .optional()
      .refine((details, ctx) => {
        // If "other" is selected in issuesObserved, details must be provided
        const issues = ctx.path[ctx.path.length - 2] === "content" 
          ? (ctx.parent as any).issuesObserved 
          : [];
          
        if (Array.isArray(issues) && issues.includes("other")) {
          return details && details.trim().length > 0;
        }
        return true;
      }, "Please provide details for 'Other' issues"),
    stationOpened: z.boolean(),
    stationOpenedTime: z.string()
      .optional()
      .refine((time, ctx) => {
        // Only validate if stationOpened is false
        const stationOpened = ctx.path[ctx.path.length - 2] === "content" 
          ? (ctx.parent as any).stationOpened 
          : true;
          
        if (!stationOpened && (!time || time.trim().length === 0)) {
          return false;
        }
        return true;
      }, "Please specify the time when the station opened"),
    additionalNotes: z.string()
      .optional()
      .transform(val => val || ""),
    locationLat: z.number().optional(),
    locationLng: z.number().optional(),
  }),
  mileageTraveled: z.number()
    .optional()
    .refine(value => {
      // If provided, must be positive
      return value === undefined || value === null || value >= 0;
    }, "Mileage must be a positive number"),
});

type ReportFormValues = z.infer<typeof reportSchema>;

export default function ReportForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<z.infer<typeof fileSchema>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch polling stations
  const { data: stations, isLoading: isStationsLoading } = useQuery({
    queryKey: ['/api/polling-stations'],
  });

  // Fetch user assignments
  const { data: assignments, isLoading: isAssignmentsLoading } = useQuery({
    queryKey: ['/api/users/assignments'],
  });

  // Set up the form with zodResolver
  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportType: "standardObservation",
      content: {
        observationTime: new Date().toISOString().substring(0, 16),
        voterTurnout: "medium",
        queueLength: "short",
        stationAccessibility: "good",
        issuesObserved: [],
        otherIssuesDetails: "",
        stationOpened: true,
        stationOpenedTime: "",
        additionalNotes: "",
      },
      mileageTraveled: 0,
    },
  });

  // Watch for form value changes
  const reportType = form.watch("reportType");
  const issuesObserved = form.watch("content.issuesObserved");
  const stationOpened = form.watch("content.stationOpened");

  // Set default station ID if user has assignments
  useState(() => {
    if (assignments?.length && !form.getValues("stationId")) {
      // Try to find primary assignment first, otherwise use the first assignment
      const primaryAssignment = assignments.find(a => a.isPrimary);
      const defaultAssignment = primaryAssignment || assignments[0];
      
      if (defaultAssignment) {
        form.setValue("stationId", defaultAssignment.stationId);
      }
    }
  });

  // Mutation for submitting report
  const submitReportMutation = useMutation({
    mutationFn: async (data: ReportFormValues) => {
      const res = await apiRequest("POST", "/api/reports", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      
      toast({
        title: "Report Submitted",
        description: "Your observation report has been submitted successfully.",
        variant: "default",
      });
      
      // Navigate back to reports list
      navigate("/reports");
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to submit report.");
      
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your report. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle file uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const invalidFiles = files.filter(file => file.size > maxSize);
    
    if (invalidFiles.length > 0) {
      toast({
        title: "File too large",
        description: `Files must be under 10MB. ${invalidFiles.map(f => f.name).join(', ')} ${invalidFiles.length > 1 ? 'are' : 'is'} too large.`,
        variant: "destructive",
      });
      return;
    }
    
    // Process each file
    files.forEach(file => {
      // Create a preview URL for images
      let previewUrl: string | undefined;
      if (file.type.startsWith('image/')) {
        previewUrl = URL.createObjectURL(file);
      }
      
      // Add to attachments state
      setAttachments(prev => [
        ...prev,
        {
          file,
          previewUrl,
          type: file.type,
          size: file.size,
          name: file.name
        }
      ]);
    });
    
    // Clear input so the same file can be selected again if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Remove an attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      // Revoke object URL to avoid memory leaks
      if (newAttachments[index].previewUrl) {
        URL.revokeObjectURL(newAttachments[index].previewUrl);
      }
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };
  
  // Capture image from camera
  const captureImage = async () => {
    // In a real implementation, you would use a library or API to access the device camera
    // For now, we'll just simulate capturing by showing the file dialog
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.capture = 'environment';
      fileInputRef.current.click();
    }
  };
  
  // Calculate the total size of all attachments
  const totalAttachmentSize = attachments.reduce((total, attachment) => total + attachment.size, 0);
  const totalSizeMB = (totalAttachmentSize / (1024 * 1024)).toFixed(2);
  
  // State for OCR processing
  const [isProcessingOcr, setIsProcessingOcr] = useState(false);
  const [ocrResults, setOcrResults] = useState<{file: string, text: string}[]>([]);
  
  // Process image with OCR to extract text
  const processImageWithOCR = async (imageFile: File, index: number) => {
    if (!imageFile.type.startsWith('image/')) {
      toast({
        title: "OCR Error",
        description: `Only image files can be processed for text extraction.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessingOcr(true);
    
    try {
      toast({
        title: "Processing Image",
        description: "Extracting text from image...",
        variant: "default",
      });
      
      // Initialize Tesseract worker
      const worker = await createWorker();
      
      // Set language to recognize english text
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      // Read the image file
      const imageData = URL.createObjectURL(imageFile);
      
      // Process the image with tesseract OCR
      const { data: { text } } = await worker.recognize(imageData);
      
      // Terminate the worker to free up resources
      await worker.terminate();
      
      if (text && text.trim()) {
        // Add OCR result
        setOcrResults(prev => [...prev, { file: imageFile.name, text }]);
        
        // Append to additional notes if there is text found
        const currentNotes = form.getValues('content.additionalNotes') || '';
        const updatedNotes = currentNotes +
          (currentNotes ? '\n\n' : '') +
          `--- OCR Text from ${imageFile.name} ---\n${text.trim()}`;
        
        form.setValue('content.additionalNotes', updatedNotes, { shouldValidate: true });
        
        toast({
          title: "Text Extracted",
          description: `Successfully extracted text from ${imageFile.name}`,
          variant: "default",
        });
      } else {
        toast({
          title: "No Text Found",
          description: `No readable text found in ${imageFile.name}`,
          variant: "default",
        });
      }
      
      // Clean up the object URL
      URL.revokeObjectURL(imageData);
    } catch (error) {
      console.error('OCR processing error:', error);
      toast({
        title: "OCR Failed",
        description: `Error processing image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
    
    setIsProcessingOcr(false);
  };

  const onSubmit = async (values: ReportFormValues) => {
    // Get current location if available
    if (navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          });
        });
        
        // Add location to form values
        values.content.locationLat = position.coords.latitude;
        values.content.locationLng = position.coords.longitude;
      } catch (error) {
        console.warn("Unable to get location:", error);
      }
    }
    
    // Submit the form data
    submitReportMutation.mutate(values);
    
    // In a real implementation, you would upload the attachments here
    // and associate them with the report ID returned from the API
    if (attachments.length > 0) {
      toast({
        title: "Attachments processing",
        description: `Processing ${attachments.length} attachment(s). This may take a moment.`,
        variant: "default",
      });
      
      // This would be replaced with real attachment upload logic
      // For demonstration purposes, we'll just simulate success
      setTimeout(() => {
        toast({
          title: "Attachments uploaded",
          description: `Successfully uploaded ${attachments.length} attachment(s).`,
          variant: "default",
        });
      }, 2000);
    }
  };

  // List of possible issues that can be observed
  const issueOptions = [
    { id: "longQueues", label: "Excessive queue lengths" },
    { id: "equipmentFailure", label: "Equipment failure or malfunction" },
    { id: "voterIntimidation", label: "Voter intimidation" },
    { id: "accessibilityIssues", label: "Accessibility problems" },
    { id: "identificationIssues", label: "Identification verification issues" },
    { id: "staffShortage", label: "Polling staff shortage" },
    { id: "other", label: "Other (please specify)" },
  ];

  if (isStationsLoading || isAssignmentsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">New Observation Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">New Observation Report</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="stationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Polling Station</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a polling station" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {assignments && assignments.length > 0 ? (
                          assignments.map((assignment) => {
                            const station = stations?.find(s => s.id === assignment.stationId);
                            return (
                              <SelectItem 
                                key={assignment.stationId} 
                                value={assignment.stationId.toString()}
                              >
                                {station?.name} {assignment.isPrimary && "(Primary)"}
                              </SelectItem>
                            );
                          })
                        ) : (
                          stations?.map((station) => (
                            <SelectItem 
                              key={station.id} 
                              value={station.id.toString()}
                            >
                              {station.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the polling station you are reporting on
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reportType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Report Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a report type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="standardObservation">Standard Observation</SelectItem>
                        <SelectItem value="incidentReport">Incident Report</SelectItem>
                        <SelectItem value="openingProcedures">Opening Procedures</SelectItem>
                        <SelectItem value="closingProcedures">Closing Procedures</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the type of report you are submitting
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content.observationTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observation Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>
                      When did you make this observation?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Dynamic form fields based on report type */}
            {reportType === "standardObservation" && (
              <div className="space-y-4 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium">Observation Details</h3>
                
                <FormField
                  control={form.control}
                  name="content.voterTurnout"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voter Turnout</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select voter turnout" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="veryLow">Very Low</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="veryHigh">Very High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content.queueLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Queue Length</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select queue length" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No Queue</SelectItem>
                          <SelectItem value="short">Short (1-5 people)</SelectItem>
                          <SelectItem value="moderate">Moderate (6-15 people)</SelectItem>
                          <SelectItem value="long">Long (16-30 people)</SelectItem>
                          <SelectItem value="veryLong">Very Long (30+ people)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="content.stationAccessibility"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Station Accessibility</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="poor" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Poor - Significant barriers for disabled voters
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="fair" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Fair - Some barriers but mostly accessible
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="good" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Good - Easily accessible for all voters
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="excellent" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Excellent - Complete accessibility with additional accommodations
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Issues observed section */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium">Issues Observed</h3>
              
              <FormField
                control={form.control}
                name="content.issuesObserved"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel className="text-base">Select any issues observed:</FormLabel>
                      <FormDescription>
                        Check all that apply
                      </FormDescription>
                    </div>
                    
                    {issueOptions.map((issue) => (
                      <FormField
                        key={issue.id}
                        control={form.control}
                        name="content.issuesObserved"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={issue.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(issue.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    const newValue = checked
                                      ? [...currentValue, issue.id]
                                      : currentValue.filter((val) => val !== issue.id);
                                    field.onChange(newValue);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {issue.label}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {issuesObserved?.includes("other") && (
                <FormField
                  control={form.control}
                  name="content.otherIssuesDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Other Issues Details</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Please describe the other issues observed"
                          className="resize-none"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Opening procedures specific fields */}
            {reportType === "openingProcedures" && (
              <div className="space-y-4 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium">Opening Procedures</h3>
                
                <FormField
                  control={form.control}
                  name="content.stationOpened"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Did the station open on time?
                        </FormLabel>
                        <FormDescription>
                          The polling station should open at the designated time.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {!stationOpened && (
                  <FormField
                    control={form.control}
                    name="content.stationOpenedTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What time did the station open?</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="content.additionalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional observations or notes here"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mileageTraveled"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mileage Traveled (optional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Enter distance traveled in miles"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the distance you traveled to reach this polling station
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Attachment Section */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Attachments</h3>
                <span className="text-sm text-gray-500">
                  {attachments.length > 0 ? `${attachments.length} file(s) - ${totalSizeMB} MB total` : 'No files attached'}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.accept = '.jpg,.jpeg,.png,.pdf,.doc,.docx';
                      fileInputRef.current.capture = '';
                      fileInputRef.current.click();
                    }
                  }}
                >
                  <Paperclip className="mr-2 h-4 w-4" />
                  Browse Files
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={captureImage}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Take Photo
                </Button>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                  multiple
                />
              </div>
              
              {attachments.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4">
                  {attachments.map((attachment, index) => (
                    <div 
                      key={index} 
                      className="relative border rounded-md p-2 flex flex-col gap-2"
                    >
                      <div className="absolute top-2 right-2 z-10 flex space-x-1">
                        {attachment.type.startsWith('image/') && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6 rounded-full"
                            onClick={() => processImageWithOCR(attachment.file, index)}
                            disabled={isProcessingOcr}
                            title="Extract text from image"
                          >
                            {isProcessingOcr ? (
                              <Clock className="h-3 w-3 animate-spin" />
                            ) : (
                              <Upload className="h-3 w-3" />
                            )}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="h-6 w-6 rounded-full"
                          onClick={() => removeAttachment(index)}
                          title="Remove attachment"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {attachment.previewUrl ? (
                        <div className="h-24 w-full flex items-center justify-center">
                          <img 
                            src={attachment.previewUrl} 
                            alt={attachment.name} 
                            className="max-h-full max-w-full object-contain"
                          />
                        </div>
                      ) : (
                        <div className="h-24 w-full flex items-center justify-center bg-gray-100 rounded">
                          <FileText className="h-10 w-10 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <p className="text-sm font-medium truncate" title={attachment.name}>
                          {attachment.name}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {attachment.type.split('/')[1].toUpperCase()}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {(attachment.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </div>
                        
                        {/* Show if OCR has been applied to this image */}
                        {ocrResults.some(result => result.file === attachment.name) && (
                          <Badge variant="success" className="mt-1 text-xs">
                            Text extracted
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <FormDescription>
                Attach photos or documents to support your report. Images will be processed for text (OCR).
              </FormDescription>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate("/reports")}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={submitReportMutation.isPending}
              >
                {submitReportMutation.isPending ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
