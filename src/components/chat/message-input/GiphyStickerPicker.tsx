"use client";

import type { IGif } from "@giphy/js-types";
import { giphyFetch } from "@/src/lib/giphy";
import { Grid } from "@giphy/react-components";
import { GiphyContentType, GiphyProps } from "@/src/types";
import { useCallback, useEffect, useRef, useState } from "react";

export default function GiphyStickerPicker({ onSelect }: GiphyProps) {
  const [type, setType] = useState<GiphyContentType>("stickers");
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [width, setWidth] = useState(320);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(1, Math.floor(entry.contentRect.width)));
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const fetchGifs = useCallback(
    (offset: number) => {
      const options = { offset, limit: 20, type };

      return term
        ? giphyFetch.search(term, options)
        : giphyFetch.trending(options);
    },
    [term, type],
  );

  const handleSelect = (gif: IGif) => {
    const url =
      gif.images?.original?.url ??
      gif.images?.fixed_width?.url ??
      gif.images?.downsized?.url;

    if (url) onSelect(url);
  };

  return (
    <div
      ref={containerRef}
      className="flex min-h-0 w-full min-w-0 flex-col overflow-hidden"
      style={{
        height: "min(440px, calc(100dvh - 24px))",
      }}
    >
      {/* Fixed controls */}
      <div className="shrink-0 p-3">
        <div className="mb-3 flex gap-2">
          <button
            type="button"
            onClick={() => setType("stickers")}
            className={
              type === "stickers"
                ? "rounded-full bg-primary px-3 py-1 text-primary-foreground"
                : "rounded-full px-3 py-1"
            }
          >
            Stickers
          </button>

          <button
            type="button"
            onClick={() => setType("gifs")}
            className={
              type === "gifs"
                ? "rounded-full bg-primary px-3 py-1 text-primary-foreground"
                : "rounded-full px-3 py-1"
            }
          >
            GIFs
          </button>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setTerm(search.trim());
          }}
        >
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${type}...`}
            className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          />

          <button type="submit" className="rounded-md border px-3 py-2 text-sm">
            Search
          </button>
        </form>
      </div>

      {/* Scrollable results */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
        <Grid
          key={`${type}:${term}`}
          width={Math.max(1, width - 24)}
          columns={3}
          gutter={6}
          fetchGifs={fetchGifs}
          onGifClick={(gif) => handleSelect(gif)}
          noLink
        />
      </div>
    </div>
  );
}
