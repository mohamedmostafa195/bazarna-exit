import type { Server as SocketIOServer } from "socket.io";

declare global {
  // eslint-disable-next-line no-var
  var io: SocketIOServer | undefined;
}

export function getIO(): SocketIOServer | null {
  return global.io ?? null;
}

export function emitQueueUpdate(eventId: string, data: Record<string, unknown>) {
  const io = getIO();
  if (io) {
    io.to(`event:${eventId}`).emit("queue:update", data);
  }
}
