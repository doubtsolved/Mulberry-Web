import React from 'react';
import { motion } from 'motion/react';
import {
  BookOpenRegular,
  DeleteRegular,
  DocumentRegular,
  LibraryRegular,
} from '@fluentui/react-icons';
import { DownloadedBookMeta } from '../types/catalog';

interface DeskViewProps {
  books: DownloadedBookMeta[];
  onRead: (book: DownloadedBookMeta) => void;
  onDelete: (bookId: string) => void;
  onNavigateToLibrary: () => void;
  folderName: string;
}

export const DeskView: React.FC<DeskViewProps> = ({
  books,
  onRead,
  onDelete,
  onNavigateToLibrary,
  folderName,
}) => {
  // Group downloaded books by type
  const groupedByType: Record<string, DownloadedBookMeta[]> = {};
  for (const book of books) {
    const type = (book.type || 'Other').trim();
    if (!groupedByType[type]) {
      groupedByType[type] = [];
    }
    groupedByType[type].push(book);
  }

  const typeSections = Object.entries(groupedByType);

  if (books.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto select-none">
        <div className="w-16 h-16 rounded-3xl bg-[#7b1e58]/10 dark:bg-[#f6b1d9]/10 flex items-center justify-center text-[#7b1e58] dark:text-[#f6b1d9] mb-4">
          <BookOpenRegular className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2">
          Shelf is Empty
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 leading-relaxed">
          Downloaded books stored in <span className="font-semibold text-neutral-800 dark:text-neutral-200">{folderName}</span> will appear here for offline reading.
        </p>
        <button
          onClick={onNavigateToLibrary}
          className="h-11 px-6 rounded-full bg-[#7b1e58] hover:bg-[#68194a] text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-md shadow-[#7b1e58]/20"
        >
          <LibraryRegular className="w-4 h-4" />
          <span>Browse Library</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-28 space-y-10">
      {/* Shelf Header */}
      <div className="flex items-baseline justify-between border-b border-neutral-200/60 dark:border-neutral-800/60 pb-3">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Shelf
          </h1>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
            ({books.length} {books.length === 1 ? 'book' : 'books'})
          </span>
        </div>
      </div>

      {/* Sections by type */}
      {typeSections.map(([type, items]) => (
        <section key={type} className="space-y-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-bold tracking-tight text-neutral-800 dark:text-neutral-200">
              {type}
            </h2>
            <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
              ({items.length})
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((book) => {
              const readPercent =
                book.totalPages && book.lastReadPage
                  ? Math.round((book.lastReadPage / book.totalPages) * 100)
                  : 0;

              return (
                <motion.div
                  key={book.id}
                  whileHover={{ y: -3 }}
                  transition={{ duration: 0.16 }}
                  className="flex flex-col group select-none"
                >
                  {/* Cover */}
                  <div
                    onClick={() => onRead(book)}
                    className="relative aspect-[3/4.2] rounded-2xl overflow-hidden bg-neutral-200 dark:bg-neutral-800 shadow-md group-hover:shadow-xl cursor-pointer border border-neutral-200/50 dark:border-neutral-700/50 transition-all"
                  >
                    {book.coverUrl ? (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full p-3 flex flex-col justify-between bg-gradient-to-br from-[#7b1e58]/20 to-[#ffd8ec]/30 dark:from-[#5f0340]/40 dark:to-[#1f1b1e]">
                        <DocumentRegular className="w-8 h-8 text-[#7b1e58] dark:text-[#f6b1d9]" />
                        <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-100 line-clamp-3">
                          {book.title}
                        </p>
                      </div>
                    )}

                    {/* Progress indicator */}
                    {readPercent > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
                        <div
                          className="h-full bg-[#7b1e58] dark:bg-[#f6b1d9]"
                          style={{ width: `${readPercent}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div className="mt-2">
                    <h3
                      onClick={() => onRead(book)}
                      title={book.title}
                      className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white line-clamp-2 cursor-pointer hover:text-[#7b1e58] dark:hover:text-[#f6b1d9] leading-snug transition-colors"
                    >
                      {book.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 truncate">
                      <span className="truncate">{book.author}</span>
                      {book.lastReadPage > 1 && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums shrink-0">p. {book.lastReadPage}</span>
                        </>
                      )}
                    </div>

                    {/* Action Row */}
                    <div className="mt-2.5 flex items-center gap-1.5">
                      <button
                        onClick={() => onRead(book)}
                        className="flex-1 h-8 rounded-full bg-[#ffd8ec] dark:bg-[#5f0340] text-[#370024] dark:text-[#ffd8ec] hover:bg-[#ffc6e4] text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                      >
                        <BookOpenRegular className="w-3.5 h-3.5" />
                        <span>Read</span>
                      </button>

                      <button
                        onClick={() => onDelete(book.id)}
                        title="Delete from device"
                        className="w-8 h-8 rounded-full text-neutral-400 hover:text-rose-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center transition-colors shrink-0"
                      >
                        <DeleteRegular className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};
