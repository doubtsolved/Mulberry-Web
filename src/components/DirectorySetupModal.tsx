import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FolderRegular, CheckmarkRegular, DismissRegular } from '@fluentui/react-icons';
import { promptSelectDeviceFolder, isFileSystemAccessSupported } from '../services/storage';

interface DirectorySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigured: (folderName: string) => void;
}

export const DirectorySetupModal: React.FC<DirectorySetupModalProps> = ({
  isOpen,
  onClose,
  onConfigured,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectFolder = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await promptSelectDeviceFolder();
      onConfigured(res.folderName);
      onClose();
    } catch (err: unknown) {
      if ((err as Error)?.message !== 'Selection cancelled') {
        setError('Unable to access folder. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isNativeSupported = isFileSystemAccessSupported();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm"
        />

        {/* Material 3 Expressive Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="relative w-full max-w-md rounded-3xl m3-glass p-6 md:p-8 shadow-2xl border border-white/40 dark:border-white/10 z-10"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-2xl bg-[#7b1e58]/10 dark:bg-[#f6b1d9]/15 flex items-center justify-center text-[#7b1e58] dark:text-[#f6b1d9]">
              <FolderRegular className="w-6 h-6" />
            </div>
            <button
              onClick={onClose}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors"
              aria-label="Close"
            >
              <DismissRegular className="w-5 h-5" />
            </button>
          </div>

          <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2">
            Storage Location
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-6 leading-relaxed">
            {isNativeSupported
              ? 'Select a device directory where Mulberry will store encrypted book files and offline metadata.'
              : 'Configure local offline storage for encrypted book files and metadata.'}
          </p>

          {error && (
            <div className="mb-4 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
              {error}
            </div>
          )}

          {/* Action button */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleSelectFolder}
              disabled={loading}
              className="w-full h-12 rounded-2xl bg-[#7b1e58] hover:bg-[#68194a] active:scale-[0.98] text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-[#7b1e58]/20 disabled:opacity-50"
            >
              {loading ? (
                <span>Accessing...</span>
              ) : (
                <>
                  <FolderRegular className="w-5 h-5" />
                  <span>{isNativeSupported ? 'Select Device Folder' : 'Enable Offline Storage'}</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="w-full h-10 rounded-2xl text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              Later
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
