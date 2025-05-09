import { io, Socket } from "socket.io-client";

const transports: ("websocket" | "polling")[] = ["websocket"];

export function useCommunication(userId: string): Socket {
  const socket = io("/comms", {
    path: "/socket.io",
    transports,
    timeout: 20000,
    // Removed autoConnect: false to allow automatic connection
    reconnection: false,
    forceNew: true,
    query: { userId, clientTime: Date.now() }
  });

  // Automatically connect
  socket.connect();

  socket.on("connect", () => {
    console.log("Socket.io connected!", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.error("Socket.io connection error:", err);
  });

  return socket;
}
