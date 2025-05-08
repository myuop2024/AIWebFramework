import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  Download, Loader2, FileDown, Table, Map, 
  Check, AlertCircle, Search 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import PageHeader from "@/components/layout/page-header";

export default function ExportPollingStations() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStationIds, setSelectedStationIds] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");

  const { data: stations, isLoading } = useQuery({
    queryKey: ["/api/polling-stations"],
  });

  // Filter stations based on search term
  const filteredStations = stations && Array.isArray(stations) 
    ? stations.filter(station => 
        station.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.stationCode.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Toggle selection of all stations
  const handleToggleSelectAll = () => {
    if (selectAll) {
      setSelectedStationIds(new Set());
    } else {
      const newSelected = new Set<number>();
      filteredStations.forEach(station => newSelected.add(station.id));
      setSelectedStationIds(newSelected);
    }
    setSelectAll(!selectAll);
  };

  // Toggle selection of a single station
  const handleToggleStation = (id: number) => {
    const newSelectedIds = new Set(selectedStationIds);
    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
      setSelectAll(false);
    } else {
      newSelectedIds.add(id);
      if (newSelectedIds.size === filteredStations.length) {
        setSelectAll(true);
      }
    }
    setSelectedStationIds(newSelectedIds);
  };

  // Handle export button click
  const handleExport = async () => {
    if (selectedStationIds.size === 0) {
      toast({
        title: "No stations selected",
        description: "Please select at least one polling station to export",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    try {
      // Create query params for selected station IDs
      const idParams = Array.from(selectedStationIds)
        .map(id => `ids=${id}`)
        .join('&');
      
      // Construct the export URL
      const exportUrl = `/api/polling-stations/export?format=${exportFormat}&${idParams}`;
      
      // Fetch the export file
      const response = await fetch(exportUrl);
      
      if (!response.ok) {
        throw new Error("Failed to export polling stations");
      }
      
      // Get the blob from the response
      const blob = await response.blob();
      
      // Create a download link and trigger the download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `polling-stations.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: `${selectedStationIds.size} polling stations exported successfully`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <PageHeader
        title="Export Polling Stations"
        description="Export polling station data for use in other applications"
        backButton={{
          href: "/polling-stations",
          label: "Back to Stations",
        }}
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Export Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Label className="mb-1">Format</Label>
              <div className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="format-csv" 
                    checked={exportFormat === "csv"} 
                    onCheckedChange={() => setExportFormat("csv")} 
                  />
                  <Label htmlFor="format-csv">
                    <div className="flex items-center">
                      <Table className="h-4 w-4 mr-1" />
                      CSV
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="format-json" 
                    checked={exportFormat === "json"} 
                    onCheckedChange={() => setExportFormat("json")} 
                  />
                  <Label htmlFor="format-json">
                    <div className="flex items-center">
                      <FileDown className="h-4 w-4 mr-1" />
                      JSON
                    </div>
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <Label className="mb-1">Search Stations</Label>
              <div className="relative w-full max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Search by name, address, code..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col space-y-2 mt-4">
              <div className="flex items-center justify-between mb-2">
                <Label>Select Polling Stations</Label>
                <div className="flex items-center space-x-2 text-sm">
                  <Checkbox 
                    id="select-all" 
                    checked={selectAll} 
                    onCheckedChange={handleToggleSelectAll} 
                  />
                  <Label htmlFor="select-all">Select All</Label>
                  <span className="text-gray-500">
                    ({selectedStationIds.size} of {filteredStations.length} selected)
                  </span>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-2 text-gray-500">Loading polling stations...</p>
                </div>
              ) : (
                <>
                  {filteredStations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center border rounded-md p-6 bg-gray-50">
                      <AlertCircle className="h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-gray-500">No polling stations found</p>
                    </div>
                  ) : (
                    <div className="border rounded-md overflow-hidden">
                      <div className="max-h-[400px] overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="w-12 px-4 py-3 text-left font-medium text-gray-500"></th>
                              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                              <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                              <th className="px-4 py-3 text-left font-medium text-gray-500">Location</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {filteredStations.map((station) => (
                              <tr 
                                key={station.id} 
                                className="hover:bg-gray-50 cursor-pointer"
                                onClick={() => handleToggleStation(station.id)}
                              >
                                <td className="px-4 py-3">
                                  <Checkbox 
                                    checked={selectedStationIds.has(station.id)} 
                                    onCheckedChange={() => handleToggleStation(station.id)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </td>
                                <td className="px-4 py-3 font-medium">{station.name}</td>
                                <td className="px-4 py-3 text-gray-500">{station.stationCode}</td>
                                <td className="px-4 py-3 text-gray-500">
                                  {station.city}, {station.state}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                onClick={handleExport}
                disabled={selectedStationIds.size === 0 || isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Export {selectedStationIds.size} Stations
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}