import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

let io: SocketIOServer | null = null;

export const initializeSocket = (httpServer: HTTPServer) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('✅ New client connected:', socket.id);

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized!');
  }
  return io;
};

// Emit spare part events
export const emitSparePartUsed = (data: {
  sparePartId: number;
  sparePartName: string;
  quantity: number;
  requestNumber: string;
  performedBy: string;
  partNumber: string;
}) => {
  if (io) {
    io.emit('sparePart:used', {
      type: 'USED_IN_REQUEST',
      icon: '🔧',
      message: `تم استخدام ${data.quantity} قطعة من "${data.sparePartName}" في الطلب ${data.requestNumber}`,
      details: `بواسطة ${data.performedBy}`,
      sparePartId: data.sparePartId,
      sparePartName: data.sparePartName,
      partNumber: data.partNumber,
      timestamp: new Date().toISOString(),
    });
    console.log('📡 Socket event emitted: sparePart:used');
  }
};

export const emitSparePartUpdated = (data: {
  sparePartId: number;
  sparePartName: string;
  changes: string[];
  performedBy: string;
  partNumber: string;
}) => {
  if (io) {
    io.emit('sparePart:updated', {
      type: 'UPDATED',
      icon: '✏️',
      message: `${data.performedBy} قام بتحديث "${data.sparePartName}"`,
      details: `التغييرات: ${data.changes.join(', ')}`,
      sparePartId: data.sparePartId,
      sparePartName: data.sparePartName,
      partNumber: data.partNumber,
      changes: data.changes,
      timestamp: new Date().toISOString(),
    });
    console.log('📡 Socket event emitted: sparePart:updated');
  }
};
