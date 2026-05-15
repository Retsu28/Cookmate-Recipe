import { io, type Socket } from 'socket.io-client';

export interface QueueSnapshot {
  queueCount: number;
  queueLimit: number;
  queueLabel: string;
  activeCount: number;
  waitingCount: number;
  idle?: boolean;
}

export interface QueuePosition {
  position: number;
  queueCount: number;
  queueLimit: number;
}

type QueueUpdateHandler = (snapshot: QueueSnapshot) => void;
type QueuePositionHandler = (pos: QueuePosition) => void;

function getSocketBaseUrl() {
  return (import.meta.env.VITE_API_BASE_URL as string) || window.location.origin;
}

export interface QueueSubscription {
  socketId: () => string | null;
  unsubscribe: () => void;
}

export function subscribeQueueUpdates(
  onUpdate: QueueUpdateHandler,
  onPosition?: QueuePositionHandler,
): QueueSubscription {
  const socket: Socket = io(`${getSocketBaseUrl()}/queue`, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  // Receive global snapshot — always pass through (including idle queueCount:0)
  socket.on('queue:update', onUpdate);

  // Receive personal position update while waiting in queue
  if (onPosition) {
    socket.on('queue:position', onPosition);
  }

  // On reconnect, request a fresh snapshot (fixes missed-updates gap)
  socket.on('connect', () => {
    socket.emit('queue:sync');
  });

  return {
    socketId: () => socket.id ?? null,
    unsubscribe: () => {
      socket.removeAllListeners();
      socket.disconnect();
    },
  };
}
