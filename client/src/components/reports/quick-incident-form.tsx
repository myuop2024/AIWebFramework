import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Camera,
  Upload,
  Trash2,
  UploadCloud,
  MapPin,
  AlertTriangle,
  Check,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface QuickIncidentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportSubmitted?: () => void;
}

interface IncidentFormValues {
  stationId: string;
  incidentType: string;
  description: string;
  severity: string;
}

interface IncidentType {
  id: string;
  name: string;
  severity: string;
}

interface PollingStation {
  id: number;
  name: string;
  address: string;
}

export default function QuickIncidentForm({
  open,
  onOpenChange,
  onReportSubmitted,
}: QuickIncidentFormProps) {
  // Fetch the template for quick incident reporting
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ['/api/quick-reports/templates'],
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: open, // Only fetch when the form is open
  });
  
  // Use the first active template or the first one available
  const formTemplate = templates.find(t => t.isActive) || templates[0];
  const [imageCapture, setImageCapture] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "getting" | "success" | "error">("idle");
  const [location, setLocation] = useState<{lat: number; lng: number} | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<IncidentFormValues>();
  
  const stationId = watch("stationId");
  const incidentType = watch("incidentType");
  
  // Get incident types
  const { data: incidentTypes = [] } = useQuery<IncidentType[]>({
    queryKey: ['/api/quick-reports/incident-types'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Get polling stations
  const { data: pollingStations = [] } = useQuery<PollingStation[]>({
    queryKey: ['/api/polling-stations'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Get user assignments - to set default station
  const { data: assignments = [] } = useQuery<any[]>({
    queryKey: ['/api/users/assignments'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Set default station ID if user has assignments
  useEffect(() => {
    if (assignments.length && !stationId) {
      // Try to find primary assignment first, otherwise use the first assignment
      const primaryAssignment = assignments.find(a => a.isPrimary);
      const defaultAssignment = primaryAssignment || assignments[0];
      
      if (defaultAssignment) {
        setValue("stationId", defaultAssignment.stationId.toString());
      }
    }
  }, [assignments, setValue, stationId]);
  
  // Set default severity based on incidentType
  useEffect(() => {
    if (incidentType) {
      const selectedType = incidentTypes.find(type => type.id === incidentType);
      if (selectedType) {
        setValue("severity", selectedType.severity);
      }
    }
  }, [incidentType, incidentTypes, setValue]);
  
  // Mutation for submitting report
  const submitReportMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch('/api/quick-reports', {
        method: 'POST',
        body: data,
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to submit report");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      
      toast({
        title: "Incident Reported",
        description: "Your incident report has been submitted successfully.",
        variant: "default",
      });
      
      // Reset form and close modal
      reset();
      setImageCapture(null);
      setLocation(null);
      setLocationStatus("idle");
      stopCamera();
      
      if (onReportSubmitted) {
        onReportSubmitted();
      }
      
      onOpenChange(false);
    },
    onError: (err) => {
      toast({
        title: "Submission Failed",
        description: err instanceof Error ? err.message : "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = async (values: IncidentFormValues) => {
    // Create FormData to handle file upload
    const formData = new FormData();
    
    // Add form values
    formData.append("stationId", values.stationId);
    formData.append("incidentType", values.incidentType);
    formData.append("description", values.description);
    formData.append("severity", values.severity);
    
    // Add location if available
    if (location) {
      formData.append("locationLat", location.lat.toString());
      formData.append("locationLng", location.lng.toString());
    }
    
    // Add image if captured
    if (imageCapture) {
      const blob = await (await fetch(imageCapture)).blob();
      formData.append("image", blob, "incident-image.jpg");
    }
    
    // Submit the form
    submitReportMutation.mutate(formData);
  };
  
  const startCamera = async () => {
    setIsCapturing(true);
    setCaptureError(null);
    
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "environment" } // Use back camera if available
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } else {
        setCaptureError("Camera not supported on your device");
        setIsCapturing(false);
      }
    } catch (error) {
      setCaptureError("Unable to access camera. Please make sure you've granted camera permissions.");
      setIsCapturing(false);
      console.error("Camera error:", error);
    }
  };
  
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
    setIsCapturing(false);
  };
  
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw video frame to canvas
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to data URL
        const imageData = canvas.toDataURL('image/jpeg');
        setImageCapture(imageData);
        
        // Stop camera after capture
        stopCamera();
      }
    }
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please select an image file.",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setImageCapture(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  
  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation.",
        variant: "destructive",
      });
      return;
    }
    
    setLocationStatus("getting");
    
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationStatus("success");
      },
      error => {
        console.error("Geolocation error:", error);
        setLocationStatus("error");
        toast({
          title: "Location Error",
          description: "Unable to get your location. Please make sure you've granted location permissions.",
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };
  
  const clearImage = () => {
    setImageCapture(null);
  };
  
  // Clean up when modal closes
  useEffect(() => {
    if (!open) {
      stopCamera();
    }
  }, [open]);
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Quick Incident Report
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Always include Polling Station Selection regardless of template */}
              <div className="space-y-2">
                <Label htmlFor="station">Polling Station <span className="text-red-500">*</span></Label>
                <Select
                  value={stationId}
                  onValueChange={(value) => setValue("stationId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select polling station" />
                  </SelectTrigger>
                  <SelectContent>
                    {pollingStations.map((station) => (
                      <SelectItem key={station.id} value={station.id.toString()}>
                        {station.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.stationId && (
                  <p className="text-sm text-red-500">{errors.stationId.message}</p>
                )}
              </div>
              
              {/* Incident Type */}
              <div className="space-y-2">
                <Label htmlFor="incidentType">Incident Type <span className="text-red-500">*</span></Label>
                <Select
                  value={incidentType}
                  onValueChange={(value) => setValue("incidentType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select incident type" />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          {type.name}
                          <Badge
                            variant={
                              type.severity === 'high' 
                                ? 'destructive' 
                                : type.severity === 'medium' 
                                  ? 'warning' 
                                  : 'outline'
                            }
                            className="text-xs"
                          >
                            {type.severity}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.incidentType && (
                  <p className="text-sm text-red-500">{errors.incidentType.message}</p>
                )}
              </div>
              
              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the incident with details..."
                  className="h-32 resize-none"
                  {...register("description", { 
                    required: "Description is required",
                    minLength: {
                      value: 10,
                      message: "Description must be at least 10 characters"
                    }
                  })}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>
              
              {/* Location */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Location</Label>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={getLocation}
                    disabled={locationStatus === "getting"}
                    className={
                      locationStatus === "success" ? "border-green-500 text-green-500" : ""
                    }
                  >
                    {locationStatus === "idle" && (
                      <>
                        <MapPin className="mr-2 h-4 w-4" />
                        Get Location
                      </>
                    )}
                    {locationStatus === "getting" && (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Getting...
                      </>
                    )}
                    {locationStatus === "success" && (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Location Captured
                      </>
                    )}
                    {locationStatus === "error" && (
                      <>
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Try Again
                      </>
                    )}
                  </Button>
                </div>
                {location && (
                  <p className="text-xs text-gray-500">
                    Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
            
            {/* Image Capture Section */}
            <div className="space-y-4">
              <Label>
                Visual Evidence 
                <span className="ml-2 text-sm text-gray-500">(Optional but recommended)</span>
              </Label>
              
              {!imageCapture && !isCapturing ? (
                <div className="space-y-3">
                  <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center bg-muted/50">
                    <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      Take a photo or upload an image of the incident
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={startCamera}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Take Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Image
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileUpload}
                      />
                    </div>
                  </div>
                  {captureError && (
                    <p className="text-sm text-red-500">{captureError}</p>
                  )}
                </div>
              ) : null}
              
              {isCapturing && (
                <Card className="overflow-hidden">
                  <CardContent className="p-1">
                    <div className="relative">
                      <video 
                        ref={videoRef} 
                        className="w-full h-auto rounded" 
                        autoPlay 
                        playsInline
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
                        <Button
                          type="button"
                          onClick={captureImage}
                          size="sm"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Capture
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={stopCamera}
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {imageCapture && (
                <Card className="overflow-hidden">
                  <CardContent className="p-1">
                    <div className="relative">
                      <img 
                        src={imageCapture} 
                        alt="Captured incident" 
                        className="w-full h-auto rounded" 
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 rounded-full"
                        onClick={clearImage}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
          
          <DialogFooter className="flex justify-between sm:justify-between">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button 
              type="submit" 
              disabled={submitReportMutation.isPending}
              className={cn(
                "bg-red-600 hover:bg-red-700",
                submitReportMutation.isPending && "opacity-70"
              )}
            >
              {submitReportMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reporting...
                </>
              ) : (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Report Incident
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}