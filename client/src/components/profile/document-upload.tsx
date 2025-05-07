import { useState, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, AlertCircle, CheckCircle, X, FileText } from "lucide-react";

type DocumentType = "id" | "profile" | "address" | "other";

interface DocumentUploadProps {
  documentType: DocumentType;
  title: string;
  description: string;
  acceptedFormats?: string;
}

export default function DocumentUpload({ 
  documentType, 
  title, 
  description, 
  acceptedFormats = "image/jpeg, image/png, application/pdf" 
}: DocumentUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch user documents
  const { data: documents, isLoading: isDocumentsLoading } = useQuery({
    queryKey: ['/api/documents'],
  });

  // Find existing document of this type
  const existingDocument = documents?.find(doc => doc.documentType === documentType);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    
    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    // Validate file type
    if (!acceptedFormats.includes(file.type)) {
      setError(`Invalid file type. Please upload ${acceptedFormats.replace(/,/g, ' or ')}`);
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit");
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Create preview URL for image files
    if (file.type.startsWith('image/')) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(null);
    }
  };

  // Handle document upload
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) return null;
      
      // In a real implementation, we would use FormData to upload the file
      // and get back a document URL after the server processes it
      // For now, we'll simulate this process
      
      // Mock document URL generation
      const mockUploadUrl = `upload_${documentType}_${Date.now()}.${selectedFile.name.split('.').pop()}`;
      
      // Send document metadata to API
      const res = await apiRequest("POST", "/api/documents", {
        documentType,
        documentUrl: mockUploadUrl,
        userId: user?.id
      });
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/profile'] });
      
      toast({
        title: "Document Uploaded",
        description: "Your document has been successfully uploaded and is pending verification.",
        variant: "default",
      });
      
      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to upload document");
      toast({
        title: "Upload Failed",
        description: "There was a problem uploading your document. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Trigger file input click
  const handleButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle upload submission
  const handleUpload = () => {
    if (!selectedFile) {
      setError("Please select a file to upload");
      return;
    }
    
    uploadMutation.mutate();
  };

  // Clear selected file
  const handleClearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isDocumentsLoading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full rounded-md mb-4" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {existingDocument ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Document uploaded. Status: {existingDocument.verificationStatus}
              </AlertDescription>
            </Alert>
            
            <div className="flex items-center p-3 border rounded-md">
              <FileText className="h-5 w-5 text-gray-500 mr-2" />
              <span className="text-sm text-gray-700 flex-1">
                Document #{existingDocument.id}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleButtonClick}
              >
                Replace
              </Button>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div 
              className={`border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center ${
                selectedFile ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
              } transition-colors cursor-pointer mb-4`}
              onClick={handleButtonClick}
            >
              {previewUrl ? (
                <div className="relative w-full">
                  <Button 
                    variant="destructive" 
                    size="icon"
                    className="h-6 w-6 absolute top-0 right-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearFile();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <img 
                    src={previewUrl} 
                    alt="Document preview" 
                    className="max-h-48 max-w-full mx-auto rounded-md object-contain"
                  />
                </div>
              ) : selectedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center bg-primary/10 rounded-full p-3 mx-auto">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearFile();
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center bg-primary/10 rounded-full p-3 mb-4">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500 mt-1">{acceptedFormats.replace(/,/g, ', ')}</p>
                  <p className="text-xs text-gray-500 mt-1">Max file size: 5MB</p>
                </>
              )}
            </div>

            <div className="hidden">
              <Label htmlFor={`upload-${documentType}`}>Upload File</Label>
              <Input
                id={`upload-${documentType}`}
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept={acceptedFormats}
                className="hidden"
              />
            </div>
            
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || uploadMutation.isPending}
              className="w-full md:w-auto"
            >
              {uploadMutation.isPending ? "Uploading..." : "Upload Document"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
