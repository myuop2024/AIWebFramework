import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText,
  BarChart3,
  PieChart,
  TrendingUp,
  Download,
  Calendar,
  Filter,
  Users,
  MapPin,
  Target,
  Award,
  CheckSquare,
  AlertCircle,
  Clock,
  Activity,
  Eye
} from 'lucide-react';

interface CRMReportsProps {
  isAdmin: boolean;
}

const CRMReports: React.FC<CRMReportsProps> = ({ isAdmin }) => {
  const [selectedReport, setSelectedReport] = useState<string>('coverage');
  const [dateRange, setDateRange] = useState<string>('7d');
  const [selectedParish, setSelectedParish] = useState<string>('all');

  // Fetch report data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ['crm-reports', selectedReport, dateRange, selectedParish],
    queryFn: async () => {
      const res = await fetch(`/api/crm/reports/${selectedReport}?range=${dateRange}&parish=${selectedParish}`);
      if (!res.ok) throw new Error('Failed to fetch report data');
      return res.json();
    },
  });

  // Report types
  const reportTypes = [
    {
      id: 'coverage',
      name: 'Coverage Analysis',
      description: 'Polling station coverage and assignment status',
      icon: <MapPin className="h-5 w-5" />
    },
    {
      id: 'performance',
      name: 'Team Performance',
      description: 'Team and observer performance metrics',
      icon: <TrendingUp className="h-5 w-5" />
    },
    {
      id: 'training',
      name: 'Training Report',
      description: 'Observer training completion status',
      icon: <Award className="h-5 w-5" />
    },
    {
      id: 'activity',
      name: 'Activity Summary',
      description: 'System activity and engagement metrics',
      icon: <Activity className="h-5 w-5" />
    },
    {
      id: 'deployment',
      name: 'Deployment Status',
      description: 'Observer deployment and check-in status',
      icon: <Users className="h-5 w-5" />
    }
  ];

  // Mock report data
  const mockReportData = {
    coverage: {
      totalStations: 89,
      assignedStations: 78,
      coveragePercentage: 87.6,
      byParish: [
        { parish: 'St. Andrew', total: 25, assigned: 23, percentage: 92 },
        { parish: 'St. Catherine', total: 22, assigned: 19, percentage: 86 },
        { parish: 'St. Mary', total: 18, assigned: 16, percentage: 89 },
        { parish: 'Kingston', total: 15, assigned: 12, percentage: 80 },
        { parish: 'Portland', total: 9, assigned: 8, percentage: 89 }
      ],
      uncoveredStations: [
        { name: 'Westside Community Center', parish: 'St. Catherine', reason: 'No available observers' },
        { name: 'Mountain View School', parish: 'Portland', reason: 'Insufficient team coverage' }
      ]
    },
    performance: {
      totalObservers: 1247,
      activeObservers: 1134,
      topTeams: [
        { name: 'Central District Team', members: 12, assignments: 8, completionRate: 95 },
        { name: 'Northern Region Team', members: 15, assignments: 12, completionRate: 88 },
        { name: 'Southern Parish Team', members: 10, assignments: 7, completionRate: 82 }
      ],
      observerEngagement: {
        high: 756,
        medium: 378,
        low: 113
      }
    },
    training: {
      totalObservers: 1247,
      trainedObservers: 1089,
      trainingCompletion: 87.3,
      certifiedObservers: 1023,
      recentCompletions: 45,
      upcomingSessions: 3
    }
  };

  const data = reportData || mockReportData;

  const exportReport = (format: 'pdf' | 'excel' | 'csv') => {
    // This would trigger a download
    console.log(`Exporting ${selectedReport} report as ${format}`);
  };

  const CoverageReport = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <MapPin className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Stations</p>
              <p className="text-2xl font-bold text-gray-900">{data.coverage?.totalStations || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckSquare className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Assigned</p>
              <p className="text-2xl font-bold text-gray-900">{data.coverage?.assignedStations || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Coverage Rate</p>
              <p className="text-2xl font-bold text-gray-900">{data.coverage?.coveragePercentage || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Coverage by Parish */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Coverage by Parish</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parish</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Stations</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coverage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.coverage?.byParish?.map((parish: any) => (
                <tr key={parish.parish}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {parish.parish}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {parish.total}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {parish.assigned}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {parish.percentage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      parish.percentage >= 90 ? 'bg-green-100 text-green-800' :
                      parish.percentage >= 80 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {parish.percentage >= 90 ? 'Excellent' :
                       parish.percentage >= 80 ? 'Good' : 'Needs Attention'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Uncovered Stations */}
      {data.coverage?.uncoveredStations?.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Uncovered Stations</h3>
          <div className="space-y-3">
            {data.coverage.uncoveredStations.map((station: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <div>
                  <p className="font-medium text-gray-900">{station.name}</p>
                  <p className="text-sm text-gray-600">{station.parish}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-red-600">{station.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const PerformanceReport = () => (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Observer Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Observers</span>
              <span className="font-medium">{data.performance?.totalObservers || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Observers</span>
              <span className="font-medium text-green-600">{data.performance?.activeObservers || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Levels</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">High Engagement</span>
              <span className="font-medium text-green-600">{data.performance?.observerEngagement?.high || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Medium Engagement</span>
              <span className="font-medium text-yellow-600">{data.performance?.observerEngagement?.medium || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Low Engagement</span>
              <span className="font-medium text-red-600">{data.performance?.observerEngagement?.low || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performing Teams */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Teams</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assignments</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Completion Rate</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.performance?.topTeams?.map((team: any, index: number) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {team.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {team.members}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {team.assignments}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${team.completionRate}%` }}
                        ></div>
                      </div>
                      {team.completionRate}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const TrainingReport = () => (
    <div className="space-y-6">
      {/* Training Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Award className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Training Completion</p>
              <p className="text-2xl font-bold text-gray-900">{data.training?.trainingCompletion || 0}%</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Trained Observers</p>
              <p className="text-2xl font-bold text-gray-900">{data.training?.trainedObservers || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <CheckSquare className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Certified</p>
              <p className="text-2xl font-bold text-gray-900">{data.training?.certifiedObservers || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Training Progress */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Training Progress</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Training Completion</span>
              <span className="text-sm text-gray-600">{data.training?.trainingCompletion}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${data.training?.trainingCompletion}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReport = () => {
    switch (selectedReport) {
      case 'coverage':
        return <CoverageReport />;
      case 'performance':
        return <PerformanceReport />;
      case 'training':
        return <TrainingReport />;
      default:
        return <div className="text-center py-12 text-gray-500">Select a report type to view details</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600">Generate comprehensive reports on observer management</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => exportReport('pdf')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>PDF</span>
          </button>
          <button 
            onClick={() => exportReport('excel')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Excel</span>
          </button>
          <button 
            onClick={() => exportReport('csv')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Types Sidebar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Report Types</h3>
          <div className="space-y-2">
            {reportTypes.map((report) => (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedReport === report.id
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {report.icon}
                  <div>
                    <div className="font-medium">{report.name}</div>
                    <div className="text-xs text-gray-500">{report.description}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parish
              </label>
              <select
                value={selectedParish}
                onChange={(e) => setSelectedParish(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Parishes</option>
                <option value="st_andrew">St. Andrew</option>
                <option value="st_catherine">St. Catherine</option>
                <option value="st_mary">St. Mary</option>
                <option value="kingston">Kingston</option>
                <option value="portland">Portland</option>
              </select>
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div className="lg:col-span-3">
          {renderReport()}
        </div>
      </div>
    </div>
  );
};

export default CRMReports; 