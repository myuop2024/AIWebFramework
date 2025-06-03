import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { 
  Eye, 
  FileText, 
  User, 
  Home, 
  Clock, 
  Check, 
  X,
  Download,
  Loader2
} from "lucide-react";

interface Document {
  id: number;
  userId: number;
  documentType: string;
  documentUrl: string;
  verificationStatus: string;
  uploadedAt: string;
}

interface UserProfile {
  id: number;
  userId: number;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  profilePhotoUrl?: string;
  idPhotoUrl?: string;
}

interface DocumentViewerModalProps {
  isOpen: boolean;
  userId: number | null;
  onClose: () => void;
  onApprove: (userId: number) => void;
  onReject: (userId: number) => void;
}

export default function DocumentViewerModal({
  isOpen,
  userId,
  onClose,
  onApprove,
  onReject
}: DocumentViewerModalProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [documentViewUrl, setDocumentViewUrl] = useState<string | null>(null);
  
  // Reset state when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedDocument(null);
      setDocumentViewUrl(null);
      setActiveTab("overview");
    }
  }, [isOpen]);

  // Fetch user documents if userId is available
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/admin/users', userId, 'documents'],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/admin/users/${userId}/documents`);
      if (!response.ok) {
        throw new Error('Failed to fetch user documents');
      }
      return response.json();
    },
    enabled: !!userId && isOpen,
  });

  const user = data?.user;
  const documents = data?.documents || [];
  const profile = data?.profile;

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setDocumentViewUrl(document.documentUrl);
    setActiveTab("viewer");
  };

  const handleApproveUser = () => {
    if (userId) {
      onApprove(userId);
      onClose();
    }
  };

  const handleRejectUser = () => {
    if (userId && window.confirm("Are you sure you want to reject this verification request?")) {
      onReject(userId);
      onClose();
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy h:mm a");
    } catch (error) {
      return "Invalid date";
    }
  };

  // Format document type for display
  const formatDocumentType = (type: string) => {
    switch (type) {
      case 'id':
        return 'Government ID';
      case 'profile':
        return 'Profile Photo';
      case 'address':
        return 'Proof of Address';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
      case 'verified':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
    }
  };

  // Mock chain of custody and watermark logic
  const getChainOfCustody = (doc: Document) => [
    { step: 'Uploaded', at: doc.uploadedAt },
    { step: 'Verified', at: doc.verificationStatus === 'approved' ? doc.uploadedAt : null },
    { step: 'Downloaded', at: null }
  ];
  const hasWatermark = (doc: Document) => Boolean(doc.documentUrl && doc.documentUrl.includes('upload_'));

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-10">
          <Loader2 className="h-8 w-8 text-gray-400 animate-spin mb-3" />
          <p className="text-gray-500">Loading user documents...</p>
        </div>
      );
    }

    if (error || !data) {
      return (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-3">
            <X className="h-6 w-6 text-red-500" />
          </div>
          <h3 className="text-lg font-medium mb-1">Error Loading Documents</h3>
          <p className="text-gray-500">
            There was an error loading the user's documents. Please try again.
          </p>
        </div>
      );
    }

    return (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="viewer" disabled={!selectedDocument}>Document Viewer</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 pt-4">
          {user && (
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
              <Avatar className="h-16 w-16">
                {profile?.profilePhotoUrl ? (
                  <AvatarImage src={profile.profilePhotoUrl} alt={`${user.firstName} ${user.lastName}`} />
                ) : (
                  <AvatarFallback className="bg-primary/10 text-lg">
                    {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{user.firstName} {user.lastName}</h3>
                <p className="text-gray-500">{user.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">Verification Status: {getStatusBadge(user.verificationStatus || 'pending')}</span>
                </div>
              </div>
            </div>
          )}

          {profile && (
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-medium mb-4">Profile Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="font-medium">{profile.address || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">City</p>
                    <p className="font-medium">{profile.city || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">State/Province</p>
                    <p className="font-medium">{profile.state || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Country</p>
                    <p className="font-medium">{profile.country || 'Not provided'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={handleRejectUser}>
              <X className="h-4 w-4 mr-2" />
              Reject Verification
            </Button>
            <Button variant="default" onClick={handleApproveUser}>
              <Check className="h-4 w-4 mr-2" />
              Approve Verification
            </Button>
          </div>
        </TabsContent>
        
        {/* Documents Tab */}
        <TabsContent value="documents" className="pt-4">
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                <FileText className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium mb-1">No Documents Found</h3>
              <p className="text-gray-500">
                This user hasn't uploaded any verification documents yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((document: Document) => (
                <div key={document.id} className="p-4 border rounded-lg flex justify-between items-center">
                  <div>
                    <div className="font-medium">{formatDocumentType(document.documentType)}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(document.uploadedAt)}
                    </div>
                    <div className="mt-1">{getStatusBadge(document.verificationStatus)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewDocument(document)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(document.documentUrl, '_blank')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Document Viewer Tab */}
        <TabsContent value="viewer" className="pt-4">
          {selectedDocument && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium">{formatDocumentType(selectedDocument.documentType)}</h3>
                  <p className="text-sm text-gray-500">Uploaded: {formatDate(selectedDocument.uploadedAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedDocument.verificationStatus)}
                  <Badge variant={hasWatermark(selectedDocument) ? 'default' : 'outline'} className="ml-2">
                    {hasWatermark(selectedDocument) ? 'Watermarked' : 'No Watermark'}
                  </Badge>
                </div>
              </div>
              {/* Chain of Custody Timeline */}
              <div className="mb-2">
                <h4 className="text-xs font-semibold text-gray-500 mb-1">Chain of Custody</h4>
                <div className="flex items-center gap-2">
                  {getChainOfCustody(selectedDocument).map((step, idx, arr) => (
                    <span key={step.step} className={`px-2 py-1 rounded text-xs font-semibold ${step.at ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                      {step.step}
                    </span>
                  )).reduce((prev, curr, idx, arr) => idx < arr.length - 1 ? [prev, <span key={idx} className="text-gray-400">→</span>, curr] : [prev, curr])}
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                {selectedDocument.documentType.includes('image') || 
                 documentViewUrl?.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                  <img 
                    src={documentViewUrl || ''} 
                    alt="Document" 
                    className="mx-auto max-h-96 object-contain"
                  />
                ) : selectedDocument.documentType.includes('pdf') || 
                    documentViewUrl?.match(/\.(pdf)$/i) ? (
                  <iframe
                    src={documentViewUrl || ''}
                    className="w-full h-96"
                    title="PDF Document"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-10">
                    <FileText className="h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-gray-500">Preview not available for this document type</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-4"
                      onClick={() => window.open(documentViewUrl || '', '_blank')}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download to View
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={isOpen => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>User Verification Documents</DialogTitle>
          <DialogDescription>
            Review the user's documents for identity verification
          </DialogDescription>
        </DialogHeader>
        
        <div className="mt-4">
          {renderContent()}
        </div>
        
        <DialogFooter className="flex items-center justify-between">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          
          <div className="flex gap-2">
            {userId && (
              <>
                <Button variant="outline" onClick={handleRejectUser}>
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button variant="default" onClick={handleApproveUser}>
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}