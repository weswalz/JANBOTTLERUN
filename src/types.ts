export interface Message {
  id: string;
  tableNumber: string;
  message: string;
  timestamp: number;
  clipIndex: number | null;
  status: 'pending' | 'sending' | 'canceled';
  sendStartTime?: number; // When the message started sending (for progress bar)
}

export interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tableNumber: string, message: string) => void;
} 