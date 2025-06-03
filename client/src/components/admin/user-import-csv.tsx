import { useState, useRef, ChangeEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '../../lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, AlertCircle, Check, Upload, X, Info, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { type User } from '@shared/schema';
import { Input as ShadInput } from '@/components/ui/input';
import { GoogleDrivePicker } from '@/components/ui/google-drive-picker';
import Papa from 'papaparse';

interface ProcessedUserData {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phoneNumber?: string | null;
  role: string;
}

interface EnhancementStats {
  namesFormatted: number;
  emailsImproved: number;
  phoneNumbersFormatted: number;
  usernamesGenerated: number;
  rolesAssigned: number;
}

interface ErrorRow {
  rowIndex: number;
  data: Partial<ProcessedUserData>;
  error: string;
  explanation?: string;
}

interface DuplicateWarning {
  newUser: Partial<ProcessedUserData>;
  existingUsers: Partial<ProcessedUserData>[];
}

interface ProcessedResult {
  importId: number;
  data: ProcessedUserData[];
  errorRows: ErrorRow[];
  enhancementStats: EnhancementStats;
  duplicateWarnings: DuplicateWarning[];
  status: string;
  usedAI?: string;
}

export default function UserImportCSV() {
  const [file, setFile] = useState<File | null>(null);
  const [defaultRole, setDefaultRole] = useState<string>('observer');
  const [verificationStatus, setVerificationStatus] = useState<string>('pending');
  const [processedData, setProcessedData] = useState<ProcessedResult | null>(null);
  const [selectedDataTab, setSelectedDataTab] = useState<string>('valid');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [aiMode, setAiMode] = useState<string>('tabpfn');
  const [sheetUrl, setSheetUrl] = useState('');
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);

  // Fetch Google API credentials from system settings
  const { data: settings } = useQuery<any[]>({
    queryKey: ['/api/system-settings'],
    refetchOnWindowFocus: false,
  });
  const googleClientId = settings?.find((s: any) => s.settingKey === 'google_client_id')?.settingValue || '';
  const googleApiKey = settings?.find((s: any) => s.settingKey === 'google_api_key')?.settingValue || '';

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setProcessedData(null);
    }
  };

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setFile(null);
    setProcessedData(null);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) return null;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('defaultRole', defaultRole);
      formData.append('verificationStatus', verificationStatus);
      formData.append('mode', aiMode);

      const response = await apiRequest(
        'POST',
        '/api/user-imports/csv',
        formData,
        { multipart: true } as { multipart: boolean }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload file');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      if (data) {
        setProcessedData(data);
        toast({
          title: 'File processed successfully',
          description: `${data.data.length} valid records found with ${data.errorRows.length} errors.`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error uploading file',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  const confirmImportMutation = useMutation({
    mutationFn: async () => {
      if (!processedData) return null;

      // Filter out any users that should be excluded (if you add checkboxes for selection)
      const filteredUsers = processedData.data.map(user => ({
        ...user,
        password: 'auto-generated' // The actual passwords are stored in the backend
      }));

      const response = await apiRequest(
        'POST',
        `/api/user-imports/csv/confirm/${processedData.importId}`,
        {
          users: filteredUsers,
          options: {
            defaultRole,
            verificationStatus
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to import users');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      if (data) {
        toast({
          title: 'Users imported successfully',
          description: `${data.successCount} users imported with ${data.failureCount} failures.`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/users'] });
        queryClient.invalidateQueries({ queryKey: ['/api/user-imports'] });
        resetFileInput();
      }
    },
    onError: (error) => {
      toast({
        title: 'Error importing users',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    },
  });

  // Helper to fetch CSV from Google Sheets public link
  const handleImportFromSheet = async () => {
    if (!sheetUrl) return;
    setIsSheetLoading(true);
    try {
      // Convert Google Sheets URL to CSV export URL if needed
      let csvUrl = sheetUrl;
      if (sheetUrl.includes('/edit')) {
        csvUrl = sheetUrl.replace(/\/edit.*$/, '/export?format=csv');
      }
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error('Failed to fetch Google Sheet');
      const csvText = await response.text();
      // Convert CSV text to File object
      const csvFile = new File([csvText], 'import.csv', { type: 'text/csv' });
      setFile(csvFile);
      setProcessedData(null);
      toast({ title: 'Sheet loaded', description: 'Google Sheet loaded as CSV. You can now process with AI.' });
    } catch (e) {
      toast({ title: 'Failed to load sheet', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setIsSheetLoading(false);
    }
  };

  // Handler for Google Drive Picker (OAuth)
  const handleDrivePick = async (csvContent: string) => {
    // csvContent: CSV string from Google Drive Picker
    const csvFile = new File([csvContent], 'import.csv', { type: 'text/csv' });
    setFile(csvFile);
    setProcessedData(null);
    toast({ title: 'Sheet loaded', description: 'Google Drive Sheet loaded as CSV. You can now process with AI.' });
  };

  // Helper to parse and preview CSV
  const previewCsv = (file: File) => {
    Papa.parse(file, {
      complete: (result) => {
        if (result.data && result.data.length > 0) {
          const rows = result.data as string[][];
          const headers = rows[0];
          const previewRows = rows.slice(1, 6); // up to 5 rows
          setCsvPreview({ headers, rows: previewRows });
        } else {
          setCsvPreview(null);
        }
      },
      error: () => setCsvPreview(null),
    });
  };

  // When file changes, update preview
  React.useEffect(() => {
    if (file) {
      previewCsv(file);
    } else {
      setCsvPreview(null);
    }
  }, [file]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Users from CSV or Google Sheets</CardTitle>
          <CardDescription>
            Upload a CSV/Excel file, paste a Google Sheets link, or use Google Drive picker. Our AI will enhance and validate the data before import.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Google Sheets Import UI */}
            <div className="space-y-2">
              <Label htmlFor="sheet-url">Google Sheets Public Link</Label>
              <div className="flex gap-2">
                <ShadInput
                  id="sheet-url"
                  type="url"
                  placeholder="Paste Google Sheets public link here..."
                  value={sheetUrl}
                  onChange={e => setSheetUrl(e.target.value)}
                  disabled={isSheetLoading || uploadMutation.isPending}
                />
                <Button onClick={handleImportFromSheet} disabled={!sheetUrl || isSheetLoading || uploadMutation.isPending}>
                  {isSheetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load Sheet'}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                The sheet must be published or shared as public. Only the first sheet will be imported.
              </div>
            </div>
            <div className="space-y-2">
              <Label>Or use Google Drive Picker (OAuth)</Label>
              {googleClientId && googleApiKey ? (
                <GoogleDrivePicker
                  onPick={handleDrivePick}
                  disabled={uploadMutation.isPending}
                  clientId={googleClientId}
                  apiKey={googleApiKey}
                />
              ) : (
                <div className="text-xs text-red-600">Google API credentials are not set. Please configure them in Admin Settings.</div>
              )}
              <div className="text-xs text-muted-foreground">
                Sign in with Google to pick a sheet from your Drive. Only the first sheet/tab will be imported.
              </div>
            </div>
            {/* CSV Preview */}
            {csvPreview && (
              <div className="my-4">
                <div className="font-medium mb-2">CSV Preview (first 5 rows)</div>
                <div className="overflow-x-auto border rounded-md">
                  <table className="min-w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        {csvPreview.headers.map((header, i) => (
                          <th key={i} className="px-2 py-1 text-left font-semibold">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.rows.map((row, i) => (
                        <tr key={i} className="border-t">
                          {csvPreview.headers.map((_, j) => (
                            <td key={j} className="px-2 py-1">{row[j]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* End CSV Preview */}
            <div className="space-y-2">
              <Label htmlFor="ai-mode">AI Mode</Label>
              <Select
                defaultValue={aiMode}
                onValueChange={setAiMode}
                disabled={uploadMutation.isPending}
              >
                <SelectTrigger id="ai-mode">
                  <SelectValue placeholder="Select AI Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tabpfn">
                    TabPFN (Fast, Local)
                    <span className="ml-2 text-xs text-muted-foreground">Imputation, type inference</span>
                  </SelectItem>
                  <SelectItem value="huggingface">
                    Hugging Face LLM
                    <span className="ml-2 text-xs text-muted-foreground">Fuzzy, semantic enrichment</span>
                  </SelectItem>
                  <SelectItem value="basic">
                    Basic Cleaning
                    <span className="ml-2 text-xs text-muted-foreground">Whitespace, missing values</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <Info className="h-3 w-3 mr-1" />
                <span>
                  TabPFN: Fast, local imputation. Hugging Face: Uses your API key for advanced LLM cleaning. Basic: Only trims and fills blanks.
                </span>
              </div>
            </div>
            <div>
              <Label htmlFor="file-upload">CSV or Excel File</Label>
              <div className="mt-1 flex items-center space-x-2">
                <Input
                  id="file-upload"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={uploadMutation.isPending}
                />
                {file && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={resetFileInput}
                    disabled={uploadMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                The CSV should include columns: firstName, lastName, email, username (optional), 
                password, phoneNumber (optional), role (optional)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default-role">Default Role</Label>
                <Select
                  defaultValue={defaultRole}
                  onValueChange={setDefaultRole}
                  disabled={uploadMutation.isPending}
                >
                  <SelectTrigger id="default-role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="observer">Observer</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="verification-status">Verification Status</Label>
                <Select
                  defaultValue={verificationStatus}
                  onValueChange={setVerificationStatus}
                  disabled={uploadMutation.isPending}
                >
                  <SelectTrigger id="verification-status">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button 
                onClick={() => uploadMutation.mutate()} 
                disabled={!file || uploadMutation.isPending}
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" /> Process with AI
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {processedData && (
        <Card>
          <CardHeader>
            <CardTitle>Processed Data</CardTitle>
            <CardDescription>
              Review the data processed by our AI. We've enhanced and validated the information.<br />
              <span className="font-medium">AI Used:</span> {processedData.usedAI || 'Unknown'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* AI Enhancement Summary */}
              <Card className="bg-muted/50">
                <CardHeader className="py-3">
                  <CardTitle className="text-base">AI Enhancements</CardTitle>
                </CardHeader>
                <CardContent className="py-0">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="flex flex-col items-center justify-center p-2">
                      <span className="text-xl font-bold">{processedData.enhancementStats.namesFormatted}</span>
                      <span className="text-xs text-center text-muted-foreground">Names Formatted</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2">
                      <span className="text-xl font-bold">{processedData.enhancementStats.emailsImproved}</span>
                      <span className="text-xs text-center text-muted-foreground">Emails Improved</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2">
                      <span className="text-xl font-bold">{processedData.enhancementStats.phoneNumbersFormatted}</span>
                      <span className="text-xs text-center text-muted-foreground">Phone Numbers Formatted</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2">
                      <span className="text-xl font-bold">{processedData.enhancementStats.usernamesGenerated}</span>
                      <span className="text-xs text-center text-muted-foreground">Usernames Generated</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-2">
                      <span className="text-xl font-bold">{processedData.enhancementStats.rolesAssigned}</span>
                      <span className="text-xs text-center text-muted-foreground">Roles Assigned</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Duplicate Warnings */}
              {processedData.duplicateWarnings.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <AlertTitle>Potential Duplicates Found</AlertTitle>
                  <AlertDescription>
                    We found {processedData.duplicateWarnings.length} potential duplicate users.
                    Please review carefully before importing.
                  </AlertDescription>
                </Alert>
              )}

              {/* Tabs for Valid and Error Rows */}
              <Tabs 
                defaultValue="valid" 
                value={selectedDataTab}
                onValueChange={setSelectedDataTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="valid">
                    Valid Records ({processedData.data.length})
                  </TabsTrigger>
                  <TabsTrigger value="errors">
                    Errors ({processedData.errorRows.length})
                  </TabsTrigger>
                  <TabsTrigger value="duplicates">
                    Duplicates ({processedData.duplicateWarnings.length})
                  </TabsTrigger>
                </TabsList>

                {/* Valid Records Tab */}
                <TabsContent value="valid" className="space-y-4">
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Name
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Email
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Username
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Phone
                            </th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Role
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                          {processedData.data.map((user, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {user.firstName} {user.lastName}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">{user.email}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">{user.username}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">{user.phoneNumber || '-'}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                <Badge variant="outline" className="capitalize">
                                  {user.role}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>

                {/* Errors Tab */}
                <TabsContent value="errors" className="space-y-4">
                  {processedData.errorRows.length === 0 ? (
                    <Alert>
                      <Check className="h-4 w-4" />
                      <AlertTitle>No Errors Found</AlertTitle>
                      <AlertDescription>
                        All records were processed successfully.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      {processedData.errorRows.map((error, index) => (
                        <Card key={index}>
                          <CardHeader className="py-3">
                            <CardTitle className="text-base flex items-center">
                              <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
                              Error in Row {error.rowIndex}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="py-0">
                            <div className="space-y-2">
                              <div>
                                <h4 className="text-sm font-medium">Error:</h4>
                                <p className="text-sm text-destructive">{error.error}</p>
                              </div>
                              {error.explanation && (
                                <div>
                                  <h4 className="text-sm font-medium">AI Explanation:</h4>
                                  <p className="text-sm">{error.explanation}</p>
                                </div>
                              )}
                              <div>
                                <h4 className="text-sm font-medium">Data:</h4>
                                <pre className="text-xs p-2 bg-muted rounded-md overflow-x-auto">
                                  {JSON.stringify(error.data, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Duplicates Tab */}
                <TabsContent value="duplicates" className="space-y-4">
                  {processedData.duplicateWarnings.length === 0 ? (
                    <Alert>
                      <Check className="h-4 w-4" />
                      <AlertTitle>No Duplicates Found</AlertTitle>
                      <AlertDescription>
                        All records appear to be unique.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-4">
                      {processedData.duplicateWarnings.map((warning, index) => (
                        <Card key={index}>
                          <CardHeader className="py-3">
                            <CardTitle className="text-base flex items-center">
                              <Info className="h-4 w-4 mr-2 text-warning" />
                              Potential Duplicate User
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="py-0">
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-medium">New User:</h4>
                                <div className="p-2 bg-muted rounded-md">
                                  <p className="text-sm">
                                    <span className="font-medium">Name:</span> {warning.newUser.firstName} {warning.newUser.lastName}
                                  </p>
                                  <p className="text-sm">
                                    <span className="font-medium">Email:</span> {warning.newUser.email}
                                  </p>
                                  <p className="text-sm">
                                    <span className="font-medium">Username:</span> {warning.newUser.username}
                                  </p>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium">Possible Matches:</h4>
                                <div className="border rounded-lg overflow-hidden">
                                  <table className="min-w-full divide-y divide-border">
                                    <thead className="bg-muted">
                                      <tr>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                          Name
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                          Email
                                        </th>
                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                          Username
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-card divide-y divide-border">
                                      {warning.existingUsers.map((user, idx) => (
                                        <tr key={idx}>
                                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                                            {user.firstName} {user.lastName}
                                          </td>
                                          <td className="px-3 py-2 whitespace-nowrap text-sm">{user.email}</td>
                                          <td className="px-3 py-2 whitespace-nowrap text-sm">{user.username}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={resetFileInput} 
              disabled={confirmImportMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => confirmImportMutation.mutate()} 
              disabled={
                processedData.data.length === 0 || 
                confirmImportMutation.isPending
              }
            >
              {confirmImportMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Import Users
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}