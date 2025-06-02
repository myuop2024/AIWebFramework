import React, { useEffect, useRef } from 'react';
import Modal from './Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
          if (document.activeElement === cancelRef.current) {
            onClose();
          } else if (document.activeElement === confirmRef.current) {
            onConfirm();
          }
        }
        if (e.key === 'Escape') {
          onClose();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose, onConfirm]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Are you sure?">
      <div className="mb-4">{message}</div>
      <div className="flex justify-end gap-2">
        <button
          ref={cancelRef}
          className="px-4 py-2 rounded bg-gray-200"
          onClick={onClose}
          aria-label={cancelText}
        >
          {cancelText}
        </button>
        <button
          ref={confirmRef}
          className="px-4 py-2 rounded bg-red-600 text-white"
          onClick={onConfirm}
          aria-label={confirmText}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog; 