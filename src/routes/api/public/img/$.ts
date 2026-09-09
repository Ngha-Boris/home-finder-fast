import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Public image endpoint. Streams photos of AVAILABLE houses from private storage.
 * Photos of hidden listings are not served publicly.
 */
export const Route = createFileRoute("/api/public/img/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = (params as { _splat?: string })._splat ?? "";
        if (!path || path.includes("..")) return new Response("Not found", { status: 404 });

        const url = process.env["SUPABASE_URL"];
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!url || !serviceKey) return new Response("Not configured", { status: 500 });

        const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

        const { data: image } = await admin
          .from("house_images")
          .select("house_id, houses!inner(availability)")
          .eq("storage_path", path)
          .limit(1)
          .maybeSingle();

        const availability = (image as { houses?: { availability?: string } } | null)?.houses?.availability;
        if (!image || availability !== "available") {
          return new Response("Not found", { status: 404 });
        }

        const { data: blob, error } = await admin.storage.from("house-images").download(path);
        if (error || !blob) return new Response("Not found", { status: 404 });

        return new Response(blob, {
          headers: {
            "content-type": blob.type || "image/jpeg",
            "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
          },
        });
      },
    },
  },
});
