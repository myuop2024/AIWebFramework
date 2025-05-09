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
  private socket: WebSocket;
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
  private messageHandler: (event: MessageEvent) => void;
  
  /**
   * Initialize the PeerJS helper
   * @param socket WebSocket for signaling
   */
  constructor(socket: WebSocket) {
    this.socket = socket;
    this.peerId = `peer-${uuidv4()}`;
    this.connectionId = uuidv4();
    this.debug('Created PeerJS helper with ID:', this.peerId);
    
    // Set up WebSocket message handler for PeerJS signaling
    this.messageHandler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'peerjs-signal') {
          this.handleSignal(data);
        }
      } catch (err) {
        console.error('Error handling WebSocket message for PeerJS:', err);
      }
    };
    
    // Add event listener for messages
    this.socket.addEventListener('message', this.messageHandler);
    
    // Monitor socket status
    this.socket.addEventListener('close', () => {
      this.debug('WebSocket closed, may affect signaling');
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
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Failed to initialize call:', err);
      this.notifyError(`Could not establish call: ${err.message || String(err)}`);
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
            // Google STUN servers
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            // Additional public STUN servers for redundancy
            { urls: 'stun:global.stun.twilio.com:3478' },
            { urls: 'stun:stun.stunprotocol.org:3478' },
            { urls: 'stun:stun.voip.blackberry.com:3478' },
            { urls: 'stun:stun.nextcloud.com:443' },
            { urls: 'stun:openrelay.metered.ca:80' }
          ],
          iceTransportPolicy: 'all',
          sdpSemantics: 'unified-plan',
          iceCandidatePoolSize: 10, // Increase candidate pool for better connectivity
          bundlePolicy: 'max-bundle' // Improve connection reliability
        },
        // Set optimized connection settings
        host: window.location.hostname,
        path: '/peerjs',
        secure: window.location.protocol === 'https:',
        pingInterval: 3000, // More frequent pings
        // Custom options
        token: this.connectionId, // Use connectionId for the token to help with debugging
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
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot send signal - no socket connection or socket not open');
      return;
    }
    
    this.debug('Sending signal:', data);
    
    // Send the signal through the WebSocket
    this.socket.send(JSON.stringify({
      type: 'peerjs-signal',
      ...data,
      receiverId: this.remoteId
    }));
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
  /**
   * End the call and clean up resources with comprehensive resource management
   */
  endCall(): void {
    this.debug('Ending call and cleaning up resources');
    
    try {
      // Store current state before cleanup for better debugging
      const currentState = {
        hasPeer: Boolean(this.peer),
        hasMediaConnection: Boolean(this.mediaConnection),
        hasLocalStream: Boolean(this.localStream),
        localStreamTracks: this.localStream ? this.localStream.getTracks().length : 0,
        peerConnections: this.peer ? Object.keys(this.peer.connections).length : 0,
        retryCount: this.retryCount,
        hasTimeout: Boolean(this.connectionAttemptTimeout)
      };
      
      this.debug('Current state before cleanup:', currentState);
      
      // Clear any pending timeouts first
      if (this.connectionAttemptTimeout) {
        clearTimeout(this.connectionAttemptTimeout);
        this.connectionAttemptTimeout = null;
      }
      
      // Handle the media connection cleanup with enhanced error handling
      if (this.mediaConnection) {
        try {
          // Remove all listeners before closing to prevent stray events
          this.mediaConnection.removeAllListeners('stream');
          this.mediaConnection.removeAllListeners('close');
          this.mediaConnection.removeAllListeners('error');
          
          // Close the connection
          this.mediaConnection.close();
          this.debug('Media connection closed successfully');
        } catch (mediaErr) {
          console.error('Error closing media connection:', mediaErr);
        } finally {
          this.mediaConnection = null;
        }
      }
      
      // Clean up local stream tracks individually with error handling
      if (this.localStream) {
        try {
          const tracks = this.localStream.getTracks();
          this.debug(`Stopping ${tracks.length} tracks from local stream`);
          
          tracks.forEach((track, index) => {
            try {
              // Check if track is already stopped
              if (track.readyState !== 'ended') {
                track.stop();
                this.debug(`Stopped track ${index} (${track.kind})`);
              } else {
                this.debug(`Track ${index} (${track.kind}) already ended`);
              }
            } catch (trackErr) {
              console.error(`Error stopping track ${index}:`, trackErr);
            }
          });
          
          // Ensure all tracks are properly released
          try {
            tracks.forEach(track => {
              try {
                // This method exists in some browsers to properly detach tracks
                if (typeof this.localStream?.removeTrack === 'function') {
                  this.localStream?.removeTrack(track);
                }
              } catch (removeErr) {
                // This might fail in some browsers, but we still try
                this.debug(`Could not remove track from stream:`, removeErr);
              }
            });
          } catch (tracksErr) {
            this.debug('Error iterating through tracks for removal:', tracksErr);
          }
          
        } catch (streamErr) {
          console.error('Error cleaning up local stream:', streamErr);
        } finally {
          this.localStream = null;
        }
      }
      
      // Clean up the PeerJS connection with enhanced error handling
      if (this.peer) {
        try {
          // Remove all listeners before destroying
          this.peer.removeAllListeners('open');
          this.peer.removeAllListeners('call');
          this.peer.removeAllListeners('error');
          this.peer.removeAllListeners('connection');
          this.peer.removeAllListeners('disconnected');
          
          // Destroy the peer connection
          this.peer.destroy();
          this.debug('Peer connection destroyed successfully');
        } catch (peerErr) {
          console.error('Error destroying peer connection:', peerErr);
        } finally {
          this.peer = null;
        }
      }
      
      // Reset all state variables and callbacks
      this.retryCount = 0;
      this.peerCreationInProgress = false;
      this.remoteStreamCallback = null;
      
      // Release the remote ID reference
      this.remoteId = null;
      
      // Generate a new connection ID for any future connections to avoid stale references
      this.connectionId = uuidv4();
      
      this.debug('Call resources cleaned up successfully');
      
      // Force garbage collection if the browser supports it (rare, but worth trying)
      // Note: window.gc is non-standard and primarily available in debug builds of browsers
      // TypeScript doesn't know about it so we have to use the any type
      const win = window as any;
      if (typeof win.gc === 'function') {
        try {
          win.gc();
          this.debug('Manual garbage collection triggered');
        } catch (gcErr) {
          this.debug('Manual garbage collection failed:', gcErr);
        }
      }
    } catch (err) {
      console.error('Unexpected error during call cleanup:', err);
    }
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
    
    // Send error message through WebSocket if it's open
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({
          type: 'error',
          source: 'peerjs',
          message,
          timestamp: new Date().toISOString(),
          peerId: this.peer?.id
        }));
      } catch (err) {
        console.error('Failed to send error to WebSocket:', err);
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