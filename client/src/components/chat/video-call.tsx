import React, { useRef, useState, useEffect } from 'react';
import { PeerJSConnection } from '@/lib/peerjs-helper';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff 
} from 'lucide-react';
import { useSocket } from '@/hooks/use-socket';

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
  const { socket } = useSocket();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<PeerJSConnection | null>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);

  // Initialize the peer connection
  useEffect(() => {
    if (!socket) {
      toast({
        title: 'Connection Error',
        description: 'Socket connection not available',
        variant: 'destructive'
      });
      onEndCall();
      return;
    }

    const initializeCall = async () => {
      try {
        setIsConnecting(true);

        // Create a new PeerJS connection
        const peerConnection = new PeerJSConnection(socket);
        peerConnectionRef.current = peerConnection;

        // Initialize the call
        const localStream = await peerConnection.initializeCall(
          receiverId,
          callType,
          isInitiator
        );

        // Display local stream
        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
        }

        // Register callback for remote stream
        peerConnection.onRemoteStream((remoteStream) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            setIsConnected(true);
            setIsConnecting(false);
          }
        });

        // Hide video if audio-only call
        if (callType === 'audio') {
          setIsVideoOff(true);
          peerConnection.toggleVideo(true);
        }

      } catch (error) {
        console.error('Failed to initialize call:', error);
        toast({
          title: 'Call Error',
          description: 'Could not establish connection',
          variant: 'destructive'
        });
        setIsConnecting(false);
        onEndCall();
      }
    };

    initializeCall();

    // Clean up on unmount
    return () => {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.endCall();
        peerConnectionRef.current = null;
      }
    };
  }, [socket, receiverId, callType, isInitiator, onEndCall]);

  // Toggle microphone
  const toggleMute = () => {
    if (peerConnectionRef.current) {
      setIsMuted(!isMuted);
      peerConnectionRef.current.toggleAudioMute(!isMuted);
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (peerConnectionRef.current && callType === 'video') {
      setIsVideoOff(!isVideoOff);
      peerConnectionRef.current.toggleVideo(!isVideoOff);
    }
  };

  // End call
  const handleEndCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.endCall();
      peerConnectionRef.current = null;
    }
    onEndCall();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="relative flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
        {/* Local Video */}
        <div className={`relative ${isConnected ? 'md:absolute md:top-4 md:right-4 md:w-1/3 md:h-1/3 z-10' : 'w-full h-full'}`}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full rounded-lg bg-black ${isVideoOff ? 'hidden' : ''}`}
          />
          {isVideoOff && (
            <div className="flex items-center justify-center w-full h-full bg-slate-800 rounded-lg">
              <div className="text-center text-slate-400">
                <VideoOff size={48} className="mx-auto mb-2" />
                <p>Camera off</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-2 left-2 bg-slate-800 text-white px-2 py-1 text-xs rounded">
            You
          </div>
        </div>

        {/* Remote Video */}
        <div className={`relative w-full h-full ${!isConnected ? 'hidden' : ''}`}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full rounded-lg bg-black"
          />
          <div className="absolute bottom-2 left-2 bg-slate-800 text-white px-2 py-1 text-xs rounded">
            Caller
          </div>
        </div>

        {/* Connecting Message */}
        {isConnecting && !isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800/80 rounded-lg">
            <div className="text-center text-white">
              <div className="animate-pulse mb-2">
                Connecting...
              </div>
              <div className="text-sm text-slate-300">
                Establishing secure connection
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4 p-4">
        <Button
          variant="outline"
          size="icon"
          className={`rounded-full ${isMuted ? 'bg-red-500 text-white hover:bg-red-600' : ''}`}
          onClick={toggleMute}
        >
          {isMuted ? <MicOff /> : <Mic />}
        </Button>
        
        {callType === 'video' && (
          <Button
            variant="outline"
            size="icon"
            className={`rounded-full ${isVideoOff ? 'bg-red-500 text-white hover:bg-red-600' : ''}`}
            onClick={toggleVideo}
          >
            {isVideoOff ? <VideoOff /> : <Video />}
          </Button>
        )}
        
        <Button
          variant="destructive"
          size="icon"
          className="rounded-full"
          onClick={handleEndCall}
        >
          <PhoneOff />
        </Button>
      </div>
    </div>
  );
};

export default VideoCall;