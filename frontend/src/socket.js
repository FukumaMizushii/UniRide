import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-service.onrender.com' 
  : 'http://localhost:5500';

const socket = io(SOCKET_URL);
export default socket;