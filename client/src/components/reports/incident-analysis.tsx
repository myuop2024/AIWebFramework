import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  BarChart2, 
  FileText, 
  Filter, 
  MapPin, 
  PieChart as PieChartIcon, 
  Printer,
  Download,
  ExternalLink
} from "lucide-react";

type IncidentReport = {
  id: number;
  userId: number;
  stationId: number;
  stationName?: string;
  reportType: string;
  content: any;
  status: string;
  submittedAt: string;
  category?: string;
  severity?: string;
  locationLat?: number;
  locationLng?: number;
};

type ChartData = {
  name: string;
  value: number;
  color: string;
};

const COLORS = ['#4F46E5', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#6B7280'];
const SEVERITY_COLORS = {
  critical: '#DC2626',
  high: '#F97316',
  medium: '#F59E0B',
  low: '#10B981',
  info: '#6B7280'
};

export default function IncidentAnalysis() {
  const [timeRange, setTimeRange] = useState('30d');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('summary');
  const { toast } = useToast();

  // Query for fetching incident reports
  const { data: reports, isLoading, error } = useQuery<IncidentReport[]>({
    queryKey: ['/api/reports', { type: 'incident', timeRange }],
  });

  // Creating the filtered reports based on selected filters
  const filteredReports = useMemo(() => {
    if (!reports) return [];
    
    return reports.filter(report => {
      const matchesSeverity = filterSeverity === 'all' || report.severity === filterSeverity;
      const matchesCategory = filterCategory === 'all' || report.category === filterCategory;
      return matchesSeverity && matchesCategory;
    });
  }, [reports, filterSeverity, filterCategory]);

  // Get unique categories and calculate counts for each
  const categoryData = useMemo(() => {
    if (!filteredReports.length) return [];
    
    const categories: Record<string, number> = {};
    
    filteredReports.forEach(report => {
      const category = report.category || 'Uncategorized';
      categories[category] = (categories[category] || 0) + 1;
    });
    
    return Object.entries(categories).map(([name, value], index) => ({
      name,
      value,
      color: COLORS[index % COLORS.length]
    }));
  }, [filteredReports]);

  // Get unique severities and calculate counts for each
  const severityData = useMemo(() => {
    if (!filteredReports.length) return [];
    
    const severities: Record<string, number> = {};
    
    filteredReports.forEach(report => {
      const severity = report.severity || 'Unspecified';
      severities[severity] = (severities[severity] || 0) + 1;
    });
    
    return Object.entries(severities).map(([name, value]) => ({
      name,
      value,
      color: SEVERITY_COLORS[name as keyof typeof SEVERITY_COLORS] || '#6B7280'
    }));
  }, [filteredReports]);

  // Distribution of incidents over time
  const timeData = useMemo(() => {
    if (!filteredReports.length) return [];
    
    const dateMap: Record<string, number> = {};
    const sortedReports = [...filteredReports].sort(
      (a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
    );
    
    // Determine date format based on time range
    const getDateKey = (date: Date) => {
      if (timeRange === '7d' || timeRange === '30d') {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (timeRange === '90d') {
        // Format by week of the year
        const weekNumber = Math.ceil((((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7);
        return `${date.toLocaleDateString('en-US', { month: 'short' })} Week ${weekNumber}`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'long' });
      }
    };
    
    sortedReports.forEach(report => {
      const date = new Date(report.submittedAt);
      const dateKey = getDateKey(date);
      dateMap[dateKey] = (dateMap[dateKey] || 0) + 1;
    });
    
    return Object.entries(dateMap).map(([name, value]) => ({
      name,
      incidents: value
    }));
  }, [filteredReports, timeRange]);

  // Get a count of stations with incidents
  const stationData = useMemo(() => {
    if (!filteredReports.length) return [];
    
    const stationMap: Record<string, {count: number, stationId: number}> = {};
    
    filteredReports.forEach(report => {
      const stationName = report.stationName || `Station ${report.stationId}`;
      if (!stationMap[stationName]) {
        stationMap[stationName] = { count: 0, stationId: report.stationId };
      }
      stationMap[stationName].count += 1;
    });
    
    return Object.entries(stationMap)
      .map(([name, { count, stationId }]) => ({
        name,
        incidents: count,
        stationId
      }))
      .sort((a, b) => b.incidents - a.incidents)
      .slice(0, 10); // Top 10 stations
  }, [filteredReports]);

  // Get unique categories for the filter
  const categories = useMemo(() => {
    if (!reports) return [];
    
    const uniqueCategories = new Set<string>();
    reports.forEach(report => {
      if (report.category) {
        uniqueCategories.add(report.category);
      }
    });
    
    return Array.from(uniqueCategories);
  }, [reports]);

  // Get unique severities for the filter
  const severities = useMemo(() => {
    if (!reports) return [];
    
    const uniqueSeverities = new Set<string>();
    reports.forEach(report => {
      if (report.severity) {
        uniqueSeverities.add(report.severity);
      }
    });
    
    return Array.from(uniqueSeverities);
  }, [reports]);

  // Handle exporting data
  const handleExport = () => {
    if (!filteredReports.length) {
      toast({
        title: "No data to export",
        description: "There are no incident reports matching your criteria.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const exportData = filteredReports.map(report => ({
        id: report.id,
        stationName: report.stationName || `Station ${report.stationId}`,
        reportType: report.reportType,
        category: report.category || 'Uncategorized',
        severity: report.severity || 'Unspecified',
        status: report.status,
        submittedAt: new Date(report.submittedAt).toLocaleString()
      }));
      
      const csv = convertToCSV(exportData);
      downloadCSV(csv, `incident-reports-${new Date().toISOString().split('T')[0]}.csv`);
      
      toast({
        title: "Export successful",
        description: "Your incident report data has been exported.",
      });
    } catch (err) {
      console.error("Export error:", err);
      toast({
        title: "Export failed",
        description: "There was a problem exporting the data.",
        variant: "destructive"
      });
    }
  };
  
  // Convert data to CSV format
  const convertToCSV = <T extends Record<string, unknown>>(data: T[]) => {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row)
        .map(value => typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value)
        .join(',')
    );
    
    return [headers, ...rows].join('\n');
  };
  
  // Download CSV file
  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle printing
  const handlePrint = () => {
    window.print();
  };

  // Add escalation matrix mock logic
  const getEscalationStatus = (report: IncidentReport) => {
    if (report.status === 'resolved') return { status: 'Resolved', color: 'green', path: ['Observer', 'Supervisor', 'Admin', 'Resolved'] };
    if (report.severity === 'critical') return { status: 'Escalated to Admin', color: 'red', path: ['Observer', 'Supervisor', 'Admin'] };
    if (report.severity === 'high') return { status: 'Escalated to Supervisor', color: 'orange', path: ['Observer', 'Supervisor'] };
    return { status: 'Not Escalated', color: 'gray', path: ['Observer'] };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Incident Report Analysis</CardTitle>
          <CardDescription>Loading incident data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    const axiosError = error as any; // Cast error to any
    const errorMsg = axiosError?.response?.data?.error || axiosError?.data?.error || axiosError?.message || "Please try again later.";
    return (
      <Card>
        <CardHeader>
          <CardTitle>Incident Report Analysis</CardTitle>
          <CardDescription>Error loading incident data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border border-red-200 rounded-md bg-red-50 text-red-600">
            <AlertTriangle className="inline-block mr-2 h-5 w-5" />
            <span>{errorMsg}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="print:shadow-none">
      <CardHeader className="print:pb-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <CardTitle>Incident Report Analysis</CardTitle>
            <CardDescription>
              Analysis of {filteredReports.length} incident reports
              {filterSeverity !== 'all' && ` with ${filterSeverity} severity`}
              {filterCategory !== 'all' && ` in ${filterCategory} category`}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrint}
              className="flex items-center gap-1"
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExport}
              className="flex items-center gap-1"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 pt-2 print:hidden">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="h-8 w-[90px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="h-8 w-[110px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                {severities.map(severity => (
                  <SelectItem key={severity} value={severity}>{severity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 w-[130px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="print:block"
        >
          <TabsList className="mb-4 print:hidden">
            <TabsTrigger value="summary" className="flex items-center gap-1">
              <PieChartIcon className="h-4 w-4" />
              <span>Summary</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-1">
              <BarChart2 className="h-4 w-4" />
              <span>Trends</span>
            </TabsTrigger>
            <TabsTrigger value="stations" className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>Stations</span>
            </TabsTrigger>
            <TabsTrigger value="details" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              <span>Details</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="mt-0 print:block">
            <h3 className="font-medium text-lg mb-4 print:mt-4">Incident Summary</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Severity Distribution */}
              <div>
                <h4 className="font-medium text-sm mb-2 text-center">Severity Distribution</h4>
                <div className="h-64 flex items-center justify-center">
                  {severityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={severityData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {severityData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} incidents`, 'Count']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-gray-500">
                      No severity data available
                    </div>
                  )}
                </div>
              </div>
              
              {/* Category Distribution */}
              <div>
                <h4 className="font-medium text-sm mb-2 text-center">Category Distribution</h4>
                <div className="h-64 flex items-center justify-center">
                  {categoryData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} incidents`, 'Count']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-center text-gray-500">
                      No category data available
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Key Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Total Incidents</p>
                  <p className="text-2xl font-bold">{filteredReports.length}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Critical Issues</p>
                  <p className="text-2xl font-bold">
                    {filteredReports.filter(r => r.severity === 'critical').length}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Affected Stations</p>
                  <p className="text-2xl font-bold">
                    {new Set(filteredReports.map(r => r.stationId)).size}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-500">Resolution Rate</p>
                  <p className="text-2xl font-bold">
                    {filteredReports.length 
                      ? `${Math.round((filteredReports.filter(r => r.status === 'resolved').length / filteredReports.length) * 100)}%` 
                      : '0%'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="trends" className="mt-0 print:block print:mt-8">
            <h3 className="font-medium text-lg mb-4">Incident Trends</h3>
            
            {/* Time Distribution */}
            <div>
              <h4 className="font-medium text-sm mb-2">Time Distribution</h4>
              <div className="h-80">
                {timeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeData} margin={{ top: 10, right: 30, left: 0, bottom: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45} 
                        textAnchor="end" 
                        tick={{ fontSize: 12 }}
                        height={70}
                      />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="incidents" fill="#4F46E5" name="Incidents" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    No trend data available
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="stations" className="mt-0 print:block print:mt-8">
            <h3 className="font-medium text-lg mb-4">Stations with Most Incidents</h3>
            
            {/* Stations with Most Incidents */}
            <div>
              <div className="h-80">
                {stationData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={stationData} 
                      layout="vertical" 
                      margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        tick={{ fontSize: 12 }} 
                        width={100} 
                      />
                      <Tooltip />
                      <Bar dataKey="incidents" fill="#8B5CF6" name="Incidents" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    No station data available
                  </div>
                )}
              </div>
            </div>
            
            {/* Station List */}
            <div className="mt-6">
              <h4 className="font-medium text-sm mb-2">Station Details</h4>
              <div className="border rounded-md">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-2 text-left text-sm font-medium">Station Name</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Incidents</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Critical Issues</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stationData.slice(0, 5).map((station, index) => {
                      const criticalCount = filteredReports.filter(
                        r => r.stationId === station.stationId && r.severity === 'critical'
                      ).length;
                      
                      return (
                        <tr key={index} className="border-b">
                          <td className="px-4 py-3 text-sm">{station.name}</td>
                          <td className="px-4 py-3 text-sm font-medium">{station.incidents}</td>
                          <td className="px-4 py-3 text-sm">
                            {criticalCount > 0 && (
                              <Badge variant="destructive" className="font-normal">
                                {criticalCount} critical
                              </Badge>
                            )}
                            {criticalCount === 0 && (
                              <span className="text-gray-500">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              <ExternalLink className="h-4 w-4" />
                              <span className="sr-only">View Details</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="mt-0 print:block print:mt-8">
            <h3 className="font-medium text-lg mb-4">Incident Details</h3>
            
            {/* Incident List */}
            <div className="border rounded-md">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-2 text-left text-sm font-medium">ID</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Station</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Category</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Severity</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-2 text-left text-sm font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.slice(0, 10).map((report) => (
                    <React.Fragment key={report.id}>
                      <tr className="border-b">
                        <td className="px-4 py-3 text-sm">{report.id}</td>
                        <td className="px-4 py-3 text-sm">{report.stationName || `Station ${report.stationId}`}</td>
                        <td className="px-4 py-3 text-sm">{report.category || 'Uncategorized'}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge
                            className="font-normal"
                            variant={
                              report.severity === 'critical' ? 'destructive' :
                              report.severity === 'high' ? 'default' :
                              report.severity === 'medium' ? 'secondary' :
                              'outline'
                            }
                          >
                            {report.severity || 'Unspecified'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge 
                            variant="outline" 
                            className={
                              report.status === 'resolved' ? 'text-green-600 border-green-300 bg-green-50' :
                              report.status === 'in_progress' ? 'text-blue-600 border-blue-300 bg-blue-50' :
                              'text-amber-600 border-amber-300 bg-amber-50'
                            }
                          >
                            {report.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {new Date(report.submittedAt).toLocaleDateString()}
                        </td>
                      </tr>
                      {/* Escalation Matrix Row */}
                      <tr className="border-b bg-gray-50">
                        <td colSpan={6} className="px-4 py-2">
                          <div className="flex items-center gap-4">
                            <span className="font-medium text-xs text-gray-500">Escalation Path:</span>
                            <div className="flex items-center gap-2">
                              {getEscalationStatus(report).path.map((role, idx, arr) => (
                                <React.Fragment key={role}>
                                  <span className={`px-2 py-1 rounded text-xs font-semibold bg-${getEscalationStatus(report).color}-100 text-${getEscalationStatus(report).color}-700`}>
                                    {role}
                                  </span>
                                  {idx < arr.length - 1 && <span className="text-gray-400">→</span>}
                                </React.Fragment>
                              ))}
                            </div>
                            <span className={`ml-4 px-2 py-1 rounded text-xs font-semibold bg-${getEscalationStatus(report).color}-200 text-${getEscalationStatus(report).color}-800`}>
                              {getEscalationStatus(report).status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                  
                  {filteredReports.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No incidents match your current filters
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              
              {filteredReports.length > 10 && (
                <div className="p-2 text-center text-sm text-gray-500 border-t">
                  Showing 10 of {filteredReports.length} incidents
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}