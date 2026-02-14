'use client';

import { FC } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

interface ErrorToastProps {
  message: string | null;
  onClose: () => void;
}

export const ErrorToast: FC<ErrorToastProps> = ({ message, onClose }) => {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="bottom-20 left-1/2 z-50 fixed flex items-center space-x-2 bg-red-100 shadow-lg px-4 py-3 border border-red-400 rounded-md max-w-md text-red-700 -translate-x-1/2"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span>{message}</span>
          <button onClick={onClose} className="ml-2">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
