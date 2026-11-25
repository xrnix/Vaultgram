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
    <div className="flex h-full select-none flex-col overflow-hidden rounded-[5px] border border-white/[0.05] bg-[#0d0d10]/60">
      {/* Sticky Table Header */}
      <div className="flex h-9 w-full shrink-0 items-center border-b border-white/[0.05] bg-[#0b0b0e] px-2.5 text-[11px] font-medium text-zinc-500 sm:px-3">
        <div className="min-w-0 flex-1 pr-2 sm:pr-4">Name</div>
        <div className="hidden w-28 shrink-0 px-2 sm:block sm:w-36">Channel</div>
        <div className="hidden w-20 shrink-0 px-2 md:block sm:w-24">Type</div>
        <div className="hidden w-24 shrink-0 px-2 sm:block">Size</div>
        <div className="hidden w-20 shrink-0 px-2 sm:block sm:w-28">Date</div>
        <div className="w-10 shrink-0 sm:w-12" />
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
