import React, { useState } from 'react';
import LeaderboardTable, { LeaderboardEntry } from './LeaderboardTable';
import UserBadgesList, { Badge } from './UserBadgesList';
import UserPointsDisplay from './UserPointsDisplay';
import { Button } from '@/components/ui/button';

const mockTeams = [
  { name: 'Kingston', points: 1200 },
  { name: 'Montego Bay', points: 950 },
  { name: 'Ocho Rios', points: 800 },
];
const mockBadges: Badge[] = [
  { id: 1, name: 'Tech Expert', description: 'Solved 10+ tech issues' },
  { id: 2, name: 'Crowd Manager', description: 'Managed large crowds' },
  { id: 3, name: 'First Responder', description: 'First to report an incident' },
];
const mockTopPerformers: LeaderboardEntry[] = [
  { userId: 1, username: 'alice', firstName: 'Alice', lastName: 'Smith', points: 320 },
  { userId: 2, username: 'bob', firstName: 'Bob', lastName: 'Jones', points: 290 },
  { userId: 3, username: 'carol', firstName: 'Carol', lastName: 'Lee', points: 270 },
];
const mockStories = [
  { id: 1, author: 'Alice', text: 'Helped resolve a power outage at Station 5.' },
  { id: 2, author: 'Bob', text: 'Coordinated a team to manage a large crowd.' },
];

export default function GamificationDashboard() {
  const [stories, setStories] = useState(mockStories);
  const [newStory, setNewStory] = useState('');
  const [nominee, setNominee] = useState('');
  const [nominationReason, setNominationReason] = useState('');
  const [communityProgress, setCommunityProgress] = useState(75); // percent

  const handleSubmitStory = () => {
    if (newStory.trim()) {
      setStories([{ id: Date.now(), author: 'You', text: newStory }, ...stories]);
      setNewStory('');
    }
  };
  const handleNominate = () => {
    if (nominee.trim() && nominationReason.trim()) {
      alert(`Nominated ${nominee} for: ${nominationReason}`);
      setNominee('');
      setNominationReason('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h2 className="text-3xl font-bold mb-4">Gamification & Community</h2>
      {/* Team Challenges */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-xl font-semibold mb-2">Team Challenges: Region vs Region</h3>
        <table className="w-full mb-2">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 py-2">Region</th>
              <th className="text-left px-4 py-2">Points</th>
            </tr>
          </thead>
          <tbody>
            {mockTeams.map((team, idx) => (
              <tr key={team.name} className={idx === 0 ? 'bg-green-50 font-bold' : ''}>
                <td className="px-4 py-2">{team.name}</td>
                <td className="px-4 py-2">{team.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Skill-based Badges */}
      <UserBadgesList badges={mockBadges} />
      {/* Community Challenge */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-xl font-semibold mb-2">Community Challenge</h3>
        <p className="mb-2">Submit 100 incident reports as a community to unlock a new feature!</p>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${communityProgress}%` }}></div>
        </div>
        <p className="text-sm text-gray-500">{communityProgress}% complete</p>
      </div>
      {/* Peer Recognition */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-xl font-semibold mb-2">Peer Recognition</h3>
        <div className="flex gap-2 mb-2">
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="Nominee name"
            value={nominee}
            onChange={e => setNominee(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="Reason"
            value={nominationReason}
            onChange={e => setNominationReason(e.target.value)}
          />
          <Button onClick={handleNominate}>Nominate</Button>
        </div>
      </div>
      {/* Virtual Awards */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-xl font-semibold mb-2">Virtual Awards Ceremony</h3>
        <LeaderboardTable title="Top Performers" entries={mockTopPerformers} />
      </div>
      {/* Observer Stories */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-xl font-semibold mb-2">Observer Stories</h3>
        <div className="flex gap-2 mb-2">
          <input
            className="border rounded px-2 py-1 flex-1"
            placeholder="Share your story..."
            value={newStory}
            onChange={e => setNewStory(e.target.value)}
          />
          <Button onClick={handleSubmitStory}>Submit</Button>
        </div>
        <ul className="space-y-2 mt-2">
          {stories.map(story => (
            <li key={story.id} className="border rounded p-2 bg-gray-50">
              <span className="font-semibold text-blue-700 mr-2">{story.author}:</span>
              {story.text}
            </li>
          ))}
        </ul>
      </div>
      {/* User Points */}
      <UserPointsDisplay points={420} />
    </div>
  );
} 