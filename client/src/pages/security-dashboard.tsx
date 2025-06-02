import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  AlertTriangle, 
  Ban, 
  Eye, 
  Settings, 
  Activity,
  Lock,
  Users,
  Database,
  Network,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WAFStats {
  blockedRequests: number;
  totalRequests: number;
  blockedIPs: string[];
  suspiciousActivity: Record<string, { count: number; lastSeen: number }>;
  config: {
    enableRateLimit: boolean;
    enableSQLInjectionProtection: boolean;
    enableXSSProtection: boolean;
    enableCSRFProtection: boolean;
    enableIPWhitelist: boolean;
    enableGeoblocking: boolean;
    maxRequestsPerWindow: number;
    windowMs: number;
  };
}

interface SuspiciousActivity {
  ip: string;
  count: number;
  lastSeen: string;
  threat_level: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface RLSStatus {
  enabled: boolean;
  policies: Array<{
    tablename: string;
    policyname: string;
    permissive: string;
    roles: string[];
    cmd: string;
    qual: string;
  }>;
  userContext: {
    current_user_id: number | null;
    current_user_role: string | null;
  };
}

export default function SecurityDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [blockIpInput, setBlockIpInput] = useState('');
  const [testInput, setTestInput] = useState('');

  // WAF Statistics Query
  const { data: wafStats, isLoading: loadingWAF } = useQuery<WAFStats>({
    queryKey: ['/api/waf/stats'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Suspicious Activity Query
  const { data: suspiciousActivity } = useQuery<{ data: { suspiciousActivity: SuspiciousActivity[] } }>({
    queryKey: ['/api/waf/suspicious-activity'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Blocked IPs Query
  const { data: blockedIPs } = useQuery<{ data: { blockedIPs: string[] } }>({
    queryKey: ['/api/waf/blocked-ips'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // RLS Status Query
  const { data: rlsStatus } = useQuery<RLSStatus>({
    queryKey: ['/api/admin/rls/status'],
    refetchInterval: 30000,
  });

  // Block IP Mutation
  const blockIPMutation = useMutation({
    mutationFn: async (ip: string) => {
      const response = await fetch('/api/waf/block-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, reason: 'Manual block from admin dashboard' }),
      });
      if (!response.ok) throw new Error('Failed to block IP');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'IP address blocked successfully' });
      setBlockIpInput('');
      queryClient.invalidateQueries({ queryKey: ['/api/waf/blocked-ips'] });
      queryClient.invalidateQueries({ queryKey: ['/api/waf/stats'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to block IP address', variant: 'destructive' });
    },
  });

  // Unblock IP Mutation
  const unblockIPMutation = useMutation({
    mutationFn: async (ip: string) => {
      const response = await fetch('/api/waf/unblock-ip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip }),
      });
      if (!response.ok) throw new Error('Failed to unblock IP');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'IP address unblocked successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/waf/blocked-ips'] });
      queryClient.invalidateQueries({ queryKey: ['/api/waf/stats'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to unblock IP address', variant: 'destructive' });
    },
  });

  // WAF Configuration Update Mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (config: Partial<WAFStats['config']>) => {
      const response = await fetch('/api/waf/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (!response.ok) throw new Error('Failed to update configuration');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Success', description: 'WAF configuration updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/waf/stats'] });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update WAF configuration', variant: 'destructive' });
    },
  });

  // Test WAF Rules Mutation
  const testRulesMutation = useMutation({
    mutationFn: async (testInput: string) => {
      const response = await fetch('/api/waf/test-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testInput }),
      });
      if (!response.ok) throw new Error('Failed to test rules');
      return response.json();
    },
    onSuccess: (data) => {
      const { blocked, reason } = data.data;
      toast({
        title: blocked ? 'Blocked' : 'Allowed',
        description: blocked ? `Input blocked: ${reason}` : 'Input would be allowed through WAF',
        variant: blocked ? 'destructive' : 'default',
      });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to test WAF rules', variant: 'destructive' });
    },
  });

  const getThreatBadgeColor = (level: string) => {
    switch (level) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'default';
      case 'LOW': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Security Dashboard</h1>
          <p className="text-muted-foreground">Monitor and manage security systems</p>
        </div>
        <Shield className="h-8 w-8 text-primary" />
      </div>

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WAF Status</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground">
              {wafStats ? `${wafStats.blockedRequests} blocked requests` : 'Loading...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RLS Status</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {rlsStatus?.enabled ? 'Enabled' : 'Unknown'}
            </div>
            <p className="text-xs text-muted-foreground">
              {rlsStatus ? `${rlsStatus.policies.length} policies active` : 'Loading...'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked IPs</CardTitle>
            <Ban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {blockedIPs?.data.blockedIPs.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently blocked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Threats Detected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {suspiciousActivity?.data.suspiciousActivity.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Suspicious activities</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="waf" className="space-y-4">
        <TabsList>
          <TabsTrigger value="waf">WAF Management</TabsTrigger>
          <TabsTrigger value="rls">Database Security</TabsTrigger>
          <TabsTrigger value="monitoring">Security Monitoring</TabsTrigger>
          <TabsTrigger value="settings">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="waf" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* IP Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ban className="h-5 w-5" />
                  IP Address Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter IP address to block"
                    value={blockIpInput}
                    onChange={(e) => setBlockIpInput(e.target.value)}
                  />
                  <Button
                    onClick={() => blockIPMutation.mutate(blockIpInput)}
                    disabled={!blockIpInput || blockIPMutation.isPending}
                  >
                    Block IP
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Currently Blocked IPs</h4>
                  {blockedIPs?.data.blockedIPs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No IPs currently blocked</p>
                  ) : (
                    <div className="space-y-2">
                      {blockedIPs?.data.blockedIPs.map((ip) => (
                        <div key={ip} className="flex items-center justify-between p-2 border rounded">
                          <span className="font-mono text-sm">{ip}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => unblockIPMutation.mutate(ip)}
                            disabled={unblockIPMutation.isPending}
                          >
                            Unblock
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* WAF Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  WAF Rule Testing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test-input">Test Input</Label>
                  <Input
                    id="test-input"
                    placeholder="Enter text to test against WAF rules"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                  />
                  <Button
                    onClick={() => testRulesMutation.mutate(testInput)}
                    disabled={!testInput || testRulesMutation.isPending}
                    className="w-full"
                  >
                    Test Rules
                  </Button>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Test potentially malicious inputs to verify WAF protection. Common test cases:
                    SQL injection, XSS scripts, command injection patterns.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Suspicious Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Suspicious Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Threat Count</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead>Threat Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suspiciousActivity?.data.suspiciousActivity.map((activity) => (
                    <TableRow key={activity.ip}>
                      <TableCell className="font-mono">{activity.ip}</TableCell>
                      <TableCell>{activity.count}</TableCell>
                      <TableCell>{new Date(activity.lastSeen).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={getThreatBadgeColor(activity.threat_level)}>
                          {activity.threat_level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => blockIPMutation.mutate(activity.ip)}
                          disabled={blockIPMutation.isPending}
                        >
                          Block IP
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!suspiciousActivity?.data.suspiciousActivity.length) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No suspicious activity detected
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Row-Level Security Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rlsStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>RLS Enabled:</span>
                    <Badge variant={rlsStatus.enabled ? 'default' : 'destructive'}>
                      {rlsStatus.enabled ? 'Yes' : 'No'}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Current User Context</h4>
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded">
                      <div>
                        <span className="text-sm text-muted-foreground">User ID:</span>
                        <p className="font-mono">{rlsStatus.userContext.current_user_id || 'Not set'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Role:</span>
                        <p className="font-mono">{rlsStatus.userContext.current_user_role || 'Not set'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Active RLS Policies ({rlsStatus.policies.length})</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Table</TableHead>
                          <TableHead>Policy Name</TableHead>
                          <TableHead>Command</TableHead>
                          <TableHead>Roles</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rlsStatus.policies.map((policy, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono">{policy.tablename}</TableCell>
                            <TableCell>{policy.policyname}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{policy.cmd}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {policy.roles.join(', ') || 'All'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : (
                <p>Loading RLS status...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Security Metrics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {wafStats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Requests</p>
                        <p className="text-2xl font-bold">{wafStats.totalRequests}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Blocked Requests</p>
                        <p className="text-2xl font-bold text-red-600">{wafStats.blockedRequests}</p>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-muted-foreground">Block Rate</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-red-600 h-2 rounded-full" 
                          style={{ 
                            width: `${wafStats.totalRequests > 0 ? (wafStats.blockedRequests / wafStats.totalRequests) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {wafStats.totalRequests > 0 ? 
                          ((wafStats.blockedRequests / wafStats.totalRequests) * 100).toFixed(2) : 0}% blocked
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Network Security
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Rate Limiting</span>
                    <Badge variant={wafStats?.config.enableRateLimit ? 'default' : 'secondary'}>
                      {wafStats?.config.enableRateLimit ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">SQL Injection Protection</span>
                    <Badge variant={wafStats?.config.enableSQLInjectionProtection ? 'default' : 'secondary'}>
                      {wafStats?.config.enableSQLInjectionProtection ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">XSS Protection</span>
                    <Badge variant={wafStats?.config.enableXSSProtection ? 'default' : 'secondary'}>
                      {wafStats?.config.enableXSSProtection ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">CSRF Protection</span>
                    <Badge variant={wafStats?.config.enableCSRFProtection ? 'default' : 'secondary'}>
                      {wafStats?.config.enableCSRFProtection ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                WAF Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              {wafStats?.config && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-medium">Protection Features</h4>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sql-protection">SQL Injection Protection</Label>
                        <Switch
                          id="sql-protection"
                          checked={wafStats.config.enableSQLInjectionProtection}
                          onCheckedChange={(checked) => 
                            updateConfigMutation.mutate({ enableSQLInjectionProtection: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="xss-protection">XSS Protection</Label>
                        <Switch
                          id="xss-protection"
                          checked={wafStats.config.enableXSSProtection}
                          onCheckedChange={(checked) => 
                            updateConfigMutation.mutate({ enableXSSProtection: checked })
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <Label htmlFor="csrf-protection">CSRF Protection</Label>
                        <Switch
                          id="csrf-protection"
                          checked={wafStats.config.enableCSRFProtection}
                          onCheckedChange={(checked) => 
                            updateConfigMutation.mutate({ enableCSRFProtection: checked })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-medium">Rate Limiting</h4>
                      
                      <div className="flex items-center justify-between">
                        <Label htmlFor="rate-limit">Enable Rate Limiting</Label>
                        <Switch
                          id="rate-limit"
                          checked={wafStats.config.enableRateLimit}
                          onCheckedChange={(checked) => 
                            updateConfigMutation.mutate({ enableRateLimit: checked })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max-requests">Max Requests per Window</Label>
                        <Input
                          id="max-requests"
                          type="number"
                          value={wafStats.config.maxRequestsPerWindow}
                          onChange={(e) => 
                            updateConfigMutation.mutate({ 
                              maxRequestsPerWindow: parseInt(e.target.value) 
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="window-ms">Window Duration (ms)</Label>
                        <Input
                          id="window-ms"
                          type="number"
                          value={wafStats.config.windowMs}
                          onChange={(e) => 
                            updateConfigMutation.mutate({ 
                              windowMs: parseInt(e.target.value) 
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      Configuration changes take effect immediately. Use caution when disabling security features in production.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}