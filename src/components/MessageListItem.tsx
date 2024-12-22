import { useEffect, useState } from 'react';
import { Button } from "@nextui-org/react";
import { Message } from '../types';
import { Socket } from 'socket.io-client';

interface MessageListItemProps {
  message: Message;
  socket: Socket | null;
  onSend: (id: string) => void;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
}

const SEND_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export function MessageListItem({ message, socket, onSend, onCancel, onComplete }: MessageListItemProps) {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (message.status === 'sending' && message.sendStartTime) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - message.sendStartTime!;
        const newProgress = Math.max(100 - (elapsed / SEND_DURATION) * 100, 0);
        setProgress(newProgress);
        
        if (newProgress <= 0) {
          onComplete(message.id);
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [message.status, message.sendStartTime, message.id, onComplete]);

  const handleCancel = (id: string) => {
    onCancel(id);
    if (message.status === 'sending' && socket) {
      // Clear the screen when canceling a sending message
      socket.emit('sendText', { 
        message: '', 
        clipIndex: 9,
        shouldConnect: true,
        clearOnly: true
      });
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Message Content */}
      <div 
        className={`flex items-center justify-between p-3 relative z-10 transition-colors duration-300 ${
          message.status === 'sending' ? 'bg-green-500/20' : 'bg-black/40'
        }`}
      >
        {/* Progress Bar (drains from right to left) */}
        {message.status === 'sending' && (
          <div 
            className="absolute inset-0 right-0 bg-green-500/20"
            style={{
              width: `${progress}%`,
              right: 0,
              transition: 'width 1s linear'
            }}
          />
        )}
        
        <div className="relative z-20">
          <span className="text-white font-bold">Table {message.tableNumber}</span>
          <p className="text-white/80">{message.message}</p>
        </div>
        <div className="flex gap-2 relative z-20">
          {message.status === 'pending' && (
            <>
              <Button
                size="sm"
                color="danger"
                variant="light"
                onPress={() => onCancel(message.id)}
              >
                Delete
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                onPress={() => onSend(message.id)}
              >
                Send
              </Button>
            </>
          )}
          {message.status === 'sending' && (
            <Button
              size="sm"
              color="danger"
              variant="light"
              onPress={() => handleCancel(message.id)}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 