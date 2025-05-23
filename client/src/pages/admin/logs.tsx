import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { Spinner } from '@/components/ui/spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function AdminLogsPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      navigate('/dashboard');
      return;
    }
    setLoading(true);
    fetch('/api/logs')
      .then(res => res.json())
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [user, isLoading, navigate]);

  const filteredLogs = typeFilter === 'all' ? logs : logs.filter(l => l.type === typeFilter);
  const logTypes = Array.from(new Set(logs.map(l => l.type)));

  if (loading || isLoading) return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  if (!user || user.role !== 'admin') return null;

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>System Logs</CardTitle>
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant={typeFilter === 'all' ? 'default' : 'outline'} onClick={() => setTypeFilter('all')}>All</Button>
            {logTypes.map(type => (
              <Button key={type} size="sm" variant={typeFilter === type ? 'default' : 'outline'} onClick={() => setTypeFilter(type)}>
                {type}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left">Timestamp</th>
                <th className="px-2 py-1 text-left">Type</th>
                <th className="px-2 py-1 text-left">Path</th>
                <th className="px-2 py-1 text-left">Method</th>
                <th className="px-2 py-1 text-left">User ID</th>
                <th className="px-2 py-1 text-left">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, i) => (
                <tr key={i} className="border-b last:border-b-0">
                  <td className="px-2 py-1 whitespace-nowrap">{log.timestamp}</td>
                  <td className="px-2 py-1"><Badge>{log.type}</Badge></td>
                  <td className="px-2 py-1">{log.path || '-'}</td>
                  <td className="px-2 py-1">{log.method || '-'}</td>
                  <td className="px-2 py-1">{log.userId || '-'}</td>
                  <td className="px-2 py-1">
                    <pre className="max-w-xs overflow-x-auto whitespace-pre-wrap text-xs bg-gray-50 rounded p-1">
                      {JSON.stringify(log, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
} 