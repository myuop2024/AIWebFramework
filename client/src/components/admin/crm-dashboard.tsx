import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Target,
  Clock,
  CheckSquare,
  Phone,
  Mail,
  Calendar,
  Activity,
  Award,
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye
} from 'lucide-react';

interface CRMDashboardProps {
  isAdmin: boolean;
}

const CRMDashboard: React.FC<CRMDashboardProps> = ({ isAdmin }) => {
  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['crm-dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/crm/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      return res.json();
    },
  });

  // Mock data for demonstration (replace with real data)
  const mockData = {
    totalObservers: 1247,
    totalTeams: 23,
    totalAssignments: 156,
    activeObservers: 1134,
    pollingStations: 89,
    coveragePercentage: 87.5,
    trainedObservers: 1089,
    deployedObservers: 78,
    recentActivities: [
      { id: 1, type: 'assignment', contact: 'John Smith', time: '2 hours ago', description: 'Assigned to Central Primary School' },
      { id: 2, type: 'training', contact: 'Sarah Johnson', time: '4 hours ago', description: 'Completed observer training' },
      { id: 3, type: 'team', contact: 'Mike Davis', time: '1 day ago', description: 'Added to Central District Team' },
      { id: 4, type: 'check_in', contact: 'Emily Wilson', time: '2 days ago', description: 'Checked in at polling station' },
    ],
    topTeams: [
      { id: 1, name: 'Central District Team', members: 12, assignments: 8, coverage: 95 },
      { id: 2, name: 'Northern Region Team', members: 15, assignments: 12, coverage: 88 },
      { id: 3, name: 'Southern Parish Team', members: 10, assignments: 7, coverage: 82 },
    ],
    observerStatus: {
      available: 856,
      assigned: 278,
      deployed: 78,
      training: 35,
      inactive: 0
    },
    monthlyPerformance: [
      { month: 'Jan', observers: 1150, assignments: 89 },
      { month: 'Feb', observers: 1180, assignments: 124 },
      { month: 'Mar', observers: 1220, assignments: 156 },
      { month: 'Apr', observers: 1190, assignments: 134 },
      { month: 'May', observers: 1250, assignments: 178 },
      { month: 'Jun', observers: 1247, assignments: 156 },
    ]
  };

  const data = dashboardData || mockData;

  const MetricCard = ({ title, value, icon, change, changeType }: any) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className={`flex items-center mt-2 text-sm ${
              changeType === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {changeType === 'up' ? (
                <ArrowUpRight className="h-4 w-4 mr-1" />
              ) : (
                <ArrowDownRight className="h-4 w-4 mr-1" />
              )}
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${
          changeType === 'up' ? 'bg-green-100' : 'bg-blue-100'
        }`}>
          {icon}
        </div>
      </div>
    </div>
  );

  const ActivityIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'assignment': return <Target className="h-4 w-4 text-blue-600" />;
      case 'training': return <Award className="h-4 w-4 text-green-600" />;
      case 'team': return <Users className="h-4 w-4 text-purple-600" />;
      case 'check_in': return <CheckSquare className="h-4 w-4 text-yellow-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Observers"
          value={data.totalObservers?.toLocaleString() || '0'}
          icon={<Users className="h-6 w-6 text-blue-600" />}
          change="+12% from last month"
          changeType="up"
        />
        <MetricCard
          title="Active Teams"
          value={data.totalTeams || '0'}
          icon={<Target className="h-6 w-6 text-green-600" />}
          change="+8% from last month"
          changeType="up"
        />
        <MetricCard
          title="Polling Stations"
          value={data.pollingStations || '0'}
          icon={<Building2 className="h-6 w-6 text-yellow-600" />}
          change="No change"
          changeType="up"
        />
        <MetricCard
          title="Coverage Rate"
          value={`${data.coveragePercentage || 0}%`}
          icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
          change="+5% from last month"
          changeType="up"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Active Observers"
          value={data.activeObservers || '0'}
          icon={<Users className="h-6 w-6 text-blue-500" />}
        />
        <MetricCard
          title="Assignments"
          value={data.totalAssignments || '0'}
          icon={<CheckSquare className="h-6 w-6 text-green-500" />}
        />
        <MetricCard
          title="Trained Observers"
          value={data.trainedObservers || '0'}
          icon={<Award className="h-6 w-6 text-purple-500" />}
        />
        <MetricCard
          title="Deployed Now"
          value={data.deployedObservers || '0'}
          icon={<Activity className="h-6 w-6 text-orange-500" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Observer Status */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Observer Status Distribution</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View Details
            </button>
          </div>
          <div className="space-y-4">
            {Object.entries(data.observerStatus || {}).map(([status, count]: [string, any]) => (
              <div key={status} className="flex items-center space-x-4">
                <div className="w-20 text-sm font-medium text-gray-600 capitalize">
                  {status}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-6">
                  <div
                    className={`h-6 rounded-full flex items-center px-3 text-white text-sm font-medium ${
                      status === 'available' ? 'bg-blue-500' :
                      status === 'assigned' ? 'bg-green-500' :
                      status === 'deployed' ? 'bg-yellow-500' :
                      status === 'training' ? 'bg-orange-500' :
                      'bg-gray-500'
                    }`}
                    style={{ width: `${Math.max((count / (data.totalObservers || 1)) * 100, 10)}%` }}
                  >
                    {count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Teams */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Performing Teams</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {data.topTeams?.map((team: any) => (
              <div key={team.id} className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{team.name}</h4>
                  <span className="text-green-600 font-semibold">
                    {team.coverage}%
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm text-gray-600">{team.members} members</span>
                  <span className="text-sm text-gray-500">{team.assignments} assignments</span>
                </div>
              </div>
            )) || <p className="text-gray-500 text-sm">No teams found</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activities</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {data.recentActivities?.map((activity: any) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  <ActivityIcon type={activity.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.contact}
                    </p>
                    <span className="text-xs text-gray-500">{activity.time}</span>
                  </div>
                  <p className="text-sm text-gray-600">{activity.description}</p>
                </div>
              </div>
            )) || <p className="text-gray-500 text-sm">No recent activities</p>}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Plus className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Add Observer</span>
            </button>
            <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Target className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Create Assignment</span>
            </button>
            <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Users className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Create Team</span>
            </button>
            <button className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Calendar className="h-8 w-8 text-orange-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Schedule Training</span>
            </button>
          </div>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Performance</h3>
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-md">
              Observers
            </button>
            <button className="px-3 py-1 text-sm text-gray-600 rounded-md hover:bg-gray-100">
              Assignments
            </button>
          </div>
        </div>
        <div className="h-64 flex items-end space-x-4">
          {data.monthlyPerformance?.map((month: any, index: number) => (
            <div key={month.month} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-blue-500 rounded-t-lg mb-2"
                style={{ 
                  height: `${(month.observers / Math.max(...data.monthlyPerformance?.map((m: any) => m.observers) || [1])) * 200}px` 
                }}
              ></div>
              <div className="text-sm text-gray-600">{month.month}</div>
              <div className="text-sm font-medium text-gray-900">{month.observers}</div>
            </div>
          )) || <p className="text-gray-500">No performance data available</p>}
        </div>
      </div>
    </div>
  );
};

export default CRMDashboard; 