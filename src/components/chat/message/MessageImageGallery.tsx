"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import JSZip from "jszip";
import { useTranslations } from "next-intl";
import type { ChatMessage } from "@/src/types/chat";

type Props = {
  message: ChatMessage;
  groupMessages?: ChatMessage[];
  isMine: boolean;
};

const STORAGE_KEY = "talkhub_downloaded_images";

function formatFileSize(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MessageImageGallery({
  message,
  groupMessages,
  isMine,
}: Props) {
  const t = useTranslations("screen.chat.MessageItem");

  const [downloadedImageIds, setDownloadedImageIds] = useState<Set<string>>(
    new Set(),
  );
  const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

  const images = useMemo(
    () =>
      message.message_type === "image" &&
      groupMessages &&
      groupMessages.length > 1
        ? groupMessages
        : [message],
    [message, groupMessages],
  );

  const isImageGroup = images.length > 1;
  const visibleImages = images.slice(0, 4);
  const remainingCount = images.length - 4;
  const caption = images.find((image) => image.content?.trim())?.content ?? "";

  const accessibleImageIndexes = useMemo(
    () =>
      images.reduce<number[]>((indexes, image, index) => {
        if (isMine || downloadedImageIds.has(image.id)) {
          indexes.push(index);
        }
        return indexes;
      }, []),
    [images, isMine, downloadedImageIds],
  );

  useEffect(() => {
    try {
      const savedIds = localStorage.getItem(STORAGE_KEY);
      if (savedIds) {
        const parsedIds: unknown = JSON.parse(savedIds);
        if (Array.isArray(parsedIds)) {
          setDownloadedImageIds(
            new Set(
              parsedIds.filter((id): id is string => typeof id === "string"),
            ),
          );
        }
      }
    } catch (error) {
      console.error("Failed to restore downloaded images:", error);
    }
  }, []);

  const handleDownload = async (
    imageUrl: string,
    fileName?: string | null,
    imageId?: string,
  ) => {
    if (!imageId) {
      console.error("Image ID is missing.");
      return;
    }

    try {
      const savePickerWindow = window as Window & {
        showSaveFilePicker?: (options: { suggestedName: string }) => Promise<{
          createWritable: () => Promise<{
            write: (data: Blob) => Promise<void>;
            close: () => Promise<void>;
            abort: () => Promise<void>;
          }>;
        }>;
      };

      if (!savePickerWindow.showSaveFilePicker) {
        throw new Error("Your browser does not support Save As downloads.");
      }

      const fileHandle = await savePickerWindow.showSaveFilePicker({
        suggestedName: fileName?.trim() || "image",
      });

      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Image download failed.");

      const blob = await response.blob();
      const writable = await fileHandle.createWritable();

      try {
        await writable.write(blob);
        await writable.close();
      } catch (error) {
        await writable.abort().catch(() => undefined);
        throw error;
      }

      const savedIds = localStorage.getItem(STORAGE_KEY);
      const previousIds: string[] = savedIds ? JSON.parse(savedIds) : [];

      const updatedIds = new Set<string>([
        ...previousIds,
        ...downloadedImageIds,
        imageId,
      ]);

      localStorage.setItem(STORAGE_KEY, JSON.stringify([...updatedIds]));
      setDownloadedImageIds(updatedIds);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      console.error("Image download failed:", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "Unable to save image. Please try again.",
      );
    }
  };

  const handleDownloadImageGroupAsZip = async () => {
    if (!isImageGroup) return;

    const downloadableImages = images.filter((image) => !!image.attachment_url);

    if (!downloadableImages.length) return;

    try {
      const zip = new JSZip();

      await Promise.all(
        downloadableImages.map(async (image, index) => {
          const response = await fetch(image.attachment_url!);
          if (!response.ok) {
            throw new Error(`Failed to download image ${index + 1}`);
          }

          const blob = await response.blob();
          const originalName =
            image.attachment_name?.trim() || `image-${index + 1}`;
          const safeName = originalName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");

          zip.file(safeName, blob);
        }),
      );

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      const blobUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `talkhub-images-${message.id}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (error) {
      console.error("Image ZIP download failed:", error);
    }
  };

  const moveGallery = useCallback(
    (direction: -1 | 1) => {
      setActiveImageIndex((currentIndex) => {
        if (currentIndex === null || accessibleImageIndexes.length < 2) {
          return currentIndex;
        }

        const currentPosition = accessibleImageIndexes.indexOf(currentIndex);
        const safePosition = currentPosition === -1 ? 0 : currentPosition;
        const nextPosition =
          (safePosition + direction + accessibleImageIndexes.length) %
          accessibleImageIndexes.length;

        return accessibleImageIndexes[nextPosition];
      });
    },
    [accessibleImageIndexes],
  );

  useEffect(() => {
    if (activeImageIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveImageIndex(null);
      } else if (event.key === "ArrowRight") {
        moveGallery(1);
      } else if (event.key === "ArrowLeft") {
        moveGallery(-1);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeImageIndex, moveGallery]);

  if (message.message_type !== "image") return null;

  if (!isImageGroup && !message.attachment_url) return null;

  const renderDownloadButton = (image: ChatMessage, compact = false) => {
    if (isMine || downloadedImageIds.has(image.id) || !image.attachment_url) {
      return null;
    }

    return (
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          void handleDownload(
            image.attachment_url!,
            image.attachment_name,
            image.id,
          );
        }}
        aria-label="Download image"
        title="Download image"
        className={`absolute left-1/2 top-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full bg-black/35 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/50 ${
          compact ? "px-3 py-2" : "px-4 py-2.5"
        }`}
      >
        <span
          className={
            compact ? "text-xs font-semibold" : "text-sm font-semibold"
          }
        >
          {formatFileSize(image.attachment_size) || "Image"}
        </span>
        <Download size={compact ? 17 : 19} />
      </button>
    );
  };

  return (
    <>
      {isImageGroup ? (
        <>
          <div
            className={`grid max-w-[340px] gap-1 overflow-hidden rounded-xl ${
              images.length === 2
                ? "aspect-[4/3] grid-cols-2"
                : images.length === 3
                  ? "aspect-[4/3] grid-cols-2 grid-rows-2"
                  : "aspect-square grid-cols-2 grid-rows-2"
            }`}
          >
            {visibleImages.map((image, index) => {
              const isThreeImageLayout = images.length === 3;
              const isAccessible = isMine || downloadedImageIds.has(image.id);

              return (
                <div
                  key={image.id}
                  role="button"
                  tabIndex={isAccessible ? 0 : -1}
                  aria-label={`View image ${index + 1} of ${images.length}`}
                  onKeyDown={(event) => {
                    if (
                      isAccessible &&
                      (event.key === "Enter" || event.key === " ")
                    ) {
                      event.preventDefault();
                      setActiveImageIndex(index);
                    }
                  }}
                  onClick={() => {
                    if (isAccessible) setActiveImageIndex(index);
                  }}
                  className={`group/image relative min-h-0 min-w-0 overflow-hidden bg-background ${
                    isAccessible ? "cursor-zoom-in" : "cursor-not-allowed"
                  } ${isThreeImageLayout && index === 0 ? "row-span-2" : ""}`}
                >
                  {image.attachment_url ? (
                    <>
                      <img
                        src={image.attachment_url}
                        alt={image.attachment_name || t("sharedAttachment")}
                        loading="lazy"
                        className={`h-full w-full object-cover transition-all duration-300 ${
                          !isMine && !downloadedImageIds.has(image.id)
                            ? "scale-105 blur-md"
                            : ""
                        }`}
                      />
                      {renderDownloadButton(image, true)}
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <span className="text-xs text-muted-foreground">
                        Loading image...
                      </span>
                    </div>
                  )}

                  {index === 3 && remainingCount > 0 && (
                    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/55">
                      <span className="text-2xl font-semibold text-white">
                        +{remainingCount}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {caption && (
            <div className="px-3 pt-2">
              <p className="whitespace-pre-wrap break-words text-[14.5px] leading-[1.4]">
                {caption}
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          <div
            className={`relative mb-2 overflow-hidden rounded-xl bg-background ${
              isMine || downloadedImageIds.has(message.id)
                ? "cursor-zoom-in"
                : "cursor-not-allowed"
            }`}
            onClick={() => {
              if (isMine || downloadedImageIds.has(message.id)) {
                setActiveImageIndex(0);
              }
            }}
          >
            <img
              src={message.attachment_url!}
              alt={message.attachment_name || t("sharedAttachment")}
              loading="lazy"
              className={`max-h-[320px] w-full rounded-lg object-contain transition-all duration-300 ${
                !isMine && !downloadedImageIds.has(message.id)
                  ? "scale-105 blur-md"
                  : ""
              }`}
            />
            {renderDownloadButton(message)}
          </div>

          {message.content && (
            <div className="px-3 pt-2">
              <p className="whitespace-pre-wrap break-words text-[14.5px] leading-[1.4]">
                {message.content}
              </p>
            </div>
          )}
        </>
      )}

      {activeImageIndex !== null && (
        <div
          className="fixed inset-0 z-[120] flex flex-col bg-black/95 p-3 text-white sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActiveImageIndex(null);
            }
          }}
        >
          <div className="flex shrink-0 items-center justify-between gap-3">
            <span className="text-sm font-medium">
              {activeImageIndex + 1} / {images.length}
            </span>

            <div className="flex items-center gap-2">
              {images[activeImageIndex]?.attachment_url &&
                !isMine &&
                !downloadedImageIds.has(images[activeImageIndex].id) && (
                  <button
                    type="button"
                    onClick={() => {
                      const selectedImage = images[activeImageIndex];
                      if (selectedImage?.attachment_url) {
                        void handleDownload(
                          selectedImage.attachment_url,
                          selectedImage.attachment_name,
                          selectedImage.id,
                        );
                      }
                    }}
                    className="flex h-10 cursor-pointer items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-medium transition hover:bg-white/25"
                    aria-label="Download current image"
                  >
                    <Download size={18} />
                  </button>
                )}

              <button
                type="button"
                onClick={() => setActiveImageIndex(null)}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                aria-label="Close gallery"
              >
                <X size={21} />
              </button>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center gap-2 py-4">
            {images.length > 1 && (
              <button
                type="button"
                onClick={() => moveGallery(-1)}
                disabled={accessibleImageIndexes.length < 2}
                className="absolute left-0 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40 sm:left-2 sm:h-12 sm:w-12"
                aria-label="Previous image"
              >
                <ChevronLeft size={26} />
              </button>
            )}

            {images[activeImageIndex]?.attachment_url ? (
              <img
                key={images[activeImageIndex].id}
                src={images[activeImageIndex].attachment_url!}
                alt={
                  images[activeImageIndex].attachment_name ||
                  `Image ${activeImageIndex + 1}`
                }
                className="max-h-full max-w-full select-none object-contain"
              />
            ) : (
              <p className="text-sm text-white/70">Image is unavailable.</p>
            )}

            {images.length > 1 && (
              <button
                type="button"
                onClick={() => moveGallery(1)}
                disabled={accessibleImageIndexes.length < 2}
                className="absolute right-0 z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40 sm:right-2 sm:h-12 sm:w-12"
                aria-label="Next image"
              >
                <ChevronRight size={26} />
              </button>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex shrink-0 justify-center gap-2 overflow-x-auto pb-1">
              {images.map((image, index) => {
                const isAccessible = isMine || downloadedImageIds.has(image.id);

                return (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    disabled={!isAccessible}
                    aria-label={`Show image ${index + 1}`}
                    aria-current={activeImageIndex === index}
                    className={`h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 transition sm:h-14 sm:w-14 ${
                      activeImageIndex === index
                        ? "border-white opacity-100"
                        : "border-transparent opacity-55 hover:opacity-100"
                    } ${
                      !isAccessible ? "cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    {image.attachment_url && (
                      <img
                        src={image.attachment_url}
                        alt=""
                        className={`h-full w-full object-cover transition-all duration-300 ${
                          !isMine && !downloadedImageIds.has(image.id)
                            ? "scale-105 blur-md"
                            : ""
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
