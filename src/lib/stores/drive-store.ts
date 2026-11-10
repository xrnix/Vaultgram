import { create } from "zustand";
import { ChannelMeta, getSavedSelectedChannels, getChannelFilesFromDb, appendChannelFilesBatchToDb } from "../telegram/session";
import { DriveFile, telegramMediaIndexer } from "../telegram/indexer";
import { telegramSyncStore, VaultgramCloudConfig } from "../telegram/syncStore";
import { tgStreamClient } from "../telegram/client";
import { searchTelegramRemote } from "../telegram/search";

export type NavFilter =
  | "ALL"
  | "IMAGE"
  | "VIDEO"
  | "DOC"
  | "ARCHIVE"
  | "AUDIO"
  | "PINNED"
  | "FAVORITES"
  | "TRANSFERS"
  | string; // custom folder id

export type SortField = "date" | "name" | "size";
export type SortOrder = "asc" | "desc";
export type ViewMode = "grid" | "list";

export interface CustomFolder {
  id: string;
  name: string;
  fileIds: string[];
}

export interface SyncStatus {
  isSyncing: boolean;
  statusText: string;
  totalIndexed: number;
  currentChannelTitle: string;
}

export type RemoteSearchStatus = "IDLE" | "LOCAL" | "REMOTE" | "DONE";
export type SizeFilter = "ALL" | "SMALL" | "MEDIUM" | "LARGE";

interface DriveStoreState {
  // Channels
  channels: ChannelMeta[];
  setChannels: (channels: ChannelMeta[]) => void;
  activeChannelId: string; // 'UNIFIED' or specific channel ID

  // Navigation & Filtering
  activeFilter: NavFilter;
  sizeFilter: SizeFilter;
  setSizeFilter: (filter: SizeFilter) => void;
  searchQuery: string;
  remoteSearchStatus: RemoteSearchStatus;
  viewMode: ViewMode;
  sortField: SortField;
  sortOrder: SortOrder;

  // Files & Indexing
  files: DriveFile[];
  channelFilesCache: Map<string, DriveFile[]>;
  syncStatus: SyncStatus;

  // Pagination for UI rendering (prevents DOM freeze with 10k items)
  renderPage: number;
  pageSize: number;

  // Custom Folders & Flags
  customFolders: Record<string, CustomFolder>;
  pinnedFileIds: Set<string>;
  favoriteFileIds: Set<string>;

  // Preview State
  previewFile: DriveFile | null;

  // Batch Multi-Select
  selectedFileIds: Set<string>;
  toggleSelectFile: (fileId: string) => void;
  selectRange: (fileIds: string[]) => void;
  selectAll: (fileIds: string[]) => void;
  clearSelection: () => void;

  // New Modals (Telegram-Drive Inspired)
  detailsFile: DriveFile | null;
  setDetailsFile: (file: DriveFile | null) => void;

  shareFile: DriveFile | null;
  setShareFile: (file: DriveFile | null) => void;

  textViewerFile: DriveFile | null;
  setTextViewerFile: (file: DriveFile | null) => void;

  isAnalyticsOpen: boolean;
  setAnalyticsOpen: (open: boolean) => void;

  isCreateVaultOpen: boolean;
  setCreateVaultOpen: (open: boolean) => void;

  isShortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;

  isNetworkMonitorOpen: boolean;
  setNetworkMonitorOpen: (open: boolean) => void;

  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;

  showTransferDock: boolean;
  setShowTransferDock: (show: boolean) => void;

  copyToVaultFiles: DriveFile[] | null;
  setCopyToVaultFiles: (files: DriveFile[] | null) => void;

  // Mobile Layout State
  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  // Actions
  initDrive: () => Promise<void>;
  setActiveChannel: (channelId: string) => Promise<void>;
  setActiveFilter: (filter: NavFilter) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setSorting: (field: SortField) => void;
  refreshIndex: () => Promise<void>;
  loadMoreRenderItems: () => void;

  // Cloud Sync Dispatcher
  triggerCloudSync: () => void;
  hydrateFromCloudConfig: (config: VaultgramCloudConfig) => void;

  // Incremental Appender & Updater
  appendStreamedFiles: (newFiles: DriveFile[]) => void;
  updateFile: (fileId: string, updated: Partial<DriveFile>) => void;

  // Organization
  togglePin: (fileId: string) => void;
  toggleFavorite: (fileId: string) => void;
  createCustomFolder: (name: string) => void;
  deleteCustomFolder: (id: string) => void;
  addFileToFolder: (folderId: string, fileId: string) => void;
  removeFileFromFolder: (folderId: string, fileId: string) => void;

  // Preview
  setPreviewFile: (file: DriveFile | null) => void;

  // Reset
  resetDrive: () => void;
}

const STORAGE_CUSTOM_FOLDERS = "vaultgram_custom_folders";
const STORAGE_PINNED = "vaultgram_pinned_ids";
const STORAGE_FAVORITES = "vaultgram_favorite_ids";
const STORAGE_VIEW_MODE = "vaultgram_view_mode";
const STORAGE_SHOW_TRANSFER_DOCK = "vaultgram_show_transfer_dock";

function loadLocalSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function loadLocalFolders(): Record<string, CustomFolder> {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_FOLDERS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useDriveStore = create<DriveStoreState>((set, get) => ({
  channels: [],
  setChannels: (channels: ChannelMeta[]) => set({ channels }),
  activeChannelId: "UNIFIED",
  activeFilter: "ALL",
  sizeFilter: "ALL",
  setSizeFilter: (filter: SizeFilter) => set({ sizeFilter: filter, renderPage: 1 }),
  searchQuery: "",
  remoteSearchStatus: "IDLE",
  viewMode: (localStorage.getItem(STORAGE_VIEW_MODE) as ViewMode) || "grid",
  sortField: "date",
  sortOrder: "desc",

  files: [],
  channelFilesCache: new Map(),
  syncStatus: {
    isSyncing: false,
    statusText: "Ready",
    totalIndexed: 0,
    currentChannelTitle: "",
  },

  renderPage: 1,
  pageSize: 60,

  customFolders: loadLocalFolders(),
  pinnedFileIds: loadLocalSet(STORAGE_PINNED),
  favoriteFileIds: loadLocalSet(STORAGE_FAVORITES),
  previewFile: null,

  selectedFileIds: new Set<string>(),
  detailsFile: null,
  shareFile: null,
  textViewerFile: null,
  isAnalyticsOpen: false,
  isCreateVaultOpen: false,
  isShortcutsOpen: false,
  isNetworkMonitorOpen: false,
  isSettingsOpen: false,
  setSettingsOpen: (open: boolean) => set({ isSettingsOpen: open }),

  showTransferDock: typeof window !== "undefined" ? localStorage.getItem(STORAGE_SHOW_TRANSFER_DOCK) !== "false" : true,
  setShowTransferDock: (show: boolean) => {
    try {
      localStorage.setItem(STORAGE_SHOW_TRANSFER_DOCK, String(show));
    } catch {}
    set({ showTransferDock: show });
  },

  copyToVaultFiles: null,

  isMobileSidebarOpen: false,
  setMobileSidebarOpen: (open: boolean) => set({ isMobileSidebarOpen: open }),

  initDrive: async () => {
    const channels = await getSavedSelectedChannels();
    set({ channels, renderPage: 1 });

    if (channels.length === 0) return;

    // 1. FAST INITIAL LOAD: Read all cached files from IndexedDB
    const initialFiles: DriveFile[] = [];
    const cache = new Map<string, DriveFile[]>();

    for (const ch of channels) {
      const chFiles = await getChannelFilesFromDb(ch.id);
      cache.set(ch.id, chFiles);
      initialFiles.push(...chFiles);
    }

    const uniqueInitial = new Map<string, DriveFile>();
    for (const f of initialFiles) uniqueInitial.set(f.id, f);
    const sortedInitial = Array.from(uniqueInitial.values()).sort((a, b) => b.date - a.date);

    set({
      files: sortedInitial,
      channelFilesCache: cache,
      syncStatus: {
        isSyncing: true,
        statusText: `Loaded ${sortedInitial.length} cached files. Checking for new messages...`,
        totalIndexed: sortedInitial.length,
        currentChannelTitle: "All Channels",
      },
    });

    // 2. DISCOVER TELEGRAM CLOUD CONFIG CHANNEL IN BACKGROUND
    telegramSyncStore
      .initSystemChannel()
      .then((res) => {
        if (res.config) {
          get().hydrateFromCloudConfig(res.config);
        }
      })
      .catch((e) => console.warn("[SyncStore] Cloud channel init notice:", e));

    // 3. BACKGROUND DEEP PAGINATION LOOP
    telegramMediaIndexer.indexAllChannelsDeep(
      channels,
      (info) => {
        set({
          syncStatus: {
            isSyncing: !info.isComplete,
            statusText: info.isComplete
              ? `Synced ${get().files.length} total items`
              : `Indexing ${info.activeChannelTitle}...`,
            totalIndexed: get().files.length,
            currentChannelTitle: info.activeChannelTitle,
          },
        });
      },
      (newFilesBatch) => {
        get().appendStreamedFiles(newFilesBatch);
      }
    ).then((finalAggregated) => {
      set({
        files: finalAggregated,
        syncStatus: {
          isSyncing: false,
          statusText: `Synced • ${finalAggregated.length} files total`,
          totalIndexed: finalAggregated.length,
          currentChannelTitle: "",
        },
      });
    });
  },

  triggerCloudSync: () => {
    const { channels, pinnedFileIds, favoriteFileIds, customFolders, viewMode, sortField, sortOrder } = get();

    let sortByPref: any = "DATE_DESC";
    if (sortField === "date" && sortOrder === "asc") sortByPref = "DATE_ASC";
    else if (sortField === "size") sortByPref = "SIZE_DESC";
    else if (sortField === "name") sortByPref = "NAME_ASC";

    const payload: VaultgramCloudConfig = {
      version: 1,
      lastUpdated: Math.floor(Date.now() / 1000),
      selectedChannelIds: channels.map((c) => c.id),
      pinnedFileIds: Array.from(pinnedFileIds),
      favoriteFileIds: Array.from(favoriteFileIds),
      customFolders: Object.values(customFolders),
      preferences: {
        defaultViewMode: viewMode.toUpperCase() as "GRID" | "LIST",
        sortBy: sortByPref,
      },
    };

    telegramSyncStore.queueCloudSync(payload);
  },

  hydrateFromCloudConfig: (config: VaultgramCloudConfig) => {
    if (!config) return;

    const foldersRecord: Record<string, CustomFolder> = {};
    if (config.customFolders && Array.isArray(config.customFolders)) {
      for (const f of config.customFolders) {
        foldersRecord[f.id] = { id: f.id, name: f.name, fileIds: f.fileIds || [] };
      }
    }

    const pinned = new Set<string>(config.pinnedFileIds || []);
    const favs = new Set<string>(config.favoriteFileIds || []);

    let vMode: ViewMode = "grid";
    if (config.preferences?.defaultViewMode === "LIST") vMode = "list";

    let sField: SortField = "date";
    let sOrder: SortOrder = "desc";
    if (config.preferences?.sortBy === "DATE_ASC") {
      sField = "date";
      sOrder = "asc";
    } else if (config.preferences?.sortBy === "SIZE_DESC") {
      sField = "size";
      sOrder = "desc";
    } else if (config.preferences?.sortBy === "NAME_ASC") {
      sField = "name";
      sOrder = "asc";
    }

    localStorage.setItem(STORAGE_CUSTOM_FOLDERS, JSON.stringify(foldersRecord));
    localStorage.setItem(STORAGE_PINNED, JSON.stringify(Array.from(pinned)));
    localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(Array.from(favs)));
    localStorage.setItem(STORAGE_VIEW_MODE, vMode);

    set({
      customFolders: foldersRecord,
      pinnedFileIds: pinned,
      favoriteFileIds: favs,
      viewMode: vMode,
      sortField: sField,
      sortOrder: sOrder,
    });
    console.log("[SyncStore] Hydrated preferences & custom folders from Telegram Cloud.");
  },

  appendStreamedFiles: (newBatch: DriveFile[]) => {
    const currentFiles = get().files;
    const cache = new Map(get().channelFilesCache);

    const map = new Map<string, DriveFile>();
    for (const f of currentFiles) map.set(f.id, f);
    for (const f of newBatch) map.set(f.id, f);

    for (const f of newBatch) {
      const list = cache.get(f.channelId) || [];
      if (!list.some((existing) => existing.id === f.id)) {
        list.push(f);
        cache.set(f.channelId, list);
      }
    }

    const updatedList = Array.from(map.values()).sort((a, b) => b.date - a.date);
    set({
      files: updatedList,
      channelFilesCache: cache,
    });
  },

  updateFile: (fileId: string, updated: Partial<DriveFile>) => {
    const currentFiles = get().files;
    const cache = new Map(get().channelFilesCache);
    let targetChannelId = "";

    const updatedFiles = currentFiles.map((f) => {
      if (f.id === fileId) {
        targetChannelId = f.channelId;
        return { ...f, ...updated };
      }
      return f;
    });

    if (targetChannelId && cache.has(targetChannelId)) {
      const channelFiles = cache.get(targetChannelId)!.map((f) => {
        if (f.id === fileId) {
          return { ...f, ...updated };
        }
        return f;
      });
      cache.set(targetChannelId, channelFiles);
    }

    set({
      files: updatedFiles,
      channelFilesCache: cache,
    });
  },

  setActiveChannel: async (channelId: string) => {
    set({ activeChannelId: channelId, renderPage: 1, isMobileSidebarOpen: false });
    const { channels, channelFilesCache } = get();

    if (channelId === "UNIFIED") {
      let combined: DriveFile[] = [];
      channelFilesCache.forEach((list) => combined.push(...list));
      const unique = new Map<string, DriveFile>();
      for (const f of combined) unique.set(f.id, f);
      set({ files: Array.from(unique.values()).sort((a, b) => b.date - a.date) });
    } else {
      const cached = channelFilesCache.get(channelId) || (await getChannelFilesFromDb(channelId));
      set({ files: cached });

      const target = channels.find((c) => c.id === channelId);
      if (target) {
        set({
          syncStatus: {
            isSyncing: true,
            statusText: `Deep indexing ${target.title}...`,
            totalIndexed: cached.length,
            currentChannelTitle: target.title,
          },
        });

        telegramMediaIndexer
          .indexChannelDeep(
            target,
            (p) => {
              set({
                syncStatus: {
                  isSyncing: !p.isComplete,
                  statusText: p.isComplete
                    ? `Synced • ${p.totalIndexed} files`
                    : `Indexing ${target.title}... (${p.totalIndexed} files)`,
                  totalIndexed: p.totalIndexed,
                  currentChannelTitle: target.title,
                },
              });
            },
            (batch) => {
              if (get().activeChannelId === channelId) {
                get().appendStreamedFiles(batch);
              }
            }
          )
          .then((finalFiles) => {
            if (get().activeChannelId === channelId) {
              set({ files: finalFiles });
            }
          });
      }
    }
  },

  loadMoreRenderItems: () => {
    const current = get().renderPage;
    set({ renderPage: current + 1 });
  },

  refreshIndex: async () => {
    const { channels, activeChannelId } = get();
    set({
      syncStatus: {
        isSyncing: true,
        statusText: "Refreshing index...",
        totalIndexed: get().files.length,
        currentChannelTitle: "",
      },
    });

    if (activeChannelId === "UNIFIED") {
      await telegramMediaIndexer.indexAllChannelsDeep(channels, undefined, (batch) => {
        get().appendStreamedFiles(batch);
      });
    } else {
      const target = channels.find((c) => c.id === activeChannelId);
      if (target) {
        await telegramMediaIndexer.indexChannelDeep(target, undefined, (batch) => {
          get().appendStreamedFiles(batch);
        });
      }
    }

    set({
      syncStatus: {
        isSyncing: false,
        statusText: `Synced • ${get().files.length} files`,
        totalIndexed: get().files.length,
        currentChannelTitle: "",
      },
    });
  },

  setActiveFilter: (filter: NavFilter) => set({ activeFilter: filter, renderPage: 1, isMobileSidebarOpen: false }),
  setSearchQuery: (query: string) => {
    set({
      searchQuery: query,
      remoteSearchStatus: query.trim() ? "LOCAL" : "IDLE",
      renderPage: 1,
    });

    if (!query.trim()) {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      set({ remoteSearchStatus: "IDLE" });
      return;
    }

    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);

    // Trigger Phase 2: Remote MTProto Search after 400ms
    searchDebounceTimer = setTimeout(async () => {
      if (!tgStreamClient.client || !tgStreamClient.isConnected) {
        set({ remoteSearchStatus: "DONE" });
        return;
      }

      set({ remoteSearchStatus: "REMOTE" });

      try {
        const { channels, activeChannelId } = get();
        const activeChan = activeChannelId !== "UNIFIED"
          ? channels.find((c) => c.id === activeChannelId)
          : undefined;

        const remoteFiles = await searchTelegramRemote({
          client: tgStreamClient.client,
          query,
          channel: activeChan,
          limit: 50,
        });

        if (remoteFiles.length > 0) {
          get().appendStreamedFiles(remoteFiles);

          // Group by channel and persist new files to DB
          const byChannel = new Map<string, DriveFile[]>();
          for (const f of remoteFiles) {
            const list = byChannel.get(f.channelId) || [];
            list.push(f);
            byChannel.set(f.channelId, list);
          }

          for (const [chId, cFiles] of byChannel) {
            await appendChannelFilesBatchToDb(chId, cFiles);
          }
        }
      } catch (err) {
        console.warn("[Search] Remote search encountered error:", err);
      } finally {
        set({ remoteSearchStatus: "DONE" });
      }
    }, 400);
  },
  setViewMode: (mode: ViewMode) => {
    localStorage.setItem(STORAGE_VIEW_MODE, mode);
    set({ viewMode: mode });
    get().triggerCloudSync();
  },

  setSorting: (field: SortField) => {
    const currentField = get().sortField;
    const currentOrder = get().sortOrder;
    if (currentField === field) {
      set({ sortOrder: currentOrder === "asc" ? "desc" : "asc", renderPage: 1 });
    } else {
      set({ sortField: field, sortOrder: "desc", renderPage: 1 });
    }
    get().triggerCloudSync();
  },

  togglePin: (fileId: string) => {
    const current = new Set(get().pinnedFileIds);
    if (current.has(fileId)) current.delete(fileId);
    else current.add(fileId);

    localStorage.setItem(STORAGE_PINNED, JSON.stringify(Array.from(current)));
    set({ pinnedFileIds: current });
    get().triggerCloudSync();
  },

  toggleFavorite: (fileId: string) => {
    const current = new Set(get().favoriteFileIds);
    if (current.has(fileId)) current.delete(fileId);
    else current.add(fileId);

    localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(Array.from(current)));
    set({ favoriteFileIds: current });
    get().triggerCloudSync();
  },

  createCustomFolder: (name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const id = `folder_${Date.now()}`;
    const folders = { ...get().customFolders, [id]: { id, name: cleanName, fileIds: [] } };
    localStorage.setItem(STORAGE_CUSTOM_FOLDERS, JSON.stringify(folders));
    set({ customFolders: folders });
    get().triggerCloudSync();
  },

  deleteCustomFolder: (id: string) => {
    const folders = { ...get().customFolders };
    delete folders[id];
    localStorage.setItem(STORAGE_CUSTOM_FOLDERS, JSON.stringify(folders));
    const active = get().activeFilter === id ? "ALL" : get().activeFilter;
    set({ customFolders: folders, activeFilter: active });
    get().triggerCloudSync();
  },

  addFileToFolder: (folderId: string, fileId: string) => {
    const folder = get().customFolders[folderId];
    if (folder && !folder.fileIds.includes(fileId)) {
      const updated = {
        ...get().customFolders,
        [folderId]: { ...folder, fileIds: [...folder.fileIds, fileId] },
      };
      localStorage.setItem(STORAGE_CUSTOM_FOLDERS, JSON.stringify(updated));
      set({ customFolders: updated });
      get().triggerCloudSync();
    }
  },

  removeFileFromFolder: (folderId: string, fileId: string) => {
    const folder = get().customFolders[folderId];
    if (folder) {
      const updated = {
        ...get().customFolders,
        [folderId]: { ...folder, fileIds: folder.fileIds.filter((id) => id !== fileId) },
      };
      localStorage.setItem(STORAGE_CUSTOM_FOLDERS, JSON.stringify(updated));
      set({ customFolders: updated });
      get().triggerCloudSync();
    }
  },

  setPreviewFile: (file: DriveFile | null) => set({ previewFile: file }),

  toggleSelectFile: (fileId: string) => {
    const next = new Set(get().selectedFileIds);
    if (next.has(fileId)) next.delete(fileId);
    else next.add(fileId);
    set({ selectedFileIds: next });
  },

  selectRange: (fileIds: string[]) => {
    const next = new Set(get().selectedFileIds);
    for (const id of fileIds) next.add(id);
    set({ selectedFileIds: next });
  },

  selectAll: (fileIds: string[]) => {
    set({ selectedFileIds: new Set(fileIds) });
  },

  clearSelection: () => set({ selectedFileIds: new Set() }),

  setDetailsFile: (file: DriveFile | null) => set({ detailsFile: file }),
  setShareFile: (file: DriveFile | null) => set({ shareFile: file }),
  setTextViewerFile: (file: DriveFile | null) => set({ textViewerFile: file }),
  setAnalyticsOpen: (open: boolean) => set({ isAnalyticsOpen: open }),
  setCreateVaultOpen: (open: boolean) => set({ isCreateVaultOpen: open }),
  setShortcutsOpen: (open: boolean) => set({ isShortcutsOpen: open }),
  setNetworkMonitorOpen: (open: boolean) => set({ isNetworkMonitorOpen: open }),
  setCopyToVaultFiles: (files: DriveFile[] | null) => set({ copyToVaultFiles: files }),

  resetDrive: () =>
    set({
      channels: [],
  setChannels: (channels: ChannelMeta[]) => set({ channels }),
      activeChannelId: "UNIFIED",
      activeFilter: "ALL",
      sizeFilter: "ALL",
      searchQuery: "",
      remoteSearchStatus: "IDLE",
      files: [],
      channelFilesCache: new Map(),
      syncStatus: {
        isSyncing: false,
        statusText: "Ready",
        totalIndexed: 0,
        currentChannelTitle: "",
      },
      previewFile: null,
      renderPage: 1,
    }),
}));
