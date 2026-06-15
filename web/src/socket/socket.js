import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:5000";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket"],
});

export const connectSocket = (userId) => {
  if (!userId) return;

  if (!socket.connected) {
    socket.connect();
  }

  socket.emit("join_user", userId);
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};