/**
 * PeerJS helper for reliable WebRTC connections
 */
import Peer, { MediaConnection } from 'peerjs';
import { Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

// Interface for call information - keeping consistent with existing interface
export interface CallInfo {
  callId: string;
  callerId: number;
  receiverId: number;
  callType: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  startTime?: Date;
  endTime?: Date;
}

// PeerJS WebRTC implementation
export class PeerJSConnection {
  private peer: Peer | null = null;
  private socket: Socket | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private onStreamCallback: ((stream: MediaStream) => void) | null = null;
  private peerId: number | null = null;
  private callType: 'audio' | 'video' = 'audio';
  private peerConnection: MediaConnection | null = null;
  private myPeerId: string = '';
  private remotePeerId: string = '';
  
  constructor(socket: Socket) {
    this.socket = socket;
    
    // Listen for signaling messages (to exchange PeerJS IDs)
    this.socket.on('peerjs-signal', async (data) => {
      try {
        // If we receive a peer ID, store it for connection
        if (data.signal?.peerId) {
          this.remotePeerId = data.signal.peerId;
          this.peerId = data.senderId;
          
          // If we're receiving a peer ID and we're the initiator, make the call
          if (data.signal.isAnswer && this.peer && this.localStream) {
            this.initiateCall();
          }
        }
      } catch (err) {
        console.error('PeerJS signaling error:', err);
      }
    });
  }

  // Initialize media stream and peer connection
  async initializeCall(remotePeerId: number, callType: 'audio' | 'video', isInitiator: boolean): Promise<MediaStream> {
    this.peerId = remotePeerId;
    this.callType = callType;
    
    try {
      // Get user media based on call type
      const constraints = {
        audio: true,
        video: callType === 'video'
      };
      
      // Request media stream
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Generate a unique ID for this user's peer
      // Get userId safely from socket
      const socketUserId = this.socket ? (this.socket as any).auth?.userId || 'unknown' : 'unknown';
      this.myPeerId = `user-${socketUserId}-${uuidv4()}`;
      
      // Create a new peer connection
      this.peer = new Peer(this.myPeerId, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
          ]
        },
        debug: 2 // Log errors and warnings
      });
      
      // Setup error handling
      this.setupPeerErrorHandling();
      
      // Listen for incoming calls
      this.peer.on('call', (call) => {
        this.peerConnection = call;
        
        // Answer automatically if we have the stream
        if (this.localStream) {
          call.answer(this.localStream);
          
          // Handle stream event
          call.on('stream', (remoteStream) => {
            this.remoteStream = remoteStream;
            
            if (this.onStreamCallback) {
              this.onStreamCallback(remoteStream);
            }
          });
          
          this.setupCallErrorHandling(call);
        }
      });
      
      // If we're the initiator, wait for peer to open then send our ID
      if (isInitiator) {
        this.peer.on('open', (id) => {
          console.log('PeerJS: Connection established with ID:', id);
          
          // Send our peer ID to the recipient via signaling channel
          this.sendSignal({
            peerId: this.myPeerId,
            isInitiator: true
          });
        });
      } else {
        // If we're not the initiator, wait for open and send our ID as an answer
        this.peer.on('open', (id) => {
          console.log('PeerJS: Connection established with ID:', id);
          
          // Send our peer ID to the caller via signaling channel
          this.sendSignal({
            peerId: this.myPeerId,
            isAnswer: true
          });
        });
      }
      
      return this.localStream;
    } catch (err) {
      console.error('Failed to initialize call:', err);
      throw err;
    }
  }
  
  // Setup error handling for peer connection
  private setupPeerErrorHandling() {
    if (!this.peer) return;
    
    this.peer.on('error', (err) => {
      console.error('PeerJS error:', err);
      
      // Attempt to reconnect on certain errors
      if (err.type === 'network' || err.type === 'peer-unavailable') {
        console.log('PeerJS: Network error or peer unavailable, attempting to reconnect...');
        setTimeout(() => {
          if (this.peer) {
            this.peer.reconnect();
          }
        }, 2000);
      }
    });
    
    this.peer.on('disconnected', () => {
      console.log('PeerJS: Disconnected from server, attempting to reconnect...');
      this.peer?.reconnect();
    });
  }
  
  // Setup error handling for media connection
  private setupCallErrorHandling(call: MediaConnection) {
    call.on('error', (err) => {
      console.error('PeerJS call error:', err);
    });
    
    call.on('close', () => {
      console.log('PeerJS: Call closed');
    });
  }
  
  // Initiate a call to the remote peer
  private initiateCall() {
    if (!this.peer || !this.localStream || !this.remotePeerId) {
      console.error('Cannot initiate call: missing peer, stream, or remote ID');
      return;
    }
    
    console.log('PeerJS: Initiating call to', this.remotePeerId);
    
    // Call the remote peer
    const call = this.peer.call(this.remotePeerId, this.localStream);
    this.peerConnection = call;
    
    // Handle remote stream
    call.on('stream', (remoteStream) => {
      this.remoteStream = remoteStream;
      
      if (this.onStreamCallback) {
        this.onStreamCallback(remoteStream);
      }
    });
    
    this.setupCallErrorHandling(call);
  }
  
  // Send signaling data to peer
  private sendSignal(signal: any) {
    if (!this.socket || !this.peerId) return;
    
    this.socket.emit('peerjs-signal', {
      receiverId: this.peerId,
      signal
    });
  }
  
  // Register callback for remote stream
  onRemoteStream(callback: (stream: MediaStream) => void) {
    this.onStreamCallback = callback;
    
    if (this.remoteStream) {
      callback(this.remoteStream);
    }
  }
  
  // End the call and clean up resources
  endCall() {
    // Close the media connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Stop local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Clear remote stream
    this.remoteStream = null;
    
    // Close peer connection
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    // Clear callback
    this.onStreamCallback = null;
  }
  
  // Toggle audio mute
  toggleAudioMute(mute: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !mute;
      });
    }
  }
  
  // Toggle video off
  toggleVideo(off: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = !off;
      });
    }
  }
  
  // Get local stream
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }
  
  // Get remote stream
  getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }
}