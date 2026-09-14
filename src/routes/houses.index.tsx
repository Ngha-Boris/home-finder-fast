import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { HouseCard, HouseCardSkeleton } from "@/components/house-card";
import { CachedNotice, OfflineBanner } from "@/components/offline-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { fetchAvailableHouses } from "@/lib/houses-api";
import { houseTypeLabel, type House, type HouseType } from "@/lib/houses-types";
import { CACHE_KEYS } from "@/lib/idb-cache";

type Search = {
  q?: string | undefined;
  type?: string | undefined;
  region?: string | undefined;
  min?: number | undefined;
  max?: number | undefined;
};

const PAGE_SIZE = 9;

export const Route = createFileRoute("/houses/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    q: typeof search["q"] === "string" ? search["q"] : undefined,
    type: typeof search["type"] === "string" ? search["type"] : undefined,
    region: typeof search["region"] === "string" ? search["region"] : undefined,
    min:
      Number.isFinite(Number(search["min"])) && search["min"] !== undefined && search["min"] !== ""
        ? Number(search["min"])
        : undefined,
    max:
      Number.isFinite(Number(search["max"])) && search["max"] !== undefined && search["max"] !== ""
        ? Number(search["max"])
        : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Browse rental houses — Nyumba" },
      {
        name: "description",
        content:
          "Search available studio apartments and single rooms across Cameroon. Filter by region, house type and monthly rent.",
      },
      { property: "og:title", content: "Browse rental houses — Nyumba" },
      {
        property: "og:description",
        content: "Search available rental houses and filter by region, type and monthly rent.",
      },
    ],
  }),
  component: HousesPage,
});

function HousesPage() {
  const search = Route.useSearch();
  const [visible, setVisible] = useState(PAGE_SIZE);

  const { data, isLoading, isError, isFromCache, refetch } = useCachedQuery({
    queryKey: ["houses", "feed", search],
    cacheKey: CACHE_KEYS.feed,
    queryFn: () =>
      fetchAvailableHouses({
        q: search.q,
        type: search.type as HouseType | undefined,
        region: search.region,
        min: search.min,
        max: search.max,
      }),
  });

  const filtered = useMemo(() => {
    const q = (search.q ?? "").toLowerCase();
    return (data ?? []).filter((h: House) => {
      if (search.type && h.house_type !== search.type) return false;
      if (search.region && h.region !== search.region) return false;
      if (search.min !== undefined && h.rent_price < search.min) return false;
      if (search.max !== undefined && h.rent_price > search.max) return false;
      if (!q) return true;
      const haystack = [
        h.location,
        h.region,
        h.description,
        h.location_details ?? "",
        houseTypeLabel(h.house_type),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, search]);

  useEffect(
    () => setVisible(PAGE_SIZE),
    [search.q, search.type, search.region, search.min, search.max],
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <OfflineBanner />

      <main className="container-page flex-1 py-8">
        <h1 className="font-display text-3xl font-bold">Available houses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading
            ? "Loading listings…"
            : `${filtered.length} house${filtered.length === 1 ? "" : "s"} match your search`}
        </p>

        <div className="mt-6">
          <CachedNotice show={isFromCache} />

          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <HouseCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No houses match your search."
              description="Try a different region, house type or rent range."
            />
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.slice(0, visible).map((house) => (
                  <HouseCard key={house.id} house={house} />
                ))}
              </div>
              {visible < filtered.length ? (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  >
                    Load more houses
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
