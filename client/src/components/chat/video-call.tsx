import React, { useEffect, useRef, useState } from 'react';
import { Phone, Video, Mic, MicOff, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCommunication } from '@/lib/websocket-peerjs';
import { useToast } from '@/hooks/use-toast';

interface VideoCallProps {
  receiverId: number;
  callType: 'audio' | 'video';
  isInitiator: boolean;
  onEndCall: () => void;
}

const VideoCall: React.FC<VideoCallProps> = ({
  receiverId,
  callType,
  isInitiator,
  onEndCall
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const { toast } = useToast();
  
  // Get user ID from globally stored auth data
  const userId = 2; // This should be replaced with actual logged in user ID
  
  // Initialize useCommunication hook
  const {
    localStream,
    remoteStream,
    endCall,
    error
  } = useCommunication({
    userId,
    onMessage: (msg) => console.debug('Message during call:', msg),
    onCallState: (state) => {
      if (state.status === 'ended') {
        handleEndCall();
      }
    }
  });
  
  // Set up media stream refs
  useEffect(() => {
    if (localStream && localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
    
    if (remoteStream && remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);
  
  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: 'Call Error',
        description: error,
        variant: 'destructive'
      });
    }
  }, [error, toast]);
  
  // Handle toggling microphone
  const toggleMicrophone = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };
  
  // Handle toggling video
  const toggleVideo = () => {
    if (localStream && callType === 'video') {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };
  
  // Handle ending the call
  const handleEndCall = () => {
    endCall();
    onEndCall();
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Main video display area */}
      <div className="relative flex-1 bg-slate-900 rounded-lg overflow-hidden">
        {/* Remote video (full size) */}
        <video
          ref={remoteVideoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
        />
        
        {/* Local video (picture-in-picture) */}
        {callType === 'video' && (
          <div className="absolute bottom-4 right-4 w-1/4 max-w-[160px] aspect-video rounded-lg overflow-hidden shadow-lg border-2 border-white/20">
            <video
              ref={localVideoRef}
              className="w-full h-full object-cover transform scale-x-[-1]"
              autoPlay
              playsInline
              muted  // Always mute local video to prevent feedback
            />
          </div>
        )}
        
        {/* Call controls */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
          {/* Microphone toggle */}
          <Button
            variant={isMuted ? "destructive" : "default"}
            className="rounded-full w-12 h-12 p-0"
            onClick={toggleMicrophone}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          
          {/* Video toggle (only in video calls) */}
          {callType === 'video' && (
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              className="rounded-full w-12 h-12 p-0"
              onClick={toggleVideo}
            >
              {isVideoEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </Button>
          )}
          
          {/* End call button */}
          <Button
            variant="destructive"
            className="rounded-full w-12 h-12 p-0"
            onClick={handleEndCall}
          >
            <Phone className="h-5 w-5 transform rotate-135" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;