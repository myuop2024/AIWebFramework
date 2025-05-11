
// Client-side storage proxy for communication with server API
import { User, Message, Conversation } from '@/hooks/use-communication';

// This module provides client-side access to server storage operations
// through API endpoints rather than direct DB access

export const clientStorage = {
  // User-related operations
  async getUser(id: number): Promise<User | undefined> {
    try {
      const response = await fetch(`/api/communications/user-status/${id}`);
      if (!response.ok) return undefined;
      return await response.json();
    } catch (error) {
      console.error('Error fetching user:', error);
      return undefined;
    }
  },

  // Message-related operations
  async getMessagesBetweenUsers(userId1: number, userId2: number): Promise<Message[]> {
    try {
      const response = await fetch(`/api/communications/messages/${userId2}`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  },

  async getRecentConversations(userId: number): Promise<Conversation[]> {
    try {
      const response = await fetch('/api/communications/conversations');
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  },

  async createMessage(message: Omit<Message, 'id' | 'sentAt'>): Promise<Message | undefined> {
    try {
      const response = await fetch('/api/communications/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      
      if (!response.ok) return undefined;
      return await response.json();
    } catch (error) {
      console.error('Error creating message:', error);
      return undefined;
    }
  },

  async markMessageAsRead(messageId: number): Promise<Message | undefined> {
    try {
      const response = await fetch('/api/communications/messages/read', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messageIds: [messageId] }),
      });
      
      if (!response.ok) return undefined;
      const updatedMessages = await response.json();
      return updatedMessages[0]; // Return the first (and likely only) message
    } catch (error) {
      console.error('Error marking message as read:', error);
      return undefined;
    }
  },

  async markAllMessagesAsRead(senderId: number, receiverId: number): Promise<number> {
    try {
      const response = await fetch(`/api/communications/messages/read-all/${senderId}`, {
        method: 'PATCH',
      });
      
      if (!response.ok) return 0;
      const result = await response.json();
      return result.count || 0;
    } catch (error) {
      console.error('Error marking all messages as read:', error);
      return 0;
    }
  },

  // Online users operations
  async getAllUsers(): Promise<User[]> {
    try {
      const response = await fetch('/api/communications/online-users');
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  }
};
