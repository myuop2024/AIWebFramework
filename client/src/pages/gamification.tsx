import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Star, Flame, Target, Users, Medal, Crown, Award } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Achievement {
  id: number;
  title: string;
  description: string;
  category: string;
  iconName: string;
  iconColor: string;
  points: number;
  rarity: string;
  requirements: any;
}

interface UserAchievement {
  id: number;
  userId: number;
  achievementId: number;
  earnedAt: string;
}

interface UserGameProfile {
  id: number;
  userId: number;
  totalPoints: number;
  level: number;
  currentLevelPoints: number;
  pointsToNextLevel: number;
  streak: number;
  longestStreak: number;
  lastActiveDate: string;
}

interface LeaderboardEntry {
  id: number;
  userId: number;
  score: number;
  rank: number;
  user?: {
    firstName: string;
    lastName: string;
  };
}

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'common': return 'bg-gray-100 text-gray-800';
    case 'rare': return 'bg-blue-100 text-blue-800';
    case 'epic': return 'bg-purple-100 text-purple-800';
    case 'legendary': return 'bg-yellow-100 text-yellow-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getIconComponent = (iconName: string, color: string = '#6366f1') => {
  const iconProps = { size: 24, color };
  
  switch (iconName) {
    case 'Trophy': return <Trophy {...iconProps} />;
    case 'Star': return <Star {...iconProps} />;
    case 'Flame': return <Flame {...iconProps} />;
    case 'Target': return <Target {...iconProps} />;
    case 'Users': return <Users {...iconProps} />;
    case 'Medal': return <Medal {...iconProps} />;
    case 'Crown': return <Crown {...iconProps} />;
    case 'Award': return <Award {...iconProps} />;
    default: return <Trophy {...iconProps} />;
  }
};

export default function GamificationPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: userProfile } = useQuery({
    queryKey: ['/api/gamification/user', user?.id, 'profile'],
    enabled: !!user?.id,
  });

  const { data: achievements = [] } = useQuery<Achievement[]>({
    queryKey: ['/api/gamification/achievements'],
  });

  const { data: userAchievements = [] } = useQuery<UserAchievement[]>({
    queryKey: ['/api/gamification/user', user?.id, 'achievements'],
    enabled: !!user?.id,
  });

  const { data: leaderboards = [] } = useQuery({
    queryKey: ['/api/gamification/leaderboards'],
  });

  const earnedAchievementIds = new Set(userAchievements.map(ua => ua.achievementId));
  const earnedAchievements = achievements.filter(a => earnedAchievementIds.has(a.id));
  const availableAchievements = achievements.filter(a => !earnedAchievementIds.has(a.id));

  const achievementsByCategory = achievements.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <p className="text-lg text-muted-foreground">Please log in to view your achievements.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Achievement Center</h1>
        <p className="text-muted-foreground">
          Track your progress and earn rewards for your contributions as an election observer.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="leaderboards">Leaderboards</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* User Profile Overview */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Level</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userProfile?.level || 1}</div>
                <Progress 
                  value={userProfile?.currentLevelPoints || 0} 
                  max={100} 
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {userProfile?.pointsToNextLevel || 100} points to next level
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Points</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userProfile?.totalPoints || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Lifetime points earned
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                <Flame className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{userProfile?.streak || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Best: {userProfile?.longestStreak || 0} days
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Achievements</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{earnedAchievements.length}</div>
                <p className="text-xs text-muted-foreground">
                  of {achievements.length} earned
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Achievements</CardTitle>
              <CardDescription>Your latest accomplishments</CardDescription>
            </CardHeader>
            <CardContent>
              {earnedAchievements.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No achievements earned yet. Keep working to unlock your first achievement!</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {earnedAchievements.slice(0, 4).map((achievement) => (
                    <div key={achievement.id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="p-2 rounded-full bg-primary/10">
                        {getIconComponent(achievement.iconName, achievement.iconColor)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{achievement.title}</h4>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getRarityColor(achievement.rarity)}>
                            {achievement.rarity}
                          </Badge>
                          <span className="text-sm text-muted-foreground">+{achievement.points} points</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-6">
          {Object.entries(achievementsByCategory).map(([category, categoryAchievements]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="capitalize">{category} Achievements</CardTitle>
                <CardDescription>
                  Achievements related to {category}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {categoryAchievements.map((achievement) => {
                    const isEarned = earnedAchievementIds.has(achievement.id);
                    return (
                      <div 
                        key={achievement.id} 
                        className={`p-4 border rounded-lg ${isEarned ? 'bg-primary/5 border-primary/20' : 'opacity-75'}`}
                      >
                        <div className="flex items-center space-x-3 mb-3">
                          <div className={`p-2 rounded-full ${isEarned ? 'bg-primary/10' : 'bg-muted'}`}>
                            {getIconComponent(achievement.iconName, isEarned ? achievement.iconColor : '#9ca3af')}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold">{achievement.title}</h4>
                            {isEarned && <Badge variant="secondary" className="text-xs">Earned</Badge>}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{achievement.description}</p>
                        <div className="flex items-center justify-between">
                          <Badge className={getRarityColor(achievement.rarity)}>
                            {achievement.rarity}
                          </Badge>
                          <span className="text-sm font-medium">+{achievement.points} points</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="leaderboards" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Global Leaderboard</CardTitle>
              <CardDescription>Top performers across all categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Leaderboards will be available once more users join the platform.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Progress Tracking</CardTitle>
              <CardDescription>See your progress towards unlocking new achievements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {availableAchievements.slice(0, 5).map((achievement) => (
                  <div key={achievement.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-muted">
                          {getIconComponent(achievement.iconName, '#9ca3af')}
                        </div>
                        <div>
                          <h4 className="font-semibold">{achievement.title}</h4>
                          <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getRarityColor(achievement.rarity)}>
                          {achievement.rarity}
                        </Badge>
                        <p className="text-sm text-muted-foreground">+{achievement.points} points</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>0 / {achievement.requirements?.target || 1}</span>
                      </div>
                      <Progress value={0} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}