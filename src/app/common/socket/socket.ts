import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer;

export function initSocket(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    socket.on("joinPoll", (pollId: string) => {
      if (!pollId) return;
      socket.join(`poll:${pollId}`);
    });

    socket.on("leavePoll", (pollId: string) => {
      if (!pollId) return;
      socket.leave(`poll:${pollId}`);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error(
      "Socket.io not initialized — call initSocket() before using getIO()",
    );
  }
  return io;
}
