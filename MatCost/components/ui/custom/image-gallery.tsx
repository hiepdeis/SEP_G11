"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImageGalleryProps {
  images: any[];
  isReadOnly?: boolean;
  maxVisible?: number;
  onRemove?: (imageIndex: number) => void;
}

export function ImageGallery({
  images,
  isReadOnly = false,
  maxVisible = 5,
  onRemove,
}: ImageGalleryProps) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // Bắt sự kiện phím mũi tên để chuyển ảnh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isViewerOpen || images.length <= 1) return;

      if (e.key === "ArrowLeft") {
        setViewerIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
      } else if (e.key === "ArrowRight") {
        setViewerIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isViewerOpen, images.length]);

  if (!images || images.length === 0) return null;

  // Chuẩn hoá mảng ảnh (đề phòng có cả string hoặc object)
  const parsedImages = images.map((img) =>
    typeof img === "string" ? img : img.imageData,
  );

  return (
    <>
      {/* KHU VỰC THUMBNAIL */}
      <div className="flex flex-wrap gap-2 mt-2">
        {images.slice(0, maxVisible).map((imgObj, imgIdx) => {
          const isLastVisible = imgIdx === maxVisible - 1;
          const remainingCount = images.length - maxVisible;
          const showOverlay = isLastVisible && remainingCount > 0;
          const imgSrc = parsedImages[imgIdx];

          return (
            <div
              key={imgIdx}
              className="relative group cursor-pointer"
              onClick={() => {
                setViewerIndex(imgIdx);
                setIsViewerOpen(true);
              }}
            >
              <img
                src={imgSrc}
                alt={`thumbnail-${imgIdx}`}
                className="w-10 h-10 object-cover rounded border border-slate-200 shadow-sm"
              />

              {/* Overlay "+ X" */}
              {showOverlay && (
                <div className="absolute inset-0 bg-slate-900/60 rounded flex items-center justify-center text-white text-xs font-bold backdrop-blur-[1px]">
                  +{remainingCount}
                </div>
              )}

              {/* Nút Xóa */}
              {!isReadOnly && onRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(imgIdx);
                  }}
                  className="absolute -top-1.5 -right-1.5 bg-slate-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-600 shadow-sm z-10"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* DIALOG XEM ẢNH PHÓNG TO (LIGHTBOX) */}
      <Dialog open={isViewerOpen} onOpenChange={setIsViewerOpen}>
        <DialogContent className="sm:max-w-4xl bg-transparent border-0 shadow-none p-0 flex flex-col items-center justify-center">
          <DialogHeader>
            <DialogTitle></DialogTitle>
          </DialogHeader>
          <div className="relative w-full flex flex-col items-center gap-4">
            <div className="relative group flex items-center justify-center w-full">
              <img
                src={parsedImages[viewerIndex]}
                alt="Enlarged evidence"
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
              />

              {parsedImages.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-0 sm:-left-12 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md transition-all opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerIndex((prev) =>
                        prev > 0 ? prev - 1 : parsedImages.length - 1,
                      );
                    }}
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-0 sm:-right-12 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-md transition-all opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewerIndex((prev) =>
                        prev < parsedImages.length - 1 ? prev + 1 : 0,
                      );
                    }}
                  >
                    <ChevronRight className="w-6 h-6" />
                  </Button>
                </>
              )}
            </div>

            {parsedImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto max-w-full pb-2 px-2 snap-x">
                {parsedImages.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`thumb-${idx}`}
                    onClick={() => setViewerIndex(idx)}
                    className={`w-14 h-14 object-cover rounded-md cursor-pointer border-2 shrink-0 snap-center transition-all ${
                      idx === viewerIndex
                        ? "border-indigo-500 opacity-100 scale-105"
                        : "border-transparent opacity-50 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}