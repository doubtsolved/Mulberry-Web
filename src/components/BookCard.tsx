import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowDownloadRegular,
  CheckmarkRegular,
  BookOpenRegular,
  DocumentRegular,
} from '@fluentui/react-icons';
import { BookItem } from '../types/catalog';

interface BookCardProps {
  book: BookItem;
  isDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress?: number;
  onDownload: (book: BookItem) => void;
  onRead: (book: BookItem) => void;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  isDownloaded,
  isDownloading,
  downloadProgress,
  onDownload,
  onRead,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="group flex flex-col w-[170px] sm:w-[190px] shrink-0 select-none"
    >
      {/* Cover Container */}
      <div
        onClick={() => (isDownloaded ? onRead(book) : onDownload(book))}
        className="relative w-full aspect-[3/4.2] rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 shadow-md transition-shadow group-hover:shadow-xl cursor-pointer border border-neutral-200/50 dark:border-neutral-700/50"
      >
        {!imgError && book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full p-4 flex flex-col justify-between bg-gradient-to-br from-[#7b1e58]/20 to-[#ffd8ec]/30 dark:from-[#5f0340]/40 dark:to-[#1f1b1e]">
            <DocumentRegular className="w-8 h-8 text-[#7b1e58] dark:text-[#f6b1d9]" />
            <div>
              <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 line-clamp-3">
                {book.title}
              </p>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1 truncate">
                {book.author}
              </p>
            </div>
          </div>
        )}

        {/* Status Overlay Badge - strictly unboxed or minimal icon overlay */}
        <div className="absolute top-2 right-2">
          {isDownloaded ? (
            <div className="w-7 h-7 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md shadow-sm flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckmarkRegular className="w-4 h-4" />
            </div>
          ) : isDownloading ? (
            <div className="w-7 h-7 rounded-full bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md shadow-sm flex items-center justify-center text-[#7b1e58] dark:text-[#f6b1d9]">
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            </div>
          ) : null}
        </div>

        {/* Downloading progress bar at bottom of card */}
        {isDownloading && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div
              className="h-full bg-[#7b1e58] dark:bg-[#f6b1d9] transition-all duration-200"
              style={{ width: `${downloadProgress || 30}%` }}
            />
          </div>
        )}
      </div>

      {/* Meta Prose: Zero-Pill Discipline */}
      <div className="mt-2.5 px-0.5">
        <h3
          title={book.title}
          onClick={() => (isDownloaded ? onRead(book) : onDownload(book))}
          className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-2 cursor-pointer hover:text-[#7b1e58] dark:hover:text-[#f6b1d9] transition-colors leading-snug"
        >
          {book.title}
        </h3>

        {/* Clean unboxed metadata with · separator */}
        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 truncate">
          <span className="truncate">{book.author || 'Medical Faculty'}</span>
          {book.sizeMb !== undefined && (
            <>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums shrink-0">{book.sizeMb} MB</span>
            </>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-2">
          {isDownloaded ? (
            <button
              onClick={() => onRead(book)}
              className="w-full h-8 rounded-full bg-[#ffd8ec] dark:bg-[#5f0340] text-[#370024] dark:text-[#ffd8ec] hover:bg-[#ffc6e4] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <BookOpenRegular className="w-4 h-4" />
              <span>Read</span>
            </button>
          ) : (
            <button
              onClick={() => onDownload(book)}
              disabled={isDownloading}
              className="w-full h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <ArrowDownloadRegular className="w-4 h-4" />
              <span>{isDownloading ? 'Saving...' : 'Download'}</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
