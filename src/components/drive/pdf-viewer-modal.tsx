import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Maximize2,
  RefreshCw,
  Minimize2,
} from "lucide-react";
import { DriveFile } from "@/lib/telegram/indexer";
import { loadPdfFromTelegram, pdfjsLib, PdfLoadProgress } from "@/lib/pdf/pdf-loader";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import { toast } from "sonner";

interface PdfViewerModalProps {
  file: DriveFile | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (file: DriveFile) => void;
}

// -------------------------------------------------------------
// Real Miniature Thumbnail Component for the Sidebar
// -------------------------------------------------------------
interface PdfThumbnailItemProps {
  pageNumber: number;
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  isActive: boolean;
  rotation: number;
  onClick: () => void;
}

const PdfThumbnailItem = memo<PdfThumbnailItemProps>(({
  pageNumber,
  pdfDoc,
  isActive,
  rotation,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLButtonElement | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isNear, setIsNear] = useState(false);

  // Lazy render thumbnail when scrolled near
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsNear(true);
        }
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isNear || !pdfDoc) return;
    let active = true;

    const renderThumbnail = async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (!active) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const baseVp = page.getViewport({ scale: 1, rotation });
        const thumbWidth = 120;
        const scale = thumbWidth / baseVp.width;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const vp = page.getViewport({ scale: scale * dpr, rotation });

        canvas.width = vp.width;
        canvas.height = vp.height;
        canvas.style.width = `${vp.width / dpr}px`;
        canvas.style.height = `${vp.height / dpr}px`;

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        await page.render({ canvasContext: ctx, viewport: vp } as any).promise;
        if (active) setIsRendered(true);
      } catch {
        // Cancelled or errored
      }
    };

    renderThumbnail();
    return () => {
      active = false;
    };
  }, [isNear, pdfDoc, pageNumber, rotation]);

  return (
    <button
      ref={containerRef}
      onClick={onClick}
      className={`group relative flex flex-col items-center p-2 rounded-[4px] border transition-all ${
        isActive
          ? "border-[#c49b56] bg-[#c49b56]/10 shadow-[0_2px_12px_rgba(0,0,0,0.5)]"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.05]"
      }`}
    >
      <div className="relative overflow-hidden rounded-[2px] bg-white shadow-sm flex items-center justify-center min-h-[140px] w-[120px]">
        <canvas
          ref={canvasRef}
          className={`block transition-opacity duration-200 ${
            isRendered ? "opacity-100" : "opacity-0"
          }`}
        />
        {!isRendered && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#18181b] text-zinc-600 font-mono text-[10px]">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
          </div>
        )}
      </div>
      <span
        className={`text-[10px] font-mono mt-1.5 ${
          isActive ? "text-[#e6cfa3] font-medium" : "text-zinc-500 group-hover:text-zinc-300"
        }`}
      >
        {pageNumber}
      </span>
    </button>
  );
});

PdfThumbnailItem.displayName = "PdfThumbnailItem";

// -------------------------------------------------------------
// Real Continuous Scroll Page Component (Natural Aspect Ratio)
// -------------------------------------------------------------
interface PdfPageItemProps {
  pageNumber: number;
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  scale: number;
  rotation: number;
  onVisible: (pageNumber: number) => void;
}

const PdfPageItem = memo<PdfPageItemProps>(({
  pageNumber,
  pdfDoc,
  scale,
  rotation,
  onVisible,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isNearViewport, setIsNearViewport] = useState(false);

  // Measure natural page dimensions on scale / rotation change
  useEffect(() => {
    let active = true;
    pdfDoc.getPage(pageNumber).then((p) => {
      if (!active) return;
      const vp = p.getViewport({ scale, rotation });
      setDimensions({ width: Math.floor(vp.width), height: Math.floor(vp.height) });
    }).catch(() => {});
    return () => {
      active = false;
    };
  }, [pdfDoc, pageNumber, scale, rotation]);

  // Near viewport observer: pre-render when within 800px
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsNearViewport(true);
        }
      },
      { rootMargin: "800px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Dominant visible page observer for scroll tracking
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && entries[0].intersectionRatio >= 0.4) {
          onVisible(pageNumber);
        }
      },
      { threshold: [0.4] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNumber, onVisible]);

  // Render high-DPI Canvas
  useEffect(() => {
    if (!isNearViewport || !pdfDoc) return;
    let isCancelled = false;

    const render = async () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
          renderTaskRef.current = null;
        }

        const page = await pdfDoc.getPage(pageNumber);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const viewport = page.getViewport({ scale: scale * dpr, rotation });
        const cssWidth = Math.floor(viewport.width / dpr);
        const cssHeight = Math.floor(viewport.height / dpr);

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${cssHeight}px`;

        setDimensions({ width: cssWidth, height: cssHeight });

        const ctx = canvas.getContext("2d", { alpha: false });
        if (!ctx) return;

        const task = page.render({
          canvasContext: ctx,
          viewport,
        } as any);

        renderTaskRef.current = task;
        await task.promise;
        renderTaskRef.current = null;
        if (!isCancelled) {
          setIsRendered(true);
        }
      } catch (err: any) {
        if (err?.name !== "RenderingCancelledException") {
          console.error(`[PdfViewer] Error on page ${pageNumber}:`, err);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
        renderTaskRef.current = null;
      }
    };
  }, [isNearViewport, pdfDoc, pageNumber, scale, rotation]);

  return (
    <div
      ref={containerRef}
      id={`pdf-page-${pageNumber}`}
      className="flex flex-col items-center my-4 select-none"
    >
      <div
        style={{
          width: dimensions ? `${dimensions.width}px` : "auto",
          height: dimensions ? `${dimensions.height}px` : "auto",
        }}
        className="relative bg-white shadow-[0_6px_25px_rgba(0,0,0,0.65)] border border-black/10 rounded-[1px] overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className={`block transition-opacity duration-150 ${
            isRendered ? "opacity-100" : "opacity-0"
          }`}
        />
        {!isRendered && dimensions && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#18181b] text-zinc-500 font-mono text-xs">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            <span>Page {pageNumber}</span>
          </div>
        )}
      </div>

      <div className="text-[10px] font-mono text-zinc-500 mt-2 select-none">
        Page {pageNumber}
      </div>
    </div>
  );
});

PdfPageItem.displayName = "PdfPageItem";

// -------------------------------------------------------------
// Main Chrome-Style PDF Reader Modal
// -------------------------------------------------------------
export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  file,
  isOpen,
  onClose,
  onDownload,
}) => {
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInput, setPageInput] = useState<string>("1");
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingProgress, setLoadingProgress] = useState<PdfLoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCopiedRef, setIsCopiedRef] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Load Document
  const loadDocument = useCallback(async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    setLoadingProgress(null);
    setPdfDoc(null);
    setCurrentPage(1);
    setPageInput("1");

    try {
      const doc = await loadPdfFromTelegram(file, (progress) => {
        setLoadingProgress(progress);
      });

      setPdfDoc(doc);
      setNumPages(doc.numPages);
      setIsLoading(false);
    } catch (err: unknown) {
      console.error("[PdfViewerModal] Failed to load PDF:", err);
      const msg = err instanceof Error ? err.message : "Failed to load PDF document.";
      setError(msg);
      setIsLoading(false);
    }
  }, [file]);

  useEffect(() => {
    if (isOpen && file) {
      loadDocument();
    } else {
      setPdfDoc(null);
    }
  }, [isOpen, file, loadDocument]);

  // Touchpad pinch-to-zoom & mouse wheel zoom listener
  useEffect(() => {
    const viewport = scrollContainerRef.current;
    if (!viewport || !isOpen) return;

    const handleWheel = (e: WheelEvent) => {
      // Touchpad pinch (ctrlKey === true) or Cmd/Ctrl + mouse wheel
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.003;
        setScale((prev) => Math.max(0.4, Math.min(3.5, Number((prev + delta).toFixed(2)))));
      }
    };

    viewport.addEventListener("wheel", handleWheel, { passive: false });
    return () => viewport.removeEventListener("wheel", handleWheel);
  }, [isOpen]);

  // Sync page input with active scroll page
  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  // Scroll to page
  const scrollToPage = useCallback((pageNum: number) => {
    const el = document.getElementById(`pdf-page-${pageNum}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentPage(pageNum);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "PageDown" || (e.shiftKey && e.key === " ")) {
        if (currentPage < numPages) scrollToPage(currentPage + 1);
      } else if (e.key === "PageUp") {
        if (currentPage > 1) scrollToPage(currentPage - 1);
      } else if (e.key === "+" || e.key === "=") {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          setScale((s) => Math.min(s + 0.2, 3.5));
        }
      } else if (e.key === "-") {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          setScale((s) => Math.max(s - 0.2, 0.4));
        }
      } else if (e.key === "0") {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          setScale(1.2);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentPage, numPages, onClose, scrollToPage]);

  if (!isOpen || !file) return null;

  const handlePageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(pageInput.trim(), 10);
    if (!isNaN(target) && target >= 1 && target <= numPages) {
      scrollToPage(target);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const handleFitWidth = async () => {
    if (!scrollContainerRef.current || !pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(1);
      const vp = page.getViewport({ scale: 1, rotation });
      const availableWidth = scrollContainerRef.current.clientWidth - 64;
      const targetScale = Math.max(0.4, Math.min(3.0, availableWidth / vp.width));
      setScale(Number(targetScale.toFixed(2)));
    } catch {}
  };

  const handleFitPage = async () => {
    if (!scrollContainerRef.current || !pdfDoc) return;
    try {
      const page = await pdfDoc.getPage(1);
      const vp = page.getViewport({ scale: 1, rotation });
      const availableHeight = scrollContainerRef.current.clientHeight - 80;
      const targetScale = Math.max(0.4, Math.min(2.5, availableHeight / vp.height));
      setScale(Number(targetScale.toFixed(2)));
    } catch {}
  };

  const copyReference = () => {
    const text = `Channel: ${file.channelTitle} (ID: ${file.channelId}), Msg: ${file.messageId}`;
    navigator.clipboard.writeText(text);
    setIsCopiedRef(true);
    toast.success("Telegram message reference copied");
    setTimeout(() => setIsCopiedRef(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col w-screen h-screen bg-[#101014] select-none overflow-hidden">
        {/* Full-Screen Chrome-Grade PDF Reader Container */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="relative z-10 flex flex-col w-full h-full overflow-hidden"
        >
          {/* Top Hairline Sheen */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {/* Chrome PDF Top Toolbar */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.08] bg-[#141418] shrink-0 z-20">
            {/* Left Section: Sidebar Toggle + Title */}
            <div className="flex items-center gap-3 min-w-0 mr-3">
              <button
                onClick={() => setShowThumbnails(!showThumbnails)}
                className={`p-1.5 px-2.5 rounded-[5px] border transition-colors flex items-center gap-1.5 text-xs font-mono ${
                  showThumbnails
                    ? "bg-[#c49b56]/20 text-[#e6cfa3] border-[#c49b56]/40"
                    : "bg-transparent text-zinc-400 hover:text-white border-transparent hover:bg-white/[0.05]"
                }`}
                title="Toggle page thumbnail sidebar"
              >
                {showThumbnails ? (
                  <PanelLeftClose className="w-4 h-4 stroke-[1.5px]" />
                ) : (
                  <PanelLeftOpen className="w-4 h-4 stroke-[1.5px]" />
                )}
                <span className="hidden md:inline">Thumbnails</span>
              </button>

              <div className="h-4 w-px bg-white/[0.1] hidden sm:block" />

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs sm:text-sm font-medium font-sans text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md" title={file.name}>
                    {file.name}
                  </h2>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono truncate hidden sm:flex items-center gap-2 mt-0.5">
                  <span>{formatBytes(file.size)}</span>
                  <span>•</span>
                  <span>{numPages > 0 ? `${numPages} Pages` : "Loading Pages..."}</span>
                </div>
              </div>
            </div>

            {/* Center Section: Page Jump + Zoom Controls */}
            {numPages > 0 && !isLoading && (
              <div className="flex items-center gap-2 shrink-0 bg-white/[0.03] border border-white/[0.08] rounded-[6px] px-2.5 py-1.5 shadow-sm">
                {/* Page Jump Form */}
                <form onSubmit={handlePageSubmit} className="flex items-center gap-1.5 text-xs font-mono">
                  <input
                    type="text"
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={() => setPageInput(String(currentPage))}
                    className="w-10 h-6 text-center font-mono text-xs bg-white/[0.06] border border-white/[0.12] rounded-[4px] text-white focus:outline-none focus:border-white/40"
                  />
                  <span className="text-zinc-500">/ {numPages}</span>
                </form>

                <div className="h-4 w-px bg-white/[0.1] mx-1" />

                {/* Zoom Out */}
                <button
                  onClick={() => setScale((s) => Math.max(0.4, Number((s - 0.15).toFixed(2))))}
                  className="p-1 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded-[3px] transition-colors"
                  title="Zoom Out (Cmd -)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                {/* Zoom Value */}
                <button
                  onClick={() => setScale(1.2)}
                  className="px-2 py-0.5 font-mono text-xs text-zinc-300 hover:text-white rounded-[3px] transition-colors"
                  title="Reset Zoom to 100% (Cmd 0)"
                >
                  {Math.round((scale / 1.2) * 100)}%
                </button>

                {/* Zoom In */}
                <button
                  onClick={() => setScale((s) => Math.min(3.5, Number((s + 0.15).toFixed(2))))}
                  className="p-1 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded-[3px] transition-colors"
                  title="Zoom In (Cmd +)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-px bg-white/[0.1] mx-1 hidden sm:block" />

                {/* Fit Width */}
                <button
                  onClick={handleFitWidth}
                  className="p-1 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded-[3px] transition-colors hidden sm:block"
                  title="Fit to Width"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>

                {/* Fit Page */}
                <button
                  onClick={handleFitPage}
                  className="p-1 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded-[3px] transition-colors hidden md:block"
                  title="Fit to Page"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>

                {/* Rotate CW */}
                <button
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded-[3px] transition-colors"
                  title="Rotate 90° Clockwise"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Right Section: Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDownload(file)}
                className="h-8 px-3 text-xs rounded-[5px] bg-white/[0.05] hover:bg-white/[0.12] text-zinc-200 hover:text-white border-white/[0.1] gap-1.5 active:scale-[0.98] transition-all"
              >
                <Download className="w-3.5 h-3.5 stroke-[1.5px]" />
                <span className="hidden sm:inline">Download</span>
              </Button>

              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/[0.08] text-zinc-400 hover:text-white rounded-[5px] transition-colors ml-1"
                title="Close (Esc)"
              >
                <X className="w-4 h-4 stroke-[1.5px]" />
              </button>
            </div>
          </div>

          {/* Main Content Stage */}
          <div className="relative flex flex-1 overflow-hidden bg-[#0e0e11]">
            {/* Left Page Thumbnails Sidebar (Real Miniature Rendered Canvases) */}
            {showThumbnails && numPages > 0 && pdfDoc && (
              <div className="w-44 sm:w-52 border-r border-white/[0.08] bg-[#09090b] p-2.5 overflow-y-auto no-scrollbar shrink-0 flex flex-col items-center gap-3">
                <div className="w-full text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-1 pb-1 border-b border-white/[0.06] flex items-center justify-between">
                  <span>Page Index</span>
                  <span className="text-[#c49b56]">{numPages}</span>
                </div>
                {Array.from({ length: numPages }).map((_, idx) => {
                  const pNum = idx + 1;
                  const isActive = pNum === currentPage;
                  return (
                    <PdfThumbnailItem
                      key={pNum}
                      pageNumber={pNum}
                      pdfDoc={pdfDoc}
                      rotation={rotation}
                      isActive={isActive}
                      onClick={() => scrollToPage(pNum)}
                    />
                  );
                })}
              </div>
            )}

            {/* Continuous Scroll Viewport Stage (Pixel-Perfect Pages) */}
            <div
              ref={scrollContainerRef}
              className="relative flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-8 flex flex-col items-center bg-[#18181b]/40 scroll-smooth select-text"
            >
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400 bg-[#09090b]/80 backdrop-blur-sm z-20">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[5px] bg-white/[0.04] border border-white/[0.08] shadow-sm">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-300" />
                  </div>
                  <div className="space-y-1.5 text-center max-w-xs">
                    <span className="text-xs font-mono text-zinc-200 block">
                      Loading PDF Document
                    </span>
                    {loadingProgress ? (
                      <div className="space-y-1">
                        <div className="w-48 h-1 bg-white/[0.08] rounded-full overflow-hidden mx-auto">
                          <div
                            className="h-full bg-[#c49b56] transition-all duration-150"
                            style={{ width: `${loadingProgress.percent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {loadingProgress.percent}% ({formatBytes(loadingProgress.loaded)} / {formatBytes(loadingProgress.total)})
                        </span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-zinc-500">Fetching document bytes via MTProto...</span>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center z-20">
                  <AlertCircle className="w-8 h-8 text-rose-400" />
                  <div className="space-y-1 max-w-sm">
                    <span className="text-sm font-medium text-white block">Document Rendering Error</span>
                    <p className="text-xs text-zinc-400 leading-relaxed">{error}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadDocument}
                    className="text-xs h-8 rounded-[4px] border-white/[0.1] bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Document Load</span>
                  </Button>
                </div>
              )}

              {/* All Pages Continuous Stack */}
              {pdfDoc && numPages > 0 && !isLoading && (
                <div className="flex flex-col items-center pb-16">
                  {Array.from({ length: numPages }).map((_, idx) => (
                    <PdfPageItem
                      key={idx + 1}
                      pageNumber={idx + 1}
                      pdfDoc={pdfDoc}
                      scale={scale}
                      rotation={rotation}
                      onVisible={(pNum) => setCurrentPage(pNum)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chrome Footer Telemetry Bar */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 border-t border-white/[0.08] bg-[#121215]/95 text-[10px] font-mono text-zinc-500 shrink-0">
            <div className="flex items-center gap-2 truncate">
              <span>Mozilla PDF.js Core</span>
              <span>•</span>
              <button
                onClick={copyReference}
                className="hover:text-zinc-300 flex items-center gap-1 transition-colors"
                title="Copy Telegram message ID and channel info"
              >
                {isCopiedRef ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                <span>Msg #{file.messageId}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Trackpad Pinch / Ctrl + Wheel to Zoom</span>
              <span className="hidden sm:inline">•</span>
              <span>Continuous Feed</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default PdfViewerModal;
