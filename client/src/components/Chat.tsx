import React, { useState, useEffect, useRef } from 'react';
import { MessageBox } from 'react-chat-elements';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/use-auth';
import 'react-chat-elements/dist/main.css';

const Chat = () => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to chat server');
      if (user) {
        newSocket.emit('join', { userId: user.id });
      }
    });

    newSocket.on('message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    return () => {
      newSocket.close();
    };
  }, [user]);

  const sendMessage = () => {
    if (input.trim() && user) {
      const message = {
        position: 'right',
        type: 'text',
        text: input,
        date: new Date(),
        senderId: user.id,
      };
      socket?.emit('message', message);
      setMessages((prevMessages) => [...prevMessages, message]);
      setInput('');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col h-[500px]">
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((msg, index) => (
              <MessageBox key={index} {...msg} />
            ))}
          </div>
          <div className="p-4 border-t flex items-center">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button onClick={sendMessage} className="ml-2">
              Send
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Chat; 