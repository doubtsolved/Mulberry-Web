import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FolderRegular,
  DismissRegular,
  PersonRegular,
  BuildingRegular,
  CheckmarkRegular,
  ArrowRightRegular,
} from '@fluentui/react-icons';
import {
  promptSelectDeviceFolder,
  isFileSystemAccessSupported,
  isAndroidDevice,
  saveUserProfile,
} from '../services/storage';
import { UserProfile } from '../types/catalog';

interface DirectorySetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (folderName: string, profile: UserProfile) => void;
  initialProfile?: UserProfile | null;
  startAtStep?: 1 | 2;
}

const PROF_OPTIONS = ['1st Prof', '2nd Prof', '3rd Prof Part 1', 'Final Prof'];

export const DirectorySetupModal: React.FC<DirectorySetupModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
  initialProfile,
  startAtStep = 1,
}) => {
  const [step, setStep] = useState<1 | 2>(startAtStep);
  const [loading, setLoading] = useState(false);
  const [selectedFolderName, setSelectedFolderName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Profile form state
  const [displayName, setDisplayName] = useState(initialProfile?.displayName || '');
  const [selectedProf, setSelectedProf] = useState(initialProfile?.selectedProf || '1st Prof');
  const [institution, setInstitution] = useState(initialProfile?.institution || '');

  if (!isOpen) return null;

  const isNativeSupported = isFileSystemAccessSupported();
  const isAndroid = isAndroidDevice();

  const handleSelectFolder = async (forceInternal = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await promptSelectDeviceFolder(forceInternal);
      setSelectedFolderName(res.folderName);
      setStep(2);
    } catch (err: unknown) {
      if ((err as Error)?.message !== 'Selection cancelled') {
        // Fall back to device storage gracefully
        try {
          const fallbackRes = await promptSelectDeviceFolder(true);
          setSelectedFolderName(fallbackRes.folderName);
          setStep(2);
        } catch {
          setError('Unable to initialize storage. Please try again.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);
    setError(null);

    const profileData: UserProfile = {
      academicRole: initialProfile?.academicRole || 'Medical Student',
      dailyUploadLimit: initialProfile?.dailyUploadLimit ?? 999,
      displayName: displayName.trim(),
      institution: institution.trim(),
      lastUpdated: Date.now(),
      selectedProf: selectedProf,
      vipBadgeLabel: initialProfile?.vipBadgeLabel || 'Core Architect',
      vipCode: initialProfile?.vipCode || 'MUL1064',
      vipTier: initialProfile?.vipTier || 'CORE_VIP',
    };

    try {
      await saveUserProfile(profileData);
      onCompleted(selectedFolderName, profileData);
      onClose();
    } catch (err: unknown) {
      setError('Failed to save profile. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Scrim */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-neutral-950/50 backdrop-blur-sm"
        />

        {/* Material 3 Expressive Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 340 }}
          className="relative w-full max-w-md rounded-3xl m3-glass p-6 sm:p-8 shadow-2xl border border-neutral-300 dark:border-neutral-700 z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 1
                    ? 'bg-[#7b1e58] text-white dark:bg-[#f6b1d9] dark:text-[#370024]'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                {step === 1 ? '1' : <CheckmarkRegular className="w-4 h-4" />}
              </div>
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Step {step} of 2
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-full transition-colors"
              aria-label="Close"
            >
              <DismissRegular className="w-5 h-5" />
            </button>
          </div>

          {/* STEP 1: Storage Folder Selection */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-5"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#7b1e58]/10 dark:bg-[#f6b1d9]/15 flex items-center justify-center text-[#7b1e58] dark:text-[#f6b1d9]">
                <FolderRegular className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  Storage Location
                </h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                  Choose a device folder where Mulberry will store downloaded books and your .profile configuration.
                </p>
              </div>

              {error && (
                <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl border border-rose-200 dark:border-rose-900">
                  {error}
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleSelectFolder(false)}
                  disabled={loading}
                  className="w-full h-12 rounded-2xl bg-[#7b1e58] hover:bg-[#68194a] active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-[#7b1e58]/20 disabled:opacity-50"
                >
                  <FolderRegular className="w-5 h-5" />
                  <span>
                    {loading
                      ? 'Accessing...'
                      : isAndroid
                      ? 'Choose Device Folder'
                      : isNativeSupported
                      ? 'Select Device Folder'
                      : 'Initialize Device Storage'}
                  </span>
                </button>

                {/* Direct Android/Fallback Storage Option */}
                {isAndroid && (
                  <button
                    onClick={() => handleSelectFolder(true)}
                    disabled={loading}
                    className="w-full h-10 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors border border-neutral-300 dark:border-neutral-700"
                  >
                    Use Mulberry App Storage
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 2: Profile Setup */}
          {step === 2 && (
            <motion.form
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handleSaveProfile}
              className="space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#7b1e58]/10 dark:bg-[#f6b1d9]/15 flex items-center justify-center text-[#7b1e58] dark:text-[#f6b1d9]">
                <PersonRegular className="w-6 h-6" />
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                  Student Profile
                </h2>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                  Saved as .profile in the root of your selected folder.
                </p>
              </div>

              {error && (
                <div className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900">
                  {error}
                </div>
              )}

              {/* Display Name Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Name
                </label>
                <div className="relative">
                  <PersonRegular className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full h-11 pl-9 pr-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7b1e58] dark:focus:ring-[#f6b1d9] font-medium"
                  />
                </div>
              </div>

              {/* Prof Year Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Prof Year
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PROF_OPTIONS.map((prof) => (
                    <button
                      key={prof}
                      type="button"
                      onClick={() => setSelectedProf(prof)}
                      className={`h-10 px-2 rounded-xl text-xs font-semibold transition-all border ${
                        selectedProf === prof
                          ? 'bg-[#7b1e58] text-white border-[#7b1e58] dark:bg-[#f6b1d9] dark:text-[#370024] dark:border-[#f6b1d9] shadow-xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                      }`}
                    >
                      {prof}
                    </button>
                  ))}
                </div>
              </div>

              {/* Institution Input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                  Institution (Optional)
                </label>
                <div className="relative">
                  <BuildingRegular className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Medical College / University"
                    className="w-full h-11 pl-9 pr-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7b1e58] dark:focus:ring-[#f6b1d9] font-medium"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || !displayName.trim()}
                  className="w-full h-12 rounded-2xl bg-[#7b1e58] hover:bg-[#68194a] active:scale-[0.98] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-[#7b1e58]/20 disabled:opacity-50"
                >
                  <span>{loading ? 'Saving...' : 'Complete Setup'}</span>
                  <ArrowRightRegular className="w-4 h-4" />
                </button>
              </div>
            </motion.form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
