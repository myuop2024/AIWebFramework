import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera, RefreshCw, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { apiRequest } from '@/lib/queryClient';

interface ProfilePhotoUploadProps {
  initialPhotoUrl?: string;
  onPhotoProcessed: (photoUrl: string) => void;
}

export function ProfilePhotoUpload({ initialPhotoUrl, onPhotoProcessed }: ProfilePhotoUploadProps) {
  const { toast } = useToast();
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(initialPhotoUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      
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
        
        // Notify parent component
        onPhotoProcessed(data.imageUrl);
        
        toast({
          title: "Photo processed successfully",
          description: "Your profile photo has been processed with AI",
          variant: "default"
        });
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
          </div>
          
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
          
          {photoUrl && !selectedFile && (
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