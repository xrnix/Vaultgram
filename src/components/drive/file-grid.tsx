import React, { useRef, useState, useEffect, useLayoutEffect, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DriveFile } from "@/lib/telegram/indexer";
import { FileCard } from "./file-card";

interface FileGridProps {
  files: DriveFile[];
  onDownload: (file: DriveFile) => void;
}

function getInitialConfig() {
  if (typeof window === "undefined") {
    return { columns: 4, gap: 12 };
  }
  const w = window.innerWidth;
  const currentGap = w < 640 ? 8 : 12;
  const minCardWidth = w < 640 ? 140 : 185;
  const computed = Math.max(1, Math.floor((w - 240 + currentGap) / (minCardWidth + currentGap)));
  return { columns: Math.max(2, computed), gap: currentGap };
}

export const FileGrid: React.FC<FileGridProps> = ({ files, onDownload }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const initial = useMemo(() => getInitialConfig(), []);
  const [columns, setColumns] = useState(initial.columns);
  const [gap, setGap] = useState(initial.gap);

  // Compute responsive columns dynamically from container width
  const updateColumns = () => {
    if (!parentRef.current) return;
    const width = parentRef.current.clientWidth;
    if (width <= 0) return;
    const currentGap = width < 500 ? 8 : 12;
    const minCardWidth = width < 500 ? 140 : 185;
    const computed = Math.max(1, Math.floor((width + currentGap) / (minCardWidth + currentGap)));
    setColumns(computed);
    setGap(currentGap);
  };

  useLayoutEffect(() => {
    updateColumns();
  }, []);

  useEffect(() => {
    updateColumns();

    const observer = new ResizeObserver(() => {
      updateColumns();
    });

    if (parentRef.current) {
      observer.observe(parentRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Partition files into rows of length `columns`
  const rows = useMemo(() => {
    const result: DriveFile[][] = [];
    for (let i = 0; i < files.length; i += columns) {
      result.push(files.slice(i, i + columns));
    }
    return result;
  }, [files, columns]);

  const rowHeight = gap === 8 ? 138 + 8 : 142 + 12;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 8,
  });

  // Reset scroll to top and remeasure whenever files or columns change
  useEffect(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
    rowVirtualizer.scrollToOffset(0);
    rowVirtualizer.measure();
  }, [files, columns]);

  return (
    <div ref={parentRef} className="h-full w-full overflow-y-auto select-none p-0.5 sm:p-1">
      <div
        className="w-full relative"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowFiles = rows[virtualRow.index];
          if (!rowFiles) return null;

          return (
            <div
              key={`${virtualRow.index}-${rowFiles[0]?.id || ""}`}
              className="absolute top-0 left-0 w-full grid will-change-transform"
              style={{
                height: `${virtualRow.size - gap}px`,
                transform: `translateY(${virtualRow.start}px)`,
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                gap: `${gap}px`,
              }}
            >
              {rowFiles.map((file) => (
                <FileCard key={file.id} file={file} onDownload={onDownload} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
