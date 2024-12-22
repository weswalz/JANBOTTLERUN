import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Client } from 'node-osc';
import { Message } from './src/types';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

const io = new Server(httpServer, {
  cors: {
    origin: ["https://heights.clubkit.io", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

// Add CORS middleware for Express
app.use((req, res, next) => {
  const allowedOrigins = ['https://heights.clubkit.io', 'http://localhost:5173'];
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// Enable trust proxy for secure cookies behind reverse proxy
app.set('trust proxy', 1);

// Add security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'SAMEORIGIN');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});

// Store OSC clients for different IPs
const oscClients = new Map<string, Client>();

// Store the message queue in memory
let messageQueue: Message[] = [];

// Function to check OSC connection
const checkOscConnection = (client: Client): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 1000);

      client.send(['/ping'], (err) => {
        clearTimeout(timeout);
        resolve(!err);
      });
    } catch (error) {
      resolve(false);
    }
  });
};

// Function to broadcast message queue to all clients
const broadcastMessageQueue = () => {
  io.emit('messageQueueUpdate', messageQueue);
};

io.on('connection', (socket) => {
  const resolumeIp = socket.handshake.query.resolumeIp as string;
  console.log('Client connected with Resolume IP:', resolumeIp);

  // Send current message queue to newly connected client
  socket.emit('messageQueueUpdate', messageQueue);

  if (resolumeIp && !oscClients.has(resolumeIp)) {
    const client = new Client(resolumeIp, 2165);
    oscClients.set(resolumeIp, client);
    
    checkOscConnection(client).then(isConnected => {
      socket.emit('oscStatus', isConnected);
    });

    const statusInterval = setInterval(async () => {
      const isConnected = await checkOscConnection(client);
      socket.emit('oscStatus', isConnected);
    }, 5000);

    socket.on('disconnect', () => {
      clearInterval(statusInterval);
    });
  }

  // Handle new messages
  socket.on('addMessage', (message: Message) => {
    messageQueue.push(message);
    broadcastMessageQueue();
  });

  // Handle message updates (status changes, etc.)
  socket.on('updateMessage', (updatedMessage: Message) => {
    messageQueue = messageQueue.map(msg => 
      msg.id === updatedMessage.id ? updatedMessage : msg
    );
    broadcastMessageQueue();
  });

  // Handle message deletion
  socket.on('deleteMessage', (messageId: string) => {
    messageQueue = messageQueue.filter(msg => msg.id !== messageId);
    broadcastMessageQueue();
  });

  // Handle queue clear
  socket.on('clearQueue', () => {
    messageQueue = [];
    broadcastMessageQueue();
  });

  socket.on('sendText', ({ message, clipIndex, shouldConnect, clearOnly }) => {
    const client = oscClients.get(resolumeIp);
    if (client) {
      if (clearOnly) {
        const connectAddress = `/composition/layers/5/clips/${clipIndex}/connect`;
        client.send([connectAddress, 1], (err) => {
          if (err) {
            console.error(err);
            socket.emit('oscStatus', false);
          } else {
            console.log('Cleared screen using clip:', clipIndex);
            socket.emit('oscStatus', true);
          }
        });
      } else {
        const textAddress = `/composition/layers/5/clips/${clipIndex}/video/source/textgenerator/text/params/lines`;
        client.send([textAddress, message], (err) => {
          if (err) {
            console.error(err);
            socket.emit('oscStatus', false);
          } else {
            console.log('Sent text to Resolume:', message, 'at clip:', clipIndex);
            
            if (shouldConnect) {
              const connectAddress = `/composition/layers/5/clips/${clipIndex}/connect`;
              client.send([connectAddress, 1], (connectErr) => {
                if (connectErr) {
                  console.error(connectErr);
                } else {
                  console.log('Connected clip:', clipIndex);
                }
              });
            }
            
            socket.emit('oscStatus', true);
          }
        });
      }
    } else {
      console.error('No OSC client found for IP:', resolumeIp);
      socket.emit('oscStatus', false);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
    const remainingConnections = Array.from(io.sockets.sockets.values())
      .filter(s => s.handshake.query.resolumeIp === resolumeIp);
    
    if (remainingConnections.length === 0) {
      const client = oscClients.get(resolumeIp);
      if (client) {
        client.close();
        oscClients.delete(resolumeIp);
        console.log('Cleaned up OSC client for IP:', resolumeIp);
      }
    }
  });
});

// Add catch-all route for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 