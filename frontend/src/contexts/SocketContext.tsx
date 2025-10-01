import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { useAuth } from './AuthContext';

interface SparePartEvent {
  type: string;
  icon: string;
  message: string;
  details: string;
  sparePartId: number;
  sparePartName: string;
  partNumber: string;
  timestamp: string;
}

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Get backend URL from environment or default
    const backendURL = process.env.REACT_APP_API_URL || window.location.origin;
    
    console.log('🔌 Connecting to Socket.IO server:', backendURL);

    const newSocket = io(backendURL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
      setConnected(false);
    });

    // Listen for spare part events
    newSocket.on('sparePart:used', (data: SparePartEvent) => {
      console.log('📡 Received spare part used event:', data);
      
      // Show toast notification
      toast.info(
        <div dir="rtl" className="text-right">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{data.icon}</span>
            <strong>قطعة غيار مستخدمة</strong>
          </div>
          <div className="text-sm">{data.message}</div>
          <div className="text-xs text-gray-600 mt-1">{data.details}</div>
          <div className="text-xs text-gray-500 mt-1">
            {data.partNumber} - {new Date(data.timestamp).toLocaleString('ar-SY')}
          </div>
        </div>,
        {
          position: 'top-left',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          rtl: true,
        }
      );

      // Play notification sound (optional)
      playNotificationSound();
    });

    newSocket.on('sparePart:updated', (data: SparePartEvent) => {
      console.log('📡 Received spare part updated event:', data);
      
      // Show toast notification
      toast.success(
        <div dir="rtl" className="text-right">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{data.icon}</span>
            <strong>تحديث قطعة غيار</strong>
          </div>
          <div className="text-sm">{data.message}</div>
          <div className="text-xs text-gray-600 mt-1">{data.details}</div>
          <div className="text-xs text-gray-500 mt-1">
            {data.partNumber} - {new Date(data.timestamp).toLocaleString('ar-SY')}
          </div>
        </div>,
        {
          position: 'top-left',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          rtl: true,
        }
      );

      // Play notification sound (optional)
      playNotificationSound();
    });

    setSocket(newSocket);

    return () => {
      console.log('🔌 Disconnecting Socket.IO...');
      newSocket.close();
    };
  }, [user]);

  const playNotificationSound = () => {
    // Simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      // Silently fail if audio not supported
      console.log('Audio notification not available');
    }
  };

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};
