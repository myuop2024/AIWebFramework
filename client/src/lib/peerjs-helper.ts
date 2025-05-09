import { Socket } from 'socket.io-client';
import Peer, { MediaConnection } from 'peerjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Helper class to manage PeerJS connections for audio/video calls
 */
export class PeerJSConnection {
  private socket: Socket;
  private peer: Peer | null = null;
  private peerId: string;
  private remoteId: number | null = null;
  private mediaConnection: MediaConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  private debugMode: boolean = true;
  private connectionId: string;

  /**
   * Initialize the PeerJS helper
   * @param socket Socket.io socket for signaling
   */
  constructor(socket: Socket) {
    this.socket = socket;
    this.peerId = `peer-${uuidv4()}`;
    this.connectionId = uuidv4();
    this.debug('Created PeerJS helper with ID:', this.peerId);
  }

  /**
   * Log debug messages if debug mode is enabled
   */
  private debug(...args: any[]): void {
    if (this.debugMode) {
      console.debug('[PeerJS Helper]', ...args);
    }
  }

  /**
   * Initialize PeerJS for a call
   * @param remoteUserId ID of the remote user
   * @param callType 'audio' or 'video'
   * @param isInitiator Whether this client is initiating the call
   * @returns The local media stream
   */
  async initializeCall(
    remoteUserId: number,
    callType: 'audio' | 'video',
    isInitiator: boolean
  ): Promise<MediaStream> {
    try {
      this.remoteId = remoteUserId;
      
      // Create PeerJS instance
      this.peer = new Peer(this.peerId, {
        debug: this.debugMode ? 3 : 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
          ]
        }
      });

      // Listen for errors
      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        this.notifyError(`PeerJS error: ${err.type}`);
      });
      
      // Get local media stream
      const mediaConstraints = {
        audio: true,
        video: callType === 'video'
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      this.debug('Local stream obtained:', this.localStream.id);
      
      // Setup call handlers
      await this.setupPeerCallHandlers();
      
      // If initiator, initiate the call after a short delay
      if (isInitiator) {
        setTimeout(() => {
          this.initiateCall();
        }, 1000);
      }
      
      return this.localStream;
    } catch (err) {
      console.error('Failed to initialize call:', err);
      this.notifyError(`Could not access microphone/camera: ${err}`);
      throw err;
    }
  }
  
  /**
   * Set up PeerJS call event handlers
   */
  private async setupPeerCallHandlers(): Promise<void> {
    if (!this.peer) {
      throw new Error('PeerJS not initialized');
    }
    
    // Handle incoming calls
    this.peer.on('call', (call) => {
      this.debug('Received incoming call from:', call.peer);
      
      // Store the media connection
      this.mediaConnection = call;
      
      // Setup media connection handlers
      this.setupMediaConnectionHandlers(call);
      
      // Answer the call with our local stream
      if (this.localStream) {
        call.answer(this.localStream);
        this.debug('Answered call with local stream');
      } else {
        console.error('Cannot answer call - no local stream');
        this.notifyError('Cannot answer call - no local stream');
      }
    });
    
    // When the peer is fully connected
    this.peer.on('open', (id) => {
      this.debug('PeerJS connection established with ID:', id);
      
      // Send our PeerJS ID to the remote user via signaling server
      this.sendSignal({
        type: 'peer-id',
        peerId: id,
        connectionId: this.connectionId
      });
    });
  }
  
  /**
   * Set up handlers for the media connection
   */
  private setupMediaConnectionHandlers(call: MediaConnection): void {
    // Handle remote stream
    call.on('stream', (remoteStream) => {
      this.debug('Received remote stream:', remoteStream.id);
      
      // Pass the remote stream to the callback
      if (this.remoteStreamCallback) {
        this.remoteStreamCallback(remoteStream);
      }
    });
    
    // Handle call closure
    call.on('close', () => {
      this.debug('Call closed');
      this.endCall();
    });
    
    // Handle call errors
    call.on('error', (err) => {
      console.error('Call error:', err);
      this.notifyError(`Call error: ${err}`);
    });
  }
  
  /**
   * Initiate a call to the remote peer
   */
  private initiateCall(): void {
    if (!this.peer || !this.localStream) {
      console.error('Cannot initiate call - peer or local stream not initialized');
      this.notifyError('Cannot initiate call - peer or local stream not initialized');
      return;
    }
    
    try {
      // Call the remote peer (we'll use the user ID for now, will be updated with PeerJS ID)
      this.debug('Initiating call to:', this.remoteId);
      
      // Instead of calling directly, wait for the peer ID via signaling
      this.sendSignal({
        type: 'request-peer-id',
        connectionId: this.connectionId
      });
    } catch (err) {
      console.error('Failed to initiate call:', err);
      this.notifyError(`Failed to initiate call: ${err}`);
    }
  }
  
  /**
   * Make the actual call once we have the remote peer ID
   */
  private makeCall(remotePeerId: string): void {
    if (!this.peer || !this.localStream) {
      console.error('Cannot make call - peer or local stream not initialized');
      this.notifyError('Cannot make call - no local stream');
      return;
    }
    
    try {
      this.debug('Making call to peer ID:', remotePeerId);
      
      // Call the remote peer
      const call = this.peer.call(remotePeerId, this.localStream);
      
      // Store the media connection
      this.mediaConnection = call;
      
      // Setup media connection handlers
      this.setupMediaConnectionHandlers(call);
    } catch (err) {
      console.error('Failed to make call:', err);
      this.notifyError(`Failed to make call: ${err}`);
    }
  }
  
  /**
   * Set callback for when remote stream is received
   */
  onRemoteStream(callback: (stream: MediaStream) => void): void {
    this.remoteStreamCallback = callback;
  }
  
  /**
   * Send a signal through the signaling server
   */
  private sendSignal(data: any): void {
    if (!this.socket) {
      console.error('Cannot send signal - no socket connection');
      return;
    }
    
    this.debug('Sending signal:', data);
    
    // Send the signal through the signaling server
    this.socket.emit('peerjs-signal', {
      ...data,
      receiverId: this.remoteId
    });
  }
  
  /**
   * Handle incoming signals from the signaling server
   */
  handleSignal(data: any): void {
    this.debug('Received signal:', data);
    
    // Handle different signal types
    switch (data.type) {
      case 'peer-id':
        // If this is for our connection, store the remote peer ID
        if (data.connectionId === this.connectionId) {
          this.debug('Received remote peer ID:', data.peerId);
          this.makeCall(data.peerId);
        }
        break;
        
      case 'request-peer-id':
        // Remote peer wants our PeerJS ID
        if (this.peer) {
          this.sendSignal({
            type: 'peer-id',
            peerId: this.peer.id,
            connectionId: data.connectionId
          });
        }
        break;
        
      default:
        this.debug('Unknown signal type:', data.type);
    }
  }
  
  /**
   * End the call and clean up resources
   */
  endCall(): void {
    this.debug('Ending call');
    
    // Close the media connection
    if (this.mediaConnection) {
      this.mediaConnection.close();
      this.mediaConnection = null;
    }
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Close the PeerJS connection
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    // Reset callbacks
    this.remoteStreamCallback = null;
  }
  
  /**
   * Notify of errors
   */
  private notifyError(message: string): void {
    console.error('PeerJS Error:', message);
    
    // Emit error to the socket
    if (this.socket) {
      this.socket.emit('error', {
        type: 'peerjs',
        message
      });
    }
  }
}