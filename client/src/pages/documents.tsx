import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import DocumentUpload from "@/components/profile/document-upload";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Eye, Download, Upload, AlertTriangle } from "lucide-react";

export default function Documents() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("all");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Fetch user documents
  const { data: documents, isLoading: isDocumentsLoading } = useQuery({
    queryKey: ['/api/documents'],
  });

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      case 'pending':
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
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

  // Handle file view
  const handleViewFile = (documentUrl: string) => {
    // In a real implementation, this would open the document for viewing
    alert(`Viewing document: ${documentUrl}`);
  };

  // Handle file download
  const handleDownloadFile = (documentUrl: string) => {
    // In a real implementation, this would download the document
    alert(`Downloading document: ${documentUrl}`);
  };

  if (loading || isDocumentsLoading) {
    return (
      <MainLayout>
        <Card className="mb-6">
          <CardHeader>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="p-0">
            <Skeleton className="h-10 w-full" />
            <div className="p-4">
              <Skeleton className="h-64 w-full" />
            </div>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  const hasDocuments = documents && documents.length > 0;

  return (
    <MainLayout>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Documents & Records</CardTitle>
          <CardDescription>
            Manage your identity documents and uploaded files
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full grid grid-cols-2 lg:grid-cols-4 rounded-none border-b">
              <TabsTrigger value="all">All Documents</TabsTrigger>
              <TabsTrigger value="pending">Pending Verification</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="upload">Upload New</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="p-4">
              {!hasDocuments ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Documents Found</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-6">
                    You haven't uploaded any documents yet. Start by uploading your identity documents for verification.
                  </p>
                  <Button onClick={() => setActiveTab("upload")}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          {formatDocumentType(doc.documentType)}
                        </TableCell>
                        <TableCell>{formatDate(doc.uploadedAt)}</TableCell>
                        <TableCell>{getStatusBadge(doc.verificationStatus)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleViewFile(doc.documentUrl)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDownloadFile(doc.documentUrl)}>
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            <TabsContent value="pending" className="p-4">
              {!hasDocuments || !documents.some(doc => doc.verificationStatus === 'pending') ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No pending documents found.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents
                      .filter(doc => doc.verificationStatus === 'pending')
                      .map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">
                            {formatDocumentType(doc.documentType)}
                          </TableCell>
                          <TableCell>{formatDate(doc.uploadedAt)}</TableCell>
                          <TableCell>{getStatusBadge(doc.verificationStatus)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleViewFile(doc.documentUrl)}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    }
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            <TabsContent value="approved" className="p-4">
              {!hasDocuments || !documents.some(doc => doc.verificationStatus === 'approved') ? (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Approved Documents</h3>
                  <p className="text-gray-500 max-w-md mx-auto mb-6">
                    You don't have any approved documents yet. Documents are reviewed within 24-48 hours after submission.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Upload Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents
                      .filter(doc => doc.verificationStatus === 'approved')
                      .map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">
                            {formatDocumentType(doc.documentType)}
                          </TableCell>
                          <TableCell>{formatDate(doc.uploadedAt)}</TableCell>
                          <TableCell>{getStatusBadge(doc.verificationStatus)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => handleViewFile(doc.documentUrl)}>
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDownloadFile(doc.documentUrl)}>
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    }
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            <TabsContent value="upload" className="p-6">
              <h2 className="text-2xl font-bold mb-4">Upload Documents</h2>
              <p className="text-gray-600 mb-6">
                Upload your identification documents for verification. All documents are securely stored.
              </p>
              
              <div className="space-y-6">
                <DocumentUpload
                  documentType="profile"
                  title="Profile Photo"
                  description="Upload a clear photo of your face. This will be used for your ID card."
                  acceptedFormats="image/jpeg, image/png"
                />
                
                <DocumentUpload
                  documentType="id"
                  title="Government ID"
                  description="Upload a photo of your government-issued ID (passport, driver's license, or national ID)."
                  acceptedFormats="image/jpeg, image/png, application/pdf"
                />
                
                <DocumentUpload
                  documentType="address"
                  title="Proof of Address"
                  description="Upload a document showing your current address (utility bill, bank statement, etc.)."
                  acceptedFormats="image/jpeg, image/png, application/pdf"
                />
                
                <DocumentUpload
                  documentType="other"
                  title="Other Document"
                  description="Upload any additional document required for your verification."
                  acceptedFormats="image/jpeg, image/png, application/pdf"
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </MainLayout>
  );
}
