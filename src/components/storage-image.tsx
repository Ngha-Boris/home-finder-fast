import { useEffect, useMemo, useState, type ImgHTMLAttributes } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { HouseImageRow } from "@/lib/houses-types";

const DEFAULT_WIDTHS = [320, 640, 960, 1280];

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

  useEffect(() => {
    let cancelled = false;
    setSrc(image.image_url);
    setSrcSet(
      canUsePublicVariants(image.image_url)
        ? responsiveWidths
            .map((width) => `${publicImageUrl(image.image_url, width)} ${width}w`)
            .join(", ")
        : undefined,
    );

    if (!image.storage_path) return;

    Promise.all([
      supabase.storage.from("house-images").createSignedUrl(image.storage_path, 60 * 60),
      Promise.all(
        responsiveWidths.map((width) =>
          supabase.storage.from("house-images").createSignedUrl(image.storage_path!, 60 * 60, {
            transform: { width, quality: 75, resize: "contain" },
          }),
        ),
      ),
    ]).then(([full, variants]) => {
      if (cancelled) return;
      if (full.data?.signedUrl) setSrc(full.data.signedUrl);
      const signedSet = variants
        .map((variant, index) =>
          variant.data?.signedUrl ? `${variant.data.signedUrl} ${responsiveWidths[index]}w` : null,
        )
        .filter(Boolean)
        .join(", ");
      if (signedSet) setSrcSet(signedSet);
    });

    return () => {
      cancelled = true;
    };
  }, [image.image_url, image.storage_path, responsiveWidths, widthsKey]);

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
