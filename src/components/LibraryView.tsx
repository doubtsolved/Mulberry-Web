import React, { useRef } from 'react';
import { ChevronLeftRegular, ChevronRightRegular, ArrowClockwiseRegular } from '@fluentui/react-icons';
import { BookItem } from '../types/catalog';
import { BookCard } from './BookCard';

interface LibraryViewProps {
  sections: Record<string, BookItem[]>;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  downloadedMap: Record<string, boolean>;
  downloadingId: string | null;
  downloadProgress: number;
  onDownload: (book: BookItem) => void;
  onRead: (book: BookItem) => void;
  searchQuery: string;
  selectedProf: string;
  onProfChange: (prof: string) => void;
  availableProfs: string[];
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  sections,
  loading,
  error,
  onRefresh,
  downloadedMap,
  downloadingId,
  downloadProgress,
  onDownload,
  onRead,
  searchQuery,
  selectedProf,
  onProfChange,
  availableProfs,
}) => {
  const scrollContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleScroll = (sectionName: string, direction: 'left' | 'right') => {
    const container = scrollContainerRefs.current[sectionName];
    if (container) {
      const scrollAmount = direction === 'left' ? -420 : 420;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-3 border-[#7b1e58]/30 border-t-[#7b1e58] dark:border-[#f6b1d9]/30 dark:border-t-[#f6b1d9] rounded-full animate-spin mb-4" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading catalog...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center max-w-sm mx-auto">
        <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-4">{error}</p>
        <button
          onClick={onRefresh}
          className="h-10 px-5 rounded-full bg-[#7b1e58] text-white text-xs font-semibold flex items-center gap-2 hover:bg-[#68194a] transition-colors"
        >
          <ArrowClockwiseRegular className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const sectionEntries = Object.entries(sections).filter(([, books]) => books.length > 0);

  if (sectionEntries.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center text-neutral-500">
        <p className="text-sm">No books found{searchQuery ? ` matching "${searchQuery}"` : ''}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-28 pt-4">
      {/* Prof Year Filter Strip */}
      {availableProfs.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-10 lg:px-12 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {availableProfs.map((prof) => {
            const isSelected = selectedProf === prof;
            return (
              <button
                key={prof}
                onClick={() => onProfChange(prof)}
                className={`h-8 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-[#7b1e58] text-white border-[#7b1e58] dark:bg-[#f6b1d9] dark:text-[#370024] dark:border-[#f6b1d9] shadow-xs'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                }`}
              >
                {prof}
              </button>
            );
          })}
          <button
            onClick={() => onProfChange('All')}
            className={`h-8 px-3.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedProf === 'All'
                ? 'bg-[#7b1e58] text-white border-[#7b1e58] dark:bg-[#f6b1d9] dark:text-[#370024] dark:border-[#f6b1d9] shadow-xs'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            All Profs
          </button>
        </div>
      )}

      {sectionEntries.map(([sectionName, books]) => (
        <section key={sectionName} className="relative">
          {/* Section Header */}
          <div className="max-w-7xl mx-auto px-6 sm:px-8 md:px-10 lg:px-12 flex items-baseline justify-between mb-4">
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 dark:text-white">
                {sectionName}
              </h2>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                ({books.length})
              </span>
            </div>

            {/* Scroll buttons for larger screens */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => handleScroll(sectionName, 'left')}
                className="w-8 h-8 rounded-full border border-neutral-300 dark:border-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label={`Scroll ${sectionName} left`}
              >
                <ChevronLeftRegular className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll(sectionName, 'right')}
                className="w-8 h-8 rounded-full border border-neutral-300 dark:border-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label={`Scroll ${sectionName} right`}
              >
                <ChevronRightRegular className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Horizontal Scroller Rail with comfortable left padding */}
          <div
            ref={(el) => {
              scrollContainerRefs.current[sectionName] = el;
            }}
            className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar pl-6 sm:pl-8 md:pl-12 lg:pl-16 pr-6 sm:pr-8 scroll-smooth snap-x snap-mandatory scroll-pl-6 sm:scroll-pl-8 md:scroll-pl-12 lg:scroll-pl-16 py-1"
          >
            {books.map((book) => (
              <div key={book.id} className="snap-start shrink-0">
                <BookCard
                  book={book}
                  isDownloaded={Boolean(downloadedMap[book.id])}
                  isDownloading={downloadingId === book.id}
                  downloadProgress={downloadProgress}
                  onDownload={onDownload}
                  onRead={onRead}
                />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};
