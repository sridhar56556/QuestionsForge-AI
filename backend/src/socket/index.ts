import { Server } from 'socket.io';
import type { Server as HTTPServer } from 'http';

let io: Server;

export function initSocket(server: HTTPServer) {
  io = new Server(server, { cors: { origin: '*' } });
  
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
}

export function getSocketEmitter() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}
