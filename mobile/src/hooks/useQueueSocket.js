import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { apiBaseUrl } from '../api/api';

export function useQueueSocket(onUpdate, onPosition) {
  const onUpdateRef = useRef(onUpdate);
  const onPositionRef = useRef(onPosition);
  onUpdateRef.current = onUpdate;
  onPositionRef.current = onPosition;

  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io(`${apiBaseUrl}/queue`, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    // Global snapshot — always pass through including idle (queueCount:0)
    socket.on('queue:update', (snapshot) => {
      onUpdateRef.current?.(snapshot);
    });

    // Personal position update while waiting in queue
    socket.on('queue:position', (pos) => {
      onPositionRef.current?.(pos);
    });

    // On reconnect request fresh snapshot to close missed-updates gap
    socket.on('connect', () => {
      socket.emit('queue:sync');
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return socketRef;
}
