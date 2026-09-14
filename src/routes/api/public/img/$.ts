import { createFileRoute } from "@tanstack/react-router";
import { getRequest } from "@tanstack/react-start/server";

/**
 * Public image endpoint. Streams photos of AVAILABLE houses from private storage.
 * Photos of hidden listings are not served publicly.
 */
export const Route = createFileRoute("/api/public/img/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const request = getRequest();
        const url = request ? new URL(request.url) : null;
        const widthParam = Number(url?.searchParams.get("w") ?? "");
        const width =
          Number.isFinite(widthParam) && widthParam >= 120 && widthParam <= 1600
            ? Math.round(widthParam)
            : undefined;
        const rawPath = (params as { _splat?: string })._splat ?? "";
        const path = decodeURIComponent(rawPath);
        if (!path || path.includes("..")) return new Response("Not found", { status: 404 });

        try {
          const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");

          const { data: image, error: imageError } = await admin
            .from("house_images")
            .select("house_id")
            .eq("storage_path", path)
            .limit(1)
            .maybeSingle();

          if (imageError || !image?.house_id) {
            return new Response("Not found", { status: 404 });
          }

          const { data: house, error: houseError } = await admin
            .from("houses")
            .select("availability")
            .eq("id", image.house_id)
            .maybeSingle();

          if (houseError || house?.availability !== "available") {
            return new Response("Not found", { status: 404 });
          }

          const { data: blob, error } = await admin.storage
            .from("house-images")
            .download(
              path,
              width ? { transform: { width, quality: 75, resize: "contain" } } : undefined,
            );
          if (error || !blob) return new Response("Not found", { status: 404 });

          return new Response(blob, {
            headers: {
              "content-type": blob.type || "image/jpeg",
              "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
            },
          });
        } catch (error) {
          console.error("[images] Public image proxy is not configured", error);
          return new Response("Image service is not configured", { status: 503 });
        }
      },
    },
  },
});
