import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PhoneCall, Video, PhoneOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from '@shared/schema';

interface IncomingCallDialogProps {
  open: boolean;
  caller: Partial<User> | null;
  callType: 'audio' | 'video';
  onAccept: () => void;
  onReject: () => void;
}

const IncomingCallDialog: React.FC<IncomingCallDialogProps> = ({
  open,
  caller,
  callType,
  onAccept,
  onReject
}) => {
  // Play ring tone when dialog is open
  React.useEffect(() => {
    let audio: HTMLAudioElement | null = null;
    
    if (open) {
      audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      audio.play().catch(err => {
        console.warn('Could not play ringtone:', err);
      });
    }
    
    return () => {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [open]);
  
  const getCallerInitials = () => {
    if (!caller) return '?';
    
    const firstName = caller.firstName || '';
    const lastName = caller.lastName || '';
    
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`;
    } else if (firstName) {
      return firstName.substring(0, 2);
    } else if (caller.username) {
      return caller.username.substring(0, 2).toUpperCase();
    } else {
      return '?';
    }
  };
  
  const callerName = caller
    ? `${caller.firstName || ''} ${caller.lastName || ''}`.trim() || caller.username || 'Unknown'
    : 'Unknown';
    
  return (
    <Dialog open={open} onOpenChange={() => onReject()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center justify-center mb-4">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={caller?.photoUrl || ''} />
            <AvatarFallback className="text-2xl bg-blue-500 text-white">
              {getCallerInitials()}
            </AvatarFallback>
          </Avatar>
          <DialogTitle className="text-xl">
            {callType === 'video' ? 'Video Call' : 'Audio Call'} from {callerName}
          </DialogTitle>
          <DialogDescription className="flex items-center justify-center mt-2">
            {callType === 'video' ? (
              <Video className="mr-2 text-blue-500" />
            ) : (
              <PhoneCall className="mr-2 text-blue-500" />
            )}
            Incoming {callType === 'video' ? 'video' : 'audio'} call...
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex justify-center">
          <div className="animate-pulse flex flex-col items-center">
            <span className="text-sm text-gray-500 mb-2">Secure end-to-end encrypted call</span>
            <div className="h-2 w-24 bg-blue-200 rounded"></div>
          </div>
        </div>
        
        <DialogFooter className="flex flex-row justify-center gap-4 sm:gap-6">
          <Button 
            variant="destructive"
            size="lg"
            className="rounded-full w-14 h-14 p-0 flex items-center justify-center"
            onClick={onReject}
          >
            <PhoneOff size={24} />
          </Button>
          
          <Button 
            variant="default"
            size="lg"
            className="rounded-full w-14 h-14 p-0 flex items-center justify-center bg-green-500 hover:bg-green-600"
            onClick={onAccept}
          >
            {callType === 'video' ? (
              <Video size={24} />
            ) : (
              <PhoneCall size={24} />
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallDialog;