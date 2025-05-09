import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User } from '@shared/schema';
import AudioPlayer from './audio-player';
import { Phone, PhoneOff, Video } from 'lucide-react';

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
  const [playRingtone, setPlayRingtone] = useState(false);

  // Play ringtone when dialog opens
  useEffect(() => {
    setPlayRingtone(open);
  }, [open]);

  // Handle the call actions
  const handleAccept = () => {
    setPlayRingtone(false);
    onAccept();
  };

  const handleReject = () => {
    setPlayRingtone(false);
    onReject();
  };

  return (
    <>
      {/* Ringtone player */}
      <AudioPlayer play={playRingtone} loop={true} />

      <Dialog open={open} onOpenChange={() => handleReject()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">
              {callType === 'video' ? 'Incoming Video Call' : 'Incoming Call'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-3xl font-bold text-primary">
                {caller ? 
                  `${caller.firstName?.charAt(0) || ''}${caller.lastName?.charAt(0) || ''}` : 
                  'U'}
              </span>
            </div>
            <p className="text-xl font-medium">
              {caller ? 
                `${caller.firstName || ''} ${caller.lastName || ''}` :
                'Unknown Caller'}
            </p>
            <p className="text-sm text-muted-foreground">
              {callType === 'video' ? 'Video call' : 'Voice call'}
            </p>
          </div>

          <DialogFooter className="flex sm:justify-center gap-2">
            <Button
              variant="destructive"
              onClick={handleReject}
              className="rounded-full w-14 h-14 p-0"
            >
              <PhoneOff className="h-6 w-6" />
              <span className="sr-only">Decline</span>
            </Button>
            <Button
              variant="default"
              onClick={handleAccept}
              className="rounded-full w-14 h-14 p-0 bg-green-600 hover:bg-green-700"
            >
              {callType === 'video' ? (
                <Video className="h-6 w-6" />
              ) : (
                <Phone className="h-6 w-6" />
              )}
              <span className="sr-only">Accept</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default IncomingCallDialog;