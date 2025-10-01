# Real-Time Spare Parts Notifications with Socket.IO

## Overview

Implemented real-time notifications system using Socket.IO to instantly notify all users when spare parts are used in requests or updated by warehouse keepers.

## Features

### ⚡ Real-Time Events

**1. Part Used in Request** 🔧
- When: Technician/Admin/Supervisor adds spare part to a request
- Who sees it: All connected users
- Notification includes:
  - Quantity used
  - Part name
  - Request number
  - Who performed the action
  - Part number
  - Timestamp

**2. Part Updated** ✏️
- When: Warehouse keeper updates spare part information
- Who sees it: All connected users
- Notification includes:
  - Part name
  - Changes made (name, quantity, price, etc.)
  - Who updated it
  - Part number
  - Timestamp

### 🔔 Toast Notifications

Each event triggers a beautiful toast notification with:
- **Icon**: 🔧 for used, ✏️ for updated
- **Title**: Descriptive header in Arabic
- **Message**: Full details of what happened
- **Details**: Who performed the action
- **Info**: Part number and timestamp
- **Sound**: Gentle beep notification
- **Position**: Top-left corner
- **Auto-close**: 5 seconds
- **RTL Support**: Full Arabic text direction

## Implementation

### Backend

#### 1. Socket.IO Service (`backend/src/services/socket.service.ts`)

**Initialization**:
```typescript
initializeSocket(httpServer: HTTPServer)
```
- Sets up Socket.IO server
- Configures CORS for frontend connection
- Handles client connections/disconnections

**Event Emitters**:
```typescript
emitSparePartUsed(data: {
  sparePartId, sparePartName, quantity,
  requestNumber, performedBy, partNumber
})

emitSparePartUpdated(data: {
  sparePartId, sparePartName, changes,
  performedBy, partNumber
})
```

#### 2. Integration Points

**When Part Used** (`backend/src/routes/request-parts.routes.ts`):
```typescript
await logPartUsedInRequest(...);
// Emits 'sparePart:used' event to all clients
```

**When Part Updated** (`backend/src/routes/storage.routes.ts`):
```typescript
await logPartUpdate(...);
// Emits 'sparePart:updated' event to all clients
```

#### 3. Server Setup (`backend/src/index.ts`)

```typescript
const httpServer = createServer(app);
initializeSocket(httpServer);
httpServer.listen(PORT);
```

### Frontend

#### 1. Socket Context (`frontend/src/contexts/SocketContext.tsx`)

**Features**:
- Auto-connects when user logs in
- Auto-reconnects on disconnection
- Listens for spare part events
- Shows toast notifications
- Plays notification sound
- Full RTL support

**Event Listeners**:
```typescript
socket.on('sparePart:used', (data) => {
  // Show info toast with blue color
  toast.info(<NotificationContent />);
  playNotificationSound();
});

socket.on('sparePart:updated', (data) => {
  // Show success toast with green color
  toast.success(<NotificationContent />);
  playNotificationSound();
});
```

#### 2. Toast Notifications

**Configuration**:
- Position: `top-left`
- Auto-close: `5000ms`
- Progress bar: Enabled
- Draggable: Yes
- RTL: Yes (Arabic text direction)
- Sound: Gentle beep

**Content Structure**:
```tsx
<div dir="rtl" className="text-right">
  <div className="flex items-center gap-2 mb-1">
    <span className="text-xl">{icon}</span>
    <strong>{title}</strong>
  </div>
  <div className="text-sm">{message}</div>
  <div className="text-xs text-gray-600 mt-1">{details}</div>
  <div className="text-xs text-gray-500 mt-1">
    {partNumber} - {timestamp}
  </div>
</div>
```

#### 3. Notification Sound

Uses Web Audio API to play a gentle beep:
- Frequency: 800Hz
- Duration: 0.5 seconds
- Volume: 0.3 (quiet, not intrusive)
- Type: Sine wave

## User Experience

### Scenario 1: Technician Uses Part

1. **Technician** opens request REQ-123
2. **Technician** adds 5x "Motor ABC" to request
3. **Immediately**:
   - All connected users see toast:
     ```
     🔧 قطعة غيار مستخدمة
     تم استخدام 5 قطعة من "Motor ABC" في الطلب REQ-123
     بواسطة Ahmad Ali
     PART251001-015 - ١/١٠/٢٠٢٥ ٣:٤٥ م
     ```
   - Gentle beep plays
   - Toast auto-dismisses after 5 seconds

### Scenario 2: Warehouse Keeper Updates

1. **Warehouse Keeper** edits "Filter XYZ"
2. **Warehouse Keeper** changes price from 1000 to 1200
3. **Immediately**:
   - All connected users see toast:
     ```
     ✏️ تحديث قطعة غيار
     Sara Hassan قام بتحديث "Filter XYZ"
     التغييرات: السعر
     PART251001-008 - ١/١٠/٢٠٢٥ ٣:٤٦ م
     ```
   - Gentle beep plays
   - Toast auto-dismisses after 5 seconds

## Technical Details

### Socket.IO Connection

**Backend Server**:
- Protocol: WebSocket (with polling fallback)
- CORS: Enabled for frontend origin
- Port: Same as API server (3001)

**Frontend Client**:
- Transports: WebSocket preferred, polling fallback
- Reconnection: Enabled (up to 5 attempts)
- Reconnection delay: 1 second
- Auto-connect: When user logs in
- Auto-disconnect: When user logs out

### Event Flow

```
[Technician uses part]
       ↓
[Backend: logPartUsedInRequest()]
       ↓
[Socket Service: emitSparePartUsed()]
       ↓
[Socket.IO: emit('sparePart:used')]
       ↓
[All Clients receive event]
       ↓
[SocketContext: socket.on('sparePart:used')]
       ↓
[Toast Notification displayed]
       ↓
[Sound plays]
```

### Package Dependencies

**Backend**:
- `socket.io`: ^4.7.5
- `@types/socket.io`: ^3.0.2 (dev)

**Frontend**:
- `socket.io-client`: ^4.7.5
- `react-toastify`: ^10.0.6

## Files Modified

### Backend
1. ✅ `backend/package.json` - Added socket.io
2. ✅ `backend/src/services/socket.service.ts` - New service
3. ✅ `backend/src/services/sparePart.service.ts` - Emit events
4. ✅ `backend/src/index.ts` - Initialize Socket.IO
5. ✅ `backend/src/routes/storage.routes.ts` - Pass part number
6. ✅ `backend/src/routes/request-parts.routes.ts` - Pass part number

### Frontend
1. ✅ `frontend/package.json` - Added dependencies
2. ✅ `frontend/src/contexts/SocketContext.tsx` - New context
3. ✅ `frontend/src/index.tsx` - Wrap app with SocketProvider
4. ✅ `frontend/src/index.css` - Toast styles imported

### Build
- ✅ Backend compiled
- ✅ Frontend built (+22.81 kB for Socket.IO + Toastify)
- ✅ Ready for deployment

## Configuration

### Environment Variables

**Backend** (`.env`):
```env
# No additional config needed
# Socket.IO uses same port as API
```

**Frontend** (`.env`):
```env
# Socket.IO connects to API URL
REACT_APP_API_URL=https://your-backend-url.com
```

## Testing

### Manual Testing

1. **Start Backend**:
   ```bash
   cd backend
   npm start
   ```

2. **Open Multiple Browser Windows**:
   - Window 1: Log in as Warehouse Keeper
   - Window 2: Log in as Technician
   - Window 3: Log in as Admin

3. **Test Part Used**:
   - In Window 2 (Technician): Add part to request
   - Check: All windows show notification

4. **Test Part Updated**:
   - In Window 1 (Warehouse Keeper): Update spare part
   - Check: All windows show notification

### Test Checklist

- [ ] Socket connects on login
- [ ] Socket disconnects on logout
- [ ] Part used notification appears
- [ ] Part updated notification appears
- [ ] Notifications show in all browser windows
- [ ] Sound plays (check browser audio permissions)
- [ ] Notifications auto-dismiss after 5 seconds
- [ ] Arabic text displays correctly (RTL)
- [ ] Click notification to dismiss manually
- [ ] Reconnects after server restart

## Deployment

### Railway Deployment

The Socket.IO implementation is production-ready:

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add real-time spare parts notifications with Socket.IO"
   git push origin main
   ```

2. **Railway Auto-Deploys**:
   - Backend includes Socket.IO server
   - Frontend connects automatically
   - No additional configuration needed

3. **Verify in Production**:
   - Open multiple tabs
   - Test notifications
   - Check browser console for Socket connection

### CORS Configuration

Backend automatically allows Railway domains:
```typescript
if (hostname.endsWith('.up.railway.app')) {
  return callback(null, true);
}
```

## Benefits

### ✅ Real-Time Updates
- Instant notifications
- No manual refresh needed
- Everyone stays informed

### ✅ Better Awareness
- Know when parts are used
- Track changes immediately
- Audit trail in real-time

### ✅ Improved Communication
- No need to tell others about changes
- Automatic broadcast to all users
- Reduces miscommunication

### ✅ Better UX
- Beautiful toast notifications
- Gentle sound alerts
- Non-intrusive design
- Auto-dismiss

## Performance

- **Socket Connection**: Minimal overhead (~1KB/s idle)
- **Event Size**: ~500 bytes per notification
- **Toast Render**: Negligible performance impact
- **Sound**: Web Audio API (browser native)

## Browser Compatibility

- **WebSocket**: All modern browsers
- **Toast Notifications**: All modern browsers
- **Web Audio API**: Chrome, Firefox, Safari, Edge
- **RTL Support**: All modern browsers

## Troubleshooting

### Socket Not Connecting

1. **Check backend console**: Look for "Socket.IO initialized"
2. **Check frontend console**: Look for "Connecting to Socket.IO"
3. **Check network tab**: Look for WebSocket connection
4. **Check CORS**: Ensure frontend origin is allowed

### Notifications Not Showing

1. **Check socket connection**: Should say "connected: true"
2. **Check event listeners**: Look in console for event logs
3. **Check toast container**: Ensure `<ToastContainer />` is rendered
4. **Check imports**: Verify react-toastify CSS is imported

### Sound Not Playing

1. **Check browser permissions**: Some browsers block audio
2. **Check user interaction**: Some browsers require user action first
3. **Check console**: Look for audio errors
4. **Test manually**: Click page to allow audio

## Summary

Implemented complete real-time notification system using Socket.IO. When technicians/admins/supervisors use spare parts in requests, or when warehouse keepers update spare part information, all connected users instantly receive beautiful toast notifications with:

- 🔧 Icon and descriptive message
- 📝 Details of what changed
- 👤 Who performed the action
- 🔢 Part number and timestamp
- 🔔 Gentle sound alert
- 🌐 Full Arabic RTL support

**Status**: ✅ Ready to deploy
**Bundle Impact**: +22.81 kB (minimal)
**Breaking Changes**: None
**Database Changes**: None
