// client/src/components/admin/system-logs-panel.tsx
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SystemLogsPanel() {
  // TODO: Fetch and display real logs
  const logs = [
    "[2025-05-05 08:24:32] INFO: System startup completed",
    "[2025-05-05 08:25:47] INFO: User login successful: admin",
    "[2025-05-05 08:26:13] INFO: Database connection pool initialized",
    "[2025-05-05 08:30:21] INFO: API request: GET /api/polling-stations",
    "[2025-05-05 08:31:05] INFO: User login successful: observer1",
    "[2025-05-05 08:32:17] INFO: New report submitted: id=145",
    "[2025-05-05 08:33:42] WARN: Rate limit reached for IP: 192.168.1.42",
    "[2025-05-05 08:35:19] INFO: API request: POST /api/users/profile",
    "[2025-05-05 08:37:45] ERROR: Database query error: timeout",
    "[2025-05-05 08:38:12] INFO: Database connection reestablished",
    "[2025-05-05 08:40:27] INFO: User login successful: coordinator2",
    "[2025-05-05 08:41:53] INFO: Assignment updated: id=87",
    "[2025-05-05 08:45:11] INFO: API request: GET /api/reports?status=pending",
    "[2025-05-05 08:47:32] INFO: Report status updated: id=142, status=approved",
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">System Logs</h3>
        <div>
          <Select defaultValue="all">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter logs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Logs</SelectItem>
              <SelectItem value="error">Error Logs</SelectItem>
              <SelectItem value="auth">Authentication Logs</SelectItem>
              <SelectItem value="api">API Requests</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="bg-gray-900 text-green-400 p-3 rounded font-mono text-sm h-64 overflow-y-auto">
        {logs.map((log, index) => (
          <div key={index}>{log}</div>
        ))}
      </div>
    </div>
  );
}
