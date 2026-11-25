import React, { useRef, useEffect, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DriveFile } from "@/lib/telegram/indexer";
import { FileTableRow } from "./file-table-row";

interface FileTableProps {
  files: DriveFile[];
  onDownload: (file: DriveFile) => void;
}

export const FileTable: React.FC<FileTableProps> = ({ files, onDownload }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );
  const [isTabletOrMobile, setIsTabletOrMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTabletOrMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: files.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (isMobile ? 60 : 44),
    overscan: 10,
    paddingEnd: isTabletOrMobile ? 96 : 16,
  });

  // Reset scroll to top on files array changes and remeasure on breakpoint change
  useEffect(() => {
    if (parentRef.current) {
      parentRef.current.scrollTop = 0;
    }
    rowVirtualizer.scrollToOffset(0);
    rowVirtualizer.measure();
  }, [files, isMobile, isTabletOrMobile]);

  return (
    <div className="flex flex-col h-full rounded-[4px] border border-white/[0.08] bg-[#121215]/60 backdrop-blur-md overflow-hidden select-none">
      {/* Sticky Table Header */}
      <div className="flex h-9 w-full items-center border-b border-white/[0.07] bg-white/[0.02] font-mono text-[10px] text-zinc-400 uppercase tracking-wider px-2.5 sm:px-3 shrink-0">
        <div className="flex-1 min-w-0 pr-2 sm:pr-4">File</div>
        <div className="w-28 sm:w-36 shrink-0 px-2 hidden sm:block">Channel Source</div>
        <div className="w-20 sm:w-24 shrink-0 px-2 hidden md:block">Category</div>
        <div className="w-24 shrink-0 px-2 hidden sm:block">Size</div>
        <div className="w-20 sm:w-28 shrink-0 px-2 hidden sm:block">Date</div>
        <div className="w-10 sm:w-12 shrink-0 text-right">Menu</div>
      </div>

      {/* Virtualized Scrollable Body */}
      <div ref={parentRef} className="flex-1 overflow-y-auto w-full relative">
        <div
          className="w-full relative"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const file = files[virtualRow.index];
            if (!file) return null;

            return (
              <div
                key={file.id}
                className="absolute top-0 left-0 w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <FileTableRow file={file} onDownload={onDownload} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
