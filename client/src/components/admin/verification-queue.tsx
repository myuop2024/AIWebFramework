import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertTriangle, CheckCircle, XCircle, Eye, User, FileText, Phone, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

// Types for verification system
type VerificationStatus = 'pending' | 'approved' | 'rejected';

interface ObserverForVerification {
  id: number;
  observerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string | null;
  verificationStatus: VerificationStatus;
  submittedAt: string;
  profileData?: {
    idPhotoUrl: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  }
}

export default function VerificationQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("pending");
  const [selectedObserver, setSelectedObserver] = useState<ObserverForVerification | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>("");
  
  // Fetch verification queue
  const { data: observers, isLoading } = useQuery<ObserverForVerification[]>({
    queryKey: ['/api/admin/verification-queue'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (observerId: number) => {
      const response = await fetch(`/api/admin/verification/${observerId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve observer');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Observer approved",
        description: "The observer has been successfully verified.",
        variant: "default",
      });
      // Refresh verification queue data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/verification-queue'] });
      // Close details dialog
      setIsDetailsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve observer",
        variant: "destructive",
      });
    }
  });
  
  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ observerId, reason }: { observerId: number; reason: string }) => {
      const response = await fetch(`/api/admin/verification/${observerId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reject observer');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Observer rejected",
        description: "The observer has been rejected.",
        variant: "default",
      });
      // Refresh verification queue data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/verification-queue'] });
      // Close details dialog
      setIsDetailsOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject observer",
        variant: "destructive",
      });
    }
  });
  
  // Filter observers based on status
  const pendingObservers = observers?.filter(obs => obs.verificationStatus === 'pending') || [];
  const approvedObservers = observers?.filter(obs => obs.verificationStatus === 'approved') || [];
  const rejectedObservers = observers?.filter(obs => obs.verificationStatus === 'rejected') || [];
  
  // Handle opening observer details
  const handleViewDetails = (observer: ObserverForVerification) => {
    setSelectedObserver(observer);
    setIsDetailsOpen(true);
  };
  
  // Handle approve action
  const handleApprove = (observerId: number) => {
    approveMutation.mutate(observerId);
  };
  
  // Handle reject action
  const handleReject = (observerId: number) => {
    if (!rejectReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }
    
    rejectMutation.mutate({ observerId, reason: rejectReason });
  };
  
  // Determine counts for badges
  const pendingCount = pendingObservers.length;
  const approvedCount = approvedObservers.length;
  const rejectedCount = rejectedObservers.length;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="ml-2">Loading verification queue...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Observer Verification Queue</h2>
        <p className="text-muted-foreground">
          Review and process observer verification requests.
        </p>
      </div>
      
      <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved <Badge variant="secondary" className="ml-2">{approvedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected <Badge variant="secondary" className="ml-2">{rejectedCount}</Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="pt-4">
          {pendingObservers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-3 text-lg font-medium">No pending verifications</h3>
                <p className="text-sm text-muted-foreground">
                  There are currently no observers waiting for verification.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Pending Verification Requests</CardTitle>
                <CardDescription>
                  {pendingObservers.length} observers waiting for verification.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Observer ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingObservers.map((observer) => (
                      <TableRow key={observer.id}>
                        <TableCell className="font-medium">{observer.observerId}</TableCell>
                        <TableCell>{observer.firstName} {observer.lastName}</TableCell>
                        <TableCell>{new Date(observer.submittedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleViewDetails(observer)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm" 
                              onClick={() => handleApprove(observer.id)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="approved" className="pt-4">
          {approvedObservers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-3 text-lg font-medium">No approved verifications</h3>
                <p className="text-sm text-muted-foreground">
                  There are no approved observers yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Approved Observers</CardTitle>
                <CardDescription>
                  {approvedObservers.length} observers have been approved.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Observer ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Approved Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedObservers.map((observer) => (
                      <TableRow key={observer.id}>
                        <TableCell className="font-medium">{observer.observerId}</TableCell>
                        <TableCell>{observer.firstName} {observer.lastName}</TableCell>
                        <TableCell>{new Date(observer.submittedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(observer)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="rejected" className="pt-4">
          {rejectedObservers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-3 text-lg font-medium">No rejected verifications</h3>
                <p className="text-sm text-muted-foreground">
                  There are no rejected observers.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Rejected Observers</CardTitle>
                <CardDescription>
                  {rejectedObservers.length} observers have been rejected.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Observer ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Rejected Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rejectedObservers.map((observer) => (
                      <TableRow key={observer.id}>
                        <TableCell className="font-medium">{observer.observerId}</TableCell>
                        <TableCell>{observer.firstName} {observer.lastName}</TableCell>
                        <TableCell>{new Date(observer.submittedAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(observer)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Observer details dialog */}
      {selectedObserver && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Observer Verification Details</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div>
                <h3 className="text-lg font-medium flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Personal Information
                </h3>
                <Separator className="my-2" />
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Observer ID</p>
                    <p className="text-sm">{selectedObserver.observerId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Full Name</p>
                    <p className="text-sm">{selectedObserver.firstName} {selectedObserver.lastName}</p>
                  </div>
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                    <p className="text-sm">{selectedObserver.email}</p>
                  </div>
                  {selectedObserver.phoneNumber && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <p className="text-sm">{selectedObserver.phoneNumber}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium flex items-center">
                  <FileText className="mr-2 h-5 w-5" />
                  Profile Information
                </h3>
                <Separator className="my-2" />
                <div className="space-y-3">
                  {selectedObserver.profileData?.address && (
                    <div>
                      <p className="text-sm font-medium">Address</p>
                      <p className="text-sm">{selectedObserver.profileData.address}</p>
                    </div>
                  )}
                  {selectedObserver.profileData?.city && selectedObserver.profileData?.state && (
                    <div>
                      <p className="text-sm font-medium">Location</p>
                      <p className="text-sm">
                        {selectedObserver.profileData.city}, {selectedObserver.profileData.state}
                        {selectedObserver.profileData.country && `, ${selectedObserver.profileData.country}`}
                      </p>
                    </div>
                  )}
                </div>
                
                {selectedObserver.profileData?.idPhotoUrl && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">ID Document</p>
                    <div className="border rounded-md overflow-hidden">
                      <img 
                        src={selectedObserver.profileData.idPhotoUrl} 
                        alt="ID Document" 
                        className="w-full h-auto object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {selectedObserver.verificationStatus === 'pending' && (
              <div className="mt-6 space-y-4">
                <Separator />
                
                <div>
                  <h3 className="text-md font-medium mb-2">Decision</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-muted-foreground">
                        Rejection Reason (required if rejecting)
                      </label>
                      <textarea 
                        className="mt-1 w-full min-h-[80px] p-2 rounded-md border"
                        placeholder="Provide a reason for rejection"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                    </div>
                    
                    <div className="flex items-end space-x-2">
                      <Button 
                        variant="default" 
                        className="flex-1"
                        onClick={() => handleApprove(selectedObserver.id)}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      
                      <Button 
                        variant="destructive" 
                        className="flex-1"
                        onClick={() => handleReject(selectedObserver.id)}
                        disabled={rejectMutation.isPending || !rejectReason.trim()}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}