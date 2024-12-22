import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Button } from '@nextui-org/react';
import { Message } from './types';
import { NewMessageModal } from './components/NewMessageModal';
import { MessageListItem } from './components/MessageListItem';
import { v4 as uuidv4 } from 'uuid';

const CLIP_INDICES = [4, 5, 6, 7, 8];
const EMPTY_CLIP = 9;

// Add server URL configuration
const SERVER_URL = import.meta.env.PROD 
  ? 'https://heights.clubkit.io'  // Production server URL
  : 'http://localhost:3000';      // Development server URL

const formatMessageText = (text: string): string => {
  // Split the text into words
  const words = text.split(' ');
  const lines: string[] = [];
  
  // Group words into pairs
  for (let i = 0; i < words.length; i += 2) {
    if (i + 1 < words.length) {
      // If we have two words, join them
      lines.push(`${words[i]} ${words[i + 1]}`);
    } else {
      // If we have a single word left, use it alone
      lines.push(words[i]);
    }
  }
  
  // Join the lines with newline characters
  return lines.join('\n');
};

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [resolumeIp, setResolumeIp] = useState(() => {
    return localStorage.getItem('resolumeIp') || '';
  });
  const [isEditingIp, setIsEditingIp] = useState(!localStorage.getItem('resolumeIp'));
  const [oscStatus, setOscStatus] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentClipIndex, setCurrentClipIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (resolumeIp) {
      const newSocket = io(SERVER_URL, {
        query: { resolumeIp },
        withCredentials: true
      });
      
      newSocket.on('oscStatus', (status: boolean) => {
        setOscStatus(status);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [resolumeIp]);

  const handleIpChange = (newIp: string) => {
    setResolumeIp(newIp);
    localStorage.setItem('resolumeIp', newIp);
    setIsEditingIp(false);
    
    // Reconnect socket with new IP
    socket?.close();
    const newSocket = io(SERVER_URL, {
      query: { resolumeIp: newIp },
      withCredentials: true
    });
    
    newSocket.on('oscStatus', (status: boolean) => {
      setOscStatus(status);
    });

    setSocket(newSocket);
  };

  const handleNewMessage = (tableNumber: string, message: string) => {
    const newMessage: Message = {
      id: uuidv4(),
      tableNumber,
      message,
      timestamp: Date.now(),
      clipIndex: null,
      status: 'pending'
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const handleSendMessage = (id: string) => {
    const clipIndex = CLIP_INDICES[currentClipIndex];
    setMessages(prev => prev.map(msg => 
      msg.id === id ? {
        ...msg,
        status: 'sending',
        sendStartTime: Date.now(),
        clipIndex
      } : msg
    ));
    
    const message = messages.find(m => m.id === id);
    if (message && socket) {
      // Format the message text before sending
      const formattedText = formatMessageText(message.message);
      socket.emit('sendText', { 
        message: formattedText, 
        clipIndex,
        shouldConnect: true
      });
      setCurrentClipIndex((currentClipIndex + 1) % CLIP_INDICES.length);
    }
  };

  const handleCancelMessage = (id: string) => {
    const message = messages.find(msg => msg.id === id);
    
    if (message?.status === 'sending') {
      // If the message is sending, return it to pending state
      setMessages(prev => prev.map(msg => 
        msg.id === id 
          ? { ...msg, status: 'pending', sendStartTime: undefined, clipIndex: null }
          : msg
      ));
    } else {
      // If the message is pending, remove it from the queue
      setMessages(prev => prev.filter(msg => msg.id !== id));
    }
  };

  const handleCompleteMessage = (id: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const handleClearScreen = () => {
    if (socket) {
      socket.emit('sendText', { 
        message: '', 
        clipIndex: EMPTY_CLIP,
        shouldConnect: true,
        clearOnly: true
      });
    }
  };

  const handleReloadApp = () => {
    // Just clear the message queue without affecting the screen
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-[#0a1f2e] via-[#4b1259] to-[#3d1217]">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-black/30 backdrop-blur-lg border-b border-white/10 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-white">Bottle Run Messenger</h1>
            <div className="flex items-center gap-4">
              <Button
                className="bg-gradient-to-r from-red-500 to-orange-500 text-white"
                size="sm"
                onPress={handleReloadApp}
              >
                Reload App
              </Button>
              
              <Button
                className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white"
                size="sm"
                onPress={handleClearScreen}
              >
                Clear Screen
              </Button>
              
              <Button
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                size="sm"
                onPress={() => setIsModalOpen(true)}
              >
                New Message
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-white/60">Resolume IP:</span>
              {isEditingIp ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={resolumeIp}
                    onChange={(e) => setResolumeIp(e.target.value)}
                    className="bg-black/40 text-white px-2 py-1 rounded text-sm w-32"
                    placeholder="Enter Resolume IP"
                  />
                  <Button
                    size="sm"
                    className="bg-green-500/20 text-green-400"
                    onPress={() => handleIpChange(resolumeIp)}
                  >
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-white bg-black/40 px-2 py-1 rounded text-sm">{resolumeIp}</span>
                  <Button
                    size="sm"
                    className="text-white/60"
                    variant="light"
                    onPress={() => setIsEditingIp(true)}
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
            
            {/* OSC Status */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${oscStatus ? 'bg-green-500' : 'bg-red-500'}`} />
              {oscStatus ? (
                <span className="text-green-400 text-sm">OSC ONLINE</span>
              ) : (
                <span className="text-red-400 text-sm">OFFLINE</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="max-w-7xl mx-auto px-4 pt-32 pb-6">
        <div className="space-y-2">
          {messages
            .sort((a, b) => b.timestamp - a.timestamp)
            .map(message => (
              <MessageListItem
                key={message.id}
                message={message}
                socket={socket}
                onSend={handleSendMessage}
                onCancel={handleCancelMessage}
                onComplete={handleCompleteMessage}
              />
            ))}
        </div>
      </div>

      {/* New Message Modal */}
      <NewMessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleNewMessage}
      />
    </div>
  );
}

export default App;
