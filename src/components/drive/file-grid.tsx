import React, { useRef, useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DriveFile } from "@/lib/telegram/indexer";
import { FileCard } from "./file-card";

interface FileGridProps {
  files: DriveFile[];
  onDownload: (file: DriveFile) => void;
}

export const FileGrid: React.FC<FileGridProps> = ({ files, onDownload }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);
  const [gap, setGap] = useState(12);

  // Compute responsive columns dynamically from container width
  useEffect(() => {
    const updateColumns = () => {
      if (!parentRef.current) return;
      const width = parentRef.current.clientWidth;
      const currentGap = width < 500 ? 8 : 12;
      const minCardWidth = width < 500 ? 140 : 185;
      const computed = Math.max(1, Math.floor((width + currentGap) / (minCardWidth + currentGap)));
      setColumns(computed);
      setGap(currentGap);
    };

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
    overscan: 5,
  });

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
            <motion.div
              key={virtualRow.index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-0 left-0 w-full grid"
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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
