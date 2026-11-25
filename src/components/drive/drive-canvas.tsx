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
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { Inbox, Upload, FilterX } from "lucide-react";
import { formatBytes, cn } from "@/lib/utils";
import { isMediaCategory, MEDIA_TOKENS } from "@/lib/media-tokens";
import { toast } from "sonner";

export const DriveCanvas: React.FC = () => {
  const {
    channels,
    activeChannelId,
    files,
    activeFilter,
    setActiveFilter,
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
  const isFiltering = sizeFilter !== "ALL" || !!searchQuery.trim();

  return (
    <main className="relative flex h-[100dvh] w-full min-w-0 flex-1 flex-col overflow-hidden bg-[#08080a] text-zinc-100">
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

      {/* Top Toolbar (header hidden on Transfers view, modals stay mounted) */}
      <DriveToolbar
        onTriggerUpload={handleTriggerUpload}
        hideHeader={activeFilter === "TRANSFERS"}
      />

      {/* Mobile Quick Category Strip (1-tap filtering without opening drawer) */}
      {activeFilter !== "TRANSFERS" && (
        <div className="shrink-0 border-b border-white/[0.05] px-2 py-1.5 md:hidden">
          <div className="no-scrollbar flex touch-pan-x items-center gap-0.5 overflow-x-auto">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "IMAGE", label: "Images" },
                { id: "VIDEO", label: "Videos" },
                { id: "DOC", label: "Docs" },
                { id: "AUDIO", label: "Audio" },
                { id: "ARCHIVE", label: "Archives" },
                { id: "FAVORITES", label: "Starred" },
                { id: "PINNED", label: "Pinned" },
              ] as const
            ).map((cat) => {
              const isAct = activeFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveFilter(cat.id)}
                  className={cn(
                    "flex h-8 shrink-0 items-center gap-1.5 rounded-[3px] px-2.5 text-[11.5px] transition-colors",
                    isAct
                      ? "bg-white/[0.07] font-medium text-white"
                      : "text-zinc-500 hover:text-zinc-200"
                  )}
                >
                  {isMediaCategory(cat.id) && (
                    <span
                      aria-hidden="true"
                      className="h-1 w-1 shrink-0 rounded-full"
                      style={{
                        backgroundColor: MEDIA_TOKENS[cat.id].hue,
                        opacity: isAct ? 1 : 0.45,
                      }}
                    />
                  )}
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Render Dedicated Transfers View if Selected */}
      {activeFilter === "TRANSFERS" ? (
        <TransfersView />
      ) : (
        /* Main Virtualized Content Area */
        <div className="flex flex-1 flex-col overflow-hidden px-3 pb-0 pt-3 sm:px-4 md:px-5 md:pt-4">
          {/* Status line + size filters — quiet, one row, no outlined pills */}
          {files.length > 0 && (
            <div className="mb-3 flex shrink-0 select-none flex-col gap-2 pb-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-baseline gap-2.5">
                <span className="num font-mono text-[11px] text-zinc-500">
                  <span className="text-zinc-200">{filteredFiles.length.toLocaleString()}</span>
                  {sizeFilter !== "ALL" || searchQuery ? (
                    <span className="text-zinc-600"> of {files.length.toLocaleString()}</span>
                  ) : null}
                </span>
                <span className="h-2.5 w-px bg-white/[0.09]" />
                <span className="num font-mono text-[11px] text-zinc-600">
                  {formatBytes(filteredFiles.reduce((acc, f) => acc + (f.size || 0), 0))}
                </span>
                {(sizeFilter !== "ALL" || searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSizeFilter("ALL");
                      setSearchQuery("");
                    }}
                    className="text-[11px] text-[#e8d5b5]/75 transition-colors hover:text-[#e8d5b5]"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="no-scrollbar flex touch-pan-x items-center gap-0.5 overflow-x-auto">
                {(
                  [
                    { id: "ALL", label: "All sizes" },
                    { id: "SMALL", label: "< 10 MB" },
                    { id: "MEDIUM", label: "10–100 MB" },
                    { id: "LARGE", label: "> 100 MB" },
                  ] as const
                ).map((chip) => {
                  const isAct = sizeFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setSizeFilter(chip.id)}
                      className={cn(
                        "shrink-0 whitespace-nowrap rounded-[3px] px-2 py-1 text-[11px] transition-colors",
                        isAct
                          ? "bg-white/[0.07] text-zinc-100"
                          : "text-zinc-600 hover:bg-white/[0.03] hover:text-zinc-300"
                      )}
                    >
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Content Stage - Rigid flex container so virtualizer inner container is the sole scroll element */}
          <div className="flex-1 min-h-0 w-full relative flex flex-col overflow-hidden">
            {files.length === 0 && syncStatus.isSyncing ? (
              <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-1">
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                      <div
                        key={i}
                        className="flex h-[124px] animate-pulse flex-col rounded-[5px] border border-white/[0.05] bg-[#0f0f12] p-3.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="h-[15px] w-[15px] rounded-[2px] bg-white/[0.06]" />
                          <div className="h-2 w-6 rounded-[2px] bg-white/[0.04]" />
                        </div>
                        <div className="mt-auto space-y-1.5">
                          <div className="h-2.5 w-3/4 rounded-[2px] bg-white/[0.06]" />
                          <div className="h-2 w-1/3 rounded-[2px] bg-white/[0.035]" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-px">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                      <div key={i} className="h-10 w-full animate-pulse rounded-[3px] bg-white/[0.02]" />
                    ))}
                  </div>
                )}
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="no-scrollbar flex flex-1 items-center justify-center overflow-y-auto p-6">
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex max-w-[330px] flex-col items-center text-center"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-[5px] border border-white/[0.06] bg-[#0d0d10] text-zinc-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    {isFiltering ? (
                      <FilterX className="h-[18px] w-[18px] stroke-[1.4px]" />
                    ) : (
                      <Inbox className="h-[18px] w-[18px] stroke-[1.4px]" />
                    )}
                  </div>

                  <h3 className="type-title mt-4 text-[13.5px]">
                    {isFiltering ? "Nothing matches those filters" : "This vault is empty"}
                  </h3>
                  <p className="type-body mt-1.5 text-[12px] text-zinc-500">
                    {isFiltering
                      ? "Try widening the size range or clearing your search."
                      : "Drop files anywhere, or upload to store them on your Telegram channel."}
                  </p>

                  {isFiltering ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSizeFilter("ALL");
                        setSearchQuery("");
                      }}
                      className="mt-4 flex h-8 items-center gap-1.5 rounded-[4px] px-2.5 text-[11.5px] text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white"
                    >
                      <FilterX className="h-3 w-3 stroke-[1.6px]" />
                      <span>Clear filters</span>
                    </button>
                  ) : (
                    <div className="mt-4 flex flex-col items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleTriggerUpload}
                        className="tactile-keycap flex h-8 items-center gap-1.5 rounded-[4px] px-3 text-[11.5px] font-medium text-zinc-100 transition-colors hover:text-white"
                      >
                        <Upload className="h-3 w-3 stroke-[1.8px] text-[#e8d5b5]" />
                        <span>Upload a file</span>
                      </button>
                      <p className="type-meta hidden items-center gap-1.5 text-[10.5px] text-zinc-600 sm:flex">
                        or press
                        <kbd className="tactile-keycap rounded-[2px] px-1 py-0.5 font-mono text-[9.5px] text-zinc-400">
                          U
                        </kbd>
                        to upload
                      </p>
                    </div>
                  )}
                </motion.div>
              </div>
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

      {/* Mobile Bottom Thumb-Zone Navigation */}
      <MobileBottomNav onTriggerUpload={handleTriggerUpload} />
    </main>
  );
};
