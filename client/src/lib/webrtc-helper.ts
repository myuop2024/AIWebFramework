/**
 * WebRTC helper functions for browser-compatible peer connections
 */
import { io, Socket } from "socket.io-client";
import { v4 as uuidv4 } from "uuid";

// Interface for call information
export interface CallInfo {
  callId: string;
  callerId: number;
  receiverId: number;
  callType: 'audio' | 'video';
  status: 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';
  startTime?: Date;
  endTime?: Date;
}

// Browser-compatible WebRTC implementation
export class WebRTCConnection {
  private peerConnection: RTCPeerConnection | null = null;
  private socket: Socket | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private onStreamCallback: ((stream: MediaStream) => void) | null = null;
  private peerId: number | null = null;
  private callType: 'audio' | 'video' = 'audio';
  private iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  constructor(socket: Socket) {
    this.socket = socket;
    
    // Listen for signaling messages
    this.socket.on('signal', async (data) => {
      try {
        if (data.signal?.type === 'offer') {
          await this.handleOffer(data.senderId, data.signal);
        } else if (data.signal?.type === 'answer') {
          await this.handleAnswer(data.signal);
        } else if (data.signal?.candidate) {
          this.handleCandidate(data.signal.candidate);
        }
      } catch (err) {
        console.error('WebRTC signaling error:', err);
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
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection({
        iceServers: this.iceServers
      });
      
      // Add local stream tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });
      
      // Create remote stream
      this.remoteStream = new MediaStream();
      
      // Handle remote tracks
      this.peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
          if (this.remoteStream) {
            this.remoteStream.addTrack(track);
          }
        });
        
        if (this.onStreamCallback && this.remoteStream) {
          this.onStreamCallback(this.remoteStream);
        }
      };
      
      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.sendSignal({
            candidate: event.candidate
          });
        }
      };
      
      // Handle connection state changes
      this.peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', this.peerConnection?.connectionState);
      };
      
      // Create and send offer if initiator
      if (isInitiator) {
        await this.createOffer();
      }
      
      return this.localStream;
    } catch (err) {
      console.error('Failed to initialize call:', err);
      throw err;
    }
  }
  
  // Create and send an offer
  private async createOffer() {
    try {
      if (!this.peerConnection) return;
      
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.sendSignal({
        type: offer.type,
        sdp: offer.sdp
      });
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  }
  
  // Handle an incoming offer
  private async handleOffer(senderId: number, offer: RTCSessionDescriptionInit) {
    try {
      this.peerId = senderId;
      
      if (!this.peerConnection) {
        // Create peer connection if not exists
        this.peerConnection = new RTCPeerConnection({
          iceServers: this.iceServers
        });
        
        // Handle remote tracks
        this.peerConnection.ontrack = (event) => {
          if (!this.remoteStream) {
            this.remoteStream = new MediaStream();
          }
          
          event.streams[0].getTracks().forEach(track => {
            if (this.remoteStream) {
              this.remoteStream.addTrack(track);
            }
          });
          
          if (this.onStreamCallback && this.remoteStream) {
            this.onStreamCallback(this.remoteStream);
          }
        };
        
        // Handle ICE candidates
        this.peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            this.sendSignal({
              candidate: event.candidate
            });
          }
        };
      }
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create and send answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.sendSignal({
        type: answer.type,
        sdp: answer.sdp
      });
    } catch (err) {
      console.error('Error handling offer:', err);
    }
  }
  
  // Handle an incoming answer
  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    try {
      if (!this.peerConnection) return;
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Error handling answer:', err);
    }
  }
  
  // Handle an incoming ICE candidate
  private handleCandidate(candidate: RTCIceCandidateInit) {
    try {
      if (!this.peerConnection) return;
      
      this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('Error handling ICE candidate:', err);
    }
  }
  
  // Send signaling data to peer
  private sendSignal(signal: any) {
    if (!this.socket || !this.peerId) return;
    
    this.socket.emit('signal', {
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
    // Stop local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Clear remote stream
    this.remoteStream = null;
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
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