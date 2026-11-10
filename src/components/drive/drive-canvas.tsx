import React, { useMemo, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useDriveStore } from "@/lib/stores/drive-store";
import { useTransferStore } from "@/lib/stores/transfer-store";
import { useAudioPlayerStore } from "@/lib/stores/audio-player-store";
import { DriveFile } from "@/lib/telegram/indexer";
import { DriveToolbar } from "./drive-toolbar";
import { FileGrid } from "./file-grid";
import { FileTable } from "./file-table";
import { MediaPreviewModal } from "./media-preview-modal";
import { VideoPlayerModal } from "./video-player-modal";
import { PdfViewerModal } from "./pdf-viewer-modal";
import { ArchiveViewerModal } from "./archive-viewer-modal";
import { FileDetailsModal } from "./file-details-modal";
import { FileShareModal } from "./file-share-modal";
import { TextViewerModal } from "./text-viewer-modal";
import { StorageAnalyticsModal } from "./storage-analytics-modal";
import { BatchActionBar } from "./batch-action-bar";
import { AudioEngine } from "./audio-engine";
import { AudioPlayerModal } from "./audio-player-modal";
import { FloatingAudioBar } from "./floating-audio-bar";
import { CreateVaultModal } from "./create-vault-modal";
import { CopyToVaultModal } from "./copy-to-vault-modal";
import { NetworkMonitorModal } from "./network-monitor-modal";
import { ShortcutsCheatSheetModal } from "./shortcuts-cheat-sheet";
import { DropzoneOverlay } from "./dropzone-overlay";
import { UploadChannelSelectModal } from "./upload-channel-select-modal";
import { TransfersView } from "./transfers-view";
import { Inbox, Upload, FilterX } from "lucide-react";
import { formatBytes, cn } from "@/lib/utils";
import { toast } from "sonner";

export const DriveCanvas: React.FC = () => {
  const {
    channels,
    activeChannelId,
    files,
    activeFilter,
    sizeFilter,
    setSizeFilter,
    customFolders,
    pinnedFileIds,
    favoriteFileIds,
    searchQuery,
    setSearchQuery,
    viewMode,
    sortField,
    sortOrder,
    syncStatus,
    previewFile,
    setPreviewFile,
    detailsFile,
    setDetailsFile,
    shareFile,
    setShareFile,
    textViewerFile,
    setTextViewerFile,
    isAnalyticsOpen,
    setAnalyticsOpen,
    isCreateVaultOpen,
    setCreateVaultOpen,
    isNetworkMonitorOpen,
    setNetworkMonitorOpen,
    isShortcutsOpen,
    setShortcutsOpen,
    copyToVaultFiles,
    setCopyToVaultFiles,
  } = useDriveStore();

  const { enqueueDownload, enqueueUpload } = useTransferStore();
  const hiddenFileInputRef = useRef<HTMLInputElement | null>(null);

  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);
  const [isChannelSelectOpen, setIsChannelSelectOpen] = useState(false);

  // 1. Filter Files based on active navigation category, folder, or search query
  const filteredFiles = useMemo(() => {
    let result = [...files];

    if (activeFilter === "IMAGE") {
      result = result.filter((f) => f.category === "IMAGE");
    } else if (activeFilter === "VIDEO") {
      result = result.filter((f) => f.category === "VIDEO");
    } else if (activeFilter === "DOC") {
      result = result.filter((f) => f.category === "DOC");
    } else if (activeFilter === "ARCHIVE") {
      result = result.filter((f) => f.category === "ARCHIVE");
    } else if (activeFilter === "AUDIO") {
      result = result.filter((f) => f.category === "AUDIO");
    } else if (activeFilter === "PINNED") {
      result = result.filter((f) => pinnedFileIds.has(f.id));
    } else if (activeFilter === "FAVORITES") {
      result = result.filter((f) => favoriteFileIds.has(f.id));
    } else if (customFolders[activeFilter]) {
      const folder = customFolders[activeFilter];
      result = result.filter((f) => folder.fileIds.includes(f.id));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.channelTitle.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
      );
    }

    // Size Filter
    if (sizeFilter === "SMALL") {
      result = result.filter((f) => f.size < 10 * 1024 * 1024);
    } else if (sizeFilter === "MEDIUM") {
      result = result.filter((f) => f.size >= 10 * 1024 * 1024 && f.size <= 100 * 1024 * 1024);
    } else if (sizeFilter === "LARGE") {
      result = result.filter((f) => f.size > 100 * 1024 * 1024);
    }

    // 2. Sort Files
    return result.sort((a, b) => {
      let comparison = 0;
      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "size") {
        comparison = a.size - b.size;
      } else {
        comparison = a.date - b.date;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [
    files,
    activeFilter,
    sizeFilter,
    searchQuery,
    sortField,
    sortOrder,
    customFolders,
    pinnedFileIds,
    favoriteFileIds,
  ]);

  // Handle Drag and Drop Uploads
  const handleFilesDropped = (incoming: FileList | File[]) => {
    const droppedFiles = Array.from(incoming);
    if (!channels || channels.length === 0) {
      toast.error("No synced channels found. Please configure channels first.");
      return;
    }

    if (activeChannelId === "UNIFIED") {
      setPendingUploadFiles(droppedFiles);
      setIsChannelSelectOpen(true);
    } else {
      const activeChan = channels.find((c) => c.id === activeChannelId);
      if (activeChan) {
        for (const file of droppedFiles) {
          enqueueUpload(file, activeChan.id, activeChan.title);
        }
        toast.success(`Queued ${droppedFiles.length} file(s) for upload to ${activeChan.title}`);
      }
    }
  };

  const handleChannelSelectedForUpload = (selectedChannelId: string) => {
    const targetChan = channels.find((c) => c.id === selectedChannelId);
    if (!targetChan) return;

    for (const file of pendingUploadFiles) {
      enqueueUpload(file, targetChan.id, targetChan.title);
    }
    toast.success(`Queued ${pendingUploadFiles.length} file(s) for upload to ${targetChan.title}`);
    setPendingUploadFiles([]);
    setIsChannelSelectOpen(false);
  };

  const handleTriggerUpload = () => {
    if (hiddenFileInputRef.current) {
      hiddenFileInputRef.current.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (selected.length > 0) {
      handleFilesDropped(selected);
    }
    if (e.target) e.target.value = "";
  };

  const handleDownload = (file: DriveFile) => {
    enqueueDownload(file);
  };

  // Auto-route audio playback to Audio Player Engine
  useEffect(() => {
    if (previewFile && previewFile.category === "AUDIO") {
      const audioPlaylist = filteredFiles.filter((f) => f.category === "AUDIO");
      useAudioPlayerStore.getState().playTrack(previewFile, audioPlaylist);
      setPreviewFile(null);
    }
  }, [previewFile, filteredFiles, setPreviewFile]);

  // Global '?' shortcut for Shortcuts Cheat Sheet
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        handleTriggerUpload();
      }
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShortcutsOpen(!isShortcutsOpen);
      }
    };
    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [isShortcutsOpen, setShortcutsOpen]);

  const isPdf =
    previewFile &&
    (previewFile.name.toLowerCase().endsWith(".pdf") || previewFile.mimeType === "application/pdf");

  const isArchive =
    previewFile &&
    (previewFile.category === "ARCHIVE" ||
      !!previewFile.name.toLowerCase().match(/\.(zip|rar|7z|tar|gz|bz2|cbz|jar|apk)$/));

  const isVideo = previewFile && previewFile.category === "VIDEO";

  return (
    <main className="relative flex flex-1 flex-col h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Hidden File Input for Button Triggers */}
      <input
        ref={hiddenFileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Global Full-Screen Drag & Drop Overlay */}
      <DropzoneOverlay
        activeChannelTitle={
          activeChannelId === "UNIFIED"
            ? "All Channels (Unified)"
            : channels.find((c) => c.id === activeChannelId)?.title || "Active Channel"
        }
        onFilesDropped={handleFilesDropped}
      />

      {/* Channel Selection Modal for Uploads initiated in Unified View */}
      <UploadChannelSelectModal
        isOpen={isChannelSelectOpen}
        channels={channels}
        filesCount={pendingUploadFiles.length}
        onSelect={handleChannelSelectedForUpload}
        onCancel={() => {
          setIsChannelSelectOpen(false);
          setPendingUploadFiles([]);
        }}
      />

      {/* Top Toolbar (Hidden on Transfers view for dedicated header) */}
      {activeFilter !== "TRANSFERS" && <DriveToolbar onTriggerUpload={handleTriggerUpload} />}

      {/* Render Dedicated Transfers View if Selected */}
      {activeFilter === "TRANSFERS" ? (
        <TransfersView />
      ) : (
        /* Main Virtualized Content Area */
        <div className="flex-1 overflow-hidden p-2 sm:p-3 md:p-5 flex flex-col">
          {/* Telemetry & Size Filter Chips Bar (Persistent whenever files exist in this view) */}
          {files.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2.5 px-0.5 border-b border-white/[0.06] mb-3 text-xs shrink-0 select-none gap-2">
              <div className="flex items-center gap-2 overflow-hidden text-[11px] font-mono text-zinc-400">
                <span>
                  <strong className="text-white font-medium">{filteredFiles.length}</strong>
                  {sizeFilter !== "ALL" || searchQuery ? ` of ${files.length}` : ""} items
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-500 tabular-nums">
                  {formatBytes(filteredFiles.reduce((acc, f) => acc + (f.size || 0), 0))}
                </span>
                {(sizeFilter !== "ALL" || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSizeFilter("ALL");
                      setSearchQuery("");
                    }}
                    className="ml-1 text-[10px] text-[#e6cfa3] hover:underline transition-all flex items-center gap-1"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Filter Chips: horizontal scroll on mobile */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {(
                  [
                    { id: "ALL", label: "All Sizes" },
                    { id: "SMALL", label: "< 10MB" },
                    { id: "MEDIUM", label: "10-100MB" },
                    { id: "LARGE", label: "> 100MB" },
                  ] as const
                ).map((chip) => {
                  const isAct = sizeFilter === chip.id;
                  return (
                    <motion.button
                      key={chip.id}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSizeFilter(chip.id)}
                      className={cn(
                        "relative px-2.5 py-0.5 rounded-[4px] text-[10px] font-mono transition-colors whitespace-nowrap",
                        isAct
                          ? "text-white font-medium"
                          : "text-zinc-500 hover:text-zinc-300 bg-white/[0.02] border border-white/[0.05]"
                      )}
                    >
                      {isAct && (
                        <motion.span
                          layoutId="activeSizeFilterPill"
                          transition={{ type: "spring", stiffness: 480, damping: 35 }}
                          className="absolute inset-0 rounded-[4px] bg-white/[0.12] border border-white/[0.2] shadow-sm -z-0"
                        />
                      )}
                      <span className="relative z-10">{chip.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Content Stage */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {files.length === 0 && syncStatus.isSyncing ? (
              viewMode === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                    <div
                      key={i}
                      className="flex flex-col justify-between rounded-[5px] border border-white/[0.06] bg-white/[0.02] p-3 h-[142px] animate-pulse"
                    >
                      <div className="h-8 w-8 rounded-[4px] bg-white/[0.05]" />
                      <div className="space-y-1.5">
                        <div className="h-3 w-3/4 rounded-[2px] bg-white/[0.06]" />
                        <div className="h-2 w-1/2 rounded-[2px] bg-white/[0.04]" />
                      </div>
                      <div className="h-2 w-full rounded-[2px] bg-white/[0.03]" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                      key={i}
                      className="h-10 w-full rounded-[4px] bg-white/[0.02] border border-white/[0.05] animate-pulse"
                    />
                  ))}
                </div>
              )
            ) : filteredFiles.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="flex h-[380px] flex-col items-center justify-center gap-4 text-center px-4"
              >
                {/* Precision Architectural Crosshair Reticle */}
                <div className="relative p-6 border border-dashed border-white/[0.08] rounded-[6px] bg-[#0c0c0e]">
                  {/* Industrial Corner Crosshairs */}
                  <span className="absolute -top-1.5 -left-1.5 font-mono text-[9px] text-zinc-600 leading-none select-none">+</span>
                  <span className="absolute -top-1.5 -right-1.5 font-mono text-[9px] text-zinc-600 leading-none select-none">+</span>
                  <span className="absolute -bottom-1.5 -left-1.5 font-mono text-[9px] text-zinc-600 leading-none select-none">+</span>
                  <span className="absolute -bottom-1.5 -right-1.5 font-mono text-[9px] text-zinc-600 leading-none select-none">+</span>

                  <div className="flex h-11 w-11 items-center justify-center rounded-[4px] bg-[#121215] border border-white/[0.1] text-zinc-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                    {sizeFilter !== "ALL" || searchQuery ? (
                      <FilterX className="h-4.5 w-4.5 stroke-[1.4px] text-zinc-400" />
                    ) : (
                      <Inbox className="h-4.5 w-4.5 stroke-[1.4px] text-zinc-300" />
                    )}
                  </div>
                </div>

                <div className="space-y-1 max-w-sm">
                  <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600 font-medium">
                    {sizeFilter !== "ALL" || searchQuery ? "FILTER_RETURN :: NULL" : "DIRECTORY_STATUS :: 00"}
                  </div>
                  <h3 className="text-sm font-medium text-zinc-100 font-sans tracking-tight">
                    {sizeFilter !== "ALL" || searchQuery ? "No matching records found" : "Directory Index Empty"}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    {sizeFilter !== "ALL"
                      ? `No records match the "${sizeFilter === "SMALL" ? "< 10MB" : sizeFilter === "MEDIUM" ? "10-100MB" : "> 100MB"}" criteria.`
                      : searchQuery
                      ? "No records matched your search query. Try searching for a different keyword."
                      : "Drag & drop files onto this canvas or click below to store them directly onto Telegram."}
                  </p>
                </div>

                {sizeFilter !== "ALL" || searchQuery ? (
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSizeFilter("ALL");
                        setSearchQuery("");
                      }}
                      className="specimen-card hairline-sheen h-8 px-3.5 text-xs text-zinc-300 hover:text-white rounded-[4px] font-mono flex items-center gap-1.5 transition-colors"
                    >
                      <FilterX className="h-3 w-3 stroke-[1.5px]" />
                      <span>RESET ACTIVE FILTERS</span>
                    </button>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <motion.div whileTap={{ scale: 0.97 }}>
                      <button
                        type="button"
                        onClick={handleTriggerUpload}
                        className="specimen-card hairline-sheen h-8 px-4 text-xs text-zinc-100 hover:text-white rounded-[4px] font-medium flex items-center gap-2 transition-all hover:border-white/[0.25]"
                      >
                        <Upload className="h-3.5 w-3.5 stroke-[1.6px]" />
                        <span>Upload File</span>
                      </button>
                    </motion.div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-600 tracking-tight">
                      <span>PRESS</span>
                      <kbd className="tactile-keycap px-1.5 py-0.2 rounded text-[9px] text-zinc-400">U</kbd>
                      <span>TO INGEST • DRAG & DROP BUFFER</span>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : viewMode === "grid" ? (
              <FileGrid files={filteredFiles} onDownload={handleDownload} />
            ) : (
              <FileTable files={filteredFiles} onDownload={handleDownload} />
            )}
          </div>
        </div>
      )}

      {/* Background Audio Engine & Floating Audio Mini-Bar */}
      <AudioEngine />
      <AudioPlayerModal />
      <FloatingAudioBar />

      {/* Video Streaming Modal */}
      {isVideo && (
        <VideoPlayerModal
          file={previewFile}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Mozilla pdf.js Document Viewer Modal */}
      {isPdf && (
        <PdfViewerModal
          file={previewFile}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          onDownload={handleDownload}
        />
      )}

      {/* Client-Side Archive Explorer Modal */}
      {isArchive && (
        <ArchiveViewerModal
          file={previewFile}
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          onDownloadFullArchive={handleDownload}
        />
      )}

      {/* Image & Generic Document Preview Lightbox Modal */}
      {previewFile && !isVideo && !isPdf && !isArchive && previewFile.category !== "AUDIO" && (
        <MediaPreviewModal
          file={previewFile}
          imagesList={filteredFiles.filter((f) => f.category === "IMAGE")}
          onNavigateImage={(f) => setPreviewFile(f)}
          onClose={() => setPreviewFile(null)}
          onDownload={handleDownload}
        />
      )}

      {/* File Inspector Details Modal */}
      <FileDetailsModal
        file={detailsFile}
        isOpen={!!detailsFile}
        onClose={() => setDetailsFile(null)}
        onPreview={(f) => setPreviewFile(f)}
        onShare={(f) => setShareFile(f)}
      />

      {/* Share Link & QR Generator Modal */}
      <FileShareModal
        file={shareFile}
        isOpen={!!shareFile}
        onClose={() => setShareFile(null)}
      />

      {/* Code & Text Live Document Viewer */}
      <TextViewerModal
        file={textViewerFile}
        isOpen={!!textViewerFile}
        onClose={() => setTextViewerFile(null)}
        onDownload={handleDownload}
      />

      {/* Storage & Drive Intelligence Analytics Dashboard */}
      <StorageAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        onSelectFile={(f) => setDetailsFile(f)}
      />

      {/* Provision New Storage Vault Modal */}
      <CreateVaultModal
        isOpen={isCreateVaultOpen}
        onClose={() => setCreateVaultOpen(false)}
      />

      {/* Network & DC Diagnostics Modal */}
      <NetworkMonitorModal
        isOpen={isNetworkMonitorOpen}
        onClose={() => setNetworkMonitorOpen(false)}
      />

      {/* Keyboard Shortcuts Master Cheat Sheet */}
      <ShortcutsCheatSheetModal
        isOpen={isShortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* Instant Zero-Bandwidth Clone to Vault Modal */}
      <CopyToVaultModal
        files={copyToVaultFiles}
        isOpen={!!copyToVaultFiles && copyToVaultFiles.length > 0}
        onClose={() => setCopyToVaultFiles(null)}
      />

      {/* Floating Multi-Select Batch Action Bar */}
      <BatchActionBar />
    </main>
  );
};
