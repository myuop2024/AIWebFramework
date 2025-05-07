import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  UploadCloud, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, File, RefreshCw, Download
} from "lucide-react";

// Types
interface ImportLog {
  id: number;
  importedBy: number;
  importedAt: string;
  status: string;
  totalImported: number;
  successCount: number;
  failureCount: number;
  errors?: ImportError[];
}

interface ImportError {
  data: {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  error: string;
}

interface ImportResult {
  importId: number;
  totalCount: number;
  successCount: number;
  failureCount: number;
}

export function UserImport() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch import logs
  const { data: importLogs = [], isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery<ImportLog[]>({
    queryKey: ['/api/admin/user-imports'],
  });

  // Upload and import CSV file
  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/admin/user-imports', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import users');
      }
      
      return response.json() as Promise<ImportResult>;
    },
    onSuccess: (result) => {
      setImportResult(result);
      setIsUploading(false);
      toast({
        title: "Import Successful",
        description: `Successfully imported ${result.successCount} out of ${result.totalCount} users.`,
        variant: result.failureCount === 0 ? "default" : "destructive",
        className: result.failureCount === 0 ? "bg-green-600 text-white" : "",
      });
      
      // Fetch the detailed import log with errors
      if (result.importId) {
        fetchImportLog(result.importId);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-imports'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error) => {
      setIsUploading(false);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : 'There was an error importing users.',
        variant: "destructive",
      });
    }
  });

  // Fetch specific import log to get errors
  const fetchImportLog = async (importId: number) => {
    try {
      const response = await apiRequest('GET', `/api/admin/user-imports/${importId}`);
      const log = await response.json();
      
      if (log.errors && log.errors.length > 0) {
        setImportErrors(log.errors);
      } else {
        setImportErrors([]);
      }
    } catch (error) {
      console.error("Error fetching import log details:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // Check if it's a CSV file
      if (selectedFile.type === "text/csv" || selectedFile.name.endsWith(".csv")) {
        setFile(selectedFile);
        setImportResult(null);
        setImportErrors([]);
      } else {
        toast({
          title: "Invalid File",
          description: "Please select a CSV file.",
          variant: "destructive",
        });
        // Reset the file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to import.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    importMutation.mutate(formData);
  };

  const downloadTemplate = () => {
    // Create CSV template content
    const csvContent = "firstName,lastName,email,username,password,phoneNumber,role\nJohn,Doe,john.doe@example.com,johndoe,password123,+12345678901,observer\nJane,Smith,jane.smith@example.com,janesmith,password123,+12345678902,observer";
    
    // Create a downloadable blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'user_import_template.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Completed</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Failed</Badge>;
      case "processing":
        return <Badge className="bg-blue-600"><RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Processing</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Users</CardTitle>
          <CardDescription>
            Upload a CSV file to import multiple users at once
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">CSV Format Requirements</h3>
              <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                <li>File must be in CSV format with headers</li>
                <li>Required columns: firstName, lastName, email, username, password</li>
                <li>Optional columns: phoneNumber, role (defaults to 'observer')</li>
                <li>Passwords will be securely hashed before storage</li>
              </ul>
              <div className="mt-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={downloadTemplate}
                  className="flex items-center"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Template
                </Button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <label htmlFor="csv-upload" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Select CSV File
                </label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="cursor-pointer"
                />
                {file && (
                  <p className="text-sm text-gray-500 flex items-center mt-1">
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    {file.name} ({Math.round(file.size / 1024)} KB)
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                disabled={!file || isUploading}
                className="flex items-center"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload and Import
                  </>
                )}
              </Button>
            </form>

            {importResult && (
              <Alert className={importResult.failureCount === 0 ? "bg-green-50 border-green-600" : "bg-amber-50 border-amber-600"}>
                <AlertTitle className="flex items-center">
                  {importResult.failureCount === 0 ? (
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mr-2 text-amber-600" />
                  )}
                  Import Results
                </AlertTitle>
                <AlertDescription>
                  <p>Successfully imported {importResult.successCount} out of {importResult.totalCount} users.</p>
                  {importResult.failureCount > 0 && (
                    <p className="text-amber-600 mt-1">
                      {importResult.failureCount} users could not be imported due to errors.
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {importErrors.length > 0 && (
              <div className="rounded-md border mt-4">
                <div className="p-4 bg-gray-50 border-b">
                  <h3 className="font-medium flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-amber-600" />
                    Import Errors
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    The following records could not be imported due to errors
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>First Name</TableHead>
                      <TableHead>Last Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importErrors.map((error, index) => (
                      <TableRow key={index}>
                        <TableCell>{error.data.firstName}</TableCell>
                        <TableCell>{error.data.lastName}</TableCell>
                        <TableCell>{error.data.username}</TableCell>
                        <TableCell>{error.data.email}</TableCell>
                        <TableCell className="text-red-600 text-sm">{error.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Import History</CardTitle>
              <CardDescription>
                View history of previous user import operations
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchLogs()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Import ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total Users</TableHead>
                  <TableHead>Successful</TableHead>
                  <TableHead>Failed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingLogs ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <div className="flex flex-col items-center justify-center">
                        <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mb-3" />
                        <p className="text-gray-500">Loading import history...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : importLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <File className="h-8 w-8 text-gray-400 mb-3" />
                        <p>No import operations found.</p>
                        <p className="text-sm mt-1">Import history will appear here after you upload a CSV.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  importLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.id}</TableCell>
                      <TableCell>{new Date(log.importedAt).toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(log.status)}</TableCell>
                      <TableCell>{log.totalImported}</TableCell>
                      <TableCell className="text-green-600">{log.successCount}</TableCell>
                      <TableCell className="text-red-600">{log.failureCount}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => fetchImportLog(log.id)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}