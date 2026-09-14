import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { StorageImage } from "@/components/storage-image";
import { Button } from "@/components/ui/button";
import type { HouseImageRow } from "@/lib/houses-types";

export function ImageGallery({ images, alt }: { images: HouseImageRow[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const count = images.length;
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);
  const handleTouchEnd = (x: number) => {
    if (touchStart === null || count < 2) return;
    const delta = x - touchStart;
    setTouchStart(null);
    if (Math.abs(delta) < 40) return;
    go(delta > 0 ? -1 : 1);
  };

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, count]);

  useEffect(() => {
    if (count < 2) return;
    const preload = (target: HouseImageRow | undefined) => {
      if (!target?.image_url) return;
      const img = new Image();
      img.src = target.image_url.startsWith("/api/public/img/")
        ? `${target.image_url}${target.image_url.includes("?") ? "&" : "?"}w=1024`
        : target.image_url;
    };
    preload(images[(index + 1) % count]);
    preload(images[(index - 1 + count) % count]);
  }, [count, images, index]);

  if (!count) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-xl bg-muted text-muted-foreground">
        No photos
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl bg-muted">
        <button
          type="button"
          onTouchStart={(e) => setTouchStart(e.touches[0]?.clientX ?? null)}
          onTouchEnd={(e) => handleTouchEnd(e.changedTouches[0]?.clientX ?? 0)}
          onClick={() => setLightbox(true)}
          className="block w-full cursor-zoom-in"
          aria-label="Open larger photo"
        >
          <StorageImage
            image={images[index]!}
            alt={`${alt} — photo ${index + 1}`}
            loading="eager"
            fetchPriority="high"
            width={1024}
            height={768}
            sizes="(max-width: 1024px) 100vw, 56rem"
            responsiveWidths={[480, 768, 1024, 1280]}
            className="aspect-[4/3] w-full object-cover"
          />
        </button>
        {count > 1 ? (
          <>
            <Button
              size="icon"
              variant="secondary"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full opacity-90"
              onClick={() => go(-1)}
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full opacity-90"
              onClick={() => go(1)}
              aria-label="Next photo"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            <span className="absolute bottom-3 right-3 rounded-full bg-foreground/70 px-2.5 py-1 text-xs text-background">
              {index + 1} / {count}
            </span>
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                i === index ? "border-primary" : "border-transparent opacity-70"
              }`}
              aria-label={`Show photo ${i + 1}`}
            >
              <StorageImage
                image={img}
                alt=""
                loading="lazy"
                width={192}
                height={128}
                sizes="6rem"
                responsiveWidths={[160, 240, 320]}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(false)}
        >
          <StorageImage
            image={images[index]!}
            alt={`${alt} — photo ${index + 1}`}
            sizes="100vw"
            responsiveWidths={[768, 1024, 1440, 1600]}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            size="icon"
            variant="secondary"
            className="absolute right-4 top-4 rounded-full"
            onClick={() => setLightbox(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
          {count > 1 ? (
            <>
              <Button
                size="icon"
                variant="secondary"
                className="absolute left-4 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                aria-label="Previous photo"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="absolute right-4 top-1/2 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                aria-label="Next photo"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
