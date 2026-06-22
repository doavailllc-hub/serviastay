import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL || "https://stay.dovail.com";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
  withCredentials: true,
});

export function connectSocket(userId) {
  if (!userId) return;

  if (!socket.connected) {
    socket.connect();
  }

  socket.emit("join", userId);
}

export function disconnectSocket() {
  if (socket.connected) {
    socket.disconnect();
  }
}