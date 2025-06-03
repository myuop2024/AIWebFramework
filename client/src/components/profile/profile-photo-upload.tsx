import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, RefreshCw, Check, AlertTriangle, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiRequest } from '@/lib/queryClient';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";

// Define the expected structure for the profile photo policy setting
interface ProfilePhotoPolicySetting {
  settingKey: string;
  settingValue: {
    requireApprovalAfterVerification?: boolean;
    // Add other potential fields within settingValue if they exist
  };
  // Add other fields from the systemSettings table if needed
}

interface ProfilePhotoUploadProps {
  initialPhotoUrl?: string;
  onPhotoProcessed: (photoUrl: string, needsApproval?: boolean) => void;
  isUserVerified?: boolean;
}

export function ProfilePhotoUpload({ 
  initialPhotoUrl, 
  onPhotoProcessed, 
  isUserVerified = false 
}: ProfilePhotoUploadProps) {
  const { toast } = useToast();
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(initialPhotoUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hasFaceWarning, setHasFaceWarning] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);
  
  // Fetch system settings for profile photo policy
  const { data: settings } = useQuery<ProfilePhotoPolicySetting>({
    queryKey: ['/api/system-settings/profile_photo_policy'],
    enabled: isUserVerified, // Only fetch if the user is verified
    refetchOnWindowFocus: false,
  });

  // Determine if the system requires approval based on settings
  useEffect(() => {
    if (settings && isUserVerified) {
      setRequiresApproval(settings.settingValue?.requireApprovalAfterVerification || false);
    } else {
      setRequiresApproval(false);
    }
  }, [settings, isUserVerified]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setHasFaceWarning(false); // Reset warning when selecting a new file
      
      // Create a temporary preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPhotoUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const processPhoto = async () => {
    if (!selectedFile) {
      toast({
        title: "No image selected",
        description: "Please select an image first",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('profilePhoto', selectedFile);

      // Send to the backend for AI processing
      const response = await fetch('/api/images/process-profile-photo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.imageUrl) {
        // Update state with the processed image URL
        setPhotoUrl(data.imageUrl);
        
        // Check for face detection warnings
        if (data.hasFace === false) {
          setHasFaceWarning(true);
        }
        
        // Notify parent component with approval status
        onPhotoProcessed(
          data.imageUrl, 
          // If auto-updated is false, it means it needs approval
          !data.autoUpdated
        );
        
        let photoTitle = "Photo processed successfully";
        let photoMessage = "Your profile photo has been processed with AI";
        let toastVariant = "default";
        
        if (!data.autoUpdated) {
          photoTitle = "Photo pending approval";
          photoMessage = "Your profile photo has been submitted for administrator approval. You'll be notified when it's approved.";
          
          // Show a more detailed notification for pending approvals
          toast({
            title: photoTitle,
            description: photoMessage,
            duration: 6000, // Show for longer to ensure user sees it
          });
        } else {
          toast({
            title: photoTitle,
            description: photoMessage,
          });
        }
      } else {
        throw new Error('No image URL in response');
      }
    } catch (error) {
      console.error('Error processing photo:', error);
      toast({
        title: "Processing failed",
        description: "There was an error processing your photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setSelectedFile(null); // Clear selected file after processing
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-32 h-32 border-2 border-primary">
              <AvatarImage src={photoUrl} />
              <AvatarFallback className="bg-muted">
                <Camera className="w-8 h-8 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            
            {selectedFile && !isProcessing && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4" />
                <span>Click "Process" to optimize with AI</span>
              </div>
            )}
            
            {isProcessing && (
              <div className="flex items-center space-x-2 text-sm text-primary">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI is enhancing your photo...</span>
              </div>
            )}

            {requiresApproval && photoUrl && !selectedFile && !isProcessing && (
              <div className="flex items-center space-x-2 text-sm text-amber-600">
                <Clock className="w-4 h-4" />
                <span>Pending administrator approval</span>
              </div>
            )}
          </div>
          
          {/* Face detection warning */}
          {hasFaceWarning && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No face detected</AlertTitle>
              <AlertDescription>
                We couldn't detect a face in your photo. You may continue, but please ensure your face is clearly visible for ID card purposes.
              </AlertDescription>
            </Alert>
          )}

          {/* Approval requirement notice */}
          {isUserVerified && requiresApproval && !photoUrl && (
            <Alert className="mb-4">
              <AlertTitle>Approval Required</AlertTitle>
              <AlertDescription>
                Since your account has been verified, changes to your profile photo will require administrator approval.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="photo" className="text-sm font-medium">
              Profile Photo
            </Label>
            <Input
              id="photo"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="cursor-pointer"
              disabled={isUploading || isProcessing}
            />
            <p className="text-xs text-muted-foreground">
              Upload a clear portrait photo. Our AI will automatically optimize it.
              {isUserVerified && requiresApproval && " Changes will require approval."}
            </p>
          </div>
          
          {selectedFile && (
            <Button 
              type="button" 
              onClick={processPhoto} 
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing with AI...
                </>
              ) : (
                <>
                  Process with AI
                </>
              )}
            </Button>
          )}
          
          {photoUrl && !selectedFile && !requiresApproval && (
            <div className="flex items-center justify-center text-sm text-green-600 dark:text-green-500">
              <Check className="w-4 h-4 mr-1" />
              Photo ready for submission
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}