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
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Free TURN servers from Twilio or similar services can be added here if needed
    // { urls: 'turn:..', username: '..', credential: '..' },
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
        } else if (data.signal?.type === 'ice-restart-request') {
          // Handle the ice restart request from the peer
          console.log('Received ICE restart request from peer');
          this.peerId = data.senderId;
          this.createOffer(true); // Create a new offer with ICE restart
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
      
      // Handle connection state changes with enhanced logging and recovery
      this.peerConnection.onconnectionstatechange = () => {
        const state = this.peerConnection?.connectionState;
        console.log('WebRTC connection state changed:', state);
        
        // Add appropriate handling for different connection states
        if (state === 'disconnected') {
          console.warn('WebRTC connection disconnected - attempting recovery');
          // Let ICE reconnection happen naturally first
          setTimeout(() => {
            if (this.peerConnection?.connectionState === 'disconnected' && isInitiator) {
              console.log('Attempting to restore disconnected connection');
              this.createOffer(); // Try to renegotiate
            }
          }, 5000);
        } else if (state === 'failed') {
          console.error('WebRTC connection failed - attempting to restart ICE');
          this.restartIce(isInitiator);
        }
      };
      
      // Add ICE connection state monitoring
      this.peerConnection.oniceconnectionstatechange = () => {
        const state = this.peerConnection?.iceConnectionState;
        console.log('ICE connection state changed:', state);
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
  private async createOffer(iceRestart = false) {
    try {
      if (!this.peerConnection) return;
      
      const offerOptions: RTCOfferOptions = {};
      
      // Set iceRestart: true if we're trying to recover a failed connection
      if (iceRestart) {
        offerOptions.iceRestart = true;
      }
      
      const offer = await this.peerConnection.createOffer(offerOptions);
      await this.peerConnection.setLocalDescription(offer);
      
      this.sendSignal({
        type: offer.type,
        sdp: offer.sdp
      });
    } catch (err) {
      console.error('Error creating offer:', err);
    }
  }
  
  // Restart ICE negotiation when connection fails
  private async restartIce(isInitiator: boolean) {
    console.log('Attempting to restart ICE negotiation');
    
    if (isInitiator) {
      await this.createOffer(true); // Create offer with iceRestart flag
    } else {
      // For non-initiators, we can't restart ICE directly, but can signal to initiator
      this.sendSignal({
        type: 'ice-restart-request'
      });
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