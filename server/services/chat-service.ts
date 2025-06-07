import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import logger from '../utils/logger';

export class ChatService {
  private io: Server;

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info('A user connected to the chat');

      socket.on('join', (data: { userId: string }) => {
        socket.join(data.userId);
        logger.info(`User ${data.userId} joined their room`);
      });

      socket.on('message', (message) => {
        // For now, just broadcast the message to everyone
        // A more advanced implementation would send to a specific user or room
        socket.broadcast.emit('message', message);
      });

      socket.on('disconnect', () => {
        logger.info('A user disconnected from the chat');
      });
    });
  }
} 