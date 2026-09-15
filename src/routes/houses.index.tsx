import { createFileRoute } from "@tanstack/react-router";
import { Home, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { HouseCard, HouseCardSkeleton } from "@/components/house-card";
import { CachedNotice, OfflineBanner } from "@/components/offline-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { EmptyState, ErrorState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCachedQuery } from "@/hooks/use-cached-query";
import { fetchAvailableHouses } from "@/lib/houses-api";
import {
  HOUSE_TYPES,
  PRICE_PRESETS,
  REGIONS,
  houseTypeLabel,
  type House,
  type HouseType,
} from "@/lib/houses-types";
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
      { title: "Browse rental houses — Easy Rent" },
      {
        name: "description",
        content: "Browse available studio apartments, rooms and houses across Cameroon.",
      },
      { property: "og:title", content: "Browse rental houses — Easy Rent" },
      {
        property: "og:description",
        content: "Browse available rental houses and contact landlords directly.",
      },
    ],
  }),
  component: HousesPage,
});

function HousesPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [q, setQ] = useState(search.q ?? "");
  const [min, setMin] = useState(search.min?.toString() ?? "");
  const [max, setMax] = useState(search.max?.toString() ?? "");

  const { data, isLoading, isError, isFromCache, refetch } = useCachedQuery({
    queryKey: ["houses", "feed", search],
    cacheKey: CACHE_KEYS.feedSearch(JSON.stringify(search)),
    queryFn: () => {
      const filters: Parameters<typeof fetchAvailableHouses>[0] = {};
      if (search.q !== undefined) filters.q = search.q;
      if (search.type !== undefined) filters.type = search.type as HouseType;
      if (search.region !== undefined) filters.region = search.region;
      if (search.min !== undefined) filters.min = search.min;
      if (search.max !== undefined) filters.max = search.max;
      return fetchAvailableHouses(filters);
    },
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
  useEffect(() => setQ(search.q ?? ""), [search.q]);
  useEffect(() => setMin(search.min?.toString() ?? ""), [search.min]);
  useEffect(() => setMax(search.max?.toString() ?? ""), [search.max]);

  const updateSearch = (next: Partial<Search>) => {
    navigate({
      search: (current: Search) => {
        const merged = { ...current, ...next } as Search;
        return {
          q: merged.q?.trim() || undefined,
          type: merged.type || undefined,
          region: merged.region || undefined,
          min: merged.min,
          max: merged.max,
        };
      },
      replace: true,
    });
  };

  const hasFilters =
    !!search.q ||
    !!search.type ||
    !!search.region ||
    search.min !== undefined ||
    search.max !== undefined;
  const applyRent = () => {
    updateSearch({
      min: min.trim() ? Number(min) : undefined,
      max: max.trim() ? Number(max) : undefined,
    });
  };
  const clearFilters = () => {
    setQ("");
    setMin("");
    setMax("");
    navigate({ search: () => ({}), replace: true });
  };

  return (
    <div className="app-surface flex min-h-screen flex-col">
      <SiteHeader />
      <OfflineBanner />

      <main className="container-page flex-1 pb-24 pt-5 sm:py-8">
        <div className="stage-surface overflow-hidden rounded-2xl border border-white/15 p-4 text-primary-foreground shadow-card min-[375px]:p-5 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold">
                <Home className="h-3.5 w-3.5" />
                Live rental feed
              </div>
              <h1 className="font-display text-2xl font-extrabold min-[375px]:text-3xl sm:text-4xl">
                Available houses
              </h1>
              <p className="mt-2 text-sm text-primary-foreground/78">
                {isLoading
                  ? "Loading listings..."
                  : `${filtered.length} available house${filtered.length === 1 ? "" : "s"}`}
              </p>
            </div>
          </div>
        </div>

        <Card className="mt-5 space-y-4 border-white/70 p-3 shadow-card min-[375px]:mt-6 min-[375px]:p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") updateSearch({ q });
                }}
                placeholder="Search location, region or description..."
                aria-label="Search houses"
                className="h-11 pl-9"
              />
            </div>
            <Button
              type="button"
              className="h-11 w-full sm:w-auto"
              onClick={() => updateSearch({ q })}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Search
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>House type</Label>
              <Select
                value={search.type ?? "all"}
                onValueChange={(value) =>
                  updateSearch({ type: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {HOUSE_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Select
                value={search.region ?? "all"}
                onValueChange={(value) =>
                  updateSearch({ region: value === "all" ? undefined : value })
                }
              >
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  {REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="min-rent">Min rent</Label>
              <Input
                id="min-rent"
                type="number"
                inputMode="numeric"
                min={0}
                value={min}
                onChange={(event) => setMin(event.target.value)}
                onBlur={applyRent}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max-rent">Max rent</Label>
              <Input
                id="max-rent"
                type="number"
                inputMode="numeric"
                min={0}
                value={max}
                onChange={(event) => setMax(event.target.value)}
                onBlur={applyRent}
                className="h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 min-[440px]:flex min-[440px]:flex-wrap">
            {PRICE_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                size="sm"
                variant={
                  search.min === preset.min && search.max === preset.max ? "default" : "secondary"
                }
                className="justify-center"
                onClick={() => {
                  setMin(preset.min?.toString() ?? "");
                  setMax(preset.max?.toString() ?? "");
                  updateSearch({ min: preset.min, max: preset.max });
                }}
              >
                {preset.label}
              </Button>
            ))}
            {hasFilters ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="col-span-2 justify-center min-[440px]:col-span-1"
                onClick={clearFilters}
              >
                <X className="h-4 w-4" />
                Clear filters
              </Button>
            ) : null}
          </div>
        </Card>

        <div className="mt-6">
          <CachedNotice show={isFromCache} />

          {isLoading ? (
            <div className="grid grid-cols-2 gap-2 min-[375px]:gap-3 sm:gap-4 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <HouseCardSkeleton key={i} />
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No houses available yet."
              description="Listings will appear here as soon as landlords add them."
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 min-[375px]:gap-3 sm:gap-4 lg:grid-cols-3">
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
