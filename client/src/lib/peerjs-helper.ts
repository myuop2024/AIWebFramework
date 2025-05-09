import { Socket } from 'socket.io-client';
import Peer, { MediaConnection } from 'peerjs';
import { v4 as uuidv4 } from 'uuid';

// Maximum number of retry attempts for operations
const MAX_RETRIES = 3;
// Base timeout between retries (will be multiplied by retry count)
const RETRY_TIMEOUT_BASE = 1000;

/**
 * Helper class to manage PeerJS connections for audio/video calls
 * with enhanced error handling and connection recovery
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
  private errorCallback: ((message: string) => void) | null = null;
  private retryCount: number = 0;
  private peerCreationInProgress: boolean = false;
  private connectionAttemptTimeout: NodeJS.Timeout | null = null;
  
  /**
   * Initialize the PeerJS helper
   * @param socket Socket.io socket for signaling
   */
  constructor(socket: Socket) {
    this.socket = socket;
    this.peerId = `peer-${uuidv4()}`;
    this.connectionId = uuidv4();
    this.debug('Created PeerJS helper with ID:', this.peerId);
    
    // Listen for socket disconnection
    this.socket.on('disconnect', () => {
      this.debug('Socket disconnected, may affect signaling');
    });
    
    // Listen for socket reconnection
    this.socket.on('reconnect', () => {
      this.debug('Socket reconnected, resuming signaling capability');
    });
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
   * Set error callback for external error handling
   */
  onError(callback: (message: string) => void): void {
    this.errorCallback = callback;
  }
  
  /**
   * Initialize PeerJS for a call with enhanced retry logic
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
    this.retryCount = 0;
    this.remoteId = remoteUserId;
    
    try {
      // Attempt to get media stream first before initializing peer connection
      const stream = await this.getLocalMediaStream(callType);
      this.localStream = stream;
      
      // Now initialize the peer connection with retry logic
      await this.initializePeerConnection();
      
      // Setup call handlers
      await this.setupPeerCallHandlers();
      
      // If initiator, initiate the call after a short delay
      if (isInitiator) {
        // Clear any existing timeout
        if (this.connectionAttemptTimeout) {
          clearTimeout(this.connectionAttemptTimeout);
        }
        
        this.connectionAttemptTimeout = setTimeout(() => {
          this.initiateCall();
        }, 1000);
      }
      
      return stream;
    } catch (err) {
      console.error('Failed to initialize call:', err);
      this.notifyError(`Could not establish call: ${err.message || err}`);
      throw err;
    }
  }
  
  /**
   * Get local media stream with fallback options
   */
  private async getLocalMediaStream(callType: 'audio' | 'video'): Promise<MediaStream> {
    // Primary high-quality constraints
    const highQualityConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: callType === 'video' ? {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        facingMode: 'user'
      } : false
    };
    
    // Medium quality fallback
    const mediumQualityConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true
      },
      video: callType === 'video' ? {
        width: { ideal: 320, max: 640 },
        height: { ideal: 240, max: 480 }
      } : false
    };
    
    // Minimum quality fallback
    const minimumConstraints = {
      audio: true,
      video: callType === 'video'
    };
    
    // Try each set of constraints in order
    try {
      this.debug('Attempting to get media with high quality constraints');
      return await navigator.mediaDevices.getUserMedia(highQualityConstraints);
    } catch (error) {
      const highQualityError = error as Error;
      this.debug('High quality media failed, trying medium quality:', highQualityError);
      
      try {
        return await navigator.mediaDevices.getUserMedia(mediumQualityConstraints);
      } catch (error) {
        const mediumQualityError = error as Error;
        this.debug('Medium quality media failed, trying minimum quality:', mediumQualityError);
        
        try {
          return await navigator.mediaDevices.getUserMedia(minimumConstraints);
        } catch (error) {
          const minimumError = error as Error;
          console.error('All media quality attempts failed:', minimumError);
          
          // If video fails but this is a video call, try audio-only as last resort
          if (callType === 'video') {
            this.debug('Video failed, trying audio-only as last resort');
            try {
              return await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (error) {
              const audioOnlyError = error as Error;
              throw new Error(`Could not access microphone or camera: ${audioOnlyError.message || 'Access denied'}`);
            }
          } else {
            throw new Error(`Could not access microphone: ${minimumError.message || 'Access denied'}`);
          }
        }
      }
    }
  }
  
  /**
   * Initialize PeerJS connection with retry logic
   */
  private async initializePeerConnection(): Promise<void> {
    // Prevent multiple simultaneous initialization attempts
    if (this.peerCreationInProgress) {
      this.debug('Peer creation already in progress, waiting...');
      return;
    }
    
    this.peerCreationInProgress = true;
    
    try {
      // Create PeerJS instance with enhanced configuration
      this.debug('Creating PeerJS instance, attempt #', this.retryCount + 1);
      
      this.peer = new Peer(this.peerId, {
        debug: this.debugMode ? 3 : 0,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ],
          iceTransportPolicy: 'all',
          sdpSemantics: 'unified-plan'
        },
        // Set optimized connection settings
        host: window.location.hostname,
        path: '/peerjs',
        secure: window.location.protocol === 'https:',
        pingInterval: 3000, // More frequent pings
        // Custom options - removing invalid retryTimes
      });

      // Listen for errors with retry logic
      this.peer.on('error', (err: Error & { type?: string }) => {
        console.error('PeerJS error:', err);
        
        const errorType = err.type || 'unknown';
        
        if (errorType === 'network' || errorType === 'server-error' || errorType === 'socket-error') {
          // These errors might be temporary, attempt retry
          if (this.retryCount < MAX_RETRIES) {
            this.retryCount++;
            const retryDelay = RETRY_TIMEOUT_BASE * this.retryCount;
            
            this.debug(`Network-related PeerJS error, retrying in ${retryDelay}ms:`, err);
            
            // Destroy existing peer
            if (this.peer) {
              try {
                this.peer.destroy();
              } catch (destroyErr) {
                this.debug('Error destroying peer before retry:', destroyErr);
              }
              this.peer = null;
            }
            
            // Retry after increasing delay
            setTimeout(() => {
              this.initializePeerConnection().catch((retryErr: Error) => {
                console.error('Retry failed:', retryErr);
                this.notifyError(`Connection retry failed: ${retryErr.message || String(retryErr)}`);
              });
            }, retryDelay);
          } else {
            // Max retries reached
            this.notifyError(`Failed to establish connection after ${MAX_RETRIES} attempts: ${errorType}`);
          }
        } else {
          // For other errors, just notify without retrying
          this.notifyError(`PeerJS error: ${errorType} - ${err.message || String(err)}`);
        }
      });
      
      // Create a Promise to await peer connection
      await new Promise<void>((resolve, reject) => {
        if (!this.peer) {
          return reject(new Error('Peer object not created'));
        }
        
        // Wait for open event
        this.peer.on('open', () => {
          this.debug('PeerJS connection successfully established');
          this.retryCount = 0; // Reset retry count on success
          resolve();
        });
        
        // Set a timeout for peer connection
        const timeout = setTimeout(() => {
          reject(new Error('Timed out waiting for PeerJS connection'));
        }, 10000); // 10 second timeout
        
        // Clear timeout if peer connects
        this.peer.once('open', () => {
          clearTimeout(timeout);
        });
      });
      
    } catch (error) {
      // Handle initialization failure with retry logic
      const err = error as Error;
      if (this.retryCount < MAX_RETRIES) {
        this.retryCount++;
        const retryDelay = RETRY_TIMEOUT_BASE * this.retryCount;
        
        this.debug(`PeerJS initialization failed, retrying in ${retryDelay}ms:`, err);
        
        // Schedule retry
        await new Promise<void>((resolve) => {
          setTimeout(() => {
            this.peerCreationInProgress = false;
            this.initializePeerConnection()
              .then(resolve)
              .catch((error) => {
                const retryErr = error as Error;
                console.error('Initialization retry failed:', retryErr);
                resolve(); // Continue even if this retry fails
              });
          }, retryDelay);
        });
      } else {
        this.peerCreationInProgress = false;
        throw new Error(`Failed to initialize PeerJS after ${MAX_RETRIES} attempts: ${err.message || String(err)}`);
      }
    } finally {
      this.peerCreationInProgress = false;
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
   * Handle incoming signals from the signaling server with enhanced error handling
   */
  handleSignal(data: any): void {
    try {
      this.debug('Received signal:', data);
      
      // Basic validation
      if (!data || !data.type) {
        this.debug('Received invalid signal data');
        return;
      }
      
      // Handle different signal types
      switch (data.type) {
        case 'peer-id':
          // If this is for our connection, store the remote peer ID
          if (data.connectionId === this.connectionId) {
            if (!data.peerId) {
              this.debug('Received peer-id signal without peerId');
              return;
            }
            
            this.debug('Received remote peer ID:', data.peerId);
            this.makeCall(data.peerId);
          }
          break;
          
        case 'request-peer-id':
          // Remote peer wants our PeerJS ID
          if (this.peer && this.peer.id) {
            this.sendSignal({
              type: 'peer-id',
              peerId: this.peer.id,
              connectionId: data.connectionId
            });
          } else {
            this.debug('Cannot respond to peer-id request - peer not ready');
            
            // If peer not initialized, try to initialize it
            if (!this.peer && !this.peerCreationInProgress) {
              this.debug('Attempting to initialize peer connection in response to request');
              this.initializePeerConnection().then(() => {
                // Now that peer is initialized, respond with the ID
                if (this.peer && this.peer.id) {
                  this.sendSignal({
                    type: 'peer-id',
                    peerId: this.peer.id,
                    connectionId: data.connectionId
                  });
                }
              }).catch((error: unknown) => {
                const err = error as Error;
                this.debug('Failed to initialize peer for request-peer-id response:', err);
              });
            }
          }
          break;
          
        case 'call-cancelled':
          // Remote peer cancelled the call attempt
          this.debug('Remote peer cancelled call');
          this.endCall();
          break;
          
        case 'connection-test':
          // Response to a connection test request
          this.sendSignal({
            type: 'connection-test-response',
            connectionId: data.connectionId,
            timestamp: Date.now()
          });
          break;
          
        case 'connection-test-response':
          // Calculate round-trip time for connection test
          if (data.timestamp) {
            const rtt = Date.now() - data.timestamp;
            this.debug(`Connection test RTT: ${rtt}ms`);
          }
          break;
          
        default:
          this.debug('Unknown signal type:', data.type);
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error handling signal:', err);
      this.notifyError(`Signal handling error: ${err.message || String(err)}`);
    }
  }
  
  /**
   * End the call and clean up resources with enhanced cleanup
   */
  endCall(): void {
    this.debug('Ending call');
    
    // Clear any pending timeouts
    if (this.connectionAttemptTimeout) {
      clearTimeout(this.connectionAttemptTimeout);
      this.connectionAttemptTimeout = null;
    }
    
    // Close the media connection
    if (this.mediaConnection) {
      try {
        this.mediaConnection.close();
      } catch (err) {
        this.debug('Error closing media connection:', err);
      }
      this.mediaConnection = null;
    }
    
    // Stop local stream
    if (this.localStream) {
      try {
        this.localStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (trackErr) {
            this.debug('Error stopping media track:', trackErr);
          }
        });
      } catch (streamErr) {
        this.debug('Error stopping local stream:', streamErr);
      }
      this.localStream = null;
    }
    
    // Close the PeerJS connection
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (peerErr) {
        this.debug('Error destroying peer connection:', peerErr);
      }
      this.peer = null;
    }
    
    // Reset state and callbacks
    this.retryCount = 0;
    this.peerCreationInProgress = false;
    this.remoteStreamCallback = null;
  }
  
  /**
   * Notify of errors with callback support
   */
  private notifyError(message: string): void {
    console.error('PeerJS Error:', message);
    
    // Call the error callback if provided
    if (this.errorCallback) {
      this.errorCallback(message);
    }
    
    // Emit error to the socket
    if (this.socket) {
      try {
        this.socket.emit('error', {
          type: 'peerjs',
          message,
          timestamp: new Date().toISOString(),
          peerId: this.peer?.id
        });
      } catch (err) {
        console.error('Failed to emit error to socket:', err);
      }
    }
  }
  
  /**
   * Test the connection to the remote peer
   * Can be called periodically to check connectivity
   */
  testConnection(): void {
    if (!this.socket || !this.remoteId) {
      return;
    }
    
    this.debug('Testing connection to remote peer');
    this.sendSignal({
      type: 'connection-test',
      timestamp: Date.now()
    });
  }
}