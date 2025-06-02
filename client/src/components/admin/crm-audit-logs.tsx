import React from 'react';
import { useQuery } from '@tanstack/react-query';

const fetchAuditLogs = async () => {
  const res = await fetch('/crm/audit-logs');
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
};

const CRMAuditLogs: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['crm-audit-logs'],
    queryFn: fetchAuditLogs,
  });

  if (isLoading) return <div>Loading audit logs...</div>;
  if (error) return <div className="text-red-500">Error loading audit logs.</div>;

  return (
    <div className="bg-white rounded shadow p-4 mt-8">
      <h2 className="text-xl font-semibold mb-4">Audit Logs</h2>
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="text-left p-2">Action</th>
            <th className="text-left p-2">User ID</th>
            <th className="text-left p-2">Target ID</th>
            <th className="text-left p-2">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.map((log: any) => (
              <tr key={log.id} className="border-t">
                <td className="p-2">{log.action}</td>
                <td className="p-2">{log.userId}</td>
                <td className="p-2">{log.targetId}</td>
                <td className="p-2">{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={4} className="p-2 text-gray-500">No audit logs found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CRMAuditLogs; 