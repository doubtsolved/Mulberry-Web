import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ArrowLeftRegular,
  ChevronLeftRegular,
  ChevronRightRegular,
  DocumentRegular,
  DocumentMultipleRegular,
  ZoomInRegular,
  ZoomOutRegular,
  FullScreenMaximizeRegular,
  FullScreenMinimizeRegular,
} from '@fluentui/react-icons';
import { BookItem, DownloadedBookMeta } from '../types/catalog';
import { decryptBookBinary } from '../services/crypto';
import { loadBookFile, getDownloadedBooksStore, saveDownloadedBooksStore } from '../services/storage';
import { getBookDownloadUrl } from '../services/catalog';

// Initialize PDF.js worker
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface PdfReaderScreenProps {
  book: BookItem | DownloadedBookMeta;
  onClose: () => void;
  onPageUpdate?: (bookId: string, pageNumber: number) => void;
}

export const PdfReaderScreen: React.FC<PdfReaderScreenProps> = ({
  book,
  onClose,
  onPageUpdate,
}) => {
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState<string>('Decrypting book...');
  const [error, setError] = useState<string | null>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  // Layout mode: 'single' | 'dual'
  const [layoutMode, setLayoutMode] = useState<'single' | 'dual'>('single');
  const [scale, setScale] = useState(1.1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Bottom scroller bar interaction
  const [sliderHoverPage, setSliderHoverPage] = useState<number | null>(null);
  const [jumpPageInput, setJumpPageInput] = useState('');
  const [showJumpDialog, setShowJumpDialog] = useState(false);

  const canvasRef1 = useRef<HTMLCanvasElement | null>(null);
  const canvasRef2 = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef1 = useRef<pdfjsLib.RenderTask | null>(null);
  const renderTaskRef2 = useRef<pdfjsLib.RenderTask | null>(null);

  // Load and decrypt book binary
  useEffect(() => {
    let isCancelled = false;

    async function loadAndDecrypt() {
      try {
        setLoading(true);
        setLoadingStatus('Preparing binary...');

        let rawBuffer: ArrayBuffer;

        // Try reading from local device folder first
        try {
          rawBuffer = await loadBookFile(book.id);
        } catch {
          // If not in local folder, fetch from download mirror
          const mirrorInfo = 'download' in book ? getBookDownloadUrl(book as BookItem) : null;
          if (!mirrorInfo?.url) {
            throw new Error('Book file not found locally and no download source available.');
          }
          setLoadingStatus('Downloading stream...');
          const response = await fetch(mirrorInfo.url);
          if (!response.ok) {
            throw new Error(`Failed to fetch book binary: ${response.status}`);
          }
          rawBuffer = await response.arrayBuffer();
        }

        if (isCancelled) return;

        setLoadingStatus('Decrypting AES-256-GCM cipher...');
        const decryptedPdfBuffer = await decryptBookBinary(rawBuffer);

        if (isCancelled) return;

        setLoadingStatus('Rendering PDF document...');
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(decryptedPdfBuffer),
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);

        // Resume last read page if recorded
        const store = await getDownloadedBooksStore();
        const savedMeta = store.books.find((b) => b.id === book.id);
        if (savedMeta?.lastReadPage && savedMeta.lastReadPage <= doc.numPages) {
          setCurrentPage(savedMeta.lastReadPage);
        } else {
          setCurrentPage(1);
        }

        setLoading(false);
      } catch (err: unknown) {
        if (!isCancelled) {
          setError((err as Error)?.message || 'Failed to open book');
          setLoading(false);
        }
      }
    }

    loadAndDecrypt();

    return () => {
      isCancelled = true;
    };
  }, [book]);

  // Page persistence handler
  const saveProgress = useCallback(
    async (page: number) => {
      try {
        const store = await getDownloadedBooksStore();
        const existing = store.books.find((b) => b.id === book.id);
        if (existing) {
          existing.lastReadPage = page;
          await saveDownloadedBooksStore(store);
        }
        if (onPageUpdate) {
          onPageUpdate(book.id, page);
        }
      } catch {
        // Non-blocking
      }
    },
    [book.id, onPageUpdate]
  );

  // Render page onto canvas
  const renderPage = useCallback(
    async (
      pageNumber: number,
      canvas: HTMLCanvasElement | null,
      taskRef: React.MutableRefObject<pdfjsLib.RenderTask | null>
    ) => {
      if (!pdfDoc || !canvas || pageNumber > totalPages || pageNumber < 1) return;

      if (taskRef.current) {
        try {
          taskRef.current.cancel();
        } catch {
          // Ignore cancellation error
        }
      }

      try {
        const page = await pdfDoc.getPage(pageNumber);
        const pixelRatio = window.devicePixelRatio || 1.5;
        const viewport = page.getViewport({ scale: scale * pixelRatio });

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / pixelRatio)}px`;
        canvas.style.height = `${Math.floor(viewport.height / pixelRatio)}px`;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const renderContext = {
          canvas,
          canvasContext: ctx,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        taskRef.current = renderTask;
        await renderTask.promise;
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'RenderingCancelledException') {
          console.warn('Canvas render error:', err);
        }
      }
    },
    [pdfDoc, scale, totalPages]
  );

  // Trigger render when page, layout, scale, or document updates
  useEffect(() => {
    if (!pdfDoc) return;

    renderPage(currentPage, canvasRef1.current, renderTaskRef1);

    if (layoutMode === 'dual' && currentPage + 1 <= totalPages) {
      renderPage(currentPage + 1, canvasRef2.current, renderTaskRef2);
    }

    saveProgress(currentPage);
  }, [pdfDoc, currentPage, layoutMode, scale, totalPages, renderPage, saveProgress]);

  // Page navigation helpers
  const goToNextPage = () => {
    const step = layoutMode === 'dual' ? 2 : 1;
    setCurrentPage((prev) => Math.min(totalPages, prev + step));
  };

  const goToPrevPage = () => {
    const step = layoutMode === 'dual' ? 2 : 1;
    setCurrentPage((prev) => Math.max(1, prev - step));
  };

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPageInput, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      setShowJumpDialog(false);
      setJumpPageInput('');
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showJumpDialog) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        goToNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPrevPage();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#121012] text-neutral-100 flex flex-col select-none overflow-hidden"
    >
      {/* Top Header Bar */}
      <header className="h-14 px-4 m3-glass border-b border-white/10 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Back"
          >
            <ArrowLeftRegular className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-semibold truncate text-white">{book.title}</h1>
            <p className="text-[11px] text-neutral-400 truncate">{book.author}</p>
          </div>
        </div>

        {/* View mode & fullscreen controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setLayoutMode((m) => (m === 'single' ? 'dual' : 'single'))}
            className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors ${
              layoutMode === 'dual'
                ? 'bg-[#f6b1d9] text-[#370024] font-semibold'
                : 'bg-white/10 text-neutral-200 hover:bg-white/15'
            }`}
            title={layoutMode === 'single' ? 'Switch to Dual Spread' : 'Switch to Single Page'}
          >
            {layoutMode === 'single' ? (
              <>
                <DocumentMultipleRegular className="w-4 h-4" />
                <span className="hidden sm:inline">Dual</span>
              </>
            ) : (
              <>
                <DocumentRegular className="w-4 h-4" />
                <span className="hidden sm:inline">Single</span>
              </>
            )}
          </button>

          <button
            onClick={toggleFullscreen}
            className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <FullScreenMinimizeRegular className="w-4 h-4" />
            ) : (
              <FullScreenMaximizeRegular className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Main Reader Viewport */}
      <main className="flex-1 overflow-auto flex items-center justify-center p-3 sm:p-6 relative">
        {loading ? (
          <div className="flex flex-col items-center justify-center text-center p-6">
            <div className="w-10 h-10 border-3 border-[#f6b1d9]/20 border-t-[#f6b1d9] rounded-full animate-spin mb-4" />
            <p className="text-xs text-neutral-400 tracking-wide">{loadingStatus}</p>
          </div>
        ) : error ? (
          <div className="max-w-md p-6 rounded-3xl m3-glass border border-rose-500/30 text-center">
            <p className="text-sm text-rose-300 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
            >
              Exit
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-4 max-w-full">
            {/* Page 1 (or Left spread) */}
            <div className="shadow-2xl rounded-lg overflow-hidden bg-white max-w-full">
              <canvas ref={canvasRef1} className="block mx-auto max-h-[calc(100vh-140px)] w-auto" />
            </div>

            {/* Page 2 (Facing page in Dual spread mode) */}
            {layoutMode === 'dual' && currentPage + 1 <= totalPages && (
              <div className="shadow-2xl rounded-lg overflow-hidden bg-white max-w-full hidden md:block">
                <canvas ref={canvasRef2} className="block mx-auto max-h-[calc(100vh-140px)] w-auto" />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Material 3 Expressive Bottom Page Scroller Bar */}
      {!loading && !error && totalPages > 0 && (
        <footer className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 w-[94%] max-w-xl select-none">
          <div className="m3-glass rounded-full px-4 py-2.5 shadow-2xl border border-white/15 flex items-center justify-between gap-3 backdrop-blur-2xl">
            {/* Prev Page Button */}
            <button
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-200 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors shrink-0"
              aria-label="Previous Page"
            >
              <ChevronLeftRegular className="w-5 h-5" />
            </button>

            {/* Center Expressive Scroller Slider */}
            <div className="flex-1 flex flex-col justify-center px-1 relative">
              {/* Floating page preview tooltip while dragging/hovering */}
              {sliderHoverPage !== null && (
                <div
                  className="absolute -top-9 px-2 py-0.5 rounded-full bg-[#f6b1d9] text-[#370024] text-[10px] font-bold tabular-nums -translate-x-1/2 shadow-md pointer-events-none"
                  style={{
                    left: `${((sliderHoverPage - 1) / Math.max(1, totalPages - 1)) * 100}%`,
                  }}
                >
                  p. {sliderHoverPage}
                </div>
              )}

              <input
                type="range"
                min={1}
                max={totalPages}
                value={currentPage}
                onMouseEnter={() => setSliderHoverPage(currentPage)}
                onMouseLeave={() => setSliderHoverPage(null)}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setCurrentPage(val);
                  setSliderHoverPage(val);
                }}
                className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#f6b1d9] transition-all"
              />
            </div>

            {/* Next Page Button */}
            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 rounded-full flex items-center justify-center text-neutral-200 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors shrink-0"
              aria-label="Next Page"
            >
              <ChevronRightRegular className="w-5 h-5" />
            </button>

            {/* Page Count Chip / Jump trigger */}
            <button
              onClick={() => {
                setJumpPageInput(String(currentPage));
                setShowJumpDialog(true);
              }}
              title="Click to jump to page"
              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-semibold tabular-nums text-neutral-200 transition-colors shrink-0"
            >
              {layoutMode === 'dual' && currentPage + 1 <= totalPages
                ? `${currentPage}-${currentPage + 1} / ${totalPages}`
                : `${currentPage} / ${totalPages}`}
            </button>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1 border-l border-white/10 pl-2 shrink-0">
              <button
                onClick={() => setScale((s) => Math.max(0.7, s - 0.15))}
                className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Zoom Out"
              >
                <ZoomOutRegular className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
                className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
                title="Zoom In"
              >
                <ZoomInRegular className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Jump to Page Dialog */}
      <AnimatePresence>
        {showJumpDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowJumpDialog(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.form
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onSubmit={handleJumpToPage}
              className="relative z-10 w-full max-w-xs m3-glass p-5 rounded-3xl border border-white/20 shadow-2xl text-center"
            >
              <h3 className="text-sm font-semibold mb-3 text-white">Jump to Page</h3>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={jumpPageInput}
                onChange={(e) => setJumpPageInput(e.target.value)}
                autoFocus
                className="w-24 h-11 text-center text-lg font-bold bg-white/10 border border-white/20 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-[#f6b1d9] mb-4"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowJumpDialog(false)}
                  className="flex-1 h-9 rounded-full bg-white/10 text-xs font-medium text-neutral-300 hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-9 rounded-full bg-[#f6b1d9] text-[#370024] text-xs font-semibold hover:bg-[#ffc6e4] transition-colors"
                >
                  Go
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
