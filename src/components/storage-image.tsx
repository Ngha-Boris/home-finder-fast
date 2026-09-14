import { useEffect, useMemo, useState, type ImgHTMLAttributes } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { HouseImageRow } from "@/lib/houses-types";

const DEFAULT_WIDTHS = [320, 640, 960, 1280];
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const signedUrlCache = new Map<string, { src: string; srcSet?: string; expiresAt: number }>();

type StorageImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt" | "srcSet"> & {
  image: HouseImageRow;
  alt: string;
  responsiveWidths?: number[];
};

function publicImageUrl(imageUrl: string, width: number) {
  const separator = imageUrl.includes("?") ? "&" : "?";
  return `${imageUrl}${separator}w=${width}`;
}

function canUsePublicVariants(imageUrl: string) {
  return imageUrl.startsWith("/api/public/img/");
}

function signedCacheKey(path: string, widthsKey: string) {
  return `${path}|${widthsKey}`;
}

export function StorageImage({
  image,
  alt,
  responsiveWidths = DEFAULT_WIDTHS,
  sizes,
  ...props
}: StorageImageProps) {
  const [src, setSrc] = useState(image.image_url);
  const [srcSet, setSrcSet] = useState<string | undefined>(() =>
    canUsePublicVariants(image.image_url)
      ? responsiveWidths
          .map((width) => `${publicImageUrl(image.image_url, width)} ${width}w`)
          .join(", ")
      : undefined,
  );

  const widthsKey = useMemo(() => responsiveWidths.join(","), [responsiveWidths]);
  const widths = useMemo(
    () =>
      widthsKey
        .split(",")
        .map((width) => Number(width))
        .filter(Number.isFinite),
    [widthsKey],
  );

  useEffect(() => {
    let cancelled = false;
    setSrc(image.image_url);
    setSrcSet(
      canUsePublicVariants(image.image_url)
        ? widths.map((width) => `${publicImageUrl(image.image_url, width)} ${width}w`).join(", ")
        : undefined,
    );

    if (!image.storage_path || canUsePublicVariants(image.image_url)) return;

    const cacheKey = signedCacheKey(image.storage_path, widthsKey);
    const cached = signedUrlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      setSrc(cached.src);
      setSrcSet(cached.srcSet);
      return;
    }

    Promise.all([
      supabase.storage
        .from("house-images")
        .createSignedUrl(image.storage_path, SIGNED_URL_TTL_SECONDS),
      Promise.all(
        widths.map((width) =>
          supabase.storage
            .from("house-images")
            .createSignedUrl(image.storage_path!, SIGNED_URL_TTL_SECONDS, {
              transform: { width, quality: 75, resize: "contain" },
            }),
        ),
      ),
    ]).then(([full, variants]) => {
      if (cancelled) return;
      const nextSrc = full.data?.signedUrl;
      const signedSet = variants
        .map((variant, index) =>
          variant.data?.signedUrl ? `${variant.data.signedUrl} ${widths[index]}w` : null,
        )
        .filter(Boolean)
        .join(", ");
      const nextSrcSet = signedSet || undefined;
      if (nextSrc) {
        setSrc(nextSrc);
        setSrcSet(nextSrcSet);
        const cacheEntry: { src: string; srcSet?: string; expiresAt: number } = {
          src: nextSrc,
          expiresAt: Date.now() + (SIGNED_URL_TTL_SECONDS - 60) * 1000,
        };
        if (nextSrcSet) cacheEntry.srcSet = nextSrcSet;
        signedUrlCache.set(cacheKey, cacheEntry);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [image.image_url, image.storage_path, widths, widthsKey]);

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes ?? "(max-width: 640px) 100vw, 33vw"}
      alt={alt}
      {...props}
    />
  );
}
