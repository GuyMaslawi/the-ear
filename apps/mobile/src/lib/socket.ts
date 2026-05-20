import { io, Socket } from 'socket.io-client';
import { socketUrl } from './config';
import { session } from './session';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export async function connectSocket(): Promise<Socket> {
  const token = await session.getToken();
  if (!token) throw new Error('No session token');
  if (socket?.connected) return socket;
  if (socket && !socket.connected) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  const url = socketUrl();
  const t0 = Date.now();
  console.log('[Realtime] socket connect start', { url });
  socket = io(url, {
    transports: ['websocket', 'polling'],
    auth: { token },
    reconnection: true,
  });
  socket.once('connect', () => {
    console.log(`[Realtime] socket connect ok duration=${Date.now() - t0}ms`);
  });
  socket.once('connect_error', (err: Error) => {
    console.log(
      `[Realtime] socket connect_error duration=${Date.now() - t0}ms message=${err.message}`,
    );
  });
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
