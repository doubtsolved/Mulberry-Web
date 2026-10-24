import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ActiveTab, BookItem, CatalogData, DownloadedBookMeta, DownloadedBooksStore, UserProfile } from './types/catalog';
import { fetchCatalog, groupBooksByType, getBookDownloadUrl } from './services/catalog';
import {
  initializeStorage,
  getDownloadedBooksStore,
  saveDownloadedBooksStore,
  saveBookFile,
  deleteBookFile,
  loadUserProfile,
} from './services/storage';
import { TopBar } from './components/TopBar';
import { BottomNavBar } from './components/BottomNavBar';
import { LibraryView } from './components/LibraryView';
import { DeskView } from './components/DeskView';
import { SettingsView } from './components/SettingsView';
import { DirectorySetupModal } from './components/DirectorySetupModal';
import { PdfReaderScreen } from './components/PdfReaderScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('library');
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [store, setStore] = useState<DownloadedBooksStore>({
    version: 1,
    lastSync: Date.now(),
    folderName: '',
    books: [],
  });

  const [folderName, setFolderName] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [onboardingStartStep, setOnboardingStartStep] = useState<1 | 2>(1);

  const [selectedProfFilter, setSelectedProfFilter] = useState<string>('1st Prof');

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const [activeReadingBook, setActiveReadingBook] = useState<BookItem | DownloadedBookMeta | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Initialize storage, profile & theme on mount
  useEffect(() => {
    // Check dark mode preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }

    async function init() {
      try {
        const storageInfo = await initializeStorage();
        if (storageInfo.isConfigured && storageInfo.folderName) {
          setFolderName(storageInfo.folderName);
        }

        const currentStore = await getDownloadedBooksStore();
        setStore(currentStore);
        if (currentStore.folderName && !storageInfo.folderName) {
          setFolderName(currentStore.folderName);
        }

        const userProf = await loadUserProfile();
        if (userProf) {
          setProfile(userProf);
          if (userProf.selectedProf) {
            setSelectedProfFilter(userProf.selectedProf);
          }
        }

        // If storage is not configured or profile is missing, start onboarding
        if (!storageInfo.isConfigured) {
          setOnboardingStartStep(1);
          setShowFolderModal(true);
        } else if (!userProf) {
          setOnboardingStartStep(2);
          setShowFolderModal(true);
        }
      } catch (err) {
        console.warn('Storage init error:', err);
      }
    }

    init();
  }, []);

  // Theme toggle
  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  // Load catalog from CDN
  const loadCatalogData = useCallback(async (force = false) => {
    try {
      setLoadingCatalog(true);
      setCatalogError(null);
      const data = await fetchCatalog(force);
      setCatalog(data);
    } catch (err: unknown) {
      setCatalogError((err as Error)?.message || 'Failed to load catalog');
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    loadCatalogData();
  }, [loadCatalogData]);

  // Refresh metadata from disk/storage
  const refreshMetadata = async () => {
    try {
      const currentStore = await getDownloadedBooksStore();
      setStore(currentStore);
      const userProf = await loadUserProfile();
      if (userProf) {
        setProfile(userProf);
      }
    } catch {
      // Non-blocking
    }
  };

  // Map of downloaded books for O(1) lookup
  const downloadedMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const b of store.books) {
      map[b.id] = true;
    }
    return map;
  }, [store.books]);

  // Available prof options
  const availableProfs = useMemo(() => {
    if (catalog?.filters?.profs && catalog.filters.profs.length > 0) {
      return catalog.filters.profs;
    }
    return ['1st Prof', '2nd Prof', '3rd Prof Part 1', 'Final Prof'];
  }, [catalog?.filters?.profs]);

  // Filter books by selected prof year & search query
  const filteredBooks = useMemo(() => {
    if (!catalog?.books) return [];

    let list = catalog.books;

    // Filter by selected prof year (unless 'All' is selected)
    if (selectedProfFilter && selectedProfFilter !== 'All') {
      list = list.filter((b) => b.prof === selectedProfFilter || b.prof?.includes(selectedProfFilter));
    }

    // Filter by search query if user entered search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((b) => {
        const titleMatch = b.title?.toLowerCase().includes(q);
        const authorMatch = b.author?.toLowerCase().includes(q);
        const subjectMatch = b.subject?.toLowerCase().includes(q);
        const typeMatch = b.type?.toLowerCase().includes(q);
        const tagMatch = b.tags?.some((t) => t.toLowerCase().includes(q));
        return titleMatch || authorMatch || subjectMatch || typeMatch || tagMatch;
      });
    }

    return list;
  }, [catalog?.books, selectedProfFilter, searchQuery]);

  // Group books by `type` property
  // Any type with at least one book is shown as a section
  const librarySections = useMemo(() => {
    return groupBooksByType(filteredBooks);
  }, [filteredBooks]);

  // Download book handler
  const handleDownload = async (book: BookItem) => {
    if (!folderName) {
      setOnboardingStartStep(1);
      setShowFolderModal(true);
      return;
    }

    const mirror = getBookDownloadUrl(book);
    if (!mirror?.url) {
      alert('Download source not available for this book.');
      return;
    }

    try {
      setDownloadingId(book.id);
      setDownloadProgress(20);

      // Fetch the binary file
      const response = await fetch(mirror.url);
      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status}`);
      }
      setDownloadProgress(60);

      const arrayBuffer = await response.arrayBuffer();
      setDownloadProgress(85);

      // Save encrypted .bin to root of selected folder
      await saveBookFile(book.id, arrayBuffer);

      // Update downloaded_books.json in root of selected folder
      const meta: DownloadedBookMeta = {
        id: book.id,
        title: book.title,
        author: book.author,
        type: book.type,
        sizeMb: book.sizeMb || Math.round((arrayBuffer.byteLength / (1024 * 1024)) * 10) / 10,
        totalPages: book.totalPages || 0,
        coverUrl: book.coverUrl || '',
        filename: `${book.id}.bin`,
        downloadedAt: Date.now(),
        lastReadPage: 1,
      };

      const updatedStore: DownloadedBooksStore = {
        ...store,
        lastSync: Date.now(),
        books: [meta, ...store.books.filter((b) => b.id !== book.id)],
      };

      await saveDownloadedBooksStore(updatedStore);
      setStore(updatedStore);
      setDownloadProgress(100);
    } catch (err: unknown) {
      alert((err as Error)?.message || 'Failed to download book');
    } finally {
      setTimeout(() => {
        setDownloadingId(null);
        setDownloadProgress(0);
      }, 400);
    }
  };

  // Delete book handler
  const handleDeleteBook = async (bookId: string) => {
    try {
      await deleteBookFile(bookId);
      setStore((prev) => ({
        ...prev,
        books: prev.books.filter((b) => b.id !== bookId),
      }));
    } catch (err) {
      console.warn('Failed to delete book:', err);
    }
  };

  // Page reading update
  const handlePageUpdate = (bookId: string, pageNumber: number) => {
    setStore((prev) => ({
      ...prev,
      books: prev.books.map((b) => (b.id === bookId ? { ...b, lastReadPage: pageNumber } : b)),
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf8f9] dark:bg-[#151214] text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* Top Bar */}
      <TopBar
        folderName={folderName}
        onOpenFolderModal={() => {
          setOnboardingStartStep(1);
          setShowFolderModal(true);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        showSearch={showSearch}
        onToggleSearch={() => {
          setShowSearch((prev) => !prev);
          if (showSearch) setSearchQuery('');
        }}
      />

      {/* Main Tabs Content */}
      <main className="flex-1 w-full">
        <AnimatePresence mode="wait">
          {activeTab === 'library' && (
            <motion.div
              key="library"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <LibraryView
                sections={librarySections}
                loading={loadingCatalog}
                error={catalogError}
                onRefresh={() => loadCatalogData(true)}
                downloadedMap={downloadedMap}
                downloadingId={downloadingId}
                downloadProgress={downloadProgress}
                onDownload={handleDownload}
                onRead={(book) => setActiveReadingBook(book)}
                searchQuery={searchQuery}
                selectedProf={selectedProfFilter}
                onProfChange={setSelectedProfFilter}
                availableProfs={availableProfs}
              />
            </motion.div>
          )}

          {activeTab === 'desk' && (
            <motion.div
              key="desk"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <DeskView
                books={store.books}
                onRead={(book) => setActiveReadingBook(book)}
                onDelete={handleDeleteBook}
                onNavigateToLibrary={() => setActiveTab('library')}
                folderName={folderName}
                profile={profile}
              />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <SettingsView
                folderName={folderName}
                onChangeFolder={() => {
                  setOnboardingStartStep(1);
                  setShowFolderModal(true);
                }}
                store={store}
                onRefreshMetadata={refreshMetadata}
                isDark={isDark}
                onToggleTheme={handleToggleTheme}
                profile={profile}
                onEditProfile={() => {
                  setOnboardingStartStep(2);
                  setShowFolderModal(true);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        shelfCount={store.books.length}
      />

      {/* Multi-Step Setup Modal */}
      <DirectorySetupModal
        isOpen={showFolderModal}
        onClose={() => setShowFolderModal(false)}
        startAtStep={onboardingStartStep}
        initialProfile={profile}
        onCompleted={(name, prof) => {
          if (name) setFolderName(name);
          setProfile(prof);
          if (prof.selectedProf) {
            setSelectedProfFilter(prof.selectedProf);
          }
          refreshMetadata();
        }}
      />

      {/* Fullscreen PDF Reader Screen */}
      <AnimatePresence>
        {activeReadingBook && (
          <PdfReaderScreen
            book={activeReadingBook}
            onClose={() => setActiveReadingBook(null)}
            onPageUpdate={handlePageUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
