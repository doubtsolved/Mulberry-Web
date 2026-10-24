import React from 'react';
import { SearchRegular, DismissRegular, FolderRegular } from '@fluentui/react-icons';

interface TopBarProps {
  folderName: string;
  onOpenFolderModal: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showSearch: boolean;
  onToggleSearch: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  folderName,
  onOpenFolderModal,
  searchQuery,
  onSearchChange,
  showSearch,
  onToggleSearch,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full m3-glass border-b border-neutral-300 dark:border-neutral-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xl font-bold tracking-tight text-[#7b1e58] dark:text-[#f6b1d9] select-none">
            Mulberry
          </span>
        </div>

        {/* Zone 2: Search input or minimal center space */}
        <div className="flex-1 max-w-md mx-2">
          {showSearch ? (
            <div className="relative flex items-center w-full">
              <SearchRegular className="absolute left-3 w-4 h-4 text-neutral-600 dark:text-neutral-300" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search titles, authors, subjects..."
                autoFocus
                className="w-full h-10 pl-9 pr-8 rounded-full bg-neutral-100 dark:bg-neutral-800 text-sm text-neutral-900 dark:text-neutral-50 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#7b1e58] dark:focus:ring-[#f6b1d9] transition-all border border-neutral-300 dark:border-neutral-700 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 p-1 text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                >
                  <DismissRegular className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : null}
        </div>

        {/* Zone 3: Storage indicator & Search toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleSearch}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              showSearch
                ? 'bg-[#7b1e58] text-white dark:bg-[#f6b1d9] dark:text-[#370024]'
                : 'text-neutral-800 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-800'
            }`}
            aria-label="Toggle search"
          >
            {showSearch ? <DismissRegular className="w-5 h-5" /> : <SearchRegular className="w-5 h-5" />}
          </button>

          <button
            onClick={onOpenFolderModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-neutral-800 dark:text-neutral-100 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 transition-colors border border-neutral-300 dark:border-neutral-700 max-w-[160px] truncate"
            title={`Active folder: ${folderName || 'Configure Storage'}`}
          >
            <FolderRegular className="w-4 h-4 shrink-0 text-[#7b1e58] dark:text-[#f6b1d9]" />
            <span className="truncate">{folderName || 'Storage'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
