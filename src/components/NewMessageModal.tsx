import { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Input } from "@nextui-org/react";
import { NewMessageModalProps } from '../types';

export function NewMessageModal({ isOpen, onClose, onSubmit }: NewMessageModalProps) {
  const [tableNumber, setTableNumber] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (tableNumber && message) {
      onSubmit(tableNumber, message.toUpperCase());
      handleClear();
    }
  };

  const handleClear = () => {
    setTableNumber('');
    setMessage('');
    onClose();
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value.toUpperCase());
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClear}
      backdrop="blur"
      classNames={{
        backdrop: "bg-black/50 backdrop-blur-sm",
        base: "bg-black/50 dark backdrop-blur-md",
        header: "border-b border-white/10",
        body: "py-6",
        footer: "border-t border-white/10"
      }}
    >
      <ModalContent>
        <ModalHeader className="text-white">New Message</ModalHeader>
        <ModalBody>
          <Input
            label="Table Number"
            placeholder="Enter table number"
            value={tableNumber}
            onChange={(e) => setTableNumber(e.target.value)}
            classNames={{
              input: "bg-black/40 text-white placeholder:text-white/60",
              inputWrapper: "backdrop-blur-lg",
              label: "text-white/90"
            }}
          />
          <Input
            label="Message"
            placeholder="Enter message"
            value={message}
            onChange={handleMessageChange}
            classNames={{
              input: "bg-black/40 text-white placeholder:text-white/60 uppercase",
              inputWrapper: "backdrop-blur-lg",
              label: "text-white/90"
            }}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="light" onPress={handleClear}>
            Cancel
          </Button>
          <Button 
            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
            onPress={handleSubmit}
            isDisabled={!tableNumber || !message}
          >
            Add Message
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 