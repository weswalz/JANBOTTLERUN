# Resolume OSC Text Controller - Process Documentation

## Overview
This document explains the complete process of how the Resolume OSC Text Controller works, including its architecture, data flow, and integration guide.

## Architecture
```mermaid
graph LR
    A[Web Browser] --> B[React Frontend]
    B --> C[Socket.IO Client]
    C --> D[Node.js Server]
    D --> E[OSC Client]
    E --> F[Resolume]
```

## Components Breakdown

### 1. Frontend (App.tsx)
- **Technologies Used**:
  - React
  - NextUI Components
  - Socket.IO Client
  - SessionStorage
  - TailwindCSS

- **Key Features**:
  - IP Address Management
  - Real-time OSC Connection Status
  - Text Input Interface
  - Session Persistence

### 2. Backend (server.ts)
- **Technologies Used**:
  - Express
  - Socket.IO Server
  - node-osc
  - TypeScript

- **Key Features**:
  - Dynamic OSC Client Management
  - Connection Health Monitoring
  - Multi-client Support
  - Automatic Resource Cleanup

## Data Flow

### 1. Initial Connection
```typescript
// Frontend initiates connection with IP
const newSocket = io('http://localhost:3000', {
  query: { resolumeIp }
});

// Backend receives connection
io.on('connection', (socket) => {
  const resolumeIp = socket.handshake.query.resolumeIp;
  // Creates OSC client
  const client = new Client(resolumeIp, 2165);
});
```

### 2. OSC Status Monitoring
```typescript
// Backend checks connection
const checkOscConnection = (client: Client): Promise<boolean> => {
  return new Promise((resolve) => {
    client.send('/ping', '', (err) => resolve(!err));
  });
};

// Frontend receives status
socket.on('oscStatus', (status: boolean) => {
  setOscStatus(status);
});
```

### 3. Text Transmission
```typescript
// Frontend sends text
socket.emit('sendText', text);

// Backend forwards to Resolume
client.send('/composition/layers/5/clips/4/video/source/textgenerator/text/params/lines', text);
```

## Integration Guide

### 1. Dependencies Required
```json
{
  "dependencies": {
    "@nextui-org/react": "^2.2.9",
    "express": "^4.18.2",
    "node-osc": "^9.0.2",
    "socket.io": "^4.7.4",
    "socket.io-client": "^4.7.4"
  }
}
```

### 2. Minimum Backend Setup
```typescript
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Client } from 'node-osc';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const oscClients = new Map<string, Client>();

// Basic connection handling
io.on('connection', (socket) => {
  const resolumeIp = socket.handshake.query.resolumeIp as string;
  const client = new Client(resolumeIp, 2165);
  oscClients.set(resolumeIp, client);
});
```

### 3. Minimum Frontend Setup
```typescript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  query: { resolumeIp: 'your.resolume.ip' }
});

// Send text to Resolume
const sendText = (text: string) => {
  socket.emit('sendText', text);
};
```

## Key Features Explained

### 1. IP Management
- Uses sessionStorage for persistence
- Allows dynamic IP changes
- Validates connection status

### 2. Connection Monitoring
- Regular health checks every 5 seconds
- Visual status indicator
- Automatic reconnection handling

### 3. Resource Management
- Automatic cleanup of unused connections
- Memory leak prevention
- Multiple client support

## OSC Message Format

### Default Text Control Message
```typescript
{
  address: '/composition/layers/5/clips/4/video/source/textgenerator/text/params/lines',
  args: [text]  // The text to display
}
```

## Best Practices

1. **Error Handling**
   - Always check OSC connection status
   - Provide visual feedback for connection state
   - Handle disconnections gracefully

2. **Resource Management**
   - Clean up Socket.IO connections on component unmount
   - Remove OSC clients when no longer needed
   - Monitor memory usage with multiple connections

3. **User Experience**
   - Disable controls when connection is lost
   - Provide clear feedback on connection status
   - Clear input after successful transmission

## Customization Points

1. **OSC Address**
   - Modify the OSC address pattern for different Resolume parameters
   - Add support for multiple OSC messages
   - Create custom message formats

2. **UI Components**
   - Customize NextUI components
   - Modify TailwindCSS styles
   - Add additional controls

3. **Connection Settings**
   - Modify connection check interval
   - Add retry mechanisms
   - Implement connection timeout handling

## Troubleshooting

1. **Connection Issues**
   - Verify Resolume IP address
   - Check if Resolume OSC input is enabled
   - Confirm port 2165 is open and available

2. **Message Problems**
   - Verify OSC address pattern matches Resolume setup
   - Check message format
   - Monitor server logs for errors

3. **Performance Issues**
   - Monitor number of active connections
   - Check resource cleanup
   - Verify memory usage 