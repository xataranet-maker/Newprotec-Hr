import React from 'react';

interface AssistantProps {
  isOpen: boolean;
  onClose: () => void;
  context: string;
}

export const Assistant: React.FC<AssistantProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return null;
};
