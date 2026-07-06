import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore, useNotificationStore } from '../store/index.js';
import { notificationAPI } from '../services/api.js';
import toast from 'react-hot-toast';

const SocketContext = createContext({
  socket: null,
  connected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  // Load initial notifications on auth
  useEffect(() => {
    if (isAuthenticated) {
      const loadNotifications = async () => {
        try {
          const { data } = await notificationAPI.getAll();
          const list = data?.data?.notifications || [];
          useNotificationStore.setState({
            notifications: list,
            unreadCount: list.filter(n => !n.isRead).length,
          });
        } catch (err) {
          console.error('Failed to fetch notifications:', err);
        }
      };
      loadNotifications();
    } else {
      useNotificationStore.getState().clearAll();
    }
  }, [isAuthenticated]);

  // Connect socket
  useEffect(() => {
    if (!isAuthenticated) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('accessToken');
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Socket.io connected:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('Socket.io disconnected');
    });

    // Real-time notifications listener
    newSocket.on('notification:new', (notification) => {
      useNotificationStore.getState().addNotification(notification);

      // Trigger custom glassmorphic toast
      toast.success(
        <div className="flex flex-col gap-0.5">
          <p className="font-bold text-xs text-white uppercase tracking-wider">{notification.title}</p>
          <p className="text-xs text-purple-200">{notification.message}</p>
        </div>,
        {
          icon: '🔔',
          duration: 5000,
        }
      );
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?.id]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};
