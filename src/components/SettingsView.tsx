import React, { useState } from 'react';
import {
  FolderRegular,
  ArrowClockwiseRegular,
  DocumentRegular,
  CheckmarkRegular,
} from '@fluentui/react-icons';
import { DownloadedBooksStore } from '../types/catalog';
import { isFileSystemAccessSupported } from '../services/storage';

interface SettingsViewProps {
  folderName: string;
  onChangeFolder: () => void;
  store: DownloadedBooksStore;
  onRefreshMetadata: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  folderName,
  onChangeFolder,
  store,
  onRefreshMetadata,
  isDark,
  onToggleTheme,
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const totalMb = store.books.reduce((acc, b) => acc + (b.sizeMb || 0), 0);
  const isNative = isFileSystemAccessSupported();

  const handleCopyMeta = () => {
    navigator.clipboard.writeText(JSON.stringify(store, null, 2));
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-28 space-y-8 select-none">
      <div className="border-b border-neutral-200/60 dark:border-neutral-800/60 pb-3">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
          Settings
        </h1>
      </div>

      {/* Storage Section */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">
          Device Storage
        </h2>

        <div className="p-5 rounded-3xl m3-glass border border-neutral-200/60 dark:border-neutral-800/60 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#7b1e58]/10 dark:bg-[#f6b1d9]/10 flex items-center justify-center text-[#7b1e58] dark:text-[#f6b1d9] shrink-0">
                <FolderRegular className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Target Folder</p>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                  {folderName || 'Internal Storage'}
                </p>
              </div>
            </div>

            <button
              onClick={onChangeFolder}
              className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-semibold text-neutral-800 dark:text-neutral-200 transition-colors shrink-0"
            >
              {isNative ? 'Change Folder' : 'Configure'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-200/40 dark:border-neutral-800/40 text-xs">
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">Downloaded Books:</span>
              <p className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums mt-0.5">
                {store.books.length}
              </p>
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-400">Storage Used:</span>
              <p className="font-semibold text-neutral-800 dark:text-neutral-200 tabular-nums mt-0.5">
                {totalMb.toFixed(1)} MB
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Metadata & Encryption */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">
          Decryption & Metadata
        </h2>

        <div className="p-5 rounded-3xl m3-glass border border-neutral-200/60 dark:border-neutral-800/60 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                AES-256-GCM Decryption
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                In-memory hardware accelerated Web Crypto
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Active
            </span>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-neutral-200/40 dark:border-neutral-800/40">
            <div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">
                downloaded_books.json
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Root metadata file in selected folder
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onRefreshMetadata}
                title="Rescan metadata"
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300 transition-colors"
              >
                <ArrowClockwiseRegular className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopyMeta}
                title="Copy JSON metadata"
                className="px-3 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-colors flex items-center gap-1.5"
              >
                {copiedKey ? <CheckmarkRegular className="w-3.5 h-3.5 text-emerald-500" /> : <DocumentRegular className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'Copied' : 'JSON'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold tracking-wide text-neutral-500 dark:text-neutral-400">
          Appearance
        </h2>

        <div className="p-5 rounded-3xl m3-glass border border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">Dark Mode</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              Material 3 tonal theme
            </p>
          </div>
          <button
            onClick={onToggleTheme}
            className={`w-12 h-7 rounded-full p-1 transition-colors ${
              isDark ? 'bg-[#7b1e58]' : 'bg-neutral-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                isDark ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>
    </div>
  );
};
