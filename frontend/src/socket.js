import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5500';

const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'] // Important for production
});

export default socket;