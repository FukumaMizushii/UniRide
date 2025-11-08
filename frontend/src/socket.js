import { io } from 'socket.io-client';

const socket = io('http://localhost:5500');
export default socket;