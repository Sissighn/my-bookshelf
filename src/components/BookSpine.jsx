import { useEffect, useRef, useState } from "react";
import { coverUrl, spineColor, spineSize, truncate } from "../lib/spine";
import { acquireCoverSlot } from "../lib/coverQueue";

const SPINE_CURVE =
  "linear-gradient(90deg, rgba(12,10,8,0.4) 0%, rgba(12,10,8,0.08) 14%, rgba(12,10,8,0) 40%, rgba(12,10,8,0) 62%, rgba(12,10,8,0.14) 86%, rgba(12,10,8,0.46) 100%)";

export default function BookSpine({
  book,
  onSelect,
  index,
  rowHeight,
  boardHeight,
}) {
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [src, setSrc] = useState(null);

  const size = spineSize(book);
  const color = spineColor(book.title + book.author);
  const url = coverUrl(book.isbn, "M");
  const showCover = coverLoaded && !coverFailed;

  const releaseSlot = useRef(null);
  const settle = () => {
    releaseSlot.current?.();
    releaseSlot.current = null;
  };

  useEffect(() => {
    if (!url) return undefined;
    let cancelled = false;

    acquireCoverSlot().then((release) => {
      if (cancelled) {
        release();
        return;
      }
      releaseSlot.current = release;
      setSrc(url);
    });

    return () => {
      cancelled = true;
      settle();
    };
  }, [url]);

  const titleText = truncate(book.title, size.height > 230 ? 34 : 28);

  return (
    <div
      style={{ height: rowHeight, paddingBottom: boardHeight }}
      className="group relative flex shrink-0 items-end"
    >
      <button
        type="button"
        onClick={() => onSelect(book)}
        aria-label={`${book.title} by ${book.author}`}
        style={{
          width: size.width,
          height: size.height,
          transform: `rotate(${size.tilt}deg)`,
          backgroundColor: color.base,
          transitionDelay: `${Math.min(index, 40) * 8}ms`,
        }}
        className="relative block origin-bottom cursor-pointer overflow-hidden rounded-t-xs
                   shadow-[0_1px_2px_rgba(28,26,23,0.28),0_8px_14px_-8px_rgba(28,26,23,0.4)]
                   transition-[transform,box-shadow] duration-300 ease-out
                   hover:-translate-y-3 hover:rotate-0
                   hover:shadow-[0_2px_4px_rgba(28,26,23,0.3),0_18px_26px_-12px_rgba(28,26,23,0.5)]
                   focus:outline-none focus-visible:-translate-y-3
                   focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2
                   focus-visible:ring-offset-paper"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, ${color.shade} 0%, ${color.base} 22%, ${color.base} 74%, ${color.shade} 100%)`,
          }}
        />

        {src && !coverFailed && (
          <img
            src={src}
            alt=""
            decoding="async"
            onLoad={() => {
              setCoverLoaded(true);
              settle();
            }}
            onError={() => {
              setCoverFailed(true);
              settle();
            }}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out"
            style={{ objectPosition: "25% center", opacity: coverLoaded ? 1 : 0 }}
          />
        )}

        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 6%, rgba(0,0,0,0) 92%, rgba(0,0,0,0.28) 100%)",
          }}
        />

        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: SPINE_CURVE }}
        />

        {!showCover && (
          <span
            className="absolute inset-0 flex items-center justify-center px-0.75 py-3
                       transition-opacity duration-700"
            style={{ color: color.ink, opacity: src && !coverFailed ? 0 : 1 }}
          >
            <span
              className="text-vertical rotate-180 truncate font-serif leading-none tracking-wide"
              style={{ fontSize: Math.max(10, Math.min(14, size.width * 0.3)) }}
            >
              {titleText}
            </span>
          </span>
        )}
      </button>

      <HoverCard book={book} />
    </div>
  );
}

function HoverCard({ book }) {
  const meta = [book.year, book.binding && book.binding.toLowerCase()].filter(
    Boolean,
  );
  const shelves = book.shelves.length ? book.shelves : [book.exclusiveShelf];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-[calc(100%+18px)] left-1/2 z-20 hidden
                 w-56 -translate-x-1/2 translate-y-1 border border-ink/8 bg-paper/95
                 px-4 py-3 opacity-0 shadow-[0_12px_32px_-12px_rgba(28,26,23,0.35)]
                 backdrop-blur-sm transition-[opacity,transform] duration-200 ease-out
                 group-hover:translate-y-0 group-hover:opacity-100
                 group-focus-within:translate-y-0 group-focus-within:opacity-100 md:block"
    >
      <p className="font-serif text-[15px] leading-snug text-ink">
        {book.title}
      </p>
      <p className="label-caps mt-1.5 text-ink-soft">{book.author}</p>
      {meta.length > 0 && (
        <p className="label-caps mt-1 text-ink-faint">{meta.join(" · ")}</p>
      )}
      <p className="label-caps mt-1 text-ink-faint">
        {shelves.slice(0, 3).join(" / ")}
      </p>
    </div>
  );
}
