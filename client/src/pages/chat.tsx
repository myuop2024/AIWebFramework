import React from 'react';
import Chat from '@/components/Chat';
import AuthGuard from '@/components/auth/auth-guard';

const ChatPage = () => {
  return (
    <AuthGuard>
      <div className="container mx-auto p-4">
        <Chat />
      </div>
    </AuthGuard>
  );
};

export default ChatPage;
