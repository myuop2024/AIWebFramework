import React, { useState, useEffect, useRef } from 'react';
import { Users, Circle, MessageCircle, Share2, Eye, Edit3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  status: 'online' | 'away' | 'busy';
  lastSeen: Date;
  currentPage?: string;
  isTyping?: boolean;
  cursor?: { x: number; y: number };
}

interface CollaborationEvent {
  id: string;
  type: 'join' | 'leave' | 'edit' | 'comment' | 'cursor_move';
  user: User;
  timestamp: Date;
  data?: any;
}

interface RealTimeCollaborationProps {
  documentId?: string;
  className?: string;
}

export function RealTimeCollaboration({ documentId = 'current-page', className }: RealTimeCollaborationProps) {
  const [activeUsers, setActiveUsers] = useState<User[]>([
    {
      id: '1',
      name: 'John Observer',
      email: 'john@example.com',
      color: '#3B82F6',
      status: 'online',
      lastSeen: new Date(),
      currentPage: 'Dashboard',
      isTyping: false
    },
    {
      id: '2',
      name: 'Sarah Supervisor',
      email: 'sarah@example.com',
      color: '#10B981',
      status: 'online',
      lastSeen: new Date(),
      currentPage: 'Reports',
      isTyping: true
    },
    {
      id: '3',
      name: 'Mike Admin',
      email: 'mike@example.com',
      color: '#F59E0B',
      status: 'away',
      lastSeen: new Date(Date.now() - 5 * 60 * 1000),
      currentPage: 'Analytics'
    }
  ]);

  const [recentActivity, setRecentActivity] = useState<CollaborationEvent[]>([
    {
      id: '1',
      type: 'edit',
      user: activeUsers[0],
      timestamp: new Date(Date.now() - 2 * 60 * 1000),
      data: { action: 'Updated polling station data' }
    },
    {
      id: '2',
      type: 'comment',
      user: activeUsers[1],
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      data: { message: 'Reviewed report submission' }
    }
  ]);

  const [showCursors, setShowCursors] = useState(true);
  const [isCollaborating, setIsCollaborating] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      // Update user activity
      setActiveUsers(prev => prev.map(user => ({
        ...user,
        isTyping: Math.random() > 0.8,
        cursor: showCursors ? {
          x: Math.random() * 100,
          y: Math.random() * 100
        } : undefined
      })));

      // Add random activity
      if (Math.random() > 0.7) {
        const randomUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];
        const activities = [
          { type: 'edit' as const, data: { action: 'Updated form data' } },
          { type: 'comment' as const, data: { message: 'Added feedback' } },
          { type: 'join' as const, data: {} }
        ];
        const activity = activities[Math.floor(Math.random() * activities.length)];

        setRecentActivity(prev => [
          {
            id: Date.now().toString(),
            type: activity.type,
            user: randomUser,
            timestamp: new Date(),
            data: activity.data
          },
          ...prev.slice(0, 9)
        ]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeUsers, showCursors]);

  const getStatusColor = (status: User['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getActivityIcon = (type: CollaborationEvent['type']) => {
    switch (type) {
      case 'edit': return <Edit3 className="h-3 w-3" />;
      case 'comment': return <MessageCircle className="h-3 w-3" />;
      case 'join': return <Users className="h-3 w-3" />;
      case 'leave': return <Users className="h-3 w-3" />;
      default: return <Circle className="h-3 w-3" />;
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div ref={containerRef} className={cn("space-y-4", className)}>
      {/* Live Cursors */}
      {showCursors && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {activeUsers
            .filter(user => user.cursor && user.status === 'online')
            .map(user => (
              <div
                key={user.id}
                className="absolute transition-all duration-200 ease-out pointer-events-none"
                style={{
                  left: `${user.cursor!.x}%`,
                  top: `${user.cursor!.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: user.color }}
                />
                <div 
                  className="mt-1 px-2 py-1 text-xs text-white rounded shadow-lg whitespace-nowrap"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Active Users Panel */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Active Users
              <Badge variant="secondary">{activeUsers.filter(u => u.status === 'online').length} online</Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCursors(!showCursors)}
              >
                <Eye className="h-4 w-4 mr-1" />
                {showCursors ? 'Hide' : 'Show'} Cursors
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-1" />
                Share
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activeUsers.map(user => (
              <TooltipProvider key={user.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback style={{ backgroundColor: user.color + '20', color: user.color }}>
                            {user.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white",
                          getStatusColor(user.status)
                        )} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{user.name}</p>
                          {user.isTyping && (
                            <Badge variant="outline" className="text-xs">
                              typing...
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {user.currentPage} • {formatTimeAgo(user.lastSeen)}
                        </p>
                      </div>
                      
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: user.color }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-muted-foreground">{user.email}</p>
                      <p className="capitalize">{user.status} • {user.currentPage}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map(event => (
              <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div 
                  className="p-1.5 rounded-full mt-0.5"
                  style={{ backgroundColor: event.user.color + '20', color: event.user.color }}
                >
                  {getActivityIcon(event.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{event.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTimeAgo(event.timestamp)}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {event.type === 'edit' && event.data?.action}
                    {event.type === 'comment' && event.data?.message}
                    {event.type === 'join' && 'Joined the session'}
                    {event.type === 'leave' && 'Left the session'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Collaboration Status */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isCollaborating ? "bg-green-500 animate-pulse" : "bg-gray-500"
          )} />
          <span className="text-sm font-medium">
            {isCollaborating ? 'Live collaboration active' : 'Collaboration paused'}
          </span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCollaborating(!isCollaborating)}
        >
          {isCollaborating ? 'Pause' : 'Resume'}
        </Button>
      </div>
    </div>
  );
} 