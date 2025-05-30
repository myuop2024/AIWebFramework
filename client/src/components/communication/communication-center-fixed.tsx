import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow } from 'date-fns';
import {
  MessageSquare, Phone, Video, Send, Paperclip, Image, Mic,
  User, UserPlus, Users, X, Volume2, VolumeX, Camera, CameraOff, Search,
  Download, Clock, ArrowLeft
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CommunicationCenterProps {
  userId: number;
  hideHeader?: boolean;
}

export function CommunicationCenterFixed({ userId, hideHeader = false }: CommunicationCenterProps) {
  const [activeTab, setActiveTab] = useState<string>("chats");
  const [messageInput, setMessageInput] = useState('');

  return (
    <Card className="h-full border-none shadow-none">
      <CardContent className="p-0 h-full">
        <div className="h-full flex flex-col">
          {!hideHeader && (
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 rounded-none border-b bg-transparent">
                  <TabsTrigger value="chats" className="data-[state=active]:bg-background">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chats
                  </TabsTrigger>
                  <TabsTrigger value="calls" className="data-[state=active]:bg-background">
                    <Phone className="h-4 w-4 mr-2" />
                    Calls
                  </TabsTrigger>
                  <TabsTrigger value="contacts" className="data-[state=active]:bg-background">
                    <Users className="h-4 w-4 mr-2" />
                    Contacts
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
          
          <div className="flex-1 p-4">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2" />
              <p>Communication Center</p>
              <p className="text-sm">Select a conversation to start messaging</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Export alias for backward compatibility
export const CommunicationCenter = CommunicationCenterFixed;