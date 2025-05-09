import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CallInfo } from '@/lib/websocket';
import VideoCall from '@/components/chat/video-call';
import IncomingCallDialog from '@/components/chat/incoming-call-dialog';
import { User } from '@shared/schema';

interface VideoCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCall: CallInfo | null;
  user: User | null;
  contactName: string;
  onAcceptCall: () => void;
  onRejectCall: () => void;
  onEndCall: () => void;
}

const VideoCallDialog: React.FC<VideoCallDialogProps> = ({
  open,
  onOpenChange,
  activeCall,
  user,
  contactName,
  onAcceptCall,
  onRejectCall,
  onEndCall
}) => {
  // Handle call ended - cleanup and close dialog
  const handleCallEnded = () => {
    onEndCall();
    onOpenChange(false);
  };

  if (!activeCall) return null;

  // Check if this is an incoming call and not yet accepted/rejected
  const isIncomingCall = activeCall.status === 'ringing' && activeCall.receiverId === user?.id;
  
  // When it's an incoming call, show the incoming call dialog
  if (isIncomingCall) {
    return (
      <IncomingCallDialog
        open={open}
        caller={{
          id: activeCall.callerId,
          firstName: contactName.split(' ')[0],
          lastName: contactName.split(' ').slice(1).join(' ')
        }}
        callType={activeCall.callType}
        onAccept={onAcceptCall}
        onReject={onRejectCall}
      />
    );
  }

  // Otherwise show the active call interface
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // When closing, make sure to end the call
      if (!newOpen) {
        handleCallEnded();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {activeCall.status === 'ringing' && activeCall.callerId === user?.id
              ? `Calling ${contactName}...`
              : activeCall.status === 'accepted'
              ? `Call with ${contactName}`
              : `Call ${activeCall.status}`
            }
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Show call interface when call is accepted */}
          {activeCall.status === 'accepted' && (
            <VideoCall
              receiverId={activeCall.callerId === user?.id ? activeCall.receiverId : activeCall.callerId}
              callType={activeCall.callType}
              isInitiator={activeCall.callerId === user?.id}
              onEndCall={handleCallEnded}
            />
          )}

          {/* Show "ringing" state when waiting for acceptance */}
          {activeCall.status === 'ringing' && activeCall.callerId === user?.id && (
            <div className="flex items-center justify-center h-full bg-slate-100 rounded-lg">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-pulse w-32 h-32 bg-slate-300 rounded-full flex items-center justify-center">
                  <span className="text-4xl text-slate-600">
                    {contactName.charAt(0)}
                  </span>
                </div>
                <p className="text-lg">Calling...</p>
                <div className="flex space-x-2">
                  <span className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  <span className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></span>
                </div>
                <button
                  className="mt-8 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                  onClick={handleCallEnded}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VideoCallDialog;