import React from 'react';

export interface Badge {
  id: string | number;
  name: string;
  description: string;
  iconUrl?: string;
  earnedAt?: string | Date;
}

interface UserBadgesListProps {
  badges: Badge[];
}

const UserBadgesList: React.FC<UserBadgesListProps> = ({ badges }) => {
  if (!badges || badges.length === 0) {
    return <p className="text-gray-500">No badges earned yet.</p>;
  }

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <h3 className="text-lg font-semibold text-gray-700 mb-3">My Badges</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {badges.map((badge) => (
          <div key={badge.id} className="flex flex-col items-center p-3 border rounded-md hover:shadow-lg transition-shadow">
            {badge.iconUrl ? (
              <img src={badge.iconUrl} alt={badge.name} className="w-16 h-16 mb-2 object-contain" />
            ) : (
              <div className="w-16 h-16 mb-2 bg-gray-200 rounded-full flex items-center justify-center text-2xl">?</div>
            )}
            <p className="font-semibold text-sm text-center">{badge.name}</p>
            {/* <p className="text-xs text-gray-500 text-center">{badge.description}</p> */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserBadgesList;
