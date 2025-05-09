import { useState, useEffect } from "react";
import { useCommunication } from "@/lib/websocket";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function WebSocketTest() {
  const { user } = useAuth();
  const [testMessage, setTestMessage] = useState<string>("");
  const [receivedMessages, setReceivedMessages] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Initialize the WebSocket connection
  const {
    isConnected,
    error,
    connect,
    disconnect,
    sendMessage,
    onlineUsers
  } = useCommunication({
    userId: user?.id || null,
    onMessage: (message) => {
      setReceivedMessages(prev => [...prev, `Message: ${JSON.stringify(message)}`]);
      addLog(`Received message: ${JSON.stringify(message)}`);
    },
    onStatusChange: (status) => {
      addLog(`Status change: User ${status.userId} is ${status.status}`);
    },
    autoReconnect: false // For testing purposes, we'll control reconnection manually
  });
  
  // Add a log entry with timestamp
  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().substr(11, 8);
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };
  
  // Connect to WebSocket server
  const handleConnect = () => {
    addLog("Connecting to WebSocket server...");
    connect();
  };
  
  // Disconnect from WebSocket server
  const handleDisconnect = () => {
    addLog("Disconnecting from WebSocket server...");
    disconnect();
  };
  
  // Send a test message
  const handleSendMessage = () => {
    if (!isConnected || !testMessage.trim()) return;
    
    // Since we need a recipient, we'll send to user ID 1 (usually an admin or support)
    // In a real app, you'd select from available users
    const recipientId = 1;
    addLog(`Sending message to user ${recipientId}: ${testMessage}`);
    
    const sent = sendMessage(recipientId, testMessage);
    if (sent) {
      addLog("Message sent successfully");
      setTestMessage("");
    } else {
      addLog("Failed to send message");
    }
  };
  
  // Clear logs
  const handleClearLogs = () => {
    setLogs([]);
    setReceivedMessages([]);
  };

  // Log connection status changes
  useEffect(() => {
    if (isConnected) {
      addLog("✅ Connected to WebSocket server");
    } else {
      addLog("❌ Disconnected from WebSocket server");
    }
  }, [isConnected]);
  
  // Log errors
  useEffect(() => {
    if (error) {
      addLog(`Error: ${error}`);
    }
  }, [error]);
  
  // Log online users
  useEffect(() => {
    addLog(`Online users: ${onlineUsers.join(", ") || "none"}`);
  }, [onlineUsers]);

  return (
    <div className="container mx-auto py-6">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>WebSocket Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-4">
              <Badge
                variant={isConnected ? "success" : "destructive"}
                className="px-3 py-1"
              >
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
              
              {error && (
                <Badge variant="destructive" className="px-3 py-1">
                  Error: {error}
                </Badge>
              )}
              
              <div className="flex-1"></div>
              
              <Button
                onClick={handleConnect}
                disabled={isConnected}
                className="w-32"
              >
                Connect
              </Button>
              
              <Button
                onClick={handleDisconnect}
                disabled={!isConnected}
                variant="outline"
                className="w-32"
              >
                Disconnect
              </Button>
            </div>
            
            <div className="flex items-center space-x-4">
              <Input
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="Enter a test message"
                disabled={!isConnected}
                className="flex-1"
              />
              
              <Button
                onClick={handleSendMessage}
                disabled={!isConnected || !testMessage.trim()}
              >
                Send
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="h-[400px] flex flex-col">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle>Connection Logs</CardTitle>
              <Button variant="ghost" size="sm" onClick={handleClearLogs}>
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <div className="space-y-1 font-mono text-sm">
              {logs.length === 0 ? (
                <div className="text-muted-foreground text-center py-4">
                  No logs yet. Connect to start testing.
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="whitespace-pre-wrap break-all">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="h-[400px] flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle>Received Messages</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <div className="space-y-2">
              {receivedMessages.length === 0 ? (
                <div className="text-muted-foreground text-center py-4">
                  No messages received yet.
                </div>
              ) : (
                receivedMessages.map((msg, i) => (
                  <div
                    key={i}
                    className="p-3 bg-secondary rounded-lg text-sm break-all"
                  >
                    {msg}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Online Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {onlineUsers.length === 0 ? (
                <div className="text-muted-foreground">No users online</div>
              ) : (
                onlineUsers.map((userId) => (
                  <Badge key={userId} variant="outline" className="px-3 py-1">
                    User {userId}
                  </Badge>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}