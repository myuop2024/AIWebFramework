import React from 'react';

interface UserPointsDisplayProps {
  points: number;
}

const UserPointsDisplay: React.FC<UserPointsDisplayProps> = ({ points }) => {
  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h3 className="text-lg font-semibold text-gray-700">My Points</h3>
      <p className="text-3xl font-bold text-blue-600">{points}</p>
    </div>
  );
};

export default UserPointsDisplay;
