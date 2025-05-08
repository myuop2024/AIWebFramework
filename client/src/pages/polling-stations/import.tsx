import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, AlertCircle, CheckCircle, FileText } from "lucide-react";
import PageHeader from "@/components/layout/page-header";

export default function ImportPollingStations() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    imported: number;
    failed: number;
    errors?: string[];
  } | null>(null);

  const importMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await apiRequest("POST", "/api/polling-stations/import", formData, {
        multipart: true,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to import polling stations");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate cached polling stations data
      queryClient.invalidateQueries({ queryKey: ["/api/polling-stations"] });
      
      setResult({
        success: true,
        message: "Import completed successfully",
        imported: data.imported || 0,
        failed: data.failed || 0,
        errors: data.errors,
      });
      
      toast({
        title: "Import Successful",
        description: `Imported ${data.imported || 0} polling stations`,
      });
      
      setUploading(false);
    },
    onError: (error: Error) => {
      setResult({
        success: false,
        message: error.message,
        imported: 0,
        failed: 0,
      });
      
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
      
      setUploading(false);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    importMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <PageHeader
        title="Import Polling Stations"
        description="Import polling stations from a CSV file"
        backButton={{
          href: "/polling-stations",
          label: "Back to Stations",
        }}
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="file-upload" className="mb-1">
                Select CSV File
              </Label>
              <div className="flex items-center gap-4">
                <input
                  ref={fileInputRef}
                  id="file-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Select File
                </Button>
                <div className="text-sm text-gray-600">
                  {selectedFile ? (
                    <div className="flex items-center">
                      <FileText className="mr-2 h-4 w-4 text-primary" />
                      {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                    </div>
                  ) : (
                    "No file selected"
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleImport} 
                disabled={!selectedFile || uploading}
                className="mr-2"
              >
                {uploading ? "Importing..." : "Import Stations"}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/polling-stations")}
              >
                Cancel
              </Button>
            </div>

            {result && (
              <Alert
                className={`mt-4 ${
                  result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                }`}
              >
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription>
                  <div className="font-medium">
                    {result.message}
                  </div>
                  {result.success && (
                    <div className="mt-1 text-sm">
                      Successfully imported {result.imported} stations
                      {result.failed > 0 && `, ${result.failed} failed.`}
                    </div>
                  )}
                  {result.errors && result.errors.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="font-medium text-sm">Errors:</div>
                      <ul className="text-sm list-disc list-inside space-y-1">
                        {result.errors.slice(0, 5).map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                        {result.errors.length > 5 && (
                          <li>...and {result.errors.length - 5} more errors</li>
                        )}
                      </ul>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>CSV Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-3">
            <p>
              The CSV file should have the following columns (header row required):
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>name</strong> - The name of the polling station</li>
              <li><strong>address</strong> - Street address</li>
              <li><strong>city</strong> - City name</li>
              <li><strong>state</strong> - State/parish name</li>
              <li><strong>zipCode</strong> - Postal/zip code</li>
              <li><strong>stationCode</strong> - Unique station identifier code</li>
              <li><strong>latitude</strong> - Decimal latitude coordinate</li>
              <li><strong>longitude</strong> - Decimal longitude coordinate</li>
            </ul>
            <p className="mt-2">
              Example CSV:
            </p>
            <pre className="p-3 bg-gray-100 rounded-md text-xs overflow-x-auto">
              name,address,city,state,zipCode,stationCode,latitude,longitude<br />
              "Kingston Central #24","22 Hope Road","Kingston","St. Andrew","00000","KC-024",18.0179,-76.8099<br />
              "St. Andrew Eastern #16","45 Mountain View Road","Kingston","St. Andrew","00000","SAE-016",18.0278,-76.7573
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}