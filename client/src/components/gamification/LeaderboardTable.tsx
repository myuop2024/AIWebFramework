import React from 'react';

export interface LeaderboardEntry {
  rank?: number;
  userId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  points: number;
  // Add avatarUrl or other fields if needed
}

interface LeaderboardTableProps {
  title: string;
  entries: LeaderboardEntry[];
  currentUserId?: number; // To highlight the current user
}

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ title, entries, currentUserId }) => {
  if (!entries || entries.length === 0) {
    return <p className="text-gray-500">Leaderboard is currently empty.</p>;
  }

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h3 className="text-lg font-semibold text-gray-700 mb-3">{title}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry, index) => (
              <tr key={entry.userId} className={entry.userId === currentUserId ? 'bg-blue-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.rank !== undefined ? entry.rank : index + 1}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{entry.firstName && entry.lastName ? `${entry.firstName} ${entry.lastName}` : entry.username || `User ${entry.userId}`}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold">{entry.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaderboardTable;
