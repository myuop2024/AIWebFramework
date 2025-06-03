import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowRight, CheckCircle, AlertTriangle, Clock, Users, 
  FileText, Bot, Zap, TrendingUp, Target, RefreshCw 
} from 'lucide-react';

// Mock data for smart routing
const mockRoutingQueue = [
  { id: 1, type: 'critical', from: 'Station 5', to: 'Admin', status: 'routed', time: '2 min ago' },
  { id: 2, type: 'high', from: 'Station 12', to: 'Supervisor', status: 'pending', time: '5 min ago' },
  { id: 3, type: 'medium', from: 'Station 8', to: 'Team Lead', status: 'routed', time: '10 min ago' },
];

// Mock compliance data
const mockComplianceData = {
  overallRate: 87,
  byRegion: [
    { region: 'Kingston', rate: 92, onTime: 45, late: 5 },
    { region: 'Montego Bay', rate: 85, onTime: 40, late: 7 },
    { region: 'Ocho Rios', rate: 78, onTime: 35, late: 10 },
  ],
  deadlines: [
    { task: 'Morning Report', due: '10:00 AM', status: 'completed' },
    { task: 'Incident Summary', due: '2:00 PM', status: 'pending' },
    { task: 'Final Count', due: '6:00 PM', status: 'upcoming' },
  ]
};

// Mock resource allocation suggestions
const mockResourceSuggestions = [
  { action: 'Move 2 observers', from: 'Station 3', to: 'Station 15', reason: 'High incident rate', impact: '+15% coverage' },
  { action: 'Deploy backup team', from: 'HQ', to: 'Kingston Central', reason: 'Crowd surge expected', impact: '+20% capacity' },
  { action: 'Redistribute supplies', from: 'Warehouse A', to: 'Region 2', reason: 'Low inventory alert', impact: 'Prevent shortage' },
];

// Mock follow-up tasks
const mockFollowUpTasks = [
  { id: 1, incident: 'Power outage at Station 5', task: 'Contact utility company', assignee: 'John D.', priority: 'high', status: 'assigned' },
  { id: 2, incident: 'Voter ID scanner malfunction', task: 'Deploy tech support', assignee: 'Tech Team', priority: 'critical', status: 'in-progress' },
  { id: 3, incident: 'Long queues reported', task: 'Send crowd control team', assignee: 'Security', priority: 'medium', status: 'completed' },
];

export default function SmartOperationsDashboard() {
  const [autoRouting, setAutoRouting] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshing(true);
      setTimeout(() => setRefreshing(false), 1000);
    }, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'upcoming': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      case 'high': return <Badge variant="default">High</Badge>;
      case 'medium': return <Badge variant="secondary">Medium</Badge>;
      default: return <Badge variant="outline">Low</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Smart Operations Center</h1>
          <p className="text-gray-600">AI-powered operational intelligence and automation</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRefreshing(true)}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Badge variant={autoRouting ? 'default' : 'outline'}>
            <Bot className="h-3 w-3 mr-1" />
            {autoRouting ? 'Auto Mode ON' : 'Manual Mode'}
          </Badge>
        </div>
      </div>

      {/* Smart Report Routing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Smart Report Routing
          </CardTitle>
          <CardDescription>Automated routing based on severity and content analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-600">Auto-routing enabled</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setAutoRouting(!autoRouting)}
              >
                {autoRouting ? 'Disable' : 'Enable'}
              </Button>
            </div>
            <div className="space-y-3">
              {mockRoutingQueue.map(item => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getPriorityBadge(item.type)}
                    <span className="text-sm">{item.from}</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium">{item.to}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === 'routed' ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Clock className="h-4 w-4 text-yellow-500" />
                    )}
                    <span className="text-xs text-gray-500">{item.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Compliance Monitoring
          </CardTitle>
          <CardDescription>Track submission deadlines and compliance rates</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Compliance Rate</span>
                <span className="text-2xl font-bold">{mockComplianceData.overallRate}%</span>
              </div>
              <Progress value={mockComplianceData.overallRate} className="h-3" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {mockComplianceData.byRegion.map(region => (
                <div key={region.region} className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">{region.region}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Compliance</span>
                      <span className="font-medium">{region.rate}%</span>
                    </div>
                    <div className="flex justify-between text-green-600">
                      <span>On Time</span>
                      <span>{region.onTime}</span>
                    </div>
                    <div className="flex justify-between text-red-600">
                      <span>Late</span>
                      <span>{region.late}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h4 className="font-medium mb-3">Upcoming Deadlines</h4>
              <div className="space-y-2">
                {mockComplianceData.deadlines.map((deadline, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">{deadline.task}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">{deadline.due}</span>
                      <span className={`text-sm font-medium ${getStatusColor(deadline.status)}`}>
                        {deadline.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resource Allocation Bot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-purple-500" />
            Resource Allocation AI
          </CardTitle>
          <CardDescription>Intelligent suggestions for optimal resource distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockResourceSuggestions.map((suggestion, idx) => (
              <Alert key={idx}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{suggestion.action}</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1">
                    <p>From: {suggestion.from} → To: {suggestion.to}</p>
                    <p className="text-sm">Reason: {suggestion.reason}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">{suggestion.impact}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm">Accept</Button>
                    <Button size="sm" variant="outline">Modify</Button>
                    <Button size="sm" variant="ghost">Dismiss</Button>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Follow-up Task Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-500" />
            Auto-Generated Follow-up Tasks
          </CardTitle>
          <CardDescription>Tasks automatically created from incident reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockFollowUpTasks.map(task => (
              <div key={task.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-sm">{task.task}</p>
                    <p className="text-xs text-gray-600 mt-1">Incident: {task.incident}</p>
                  </div>
                  {getPriorityBadge(task.priority)}
                </div>
                <div className="flex justify-between items-center mt-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{task.assignee}</span>
                  </div>
                  <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                    {task.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 