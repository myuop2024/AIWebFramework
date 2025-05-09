const http = require('http');
const WebSocket = require('ws');
const express = require('express');
const path = require('path');
const fs = require('fs');

// Create the Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Serve the test HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'ws-test.html'));
});

// Create WebSocket server with '/ws' path
const wss = new WebSocket.Server({ server, path: '/ws' });

// Connected clients
const connectedClients = [];

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New WebSocket client connected');
  
  let userId = null;
  
  // Handle messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received message:', data);
      
      // Handle authentication
      if (data.type === 'auth') {
        userId = Number(data.userId);
        console.log(`WebSocket client authenticated with userId: ${userId}`);
        
        // Add to connected clients
        connectedClients.push({ userId, socket: ws });
        
        // Send confirmation
        ws.send(JSON.stringify({
          type: 'notification',
          content: 'Connected to WebSocket server',
          timestamp: new Date()
        }));
        
        // Send list of online users (for testing)
        const onlineUsers = connectedClients
          .map(client => client.userId)
          .filter((id, index, self) => self.indexOf(id) === index);
        
        ws.send(JSON.stringify({
          type: 'online:users',
          userIds: onlineUsers
        }));
      }
      // Handle chat messages
      else if (data.type === 'message' && userId !== null) {
        const { receiverId, content } = data;
        
        if (!receiverId || !content) {
          return;
        }
        
        console.log(`Message from ${userId} to ${receiverId}: ${content}`);
        
        // Create message object
        const messageData = {
          type: 'message',
          senderId: userId,
          receiverId,
          content,
          timestamp: new Date()
        };
        
        // Forward to recipient if online
        const recipientClients = connectedClients.filter(client => 
          client.userId === receiverId && client.socket.readyState === WebSocket.OPEN);
        
        recipientClients.forEach(client => {
          client.socket.send(JSON.stringify(messageData));
        });
        
        // Send confirmation to sender
        ws.send(JSON.stringify({
          type: 'message:sent',
          messageId: Date.now(), // Placeholder ID
          timestamp: new Date()
        }));
      }
      // Echo test (for debugging)
      else if (data.type === 'echo') {
        ws.send(JSON.stringify({
          type: 'echo:response',
          originalMessage: data.content,
          timestamp: new Date()
        }));
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });
  
  // Handle disconnections
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    
    if (userId) {
      // Remove from connected clients
      const index = connectedClients.findIndex(client => 
        client.userId === userId && client.socket === ws);
      
      if (index !== -1) {
        connectedClients.splice(index, 1);
      }
      
      // Check if user has other connections
      const hasOtherConnections = connectedClients.some(client => client.userId === userId);
      
      if (!hasOtherConnections) {
        // Broadcast offline status
        connectedClients.forEach(client => {
          if (client.userId !== userId && client.socket.readyState === WebSocket.OPEN) {
            client.socket.send(JSON.stringify({
              type: 'user:status',
              userId,
              status: 'offline'
            }));
          }
        });
      }
    }
  });
  
  // Send a welcome message
  ws.send(JSON.stringify({
    type: 'system',
    content: 'Welcome to the WebSocket server',
    timestamp: new Date()
  }));
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
  console.log(`Test page available at http://localhost:${PORT}/`);
});